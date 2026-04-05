import type { LucideIcon } from "lucide-react";

export interface NavItem {
  badge?: number;
  breadcrumbs: string[];
  end?: boolean;
  href: string;
  icon: LucideIcon;
  label: string;
  mobileLabel?: string;
  title: string;
}

export interface RouteMeta {
  breadcrumbs: string[];
  title: string;
}

export type StatusTone =
  | "blue"
  | "green"
  | "red"
  | "yellow"
  | "indigo"
  | "purple"
  | "orange"
  | "gray";

export type LeadSource = "manual" | "facebook" | "whatsapp" | "referral";
export type LeadStatus =
  | "new"
  | "contacted"
  | "booked"
  | "visited"
  | "ongoing"
  | "completed"
  | "lost";
export type TherapistStatus = "active" | "inactive";
export type PatientStatus = "active" | "completed" | "dropped";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "missed"
  | "cancelled";
export type PaymentMethod = "cash" | "bkash" | "nagad" | "card";
export type BillingStatus = "due" | "paid" | "partial";

export interface TherapistRow {
  created_at: string | null;
  id: string;
  name: string;
  phone: string | null;
  specialization: string | null;
  status: TherapistStatus | null;
}

export interface LeadRow {
  assigned_to: string | null;
  condition: string | null;
  created_at: string | null;
  id: string;
  name: string;
  notes: string | null;
  phone: string;
  source: LeadSource | null;
  status: LeadStatus | null;
  updated_at: string | null;
}

export interface PatientRow {
  age: number | null;
  assigned_therapist: string | null;
  completed_sessions: number | null;
  created_at: string | null;
  diagnosis: string | null;
  gender: string | null;
  id: string;
  lead_id: string | null;
  name: string;
  phone: string;
  status: PatientStatus | null;
  total_sessions: number | null;
}

export interface AppointmentRow {
  created_at: string | null;
  duration_mins: number | null;
  id: string;
  notes: string | null;
  patient_id: string;
  scheduled_at: string;
  session_number: number | null;
  status: AppointmentStatus | null;
  therapist_id: string;
}

export interface SessionNoteRow {
  appointment_id: string;
  created_at: string | null;
  exercises_done: string[] | null;
  id: string;
  mobility_score: number | null;
  next_plan: string | null;
  pain_scale: number | null;
  patient_id: string;
  progress_notes: string | null;
  therapist_id: string;
}

export interface BillingRow {
  amount: number;
  appointment_id: string | null;
  created_at: string | null;
  id: string;
  package_name: string | null;
  paid_at: string | null;
  patient_id: string;
  payment_method: PaymentMethod | null;
  sessions_included: number | null;
  sessions_used: number | null;
  status: BillingStatus | null;
}

export interface Database {
  public: {
    CompositeTypes: Record<string, never>;
    Enums: Record<string, never>;
    Functions: Record<string, never>;
    Tables: {
      appointments: {
        Insert: Omit<AppointmentRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: AppointmentRow;
        Update: Partial<AppointmentRow>;
      };
      billing: {
        Insert: Omit<BillingRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: BillingRow;
        Update: Partial<BillingRow>;
      };
      leads: {
        Insert: Omit<LeadRow, "created_at" | "id" | "updated_at"> & {
          created_at?: string | null;
          id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
        Row: LeadRow;
        Update: Partial<LeadRow>;
      };
      patients: {
        Insert: Omit<PatientRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: PatientRow;
        Update: Partial<PatientRow>;
      };
      session_notes: {
        Insert: Omit<SessionNoteRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: SessionNoteRow;
        Update: Partial<SessionNoteRow>;
      };
      therapists: {
        Insert: Omit<TherapistRow, "created_at" | "id"> & {
          created_at?: string | null;
          id?: string;
        };
        Relationships: [];
        Row: TherapistRow;
        Update: Partial<TherapistRow>;
      };
    };
    Views: Record<string, never>;
  };
}

export interface DashboardKpis {
  activePatients: number;
  missedSessions: number;
  todayAppointments: number;
  weekRevenue: number;
}

export interface DashboardTrend {
  direction: "down" | "up";
  value: string;
}

export interface DashboardAppointmentItem {
  patientId: string;
  patientName: string;
  status: AppointmentStatus;
  therapist: string;
  time: string;
}

export interface DashboardPipelineStage {
  count: number;
  label: string;
  tone: StatusTone;
}

export interface DashboardLeadFollowUpItem {
  createdLabel: string;
  id: string;
  name: string;
}

export interface DashboardAttentionItem {
  badge: string;
  detail: string;
  title: string;
  tone: StatusTone;
}

export interface DashboardData {
  appointments: DashboardAppointmentItem[];
  attentionItems: DashboardAttentionItem[];
  kpis: DashboardKpis;
  leadsNeedingFollowUp: DashboardLeadFollowUpItem[];
  pipelineStages: DashboardPipelineStage[];
  trends: {
    activePatients: DashboardTrend;
    missedSessions: DashboardTrend;
    todayAppointments: DashboardTrend;
    weekRevenue: DashboardTrend;
  };
}
