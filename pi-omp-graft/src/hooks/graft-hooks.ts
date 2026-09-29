import { hasGraftDirectory, isBuildRunning, triggerBackgroundBuild } from "../runner/graft-runner";
import type { ExtensionContextLike } from "../tools/graft-tools";

export interface ExtensionApiLike {
  on(event: string, handler: (event: unknown, ctx: ExtensionContextLike) => Promise<unknown> | unknown): void;
}

interface ToolResultEvent {
  toolName: string;
  input: Record<string, unknown>;
  content: Array<{ type: string; text: string }>;
  isError: boolean;
}

const DEBOUNCE_SYNC_MS = 30000;
const syncTimers = new Map<string, NodeJS.Timeout>();

export function setupGraftHooks(pi: ExtensionApiLike): void {
  pi.on("session_start", async (_event: unknown, ctx: ExtensionContextLike) => {
    const cwd = ctx.cwd || process.cwd();
    if (hasGraftDirectory(cwd)) return;

    // Only the main session may auto-build: subagents share the workspace.
    if (ctx.agent && ctx.agent.kind !== "main") return;
    if (isBuildRunning(cwd)) return;

    triggerBackgroundBuild(cwd, false);
  });

  pi.on("tool_result", async (event: unknown, ctx: ExtensionContextLike) => {
    const toolEvent = event as ToolResultEvent;
    if (!toolEvent || toolEvent.isError) return;

    const mutatingTools = ["write", "edit", "apply_patch", "ast_edit"];
    if (!mutatingTools.includes(toolEvent.toolName)) return;

    const cwd = ctx.cwd || process.cwd();
    if (!hasGraftDirectory(cwd)) return;

    // Debounce: a multi-edit turn triggers exactly one sync at the end.
    clearTimeout(syncTimers.get(cwd));

    syncTimers.set(
      cwd,
      setTimeout(() => {
        syncTimers.delete(cwd);
        if (!isBuildRunning(cwd)) triggerBackgroundBuild(cwd, false);
      }, DEBOUNCE_SYNC_MS)
    );
  });
}