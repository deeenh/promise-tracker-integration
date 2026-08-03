import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { errorMessage, reportHealth } from "@/lib/promise-tracker/monitoring";
import type { Tables } from "@/integrations/supabase/types";
import type {
  PromiseAuditLogRow,
  PromiseCategoryRow,
  PromiseInsightRow,
  PromiseRow,
  PromiseRuleRow,
  PromiseSettingsRow,
  PromiseSubcategoryRow,
  PromiseWithCategory,
} from "@/lib/promise-tracker/constants";

export type PromiseHealthEventRow = Tables<"promise_health_events">;


/** The Promise Tracker console runs inside Software Vala's operator shell. */
export const TRACKER_ACTOR = "console@softwarevala.com";
export const TRACKER_ACTOR_ROLE = "Console Operator";

const PROMISE_SELECT = "*, promise_categories(id, slug, label, accent)";

export const trackerKeys = {
  promises: ["promise-tracker", "promises"] as const,
  categories: ["promise-tracker", "categories"] as const,
  subcategories: ["promise-tracker", "subcategories"] as const,
  rules: ["promise-tracker", "rules"] as const,
  insights: ["promise-tracker", "insights"] as const,
  logs: ["promise-tracker", "logs"] as const,
  settings: ["promise-tracker", "settings"] as const,
};

