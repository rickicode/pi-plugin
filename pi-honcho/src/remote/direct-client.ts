import { createHash } from "node:crypto";
import type { HonchoEnvConfig } from "./env-config.js";

export interface HonchoClientContract {
  checkConnection(): Promise<boolean>;
  search(query: string, limit?: number): Promise<string[]>;
  chat(query: string): Promise<string>;
  remember(content: string): Promise<string>;
  saveMessage(role: "user" | "assistant", content: string): Promise<void>;
  getContext(): Promise<string>;
}

export class DirectHonchoClient implements HonchoClientContract {
  private config: HonchoEnvConfig;
  private sessionId: string;

  constructor(config: HonchoEnvConfig, cwd: string) {
    this.config = config;
    // Stable deterministic session ID derived from workspace & path
    const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 16);
    this.sessionId = `session-${hash}`;
  }

  private async fetchHoncho(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${this.config.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }

  async checkConnection(): Promise<boolean> {
    try {
      const res = await this.fetchHoncho("/health");
      return res.ok;
    } catch {
      return false;
    }
  }

  async ensureSession(): Promise<void> {
    try {
      // 1. Create or get session
      await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          id: this.sessionId,
        }),
      });

      // 2. Ensure peers exist
      await this.fetchHoncho(
        `/v3/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/peers`,
        {
          method: "POST",
          body: JSON.stringify({
            peer_id: this.config.userPeer,
          }),
        }
      );

      await this.fetchHoncho(
        `/v3/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/peers`,
        {
          method: "POST",
          body: JSON.stringify({
            peer_id: this.config.aiPeer,
          }),
        }
      );
    } catch {
      // Session or peers may already exist, ignore errors
    }
  }

  async search(query: string, limit: number = 5): Promise<string[]> {
    try {
      // 1. Query conclusions (high quality facts)
      const conclusionsRes = await this.fetchHoncho(
        `/v3/workspaces/${this.config.workspaceId}/conclusions/query`,
        {
          method: "POST",
          body: JSON.stringify({
            query,
            top_k: limit,
            filters: {
              observer: this.config.aiPeer,
              observed: this.config.userPeer,
            },
          }),
        }
      );

      const items: string[] = [];
      if (conclusionsRes.ok) {
        const conclusions = (await conclusionsRes.json()) as Array<{ content: string }>;
        if (Array.isArray(conclusions)) {
          for (const c of conclusions) {
            if (c.content) items.push(`[Fact] ${c.content}`);
          }
        }
      }

      // 2. Query session message search
      const searchRes = await this.fetchHoncho(
        `/v3/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/search`,
        {
          method: "POST",
          body: JSON.stringify({
            query,
          }),
        }
      );

      if (searchRes.ok) {
        const messages = (await searchRes.json()) as Array<{ content: string; peer_id: string }>;
        if (Array.isArray(messages)) {
          for (const m of messages.slice(0, limit)) {
            if (m.content) items.push(`[${m.peer_id}] ${m.content}`);
          }
        }
      }

      return items;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return [`Honcho search error: ${msg}`];
    }
  }

  async chat(query: string): Promise<string> {
    try {
      const res = await this.fetchHoncho(
        `/v3/workspaces/${this.config.workspaceId}/chat`,
        {
          method: "POST",
          body: JSON.stringify({
            query,
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        return `Honcho chat error (${res.status}): ${errText}`;
      }

      const data = (await res.json()) as { content?: string };
      return data.content || "No relevant memory.";
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Honcho chat error: ${msg}`;
    }
  }

  async remember(content: string): Promise<string> {
    try {
      await this.ensureSession();
      const res = await this.fetchHoncho(
        `/v3/workspaces/${this.config.workspaceId}/conclusions`,
        {
          method: "POST",
          body: JSON.stringify({
            conclusions: [
              {
                content,
                observer_id: this.config.aiPeer,
                observed_id: this.config.userPeer,
                session_id: this.sessionId,
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save conclusion (${res.status}): ${errText}`);
      }

      const data = (await res.json()) as Array<{ id: string }>;
      const id = data?.[0]?.id || "saved";
      return id;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Honcho remember error: ${msg}`);
    }
  }

  async saveMessage(role: "user" | "assistant", content: string): Promise<void> {
    try {
      await this.ensureSession();
      const peerId = role === "user" ? this.config.userPeer : this.config.aiPeer;
      await this.fetchHoncho(
        `/v3/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({
            messages: [
              {
                content: content.slice(0, 8000),
                peer_id: peerId,
              },
            ],
          }),
        }
      );
    } catch {
      // Background message logging is non-blocking
    }
  }

  async getContext(): Promise<string> {
    try {
      const res = await this.fetchHoncho(
        `/v3/workspaces/${this.config.workspaceId}/peers/${this.config.userPeer}/context`
      );

      if (!res.ok) return "";

      const data = (await res.json()) as {
        peer_card?: string[];
        representation?: string;
      };

      const lines: string[] = [];
      if (Array.isArray(data.peer_card) && data.peer_card.length > 0) {
        lines.push("### User Profile:");
        for (const card of data.peer_card.slice(0, 10)) {
          lines.push(`- ${card}`);
        }
      }

      if (data.representation) {
        lines.push("\n### User Insights:");
        const repLines = data.representation.split("\n").filter((l) => l.trim().length > 0);
        for (const l of repLines.slice(0, 8)) {
          lines.push(l);
        }
      }

      return lines.join("\n");
    } catch {
      return "";
    }
  }
}
