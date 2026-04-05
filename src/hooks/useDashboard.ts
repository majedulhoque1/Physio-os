import { useEffect, useState } from "react";
import { supabase, supabaseConfigMessage } from "@/lib/supabase";
import {
  addDays,
  calculatePercentChange,
  formatPercentChange,
  formatRelativeTime,
  formatTime,
  startOfDay,
} from "@/lib/utils";
import type {
  AppointmentRow,
  AppointmentStatus,
  BillingRow,
  DashboardData,
  LeadRow,
  PatientRow,
  StatusTone,
  TherapistRow,
} from "@/types";

type DashboardSource = "fallback" | "live";

interface UseDashboardState {
  data: DashboardData;
  error: string | null;
  isLoading: boolean;
  source: DashboardSource;
}

type AppointmentWithRelations = AppointmentRow & {
  patient: Pick<PatientRow, "name"> | null;
  therapist: Pick<TherapistRow, "name"> | null;
};

const fallbackDashboardData: DashboardData = {
  kpis: {
    todayAppointments: 8,
    weekRevenue: 24500,
    activePatients: 34,
    missedSessions: 2,
  },
  trends: {
    todayAppointments: {
      value: "12%",
      direction: "up",
    },
    weekRevenue: {
      value: "8%",
      direction: "up",
    },
    activePatients: {
      value: "5%",
      direction: "up",
    },
    missedSessions: {
      value: "3%",
      direction: "down",
    },
  },
  appointments: [
    {
      patientId: "pat-farhana-rahman",
      patientName: "Farhana Rahman",
      therapist: "Dr. Tania Sultana",
      time: "09:00 AM",
      status: "completed",
    },
    {
      patientId: "pat-mehedi-hasan",
      patientName: "Mehedi Hasan",
      therapist: "Dr. Fahim Ahmed",
      time: "10:00 AM",
      status: "scheduled",
    },
    {
      patientId: "pat-nusrat-jahan",
      patientName: "Nusrat Jahan",
      therapist: "Dr. Tania Sultana",
      time: "11:30 AM",
      status: "missed",
    },
    {
      patientId: "pat-kamrul-islam",
      patientName: "Kamrul Islam",
      therapist: "Dr. Fahim Ahmed",
      time: "12:30 PM",
      status: "completed",
    },
    {
      patientId: "pat-sharmeen-akter",
      patientName: "Sharmeen Akter",
      therapist: "Dr. Nadia Karim",
      time: "02:00 PM",
      status: "scheduled",
    },
    {
      patientId: "pat-rashidul-hoque",
      patientName: "Rashidul Hoque",
      therapist: "Dr. Nadia Karim",
      time: "03:00 PM",
      status: "scheduled",
    },
    {
      patientId: "pat-sabina-yasmin",
      patientName: "Sabina Yasmin",
      therapist: "Dr. Tania Sultana",
      time: "04:00 PM",
      status: "scheduled",
    },
    {
      patientId: "pat-sajjad-hossain",
      patientName: "Sajjad Hossain",
      therapist: "Dr. Fahim Ahmed",
      time: "05:30 PM",
      status: "scheduled",
    },
  ],
  pipelineStages: [
    { label: "New Leads", count: 18, tone: "blue" },
    { label: "Booked", count: 9, tone: "indigo" },
    { label: "Active", count: 34, tone: "green" },
    { label: "Completed", count: 12, tone: "purple" },
  ],
  leadsNeedingFollowUp: [
    {
      id: "lead-1",
      name: "Tasnim Ara",
      createdLabel: "45 minutes ago",
    },
    {
      id: "lead-2",
      name: "Mahfuzur Rahman",
      createdLabel: "2 hours ago",
    },
    {
      id: "lead-3",
      name: "Rumana Ahmed",
      createdLabel: "yesterday",
    },
  ],
  attentionItems: [
    {
      badge: "Follow-up",
      title: "Leads waiting on a callback",
      detail: "3 fresh inquiries from WhatsApp and referral sources need follow-up today.",
      tone: "yellow",
    },
    {
      badge: "Schedule",
      title: "Sessions at risk of no-show",
      detail: "5 remaining visits are still marked scheduled and should be reconfirmed.",
      tone: "indigo",
    },
    {
      badge: "Recovery",
      title: "Missed-session recovery",
      detail: "Nusrat Jahan missed the 11:30 AM slot and should be rebooked this week.",
      tone: "red",
    },
  ],
};

function isSchemaMissingError(message: string) {
  return (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("Could not find the table")
  );
}

