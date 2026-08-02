import { createFileRoute } from "@tanstack/react-router";

import { PTLayout } from "@/components/promise-tracker/PTLayout";

export const Route = createFileRoute("/promise-tracker")({
  component: PTLayout,
});
