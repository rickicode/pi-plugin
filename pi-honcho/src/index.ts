import { Type } from "typebox";
import { loadHonchoEnv, type HonchoEnvConfig } from "./remote/env-config.js";
import { DirectHonchoClient } from "./remote/direct-client.js";

export interface ExtensionApiLike {
  registerTool(def: Record<string, unknown>): void;
  registerCommand(name: string, def: Record<string, unknown>): void;
  on(event: string, handler: (event: unknown, ctx: unknown) => Promise<unknown> | unknown): void;
  setActiveTools?(names: string[]): void;
  getActiveTools?(): string[];
}

interface ExtensionContextLike {
  cwd?: string;
  hasUI?: boolean;
  ui?: {
    notify(message: string, type?: "info" | "warning" | "error"): void;
  };
  sessionManager?: {
    getBranch?(): Array<{ role?: string; content?: unknown }>;
  };
}
export default function honchoPlugin(pi: ExtensionApiLike): void {
  let client: DirectHonchoClient | null = null;
  let cachedEnvConfig: HonchoEnvConfig | null = null;
  let activeCwd = process.cwd();

  // Helper to ensure client is ready
  async function getClient(cwd?: string): Promise<DirectHonchoClient | null> {
    const targetCwd = cwd || activeCwd || process.cwd();
    if (!client || activeCwd !== targetCwd) {
      activeCwd = targetCwd;
      cachedEnvConfig = await loadHonchoEnv(targetCwd);
      if (cachedEnvConfig) {
        client = new DirectHonchoClient(cachedEnvConfig, targetCwd);
      } else {
        client = null;
      }
    }
    return client;
  }

  // 1. Tool: honcho_remember
  pi.registerTool({
    name: "honcho_remember",
    label: "Honcho Remember",
    description:
      "Save a durable preference, decision, constraint, or fact into persistent Honcho memory.",
    parameters: Type.Object({
      content: Type.String({
        description: "The fact, preference, or architectural decision to record",
        minLength: 1,
      }),
    }),
    async execute(
      _id: string,
      params: { content: string },
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: ExtensionContextLike
    ) {
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        return {
          content: [
            {
              type: "text",
              text: "Honcho is not configured. Set HONCHO_BASE_URL and HONCHO_API_KEY in ~/.pi/agent/.env or ~/.honcho/.env",
            },
          ],
          isError: true,
        };
      }

      try {
        const conclusionId = await activeClient.remember(params.content);
        return {
          content: [
            {
              type: "text",
              text: `Saved to Honcho memory [ID: ${conclusionId}]: "${params.content}"`,
            },
          ],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Failed to save memory: ${msg}` }],
          isError: true,
        };
      }
    },
  });

  // 2. Tool: honcho_search
  pi.registerTool({
    name: "honcho_search",
    label: "Honcho Search",
    description:
      "Search persistent Honcho memory for stored user preferences, project conventions, and past conclusions.",
    parameters: Type.Object({
      query: Type.String({
        description: "Keywords or semantic query to look up in Honcho memory",
        minLength: 1,
      }),
      limit: Type.Optional(
        Type.Number({
          description: "Max results to return (default 5)",
        })
      ),
    }),
    async execute(
      _id: string,
      params: { query: string; limit?: number },
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: ExtensionContextLike
    ) {
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        return {
          content: [
            {
              type: "text",
              text: "Honcho is not configured. Set HONCHO_BASE_URL and HONCHO_API_KEY in ~/.pi/agent/.env or ~/.honcho/.env",
            },
          ],
          isError: true,
        };
      }

      const results = await activeClient.search(params.query, params.limit || 5);
      return {
        content: [
          {
            type: "text",
            text:
              results.length > 0
                ? `Honcho Search Results for "${params.query}":\n\n` + results.join("\n\n")
                : `No relevant memories found for "${params.query}".`,
          },
        ],
      };
    },
  });

  // 3. Tool: honcho_chat
  pi.registerTool({
    name: "honcho_chat",
    label: "Honcho Chat",
    description:
      "Query Honcho's dialectic AI synthesizer directly about workspace memory, user identity, or historical context.",
    parameters: Type.Object({
      query: Type.String({
        description: "Question to ask Honcho memory synthesizer",
        minLength: 1,
      }),
    }),
    async execute(
      _id: string,
      params: { query: string },
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: ExtensionContextLike
    ) {
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        return {
          content: [
            {
              type: "text",
              text: "Honcho is not configured. Set HONCHO_BASE_URL and HONCHO_API_KEY in ~/.pi/agent/.env or ~/.honcho/.env",
            },
          ],
          isError: true,
        };
      }

      const reply = await activeClient.chat(params.query);
      return {
        content: [
          {
            type: "text",
            text: reply,
          },
        ],
      };
    },
  });

  // 4. Tool: honcho_context
  pi.registerTool({
    name: "honcho_context",
    label: "Honcho Context",
    description:
      "Retrieve the full user card, identity profile, and active insights from Honcho memory.",
    parameters: Type.Object({}),
    async execute(
      _id: string,
      _params: Record<string, unknown>,
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: ExtensionContextLike
    ) {
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        return {
          content: [
            {
              type: "text",
              text: "Honcho is not configured. Set HONCHO_BASE_URL and HONCHO_API_KEY in ~/.pi/agent/.env or ~/.honcho/.env",
            },
          ],
          isError: true,
        };
      }

      const context = await activeClient.getContext();
      return {
        content: [
          {
            type: "text",
            text: context || "No peer profile card found in Honcho workspace.",
          },
        ],
      };
    },
  });

  // 5. Slash Commands
  pi.registerCommand("honcho-status", {
    description: "Check Honcho memory connection and configuration",
    handler: async (_args: string, ctx: ExtensionContextLike) => {
      const activeClient = await getClient(ctx?.cwd);
      const isConnected = activeClient ? await activeClient.checkConnection() : false;
      const statusText = [
        "=== Honcho Memory Status ===",
        `Configured: ${cachedEnvConfig ? "Yes (via .env)" : "No"}`,
        `Base URL: ${cachedEnvConfig?.baseUrl || "Not set"}`,
        `Workspace: ${cachedEnvConfig?.workspaceId || "Not set"}`,
        `User Peer: ${cachedEnvConfig?.userPeer || "user"}`,
        `AI Peer: ${cachedEnvConfig?.aiPeer || "pi"}`,
        `Server Health: ${isConnected ? "Online (OK)" : "Offline / Unreachable"}`,
      ].join("\n");

      if (ctx?.ui?.notify) {
        ctx.ui.notify(statusText, isConnected ? "info" : "warning");
      } else {
        console.log(statusText);
      }
    },
  });

  pi.registerCommand("honcho-remember", {
    description: "Quickly save a fact or preference to Honcho memory",
    handler: async (args: string, ctx: ExtensionContextLike) => {
      if (!args?.trim()) {
        ctx?.ui?.notify?.("Usage: /honcho-remember <fact to remember>", "warning");
        return;
      }
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        ctx?.ui?.notify?.("Honcho not configured.", "error");
        return;
      }
      try {
        const id = await activeClient.remember(args.trim());
        ctx?.ui?.notify?.(`Remembered in Honcho [${id}]`, "info");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx?.ui?.notify?.(`Failed to remember: ${msg}`, "error");
      }
    },
  });

  // 6. Context Injection Hook on start
  let contextInjected = false;
  pi.on("before_agent_start", async (_event: unknown, ctx: ExtensionContextLike) => {
    if (contextInjected) return;
    const activeClient = await getClient(ctx?.cwd);
    if (!activeClient) return;

    try {
      const context = await activeClient.getContext();
      if (context && context.trim().length > 0) {
        contextInjected = true;
        return {
          additionalContext: `[Honcho Persistent Memory Context]\n${context}\n[End Honcho Context]`,
        };
      }
    } catch {
      // Ignore background fetch failure
    }
  });

  // 7. Message Logger Hook (non-blocking)
  let lastPrompt = "";
  pi.on("before_agent_start", (event: unknown) => {
    const e = event as { prompt?: string };
    if (e?.prompt) lastPrompt = e.prompt;
  });

  pi.on("agent_settled", async (_event: unknown, ctx: ExtensionContextLike) => {
    const prompt = lastPrompt;
    lastPrompt = "";
    if (!prompt) return;

    const activeClient = await getClient(ctx?.cwd);
    if (!activeClient) return;

    // Save prompt to session asynchronously
    activeClient.saveMessage("user", prompt).catch(() => {});
  });
}
