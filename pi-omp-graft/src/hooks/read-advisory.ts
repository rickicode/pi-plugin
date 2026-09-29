import * as fs from "node:fs";
import * as path from "node:path";
import { hasGraftDirectory } from "../runner/graft-runner";
import type { ExtensionContextLike } from "../tools/graft-tools";

export interface ExtensionApiLike {
  on(event: string, handler: (event: unknown, ctx: ExtensionContextLike) => Promise<unknown> | unknown): void;
}

interface ToolCallEvent {
  toolName: string;
  input?: { path?: string } & Record<string, unknown>;
}

/** Byte size above which a full-file read is worth a cheaper-navigation hint. */
const LARGE_FILE_BYTES = 20 * 1024;

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".go", ".rs", ".java", ".kt", ".kts",
  ".php", ".swift", ".rb", ".cs", ".scala", ".c", ".h", ".cc", ".cpp", ".hpp", ".r",
]);
const advisedFiles = new Set<string>();


export function setupReadAdvisory(pi: ExtensionApiLike): void {
  pi.on("tool_call", async (event: unknown, ctx: ExtensionContextLike) => {
    const toolEvent = event as ToolCallEvent;
    if (!toolEvent || toolEvent.toolName !== "read") return;

    const raw = toolEvent.input?.path;
    if (typeof raw !== "string" || /:(\d|raw|img|conflicts|range)/.test(raw.slice(raw.lastIndexOf(":")))) return;

    const cwd = ctx.cwd || process.cwd();
    if (!hasGraftDirectory(cwd)) return;

    const ext = path.extname(raw).toLowerCase();
    if (!CODE_EXTENSIONS.has(ext)) return;

    const abs = path.isAbsolute(raw) ? raw : path.join(cwd, raw);
    const key = abs;
    if (advisedFiles.has(key)) return;

    let size = 0;
    try {
      size = fs.statSync(abs).size;
    } catch {
      return;
    }
    if (size < LARGE_FILE_BYTES) return;

    advisedFiles.add(key);

    return {
      additionalContext:
        `Large code file (${Math.round(size / 1024)} KB) read without a line range. ` +
        "For a cheaper orientation: use graft_skeleton to list its declarations, or graft_ask to locate the " +
        "relevant symbol, then re-read only the needed range (e.g. `path:120-260`).",
    };
  });
}
