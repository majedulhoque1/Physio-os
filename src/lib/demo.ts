import type { User } from "@supabase/supabase-js";
import type {
  ClinicMembershipRow,
  ClinicRow,
  ClinicStaffRole,
  UserProfileRow,
} from "@/types";

export const DEMO_PASSWORD = "Majed123";
export const DEMO_CLINIC_ID = "demo-clinic-physio-os";

export interface DemoAccount {
  email: string;
  fullName: string;
  id: string;
  role: ClinicStaffRole;
  therapistId: string | null;
}

export const DEMO_CLINIC: ClinicRow = {
  created_at: "2026-04-01T09:00:00.000Z",
  id: DEMO_CLINIC_ID,
  name: "Physio OS Demo Clinic",
  owner_user_id: "demo-user-admin",
  slug: "physio-os-demo",
  updated_at: "2026-04-01T09:00:00.000Z",
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: "majedulhoqueofficial@gmail.com",
    fullName: "Majedul Hoque",
    id: "demo-user-admin",
    role: "clinic_admin",
    therapistId: null,
  },
  {
    email: "kortehobepash@gmail.com",
    fullName: "Dr. Korte Hobe Pash",
    id: "demo-user-therapist",
    role: "therapist",
    therapistId: "demo-therapist-korte",
  },
  {
    email: "reciptionist@gmail.com",
    fullName: "Reception Desk",
    id: "demo-user-receptionist",
    role: "receptionist",
    therapistId: null,
  },
];

export const DEMO_MEMBERSHIPS: ClinicMembershipRow[] = DEMO_ACCOUNTS.map((account) => ({
  clinic_id: DEMO_CLINIC_ID,
  created_at: "2026-04-01T09:00:00.000Z",
  id: `membership-${account.id}`,
  invited_by: DEMO_CLINIC.owner_user_id,
  role: account.role,
  status: "active",
  updated_at: "2026-04-01T09:00:00.000Z",
  user_id: account.id,
}));

export function roleLabel(role: ClinicStaffRole) {
  switch (role) {
    case "clinic_admin":
      return "Admin";
    case "therapist":
      return "Therapist";
    case "receptionist":
      return "Receptionist";
  }
}

export function createDemoProfile(account: DemoAccount): UserProfileRow {
  return {
    avatar_url: null,
    created_at: "2026-04-01T09:00:00.000Z",
    default_clinic_id: DEMO_CLINIC_ID,
    full_name: account.fullName,
    id: account.id,
    phone: null,
    updated_at: "2026-04-01T09:00:00.000Z",
  };
}

export function createDemoUser(account: DemoAccount): User {
  const timestamp = new Date().toISOString();

  return {
    app_metadata: {
      provider: "demo",
      providers: ["demo"],
    },
    aud: "authenticated",
    confirmed_at: timestamp,
    created_at: timestamp,
    email: account.email,
    email_confirmed_at: timestamp,
    factors: [],
    id: account.id,
    identities: [],
    is_anonymous: false,
    last_sign_in_at: timestamp,
    phone: "",
    role: "authenticated",
    updated_at: timestamp,
    user_metadata: {
      full_name: account.fullName,
      role: account.role,
    },
  } as User;
}

export function findDemoAccount(email: string, password: string) {
  return DEMO_ACCOUNTS.find(
    (account) =>
      account.email.toLowerCase() === email.trim().toLowerCase() &&
      password === DEMO_PASSWORD,
  );
}

export function getDemoAccountById(id: string | null | undefined) {
  if (!id) return null;
  return DEMO_ACCOUNTS.find((account) => account.id === id) ?? null;
}
