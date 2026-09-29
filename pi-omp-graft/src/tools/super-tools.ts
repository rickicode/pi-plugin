import { spawn } from "node:child_process";
import { Type } from "typebox";
import type { ExtensionContextLike, ToolApiLike } from "./graft-tools";

export function registerSuperTools(pi: ToolApiLike): void {
  // 1. ast_edit (AST-aware search & replace via native /usr/bin/ast-grep)
  pi.registerTool({
    name: "ast_edit",
    label: "AST-Aware Code Edit",
    description:
      "Perform AST-aware search and structural rewriting using native ast-grep. Match pattern ($VAR for metavariables) and rewrite into replacement. Safer than text replace.",
    parameters: Type.Object({
      pattern: Type.String({ description: "AST pattern with metavariables (e.g. 'console.log($A)')" }),
      rewrite: Type.Optional(Type.String({ description: "Replacement AST string (e.g. 'logger.info($A)'). Omit to only search." })),
      paths: Type.Optional(Type.Array(Type.String(), { description: "Target files or directories. Default: cwd" })),
      lang: Type.Optional(Type.String({ description: "Language hint (e.g. 'ts', 'js', 'py', 'go', 'rs')" })),
    }),
    async execute(
      _id: string,
      params: { pattern: string; rewrite?: string; paths?: string[]; lang?: string },
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: ExtensionContextLike
    ) {
      const cwd = ctx.cwd || process.cwd();
      const args = ["run", "-p", params.pattern];

      if (params.rewrite) {
        args.push("-r", params.rewrite, "-U"); // -U: update files in-place
      }
      if (params.lang) {
        args.push("-l", params.lang);
      }
      if (params.paths && params.paths.length > 0) {
        args.push(...params.paths);
      } else {
        args.push(".");
      }

      const { promise, resolve } = Promise.withResolvers<{ content: Array<{ type: string; text: string }>; isError?: boolean }>();

      const child = spawn("ast-grep", args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (chunk: Buffer) => {
        if (stdout.length < 16384) stdout += chunk.toString("utf8");
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        if (stderr.length < 4096) stderr += chunk.toString("utf8");
      });

      child.on("close", (code: number | null) => {
        const out = stdout.trim() || stderr.trim();
        if (code !== 0 && stderr) {
          resolve({
            content: [{ type: "text", text: `ast-grep failed (exit ${code}):\n${stderr.trim()}` }],
            isError: true,
          });
          return;
        }
        resolve({
          content: [
            {
              type: "text",
              text: params.rewrite
                ? `AST rewrite applied successfully:\n${out || "Files modified in-place."}`
                : `AST match results:\n${out || "No matches found."}`,
            },
          ],
        });
      });

      child.on("error", (err: Error) => {
        resolve({
          content: [{ type: "text", text: `Failed to execute ast-grep: ${err.message}` }],
          isError: true,
        });
      });

      return promise;
    },
  });

  // 2. eval (Throwaway scratchpad code evaluation in Python or Bun/JS)
  pi.registerTool({
    name: "eval",
    label: "Evaluate Scratchpad Code",
    description:
      "Execute throwaway Python or JavaScript/TypeScript code in an isolated subprocess to verify logic, compute numbers, or run smoke tests before editing files.",
    parameters: Type.Object({
      language: Type.Union([Type.Literal("py"), Type.Literal("js"), Type.Literal("ts")], {
        description: "'py' for Python 3, 'js' / 'ts' for Bun runtime",
      }),
      code: Type.String({ description: "Code to execute" }),
      timeoutMs: Type.Optional(Type.Number({ description: "Execution timeout in ms. Default: 10000" })),
    }),
    async execute(
      _id: string,
      params: { language: "py" | "js" | "ts"; code: string; timeoutMs?: number },
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: ExtensionContextLike
    ) {
      const cwd = ctx.cwd || process.cwd();
      const timeoutMs = params.timeoutMs || 10000;

      const binary = params.language === "py" ? "python3" : "bun";
      const flag = binary === "python3" ? "-c" : "-e"; // python3 uses -c; bun uses -e
      const args = [flag, params.code];

      const { promise, resolve } = Promise.withResolvers<{ content: Array<{ type: string; text: string }>; isError?: boolean }>();

      const child = spawn(binary, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      let killed = false;

      const timer = setTimeout(() => {
        killed = true;
        child.kill("SIGTERM");
        resolve({
          content: [{ type: "text", text: `eval timed out after ${timeoutMs}ms` }],
          isError: true,
        });
      }, timeoutMs);

      child.stdout?.on("data", (chunk: Buffer) => {
        if (stdout.length < 16384) stdout += chunk.toString("utf8");
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        if (stderr.length < 4096) stderr += chunk.toString("utf8");
      });

      child.on("close", (code: number | null) => {
        clearTimeout(timer);
        if (killed) return;
        const out = stdout.trim();
        const err = stderr.trim();
        if (code !== 0) {
          resolve({
            content: [{ type: "text", text: `Process exited with code ${code}:\n${err || out}` }],
            isError: true,
          });
          return;
        }
        resolve({
          content: [{ type: "text", text: out || (err ? `(stderr): ${err}` : "(no output)") }],
        });
      });

      child.on("error", (err: Error) => {
        clearTimeout(timer);
        resolve({
          content: [{ type: "text", text: `Failed to spawn ${binary}: ${err.message}` }],
          isError: true,
        });
      });

      return promise;
    },
  });
}
