import { createFileRoute } from "@tanstack/react-router";

import { PTLayout } from "@/components/promise-tracker/PTLayout";

export const Route = createFileRoute("/promise-tracker")({
  head: () => ({
    meta: [
      { title: "Promise Tracker — Software Vala" },
      {
        name: "description",
        content: "Track Software Vala commitments with live deadlines, escalations, fines and tips.",
      },
      { property: "og:title", content: "Promise Tracker — Software Vala" },
      {
        property: "og:description",
        content: "Live commitment tracking and accountability for Software Vala.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PTLayout,
});
