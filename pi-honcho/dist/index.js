// ../../../../../npm/node_modules/typebox/build/system/memory/metrics.mjs
var Metrics = {
  assign: 0,
  create: 0,
  clone: 0,
  discard: 0,
  update: 0
};

// ../../../../../npm/node_modules/typebox/build/guard/guard.mjs
function IsArray(value) {
  return Array.isArray(value);
}
function IsNull(value) {
  return IsEqual(value, null);
}
function IsObject(value) {
  return IsEqual(typeof value, "object") && !IsNull(value);
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
// ../../../../../npm/node_modules/typebox/build/guard/globals.mjs
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
// ../../../../../npm/node_modules/typebox/build/system/settings/settings.mjs
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
// ../../../../../npm/node_modules/typebox/build/system/memory/freeze.mjs
function Freeze(value) {
  return Get().immutableTypes ? Object.freeze(value) : value;
}
// ../../../../../npm/node_modules/typebox/build/system/memory/clone.mjs
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
// ../../../../../npm/node_modules/typebox/build/system/memory/create.mjs
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
// ../../../../../npm/node_modules/typebox/build/system/memory/update.mjs
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
// ../../../../../npm/node_modules/typebox/build/type/types/schema.mjs
function IsSchema(value) {
  return IsObject(value);
}

// ../../../../../npm/node_modules/typebox/build/type/engine/optional/instantiate_add.mjs
function AddOptionalOperation(type) {
  return Update(type, { "~optional": true }, {});
}
function AddOptionalAction(type, options) {
  const result = Update(AddOptionalOperation(type), {}, options);
  return result;
}

// ../../../../../npm/node_modules/typebox/build/type/action/_add_optional.mjs
function AddOptional(type, options = {}) {
  return AddOptionalAction(type, options);
}

// ../../../../../npm/node_modules/typebox/build/type/types/_optional.mjs
function Optional(type) {
  return AddOptional(type);
}
function IsOptional(value) {
  return IsSchema(value) && HasPropertyKey(value, "~optional");
}

// ../../../../../npm/node_modules/typebox/build/type/types/properties.mjs
function RequiredArray(properties) {
  return Keys(properties).filter((key) => !IsOptional(properties[key]));
}

// ../../../../../npm/node_modules/typebox/build/type/types/object.mjs
function _Object_(properties, options = {}) {
  const requiredKeys = RequiredArray(properties);
  const required = requiredKeys.length > 0 ? { required: requiredKeys } : {};
  return Create({ "~kind": "Object" }, { type: "object", ...required, properties }, options);
}
// ../../../../../npm/node_modules/typebox/build/system/hashing/hash.mjs
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
// ../../../../../npm/node_modules/typebox/build/type/types/integer.mjs
var IntegerPattern = "-?(?:0|[1-9][0-9]*)";
// ../../../../../npm/node_modules/typebox/build/type/types/number.mjs
var NumberPattern = "-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?";
function Number2(options) {
  return Create({ "~kind": "Number" }, { type: "number" }, options);
}
// ../../../../../npm/node_modules/typebox/build/type/types/string.mjs
var StringPattern = ".*";
function String2(options) {
  return Create({ "~kind": "String" }, { type: "string" }, options);
}

// ../../../../../npm/node_modules/typebox/build/type/types/record.mjs
var IntegerKey = `^${IntegerPattern}$`;
var NumberKey = `^${NumberPattern}$`;
var StringKey = `^${StringPattern}$`;
// ../../../../../npm/node_modules/typebox/build/type/script/token/internal/char.mjs
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

// ../../../../../npm/node_modules/typebox/build/type/script/token/unsigned_integer.mjs
var AllowedDigits = [...Digit, UnderScore];
// ../../../../../npm/node_modules/typebox/build/type/script/token/ident.mjs
var Initial = [...Alpha, UnderScore, DollarSign];
var Remaining = [...Initial, ...Digit];
// ../../../../../npm/node_modules/typebox/build/type/script/token/unsigned_number.mjs
var AllowedDigits2 = [...Digit, UnderScore];
// ../../../../../npm/node_modules/typebox/build/type/engine/helpers/keys.mjs
var integerKeyPattern = new RegExp("^(?:0|[1-9][0-9]*)$");

// ../../../../../npm/node_modules/typebox/build/type/engine/indexed/from_object.mjs
var NumericKeyPattern = new RegExp(IntegerKey);
// src/remote/env-config.ts
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
async function parseEnvFile(path) {
  try {
    const raw = await readFile(path, "utf8");
    const parsed = {};
    for (const rawLine of raw.split(`
`)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#"))
        continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx === -1)
        continue;
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if (val.startsWith('"') && val.endsWith('"') || val.startsWith("'") && val.endsWith("'")) {
        val = val.slice(1, -1);
      }
      parsed[key] = val;
    }
    return parsed;
  } catch {
    return {};
  }
}
async function loadHonchoEnv(cwd) {
  const fileEnv = {};
  Object.assign(fileEnv, await parseEnvFile(join(homedir(), ".honcho", ".env")));
  Object.assign(fileEnv, await parseEnvFile(join(homedir(), ".pi", "agent", ".env")));
  Object.assign(fileEnv, await parseEnvFile(join(homedir(), ".omp", "agent", ".env")));
  if (cwd) {
    Object.assign(fileEnv, await parseEnvFile(join(cwd, ".env")));
  }
  try {
    const configJsonRaw = await readFile(join(homedir(), ".honcho", "config.json"), "utf8");
    const json = JSON.parse(configJsonRaw);
    if (!fileEnv.HONCHO_BASE_URL && (json.environmentUrl || json.hosts?.["pi-honcho"]?.environmentUrl)) {
      fileEnv.HONCHO_BASE_URL = json.environmentUrl || json.hosts?.["pi-honcho"]?.environmentUrl;
    }
    if (!fileEnv.HONCHO_API_KEY && (json.apiKey || json.hosts?.["pi-honcho"]?.apiKey)) {
      fileEnv.HONCHO_API_KEY = json.apiKey || json.hosts?.["pi-honcho"]?.apiKey;
    }
    if (!fileEnv.HONCHO_WORKSPACE_ID && (json.workspaceId || json.hosts?.["pi-honcho"]?.workspaceId)) {
      fileEnv.HONCHO_WORKSPACE_ID = json.workspaceId || json.hosts?.["pi-honcho"]?.workspaceId;
    }
  } catch {}
  const baseUrl = (process.env.HONCHO_BASE_URL || fileEnv.HONCHO_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
  const apiKey = (process.env.HONCHO_API_KEY || fileEnv.HONCHO_API_KEY || "").trim();
  const workspaceId = (process.env.HONCHO_WORKSPACE_ID || fileEnv.HONCHO_WORKSPACE_ID || "pi-memory").trim();
  const userPeer = (process.env.HONCHO_USER_PEER || fileEnv.HONCHO_USER_PEER || "user").trim();
  const aiPeer = (process.env.HONCHO_AI_PEER || fileEnv.HONCHO_AI_PEER || "pi").trim();
  const sharedPeers = Array.from(new Set((process.env.HONCHO_SHARED_PEERS || fileEnv.HONCHO_SHARED_PEERS || "").split(",").map((p) => p.trim()).filter(Boolean)));
  if (!apiKey) {
    return null;
  }
  return {
    baseUrl,
    apiKey,
    workspaceId,
    userPeer,
    aiPeer,
    sharedPeers
  };
}

// src/remote/direct-client.ts
import { createHash } from "node:crypto";

class DirectHonchoClient {
  config;
  sessionId;
  constructor(config, cwd) {
    this.config = config;
    const hash = createHash("sha256").update(cwd).digest("hex").slice(0, 16);
    this.sessionId = `session-${hash}`;
  }
  async fetchHoncho(path, options = {}) {
    const url = `${this.config.baseUrl}${path}`;
    const headers = {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      ...options.headers || {}
    };
    const attempts = 4;
    let lastError;
    for (let attempt = 0;attempt < attempts; attempt++) {
      try {
        return await fetch(url, {
          ...options,
          headers,
          signal: options.signal ?? AbortSignal.timeout(20000)
        });
      } catch (err) {
        lastError = err;
        if (options.signal?.aborted)
          break;
        const backoff = 400 * 2 ** attempt + Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
  async mapLimit(items, limit, task) {
    const results = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await task(items[index]);
      }
    });
    await Promise.all(workers);
    return results;
  }
  async checkConnection() {
    try {
      const res = await this.fetchHoncho("/health");
      return res.ok;
    } catch {
      return false;
    }
  }
  async ensureSession() {
    try {
      await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          id: this.sessionId
        })
      });
      await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/peers`, {
        method: "POST",
        body: JSON.stringify({
          peer_id: this.config.userPeer
        })
      });
      await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/peers`, {
        method: "POST",
        body: JSON.stringify({
          peer_id: this.config.aiPeer
        })
      });
    } catch {}
  }
  readScopes() {
    const { userPeer, aiPeer, sharedPeers } = this.config;
    const scopes = [];
    const push = (observer, observed) => {
      if (!observer || !observed)
        return;
      if (scopes.some((s) => s.observer === observer && s.observed === observed))
        return;
      scopes.push({ observer, observed });
    };
    for (const observer of [aiPeer, ...sharedPeers]) {
      push(observer, userPeer);
      push(observer, observer);
    }
    return scopes;
  }
  async queryScope(scope, query, limit) {
    const res = await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/conclusions/query`, {
      method: "POST",
      body: JSON.stringify({
        query,
        top_k: limit,
        filters: {
          observer: scope.observer,
          observed: scope.observed
        }
      })
    });
    if (!res.ok)
      return [];
    const data = await res.json();
    if (!Array.isArray(data))
      return [];
    return data.map((c) => c.content).filter((content) => Boolean(content));
  }
  async search(query, limit = 5) {
    try {
      const scopes = this.readScopes();
      const perScope = Math.max(2, Math.ceil(limit / Math.max(1, scopes.length)) + 1);
      const results = await this.mapLimit(scopes, 3, async (scope) => ({
        scope,
        contents: await this.queryScope(scope, query, perScope)
      }));
      const items = [];
      const seen = new Set;
      for (const { scope, contents } of results) {
        for (const content of contents) {
          const key = content.trim();
          if (!key || seen.has(key))
            continue;
          seen.add(key);
          const label = scope.observer === this.config.aiPeer ? scope.observed === this.config.aiPeer ? "[Fact:self]" : "[Fact]" : `[Fact:${scope.observer}]`;
          items.push(`${label} ${content}`);
        }
      }
      const messagePeers = [this.config.userPeer, this.config.aiPeer].filter((peer, index, all) => peer && all.indexOf(peer) === index);
      const messageResults = await this.mapLimit(messagePeers, 2, async (peer) => {
        const searchRes = await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/peers/${peer}/search`, {
          method: "POST",
          body: JSON.stringify({
            query,
            limit
          })
        });
        if (!searchRes.ok)
          return [];
        const messages = await searchRes.json();
        const list = Array.isArray(messages) ? messages : messages.items || [];
        return list.slice(0, limit).map((m) => `[${m.peer_id || peer}] ${m.content}`);
      });
      const seenMessages = new Set;
      for (const line of messageResults.flat()) {
        const body = line.slice(line.indexOf("] ") + 2);
        if (!body || seenMessages.has(body))
          continue;
        seenMessages.add(body);
        items.push(line);
      }
      return items;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return [`Honcho search error: ${msg}`];
    }
  }
  async chat(query) {
    try {
      const res = await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/chat`, {
        method: "POST",
        body: JSON.stringify({
          query
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        return `Honcho chat error (${res.status}): ${errText}`;
      }
      const data = await res.json();
      return data.content || "No relevant memory.";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `Honcho chat error: ${msg}`;
    }
  }
  async remember(content) {
    try {
      await this.ensureSession();
      const res = await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/conclusions`, {
        method: "POST",
        body: JSON.stringify({
          conclusions: [
            {
              content,
              observer_id: this.config.aiPeer,
              observed_id: this.config.userPeer,
              session_id: this.sessionId
            }
          ]
        })
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Failed to save conclusion (${res.status}): ${errText}`);
      }
      const data = await res.json();
      const id = data?.[0]?.id || "saved";
      return id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Honcho remember error: ${msg}`);
    }
  }
  async saveMessage(role, content) {
    try {
      await this.ensureSession();
      const peerId = role === "user" ? this.config.userPeer : this.config.aiPeer;
      await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/sessions/${this.sessionId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          messages: [
            {
              content: content.slice(0, 8000),
              peer_id: peerId
            }
          ]
        })
      });
    } catch {}
  }
  async getContext() {
    try {
      const res = await this.fetchHoncho(`/v3/workspaces/${this.config.workspaceId}/peers/${this.config.userPeer}/context`);
      if (!res.ok)
        return "";
      const data = await res.json();
      const lines = [];
      if (Array.isArray(data.peer_card) && data.peer_card.length > 0) {
        lines.push("### User Profile:");
        for (const card of data.peer_card.slice(0, 10)) {
          lines.push(`- ${card}`);
        }
      }
      if (data.representation) {
        lines.push(`
### User Insights:`);
        const repLines = data.representation.split(`
`).filter((l) => l.trim().length > 0);
        for (const l of repLines.slice(0, 8)) {
          lines.push(l);
        }
      }
      return lines.join(`
`);
    } catch {
      return "";
    }
  }
}

