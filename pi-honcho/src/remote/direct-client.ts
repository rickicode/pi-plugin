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

/**
 * Self-hosted Honcho client.
 *
 * Mirrors the read semantics of the Hermes Honcho plugin so `pi` and the Hermes
 * agents share one memory space:
 *
 * - conclusions are read as a union of scopes, because a workspace has no
 *   cross-peer conclusion query: user facts (`aiPeer` observes `userPeer`),
 *   this agent's own knowledge (`aiPeer` observes itself), and every sibling
 *   agent's knowledge (`HONCHO_SHARED_PEERS[i]` observes itself).
 * - raw message search goes through the workspace-wide peer endpoint
 *   `/peers/{peer_id}/search`, which sees all sessions of that peer, instead of
 *   the single deterministic session the old code used.
 * - writes attach `observer_id`/`observed_id` explicitly so Hermes and the
 *   other agents read them back.
 */
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

    // The self-hosted endpoint is usually behind round-robin DNS; one of the
    // addresses can refuse connections transiently. Fan-out recall multiplies
    // the chance of hitting it, so retry connection-level failures only.
    const attempts = 4;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await fetch(url, {
          ...options,
          headers,
          signal: options.signal ?? AbortSignal.timeout(20_000),
        });
      } catch (err: unknown) {
        lastError = err;
        if (options.signal?.aborted) break;
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
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

  /**
   * Scopes to read conclusions from, as `observer -> observed` pairs.
   * A Honcho workspace has no cross-peer conclusion query, so shared memory is
   * reconstructed as a union. Order drives output order: this agent's view of
   * the user first, then its own knowledge, then each sibling agent's.
   */
  private readScopes(): Array<{ observer: string; observed: string }> {
    const { userPeer, aiPeer, sharedPeers } = this.config;
    const scopes: Array<{ observer: string; observed: string }> = [];

    const push = (observer: string, observed: string) => {
      if (!observer || !observed) return;
      if (scopes.some((s) => s.observer === observer && s.observed === observed)) return;
      scopes.push({ observer, observed });
    };

    for (const observer of [aiPeer, ...sharedPeers]) {
      push(observer, userPeer);
      push(observer, observer);
    }

    return scopes;
  }

  private async queryScope(
    scope: { observer: string; observed: string },
    query: string,
    limit: number
  ): Promise<string[]> {
    const res = await this.fetchHoncho(
      `/v3/workspaces/${this.config.workspaceId}/conclusions/query`,
      {
        method: "POST",
        body: JSON.stringify({
          query,
          top_k: limit,
          filters: {
            observer: scope.observer,
            observed: scope.observed,
          },
        }),
      }
    );

    if (!res.ok) return [];

    const data = (await res.json()) as Array<{ content: string }>;
    if (!Array.isArray(data)) return [];

    return data
      .map((c) => c.content)
      .filter((content): content is string => Boolean(content));
  }

  async search(query: string, limit: number = 5): Promise<string[]> {
    try {
      // 1. Union fact recall across the shared scopes.
      const scopes = this.readScopes();
      const perScope = Math.max(2, Math.ceil(limit / Math.max(1, scopes.length)) + 1);
      const results = await Promise.all(
        scopes.map(async (scope) => ({
          scope,
          contents: await this.queryScope(scope, query, perScope),
        }))
      );

      const items: string[] = [];
      const seen = new Set<string>();
      for (const { scope, contents } of results) {
        for (const content of contents) {
          const key = content.trim();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          const label =
            scope.observer === this.config.aiPeer
              ? scope.observed === this.config.aiPeer
                ? "[Fact:self]"
                : "[Fact]"
              : `[Fact:${scope.observer}]`;
          items.push(`${label} ${content}`);
        }
      }

      // 2. Workspace-wide raw message search: sees every session each peer took part in.
      const messagePeers = [this.config.userPeer, this.config.aiPeer].filter(
        (peer, index, all) => peer && all.indexOf(peer) === index
      );
      const messageResults = await Promise.all(
        messagePeers.map(async (peer) => {
          const searchRes = await this.fetchHoncho(
            `/v3/workspaces/${this.config.workspaceId}/peers/${peer}/search`,
            {
              method: "POST",
              body: JSON.stringify({
                query,
                limit,
              }),
            }
          );
          if (!searchRes.ok) return [];
          const messages = (await searchRes.json()) as
            | Array<{ content: string; peer_id: string }>
            | { items?: Array<{ content: string; peer_id: string }> };
          const list = Array.isArray(messages) ? messages : messages.items || [];
          return list.slice(0, limit).map(
            (m) => `[${m.peer_id || peer}] ${m.content}`
          );
        })
      );
      const seenMessages = new Set<string>();
      for (const line of messageResults.flat()) {
        const body = line.slice(line.indexOf("] ") + 2);
        if (!body || seenMessages.has(body)) continue;
        seenMessages.add(body);
        items.push(line);
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