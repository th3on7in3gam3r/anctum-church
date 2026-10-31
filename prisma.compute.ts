import { defineComputeConfig } from "@prisma/compute-sdk/config";

/** Production deploys from GitHub `main` via Prisma Compute after migrate lock release. */
export default defineComputeConfig({
  app: {
    name: "Sanctum Live",
    region: "us-east-1",
    framework: "custom",
    httpPort: 3000,
    build: {
      command: "bun run build",
      outputDirectory: "dist",
      entrypoint: "server.mjs",
    },
  },
});
