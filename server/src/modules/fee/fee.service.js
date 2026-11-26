import { FeeStructure } from "./fee-structure.model.js";
import { FeeVoucher } from "./fee-voucher.model.js";
import { FeePayment } from "./fee-payment.model.js";
import { School } from "../school/school.model.js";
import { AcademicYear } from "../academic/academic-year.model.js";
import { Enrollment } from "../student/enrollment.model.js";
import { Student } from "../student/student.model.js";
import { getNextSequence } from "../counter/counter.model.js";
import { ApiError } from "../../utils/api-error.js";
import { logAuditEvent } from "../../utils/audit.js";

export class FeeService {
  /**
   * Create or update class fee structure
   */
  static async createOrUpdateFeeStructure({
    schoolId,
    academicYearId,
    classId,
    items,
    actorId,
    actorRole,
    ip,
  }) {
    let activeYearId = academicYearId;
    if (!activeYearId) {
      const currentYear = await AcademicYear.findOne({ schoolId, isCurrent: true });
      if (!currentYear) throw ApiError.badRequest("No active academic session found.");
      activeYearId = currentYear._id;
    }

    const structure = await FeeStructure.findOneAndUpdate(
      { schoolId, academicYearId: activeYearId, classId },
      { items },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "FEE_STRUCTURE_UPDATE",
      entityType: "FeeStructure",
      entityId: structure._id,
      after: { classId, itemCount: items.length },
      ip,
    });

