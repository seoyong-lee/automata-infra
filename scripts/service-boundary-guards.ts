import { promises as fs } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(__dirname, "..");
const adminServicesRoot = path.join(repoRoot, "services", "admin");
const adminFieldIndexPattern = /^services\/admin\/[^/]+\/[^/]+\/index\.ts$/;
const ignoredAdminFieldIndexes = new Set([
  "services/admin/pipeline/pipeline-worker/index.ts",
]);

const forbiddenAdminFieldTokens = [
  "logResolverAudit(",
  "toGraphqlResolverError",
  "assertAdminGroup(",
  "getActor(",
] as const;

const walk = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = await Promise.all(
    entries.map(async (entry) => {
      const resolved = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walk(resolved);
      }
      return [resolved];
    }),
  );
  return results.flat();
};

const toRelativePath = (filePath: string): string => {
  return path.relative(repoRoot, filePath).replaceAll(path.sep, "/");
};

const run = async (): Promise<void> => {
  const files = await walk(adminServicesRoot);
  const violations: string[] = [];

  for (const filePath of files) {
    const relativePath = toRelativePath(filePath);
    if (!adminFieldIndexPattern.test(relativePath)) {
      continue;
    }
    if (ignoredAdminFieldIndexes.has(relativePath)) {
      continue;
    }

    const content = await fs.readFile(filePath, "utf8");
    if (!content.includes("runAuditedAdminResolver(")) {
      violations.push(
        `${relativePath}: expected field entry to use runAuditedAdminResolver(...)`,
      );
    }

    for (const token of forbiddenAdminFieldTokens) {
      if (content.includes(token)) {
        violations.push(
          `${relativePath}: forbidden direct field-entry token "${token}"`,
        );
      }
    }
  }

  if (violations.length > 0) {
    console.error("service boundary guards failed:");
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exitCode = 1;
    return;
  }

  console.info("service boundary guards passed");
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
