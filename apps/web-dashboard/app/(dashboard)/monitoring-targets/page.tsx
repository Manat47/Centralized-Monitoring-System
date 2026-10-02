import { redirect } from "next/navigation";

export default function MonitoringTargetsPage() {
  redirect("/infrastructure?view=metrics");
}
