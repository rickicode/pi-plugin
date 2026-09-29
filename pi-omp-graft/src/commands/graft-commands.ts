import { execGraft, hasGraftDirectory, isBuildRunning, triggerBackgroundBuild } from "../runner/graft-runner";
import type { ExtensionContextLike } from "../tools/graft-tools";

export interface ExtensionCommandContextLike extends ExtensionContextLike {
  waitForIdle?(): Promise<void>;
}

export interface CommandApiLike {
  registerCommand(
    name: string,
    def: {
      description: string;
      handler: (args: string, ctx: ExtensionCommandContextLike) => Promise<void> | void;
    }
  ): void;
}

export function registerGraftCommands(pi: CommandApiLike): void {
  // /graft-build
  pi.registerCommand("graft-build", {
    description: "Rebuild Graft AST context graph (Tier-1 deterministic $0)",
    handler: async (_args: string, ctx: ExtensionCommandContextLike) => {
      const cwd = ctx.cwd || process.cwd();
      if (isBuildRunning(cwd)) {
        ctx.ui?.notify("Graft build is already running in background", "warning");
        return;
      }

      ctx.ui?.notify("Rebuilding Graft context graph in background...", "info");
      if (!triggerBackgroundBuild(cwd, false)) {
        ctx.ui?.notify("Failed to start Graft build", "error");
      }
    },
  });

  // /graft-check
  pi.registerCommand("graft-check", {
    description: "Check freshness of Graft context graph against working tree",
    handler: async (_args: string, ctx: ExtensionCommandContextLike) => {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        ctx.ui?.notify("No graft/ graph found in workspace.", "warning");
        return;
      }

      ctx.ui?.notify("Checking Graft graph freshness...", "info");
      try {
        const res = await execGraft({ cwd, args: ["check", "--json"], timeoutMs: 15000 });
        ctx.ui?.notify(`Graft freshness check:\n${res.stdout}`, "info");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui?.notify(`graft-check error: ${msg}`, "error");
      }
    },
  });

  // /graft-map
  pi.registerCommand("graft-map", {
    description: "Display codebase architecture hotspots and hubs",
    handler: async (args: string, ctx: ExtensionCommandContextLike) => {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        ctx.ui?.notify("No graft/ graph found in workspace.", "warning");
        return;
      }

      try {
        const cmdArgs = ["map"];
        if (args && args.trim().length > 0) {
          const num = parseInt(args.trim(), 10);
          if (!isNaN(num)) cmdArgs.push("--max-dirs", String(num));
        }

        const res = await execGraft({ cwd, args: cmdArgs, timeoutMs: 15000 });
        ctx.ui?.notify(`Graft Map:\n${res.stdout}`, "info");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui?.notify(`graft-map error: ${msg}`, "error");
      }
    },
  });
}
