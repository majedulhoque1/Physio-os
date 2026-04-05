import type { ClinicStaffRole } from "@/types";

export type AppPermission =
  | "manage_appointments"
  | "manage_billing"
  | "manage_clinic"
  | "manage_patients"
  | "manage_therapists"
  | "record_session_notes"
  | "view_analytics"
  | "view_billing";

const permissionsByRole: Record<ClinicStaffRole, AppPermission[]> = {
  clinic_admin: [
    "manage_appointments",
    "manage_billing",
    "manage_clinic",
    "manage_patients",
    "manage_therapists",
    "record_session_notes",
    "view_analytics",
    "view_billing",
  ],
  receptionist: [
    "manage_appointments",
    "manage_billing",
    "manage_patients",
    "view_analytics",
    "view_billing",
  ],
  therapist: ["record_session_notes"],
};

export function hasPermission(
  role: ClinicStaffRole | null | undefined,
  permission: AppPermission,
) {
  if (!role) return false;
  return permissionsByRole[role].includes(permission);
}

function isPatientProfilePath(pathname: string) {
  return pathname.startsWith("/patients/");
}

export function canAccessPath(
  pathname: string,
  role: ClinicStaffRole | null | undefined,
) {
  if (!role) return false;

  if (pathname === "/" || pathname === "/appointments" || pathname === "/patients") {
    return true;
  }

  if (isPatientProfilePath(pathname)) {
    return true;
  }

  if (pathname === "/therapists" || pathname === "/settings") {
    return true;
  }

  if (pathname === "/leads") {
    return role === "clinic_admin" || role === "receptionist";
  }

  if (pathname === "/billing") {
    return hasPermission(role, "view_billing");
  }

  if (pathname === "/analytics") {
    return hasPermission(role, "view_analytics");
  }

  return false;
}
