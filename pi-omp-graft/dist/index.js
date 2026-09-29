// node_modules/typebox/build/system/memory/metrics.mjs
var Metrics = {
  assign: 0,
  create: 0,
  clone: 0,
  discard: 0,
  update: 0
};

// node_modules/typebox/build/guard/guard.mjs
function IsArray(value) {
  return Array.isArray(value);
}
function IsBigInt(value) {
  return IsEqual(typeof value, "bigint");
}
function IsBoolean(value) {
  return IsEqual(typeof value, "boolean");
}
function IsNull(value) {
  return IsEqual(value, null);
}
function IsNumber(value) {
  return Number.isFinite(value);
}
function IsObject(value) {
  return IsEqual(typeof value, "object") && !IsNull(value);
}
function IsString(value) {
  return IsEqual(typeof value, "string");
}
function IsEqual(left, right) {
  return left === right;
}
function IsClassInstance(value) {
  if (!IsObject(value))
    return false;
  const proto = globalThis.Object.getPrototypeOf(value);
  if (IsNull(proto))
    return false;
  return IsEqual(typeof proto.constructor, "function") && !(IsEqual(proto.constructor, globalThis.Object) || IsEqual(proto.constructor.name, "Object"));
}
function IsUnsafePropertyKey(key) {
  return IsEqual(key, "__proto__") || IsEqual(key, "constructor") || IsEqual(key, "prototype");
}
function HasPropertyKey(value, key) {
  return IsUnsafePropertyKey(key) ? Object.prototype.hasOwnProperty.call(value, key) : (key in value);
}
function Keys(value) {
  return Object.getOwnPropertyNames(value);
}
function Symbols(value) {
  return Object.getOwnPropertySymbols(value);
}
// node_modules/typebox/build/guard/globals.mjs
function IsTypeArray(value) {
  return globalThis.ArrayBuffer.isView(value);
}
function IsRegExp(value) {
  return value instanceof globalThis.RegExp;
}
function IsSet(value) {
  return value instanceof globalThis.Set;
}
function IsMap(value) {
  return value instanceof globalThis.Map;
}
// node_modules/typebox/build/system/settings/settings.mjs
var settings = {
  immutableTypes: false,
  maxErrors: 8,
  maxParseErrors: 1,
  maxInstantiationCount: 128,
  useAcceleration: true,
  exactOptionalPropertyTypes: false,
  enumerableKind: false,
  correctiveParse: false,
  unionPrioritySort: true
};
function Get() {
  return settings;
}
// node_modules/typebox/build/system/memory/freeze.mjs
function Freeze(value) {
  return Get().immutableTypes ? Object.freeze(value) : value;
}
// node_modules/typebox/build/system/memory/clone.mjs
function FromClassInstance(value) {
  return value;
}
function IsSchemaObject(value) {
  return HasPropertyKey(value, "~kind") || HasPropertyKey(value, "~unsafe");
}
function FromSchemaObject(value) {
  const result = {};
  for (const key of Keys(value)) {
    if (IsUnsafePropertyKey(key))
      continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    descriptor.value = FromValue(descriptor.value);
    if (IsEqual(descriptor.enumerable, true)) {
      result[key] = descriptor.value;
    } else {
      Object.defineProperty(result, key, descriptor);
    }
  }
  return result;
}
function FromPlainObject(value) {
  const result = {};
  for (const key of Keys(value)) {
    if (IsUnsafePropertyKey(key))
      continue;
    result[key] = FromValue(value[key]);
  }
  for (const key of Symbols(value)) {
    result[key] = FromValue(value[key]);
  }
  return result;
}
function FromObject(value) {
  return IsClassInstance(value) ? FromClassInstance(value) : IsSchemaObject(value) ? FromSchemaObject(value) : FromPlainObject(value);
}
function FromArray(value) {
  return value.map((element) => FromValue(element));
}
function FromTypedArray(value) {
  return value.slice();
}
function FromRegExp(value) {
  return new RegExp(value.source, value.flags);
}
function FromMap(value) {
  return new Map(FromValue([...value.entries()]));
}
function FromSet(value) {
  return new Set(FromValue([...value.values()]));
}
function FromValue(value) {
  return IsTypeArray(value) ? FromTypedArray(value) : IsRegExp(value) ? FromRegExp(value) : IsMap(value) ? FromMap(value) : IsSet(value) ? FromSet(value) : IsArray(value) ? FromArray(value) : IsObject(value) ? FromObject(value) : value;
}
function Clone(value) {
  Metrics.clone += 1;
  return FromValue(value);
}
// node_modules/typebox/build/system/memory/create.mjs
function MergeHidden(left, right) {
  for (const key of Object.keys(right)) {
    Object.defineProperty(left, key, {
      configurable: true,
      writable: true,
      enumerable: false,
      value: right[key]
    });
  }
  return left;
}
function Merge(left, right) {
  return { ...left, ...right };
}
function Create(hidden, enumerable, options = {}) {
  Metrics.create += 1;
  const withOptions = Merge(enumerable, options);
  const withHidden = Get().enumerableKind ? Merge(withOptions, hidden) : MergeHidden(withOptions, hidden);
  return Freeze(withHidden);
}
// node_modules/typebox/build/system/memory/update.mjs
function Update(current, hidden, enumerable) {
  Metrics.update += 1;
  const settings = Get();
  const result = Clone(current);
  for (const key of Object.keys(hidden)) {
    Object.defineProperty(result, key, {
      configurable: true,
      writable: true,
      enumerable: settings.enumerableKind,
      value: hidden[key]
    });
  }
  for (const key of Object.keys(enumerable)) {
    Object.defineProperty(result, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: enumerable[key]
    });
  }
  return Freeze(result);
}
// node_modules/typebox/build/type/types/schema.mjs
function IsSchema(value) {
  return IsObject(value);
}

