import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface HonchoEnvConfig {
  baseUrl: string;
  apiKey: string;
  workspaceId: string;
  userPeer: string;
  aiPeer: string;
  /** Sibling AI peers sharing the same workspace (e.g. "hermes,coding").
   * Read fan-out includes their conclusions; empty means no fan-out. */
  sharedPeers: string[];
}

/** Files loaded by loadHonchoEnv, per agent. The resolution step below already
 * prefers HONCHO_* from process.env, so only the file order needs fixing. */

async function parseEnvFile(path: string): Promise<Record<string, string>> {  try {
    const raw = await readFile(path, "utf8");
    const parsed: Record<string, string> = {};
    for (const rawLine of raw.split("\n")) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1) continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      parsed[key] = val;
    }
    return parsed;
  } catch {
    return {};
  }
}

export async function loadHonchoEnv(cwd?: string): Promise<HonchoEnvConfig | null> {
  const fileEnv: Record<string, string> = {};

  // Only this agent's own config directory is read. Reading `~/.omp/agent/.env`
  // from a pi session made omp's aiPeer win over pi's, because files merge in
  // load order and omp was merged last.
  const isPi = process.env.AI_AGENT === "pi" || process.env.PI_CODING_AGENT === "true";
  const agentHome = join(homedir(), isPi ? ".pi" : ".omp", "agent");
  Object.assign(fileEnv, await parseEnvFile(join(agentHome, ".env")));

  // Shared location next, then the cwd copy so a project can still override.
  Object.assign(fileEnv, await parseEnvFile(join(homedir(), ".honcho", ".env")));

  if (cwd) {
    Object.assign(fileEnv, await parseEnvFile(join(cwd, ".env")));
  }

  // Fallback to ~/.honcho/config.json if .env is missing some keys
  try {
    const configJsonRaw = await readFile(join(homedir(), ".honcho", "config.json"), "utf8");
    const json = JSON.parse(configJsonRaw);
    if (!fileEnv.HONCHO_BASE_URL && (json.environmentUrl || json.hosts?.["pi-honcho"]?.environmentUrl)) {
      fileEnv.HONCHO_BASE_URL = json.environmentUrl || json.hosts?.["pi-honcho"]?.environmentUrl;
    }
    if (!fileEnv.HONCHO_API_KEY && (json.apiKey || json.hosts?.["pi-honcho"]?.apiKey)) {
      fileEnv.HONCHO_API_KEY = json.apiKey || json.hosts?.["pi-honcho"]?.apiKey;
    }
    if (!fileEnv.HONCHO_WORKSPACE_ID && (json.workspaceId || json.hosts?.["pi-honcho"]?.workspaceId)) {
      fileEnv.HONCHO_WORKSPACE_ID = json.workspaceId || json.hosts?.["pi-honcho"]?.workspaceId;
    }
  } catch {
    // ignore
  }

  const baseUrl = (
    process.env.HONCHO_BASE_URL ||
    fileEnv.HONCHO_BASE_URL ||
    "http://127.0.0.1:8000"
  ).replace(/\/+$/, "");

  const apiKey = (
    process.env.HONCHO_API_KEY ||
    fileEnv.HONCHO_API_KEY ||
    ""
  ).trim();

  const workspaceId = (
    process.env.HONCHO_WORKSPACE_ID ||
    fileEnv.HONCHO_WORKSPACE_ID ||
    "pi-memory"
  ).trim();

  const userPeer = (
    process.env.HONCHO_USER_PEER ||
    fileEnv.HONCHO_USER_PEER ||
    "user"
  ).trim();

  const aiPeer = (
    process.env.HONCHO_AI_PEER ||
    fileEnv.HONCHO_AI_PEER ||
    "pi"
  ).trim();

  const sharedPeers = Array.from(
    new Set(
      (process.env.HONCHO_SHARED_PEERS || fileEnv.HONCHO_SHARED_PEERS || "")
        .split(",")
        .map((p: string) => p.trim())
        .filter(Boolean)
    )
  );

  if (!apiKey) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
    workspaceId,
    userPeer,
    aiPeer,
    sharedPeers,
  };
}
