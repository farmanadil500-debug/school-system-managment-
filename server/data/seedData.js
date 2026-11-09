const FIRST = ["Ayesha", "Bilal", "Hira", "Zain", "Fatima", "Omar", "Sana", "Ali", "Noor", "Hamza", "Aiman", "Usman", "Zoya", "Bilal", "Mariam", "Hassan", "Areeba", "Talha", "Komal", "Raza"];
const LAST = ["Khan", "Ahmed", "Malik", "Sheikh", "Raza", "Iqbal", "Butt", "Cheema", "Siddiqui", "Hashmi"];
const PARENTS = ["Khan", "Ahmed", "Malik", "Sheikh", "Iqbal"];
const CLASSES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];
const SECTIONS = ["A", "B", "C"];

export const INITIAL_STUDENTS = Array.from({ length: 24 }).map((_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[i % LAST.length];
  const cls = CLASSES[i % CLASSES.length];
  const section = SECTIONS[i % SECTIONS.length];
  const roll = 100 + i + 1;
  const gender = i % 2 === 0 ? "Female" : "Male";
  const parent = PARENTS[i % PARENTS.length];
  const phone = `+92 3${(i % 9) + 1}0 ${(100 + i).toString().padStart(3, "0")} ${(2000 + i).toString().slice(-4)}`;
  const admissionDate = `2026-0${(i % 9) + 1}-${((i % 27) + 1).toString().padStart(2, "0")}`;
  const status = i % 7 === 0 ? "Inactive" : "Active";
  const feeStatus = i % 3 === 0 ? "Pending" : i % 5 === 0 ? "Overdue" : "Paid";
  const feeAmount = 4500 + (i % 5) * 500;

  return {
    name: `${first} ${last}`,
    rollNo: roll,
    class: cls,
    section,
    gender,
    parentName: `${first[0]}. ${parent}`,
    phone,
    admissionDate,
    status,
    feeStatus,
    feeAmount,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@apex.edu`,
    address: `House ${100 + i}, Block ${section}, Gulberg, Lahore`,
    dob: `201${(i % 8) + 1}-0${(i % 8) + 1}-1${i % 9}`,
    bloodGroup: ["A+", "B+", "O+", "AB+"][i % 4],
  };
});

