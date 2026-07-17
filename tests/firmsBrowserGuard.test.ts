import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const rootDir = path.resolve(__dirname, "..");
const sourceRoots = ["src", "public"];
const entryFiles = ["index.html"];
const distRoots = ["dist", path.join("dist", "client")];
const scannedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".html", ".css"]);

type Finding = {
  file: string;
  reason: string;
  line: number;
  text: string;
};

const forbiddenPatterns: Array<{ reason: string; pattern: RegExp }> = [
  { reason: "VITE FIRMS browser env exposure", pattern: /\bVITE_FIRMS[A-Z0-9_]*\b/ },
  { reason: "direct NASA FIRMS browser URL", pattern: /firms\.modaps\.eosdis\.nasa\.gov/i },
  { reason: "direct FIRMS API path", pattern: /\/api\/(?:area|country|countries|data-availability|fire-map|archive|active_fire)\//i },
  { reason: "client-side FIRMS key access", pattern: /\b(?:FIRMS|NASA_FIRMS)[A-Z0-9_]*(?:API_)?KEY\b/ },
  { reason: "client-side FIRMS env access", pattern: /\b(?:import\.meta\.env|process\.env)\.[A-Z0-9_]*FIRMS[A-Z0-9_]*\b/ }
];

function collectFiles(relativePath: string): string[] {
  const absolutePath = path.join(rootDir, relativePath);
  if (!existsSync(absolutePath)) return [];

  const stats = statSync(absolutePath);
  if (stats.isFile()) {
    return scannedExtensions.has(path.extname(absolutePath)) ? [absolutePath] : [];
  }

  if (!stats.isDirectory()) return [];

  return readdirSync(absolutePath, { withFileTypes: true }).flatMap((entry) => {
    const childRelativePath = path.join(relativePath, entry.name);
    if (entry.isDirectory()) return collectFiles(childRelativePath);
    if (!entry.isFile() || !scannedExtensions.has(path.extname(entry.name))) return [];
    return [path.join(rootDir, childRelativePath)];
  });
}

function scanFile(file: string): Finding[] {
  const content = readFileSync(file, "utf8");
  return content.split(/\r?\n/).flatMap((lineText, index) =>
    forbiddenPatterns
      .filter(({ pattern }) => pattern.test(lineText))
      .map(({ reason }) => ({
        file: path.relative(rootDir, file),
        reason,
        line: index + 1,
        text: lineText.trim()
      }))
  );
}

describe("FIRMS browser integration guard", () => {
  test("keeps FIRMS server-proxy-only with no browser key, URL, or direct API path", () => {
    const files = [...sourceRoots, ...entryFiles, ...distRoots].flatMap(collectFiles);
    const findings = files.flatMap(scanFile);
    const messages = findings.map((finding) => `${finding.file}:${finding.line} ${finding.reason}: ${finding.text.slice(0, 160)}`);

    expect(messages).toEqual([]);
  });
});
