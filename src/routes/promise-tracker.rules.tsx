import { createFileRoute } from "@tanstack/react-router";

import { PTPageHeader } from "@/components/promise-tracker/PTPrimitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useDeleteRule, useRules, useSaveRule } from "@/hooks/usePromiseTracker";
import { formatRuleAmount } from "@/lib/promise-tracker/constants";

export const Route = createFileRoute("/promise-tracker/rules")({
  head: () => ({
    meta: [
      { title: "Fine & Tip Rules — Promise Tracker" },
      {
        name: "description",
        content:
          "Automated fine and tip rules that reward early delivery and penalise breached commitments in Software Vala.",
      },
      { property: "og:title", content: "Fine & Tip Rules — Promise Tracker" },
      {
        property: "og:description",
        content: "Configure automated penalties and rewards for tracked commitments.",
      },
    ],
  }),
  component: PTRules,
});

function PTRules() {
  const { data: rules = [] } = useRules();
  const saveRule = useSaveRule();
  const deleteRule = useDeleteRule();

  const groups = [
    { kind: "fine" as const, title: "Fine rules", hint: "Applied when a promise is breached." },
    { kind: "tip" as const, title: "Tip rules", hint: "Released when a promise beats its deadline." },
  ];

  return (
    <div>
      <PTPageHeader
        title="Fine & Tip Rules"
        description="Accountability economics. Fines are charged on breach, tips are released on early delivery — both can run automatically."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map((group) => (
          <section key={group.kind}>
            <h2 className="mb-1 font-display text-lg font-semibold">{group.title}</h2>
            <p className="mb-3 text-sm text-muted-foreground">{group.hint}</p>
            <div className="glass-panel divide-y divide-border">
              {rules
                .filter((rule) => rule.kind === group.kind)
                .map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{rule.name}</p>
                        <span className="mono text-xs text-muted-foreground">{rule.code}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRuleAmount(rule)} · {rule.rule_type} ·{" "}
                        {rule.auto_apply ? "auto applied" : "manual"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={rule.is_active}
                        onCheckedChange={(checked) =>
                          saveRule.mutate({
                            id: rule.id,
                            kind: group.kind,
                            name: rule.name,
                            rule_type: rule.rule_type,
                            amount: Number(rule.amount),
                            auto_apply: rule.auto_apply,
                            is_active: checked,
                          })
                        }
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => deleteRule.mutate(rule)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              {rules.filter((rule) => rule.kind === group.kind).length === 0 ? (
                <p className="p-6 text-sm text-muted-foreground">No rules configured.</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