// src/index.ts
function honchoPlugin(pi) {
  let client = null;
  let cachedEnvConfig = null;
  let activeCwd = process.cwd();
  async function getClient(cwd) {
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
  pi.registerTool({
    name: "honcho_remember",
    label: "Honcho Remember",
    description: "Save a durable preference, decision, constraint, or fact into persistent Honcho memory.",
    parameters: _Object_({
      content: String2({
        description: "The fact, preference, or architectural decision to record",
        minLength: 1
      })
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        return {
          content: [
            {
              type: "text",
              text: "Honcho is not configured. Set HONCHO_BASE_URL and HONCHO_API_KEY in ~/.pi/agent/.env or ~/.honcho/.env"
            }
          ],
          isError: true
        };
      }
      try {
        const conclusionId = await activeClient.remember(params.content);
        return {
          content: [
            {
              type: "text",
              text: `Saved to Honcho memory [ID: ${conclusionId}]: "${params.content}"`
            }
          ]
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Failed to save memory: ${msg}` }],
          isError: true
        };
      }
    }
  });
  pi.registerTool({
    name: "honcho_search",
    label: "Honcho Search",
    description: "Search persistent Honcho memory for stored user preferences, project conventions, and past conclusions.",
    parameters: _Object_({
      query: String2({
        description: "Keywords or semantic query to look up in Honcho memory",
        minLength: 1
      }),
      limit: Optional(Number2({
        description: "Max results to return (default 5)"
      }))
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        return {
          content: [
            {
              type: "text",
              text: "Honcho is not configured. Set HONCHO_BASE_URL and HONCHO_API_KEY in ~/.pi/agent/.env or ~/.honcho/.env"
            }
          ],
          isError: true
        };
      }
      const results = await activeClient.search(params.query, params.limit || 5);
      return {
        content: [
          {
            type: "text",
            text: results.length > 0 ? `Honcho Search Results for "${params.query}":

` + results.join(`

`) : `No relevant memories found for "${params.query}".`
          }
        ]
      };
    }
  });
  pi.registerTool({
    name: "honcho_chat",
    label: "Honcho Chat",
    description: "Query Honcho's dialectic AI synthesizer directly about workspace memory, user identity, or historical context.",
    parameters: _Object_({
      query: String2({
        description: "Question to ask Honcho memory synthesizer",
        minLength: 1
      })
    }),
    async execute(_id, params, _signal, _onUpdate, ctx) {
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        return {
          content: [
            {
              type: "text",
              text: "Honcho is not configured. Set HONCHO_BASE_URL and HONCHO_API_KEY in ~/.pi/agent/.env or ~/.honcho/.env"
            }
          ],
          isError: true
        };
      }
      const reply = await activeClient.chat(params.query);
      return {
        content: [
          {
            type: "text",
            text: reply
          }
        ]
      };
    }
  });
  pi.registerTool({
    name: "honcho_context",
    label: "Honcho Context",
    description: "Retrieve the full user card, identity profile, and active insights from Honcho memory.",
    parameters: _Object_({}),
    async execute(_id, _params, _signal, _onUpdate, ctx) {
      const activeClient = await getClient(ctx?.cwd);
      if (!activeClient) {
        return {
          content: [
            {
              type: "text",
              text: "Honcho is not configured. Set HONCHO_BASE_URL and HONCHO_API_KEY in ~/.pi/agent/.env or ~/.honcho/.env"
            }
          ],
          isError: true
        };
      }
      const context = await activeClient.getContext();
      return {
        content: [
          {
            type: "text",
            text: context || "No peer profile card found in Honcho workspace."
          }
        ]
      };
    }
  });
  pi.registerCommand("honcho-status", {
    description: "Check Honcho memory connection and configuration",
    handler: async (_args, ctx) => {
      const activeClient = await getClient(ctx?.cwd);
      const isConnected = activeClient ? await activeClient.checkConnection() : false;
      const statusText = [
        "=== Honcho Memory Status ===",
        `Configured: ${cachedEnvConfig ? "Yes (via .env)" : "No"}`,
        `Base URL: ${cachedEnvConfig?.baseUrl || "Not set"}`,
        `Workspace: ${cachedEnvConfig?.workspaceId || "Not set"}`,
        `User Peer: ${cachedEnvConfig?.userPeer || "user"}`,
        `AI Peer: ${cachedEnvConfig?.aiPeer || "pi"}`,
        `Shared Peers: ${(cachedEnvConfig?.sharedPeers || []).join(", ") || "(none)"}`,
        `Server Health: ${isConnected ? "Online (OK)" : "Offline / Unreachable"}`
      ].join(`
`);
      if (ctx?.ui?.notify) {
        ctx.ui.notify(statusText, isConnected ? "info" : "warning");
      } else {
        console.log(statusText);
      }
    }
  });
  pi.registerCommand("honcho-remember", {
    description: "Quickly save a fact or preference to Honcho memory",
    handler: async (args, ctx) => {
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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        ctx?.ui?.notify?.(`Failed to remember: ${msg}`, "error");
      }
    }
  });
  let contextInjected = false;
  pi.on("before_agent_start", async (_event, ctx) => {
    if (contextInjected)
      return;
    const activeClient = await getClient(ctx?.cwd);
    if (!activeClient)
      return;
    try {
      const context = await activeClient.getContext();
      if (context && context.trim().length > 0) {
        contextInjected = true;
        return {
          additionalContext: `[Honcho Persistent Memory Context]
${context}
[End Honcho Context]`
        };
      }
    } catch {}
  });
  let lastPrompt = "";
  pi.on("before_agent_start", (event) => {
    const e = event;
    if (e?.prompt)
      lastPrompt = e.prompt;
  });
  pi.on("agent_settled", async (_event, ctx) => {
    const prompt = lastPrompt;
    lastPrompt = "";
    if (!prompt)
      return;
    const activeClient = await getClient(ctx?.cwd);
    if (!activeClient)
      return;
    activeClient.saveMessage("user", prompt).catch(() => {});
  });
}
export {
  honchoPlugin as default
};
