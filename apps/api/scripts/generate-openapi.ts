import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Generate OpenAPI JSON from the Elysia OpenAPI plugin.
 *
 * We avoid binding a port by using `app.handle(Request)` and probing the
 * plugin's JSON endpoints, since the path can differ by configuration.
 */
async function main() {
  // Avoid side-effects (redis, queues, etc.) during generation.
  process.env.GENERATE_OPENAPI = "1";
  const { app } = await import("../src/app");

  const candidates = [
    "/openapi/json",
    "/openapi.json",
    "/docs/json",
    "/docs/openapi.json",
  ];

  let spec: unknown | null = null;
  let hit: string | null = null;

  for (const path of candidates) {
    const res = await app.handle(new Request(`http://localhost${path}`));
    if (!res.ok) continue;
    const text = await res.text();
    try {
      spec = JSON.parse(text);
      hit = path;
      break;
    } catch {
      // not JSON
    }
  }

  if (!spec) {
    throw new Error(
      `Unable to retrieve OpenAPI JSON from any endpoint: ${candidates.join(", ")}`,
    );
  }

  const outFile = resolve(
    process.cwd(),
    "..",
    "..",
    "packages",
    "api-types",
    "openapi.json",
  );

  await writeFile(outFile, JSON.stringify(spec, null, 2) + "\n", "utf8");
  console.log(`✓ OpenAPI spec written to ${outFile} (from ${hit})`);
}

await main();