    return structure;
  }

  /**
   * Get all fee structures for the school
   */
  static async getFeeStructures({ schoolId, academicYearId }) {
    let activeYearId = academicYearId;
    if (!activeYearId) {
      const currentYear = await AcademicYear.findOne({ schoolId, isCurrent: true });
      if (currentYear) activeYearId = currentYear._id;
    }

    const filter = { schoolId };
    if (activeYearId) filter.academicYearId = activeYearId;

    return await FeeStructure.find(filter).populate("classId", "name").lean();
  }

  /**
   * Generate monthly fee vouchers in bulk (Idempotent)
   */
  static async generateMonthlyVouchers({
    schoolId,
    period,
    academicYearId,
    classId,
    dueDate,
    actorId,
    actorRole,
    ip,
  }) {
    const school = await School.findById(schoolId);
    let activeYearId = academicYearId;
    if (!activeYearId) {
      const currentYear = await AcademicYear.findOne({ schoolId, isCurrent: true });
      if (!currentYear) throw ApiError.badRequest("No active academic session found.");
      activeYearId = currentYear._id;
    }

    // Determine due date
    let calculatedDueDate = dueDate;
    if (!calculatedDueDate) {
      const dueDay = school?.settings?.feeDueDay || 10;
      calculatedDueDate = `${period}-${String(dueDay).padStart(2, "0")}`;
    }

    // 1. Fetch eligible enrolled students
    const enrollmentFilter = {
      schoolId,
      academicYearId: activeYearId,
      outcome: "active",
    };
    if (classId) enrollmentFilter.classId = classId;

    const enrollments = await Enrollment.find(enrollmentFilter).populate("studentId").lean();

    // 2. Fetch fee structures for this academic year
    const structures = await FeeStructure.find({
      schoolId,
      academicYearId: activeYearId,
    }).lean();

    const structureMap = new Map();
    structures.forEach((st) => structureMap.set(st.classId.toString(), st));

    let generatedCount = 0;
    let skippedCount = 0;

    for (const enrollment of enrollments) {
      const student = enrollment.studentId;
      if (!student || student.status !== "active") continue;

      // Idempotency check: Does voucher already exist for this student and period?
      const existing = await FeeVoucher.findOne({
        studentId: student._id,
        period,
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Determine fee items from structure or student default
      const st = structureMap.get(enrollment.classId.toString());
      let items = [];
      let subtotal = 0;

      if (st && st.items && st.items.length > 0) {
        items = st.items.map((i) => ({ name: i.name, amount: i.amount }));
        subtotal = items.reduce((sum, item) => sum + item.amount, 0);
      } else {
        const defaultTuition = student.feeAmount || 4500;
        items = [{ name: "Monthly Tuition Fee", amount: defaultTuition }];
        subtotal = defaultTuition;
      }

      const discount = 0;
      const fine = 0;
      const total = Math.max(0, subtotal - discount + fine);
      const balance = total;

      // Generate atomic sequential voucher number: VCH-YYYY-####
      const seq = await getNextSequence(schoolId, "fee_voucher");
      const yearStr = period.slice(0, 4);
      const voucherNo = `VCH-${yearStr}-${String(seq).padStart(4, "0")}`;

      await FeeVoucher.create({
        voucherNo,
        schoolId,
        studentId: student._id,
        enrollmentId: enrollment._id,
        academicYearId: activeYearId,
        period,
        items,
        subtotal,
        discount,
        fine,
        total,
        paidAmount: 0,
        balance,
        dueDate: calculatedDueDate,
        status: "unpaid",
      });

      generatedCount++;
    }

    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "FEE_VOUCHERS_GENERATE",
      entityType: "FeeVoucher",
      entityId: schoolId,
      after: {
        period,
        generatedCount,
        skippedCount,
        classId: classId || "all",
      },
      ip,
    });

    return {
      period,
      generatedCount,
      skippedCount,
      totalStudents: enrollments.length,
    };
  }

  /**
   * List vouchers with search, filtering, and summary totals
   */
  static async listVouchers({
    schoolId,
    period,
    classId,
    sectionId,
    status,
    q,
    page = 1,
    limit = 20,
  }) {
    const filter = { schoolId };
    if (period) filter.period = period;
    if (status) filter.status = status;

    if (classId || sectionId) {
      const enrollmentFilter = { schoolId };
      if (classId) enrollmentFilter.classId = classId;
      if (sectionId) enrollmentFilter.sectionId = sectionId;

      const matchingEnrollments = await Enrollment.find(enrollmentFilter).select("_id");
      filter.enrollmentId = { $in: matchingEnrollments.map((e) => e._id) };
    }

    if (q) {
      const cleanQ = q.trim();
      const matchingStudents = await Student.find({
        schoolId,
        $or: [
          { name: { $regex: cleanQ, $options: "i" } },
          { admissionNo: { $regex: cleanQ, $options: "i" } },
        ],
      }).select("_id");

      filter.$or = [
        { voucherNo: { $regex: cleanQ, $options: "i" } },
        { studentId: { $in: matchingStudents.map((s) => s._id) } },
      ];
    }

    const totalCount = await FeeVoucher.countDocuments(filter);
    const vouchers = await FeeVoucher.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("studentId", "name admissionNo rollNo emergencyContactPhone")
      .populate({
        path: "enrollmentId",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
        ],
      })
      .lean();

    // Aggregated financial summary for the filtered criteria
    const summaryAgg = await FeeVoucher.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalExpected: { $sum: "$total" },
          totalCollected: { $sum: "$paidAmount" },
          totalPending: { $sum: "$balance" },
        },
      },
    ]);

    const summary = summaryAgg[0] || {
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
    };

    return {
      vouchers,
      summary,
      meta: {
        page,
        limit,
        total: totalCount,
      },
    };
  }

  /**
   * Get single voucher details with payment history
   */
  static async getVoucherById(id, schoolId) {
    const voucher = await FeeVoucher.findOne({ _id: id, schoolId })
      .populate({
        path: "studentId",
        populate: { path: "guardianId", select: "name phone email" },
      })
      .populate({
        path: "enrollmentId",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
        ],
      })
      .lean();

    if (!voucher) throw ApiError.notFound("Fee voucher not found");

    const payments = await FeePayment.find({ voucherId: id })
      .sort({ receivedAt: -1 })
      .populate("receivedBy", "email phone role")
      .lean();

    return {
      ...voucher,
      payments,
    };
  }

  /**
   * Record fee collection / payment against a voucher (Append-only)
   */
  static async recordPayment({
    voucherId,
    schoolId,
    amount,
    method = "cash",
    reference = "",
    notes = "",
    actorId,
    actorRole,
    ip,
  }) {
    const voucher = await FeeVoucher.findOne({ _id: voucherId, schoolId });
    if (!voucher) throw ApiError.notFound("Fee voucher not found");

    if (voucher.status === "cancelled") {
      throw ApiError.badRequest("Cannot collect payment on a cancelled voucher.");
    }
    if (voucher.balance <= 0) {
      throw ApiError.badRequest("Voucher is already fully paid.");
    }
    if (amount > voucher.balance) {
      throw ApiError.badRequest(
        `Payment amount (PKR ${amount}) exceeds outstanding balance (PKR ${voucher.balance}).`
      );
    }

    // 1. Generate atomic receipt sequence: REC-YYYY-####
    const currentYear = new Date().getFullYear();
    const seq = await getNextSequence(schoolId, "fee_receipt");
    const receiptNo = `REC-${currentYear}-${String(seq).padStart(4, "0")}`;

    // 2. Append-only Payment Record
    const payment = await FeePayment.create({
      receiptNo,
      schoolId,
      voucherId,
      studentId: voucher.studentId,
      amount,
      method,
      reference: reference.trim(),
      notes: notes.trim(),
      receivedBy: actorId,
      receivedAt: new Date(),
      status: "posted",
    });

    // 3. Update Voucher Balance & Status
    const before = {
      paidAmount: voucher.paidAmount,
      balance: voucher.balance,
      status: voucher.status,
    };

    voucher.paidAmount += amount;
    voucher.balance = Math.max(0, voucher.total - voucher.paidAmount);

    if (voucher.balance === 0) {
      voucher.status = "paid";
    } else {
      voucher.status = "partial";
    }

    await voucher.save();

    // 4. Audit Log
    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "FEE_PAYMENT_COLLECT",
      entityType: "FeePayment",
      entityId: payment._id,
      before,
      after: {
        receiptNo,
        amount,
        paidAmount: voucher.paidAmount,
        balance: voucher.balance,
        status: voucher.status,
      },
      ip,
    });

    return {
      payment: payment.toJSON(),
      voucher: voucher.toJSON(),
    };
  }

  /**
   * Reverse a posted payment (creates reversal entry and restores balance)
   */
  static async reversePayment({ paymentId, schoolId, reason, actorId, actorRole, ip }) {
    const payment = await FeePayment.findOne({ _id: paymentId, schoolId });
    if (!payment) throw ApiError.notFound("Payment receipt not found");

    if (payment.status === "reversed") {
      throw ApiError.badRequest("This payment has already been reversed.");
    }

    const voucher = await FeeVoucher.findOne({ _id: payment.voucherId, schoolId });
    if (!voucher) throw ApiError.notFound("Associated voucher not found");

    // 1. Mark original payment as reversed
    payment.status = "reversed";
    payment.reversalReason = reason;
    await payment.save();

    // 2. Restore voucher balance
    const before = {
      paidAmount: voucher.paidAmount,
      balance: voucher.balance,
      status: voucher.status,
    };

    voucher.paidAmount = Math.max(0, voucher.paidAmount - payment.amount);
    voucher.balance = Math.max(0, voucher.total - voucher.paidAmount);

    if (voucher.paidAmount === 0) {
      voucher.status = "unpaid";
    } else if (voucher.balance > 0) {
      voucher.status = "partial";
    } else {
      voucher.status = "paid";
    }

    await voucher.save();

    // 3. Audit Log
    await logAuditEvent({
      schoolId,
      actorId,
      actorRole,
      action: "FEE_PAYMENT_REVERSAL",
      entityType: "FeePayment",
      entityId: payment._id,
      before,
      after: {
        receiptNo: payment.receiptNo,
        reversedAmount: payment.amount,
        newVoucherBalance: voucher.balance,
        reason,
      },
      ip,
    });

    return {
      message: `Receipt ${payment.receiptNo} reversed successfully.`,
      voucher: voucher.toJSON(),
    };
  }

  /**
   * Defaulters and overdue fees report
   */
  static async getDefaulters({ schoolId, classId, sectionId, minDaysOverdue = 0 }) {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const filter = {
      schoolId,
      status: { $in: ["unpaid", "partial"] },
      dueDate: { $lt: today },
    };

    if (classId || sectionId) {
      const enrollmentFilter = { schoolId };
      if (classId) enrollmentFilter.classId = classId;
      if (sectionId) enrollmentFilter.sectionId = sectionId;

      const matchingEnrollments = await Enrollment.find(enrollmentFilter).select("_id");
      filter.enrollmentId = { $in: matchingEnrollments.map((e) => e._id) };
    }

    const vouchers = await FeeVoucher.find(filter)
      .sort({ dueDate: 1 })
      .populate({
        path: "studentId",
        select: "name admissionNo rollNo emergencyContactPhone",
        populate: { path: "guardianId", select: "name phone" },
      })
      .populate({
        path: "enrollmentId",
        populate: [
          { path: "classId", select: "name" },
          { path: "sectionId", select: "name" },
        ],
      })
      .lean();

    const defaulters = vouchers
      .map((v) => {
        const diffDays = Math.round(
          (Date.parse(today) - Date.parse(v.dueDate)) / (1000 * 60 * 60 * 24)
        );

        return {
          voucherId: v._id,
          voucherNo: v.voucherNo,
          studentId: v.studentId?._id,
          studentName: v.studentId?.name,
          admissionNo: v.studentId?.admissionNo,
          className: v.enrollmentId?.classId?.name || "Class",
          sectionName: v.enrollmentId?.sectionId?.name || "A",
          guardianName: v.studentId?.guardianId?.name,
          guardianPhone: v.studentId?.guardianId?.phone || v.studentId?.emergencyContactPhone,
          dueDate: v.dueDate,
          daysOverdue: diffDays,
          total: v.total,
          paidAmount: v.paidAmount,
          balance: v.balance,
          period: v.period,
        };
      })
      .filter((d) => d.daysOverdue >= minDaysOverdue);

    return defaulters;
  }
}
