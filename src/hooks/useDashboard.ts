import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
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
  PatientRow,
  StatusTone,
  TherapistRow,
  TreatmentPlanRow,
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
      appointmentId: "demo-apt-1",
      patientId: "pat-farhana-rahman",
      patientName: "Farhana Rahman",
      therapist: "Dr. Tania Sultana",
      time: "09:00 AM",
      status: "completed",
    },
    {
      appointmentId: "demo-apt-2",
      patientId: "pat-mehedi-hasan",
      patientName: "Mehedi Hasan",
      therapist: "Dr. Fahim Ahmed",
      time: "10:00 AM",
      status: "scheduled",
    },
    {
      appointmentId: "demo-apt-3",
      patientId: "pat-nusrat-jahan",
      patientName: "Nusrat Jahan",
      therapist: "Dr. Tania Sultana",
      time: "11:30 AM",
      status: "missed",
    },
    {
      appointmentId: "demo-apt-4",
      patientId: "pat-kamrul-islam",
      patientName: "Kamrul Islam",
      therapist: "Dr. Fahim Ahmed",
      time: "12:30 PM",
      status: "completed",
    },
    {
      appointmentId: "demo-apt-5",
      patientId: "pat-sharmeen-akter",
      patientName: "Sharmeen Akter",
      therapist: "Dr. Nadia Karim",
      time: "02:00 PM",
      status: "scheduled",
    },
    {
      appointmentId: "demo-apt-6",
      patientId: "pat-rashidul-hoque",
      patientName: "Rashidul Hoque",
      therapist: "Dr. Nadia Karim",
      time: "03:00 PM",
      status: "scheduled",
    },
    {
      appointmentId: "demo-apt-7",
      patientId: "pat-sabina-yasmin",
      patientName: "Sabina Yasmin",
      therapist: "Dr. Tania Sultana",
      time: "04:00 PM",
      status: "scheduled",
    },
    {
      appointmentId: "demo-apt-8",
      patientId: "pat-sajjad-hossain",
      patientName: "Sajjad Hossain",
      therapist: "Dr. Fahim Ahmed",
      time: "05:30 PM",
      status: "scheduled",
    },
  ],
  patientStatuses: [
    { label: "Active", count: 34, tone: "green" },
    { label: "Completed", count: 12, tone: "blue" },
    { label: "Dropped", count: 4, tone: "red" },
  ],
  recentPatients: [
    {
      id: "pat-lamia-haque",
      name: "Lamia Haque",
      createdLabel: "45 minutes ago",
      status: "active",
    },
    {
      id: "pat-arman-khan",
      name: "Arman Khan",
      createdLabel: "2 hours ago",
      status: "completed",
    },
    {
      id: "pat-sadia-jahan",
      name: "Sadia Jahan",
      createdLabel: "yesterday",
      status: "active",
    },
  ],
  attentionItems: [
    {
      badge: "Plans",
      title: "Patients still need treatment plans",
      detail: "4 active patients were added without session plans and should be updated today.",
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
  planSetupCount: number,
  remainingTodaySessions: number,
  missedSessions: number,
) {
  return [
    {
      badge: planSetupCount > 0 ? "Plans" : "Ready",
      title:
        planSetupCount > 0
          ? "Patients still need treatment plans"
          : "All active patients have plans",
      detail:
        planSetupCount > 0
          ? `${planSetupCount} active patient${planSetupCount > 1 ? "s are" : " is"} missing a session plan right now.`
          : "Every active patient already has a plan attached.",
      tone: (planSetupCount > 0 ? "yellow" : "green") as StatusTone,
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
  patients: PatientRow[],
  billing: BillingRow[],
  treatmentPlans: TreatmentPlanRow[],
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
  const completedPatients = patients.filter((patient) => patient.status === "completed").length;
  const droppedPatients = patients.filter((patient) => patient.status === "dropped").length;
  const previousActivePatients = patients.filter((patient) => {
    if (patient.status !== "active" || !patient.created_at) {
      return false;
    }

    return new Date(patient.created_at) < weekStart;
  }).length;

  const patientIdsWithPlans = new Set(treatmentPlans.map((tp) => tp.patient_id));
  const patientsNeedingPlans = patients.filter(
    (patient) =>
      (patient.status ?? "active") === "active" && !patientIdsWithPlans.has(patient.id),
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
      appointmentId: appointment.id,
      patientId: appointment.patient_id,
      patientName: appointment.patient?.name ?? "Unknown patient",
      therapist: appointment.therapist?.name ?? "Unassigned therapist",
      time: formatTime(appointment.scheduled_at),
      status: toDashboardStatus(appointment.status),
    })),
    patientStatuses: [
      {
        label: "Active",
        count: activePatients,
        tone: "green",
      },
      {
        label: "Completed",
        count: completedPatients,
        tone: "blue",
      },
      {
        label: "Dropped",
        count: droppedPatients,
        tone: "red",
      },
    ],
    recentPatients: patients.slice(0, 3).map((patient) => ({
      id: patient.id,
      name: patient.name,
      createdLabel: patient.created_at ? formatRelativeTime(patient.created_at) : "recently",
      status: patient.status ?? "active",
    })),
    attentionItems: toAttentionItems(
      patientsNeedingPlans.length,
      remainingTodaySessions,
      missedSessions,
    ),
  };
}

