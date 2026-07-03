import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getEnv(): Promise<CloudflareEnv> {
  const ctx = await getCloudflareContext({ async: true });
  return ctx.env as CloudflareEnv;
}
