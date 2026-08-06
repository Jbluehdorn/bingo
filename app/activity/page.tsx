export const dynamic = "force-dynamic";

import ActivityLog from "@/components/ActivityLog";
import { getEnv } from "@/lib/cloudflare";
import { getDropSubmissionsWithDetails } from "@/lib/db";

export default async function ActivityPage() {
  const env = await getEnv();
  const submissions = await getDropSubmissionsWithDetails(env.DB);

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h1 className="text-4xl">Activity Log</h1>
        <p className="text-osrs-text-muted">
          Every submitted drop, newest first.
        </p>
      </div>
      <ActivityLog submissions={submissions} />
    </div>
  );
}
