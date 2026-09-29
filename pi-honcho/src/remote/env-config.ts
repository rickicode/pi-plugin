import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export interface HonchoEnvConfig {
  baseUrl: string;
  apiKey: string;
  workspaceId: string;
  userPeer: string;
  aiPeer: string;
}

async function parseEnvFile(path: string): Promise<Record<string, string>> {
  try {
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

  // 1. ~/.honcho/.env or ~/.honcho/config.env
  Object.assign(fileEnv, await parseEnvFile(join(homedir(), ".honcho", ".env")));

  // 2. ~/.pi/agent/.env
  Object.assign(fileEnv, await parseEnvFile(join(homedir(), ".pi", "agent", ".env")));

  // 3. ~/.omp/agent/.env
  Object.assign(fileEnv, await parseEnvFile(join(homedir(), ".omp", "agent", ".env")));

  // 4. cwd .env
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

  if (!apiKey) {
    return null;
  }

  return {
    baseUrl,
    apiKey,
    workspaceId,
    userPeer,
    aiPeer,
  };
}
