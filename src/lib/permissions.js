export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  TEACHER: "teacher",
  ACCOUNTANT: "accountant",
  STUDENT: "student",
  PARENT: "parent",
};

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Administrator",
  [ROLES.ADMIN]: "Administrator",
  [ROLES.TEACHER]: "Teacher",
  [ROLES.ACCOUNTANT]: "Accountant",
  [ROLES.STUDENT]: "Student",
  [ROLES.PARENT]: "Parent",
};

export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ["*"],
  [ROLES.ADMIN]: [
    "users:read",
    "users:create",
    "users:update",
    "users:deactivate",
    "school:read",
    "school:update",
    "academic:read",
    "academic:write",
    "students:read",
    "students:write",
    "staff:read",
    "staff:write",
    "attendance:read",
    "attendance:write",
    "attendance:override",
    "timetable:read",
    "timetable:write",
    "fees:read",
    "fees:write",
    "fees:reverse",
    "exams:read",
    "exams:write",
    "notices:read",
    "notices:write",
    "reports:read",
    "audit:read",
  ],
  [ROLES.TEACHER]: [
    "users:read_self",
    "school:read",
    "academic:read",
    "students:read_own_sections",
    "staff:read_self",
    "attendance:read_own_sections",
    "attendance:write_own_sections",
    "timetable:read_own",
    "exams:read",
    "exams:marks_entry_own",
    "notices:read",
    "notices:create_own_sections",
    "reports:read_own_sections",
  ],
  [ROLES.ACCOUNTANT]: [
    "users:read_self",
    "school:read",
    "academic:read",
    "students:read_fee_fields",
    "staff:read_self",
    "fees:read",
    "fees:write",
    "fees:reverse",
    "notices:read",
    "reports:read_finance",
  ],
  [ROLES.STUDENT]: [
    "users:read_self",
    "academic:read_own",
    "students:read_self",
    "attendance:read_self",
    "timetable:read_own_section",
    "fees:read_self",
    "exams:read_published_self",
    "notices:read",
  ],
  [ROLES.PARENT]: [
    "users:read_self",
    "academic:read_own_children",
    "students:read_own_children",
    "attendance:read_own_children",
    "timetable:read_own_children",
    "fees:read_own_children",
    "exams:read_published_own_children",
    "notices:read",
  ],
};

/**
 * Checks whether a given user object possesses a specific permission.
 */
export function can(user, permission) {
  if (!user || !user.role) return false;
  const permissions = ROLE_PERMISSIONS[user.role] || [];
  if (permissions.includes("*")) return true;
  return permissions.includes(permission);
}

