import { connectDB, disconnectDB } from "../config/db.js";
import { School } from "../modules/school/school.model.js";
import { AcademicYear } from "../modules/academic/academic-year.model.js";
import { Class } from "../modules/academic/class.model.js";
import { Section } from "../modules/academic/section.model.js";
import { Student } from "../modules/student/student.model.js";
import { Guardian } from "../modules/student/guardian.model.js";
import { Enrollment } from "../modules/student/enrollment.model.js";
import { FeeVoucher } from "../modules/fee/fee-voucher.model.js";

const FIRST_NAMES = [
  "Muhammad",
  "Ali",
  "Ahmed",
  "Fatima",
  "Ayesha",
  "Zainab",
  "Hamza",
  "Bilal",
  "Usman",
  "Omar",
  "Hassan",
  "Hussein",
  "Maryam",
  "Khadija",
  "Ibrahim",
  "Yusuf",
  "Mustafa",
  "Sara",
  "Hiba",
  "Anum",
];

const LAST_NAMES = [
  "Khan",
  "Malik",
  "Chaudhry",
  "Bhatti",
  "Qureshi",
  "Syed",
  "Raza",
  "Siddiqui",
  "Abbasi",
  "Mirza",
  "Farooq",
  "Ansari",
  "Rehman",
  "Tariq",
  "Javed",
  "Iqbal",
];

/**
 * Seed 2,000 students with guardians, enrollments, and fee vouchers for load testing.
 */