// node_modules/typebox/build/type/engine/optional/instantiate_add.mjs
function AddOptionalOperation(type) {
  return Update(type, { "~optional": true }, {});
}
function AddOptionalAction(type, options) {
  const result = Update(AddOptionalOperation(type), {}, options);
  return result;
}

// node_modules/typebox/build/type/types/array.mjs
function _Array_(items, options) {
  return Create({ "~kind": "Array" }, { type: "array", items }, options);
}

// node_modules/typebox/build/type/action/_add_optional.mjs
function AddOptional(type, options = {}) {
  return AddOptionalAction(type, options);
}

// node_modules/typebox/build/type/types/_optional.mjs
function Optional(type) {
  return AddOptional(type);
}
function IsOptional(value) {
  return IsSchema(value) && HasPropertyKey(value, "~optional");
}

// node_modules/typebox/build/type/types/properties.mjs
function RequiredArray(properties) {
  return Keys(properties).filter((key) => !IsOptional(properties[key]));
}

// node_modules/typebox/build/type/types/object.mjs
function _Object_(properties, options = {}) {
  const requiredKeys = RequiredArray(properties);
  const required = requiredKeys.length > 0 ? { required: requiredKeys } : {};
  return Create({ "~kind": "Object" }, { type: "object", ...required, properties }, options);
}
// node_modules/typebox/build/system/hashing/hash.mjs
var ByteMarker;
(function(ByteMarker) {
  ByteMarker[ByteMarker["Array"] = 0] = "Array";
  ByteMarker[ByteMarker["BigInt"] = 1] = "BigInt";
  ByteMarker[ByteMarker["Boolean"] = 2] = "Boolean";
  ByteMarker[ByteMarker["Date"] = 3] = "Date";
  ByteMarker[ByteMarker["Constructor"] = 4] = "Constructor";
  ByteMarker[ByteMarker["Function"] = 5] = "Function";
  ByteMarker[ByteMarker["Null"] = 6] = "Null";
  ByteMarker[ByteMarker["Number"] = 7] = "Number";
  ByteMarker[ByteMarker["Object"] = 8] = "Object";
  ByteMarker[ByteMarker["RegExp"] = 9] = "RegExp";
  ByteMarker[ByteMarker["String"] = 10] = "String";
  ByteMarker[ByteMarker["Symbol"] = 11] = "Symbol";
  ByteMarker[ByteMarker["TypeArray"] = 12] = "TypeArray";
  ByteMarker[ByteMarker["Undefined"] = 13] = "Undefined";
})(ByteMarker || (ByteMarker = {}));
var Accumulator = BigInt("14695981039346656037");
var [Prime, Size] = [BigInt("1099511628211"), BigInt("18446744073709551616")];
var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
var F64 = new Float64Array(1);
var F64In = new DataView(F64.buffer);
var F64Out = new Uint8Array(F64.buffer);
var encoder = new TextEncoder;
// node_modules/typebox/build/type/types/boolean.mjs
function Boolean2(options) {
  return Create({ "~kind": "Boolean" }, { type: "boolean" }, options);
}
// node_modules/typebox/build/type/types/integer.mjs
var IntegerPattern = "-?(?:0|[1-9][0-9]*)";
// node_modules/typebox/build/type/types/literal.mjs
class InvalidLiteralValue extends Error {
  constructor(value) {
    super(`Invalid Literal value`);
    Object.defineProperty(this, "cause", {
      value: { value },
      writable: false,
      configurable: false,
      enumerable: false
    });
  }
}
function LiteralTypeName(value) {
  return IsBigInt(value) ? "bigint" : IsBoolean(value) ? "boolean" : IsNumber(value) ? "number" : IsString(value) ? "string" : (() => {
    throw new InvalidLiteralValue(value);
  })();
}
function Literal(value, options) {
  return Create({ "~kind": "Literal" }, { type: LiteralTypeName(value), const: value }, options);
}
// node_modules/typebox/build/type/types/number.mjs
var NumberPattern = "-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?";
function Number2(options) {
  return Create({ "~kind": "Number" }, { type: "number" }, options);
}
// node_modules/typebox/build/type/types/string.mjs
var StringPattern = ".*";
function String2(options) {
  return Create({ "~kind": "String" }, { type: "string" }, options);
}

