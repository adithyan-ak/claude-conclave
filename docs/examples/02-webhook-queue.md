# Example 2 — A genuinely contested decision (honest abstention)

This run shows the other half of the thesis: when the candidates **tie on what can be executed** and differ only on what can be **estimated**, the conclave refuses to fake a winner.

- **Constitution hash:** `88149d20`
- **Params:** `D=4, N=4`
- **Agents spawned:** 13 · **Rounds:** 2 · **Mode returned:** `PARETO`

## The prompt passed to `/conclave`

> For a new internal service that ingests ~5k webhook events/sec with bursty spikes, choose the queueing/backpressure approach: (a) Kafka as the buffer, (b) Redis Streams, (c) cloud-native managed queue (SQS/PubSub), or a different approach. Optimize for operational simplicity, cost, and not losing events under burst.

## What the conclave did

**Phase 0 — Constitution.** Four electors → four supermajority criteria, forged into checks:

| id | criterion | weight | verifiability |
| --- | --- | --- | --- |
| c1 | Zero event loss empirically verified — durably persisted before 2xx; loss made loudly detectable | 0.26 | **VERIFIED-CHECKABLE** |
| c2 | Ingest front door survives real peak burst (2–5× baseline) without drops or sender 5xx; honest backpressure | 0.25 | **VERIFIED-CHECKABLE** |
| c3 | Choose on fully-loaded TCO at *your* volume/burst (compute + requests + non-linear storage + egress + ops headcount) | 0.24 | **ESTIMATE-ONLY** |
| c4 | Day-2 operational simplicity as *lived burden* (self-operated stateful components, pages under fault, cognitive load) | 0.24 | **ESTIMATE-ONLY** |

Note c1+c2 (the things you can *run*) are verifiable; c3+c4 (cost and lived ops burden) are intrinsically estimates.

**Phase 2 — Verify.** Agents built and ran in-process simulations rather than argue:

```
durability (c1): leader-only-ack run lost 36000 acked writes;  durable (quorum) run lost 0
burst     (c2): saturation run produced 82000 honest backpressure (429) events, 0 acked-but-lost
TCO model (c3): negative control fired — self-hosted Kafka claiming ops_fte_fraction=0 was rejected as dishonest
```

## The verdict

The candidates **tied on the executed durability and burst checks** (all the well-formed designs persist before ack and apply backpressure) and separated only on the **estimated** cost/ops dimensions. So the grounded margin was 0% and effective independence was low.

> 🕊️ **CLAUDE CONCLAVE VERDICT `[88149d20]` — PARETO**
>
> **Why the system refuses to over-claim:** only 0% of the deciding margin is backed by executed checks (need 60%); effective independence is 1.38 of 3 (need 3) across 1 model family — agreement here is correlated, not consensus.
>
> 1. **AWS Kinesis on-Demand** (managed stream) — score 0.82, grounding 76%
> 2. **SQS as the shock absorber** (dumb ingest, managed queue) — score 0.94, grounding 38%
>
> **Assumptions you'd have to accept to choose** (NOT executed):
> - *Fully-loaded TCO at your real volume/egress/headcount* — the cost ranking is a model estimate; its arithmetic is checked, its input rates are not.
> - *Day-2 lived operational burden & team expertise* — partly checkable (component count, alert-rule presence), but "cognitive load / a fresh on-call can debug it" is a human judgment with no clean pass/fail.

## The finding

This is the **designed behavior**, not a failure. The highest-stakes part of a queueing decision — long-run cost and operational burden at *your* org — genuinely cannot be settled by a check the conclave can run in a sandbox. So it:

1. Settled what it *could* execute (both leading designs are durable and survive burst — real, grounded conclusions).
2. Surfaced a ranked shortlist.
3. Named the exact estimated assumptions that distinguish them.
4. Handed the value-laden final call to a human, instead of laundering a coin-flip through a confident paragraph.

A single-model answer here would have picked one and written a compelling justification. The conclave told you *which parts are proven, which are guessed, and what you're actually deciding.*
