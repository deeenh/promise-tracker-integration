import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Promise Tracker — Software Vala" },
      {
        name: "description",
        content: "Open the Software Vala Promise Tracker command center.",
      },
      { property: "og:title", content: "Promise Tracker — Software Vala" },
      {
        property: "og:description",
        content: "Open the Software Vala Promise Tracker command center.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ to: "/promise-tracker" });
  },
});
