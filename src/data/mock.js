export const ACADEMIC_SESSION = "2026–2027 · Term 1";

export const CLASSES = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"];

export const SECTIONS = ["A", "B", "C"];

export const SUBJECTS = ["Math", "English", "Science", "Urdu", "Computer"];

export const EXAM_TERMS = ["Mid-term", "Final"];

export const PAYMENT_METHODS = ["Cash", "Bank Transfer"];

const FIRST = ["Ayesha", "Bilal", "Hira", "Zain", "Fatima", "Omar", "Sana", "Ali", "Noor", "Hamza", "Aiman", "Usman", "Zoya", "Bilal", "Mariam", "Hassan", "Areeba", "Talha", "Komal", "Raza"];
const LAST = ["Khan", "Ahmed", "Malik", "Sheikh", "Raza", "Iqbal", "Butt", "Cheema", "Siddiqui", "Hashmi"];
const PARENTS = ["Khan", "Ahmed", "Malik", "Sheikh", "Iqbal"];

export const STUDENTS = Array.from({ length: 24 }).map((_, i) => {
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
    id: i + 1,
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

export const TEACHERS = [
  { id: 1, name: "Ms. Nadia Hussain", subject: "Mathematics", class: "Grade 10", email: "nadia.h@apex.edu", phone: "+92 301 111 2233", status: "Active", experience: "8 yrs", qualification: "M.Sc Mathematics" },
  { id: 2, name: "Mr. Faisal Ahmed", subject: "English", class: "Grade 9", email: "faisal.a@apex.edu", phone: "+92 302 222 3344", status: "Active", experience: "11 yrs", qualification: "M.A English" },
  { id: 3, name: "Ms. Saima Tariq", subject: "Science", class: "Grade 7", email: "saima.t@apex.edu", phone: "+92 303 333 4455", status: "Active", experience: "6 yrs", qualification: "M.Sc Physics" },
  { id: 4, name: "Mr. Kamran Ali", subject: "Computer", class: "Grade 8", email: "kamran.a@apex.edu", phone: "+92 304 444 5566", status: "Active", experience: "9 yrs", qualification: "BS Computer Science" },
  { id: 5, name: "Ms. Rabia Anwar", subject: "Urdu", class: "Grade 6", email: "rabia.a@apex.edu", phone: "+92 305 555 6677", status: "On Leave", experience: "5 yrs", qualification: "M.A Urdu" },
  { id: 6, name: "Mr. Imran Sheikh", subject: "Mathematics", class: "Grade 5", email: "imran.s@apex.edu", phone: "+92 306 666 7788", status: "Active", experience: "7 yrs", qualification: "M.Sc Mathematics" },
  { id: 7, name: "Ms. Hina Javed", subject: "English", class: "Grade 4", email: "hina.j@apex.edu", phone: "+92 307 777 8899", status: "Active", experience: "4 yrs", qualification: "M.A English" },
  { id: 8, name: "Mr. Adnan Malik", subject: "Science", class: "Grade 3", email: "adnan.m@apex.edu", phone: "+92 308 888 9900", status: "Active", experience: "10 yrs", qualification: "M.Sc Chemistry" },
];

export const RECENT_ACTIVITY = [
  { id: 1, type: "fee", title: "Fee collected from Ayesha Khan", detail: "PKR 5,000 · Cash", time: "10 min ago" },
  { id: 2, type: "admission", title: "New admission: Bilal Ahmed", detail: "Grade 5 · Section A", time: "1 hr ago" },
  { id: 3, type: "attendance", title: "Attendance marked for Grade 7-A", detail: "38 / 40 present", time: "2 hrs ago" },
  { id: 4, type: "exam", title: "Mid-term results published", detail: "Grade 9 · Science", time: "5 hrs ago" },
  { id: 5, type: "fee", title: "Fee collected from Zain Sheikh", detail: "PKR 4,500 · Bank Transfer", time: "Yesterday" },
  { id: 6, type: "admission", title: "New admission: Noor Malik", detail: "Grade 2 · Section B", time: "Yesterday" },
];

export const MONTHLY_COLLECTION = [
  { month: "May", amount: 42000 },
  { month: "Jun", amount: 55500 },
  { month: "Jul", amount: 48200 },
  { month: "Aug", amount: 67800 },
  { month: "Sep", amount: 72400 },
  { month: "Oct", amount: 81600 },
];

export const getGradeFromPct = (pct) => {
  if (pct >= 90) return "A+";
  if (pct >= 80) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "F";
};

export const gradeColor = (g) => {
  if (g === "A+") return "text-emerald-600";
  if (g === "A") return "text-brand-600";
  if (g === "B") return "text-sky-600";
  if (g === "C") return "text-amber-600";
  if (g === "D") return "text-orange-600";
  return "text-rose-600";
};

export const feeStatusStyle = {
  Paid: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  Pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  Overdue: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
};

export const formatPKR = (n) =>
  "PKR " + new Intl.NumberFormat("en-PK").format(Math.round(n));