export function usePromises() {
  return useQuery({
    queryKey: trackerKeys.promises,
    queryFn: async (): Promise<PromiseWithCategory[]> => {
      const { data, error } = await supabase
        .from("promises")
        .select(PROMISE_SELECT)
        .order("deadline", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PromiseWithCategory[];
    },
    refetchInterval: 30000,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: trackerKeys.categories,
    queryFn: async (): Promise<PromiseCategoryRow[]> => {
      const { data, error } = await supabase
        .from("promise_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSubcategories() {
  return useQuery({
    queryKey: trackerKeys.subcategories,
    queryFn: async (): Promise<PromiseSubcategoryRow[]> => {
      const { data, error } = await supabase
        .from("promise_subcategories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useRules() {
  return useQuery({
    queryKey: trackerKeys.rules,
    queryFn: async (): Promise<PromiseRuleRow[]> => {
      const { data, error } = await supabase.from("promise_rules").select("*").order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInsights() {
  return useQuery({
    queryKey: trackerKeys.insights,
    queryFn: async (): Promise<(PromiseInsightRow & { promises: PromiseRow | null })[]> => {
      const { data, error } = await supabase
        .from("promise_ai_insights")
        .select("*, promises(*)")
        .order("delay_risk", { ascending: false });
      if (error) throw error;
      return (data ?? []) as (PromiseInsightRow & { promises: PromiseRow | null })[];
    },
  });
}

export function useAuditLogs() {
  return useQuery({
    queryKey: trackerKeys.logs,
    queryFn: async (): Promise<PromiseAuditLogRow[]> => {
      const { data, error } = await supabase
        .from("promise_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useSettings() {
  return useQuery({
    queryKey: trackerKeys.settings,
    queryFn: async (): Promise<PromiseSettingsRow | null> => {
      const { data, error } = await supabase.from("promise_settings").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export async function writeAuditLog(entry: {
  action: string;
  promiseCode?: string | null;
  details: string;
}) {
  const { error } = await supabase.from("promise_audit_logs").insert({
    action: entry.action,
    promise_code: entry.promiseCode ?? null,
    actor: TRACKER_ACTOR,
    actor_role: TRACKER_ACTOR_ROLE,
    details: entry.details,
  });
  if (error) throw error;
}

export function useLogAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: writeAuditLog,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: trackerKeys.logs }),
  });
}

/** Live updates on promises and audit logs. */
export function useTrackerRealtime() {
  const queryClient = useQueryClient();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    const channel = supabase
      .channel("promise-tracker-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "promises" }, () => {
        queryClient.invalidateQueries({ queryKey: trackerKeys.promises });
        queryClient.invalidateQueries({ queryKey: trackerKeys.insights });
        setLastUpdate(new Date());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "promise_audit_logs" }, () => {
        queryClient.invalidateQueries({ queryKey: trackerKeys.logs });
        setLastUpdate(new Date());
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { lastUpdate };
}

/** Ticking clock used for live countdowns. */
export function useTicker(intervalMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function useTrackerMutation<TVariables>(
  handler: (variables: TVariables) => Promise<{ message: string; description?: string }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: handler,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["promise-tracker"] });
      toast.success(result.message, { description: result.description });
    },
    onError: (error: Error) => toast.error("Action failed", { description: error.message }),
  });
}

async function nextPromiseCode() {
  const { data, error } = await supabase
    .from("promises")
    .select("code")
    .order("code", { ascending: false })
    .limit(1);
  if (error) throw error;
  const last = data?.[0]?.code ?? "PRM-000";
  const next = Number(last.split("-")[1] ?? 0) + 1;
  return `PRM-${String(next).padStart(3, "0")}`;
}

export type CreatePromiseInput = {
  title: string;
  description: string;
  categoryId: string;
  subCategory: string;
  nanoCategory: string;
  owner: string;
  receiver: string;
  deadline: string;
  priority: string;
  linkedModule: string;
  status: "pending" | "active";
};

export function useCreatePromise() {
  return useTrackerMutation(async (input: CreatePromiseInput) => {
    const code = await nextPromiseCode();
    const { error } = await supabase.from("promises").insert({
      code,
      title: input.title,
      description: input.description || null,
      category_id: input.categoryId,
      sub_category: input.subCategory || null,
      nano_category: input.nanoCategory || null,
      owner: input.owner,
      receiver: input.receiver,
      deadline: input.deadline,
      priority: input.priority,
      status: input.status,
      linked_module: input.linkedModule || null,
    });
    if (error) throw error;
    await writeAuditLog({
      action: input.status === "active" ? "Promise Activated" : "Promise Created",
      promiseCode: code,
      details: `${input.title} — owner ${input.owner}, receiver ${input.receiver}`,
    });
    return {
      message: input.status === "active" ? "Promise activated" : "Promise saved as draft",
      description: `${code} · ${input.title}`,
    };
  });
}

export function useUpdatePromiseStatus() {
  return useTrackerMutation(
    async (input: { promise: PromiseRow; status: string; lock?: boolean }) => {
      const patch: Partial<PromiseRow> = { status: input.status };
      if (input.status === "fulfilled") {
        patch.fulfilled_at = new Date().toISOString();
        patch.is_locked = input.lock ?? true;
      }
      if (input.status === "broken") patch.breach_reason = "Deadline missed";
      const { error } = await supabase.from("promises").update(patch).eq("id", input.promise.id);
      if (error) throw error;
      await writeAuditLog({
        action: "Status Changed",
        promiseCode: input.promise.code,
        details: `Status changed from ${input.promise.status} to ${input.status}`,
      });
      return { message: "Status updated", description: `${input.promise.code} → ${input.status}` };
    },
  );
}

export function useExtendDeadline() {
  return useTrackerMutation(async (input: { promise: PromiseRow; hours: number }) => {
    const newDeadline = new Date(
      new Date(input.promise.deadline).getTime() + input.hours * 3600000,
    ).toISOString();
    const { error } = await supabase
      .from("promises")
      .update({
        deadline: newDeadline,
        extended_count: input.promise.extended_count + 1,
        status: input.promise.status === "broken" ? "delayed" : input.promise.status,
      })
      .eq("id", input.promise.id);
    if (error) throw error;
    await writeAuditLog({
      action: "Deadline Extended",
      promiseCode: input.promise.code,
      details: `Deadline extended by ${input.hours} hours`,
    });
    return { message: "Deadline extended", description: `${input.promise.code} +${input.hours}h` };
  });
}

export function useEscalatePromise() {
  return useTrackerMutation(async (input: { promise: PromiseRow; reason: string }) => {
    const level = Math.min(4, input.promise.escalation_level + 1);
    const { error } = await supabase
      .from("promises")
      .update({
        escalation_level: level,
        escalated_at: new Date().toISOString(),
        escalation_reason: input.reason,
        escalation_status: "pending",
      })
      .eq("id", input.promise.id);
    if (error) throw error;
    await writeAuditLog({
      action: "Escalated",
      promiseCode: input.promise.code,
      details: `Escalated to Level ${level} — ${input.reason}`,
    });
    return { message: `Escalated to Level ${level}`, description: input.promise.code };
  });
}

export function useResolveEscalation() {
  return useTrackerMutation(async (input: { promise: PromiseRow; status: string }) => {
    const { error } = await supabase
      .from("promises")
      .update({ escalation_status: input.status })
      .eq("id", input.promise.id);
    if (error) throw error;
    await writeAuditLog({
      action: "Escalation Updated",
      promiseCode: input.promise.code,
      details: `Escalation marked ${input.status}`,
    });
    return { message: "Escalation updated", description: `${input.promise.code} → ${input.status}` };
  });
}

export function useApplyFine() {
  return useTrackerMutation(async (input: { promise: PromiseRow; amount: number; rule: string }) => {
    const { error } = await supabase
      .from("promises")
      .update({ fine_amount: Number(input.promise.fine_amount) + input.amount })
      .eq("id", input.promise.id);
    if (error) throw error;
    await writeAuditLog({
      action: "Fine Applied",
      promiseCode: input.promise.code,
      details: `Fine of ${input.amount} applied via ${input.rule}`,
    });
    return { message: "Fine applied", description: `${input.promise.code} · ${input.rule}` };
  });
}

export function useReleaseTip() {
  return useTrackerMutation(async (input: { promise: PromiseRow; amount: number; rule: string }) => {
    const { error } = await supabase
      .from("promises")
      .update({ tip_amount: Number(input.promise.tip_amount) + input.amount })
      .eq("id", input.promise.id);
    if (error) throw error;
    await writeAuditLog({
      action: "Tip Released",
      promiseCode: input.promise.code,
      details: `Tip of ${input.amount} released via ${input.rule}`,
    });
    return { message: "Tip released", description: `${input.promise.code} · ${input.rule}` };
  });
}

export function useToggleLock() {
  return useTrackerMutation(async (promiseRow: PromiseRow) => {
    const locked = !promiseRow.is_locked;
    const { error } = await supabase
      .from("promises")
      .update({ is_locked: locked })
      .eq("id", promiseRow.id);
    if (error) throw error;
    await writeAuditLog({
      action: locked ? "Promise Locked" : "Promise Unlocked",
      promiseCode: promiseRow.code,
      details: locked ? "Record locked from further edits" : "Record unlocked for edits",
    });
    return { message: locked ? "Promise locked" : "Promise unlocked", description: promiseRow.code };
  });
}

export function useDeletePromise() {
  return useTrackerMutation(async (promiseRow: PromiseRow) => {
    const { error } = await supabase.from("promises").delete().eq("id", promiseRow.id);
    if (error) throw error;
    await writeAuditLog({
      action: "Promise Deleted",
      promiseCode: promiseRow.code,
      details: `${promiseRow.title} removed from the registry`,
    });
    return { message: "Promise deleted", description: promiseRow.code };
  });
}

export function useSaveRule() {
  return useTrackerMutation(
    async (input: {
      id?: string;
      code?: string;
      kind: "fine" | "tip";
      name: string;
      rule_type: string;
      amount: number;
      auto_apply: boolean;
      is_active: boolean;
    }) => {
      if (input.id) {
        const { error } = await supabase
          .from("promise_rules")
          .update({
            name: input.name,
            rule_type: input.rule_type,
            amount: input.amount,
            auto_apply: input.auto_apply,
            is_active: input.is_active,
          })
          .eq("id", input.id);
        if (error) throw error;
        await writeAuditLog({
          action: "Rule Updated",
          details: `${input.name} updated (${input.kind})`,
        });
        return { message: "Rule updated", description: input.name };
      }

      const prefix = input.kind === "fine" ? "FR" : "TR";
      const { data: existing, error: listError } = await supabase
        .from("promise_rules")
        .select("code")
        .eq("kind", input.kind)
        .order("code", { ascending: false })
        .limit(1);
      if (listError) throw listError;
      const next = Number(existing?.[0]?.code?.split("-")[1] ?? 0) + 1;
      const { error } = await supabase.from("promise_rules").insert({
        code: `${prefix}-${String(next).padStart(3, "0")}`,
        kind: input.kind,
        name: input.name,
        rule_type: input.rule_type,
        amount: input.amount,
        auto_apply: input.auto_apply,
        is_active: input.is_active,
      });
      if (error) throw error;
      await writeAuditLog({ action: "Rule Created", details: `${input.name} created (${input.kind})` });
      return { message: "Rule created", description: input.name };
    },
  );
}

export function useDeleteRule() {
  return useTrackerMutation(async (rule: PromiseRuleRow) => {
    const { error } = await supabase.from("promise_rules").delete().eq("id", rule.id);
    if (error) throw error;
    await writeAuditLog({ action: "Rule Deleted", details: `${rule.name} removed` });
    return { message: "Rule deleted", description: rule.name };
  });
}

export function useSaveSettings() {
  return useTrackerMutation(
    async (input: { id: string; patch: Partial<PromiseSettingsRow>; label?: string }) => {
      const { error } = await supabase
        .from("promise_settings")
        .update(input.patch)
        .eq("id", input.id);
      if (error) throw error;
      await writeAuditLog({
        action: "Settings Updated",
        details: input.label ?? "Promise tracker settings updated",
      });
      return { message: "Settings saved", description: "Promise tracker settings updated" };
    },
  );
}

export function useSaveCategory() {
  return useTrackerMutation(
    async (input: { id?: string; slug: string; label: string; accent: string }) => {
      if (input.id) {
        const { error } = await supabase
          .from("promise_categories")
          .update({ label: input.label, accent: input.accent })
          .eq("id", input.id);
        if (error) throw error;
        await writeAuditLog({ action: "Category Updated", details: `${input.label} updated` });
        return { message: "Category updated", description: input.label };
      }
      const { error } = await supabase
        .from("promise_categories")
        .insert({ slug: input.slug, label: input.label, accent: input.accent });
      if (error) throw error;
      await writeAuditLog({ action: "Category Created", details: `${input.label} created` });
      return { message: "Category created", description: input.label };
    },
  );
}

export function useSaveSubcategory() {
  return useTrackerMutation(
    async (input: { categoryId: string; slug: string; label: string }) => {
      const { error } = await supabase
        .from("promise_subcategories")
        .insert({ category_id: input.categoryId, slug: input.slug, label: input.label });
      if (error) throw error;
      await writeAuditLog({ action: "Sub Category Created", details: `${input.label} created` });
      return { message: "Sub category created", description: input.label };
    },
  );
}

/** Aggregated live metrics used across the tracker screens. */
export function useTrackerMetrics() {
  const { data: promises = [], isLoading } = usePromises();

  const metrics = useMemo(() => {
    const now = Date.now();
    const byStatus = (status: string) => promises.filter((p) => p.status === status);
    const overdue = promises.filter(
      (p) =>
        !["fulfilled"].includes(p.status) && new Date(p.deadline).getTime() < now,
    );
    const fulfilled = byStatus("fulfilled");
    const onTime = fulfilled.filter(
      (p) => p.fulfilled_at && new Date(p.fulfilled_at) <= new Date(p.deadline),
    );
    return {
      total: promises.length,
      active: byStatus("active").length,
      pending: byStatus("pending").length,
      delayed: byStatus("delayed").length,
      broken: byStatus("broken").length,
      fulfilled: fulfilled.length,
      escalated: promises.filter((p) => p.escalation_level > 0 && p.status !== "fulfilled").length,
      overdue: overdue.length,
      totalFines: promises.reduce((sum, p) => sum + Number(p.fine_amount), 0),
      totalTips: promises.reduce((sum, p) => sum + Number(p.tip_amount), 0),
      onTimeRate: fulfilled.length ? Math.round((onTime.length / fulfilled.length) * 100) : 0,
    };
  }, [promises]);

  return { metrics, promises, isLoading };
}
