import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import type { NavItem, RouteMeta } from "@/types";

export const desktopNavItems: NavItem[] = [
  {
    href: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
    title: "Dashboard",
    breadcrumbs: ["Physio OS", "Dashboard"],
    end: true,
  },
  {
    href: "/leads",
    icon: UserPlus,
    label: "Leads",
    title: "Lead Pipeline",
    breadcrumbs: ["Physio OS", "Lead Pipeline"],
    badge: 12,
  },
  {
    href: "/appointments",
    icon: CalendarDays,
    label: "Appointments",
    title: "Appointments",
    breadcrumbs: ["Clinic", "Appointments"],
  },
  {
    href: "/patients",
    icon: Users,
    label: "Patients",
    title: "Patients",
    breadcrumbs: ["Clinic", "Patients"],
  },
  {
    href: "/workspace",
    icon: Stethoscope,
    label: "Therapists",
    title: "Therapist Workspace",
    breadcrumbs: ["Team", "Therapist Workspace"],
  },
  {
    href: "/billing",
    icon: CreditCard,
    label: "Billing",
    title: "Billing",
    breadcrumbs: ["Clinic", "Billing"],
  },
  {
    href: "/analytics",
    icon: BarChart3,
    label: "Analytics",
    title: "Analytics",
    breadcrumbs: ["Clinic", "Analytics"],
  },
];

export const mobileNavItems: NavItem[] = [
  desktopNavItems[0],
  desktopNavItems[1],
  {
    ...desktopNavItems[2],
    mobileLabel: "Appts",
  },
  desktopNavItems[3],
  desktopNavItems[5],
];

export function getRouteMeta(pathname: string): RouteMeta {
  if (pathname.startsWith("/patients/")) {
    return {
      title: "Patient Profile",
      breadcrumbs: ["Patients", "Patient Profile"],
    };
  }

  const matchedRoute = desktopNavItems.find((item) =>
    item.href === "/" ? pathname === item.href : pathname.startsWith(item.href),
  );

  return (
    matchedRoute ?? {
      title: "Dashboard",
      breadcrumbs: ["Physio OS", "Dashboard"],
    }
  );
}
