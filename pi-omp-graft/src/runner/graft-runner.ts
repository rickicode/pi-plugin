import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export interface GraftExecOptions {
  cwd?: string;
  timeoutMs?: number;
  args: string[];
}

export interface GraftExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

const DEFAULT_TIMEOUT_MS = 12000;
const MAX_OUTPUT_BYTES = 16 * 1024; // Cap output at 16KB to prevent context bloat
const activeBuilds = new Map<string, boolean>();

export function isGraftInstalled(): boolean {
  return fs.existsSync("/usr/bin/graft") || fs.existsSync("/usr/local/bin/graft");
}

export function hasGraftDirectory(repoDir: string): boolean {
  try {
    const graftPath = path.join(repoDir, "graft");
    const wiringPath = path.join(graftPath, ".graph", "wiring.json");
    return fs.existsSync(graftPath) && fs.existsSync(wiringPath);
  } catch {
    return false;
  }
}

export function isBuildRunning(repoDir: string): boolean {
  return activeBuilds.get(repoDir) === true;
}

/**
 * Execute graft CLI with strict timeout, no-refresh, and output size clamping
 */
export async function execGraft(opts: GraftExecOptions): Promise<GraftExecResult> {
  const { cwd = process.cwd(), timeoutMs = DEFAULT_TIMEOUT_MS, args } = opts;
  const start = Date.now();

  const { promise, resolve, reject } = Promise.withResolvers<GraftExecResult>();

  // Use nice -n 10 for interactive queries to yield priority to main process
  const child = spawn("nice", ["-n", "10", "graft", ...args], {
    cwd,
    env: {
      ...process.env,
      GRAFT_NO_REFRESH: "1",
      DO_NOT_TRACK: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let killed = false;

  const timer = setTimeout(() => {
    killed = true;
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed) child.kill("SIGKILL");
    }, 1500);
    reject(new Error(`Graft command timed out after ${timeoutMs}ms (args: ${args.join(" ")})`));
  }, timeoutMs);

  child.stdout?.on("data", (chunk: Buffer) => {
    if (stdout.length < MAX_OUTPUT_BYTES) {
      stdout += chunk.toString("utf8");
    }
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    if (stderr.length < 4096) {
      stderr += chunk.toString("utf8");
    }
  });

  child.on("error", (err: Error) => {
    clearTimeout(timer);
    if (!killed) reject(err);
  });

  child.on("close", (code: number | null) => {
    clearTimeout(timer);
    if (!killed) {
      resolve({
        stdout: cleanAndClampOutput(stdout),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
        durationMs: Date.now() - start,
      });
    }
  });

  return promise;
}

/**
 * Trigger background build with lowest CPU priority (nice -n 19)
 */
export function triggerBackgroundBuild(repoDir: string, deep: boolean = false): boolean {
  if (activeBuilds.get(repoDir)) {
    return false;
  }

  activeBuilds.set(repoDir, true);

  const graftArgs = ["build"];
  if (deep) graftArgs.push("--deep");

  // nice -n 19 runs at lowest CPU priority so agent/system stays completely fluid
  const child = spawn("nice", ["-n", "19", "graft", ...graftArgs], {
    cwd: repoDir,
    env: {
      ...process.env,
      DO_NOT_TRACK: "1",
    },
    detached: true,
    stdio: "ignore",
  });

  child.on("close", () => {
    activeBuilds.delete(repoDir);
  });

  child.on("error", () => {
    activeBuilds.delete(repoDir);
  });

  child.unref();
  return true;
}

/**
 * Filter banners and truncate excessive lines
 */
function cleanAndClampOutput(text: string): string {
  const lines = text.split("\n");
  const filtered: string[] = [];
  let tokenSavingsNote = "";

  for (const l of lines) {
    if (l.startsWith("[graft] tokens saved")) {
      const match = l.match(/\[graft\] tokens saved ≈ ([\d,]+)(?:\s*\(([^)]+)\))?/);
      if (match) {
        const count = match[1];
        const pct = match[2] ? ` (${match[2]})` : "";
        tokenSavingsNote = `\n[Saved ~${count} tokens${pct} vs raw file read]`;
      }
      continue;
    }
    if (l.startsWith("[graft] refreshed the graph")) continue;
    filtered.push(l);
  }

  if (filtered.length > 100) {
    const trimmed = filtered.slice(0, 100);
    trimmed.push(`\n... (${filtered.length - 100} lines truncated for token efficiency. Refine search query or scope)`);
    if (tokenSavingsNote) trimmed.push(tokenSavingsNote);
    return trimmed.join("\n").trim();
  }

  if (tokenSavingsNote) {
    filtered.push(tokenSavingsNote);
  }

  return filtered.join("\n").trim();
}
