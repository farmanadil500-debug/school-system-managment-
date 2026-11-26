import { FeeService } from "./fee.service.js";

export class FeeController {
  static async createFeeStructure(req, res) {
    const structure = await FeeService.createOrUpdateFeeStructure({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });

    res.status(200).json({
      success: true,
      data: structure,
    });
  }

  static async getFeeStructures(req, res) {
    const structures = await FeeService.getFeeStructures({
      schoolId: req.user.schoolId,
      academicYearId: req.query.academicYearId,
    });

    res.status(200).json({
      success: true,
      data: structures,
    });
  }

  static async generateVouchers(req, res) {
    const result = await FeeService.generateMonthlyVouchers({
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  static async listVouchers(req, res) {
    const result = await FeeService.listVouchers({
      schoolId: req.user.schoolId,
      ...req.query,
    });

    res.status(200).json({
      success: true,
      data: result.vouchers,
      summary: result.summary,
      meta: result.meta,
    });
  }

  static async getVoucherById(req, res) {
    const voucher = await FeeService.getVoucherById(req.params.id, req.user.schoolId);
    res.status(200).json({
      success: true,
      data: voucher,
    });
  }

  static async recordPayment(req, res) {
    const result = await FeeService.recordPayment({
      voucherId: req.params.id,
      schoolId: req.user.schoolId,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
      ...req.body,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  }

  static async reversePayment(req, res) {
    const result = await FeeService.reversePayment({
      paymentId: req.params.paymentId,
      schoolId: req.user.schoolId,
      reason: req.body.reason,
      actorId: req.user.userId,
      actorRole: req.user.role,
      ip: req.ip || "",
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  }

  static async getDefaulters(req, res) {
    const defaulters = await FeeService.getDefaulters({
      schoolId: req.user.schoolId,
      ...req.query,
    });

    res.status(200).json({
      success: true,
      data: defaulters,
    });
  }
}
