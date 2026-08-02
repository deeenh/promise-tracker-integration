import { createFileRoute } from "@tanstack/react-router";

import { MetricCard, PTPageHeader } from "@/components/promise-tracker/PTPrimitives";
import { PromiseTable } from "@/components/promise-tracker/PromiseTable";
import { usePromises } from "@/hooks/usePromiseTracker";
import { formatCurrency } from "@/lib/promise-tracker/constants";

export const Route = createFileRoute("/promise-tracker/fulfilled")({
  head: () => ({
    meta: [
      { title: "Fulfilled Promises — Promise Tracker" },
      {
        name: "description",
        content:
          "Completed and locked commitments in Software Vala, including on-time performance and tips released.",
      },
      { property: "og:title", content: "Fulfilled Promises — Promise Tracker" },
      {
        property: "og:description",
        content: "Completed commitments with on-time performance and released tips.",
      },
    ],
  }),
  component: PTFulfilled,
});

function PTFulfilled() {
  const { data = [], isLoading } = usePromises();
  const rows = data.filter((row) => row.status === "fulfilled");
  const onTime = rows.filter(
    (row) => row.fulfilled_at && new Date(row.fulfilled_at) <= new Date(row.deadline),
  );
  const tips = rows.reduce((sum, row) => sum + Number(row.tip_amount), 0);

  return (
    <div>
      <PTPageHeader
        title="Fulfilled Promises"
        description="Closed commitments. Fulfilled records are locked by default so the delivery history stays auditable."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MetricCard label="Fulfilled" value={rows.length} tone="success" />
        <MetricCard
          label="Delivered on time"
          value={`${rows.length ? Math.round((onTime.length / rows.length) * 100) : 0}%`}
          hint={`${onTime.length} of ${rows.length}`}
          tone="success"
        />
        <MetricCard label="Tips released" value={formatCurrency(tips)} tone="success" />
      </div>

      <PromiseTable
        promises={rows}
        isLoading={isLoading}
        exportName="fulfilled-promises"
        emptyTitle="Nothing fulfilled yet"
        emptyDescription="Fulfilled promises will be archived here."
      />
    </div>
  );
}
