<div align="center">

# 🕊️ Claude Conclave

### Make AI give you *one* trustworthy decision — or admit it can't.

**A Claude Code skill that convenes a "Constitutional Tournament" of sequestered agents to arbitrate hard, open-ended engineering decisions — and grounds the verdict in *executed verification*, not confident prose.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Claude Code Skill](https://img.shields.io/badge/Claude%20Code-Skill-8A2BE2)](https://docs.claude.com/en/docs/claude-code)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Status](https://img.shields.io/badge/status-research%20preview-orange.svg)](#status--honest-limitations)

</div>

---

## The problem

Ask an LLM the same architecture question three times and you get three different, **mutually exclusive** answers — each defended with flawless, authoritative, mathematically-plausible reasoning. The model never says "I'm not sure." It samples a path and then justifies it to the hilt. Worse, when one model seeds the constraints, every downstream agent confidently agrees with its baked-in bias.

This is **probabilistic variance + persuasive inconsistency**, and it has three faces:

| Symptom | What you see |
| --- | --- |
| **Non-determinism** | Same prompt, system state → entirely different paradigms across runs. |
| **Authority-hallucination** | Not uncertainty — a *flawless, convincing* justification for whichever path was randomly sampled. |
| **Mono-model groupthink** | One model's latent bias becomes the foundation; downstream agents confidently ratify a flawed premise. |

They all reduce to **one root cause**: open-ended design has *no objective ground-truth function*, so the model substitutes a proxy — its own fluent self-certainty — and reports it as if it were truth.

## The idea

> **Stop trying to make the *model* deterministic or trustworthy. Make the *decision procedure around it* deterministic, and let executed verification — not model confidence — decide. When verification can't decide, refuse to fake a winner.**

Claude Conclave borrows the one human institution built to extract a single trusted decision from a roomful of biased, fallible voters: the **conclave**.

| Conclave | Claude Conclave |
| --- | --- |
| Diverse electors, **sequestered** so they can't sway each other | N agents generate criteria & candidates **independently** (no shared context, authorship stripped) |
| A fixed **constitution** governs the vote | A **frozen, hashed weighted objective** — no agent may edit it mid-run |
| Voting in **rounds** | Deterministic **single-elimination tournament** |
| **Two-thirds supermajority** required (literally `S = 2/3` here) | A criterion enters the objective only on a **2/3 supermajority** of electors |
| No supermajority → **keep deliberating**, don't force a result | No grounded majority → **abstain** to an honest Pareto shortlist |
| White smoke = one verdict | `SINGLE` verdict = one winner, with its grounding stated |

The result you can trust **100% on procedure** (same input + same frozen constitution always replays to the same ranking, every elimination traceable to a runnable check) — and a **measured "grounding dial"** that tells you exactly how much of that verdict is backed by *executed reality* versus model estimate, and **abstains** rather than over-claim when the dial is low.

---

## How it works

Five phases. The LLM is demoted from *decider* to *hypothesis generator*; the deciding is done by frozen math + executed checks.

```
  ┌─ 0. CONSTITUTION ──────────────────────────────────────────────┐
  │  D diverse electors draft criteria independently               │
  │  → cluster by meaning → keep only 2/3-supermajority criteria    │
  │  → FORGE a runnable check per criterion (with negative control) │
  │  → freeze weighted objective + SHA, never edited again          │
  └────────────────────────────────────────────────────────────────┘
  ┌─ 1. GENERATE ──────────────────────────────────────────────────┐
  │  N candidate solutions across decorrelated persona×principle×   │
  │  framing axes; provenance stripped, live tallies hidden         │
  └────────────────────────────────────────────────────────────────┘
  ┌─ 2. VERIFY ────────────────────────────────────────────────────┐
  │  Score each candidate per criterion. Where a check is runnable, │
  │  AGENTS ACTUALLY RUN CODE and record EXECUTED vs ESTIMATED.     │
  │  Unverifiable criteria → weight 0 (describe, never decide).     │
  └────────────────────────────────────────────────────────────────┘
  ┌─ 3. TOURNAMENT ────────────────────────────────────────────────┐
  │  Deterministic single-elimination. A match is a pure score      │
  │  comparison; only in an ε-near-tie may an agent break it — and  │
  │  ONLY with an executed, criterion-citing artifact, not rhetoric.│
  └────────────────────────────────────────────────────────────────┘
  ┌─ 4. VERDICT ───────────────────────────────────────────────────┐
  │  Pure-JS honesty gate computes grounding ratio + effective      │
  │  independence (n_eff). Emits SINGLE winner iff grounded —       │
  │  else an honest, ranked PARETO shortlist + named assumptions.   │
  └────────────────────────────────────────────────────────────────┘
```

### Where trust actually comes from

- **Semantic ground-truth (the only thing allowed to decide):** external verifiers run in phase 2 — a test's PASS/FAIL, a benchmark's measured number, a static-analysis result. These are deterministic functions of the artifact, independent of any model's prose.
- **Procedural determinism:** the frozen, hashed constitution + the fixed gate remove the degrees of freedom a model would use to rationalize.
- **Categorically barred from deciding:** LLM consensus, debate convergence, self-certainty, verbalized confidence. Each is correlated error or uncalibrated confidence.

### The grounding dial & honest abstention

Every verdict reports a **grounding ratio** ∈ [0,1] — the fraction of the *winning margin* backed by an executed check vs. a model estimate — and an **effective-independence** number `n_eff` (are your N candidates really N opinions, or one opinion wearing N hats?).

The conclave returns a **single winner only if**:

```
not a near-tie (Δscore > ε)
AND ( grounded_margin ≥ τ_g     # the win is backed by real execution
      OR (n_eff ≥ τ_n AND families ≥ 2) )   # OR genuinely independent consensus
```

Otherwise it **abstains** and hands you a ranked Pareto shortlist with the exact assumptions you'd need to accept to choose. That refusal is the feature: *a system that honestly says "I can't ground this" is strictly better than one that confidently hands you the wrong answer.*

---

## Install

> Requires [Claude Code](https://docs.claude.com/en/docs/claude-code) with the **Workflow** tool available (the deterministic multi-agent orchestration runtime). The engine is plain JavaScript executed by that runtime — no `npm install`, no dependencies.

```bash
git clone https://github.com/adithyan-ak/claude-conclave.git
# Install as a user-level skill:
mkdir -p ~/.claude/skills/conclave
cp claude-conclave/skill/SKILL.md     ~/.claude/skills/conclave/
cp claude-conclave/skill/conclave.js  ~/.claude/skills/conclave/
```

Then in Claude Code:

```
/conclave <your decision, with its hard constraints>
```

That's it. `/conclave` is user-invocable only (it won't auto-trigger mid-conversation).

---

## Usage

```
/conclave For a service ingesting ~5k webhook events/sec with bursty spikes,
choose the queueing/backpressure approach: Kafka, Redis Streams, a managed
queue (SQS/PubSub), or something else. Optimize for operational simplicity,
cost, and not losing events under burst.
```

**Tuning knobs** (optional, safe defaults):

| Arg | Default | Meaning |
| --- | --- | --- |
| `D` | 6 | electors who draft the constitution |
| `N` | 6 | candidate solutions generated |
| `tau_g` | 0.6 | grounded-margin bar to crown a single winner |
| `tau_n` | 3 | effective-independence bar for a consensus claim |
| `eps` | 0.04 | near-tie band on the aggregate score |
| `tiers` | false | mix opus/sonnet/haiku for extra error-decorrelation (else uniform Opus) |

Pass them in the skill invocation, e.g. *"…use D=8, N=8, tiers=true."*

---

## Test runs (real, reproducible)

Two live runs are included verbatim in [`docs/examples/`](docs/examples). Both were executed by the engine in this repo; nothing is mocked.

### 1. The blind test — a problem with a known-correct answer ([full transcript](docs/examples/01-streaming-variance.md))

We handed the conclave a streaming-statistics problem whose *optimal* answer (Welford's online algorithm) and *seductive-but-wrong* answer (naive sum-of-squares, which suffers catastrophic cancellation on a large baseline) were **never named in the input** — only constraints. The author sealed a prediction beforehand.

**What happened:** the conclave forged a numerical-accuracy criterion, **wrote Python that computed exact ground-truth variance via rational arithmetic, and ran every candidate against it**:

```
naive sum-of-squares :  relerr 1.5e0   → FAIL (variance even went NEGATIVE: -26850)
Welford              :  relerr 3.3e-11 → PASS
shifted/assumed-mean :  relerr 3.5e-14 → PASS
```

It converged on **Welford** (5 of 6 surviving candidates) with shifted-mean as the legitimate runner-up — exactly the sealed prediction — and **proved the popular wrong answer wrong by executing code**, not by arguing. Grounding ratio: **100%**.

> It returned `PARETO` rather than crowning one Welford variant, because *all* survivors passed *all* executed checks — there was no grounded margin between equally-correct answers. Honest, if conservative. (See [issue #1](docs/examples/01-streaming-variance.md#the-finding) — the gate should treat "executed elimination of all distinct rivals" as a SINGLE condition.)

### 2. A genuinely contested decision ([full transcript](docs/examples/02-webhook-queue.md))

The Kafka-vs-Redis-vs-SQS webhook problem above. The conclave forged fault-injection and load-saturation checks (and ran in-process simulations of each: *"leader-only-ack run lost 36000 acked writes while durable run lost 0"*), but the candidates **tied on the executed durability/burst checks and differed only on *estimated* cost/ops dimensions**. So it correctly returned `PARETO` — grounded margin 0%, `n_eff` 1.38 — with a ranked shortlist and the named cost/ops assumptions you'd have to accept to pick. **It refused to fake a winner.**

---

## Why not just… ?

| Approach | Why it doesn't solve this |
| --- | --- |
| **Lower the temperature** | Controls diversity, not correctness; semantic variance lives in the distribution, not the sampler. |
| **Self-consistency / majority vote** | Assumes one extractable correct answer. Open-ended design has none — and a confident wrong mode just wins the vote. |
| **Ask 5 models, take the majority** | Same-lineage models share blind spots; you get one opinion wearing five hats (the `n_eff` problem). |
| **Multi-agent debate** | Debate is a belief-martingale: it converges to *consensus*, not *truth*, and rewards persuasiveness. |
| **LLM-as-judge** | The judge is another probabilistic, persuadable model. Conclave's "judge" has no authority — only re-executed artifacts decide. |

Conclave's bet: don't add another confident model layer — **route the decision to executed reality where it exists, and abstain honestly where it doesn't.**

---

## Status & honest limitations

**This is a research preview, not a validated product.** Limitations that survive adversarial review (the same honesty the tool enforces, applied to itself):

- **The verifiable slice is small.** Structural/perf/cost checks are decisive; the *most consequential* calls (bounded-context boundaries, build-vs-buy, 3-year evolvability) resist executable checks. There the conclave correctly **abstains to a human** — it degrades to an honest, well-instrumented escalation router, not an oracle.
- **The constitution's completeness is unprovable.** It's drafted by Claude-family models and supermajority-filtered, so a blind spot shared across *all* electors survives as "consensus." The tool makes this foundation **inspectable** (it lists excluded criteria and reports constitution-level independence) rather than hiding it. Re-run with a human-ratified constitution to harden it.
- **Claude-only independence is limited.** In a Claude-only environment cross-model-family diversity is unavailable; `n_eff` measures *commitment* divergence, not true *error* independence, so it can look healthier than it is. The verdict says so, and tells you to trust the grounding dial over agreement.
- **"Wrong-but-green verifier" risk is reduced, not eliminated.** Forging negative controls catches the obvious cases; a subtly mis-specified check can still pass and lend false authority.
- **Benchmark-to-reality transfer is unproven.** The composed techniques were validated on tasks *with* ground truth; their transfer to no-oracle design is plausible and hedged (only verifiable parts ever decide) but not proven.

See [`docs/DESIGN.md`](docs/DESIGN.md) for the full grounded design rationale and citations.

## Roadmap

- [ ] Gate rule: treat *executed elimination of all distinct rivals* as a `SINGLE`-winner condition even at zero margin (the finding from test run #1).
- [ ] Human-ratification checkpoint on the frozen constitution (accept/veto, no silent edit).
- [ ] Pluggable cross-family elector hook (use non-Anthropic models when credentials exist; degrade gracefully when not).
- [ ] Persist `constitution.<hash>.json` artifacts for audit & replay.
- [ ] A small benchmark of decisions-with-known-answers to calibrate `τ_g` / `τ_n`.

## Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first issues are tagged. The cardinal rule: **don't add a feature that lets a model's *opinion* decide something — only executed artifacts or frozen rules may decide.**

## How it was built

Fittingly, Claude Conclave was designed *using its own method*: a multi-agent workflow that ran parallel grounded literature research, generated competing solution architectures from incompatible philosophies, adversarially red-teamed each, and synthesized the survivors — with every load-bearing citation independently verified. The design doc is [`docs/DESIGN.md`](docs/DESIGN.md).

## License

[MIT](LICENSE).

## Acknowledgements

Grounded in published work on semantic entropy & uncertainty (Kuhn et al.; Farquhar et al.), LLM-as-judge reliability and panels (Zheng et al.; Verga et al.), multi-agent debate dynamics (Du et al.; Khan et al.), correlated-judge effective sample size (the "nine judges, two effective votes" result), sycophancy (Sharma et al.), and classical architecture-decision rigor (SEI ATAM; evolutionary-architecture fitness functions). Full citations in [`docs/DESIGN.md`](docs/DESIGN.md).
