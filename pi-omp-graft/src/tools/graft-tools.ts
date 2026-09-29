import { Type } from "typebox";
import { execGraft, hasGraftDirectory } from "../runner/graft-runner";

export interface ExtensionContextLike {
  cwd?: string;
  hasUI?: boolean;
  agent?: {
    kind: "main" | "sub";
    id?: string;
    name?: string;
  };
  ui?: {
    notify(msg: string, level?: string): void;
  };
}

export interface ToolApiLike {
  registerTool(def: Record<string, unknown>): void;
}

export function registerGraftTools(pi: ToolApiLike): void {
  // 1. graft_ask
  pi.registerTool({
    name: "graft_ask",
    label: "Graft Ask",
    description: "Search symbols and definitions in the codebase using GraphRank ranking (IDF + in-degree coupling). Much faster and more accurate than grepping entire repo.",
    parameters: Type.Object({
      query: Type.String({ description: "Question, task, or symbol keywords to find" }),
      in: Type.Optional(Type.String({ description: "Optional path or directory scope to restrict results" })),
    }),
    async execute(_id: string, params: { query: string; in?: string }, _signal: AbortSignal | undefined, _onUpdate: unknown, ctx: ExtensionContextLike) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found in this workspace. Run 'graft build' or use standard tools." }],
          isError: true,
        };
      }

      const args = ["ask", params.query];
      if (params.in) args.push("--in", params.in);

      try {
        const res = await execGraft({ cwd, args, timeoutMs: 15000 });
        return {
          content: [{ type: "text", text: res.stdout || "No matching symbols found." }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_ask failed: ${msg}` }],
          isError: true,
        };
      }
    },
  });

  // 2. graft_skeleton
  pi.registerTool({
    name: "graft_skeleton",
    label: "Graft Skeleton",
    description: "Extract public API signatures and function definitions from a file without reading function bodies. Saves up to 90% context tokens.",
    parameters: Type.Object({
      file: Type.String({ description: "Relative path or basename of file to inspect" }),
    }),
    async execute(_id: string, params: { file: string }, _signal: AbortSignal | undefined, _onUpdate: unknown, ctx: ExtensionContextLike) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found. Use read tool with ranges." }],
          isError: true,
        };
      }

      try {
        const res = await execGraft({ cwd, args: ["skeleton", params.file], timeoutMs: 10000 });
        return {
          content: [{ type: "text", text: res.stdout || "Empty skeleton or file not indexed." }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_skeleton failed: ${msg}` }],
          isError: true,
        };
      }
    },
  });

  // 3. graft_callers
  pi.registerTool({
    name: "graft_callers",
    label: "Graft Callers",
    description: "Find who calls, references, imports, or extends a symbol (incoming edges), or what the symbol calls (outgoing edges).",
    parameters: Type.Object({
      symbol: Type.String({ description: "Symbol or function name to trace" }),
      direction: Type.Optional(Type.String({ description: "'in' (who calls this) or 'out' (what this calls). Default: 'in'" })),
      depth: Type.Optional(Type.Number({ description: "Transitive depth level (e.g. 1, 2, 3). Default: 1" })),
    }),
    async execute(_id: string, params: { symbol: string; direction?: string; depth?: number }, _signal: AbortSignal | undefined, _onUpdate: unknown, ctx: ExtensionContextLike) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found in workspace." }],
          isError: true,
        };
      }

      const args = ["callers", params.symbol];
      if (params.direction === "out") args.push("--direction", "out");
      if (params.depth && params.depth > 1) args.push("-d", String(params.depth));

      try {
        const res = await execGraft({ cwd, args, timeoutMs: 10000 });
        return {
          content: [{ type: "text", text: res.stdout || `No edges found for '${params.symbol}'.` }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_callers failed: ${msg}` }],
          isError: true,
        };
      }
    },
  });

  // 4. graft_grep
  pi.registerTool({
    name: "graft_grep",
    label: "Graft Grep",
    description: "Search regex or fixed strings across AST-indexed source code files, grouped by enclosing symbol and ranked by coupling.",
    parameters: Type.Object({
      pattern: Type.String({ description: "Regex pattern or fixed string to search" }),
      in: Type.Optional(Type.String({ description: "Restrict search to files under this path prefix" })),
      fixed: Type.Optional(Type.Boolean({ description: "Treat pattern as literal string instead of regex" })),
      caseSensitive: Type.Optional(Type.Boolean({ description: "Case sensitive search. Default: false" })),
    }),
    async execute(_id: string, params: { pattern: string; in?: string; fixed?: boolean; caseSensitive?: boolean }, _signal: AbortSignal | undefined, _onUpdate: unknown, ctx: ExtensionContextLike) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found. Use native grep tool." }],
          isError: true,
        };
      }

      const args = ["grep", params.pattern];
      if (params.in) args.push("--in", params.in);
      if (params.fixed) args.push("--fixed");
      if (!params.caseSensitive) args.push("-i");

      try {
        const res = await execGraft({ cwd, args, timeoutMs: 20000 });
        return {
          content: [{ type: "text", text: res.stdout || `No hits found for pattern '${params.pattern}'.` }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_grep failed: ${msg}` }],
          isError: true,
        };
      }
    },
  });

  // 5. graft_map
  pi.registerTool({
    name: "graft_map",
    label: "Graft Map",
    description: "Token-budgeted overview of the codebase architecture: directory clusters, hubs, and global hotspots.",
    parameters: Type.Object({
      maxDirs: Type.Optional(Type.Number({ description: "Max directories to display. Default: 12" })),
    }),
    async execute(_id: string, params: { maxDirs?: number }, _signal: AbortSignal | undefined, _onUpdate: unknown, ctx: ExtensionContextLike) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found in workspace." }],
          isError: true,
        };
      }

      const args = ["map"];
      if (params.maxDirs) args.push("--max-dirs", String(params.maxDirs));

      try {
        const res = await execGraft({ cwd, args, timeoutMs: 10000 });
        return {
          content: [{ type: "text", text: res.stdout || "Unable to generate repo map." }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_map failed: ${msg}` }],
          isError: true,
        };
      }
    },
  });

  // 6. graft_blast
  pi.registerTool({
    name: "graft_blast",
    label: "Graft Blast Radius",
    description: "Calculate blast radius of uncommitted changes or diff against origin/main. Shows all dependents and callers affected by edits.",
    parameters: Type.Object({
      base: Type.Optional(Type.String({ description: "Git base reference (e.g. 'origin/main', 'HEAD~1')" })),
    }),
    async execute(_id: string, params: { base?: string }, _signal: AbortSignal | undefined, _onUpdate: unknown, ctx: ExtensionContextLike) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found in workspace." }],
          isError: true,
        };
      }

      const args = ["blast", "--no-owners"];
      if (params.base) args.push("--base", params.base);

      try {
        const res = await execGraft({ cwd, args, timeoutMs: 15000 });
        return {
          content: [{ type: "text", text: res.stdout || "No blast radius detected (no changes or no dependents)." }],
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_blast failed: ${msg}` }],
          isError: true,
        };
      }
    },
  });
}