export async function seedScaleData(targetCount = 2000) {
  console.log(`🚀 Starting high-volume seed benchmark for ${targetCount} students...`);
  const startTime = Date.now();

  // 1. Get or create school
  let school = await School.findOne({ code: "APEX" });
  if (!school) {
    school = await School.create({
      name: "Apex International School",
      code: "APEX",
      address: "Main Campus, Education City",
      phone: "+92 300 0000000",
    });
  }

  // 2. Get or create active academic year
  let academicYear = await AcademicYear.findOne({ schoolId: school._id, isCurrent: true });
  if (!academicYear) {
    academicYear = await AcademicYear.create({
      schoolId: school._id,
      name: "2026-2027",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2027-06-30"),
      isCurrent: true,
      status: "active",
    });
  }

  // 3. Ensure 10 classes (Grade 1 to 10) with 2 sections each (A and B) = 20 sections
  const sectionIds = [];
  const classMap = new Map();

  for (let g = 1; g <= 10; g++) {
    const className = `Grade ${g}`;
    let cls = await Class.findOne({ schoolId: school._id, name: className });
    if (!cls) {
      cls = await Class.create({
        schoolId: school._id,
        name: className,
        numericOrder: g,
      });
    }
    classMap.set(g, cls._id);

    for (const secName of ["A", "B"]) {
      let sec = await Section.findOne({
        schoolId: school._id,
        classId: cls._id,
        name: secName,
      });
      if (!sec) {
        sec = await Section.create({
          schoolId: school._id,
          classId: cls._id,
          name: secName,
          capacity: 120,
        });
      }
      sectionIds.push({
        classId: cls._id,
        sectionId: sec._id,
        grade: g,
        name: `${className}-${secName}`,
      });
    }
  }

  console.log(`✅ Academic structure ready (${sectionIds.length} sections across 10 grades)`);

  // Check how many students already exist
  const existingCount = await Student.countDocuments({ schoolId: school._id });
  if (existingCount >= targetCount) {
    console.log(`ℹ️ Already seeded with ${existingCount} students. Skipping generation.`);
    return { count: existingCount, durationMs: Date.now() - startTime };
  }

  const toCreate = targetCount - existingCount;
  console.log(`🌱 Generating ${toCreate} student records in high-performance batches...`);

  const BATCH_SIZE = 500;
  let createdTotal = 0;
  const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM

  for (let batch = 0; batch < Math.ceil(toCreate / BATCH_SIZE); batch++) {
    const batchStart = batch * BATCH_SIZE;
    const batchCount = Math.min(BATCH_SIZE, toCreate - batchStart);

    const guardiansBatch = [];
    const studentsBatch = [];
    const enrollmentsBatch = [];
    const vouchersBatch = [];

    for (let i = 0; i < batchCount; i++) {
      const idx = existingCount + createdTotal + i + 1;
      const firstName = FIRST_NAMES[idx % FIRST_NAMES.length];
      const lastName = LAST_NAMES[idx % LAST_NAMES.length];
      const studentName = `${firstName} ${lastName}`;
      const admissionNo = `ADM-2026-${String(idx).padStart(4, "0")}`;
      const secInfo = sectionIds[idx % sectionIds.length];

      // Guardian
      const guardian = {
        schoolId: school._id,
        name: `M. ${lastName}`,
        relation: "father",
        phone: `+92300${String(1000000 + (idx % 8999999))}`,
        email: `guardian.${idx}@apexschool.com`,
      };
      guardiansBatch.push(guardian);

      // Student placeholder (will receive guardian ID after guardian insert)
      studentsBatch.push({
        schoolId: school._id,
        admissionNo,
        name: studentName,
        dob: new Date("2012-04-15"),
        gender: idx % 2 === 0 ? "male" : "female",
        status: "active",
        secInfo,
        rollNo: (idx % 50) + 1,
      });
    }

    // 1. Insert Guardians
    const insertedGuardians = await Guardian.insertMany(guardiansBatch, { ordered: false });

    // 2. Prepare Students with guardian IDs
    const studentDocs = studentsBatch.map((s, i) => ({
      schoolId: s.schoolId,
      admissionNo: s.admissionNo,
      name: s.name,
      dob: s.dob,
      gender: s.gender,
      guardianIds: [insertedGuardians[i]._id],
      status: s.status,
    }));

    const insertedStudents = await Student.insertMany(studentDocs, { ordered: false });

    // 3. Prepare Enrollments and Vouchers
    for (let i = 0; i < insertedStudents.length; i++) {
      const stu = insertedStudents[i];
      const meta = studentsBatch[i];

      enrollmentsBatch.push({
        schoolId: school._id,
        studentId: stu._id,
        academicYearId: academicYear._id,
        classId: meta.secInfo.classId,
        sectionId: meta.secInfo.sectionId,
        rollNo: meta.rollNo,
        outcome: "active",
      });

      vouchersBatch.push({
        voucherNo: `VCH-2026-${String(existingCount + createdTotal + i + 1).padStart(4, "0")}`,
        schoolId: school._id,
        studentId: stu._id,
        academicYearId: academicYear._id,
        period: currentPeriod,
        items: [{ name: "Monthly Tuition Fee", amount: 4500 }],
        subtotal: 4500,
        discount: 0,
        fine: 0,
        total: 4500,
        paidAmount: i % 3 === 0 ? 4500 : i % 3 === 1 ? 2000 : 0,
        balance: i % 3 === 0 ? 0 : i % 3 === 1 ? 2500 : 4500,
        dueDate: `${currentPeriod}-10`,
        status: i % 3 === 0 ? "paid" : i % 3 === 1 ? "partial" : "unpaid",
      });
    }

    await Enrollment.insertMany(enrollmentsBatch, { ordered: false });
    await FeeVoucher.insertMany(vouchersBatch, { ordered: false });

    createdTotal += batchCount;
    process.stdout.write(`   ↳ Seeded ${createdTotal} / ${toCreate} students...\r`);
  }

  const totalTime = Date.now() - startTime;
  console.log(
    `\n🎉 Successfully completed scale seed of ${targetCount} students in ${(totalTime / 1000).toFixed(2)}s`
  );
  return { count: targetCount, durationMs: totalTime };
}

// Standalone runner execution: node src/seed/seed-scale.js
if (process.argv[1]?.endsWith("seed-scale.js")) {
  (async () => {
    try {
      await connectDB();
      await seedScaleData(2000);
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error("❌ Seeding failed:", err);
      process.exit(1);
    }
  })();
}
