import { redirect } from "next/navigation";
import { SoporteClient } from "@/components/soporte/SoporteClient";
import { getViewer } from "@/lib/auth";
import { getFeedbacks } from "@/lib/data";

export default async function SoportePage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/soporte");
  const feedbacks = await getFeedbacks();

  return <SoporteClient viewer={viewer} initialFeedbacks={feedbacks} />;
}