function toDashboardStatus(status: AppointmentStatus | null): AppointmentStatus {
  if (!status) {
    return "scheduled";
  }

  if (status === "confirmed") {
    return "scheduled";
  }

  return status;
}

function toTrend(current: number, previous: number, invert = false) {
  const delta = calculatePercentChange(current, previous);
  const isPositive = invert ? delta <= 0 : delta >= 0;

  return {
    direction: isPositive ? "up" : "down",
    value: formatPercentChange(delta),
  } as const;
}

function toAttentionItems(
  followUpLeadCount: number,
  remainingTodaySessions: number,
  missedSessions: number,
) {
  return [
    {
      badge: followUpLeadCount > 0 ? "Follow-up" : "Stable",
      title:
        followUpLeadCount > 0
          ? "Leads waiting on a callback"
          : "Follow-up queue is clear",
      detail:
        followUpLeadCount > 0
          ? `${followUpLeadCount} recent lead${followUpLeadCount > 1 ? "s need" : " needs"} follow-up today.`
          : "No fresh lead is waiting on an immediate callback.",
      tone: (followUpLeadCount > 0 ? "yellow" : "green") as StatusTone,
    },
    {
      badge: remainingTodaySessions > 0 ? "Schedule" : "On track",
      title:
        remainingTodaySessions > 0
          ? "Sessions still scheduled for today"
          : "Today's schedule is fully cleared",
      detail:
        remainingTodaySessions > 0
          ? `${remainingTodaySessions} appointment${remainingTodaySessions > 1 ? "s are" : " is"} still pending confirmation or completion today.`
          : "There are no unfinished sessions left on today's board.",
      tone: (remainingTodaySessions > 0 ? "indigo" : "green") as StatusTone,
    },
    {
      badge: missedSessions > 0 ? "Recovery" : "Clean week",
      title:
        missedSessions > 0
          ? "Missed sessions need recovery"
          : "No missed sessions in the last week",
      detail:
        missedSessions > 0
          ? `${missedSessions} missed session${missedSessions > 1 ? "s were" : " was"} logged in the last 7 days and should be rebooked.`
          : "The clinic has not logged a missed visit in the last 7 days.",
      tone: (missedSessions > 0 ? "red" : "green") as StatusTone,
    },
  ];
}

function buildLiveDashboardData(
  appointments: AppointmentWithRelations[],
  leads: LeadRow[],
  patients: PatientRow[],
  billing: BillingRow[],
): DashboardData {
  const todayStart = startOfDay();
  const tomorrowStart = addDays(todayStart, 1);
  const yesterdayStart = addDays(todayStart, -1);
  const weekStart = addDays(todayStart, -6);
  const previousWeekStart = addDays(weekStart, -7);

  const todaysAppointments = appointments.filter((appointment) => {
    const scheduledAt = new Date(appointment.scheduled_at);
    return scheduledAt >= todayStart && scheduledAt < tomorrowStart;
  });

  const yesterdayAppointmentsCount = appointments.filter((appointment) => {
    const scheduledAt = new Date(appointment.scheduled_at);
    return scheduledAt >= yesterdayStart && scheduledAt < todayStart;
  }).length;

  const missedSessions = appointments.filter((appointment) => {
    const scheduledAt = new Date(appointment.scheduled_at);
    return (
      scheduledAt >= weekStart &&
      scheduledAt < tomorrowStart &&
      appointment.status === "missed"
    );
  }).length;

  const previousMissedSessions = appointments.filter((appointment) => {
    const scheduledAt = new Date(appointment.scheduled_at);
    return (
      scheduledAt >= previousWeekStart &&
      scheduledAt < weekStart &&
      appointment.status === "missed"
    );
  }).length;

  const paidRecords = billing.filter((record) => record.status === "paid");

  const weekRevenue = paidRecords
    .filter((record) => {
      const paidAt = new Date(record.paid_at ?? record.created_at ?? 0);
      return paidAt >= weekStart && paidAt < tomorrowStart;
    })
    .reduce((total, record) => total + Number(record.amount), 0);

  const previousWeekRevenue = paidRecords
    .filter((record) => {
      const paidAt = new Date(record.paid_at ?? record.created_at ?? 0);
      return paidAt >= previousWeekStart && paidAt < weekStart;
    })
    .reduce((total, record) => total + Number(record.amount), 0);

  const activePatients = patients.filter((patient) => patient.status === "active").length;
  const previousActivePatients = patients.filter((patient) => {
    if (patient.status !== "active" || !patient.created_at) {
      return false;
    }

    return new Date(patient.created_at) < weekStart;
  }).length;

  const followUpLeads = leads.filter(
    (lead) => lead.status === "new" || lead.status === "contacted",
  );

  const remainingTodaySessions = todaysAppointments.filter(
    (appointment) =>
      appointment.status === "scheduled" || appointment.status === "confirmed",
  ).length;

  return {
    kpis: {
      todayAppointments: todaysAppointments.length,
      weekRevenue,
      activePatients,
      missedSessions,
    },
    trends: {
      todayAppointments: toTrend(todaysAppointments.length, yesterdayAppointmentsCount),
      weekRevenue: toTrend(weekRevenue, previousWeekRevenue),
      activePatients: toTrend(activePatients, previousActivePatients),
      missedSessions: toTrend(missedSessions, previousMissedSessions, true),
    },
    appointments: todaysAppointments.map((appointment) => ({
      patientId: appointment.patient_id,
      patientName: appointment.patient?.name ?? "Unknown patient",
      therapist: appointment.therapist?.name ?? "Unassigned therapist",
      time: formatTime(appointment.scheduled_at),
      status: toDashboardStatus(appointment.status),
    })),
    pipelineStages: [
      {
        label: "New Leads",
        count: leads.filter((lead) => lead.status === "new").length,
        tone: "blue",
      },
      {
        label: "Booked",
        count: leads.filter((lead) => lead.status === "booked").length,
        tone: "indigo",
      },
      {
        label: "Active",
        count: leads.filter((lead) => lead.status === "ongoing").length,
        tone: "green",
      },
      {
        label: "Completed",
        count: leads.filter((lead) => lead.status === "completed").length,
        tone: "purple",
      },
    ],
    leadsNeedingFollowUp: followUpLeads.slice(0, 3).map((lead) => ({
      id: lead.id,
      name: lead.name,
      createdLabel: lead.created_at ? formatRelativeTime(lead.created_at) : "recently",
    })),
    attentionItems: toAttentionItems(
      followUpLeads.length,
      remainingTodaySessions,
      missedSessions,
    ),
  };
}

