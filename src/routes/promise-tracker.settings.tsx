import { createFileRoute } from "@tanstack/react-router";

import { PTPageHeader } from "@/components/promise-tracker/PTPrimitives";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSaveSettings, useSettings } from "@/hooks/usePromiseTracker";

export const Route = createFileRoute("/promise-tracker/settings")({
  head: () => ({
    meta: [
      { title: "Promise Tracker Settings — Software Vala" },
      {
        name: "description",
        content:
          "Configure reminder windows, auto escalation, auto fines, tips and default deadlines for the Software Vala Promise Tracker.",
      },
      { property: "og:title", content: "Promise Tracker Settings — Software Vala" },
      {
        property: "og:description",
        content: "Configure reminders, escalation, fines and tips for the promise register.",
      },
    ],
  }),
  component: PTSettings,
});

function PTSettings() {
  const { data: settings } = useSettings();
  const saveSettings = useSaveSettings();

  if (!settings) {
    return (
      <div>
        <PTPageHeader title="Settings" />
        <p className="text-sm text-muted-foreground">Loading configuration…</p>
      </div>
    );
  }

  const toggles = [
    { key: "auto_escalation" as const, label: "Auto escalation", hint: "Raise the escalation level automatically when a deadline passes." },
    { key: "auto_fines" as const, label: "Auto fines", hint: "Apply active fine rules automatically on breach." },
    { key: "auto_tips" as const, label: "Auto tips", hint: "Release tip rules automatically on early delivery." },
    { key: "lock_on_fulfilment" as const, label: "Lock on fulfilment", hint: "Freeze records once a promise is fulfilled." },
    { key: "notify_owner" as const, label: "Notify owner", hint: "Send reminders to the accountable owner." },
    { key: "notify_receiver" as const, label: "Notify receiver", hint: "Keep the receiver informed of status changes." },
  ];

  const numbers = [
    { key: "reminder_hours" as const, label: "Reminder window (hours before deadline)" },
    { key: "escalation_after_hours" as const, label: "Escalate after (hours overdue)" },
    { key: "default_deadline_hours" as const, label: "Default deadline (hours)" },
    { key: "max_extensions" as const, label: "Maximum extensions per promise" },
  ];

  return (
    <div className="max-w-3xl">
      <PTPageHeader
        title="Settings"
        description="System behaviour for the Promise Tracker. Every change is written to the audit log."
      />

      <div className="glass-panel divide-y divide-border">
        {toggles.map((entry) => (
          <div key={entry.key} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium">{entry.label}</p>
              <p className="text-xs text-muted-foreground">{entry.hint}</p>
            </div>
            <Switch
              checked={Boolean(settings[entry.key])}
              onCheckedChange={(checked) =>
                saveSettings.mutate({
                  id: settings.id,
                  patch: { [entry.key]: checked },
                  label: `${entry.label} turned ${checked ? "on" : "off"}`,
                })
              }
            />
          </div>
        ))}
      </div>

      <div className="glass-panel mt-6 grid gap-5 p-5 sm:grid-cols-2">
        {numbers.map((entry) => (
          <div key={entry.key} className="space-y-2">
            <Label htmlFor={entry.key}>{entry.label}</Label>
            <Input
              id={entry.key}
              type="number"
              min={0}
              defaultValue={Number(settings[entry.key])}
              onBlur={(event) => {
                const value = Number(event.target.value);
                if (Number.isNaN(value) || value === Number(settings[entry.key])) return;
                saveSettings.mutate({
                  id: settings.id,
                  patch: { [entry.key]: value },
                  label: `${entry.label} set to ${value}`,
                });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
