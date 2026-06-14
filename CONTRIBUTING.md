# Contributing to Claude Conclave

Thanks for considering a contribution. This project has an unusually strong design invariant, so please read the cardinal rule before opening a PR.

## The cardinal rule

> **No model's *opinion* may decide anything. Only executed artifacts or frozen rules may decide.**

The entire value of Claude Conclave is that it severs *persuasion* from the *verdict*. Any change that lets an LLM's free-form judgment crown a winner, break a tie, or alter the frozen objective mid-run defeats the purpose. Concretely:

- ✅ An LLM may **generate** criteria, candidates, and **nominate** critiques.
- ✅ An LLM may produce a **runnable artifact** (a test/check) whose execution result then decides.
- ❌ An LLM may **not** be the thing that picks the winner, scores without recording `EXECUTED` vs `ESTIMATED`, or edit the constitution after it is frozen.

If your feature needs the model to "just decide," it belongs behind the honest-abstention path, not in the gate.

## Architecture in one paragraph

`skill/SKILL.md` is the `/conclave` entrypoint loaded into Claude Code's main agent; it calls the **Workflow** tool pointing at `skill/conclave.js`. That file is the deterministic engine — plain JavaScript run by the Workflow runtime. Control flow (phases, tournament, gate, all the math) is pure JS so it is replayable; the probabilistic work is quarantined inside `agent()` calls whose outputs are either executed-and-verified or explicitly tagged as estimates.

## Hard constraints on `conclave.js`

The Workflow runtime enforces these — violating them gets the script rejected:

- **Plain JS only.** No TypeScript syntax (no type annotations, interfaces, generics).
- **No `Date.now()`, `Math.random()`, or argless `new Date()`** — they break deterministic replay. Vary by index/label instead.
- **Self-contained.** No `require`/`import`/`fs`/`__dirname`. Inline everything into the one script.
- **Model tiers:** only `opus` / `sonnet` / `haiku` are accepted by `agent()`'s resolver. `fable` / `mythos` are **rejected** (API 400). Default is uniform `opus`.
- Always `.filter(Boolean)` after `parallel()`/`pipeline()` — agents can return null.

## Dev loop

```bash
# 1. Syntax check (must pass before any PR)
node --check skill/conclave.js

# 2. Live smoke test inside Claude Code (small params to keep it cheap):
#    /conclave <some decision> using D=4, N=4
#    — confirm it runs all 5 phases and returns a verdict.
```

There is no unit-test harness yet (the engine only runs inside the Workflow runtime). A standalone test shim that stubs `agent()`/`parallel()` to exercise the pure-JS math (`aggregate`, `paretoFront`, `groundingRatio`, `commitmentNeff`, `cmpTb`, the gate) is a **wanted contribution** — see the roadmap.

## Submitting

1. Fork, branch (`feat/...` or `fix/...`).
2. Keep changes atomic — one logical change per PR.
3. Run `node --check` and a live smoke test; paste the verdict header in the PR description.
4. If you changed the gate, the constitution logic, or the model policy, explain in the PR how the cardinal rule still holds.

## Good first issues

- Standalone pure-JS test shim for the math + gate (no runtime needed).
- The roadmap items in the [README](README.md#roadmap).
- Improving a verifier-forge prompt so more criteria become `EXECUTED` rather than `ESTIMATED`.

## Code of conduct

Be kind, be rigorous, refute ideas not people. By participating you agree to uphold a respectful, harassment-free environment.