// node_modules/typebox/build/type/types/union.mjs
function Union(anyOf, options = {}) {
  return Create({ "~kind": "Union" }, { anyOf }, options);
}

// node_modules/typebox/build/type/types/record.mjs
var IntegerKey = `^${IntegerPattern}$`;
var NumberKey = `^${NumberPattern}$`;
var StringKey = `^${StringPattern}$`;
// node_modules/typebox/build/type/script/token/internal/char.mjs
function Range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, i) => String.fromCharCode(start + i));
}
var Alpha = [
  ...Range(97, 122),
  ...Range(65, 90)
];
var Zero = "0";
var NonZero = Range(49, 57);
var Digit = [Zero, ...NonZero];
var UnderScore = "_";
var DollarSign = "$";

// node_modules/typebox/build/type/script/token/unsigned_integer.mjs
var AllowedDigits = [...Digit, UnderScore];
// node_modules/typebox/build/type/script/token/ident.mjs
var Initial = [...Alpha, UnderScore, DollarSign];
var Remaining = [...Initial, ...Digit];
// node_modules/typebox/build/type/script/token/unsigned_number.mjs
var AllowedDigits2 = [...Digit, UnderScore];
// node_modules/typebox/build/type/engine/helpers/keys.mjs
var integerKeyPattern = new RegExp("^(?:0|[1-9][0-9]*)$");

