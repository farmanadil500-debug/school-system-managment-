import bcrypt from "bcryptjs";
import { connectDB, disconnectDB } from "../config/db.js";
import { School } from "../modules/school/school.model.js";
import { User } from "../modules/user/user.model.js";
import { Staff } from "../modules/staff/staff.model.js";
import { Guardian } from "../modules/student/guardian.model.js";
import { Student } from "../modules/student/student.model.js";
import { Class } from "../modules/academic/class.model.js";
import { Section } from "../modules/academic/section.model.js";
import { AcademicYear } from "../modules/academic/academic-year.model.js";
import { Enrollment } from "../modules/student/enrollment.model.js";
import { ROLES, USER_STATUS } from "../constants/index.js";

export async function seedDemoAccounts() {
  console.log("🌱 Starting Demo Accounts seed process...");

  // 1. Ensure Default School exists
  let school = await School.findOne({ code: "APEX" });
  if (!school) {
    school = await School.create({
      name: "Apex International School",
      code: "APEX",
      address: "Main Campus, Education City",
      phone: "+92 300 0000000",
      settings: {
        currency: "PKR",
        timezone: "Asia/Karachi",
        gradingScheme: "standard",
        feeDueDay: 10,
        lateFine: 500,
        attendanceEditDays: 2,
      },
    });
    console.log(`✅ Default school created: ${school.name}`);
  }

  // 2. Ensure Academic Year & Classes exist
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

  let class5 = await Class.findOne({ schoolId: school._id, name: "Grade 5" });
  if (!class5) {
    class5 = await Class.create({ schoolId: school._id, name: "Grade 5", numericOrder: 5 });
  }

  let sectionA = await Section.findOne({ schoolId: school._id, classId: class5._id, name: "A" });
  if (!sectionA) {
    sectionA = await Section.create({ schoolId: school._id, classId: class5._id, name: "A", capacity: 40 });
  }

  let class3 = await Class.findOne({ schoolId: school._id, name: "Grade 3" });
  if (!class3) {
    class3 = await Class.create({ schoolId: school._id, name: "Grade 3", numericOrder: 3 });
  }

  let section3A = await Section.findOne({ schoolId: school._id, classId: class3._id, name: "A" });
  if (!section3A) {
    section3A = await Section.create({ schoolId: school._id, classId: class3._id, name: "A", capacity: 40 });
  }

  const salt = await bcrypt.genSalt(12);

  // 3. Ensure Super Admin exists
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@apexschool.com";
  let superAdmin = await User.findOne({ email: adminEmail });
  if (!superAdmin) {
    const passwordHash = await bcrypt.hash("Admin@123456", salt);
    superAdmin = await User.create({
      schoolId: school._id,
      email: adminEmail,
      phone: "+923000000000",
      passwordHash,
      role: ROLES.SUPER_ADMIN,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: false,
    });
    console.log(`✅ Super Admin created: ${adminEmail} (pass: Admin@123456)`);
  }

  // 4. Ensure Teacher exists
  const teacherEmail = "teacher@apexschool.com";
  let teacherUser = await User.findOne({ email: teacherEmail });
  let teacherStaff = await Staff.findOne({ schoolId: school._id, email: teacherEmail });
  if (!teacherStaff) {
    teacherStaff = await Staff.create({
      schoolId: school._id,
      employeeNo: "EMP-001",
      name: "Sir Aslam",
      gender: "male",
      phone: "+923001112233",
      email: teacherEmail,
      staffType: "teacher",
      designation: "Senior Science Teacher",
      status: "active",
      joiningDate: new Date("2024-01-15"),
    });
  }

  if (!teacherUser) {
    const passwordHash = await bcrypt.hash("Teacher@123", salt);
    teacherUser = await User.create({
      schoolId: school._id,
      staffId: teacherStaff._id,
      email: teacherEmail,
      phone: "+923001112233",
      passwordHash,
      role: ROLES.TEACHER,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: false,
    });
    console.log(`✅ Teacher created: ${teacherEmail} (pass: Teacher@123)`);
  }

  // Assign teacher as class teacher of Grade 5 - Section A
  sectionA.classTeacherId = teacherStaff._id;
  await sectionA.save();

  // 5. Ensure Accountant exists
  const accountantEmail = "accountant@apexschool.com";
  let accountantUser = await User.findOne({ email: accountantEmail });
  let accountantStaff = await Staff.findOne({ schoolId: school._id, email: accountantEmail });
  if (!accountantStaff) {
    accountantStaff = await Staff.create({
      schoolId: school._id,
      employeeNo: "EMP-002",
      name: "Mr. Tariq Accountant",
      gender: "male",
      phone: "+923002223344",
      email: accountantEmail,
      staffType: "accountant",
      designation: "Accounts Officer",
      status: "active",
      joiningDate: new Date("2024-02-01"),
    });
  }

  if (!accountantUser) {
    const passwordHash = await bcrypt.hash("Accountant@123", salt);
    accountantUser = await User.create({
      schoolId: school._id,
      staffId: accountantStaff._id,
      email: accountantEmail,
      phone: "+923002223344",
      passwordHash,
      role: ROLES.ACCOUNTANT,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: false,
    });
    console.log(`✅ Accountant created: ${accountantEmail} (pass: Accountant@123)`);
  }

  // 6. Ensure Parent exists with 2 children
  const parentEmail = "parent@apexschool.com";
  let parentGuardian = await Guardian.findOne({ schoolId: school._id, email: parentEmail });
  if (!parentGuardian) {
    parentGuardian = await Guardian.create({
      schoolId: school._id,
      name: "Muhammad Rashid",
      relation: "father",
      phone: "+923001234567",
      email: parentEmail,
      occupation: "Civil Engineer",
      cnic: "35201-1234567-1",
    });
  }

  // Drop legacy index if present from old prototype
  await Student.collection.dropIndex("rollNo_1").catch(() => { });

  // Child 1: Hamza Rashid (Grade 5 - A)
  let student1 = await Student.findOne({ schoolId: school._id, admissionNo: "ADM-2026-0001" });
  if (!student1) {
    student1 = await Student.create({
      schoolId: school._id,
      admissionNo: "ADM-2026-0001",
      name: "Hamza Rashid",
      dob: new Date("2014-06-12"),
      gender: "male",
      guardianIds: [parentGuardian._id],
      status: "active",
      bloodGroup: "B+",
      rollNo: 1,
    });

    await Enrollment.create({
      schoolId: school._id,
      studentId: student1._id,
      academicYearId: academicYear._id,
      classId: class5._id,
      sectionId: sectionA._id,
      rollNo: 1,
      outcome: "active",
    });
  }

  // Child 2: Ayesha Rashid (Grade 3 - A)
  let student2 = await Student.findOne({ schoolId: school._id, admissionNo: "ADM-2026-0002" });
  if (!student2) {
    student2 = await Student.create({
      schoolId: school._id,
      admissionNo: "ADM-2026-0002",
      name: "Ayesha Rashid",
      dob: new Date("2016-09-20"),
      gender: "female",
      guardianIds: [parentGuardian._id],
      status: "active",
      bloodGroup: "O+",
      rollNo: 2,
    });

    await Enrollment.create({
      schoolId: school._id,
      studentId: student2._id,
      academicYearId: academicYear._id,
      classId: class3._id,
      sectionId: section3A._id,
      rollNo: 3,
      outcome: "active",
    });
  }

  let parentUser = await User.findOne({ email: parentEmail });
  if (!parentUser) {
    const passwordHash = await bcrypt.hash("Parent@123", salt);
    parentUser = await User.create({
      schoolId: school._id,
      guardianId: parentGuardian._id,
      email: parentEmail,
      phone: "+923001234567",
      passwordHash,
      role: ROLES.PARENT,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: false,
    });
    console.log(`✅ Parent created: ${parentEmail} (pass: Parent@123) with 2 children`);
  }

  // 7. Ensure Student account exists (linked to Hamza Rashid)
  const studentEmail = "student@apexschool.com";
  let studentUser = await User.findOne({ email: studentEmail });
  if (!studentUser) {
    const passwordHash = await bcrypt.hash("Student@123", salt);
    studentUser = await User.create({
      schoolId: school._id,
      studentId: student1._id,
      email: studentEmail,
      phone: "+923009998877",
      passwordHash,
      role: ROLES.STUDENT,
      status: USER_STATUS.ACTIVE,
      mustChangePassword: false,
    });
    console.log(`✅ Student created: ${studentEmail} (pass: Student@123)`);
  }

  console.log("🎉 All Demo Accounts ready!");
  return { school, superAdmin, teacherUser, accountantUser, parentUser, studentUser };
}

// Standalone runner execution: node src/seed/seed-admin.js
if (process.argv[1]?.endsWith("seed-admin.js")) {
  (async () => {
    try {
      await connectDB();
      await seedDemoAccounts();
      console.log("🎉 Seeding completed successfully.");
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error("❌ Seeding failed:", err.message);
      await disconnectDB();
      process.exit(1);
    }
  })();
}