export function useDashboard() {
  const [state, setState] = useState<UseDashboardState>({
    data: fallbackDashboardData,
    error: null,
    isLoading: true,
    source: "fallback",
  });

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      if (!supabase) {
        if (isActive) {
          setState({
            data: fallbackDashboardData,
            error: supabaseConfigMessage,
            isLoading: false,
            source: "fallback",
          });
        }

        return;
      }

      const [appointmentsResponse, leadsResponse, patientsResponse, billingResponse] =
        await Promise.all([
          supabase
            .from("appointments")
            .select(
              "id, patient_id, therapist_id, scheduled_at, duration_mins, status, session_number, notes, created_at, patient:patients(name), therapist:therapists(name)",
            )
            .order("scheduled_at", { ascending: true }),
          supabase
            .from("leads")
            .select("id, name, phone, source, condition, status, assigned_to, notes, created_at, updated_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("patients")
            .select("id, lead_id, name, phone, age, gender, diagnosis, assigned_therapist, total_sessions, completed_sessions, status, created_at")
            .order("created_at", { ascending: false }),
          supabase
            .from("billing")
            .select("id, patient_id, appointment_id, amount, payment_method, status, package_name, sessions_included, sessions_used, paid_at, created_at")
            .order("created_at", { ascending: false }),
        ]);

      if (!isActive) {
        return;
      }

      const responses = [
        appointmentsResponse,
        leadsResponse,
        patientsResponse,
        billingResponse,
      ];
      const failedResponse = responses.find((response) => response.error);

      if (failedResponse?.error) {
        const errorMessage = failedResponse.error.message;

        setState({
          data: fallbackDashboardData,
          error: isSchemaMissingError(errorMessage)
            ? "Supabase is connected, but the clinic tables are not created yet. Run supabase/schema.sql in the SQL editor."
            : errorMessage,
          isLoading: false,
          source: "fallback",
        });
        return;
      }

      const liveData = buildLiveDashboardData(
        (appointmentsResponse.data ?? []) as AppointmentWithRelations[],
        (leadsResponse.data ?? []) as LeadRow[],
        (patientsResponse.data ?? []) as PatientRow[],
        (billingResponse.data ?? []) as BillingRow[],
      );

      setState({
        data: liveData,
        error: null,
        isLoading: false,
        source: "live",
      });
    }

    loadDashboard();

    return () => {
      isActive = false;
    };
  }, []);

  return state;
}