// node_modules/typebox/build/type/engine/indexed/from_object.mjs
var NumericKeyPattern = new RegExp(IntegerKey);
// src/runner/graft-runner.ts
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
var DEFAULT_TIMEOUT_MS = 12000;
var MAX_OUTPUT_BYTES = 16 * 1024;
var activeBuilds = new Map;
function hasGraftDirectory(repoDir) {
  try {
    const graftPath = path.join(repoDir, "graft");
    const wiringPath = path.join(graftPath, ".graph", "wiring.json");
    return fs.existsSync(graftPath) && fs.existsSync(wiringPath);
  } catch {
    return false;
  }
}
function isBuildRunning(repoDir) {
  return activeBuilds.get(repoDir) === true;
}
async function execGraft(opts) {
  const { cwd = process.cwd(), timeoutMs = DEFAULT_TIMEOUT_MS, args } = opts;
  const start = Date.now();
  const { promise, resolve, reject } = Promise.withResolvers();
  const child = spawn("nice", ["-n", "10", "graft", ...args], {
    cwd,
    env: {
      ...process.env,
      GRAFT_NO_REFRESH: "1",
      DO_NOT_TRACK: "1"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let stdout = "";
  let stderr = "";
  let killed = false;
  const timer = setTimeout(() => {
    killed = true;
    child.kill("SIGTERM");
    setTimeout(() => {
      if (!child.killed)
        child.kill("SIGKILL");
    }, 1500);
    reject(new Error(`Graft command timed out after ${timeoutMs}ms (args: ${args.join(" ")})`));
  }, timeoutMs);
  child.stdout?.on("data", (chunk) => {
    if (stdout.length < MAX_OUTPUT_BYTES) {
      stdout += chunk.toString("utf8");
    }
  });
  child.stderr?.on("data", (chunk) => {
    if (stderr.length < 4096) {
      stderr += chunk.toString("utf8");
    }
  });
  child.on("error", (err) => {
    clearTimeout(timer);
    if (!killed)
      reject(err);
  });
  child.on("close", (code) => {
    clearTimeout(timer);
    if (!killed) {
      resolve({
        stdout: cleanAndClampOutput(stdout),
        stderr: stderr.trim(),
        exitCode: code ?? 0,
        durationMs: Date.now() - start
      });
    }
  });
  return promise;
}
function triggerBackgroundBuild(repoDir, deep = false) {
  if (activeBuilds.get(repoDir)) {
    return false;
  }
  activeBuilds.set(repoDir, true);
  const graftArgs = ["build"];
  if (deep)
    graftArgs.push("--deep");
  const child = spawn("nice", ["-n", "19", "graft", ...graftArgs], {
    cwd: repoDir,
    env: {
      ...process.env,
      DO_NOT_TRACK: "1"
    },
    detached: true,
    stdio: "ignore"
  });
  child.on("close", () => {
    activeBuilds.delete(repoDir);
  });
  child.on("error", () => {
    activeBuilds.delete(repoDir);
  });
  child.unref();
  return true;
}
function cleanAndClampOutput(text) {
  const lines = text.split(`
`);
  const filtered = [];
  let tokenSavingsNote = "";
  for (const l of lines) {
    if (l.startsWith("[graft] tokens saved")) {
      const match = l.match(/\[graft\] tokens saved ≈ ([\d,]+)(?:\s*\(([^)]+)\))?/);
      if (match) {
        const count = match[1];
        const pct = match[2] ? ` (${match[2]})` : "";
        tokenSavingsNote = `
[Saved ~${count} tokens${pct} vs raw file read]`;
      }
      continue;
    }
    if (l.startsWith("[graft] refreshed the graph"))
      continue;
    filtered.push(l);
  }
  if (filtered.length > 100) {
    const trimmed = filtered.slice(0, 100);
    trimmed.push(`
... (${filtered.length - 100} lines truncated for token efficiency. Refine search query or scope)`);
    if (tokenSavingsNote)
      trimmed.push(tokenSavingsNote);
    return trimmed.join(`
`).trim();
  }
  if (tokenSavingsNote) {
    filtered.push(tokenSavingsNote);
  }
  return filtered.join(`
`).trim();
}

// src/tools/graft-tools.ts
function registerGraftTools(pi) {
  pi.registerTool({
    name: "graft_ask",
    label: "Graft Ask",
    description: "Search symbols and definitions in the codebase using GraphRank ranking (IDF + in-degree coupling). Much faster and more accurate than grepping entire repo.",
    parameters: _Object_({
      query: String2({ description: "Question, task, or symbol keywords to find" }),
      in: Optional(String2({ description: "Optional path or directory scope to restrict results" }))
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found in this workspace. Run 'graft build' or use standard tools." }],
          isError: true
        };
      }
      const args = ["ask", params.query];
      if (params.in)
        args.push("--in", params.in);
      try {
        const res = await execGraft({ cwd, args, timeoutMs: 15000 });
        return {
          content: [{ type: "text", text: res.stdout || "No matching symbols found." }]
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_ask failed: ${msg}` }],
          isError: true
        };
      }
    }
  });
  pi.registerTool({
    name: "graft_skeleton",
    label: "Graft Skeleton",
    description: "Extract public API signatures and function definitions from a file without reading function bodies. Saves up to 90% context tokens.",
    parameters: _Object_({
      file: String2({ description: "Relative path or basename of file to inspect" })
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found. Use read tool with ranges." }],
          isError: true
        };
      }
      try {
        const res = await execGraft({ cwd, args: ["skeleton", params.file], timeoutMs: 1e4 });
        return {
          content: [{ type: "text", text: res.stdout || "Empty skeleton or file not indexed." }]
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_skeleton failed: ${msg}` }],
          isError: true
        };
      }
    }
  });
  pi.registerTool({
    name: "graft_callers",
    label: "Graft Callers",
    description: "Find who calls, references, imports, or extends a symbol (incoming edges), or what the symbol calls (outgoing edges).",
    parameters: _Object_({
      symbol: String2({ description: "Symbol or function name to trace" }),
      direction: Optional(String2({ description: "'in' (who calls this) or 'out' (what this calls). Default: 'in'" })),
      depth: Optional(Number2({ description: "Transitive depth level (e.g. 1, 2, 3). Default: 1" }))
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found in workspace." }],
          isError: true
        };
      }
      const args = ["callers", params.symbol];
      if (params.direction === "out")
        args.push("--direction", "out");
      if (params.depth && params.depth > 1)
        args.push("-d", String(params.depth));
      try {
        const res = await execGraft({ cwd, args, timeoutMs: 1e4 });
        return {
          content: [{ type: "text", text: res.stdout || `No edges found for '${params.symbol}'.` }]
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_callers failed: ${msg}` }],
          isError: true
        };
      }
    }
  });
  pi.registerTool({
    name: "graft_grep",
    label: "Graft Grep",
    description: "Search regex or fixed strings across AST-indexed source code files, grouped by enclosing symbol and ranked by coupling.",
    parameters: _Object_({
      pattern: String2({ description: "Regex pattern or fixed string to search" }),
      in: Optional(String2({ description: "Restrict search to files under this path prefix" })),
      fixed: Optional(Boolean2({ description: "Treat pattern as literal string instead of regex" })),
      caseSensitive: Optional(Boolean2({ description: "Case sensitive search. Default: false" }))
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found. Use native grep tool." }],
          isError: true
        };
      }
      const args = ["grep", params.pattern];
      if (params.in)
        args.push("--in", params.in);
      if (params.fixed)
        args.push("--fixed");
      if (!params.caseSensitive)
        args.push("-i");
      try {
        const res = await execGraft({ cwd, args, timeoutMs: 20000 });
        return {
          content: [{ type: "text", text: res.stdout || `No hits found for pattern '${params.pattern}'.` }]
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_grep failed: ${msg}` }],
          isError: true
        };
      }
    }
  });
  pi.registerTool({
    name: "graft_map",
    label: "Graft Map",
    description: "Token-budgeted overview of the codebase architecture: directory clusters, hubs, and global hotspots.",
    parameters: _Object_({
      maxDirs: Optional(Number2({ description: "Max directories to display. Default: 12" }))
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found in workspace." }],
          isError: true
        };
      }
      const args = ["map"];
      if (params.maxDirs)
        args.push("--max-dirs", String(params.maxDirs));
      try {
        const res = await execGraft({ cwd, args, timeoutMs: 1e4 });
        return {
          content: [{ type: "text", text: res.stdout || "Unable to generate repo map." }]
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_map failed: ${msg}` }],
          isError: true
        };
      }
    }
  });
  pi.registerTool({
    name: "graft_blast",
    label: "Graft Blast Radius",
    description: "Calculate blast radius of uncommitted changes or diff against origin/main. Shows all dependents and callers affected by edits.",
    parameters: _Object_({
      base: Optional(String2({ description: "Git base reference (e.g. 'origin/main', 'HEAD~1')" }))
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        return {
          content: [{ type: "text", text: "No graft/ graph found in workspace." }],
          isError: true
        };
      }
      const args = ["blast", "--no-owners"];
      if (params.base)
        args.push("--base", params.base);
      try {
        const res = await execGraft({ cwd, args, timeoutMs: 15000 });
        return {
          content: [{ type: "text", text: res.stdout || "No blast radius detected (no changes or no dependents)." }]
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `graft_blast failed: ${msg}` }],
          isError: true
        };
      }
    }
  });
}

// src/tools/super-tools.ts
import { spawn as spawn2 } from "node:child_process";
function registerSuperTools(pi) {
  pi.registerTool({
    name: "ast_edit",
    label: "AST-Aware Code Edit",
    description: "Perform AST-aware search and structural rewriting using native ast-grep. Match pattern ($VAR for metavariables) and rewrite into replacement. Safer than text replace.",
    parameters: _Object_({
      pattern: String2({ description: "AST pattern with metavariables (e.g. 'console.log($A)')" }),
      rewrite: Optional(String2({ description: "Replacement AST string (e.g. 'logger.info($A)'). Omit to only search." })),
      paths: Optional(_Array_(String2(), { description: "Target files or directories. Default: cwd" })),
      lang: Optional(String2({ description: "Language hint (e.g. 'ts', 'js', 'py', 'go', 'rs')" }))
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd || process.cwd();
      const args = ["run", "-p", params.pattern];
      if (params.rewrite) {
        args.push("-r", params.rewrite, "-U");
      }
      if (params.lang) {
        args.push("-l", params.lang);
      }
      if (params.paths && params.paths.length > 0) {
        args.push(...params.paths);
      } else {
        args.push(".");
      }
      const { promise, resolve } = Promise.withResolvers();
      const child = spawn2("ast-grep", args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      child.stdout?.on("data", (chunk) => {
        if (stdout.length < 16384)
          stdout += chunk.toString("utf8");
      });
      child.stderr?.on("data", (chunk) => {
        if (stderr.length < 4096)
          stderr += chunk.toString("utf8");
      });
      child.on("close", (code) => {
        const out = stdout.trim() || stderr.trim();
        if (code !== 0 && stderr) {
          resolve({
            content: [{ type: "text", text: `ast-grep failed (exit ${code}):
${stderr.trim()}` }],
            isError: true
          });
          return;
        }
        resolve({
          content: [
            {
              type: "text",
              text: params.rewrite ? `AST rewrite applied successfully:
${out || "Files modified in-place."}` : `AST match results:
${out || "No matches found."}`
            }
          ]
        });
      });
      child.on("error", (err) => {
        resolve({
          content: [{ type: "text", text: `Failed to execute ast-grep: ${err.message}` }],
          isError: true
        });
      });
      return promise;
    }
  });
  pi.registerTool({
    name: "eval",
    label: "Evaluate Scratchpad Code",
    description: "Execute throwaway Python or JavaScript/TypeScript code in an isolated subprocess to verify logic, compute numbers, or run smoke tests before editing files.",
    parameters: _Object_({
      language: Union([Literal("py"), Literal("js"), Literal("ts")], {
        description: "'py' for Python 3, 'js' / 'ts' for Bun runtime"
      }),
      code: String2({ description: "Code to execute" }),
      timeoutMs: Optional(Number2({ description: "Execution timeout in ms. Default: 10000" }))
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const cwd = ctx.cwd || process.cwd();
      const timeoutMs = params.timeoutMs || 1e4;
      const binary = params.language === "py" ? "python3" : "bun";
      const flag = binary === "python3" ? "-c" : "-e";
      const args = [flag, params.code];
      const { promise, resolve } = Promise.withResolvers();
      const child = spawn2(binary, args, {
        cwd,
        stdio: ["ignore", "pipe", "pipe"]
      });
      let stdout = "";
      let stderr = "";
      let killed = false;
      const timer = setTimeout(() => {
        killed = true;
        child.kill("SIGTERM");
        resolve({
          content: [{ type: "text", text: `eval timed out after ${timeoutMs}ms` }],
          isError: true
        });
      }, timeoutMs);
      child.stdout?.on("data", (chunk) => {
        if (stdout.length < 16384)
          stdout += chunk.toString("utf8");
      });
      child.stderr?.on("data", (chunk) => {
        if (stderr.length < 4096)
          stderr += chunk.toString("utf8");
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (killed)
          return;
        const out = stdout.trim();
        const err = stderr.trim();
        if (code !== 0) {
          resolve({
            content: [{ type: "text", text: `Process exited with code ${code}:
${err || out}` }],
            isError: true
          });
          return;
        }
        resolve({
          content: [{ type: "text", text: out || (err ? `(stderr): ${err}` : "(no output)") }]
        });
      });
      child.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          content: [{ type: "text", text: `Failed to spawn ${binary}: ${err.message}` }],
          isError: true
        });
      });
      return promise;
    }
  });
}

// src/hooks/graft-hooks.ts
var DEBOUNCE_SYNC_MS = 30000;
var syncTimers = new Map;
function setupGraftHooks(pi) {
  pi.on("session_start", async (_event, ctx) => {
    const cwd = ctx.cwd || process.cwd();
    if (hasGraftDirectory(cwd))
      return;
    if (ctx.agent && ctx.agent.kind !== "main")
      return;
    if (isBuildRunning(cwd))
      return;
    triggerBackgroundBuild(cwd, false);
  });
  pi.on("tool_result", async (event, ctx) => {
    const toolEvent = event;
    if (!toolEvent || toolEvent.isError)
      return;
    const mutatingTools = ["write", "edit", "apply_patch", "ast_edit"];
    if (!mutatingTools.includes(toolEvent.toolName))
      return;
    const cwd = ctx.cwd || process.cwd();
    if (!hasGraftDirectory(cwd))
      return;
    clearTimeout(syncTimers.get(cwd));
    syncTimers.set(cwd, setTimeout(() => {
      syncTimers.delete(cwd);
      if (!isBuildRunning(cwd))
        triggerBackgroundBuild(cwd, false);
    }, DEBOUNCE_SYNC_MS));
  });
}

// src/hooks/read-advisory.ts
import * as fs2 from "node:fs";
import * as path2 from "node:path";
var LARGE_FILE_BYTES = 20 * 1024;
var CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".kts",
  ".php",
  ".swift",
  ".rb",
  ".cs",
  ".scala",
  ".c",
  ".h",
  ".cc",
  ".cpp",
  ".hpp",
  ".r"
]);
var advisedFiles = new Set;
function setupReadAdvisory(pi) {
  pi.on("tool_call", async (event, ctx) => {
    const toolEvent = event;
    if (!toolEvent || toolEvent.toolName !== "read")
      return;
    const raw = toolEvent.input?.path;
    if (typeof raw !== "string" || /:(\d|raw|img|conflicts|range)/.test(raw.slice(raw.lastIndexOf(":"))))
      return;
    const cwd = ctx.cwd || process.cwd();
    if (!hasGraftDirectory(cwd))
      return;
    const ext = path2.extname(raw).toLowerCase();
    if (!CODE_EXTENSIONS.has(ext))
      return;
    const abs = path2.isAbsolute(raw) ? raw : path2.join(cwd, raw);
    const key = abs;
    if (advisedFiles.has(key))
      return;
    let size = 0;
    try {
      size = fs2.statSync(abs).size;
    } catch {
      return;
    }
    if (size < LARGE_FILE_BYTES)
      return;
    advisedFiles.add(key);
    return {
      additionalContext: `Large code file (${Math.round(size / 1024)} KB) read without a line range. ` + "For a cheaper orientation: use graft_skeleton to list its declarations, or graft_ask to locate the " + "relevant symbol, then re-read only the needed range (e.g. `path:120-260`)."
    };
  });
}

// src/commands/graft-commands.ts
function registerGraftCommands(pi) {
  pi.registerCommand("graft-build", {
    description: "Rebuild Graft AST context graph (Tier-1 deterministic $0)",
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd || process.cwd();
      if (isBuildRunning(cwd)) {
        ctx.ui?.notify("Graft build is already running in background", "warning");
        return;
      }
      ctx.ui?.notify("Rebuilding Graft context graph in background...", "info");
      if (!triggerBackgroundBuild(cwd, false)) {
        ctx.ui?.notify("Failed to start Graft build", "error");
      }
    }
  });
  pi.registerCommand("graft-check", {
    description: "Check freshness of Graft context graph against working tree",
    handler: async (_args, ctx) => {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        ctx.ui?.notify("No graft/ graph found in workspace.", "warning");
        return;
      }
      ctx.ui?.notify("Checking Graft graph freshness...", "info");
      try {
        const res = await execGraft({ cwd, args: ["check", "--json"], timeoutMs: 15000 });
        ctx.ui?.notify(`Graft freshness check:
${res.stdout}`, "info");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui?.notify(`graft-check error: ${msg}`, "error");
      }
    }
  });
  pi.registerCommand("graft-map", {
    description: "Display codebase architecture hotspots and hubs",
    handler: async (args, ctx) => {
      const cwd = ctx.cwd || process.cwd();
      if (!hasGraftDirectory(cwd)) {
        ctx.ui?.notify("No graft/ graph found in workspace.", "warning");
        return;
      }
      try {
        const cmdArgs = ["map"];
        if (args && args.trim().length > 0) {
          const num = parseInt(args.trim(), 10);
          if (!isNaN(num))
            cmdArgs.push("--max-dirs", String(num));
        }
        const res = await execGraft({ cwd, args: cmdArgs, timeoutMs: 15000 });
        ctx.ui?.notify(`Graft Map:
${res.stdout}`, "info");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx.ui?.notify(`graft-map error: ${msg}`, "error");
      }
    }
  });
}

// index.ts
function graftPlugin(pi) {
  registerGraftTools(pi);
  registerSuperTools(pi);
  setupGraftHooks(pi);
  setupReadAdvisory(pi);
  registerGraftCommands(pi);
}
export {
  graftPlugin as default
};
