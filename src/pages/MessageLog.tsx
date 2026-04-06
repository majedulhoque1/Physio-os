import { Mail } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useMessageLog } from "@/hooks/useMessageLog";
import { usePatients } from "@/hooks/usePatients";
import type { MessageStatus, MessageType, StatusTone } from "@/types";

function messageStatusTone(status: MessageStatus): StatusTone {
  switch (status) {
    case "sent":
      return "blue";
    case "delivered":
      return "green";
    case "read":
      return "indigo";
    case "failed":
      return "red";
    case "pending":
      return "yellow";
    default:
      return "gray";
  }
}

function messageTypeLabel(type: MessageType): string {
  switch (type) {
    case "thank_you":
      return "Thank You";
    case "session_reminder":
      return "Reminder";
    case "missed_session":
      return "Missed";
    case "followup":
      return "Follow-up";
    case "custom":
      return "Custom";
    default:
      return type;
  }
}

function messageTypeTone(type: MessageType): StatusTone {
  switch (type) {
    case "thank_you":
      return "green";
    case "session_reminder":
      return "blue";
    case "missed_session":
      return "orange";
    case "followup":
      return "purple";
    case "custom":
      return "gray";
    default:
      return "gray";
  }
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-BD", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_FILTERS: { label: string; value: MessageType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Thank You", value: "thank_you" },
  { label: "Reminder", value: "session_reminder" },
  { label: "Missed", value: "missed_session" },
  { label: "Follow-up", value: "followup" },
];

export function MessageLog() {
  const [typeFilter, setTypeFilter] = useState<MessageType | "all">("all");
  const { messages, isLoading, error } = useMessageLog(
    typeFilter === "all" ? {} : { messageType: typeFilter },
  );
  const { patients } = usePatients();

  const patientMap = new Map(patients.map((p) => [p.id, p.name]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Message Log"
        description="View all automated messages sent to patients."
      />

      <div className="flex gap-2 overflow-x-auto">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              typeFilter === f.value
                ? "bg-primary text-white"
                : "border border-border bg-surface text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </div>
      ) : isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No messages"
          description={
            typeFilter === "all"
              ? "No automated messages have been sent yet."
              : `No ${messageTypeLabel(typeFilter).toLowerCase()} messages found.`
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-slate-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Patient
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Channel
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Sent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {messages.map((msg) => (
                <tr key={msg.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {patientMap.get(msg.patient_id) ?? "Unknown"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={messageTypeLabel(msg.message_type)}
                      tone={messageTypeTone(msg.message_type)}
                    />
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">
                    {msg.channel}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      label={msg.status}
                      tone={messageStatusTone(msg.status)}
                    />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(msg.sent_at ?? msg.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
