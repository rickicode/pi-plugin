import { registerGraftTools } from "./src/tools/graft-tools";
import { registerSuperTools } from "./src/tools/super-tools";
import { setupGraftHooks } from "./src/hooks/graft-hooks";
import { setupReadAdvisory } from "./src/hooks/read-advisory";
import { registerGraftCommands } from "./src/commands/graft-commands";
export interface ExtensionApiContract {
  registerTool(def: Record<string, unknown>): void;
  registerCommand(name: string, def: Record<string, unknown>): void;
  on(event: string, handler: (event: unknown, ctx: unknown) => Promise<unknown> | unknown): void;
}

export default function graftPlugin(pi: ExtensionApiContract): void {
  // 1. Register LLM Tools (graft + super tools: ast_edit, eval)
  registerGraftTools(pi);
  registerSuperTools(pi);

  // 2. Setup Lifecycle Hooks
  setupGraftHooks(pi);
  setupReadAdvisory(pi);

  // 3. Register Slash Commands
  registerGraftCommands(pi);
}
