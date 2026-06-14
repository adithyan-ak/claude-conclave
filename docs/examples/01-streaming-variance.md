# Example 1 — The blind test (a problem with a known-correct answer)

This run tests the thing that matters most: does Claude Conclave reach the **correct** answer through *executed verification*, and does it let the **popular-but-wrong** answer lose on measured evidence — without that answer ever being named in the input?

- **Constitution hash:** `c9d1abe0`
- **Params:** `D=6, N=6` (uniform Opus)
- **Agents spawned:** 25 · **Rounds:** 3 · **Mode returned:** `PARETO`

## The setup (a sealed prediction)

Before running, the author privately sealed a prediction:

- **Optimal answer:** Welford's online algorithm (single-pass, O(1) memory, numerically stable).
- **The trap:** the textbook sum-of-squares formula `E[x²] − E[x]²`. On a stream with a huge mean (~1,000,000) and tiny spread (~±0.5) it suffers **catastrophic cancellation** and can return zero or *negative* variance. It's the answer a confident model is most likely to assert — pure authority-hallucination bait.
- **Legitimate rival:** shifted / assumed-mean accumulation (also stable, single-pass).

**Crucially, the input named none of these algorithms** — only constraints and acceptance criteria.

## The prompt passed to `/conclave`

> Engineering decision — choose a computation method.
>
> A monitoring system processes a forward-only stream of 64-bit float measurements from an industrial sensor. ~10 billion values per run. The stream is single-pass: each value delivered once, in order, **cannot be stored, buffered, or re-read**. Memory budget: only a small, fixed number of scalar accumulators — nothing that grows with N. Values sit very close to a large baseline (e.g. ~1,000,000) with a true spread on the order of ±0.5.
>
> At end-of-stream, report mean and variance (and standard deviation). The variance must be accurate to at least the **4th significant figure**, because a downstream anomaly detector triggers on small changes in spread. An approach that becomes numerically unreliable under this large-baseline / small-spread profile is unacceptable.
>
> Decide which algorithm should be used and why, over the alternatives. Be specific about the update/accumulation steps.

## What the conclave did

**Phase 0 — Constitution.** Six electors independently proposed criteria; the 2/3-supermajority survivors were forged into runnable checks. The frozen objective:

| id | criterion | weight | verifiability |
| --- | --- | --- | --- |
| c1 | Numerical accuracy under large-baseline/small-spread (relerr < 5e-5); naive `E[x²]−E[x]²` disqualified by catastrophic cancellation | 0.30 | **VERIFIED-CHECKABLE** |
| c2 | Strictly single-pass with O(1) bounded state (eliminates two-pass, windows, reservoirs, sketches) | 0.30 | **VERIFIED-CHECKABLE** |
| c3 | Output mathematically valid — variance provably ≥ 0 and finite, never a poison value; guarded sqrt | 0.21 | **VERIFIED-CHECKABLE** |
| c4 | Partial accumulators merge associatively (Chan/Golub-LeVeque) → order-independent, parallel, checkpoint-resumable | 0.19 | **VERIFIED-CHECKABLE** |

**Phase 2 — Verify (the key moment).** To score c1, an agent **wrote Python that computed the exact population variance via rational `Fraction` arithmetic as ground truth**, then ran each estimator in float64 and measured relative error:

```
naive sum-of-squares :  relerr 1.5e0   → FAIL  (and on a baseline=1e8 stream returned variance = -26850, NEGATIVE)
Welford              :  relerr 3.3e-11 → PASS
shifted/assumed-mean :  relerr 3.5e-14 → PASS
```

The negative-control held: the naive estimator was *required* to fail on this profile, and it did — total catastrophic cancellation, exactly as the trap predicted. The c2 check confirmed state size stayed constant (3 scalars at N=1e3 and N=1e5); c4 confirmed the delta-corrected merge matched serial to relerr 9.2e-11 while a delta-less merge failed at 1.3e-6.

## The verdict

All six surviving candidates scored 1.0 at **100% grounding**. Five were Welford variants; the sixth was the shifted/assumed-mean method — **exactly the sealed prediction**, with the legitimate rival correctly surfaced.

> 🕊️ **CLAUDE CONCLAVE VERDICT `[c9d1abe0]` — PARETO**
>
> 1. **Welford's Online Algorithm** (single-pass, scalar-state) — score 1, grounding 100%
> 2. Welford + optional fixed-offset pre-shift — score 1, grounding 100%
> 3. Welford + Chan parallel combination — score 1, grounding 100%
> 4. Welford (M2) + Chan pairwise-merge — score 1, grounding 100%
> 5. Welford + Chan parallel-merge — score 1, grounding 100%
> 6. **Shift-and-Accumulate (provisional-mean)** — score 1, grounding 100%
>
> *Grounding ratio 100%; grounded margin 0%; n_eff 1.17 of 6.*

## The finding

The conclave **converged on the correct answer family and proved the seductive wrong answer wrong by executing code** — the entire thesis working on a blind problem. But it returned `PARETO` rather than crowning one Welford variant.

This is *honest* (every survivor genuinely passes every executed check — there's no grounded margin between equally-correct answers) but **conservative**: the property that actually distinguishes Welford from shifted-mean ("Welford needs no prior knowledge of the baseline; shifted-mean requires a pre-chosen offset K") was discovered — it's sitting in probe #8 — but never promoted to a weighted deciding criterion.

**Roadmap item (issue #1):** the gate should treat *executed elimination of all **distinct** rivals* (here: the naive trap was eliminated; the survivors are variants of one method) as a `SINGLE`-winner condition even at zero margin between the survivors. This run is the regression case for that change.
