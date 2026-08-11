import { rmSync } from "node:fs";

rmSync(new URL("../.open-next", import.meta.url), {
  recursive: true,
  force: true,
  maxRetries: 20,
  retryDelay: 250,
});
