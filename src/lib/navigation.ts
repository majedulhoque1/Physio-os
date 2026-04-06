import {
  BarChart3,
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  Mail,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react";
import { canAccessPath } from "@/lib/permissions";
import type { ClinicStaffRole, NavItem, RouteMeta } from "@/types";

const baseDesktopNavItems: NavItem[] = [
  {
    href: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
    title: "Dashboard",
    breadcrumbs: ["Physio OS", "Dashboard"],
    end: true,
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
    href: "/therapists",
    icon: Stethoscope,
    label: "Therapists",
    title: "Therapists",
    breadcrumbs: ["Team", "Therapists"],
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
  {
    href: "/messages",
    icon: Mail,
    label: "Messages",
    title: "Message Log",
    breadcrumbs: ["Clinic", "Messages"],
  },
];

// Settings is in the sidebar footer, not the main nav list
export const settingsNavItem: NavItem = {
  href: "/settings",
  icon: Settings,
  label: "Settings",
  title: "Settings",
  breadcrumbs: ["Clinic", "Settings"],
};

export function getDesktopNavItems(role: ClinicStaffRole | null | undefined) {
  return baseDesktopNavItems.filter((item) => canAccessPath(item.href, role));
}

export function getMobileNavItems(role: ClinicStaffRole | null | undefined) {
  const desktopNavItems = getDesktopNavItems(role);

  return [
    desktopNavItems[0],
    desktopNavItems.find((item) => item.href === "/appointments"),
    desktopNavItems.find((item) => item.href === "/patients"),
    desktopNavItems.find((item) => item.href === "/billing"),
    desktopNavItems.find((item) => item.href === "/therapists"),
  ]
    .filter(Boolean)
    .map((item) => {
      if (item?.href === "/appointments") {
        return {
          ...item,
          mobileLabel: "Appts",
        };
      }

      if (item?.href === "/therapists") {
        return {
          ...item,
          mobileLabel: "Team",
        };
      }

      return item;
    }) as NavItem[];
}

export function getRouteMeta(pathname: string): RouteMeta {
  if (pathname.startsWith("/patients/")) {    return {
      title: "Patient Profile",
      breadcrumbs: ["Patients", "Patient Profile"],
    };
  }

  if (pathname === "/settings") return settingsNavItem;

  const matchedRoute = baseDesktopNavItems.find((item) =>
    item.href === "/" ? pathname === item.href : pathname.startsWith(item.href),
  );

  return (
    matchedRoute ?? {
      title: "Dashboard",
      breadcrumbs: ["Physio OS", "Dashboard"],
    }
  );
}