export function useDashboard() {
  const { clinicId, linkedTherapistId, role } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [state, setState] = useState<UseDashboardState>({
    data: fallbackDashboardData,
    error: null,
    isLoading: true,
    source: "fallback",
  });

  const refreshDashboard = useCallback(() => setRefreshKey((k) => k + 1), []);

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

      if (!clinicId) {
        if (isActive) {
          setState({
            data: fallbackDashboardData,
            error: "No clinic context",
            isLoading: false,
            source: "fallback",
          });
        }

        return;
      }

      const [appointmentsResponse, patientsResponse, billingResponse, treatmentPlansResponse] =
        await Promise.all([
          supabase
            .from("appointments")
            .select(
              "id, patient_id, therapist_id, scheduled_at, duration_mins, status, session_number, notes, treatment_plan_id, created_at, patient:patients!appointments_patient_id_fkey(name), therapist:therapists!appointments_therapist_id_fkey(name)",
            )
            .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
            .order("scheduled_at", { ascending: true }),
          supabase
            .from("patients")
            .select("id, lead_id, name, phone, age, gender, diagnosis, assigned_therapist, status, created_at")
            .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
            .order("created_at", { ascending: false }),
          supabase
            .from("billing")
            .select("id, patient_id, appointment_id, amount, payment_method, status, package_name, sessions_included, sessions_used, treatment_plan_id, paid_at, created_at")
            .eq("clinic_id", clinicId) // SECURITY: Filter by current clinic
            .order("created_at", { ascending: false }),
          supabase
            .from("treatment_plans")
            .select("id, patient_id, therapist_id, total_sessions, completed_sessions, status, created_at")
            .eq("clinic_id", clinicId),
        ]);

      if (!isActive) {
        return;
      }

      const responses = [appointmentsResponse, patientsResponse, billingResponse, treatmentPlansResponse];
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

      // SECURITY: Filter by role on client (therapist sees only own data)
      let appointments = (appointmentsResponse.data ?? []) as AppointmentWithRelations[];
      let patients = (patientsResponse.data ?? []) as PatientRow[];

      if (role === "therapist" && linkedTherapistId) {
        appointments = appointments.filter(a => a.therapist_id === linkedTherapistId);
        patients = patients.filter(p => p.assigned_therapist === linkedTherapistId);
      }

      const liveData = buildLiveDashboardData(
        appointments,
        patients,
        (billingResponse.data ?? []) as BillingRow[],
        (treatmentPlansResponse.data ?? []) as TreatmentPlanRow[],
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
  }, [clinicId, linkedTherapistId, role, refreshKey]);

  return { ...state, refreshDashboard };
}
