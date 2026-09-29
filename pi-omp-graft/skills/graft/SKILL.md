---
name: graft
description: Mandatory high-efficiency code navigation using the local Graft context graph. Use graft_ask, graft_skeleton, graft_callers, and graft_grep before reading full files.
---

# Graft Code Navigation Rules

When working in a repository that has a `graft/` directory:

1. **Where is X / Locate Definitions**:
   - Use `graft_ask(query: "...")` to find exact symbol definitions, ranked by GraphRank (in-degree coupling + IDF).
   - NEVER start by guessing files or grepping blindly across the whole repository.

2. **File API Surface without Token Bloat**:
   - Use `graft_skeleton(file: "path/to/file.ts")` to view function/method signatures without bodies.
   - Do NOT use `read` on entire files just to see what functions or exports exist.

3. **Callers, Callees & Impact Analysis**:
   - Use `graft_callers(symbol: "functionName")` to trace incoming references before refactoring or renaming.
   - Use `graft_callers(symbol: "functionName", direction: "out")` to see what a function depends on.
   - Use `graft_blast` to inspect blast radius of modifications.

4. **When to use `graft_grep` vs Native `grep`**:
   - Use `graft_grep` for searching across indexed source code (TS, JS, Py, Go, Rust, Java, etc.) — hits are grouped by enclosing symbol with coupling rank.
   - Use native `grep` for markdown documents, JSON/YAML configs, environment files, shell scripts, or text files that Tree-sitter does not index into symbols.

5. **Reading Source Code**:
   - Once `graft_ask` or `graft_skeleton` gives you the exact `file:L<start>-L<end>`, use `read` only for that specific line range.
