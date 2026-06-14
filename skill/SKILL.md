---
name: conclave
description: Make a hard, open-ended engineering/architecture/research decision the trustworthy way. Convenes a Claude Conclave — a Constitutional Tournament where diverse sequestered agents draft a frozen weighted objective, generate competing solutions, score them against EXECUTED checks (not rhetoric), and run a deterministic single-elimination tournament. Returns either ONE winner (when the win is grounded in real verification) or an honest Pareto shortlist with named assumptions (when it is not). Use when you would otherwise get high-variance, confidently-conflicting AI proposals you cannot arbitrate.
argument-hint: "<the decision to make, with constraints>"
user-invocable: true
disable-model-invocation: true
allowed-tools: Workflow, Read, Bash
---

# /conclave — convene a Claude Conclave for a trustworthy decision

The user wants the most defensible answer to an open-ended decision in `$ARGUMENTS`, free of the three pathologies of LLM decision-making: non-determinism (same prompt → different answers), authority-hallucination (confident justification of whichever path was sampled), and mono-model groupthink (one model's bias baked into the frame everyone then ratifies).

Like a papal conclave: diverse electors are **sequestered** (generate independently), vote in **rounds** (the tournament) under a fixed **constitution** (the frozen objective), and a verdict issues only on a **two-thirds supermajority** backed by evidence — otherwise deliberation continues (the system abstains to an honest shortlist) rather than forcing a false result.

## What to do

1. Take the decision text from `$ARGUMENTS`. If it is empty, ask the user for the decision and its hard constraints, then continue.

2. Call the **Workflow** tool to run the bundled engine:
   - `scriptPath`: the absolute path to `conclave.js` bundled beside this SKILL.md (e.g. `~/.claude/skills/conclave/conclave.js`).
   - `args`: `{ "problem": "<the full decision text from $ARGUMENTS>" }`
   - Optional tuning knobs the user may pass, all with safe defaults: `D` (drafters/electors, default 6), `N` (candidates, default 6), `tau_g` (grounded-margin bar for a single winner, default 0.6), `tau_n` (effective-independence bar, default 3), `eps` (near-tie band, default 0.04), `tiers` (default false). Pass them through in `args` if the user specified them.
   - **Model policy:** all agents run on **Opus** by default (strongest capability; cost is not a constraint here). Decorrelation is carried by the model-independent prompt axes (persona × first-principle × framing), not by model tier. Set `tiers: true` only to add a small tier-mixing (opus/sonnet/haiku) error-decorrelation hedge — useful when the decision leans heavily on unverifiable (estimate-only) criteria where no executed check can backstop a shared-model blind spot.

3. The workflow runs five phases (Constitution → Generate → Verify → Tournament → Verdict) fanning out many subagents. It returns `{ verdict_markdown, structured }`.

4. Present `verdict_markdown` to the user **verbatim** as the answer. Do NOT re-run the analysis, re-rank, or "improve" the winner — the whole point is that the verdict was produced by a frozen, replayable procedure, not by your in-context judgment. If you add anything, add only a one-line pointer to the grounding ratio and whether it returned SINGLE or PARETO.

## How to read the result (explain to the user if they ask)

- **SINGLE** = white smoke. The winning margin was backed by executed checks (or genuinely independent consensus). Trustworthy to act on, at the stated grounding %.
- **PARETO** = no supermajority. The conclave refused to fake a winner because the lead was noise, ungrounded, or rested on correlated (single-family) agreement. The shortlist is real; choosing among it needs a human to accept the listed assumptions. This is the system being honest, not failing.
- The **grounding ratio** is the trust dial: the fraction of the decision backed by something actually run vs. model estimate. Low grounding on a SINGLE verdict means "right by the frozen rules, but those rules leaned on estimates."
- The verdict is stamped with a constitution hash `[xxxxxxxx]`; same decision + same hash replays to the same ranking.

## Honest limit (state if relevant)

In a Claude-only environment only Claude-family models are reachable (tiers `opus`/`sonnet`/`haiku`; `fable`/`mythos` are NOT accepted by the workflow `agent()` resolver), so cross-model-family independence is unavailable; the engine measures the resulting correlation and discounts "agreement" accordingly. Trust flows from *executed verification*, which is model-agnostic — not from models agreeing. The one thing the system cannot self-certify is whether the frozen constitution is itself complete; it makes that foundation inspectable rather than hiding it.
