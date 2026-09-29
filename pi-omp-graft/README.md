# pi-omp-graft

Graft context-graph integration for **OMP** (`omp`) and **Pi** (`pi`) coding agents.
Wires `graft`'s AST code graph into both harnesses as native tools, hooks, and a skill —
tuned to stay light: no synchronous re-index, no UI clutter, no token blowup.

## Install

```bash
omp plugin link /workspaces/pi-omp-graft   # OMP
pi install /workspaces/pi-omp-graft        # Pi
```

Requires the `graft` CLI on `PATH` (`npm i -g @nanonets/graft`).

## Tools

| Tool | Purpose |
|---|---|
| `graft_ask` | Ranked symbol lookup (GraphRank: IDF + in-degree coupling) |
| `graft_skeleton` | File API surface — signatures only, no bodies |
| `graft_callers` | In-edges (who calls this) / out-edges (`direction: "out"`), depth `N` |
| `graft_grep` | Regex/literal search grouped by enclosing symbol, ranked by coupling |
| `graft_map` | Directory clusters, hubs, hotspots |
| `graft_blast` | Blast radius of a diff (`--base` optional) |
| `ast_edit` | AST-aware search/rewrite via native `ast-grep` (metavariables `$A`, in-place `-U`) |
| `eval` | Throwaway code scratchpad: `py` (`python3 -c`) / `js` / `ts` (`bun -e`), 10 s default timeout |

## Commands

`/graft-build` · `/graft-check` · `/graft-map`

## Efficiency contract

- **No synchronous re-index.** Every query runs with `GRAFT_NO_REFRESH=1`; a query never
  pays the 50–120 s refresh a stale graph would trigger. Freshness is handled out-of-band.
- **Low-priority background sync.** Rebuilds spawn detached under `nice -n 19` and are
  debounced 30 s after the last mutating tool call, so a multi-edit turn rebuilds once.
- **Main session only.** Subagent sessions never trigger a build; they share the workspace.
- **Bounded output.** `stdout` is capped at 16 KB / 100 lines and stripped of graft's
  token-savings banners before it reaches the model. When graft reports savings, one compact
  line (`[Saved ~N tokens (P%) vs raw file read]`) is appended to the result instead.
- **Strict timeouts.** 10–20 s per query, `SIGTERM` then `SIGKILL`.

## Advisory hook

A passive `tool_call` hook watches full-file `read` calls on code files >20 KB. It returns
`additionalContext` (never blocks) suggesting `graft_skeleton` / `graft_ask` and a range
re-read. Each file is advised at most once per session, and only inside repos that have a
`graft/` graph.

## Scope of use

`graft` indexes **AST-parseable source only**. Markdown, JSON, YAML, env, and shell files are
not indexed — use native `grep`/`read` for those. The bundled skill encodes this split.