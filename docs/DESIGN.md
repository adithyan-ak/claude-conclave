# Design Rationale — A Verifiable Decision Procedure for LLM-Driven Architecture

> **Note:** This is the original grounded design document behind **Claude Conclave**. It was written under the working name *TRIAGE*; the shipped skill implements this design. The five-phase pipeline, the grounding ratio, the effective-independence (`n_eff`) discount, and the honest-abstention gate described here map directly onto [`skill/conclave.js`](../skill/conclave.js). Read it for the *why* and the citations behind every load-bearing claim.

*Solution to: Probabilistic Variance & Persuasive Inconsistency in LLM-Driven Architectural Decision Making.*
*Produced by a heterogeneous multi-agent workflow (7 grounded research sweeps → 3 competing designs → 9 adversarial critiques → synthesis), with all load-bearing citations independently verified against arXiv.*

---

## 0. The move

The three symptoms are not three bugs. They are one bug wearing three masks. **You cannot get determinism, calibrated confidence, or genuine consensus *out of* a stochastic model — those are properties of the decision procedure you build *around* it.** So stop asking the model for the answer. Ask it for *falsifiable hypotheses*, then let a fixed, human-frozen procedure and an external verifier decide — and make the procedure **refuse to decide** the exact cases it cannot ground, surfacing them as a calibrated, independence-discounted disagreement set instead of a confident pick.

---

## 1. Why the three symptoms reduce to one root cause

There is **no objective ground-truth function over open-ended design**, so every "answer-producing" mechanism substitutes a proxy, and every available proxy is the *same* uncalibrated signal: model-internal confidence/fluency.

| Symptom | What it actually is |
|---|---|
| **Non-determinism** | Sampling that proxy across seeds/phrasings/models → mutually-exclusive paradigms with no correct selector. Self-consistency's "unique correct answer" premise (`arXiv:2203.11171`) simply fails for design. |
| **Authority-hallucination** | Asking *one* sample to commit → it reports fluent self-certainty as if it were ground truth, and RLHF *rewards* the convincing-but-wrong answer (`arXiv:2310.13548`, sycophancy; `arXiv:2502.18581`, self-certainty selects the confidently-wrong). |
| **Groupthink** | Asking *many* samples to reconcile → shared pretraining/RLHF lineage means correlated errors; debate is a **belief-martingale that converges to consensus, not truth** (`arXiv:2508.17536`, proven). |

All three are **"confident proxy masquerading as ground truth."** Fix the root — *forbid the proxy from being decisive, manufacture genuine independence, supply external ground truth where it can exist* — and all three dissolve at once. The residue (decisions with no external oracle) is **not** a fourth bug; it is the honest irreducible core, and the job there is to **report** it, not hide it.

---

## 2. The architecture

Backbone = **verify-or-abstain** (no LLM signal is ever load-bearing). Bolted on: an **independence auditor** that refuses to trust unanimity, an **evidence-bound adversarial forge**, and a **lightweight, signed accountability layer**. Each component is tagged with the vetted result it stands on.

| # | Component | Role | Grounded in |
|---|---|---|---|
| **A** | **Pre-Registration & Sensitivity Charter** *(human-owned, lightweight)* | Human freezes scope, hard constraints, quality attributes, numeric thresholds and gate parameters **before any model runs** — a short signed file, *not* a multi-day workshop. Weights get an automatic sensitivity sweep so the verdict's dependence on each weight is exposed. | ATAM quality-attribute scenarios + utility tree (SEI); ADR *Context* discipline (Nygard); AHP **and its blind-to-shared-bias limit** (Saaty) |
| **B** | **Decorrelated Hypothesis Bank** | K≥3 **distinct model families** × multi-seed × multi-temp × **varied prompt framings**; provenance stripped immediately; live tallies hidden. Diversity is *engineered* (framings + open-weight self-host), not branded by API label. | Heterogeneous debate (`2502.08788`); Diversity-of-Thought (`2410.12853`); hide authorship/tallies (`2509.23537`); bounded by Self-MoA — agents must be diverse **and** strong (`2502.00674`) |
| **C** | **Per-Axis Semantic-Disagreement Meter** | Decomposes each proposal into discrete design-commitment tuples (datastore / sync-async / consistency / boundaries); clusters by **meaning** (NLI); computes **semantic entropy per axis**. One unmeasurable global blob → local uncertainty signals. | Semantic entropy (`2302.09664` Kuhn; Farquhar *Nature* 2024); SelfCheckGPT (`2303.08896`) — *with its explicit blind-to-stable-wrong-consensus caveat* |
| **D** | **Effective-Independence Auditor** *(the honesty governor)* | Estimates **Kish effective sample size n_eff** / Dawid-Skene error correlation of the bank *and* jury on a rolling labeled anchor set. **Inverts the prior: high agreement among low-n_eff sources = WEAK or NEGATIVE evidence.** Can force abstention. This is what makes B and I trustworthy. | "Nine judges ≈ two effective votes; unanimity barely diagnostic; smarter aggregation closes ≤11% of the gap" (`2605.29800`); conformity ∝ majority size (`2501.13381`); teams underperform their own expert (`2602.01011`) |
| **E** | **Claim → Fitness-Function Forge** | LLM used **only as translator**: every load-bearing claim → a six-part quality-attribute scenario + an **executable** fitness function / benchmark / formal check + pre-registered pass/fail threshold. Prose discarded. Untranslatable → tagged **UNVERIFIABLE-soft** (can never auto-pass). | Executable fitness functions (Ford/Parsons/Kua); self-correction needs an **external** verifier (`2310.01798`) |
| **F** | **Adversarial Verification Forge** *(symmetric, evidence-bound)* | For every contested axis **and every suspiciously-unanimous axis (entropy ≈ 0 → blindspot trigger)**, a cross-family red-team must produce a **runnable falsifier**, not rhetoric. **It must also attack the fitness function itself** (mutation testing / negative controls) — closing the "wrong-but-green verifier" hole. | Symmetric persuasion aligns with truth **under verifiable evidence** (`2402.06782` Khan); debate is harder-to-lie-than-refute when the judge checks (`1805.00899` Irving); institutionalized red-team (`2209.07858`) |
| **G** | **Deterministic Verification Harness** *(the ONLY ground-truth source)* | Sandboxed runner → bitwise-stable PASS/FAIL/ERROR + measured numbers. Modes: architecture-as-code static checks (ArchUnit / dependency-cruiser / import-linter), prototype-and-benchmark (k6/Locust + cost model), formal/policy (TLA+/Alloy/Z3/OPA), discrete-event sim (SimPy). Structural checks cheap & always-on; expensive prototyping only on high-blast-radius axes. | Fitness functions as continuous oracle (Ford/Parsons/Kua); external-verifier necessity (`2310.01798`) |
| **H** | **Calibrated Decision Gate** *(abstain-by-default selective predictor)* | Auto-decides an axis **iff** all conditions in §4 hold. Emits a Pareto set + a calibrated **interval** (never a point), and reports which axes it decided vs deferred. | Selective prediction / know-your-limits (`2407.18418`, `2407.16221`); conformal back-off **only where a calibration set exists** (`2402.10978`) |
| **I** | **Tamper-Evident Thresholds & Disjoint-Family Jury** | Soft axes get a provenance-blinded, position-swapped jury of **disjoint** families, **discounted by D** and **advisory-only**. **All gate thresholds (δ, n_eff floor, unverified-cap) are version-controlled and signed** — loosening one is a logged, reviewable diff, not a quiet operator knob. | PoLL disjoint-family jury, 7× cheaper, less intra-model bias (`2404.18796`); self-recognition → blind provenance (`2404.13076`); position-swap (`2306.05685`) |
| **J** | **Legible-Disagreement Dossier + Recomputable ADR + HIL** | On abstain: a human-reviewable dossier (per-axis disagreement map, candidates with provenance **re-attached**, harness results, surviving red-team objections, Pareto frontier with measured sacrifices, unstated assumptions, **n_eff readout**). Human resolves via durable interrupt; decision becomes an ADR **and is hardened into a new fitness function** — the ratchet. | MAST: **~79% of multi-agent failures are spec/verification/misalignment, not model IQ — invest in verification + HIL, not more agents** (`2503.13657`); ADR + supersession (Nygard) |

---

## 3. End-to-end protocol

0. **PRE-REGISTER** *(human, lightweight)* — sign the charter; freeze goalposts. *(A)*
1. **GENERATE DECORRELATED** — K≥3 families × seeds × temps × framings → N candidates; strip provenance; hide tallies; parse into commitment tuples. *(B)*
2. **MEASURE DISAGREEMENT** — cluster by meaning; semantic entropy per axis. *(C)*
3. **AUDIT INDEPENDENCE** — estimate n_eff on the anchor set; if collapsed, flag the whole decision low-independence (agreement now non-diagnostic). *(D)*
4. **FORGE VERIFIERS** — each load-bearing claim → QA scenario + executable fitness function + threshold, or tag UNVERIFIABLE-soft. *(E)*
5. **ADVERSARIAL ATTACK** — for contested **and** entropy≈0 axes, cross-family red-team produces runnable falsifiers for the **claim and the test**; rhetoric discarded. *(F)*
6. **VERIFY DETERMINISTICALLY** — run all fitness functions, falsifiers, and mutation/negative controls → PASS/FAIL/ERROR + numbers; eliminate dominated options → Pareto frontier. *(G)*
7. **SCORE SOFT (advisory)** — disjoint-family jury on soft axes, discounted by D. *(I)*
8. **GATE** — per axis, auto-decide or abstain. *(H)*
9. **EMIT** — auto-decided axes → Pareto set + recomputable ADRs + intervals; fitness functions committed as regression guards. Abstained axes → dossier → durable human interrupt → decision → **hardened into a new fitness function**. *(J)* The system becomes *more* deterministic over time as soft claims convert to hard ones.

---

## 4. Where determinism & ground-truth originate (the crux)

Determinism is **layered, and only the load-bearing layer is a legitimate source of semantic ground truth**:

- **Semantic ground-truth — the ONLY decisive layer:** external verifiers in the Harness *(G)*. A fitness function's PASS/FAIL, a benchmark's measured p99, a cost-model dollar figure, a Z3/TLA+ result — deterministic **functions of the artifact under test**, independent of any model's prose. **Decision determinism is therefore conditional and honest:** the verdict is reproducible exactly to the extent it is backed by an external verifier *and* decorrelated sources converge with adequate n_eff. When those fail, the system **abstains** rather than manufacturing determinism.
- **Procedural determinism:** pre-registration *(A)* freezes goalposts; the gate *(H)* is a fixed, signed, auditable rule — removing the degrees of freedom a model uses to rationalize.
- **Infrastructure/replay determinism (hygiene only):** batch-invariant kernels + checkpointing make runs bitwise-reproducible *for audit* — explicitly **not** the source of decision determinism (`2402.05201` shows semantic variance can't be dialed out via temperature).

**Categorically barred from being decisive:** LLM consensus, debate convergence, self-certainty, verbalized confidence, jury unanimity. Each is correlated error or uncalibrated confidence.

**The regress-closer the critics demanded:** because the forge (E) and thresholds (A) are themselves authored by an LLM/human, ground-truth validity is *not assumed* — the Adversarial Forge *(F)* is **required to attack the fitness function itself** via mutation testing, and a human harness-audit validates that each verifier actually *discriminates*. A verifier earns decisive status only after surviving an attempt to make it pass a deliberately-broken design.

---

## 5. Uncertainty quantification & the exact abstain rule

Four signals **chosen to fail differently** so their blind spots don't align:
1. **Per-axis semantic entropy** *(C)* — variance across decorrelated sources. *Blind to stable shared-bias → backstopped by (2) and the entropy≈0 trigger.*
2. **Verification status** *(G)* — PASS/FAIL/ERROR/UNVERIFIABLE per claim.
3. **Effective-independence discount** *(D)* — high agreement among low-n_eff sources read as **low** confidence.
4. **Calibrated interval** *(H)* — verbalized confidence cross-checked against entropy + anchor set; conformal back-off **only where a real calibration set exists**, otherwise reported as *uncalibrated* — never dressed as a frequentist guarantee.

**Auto-decide axis A iff ALL hold:**
- `entropy(A) < δ_A` **OR** exactly one non-dominated option survives on the Pareto frontier; **AND**
- every load-bearing claim for the chosen option returned **PASS**; **AND**
- the cross-family red-team failed to break the claim **AND** failed to break (mutate) its fitness function; **AND**
- no **UNVERIFIABLE-soft** claim is load-bearing; **AND**
- `n_eff(A) ≥ n_eff_floor`.

**Otherwise ABSTAIN** with the Legible-Disagreement Dossier. Two uncertainty *types* stay distinct: **high entropy** = legitimate design pluralism → escalate as a Pareto trade-off set ("genuinely tied under your stated constraints" — the honest-uncertainty primitive majority-vote destroys); **low entropy** is *not* trusted until the red-team has tried and failed to break the consensus on the harness. All thresholds are **signed & version-controlled** — loosening δ or n_eff_floor under deadline pressure is a reviewable commit, not a silent bypass knob.

---

## 6. Implementation blueprint

**Stack:** **LangGraph** (durable DAG, Checkpointer, `interrupt()`/`Command(resume=)` for HIL, replay) · heterogeneous bank via router (Claude / GPT / Gemini / self-hosted Qwen·Llama on **vLLM + batch-invariant kernels** for replay) · **DSPy + MIPROv2/GEPA** to compile **only the claim→fitness-function translator** against the metric "does the generated test run *and discriminate*?" — the rare case a trustworthy metric legitimately exists · semantic entropy via **DeBERTa-MNLI** clustering · n_eff via **Kish / Dawid-Skene** (statsmodels) · harness: **ArchUnit / dependency-cruiser / import-linter** (static), **k6 / Locust** (load), **TLA+ / Alloy / Z3 / OPA** (formal), **SimPy** (sim), containerized · conformal via **MAPIE / crepes** where a calibration set exists · ADRs via **adr-tools**.

```python
# Control loop (LangGraph nodes). The LLM never decides; harness + gate + human do.
def decide(request):
    charter = pre_register(request)                              # (A) human-signed; weights sensitivity-swept
    cands   = bank.generate(K_families, seeds, temps, framings)  # (B)
    cands   = strip_provenance(cands)
    axes    = decompose_to_commitment_tuples(cands)              # (C)
    ent     = {a: semantic_entropy(cands, a) for a in axes}
    n_eff   = independence_auditor(cands, anchor_set)            # (D) high agreement @ low n_eff => weak evidence

    verdict = {}
    for a in axes:
        claims     = extract_load_bearing(cands, a)
        ffs        = forge_fitness_functions(claims, charter)            # (E) untranslatable => UNVERIFIABLE-soft
        trigger    = (ent[a] >= charter.delta[a]) or (ent[a] <= EPS)     # contested OR suspicious unanimity
        falsifiers = redteam_cross_family(claims, ffs) if trigger else []# (F) RUNNABLE; also mutates the ffs
        results    = harness.run(ffs + falsifiers + mutation_controls(ffs))  # (G) ONLY ground truth
        frontier   = pareto_nondominated(survivors(results))

        if (single_or_low_disagreement(frontier, ent[a], charter.delta[a])
            and all_passed(claims, results)
            and not redteam_broke(falsifiers, results)
            and not redteam_broke_the_test(mutation_controls, results)
            and no_soft_claim_load_bearing(claims)
            and n_eff[a] >= charter.n_eff_floor):                        # (H), thresholds signed (I)
            verdict[a] = auto_decide(frontier, interval=calibrated_ci(...))
            commit_regression_guard(ffs)                                 # the ratchet
        else:
            verdict[a] = ABSTAIN

    if any_abstained(verdict):
        human = interrupt(legible_disagreement_dossier(verdict, ent, n_eff, frontier))  # (J) durable HIL
        verdict.update(human.decisions); harden_into_fitness_functions(human)
    return emit_adrs(verdict)                                            # Context + ALL consequences; recomputable
```

**Adoption path:** ship the **structural-check subset standalone today** (cheap, decisive, high ROI). Add the bank + disagreement meter next. Reserve the full adversarial + prototyping pipeline for **high-blast-radius flagship decisions** only — the cost is multiplicative and unjustified for routine ones.

---

## 7. Honest limitations — what this does NOT solve

This is a principled synthesis, **not an empirically-validated product.** Residual risks that survive adversarial critique:

1. **The verifiable slice is small; least help where help is most wanted.** Structural checks (cycles, p99, cost) are decisive; the *most consequential* calls — bounded-context boundaries, build-vs-buy, long-term evolvability, team topology — resist executable fitness functions. There the system **abstains to a human**. Mitigated, not solved: it degrades to an honest, well-instrumented *escalation router*. The ratchet slowly enlarges the verifiable slice but never to 100%.
2. **Decorrelation is vanishing, and we can only measure it.** The Independence Auditor detects when "different" families collapse to ~2 effective votes (`2605.29800`) and forces abstention — but **cannot create independence that isn't there.** As the model ecosystem converges, the antidote weakens and the system abstains more.
3. **Wrong-but-green verifier risk is reduced, not eliminated.** Mutation-testing the fitness function + human harness-audit close the obvious holes, but a subtly mis-specified verifier (right shape, wrong invariant) can still pass and lend a false design the **authority of a green check** — arguably worse than visible prose. Criteria-validity is an open problem with no classical fix.
4. **Calibration is honest, not solved.** Where no calibration set of past outcomes exists (most novel decisions), the interval is reported as **uncalibrated** and conformal guarantees withheld. The confidence-modulated-debate drift-to-truth result (`2601.19921`) depends on calibration that is itself broken — and the adversary role is the **least** calibratable (`2606.10296`) — so confidence-weighted convergence is **never** decisive here.
5. **Pre-registration capture is relocated to humans, not removed.** If the frozen thresholds encode a flawed premise, every verifier inherits it with a veneer of objectivity. Sensitivity sweep + red-team-of-criteria + signed-diff thresholds make this **auditable and contestable** — but a blind spot shared by every model *and* the human owner survives. This is the honest place for it to live.
6. **Benchmark-to-reality transfer is the central unproven bet.** Nearly every composed method was validated on tasks *with* ground truth (QA/math/NLI/code). Transfer to no-oracle architecture selection is *plausible and architecturally hedged* (only verifiable parts are ever decisive; everything else abstains) but **not proven**. Ship with the Gate-(J) outcome-learning loop from day one — the only mechanism here that *manufactures* new ground truth over time rather than presupposing it.

---

### Citation note
All 36 arXiv identifiers cited trace to tool-retrieved sources; 12 load-bearing ones (incl. four 2026-dated papers beyond the model's training cutoff) were independently re-verified against arXiv abstracts. Two non-arXiv entries (Minsky's *Society of Mind*; Pareto optimization) are classical/conceptual and flagged as such. No citation was invented — a deliberate constraint, since fabricating authority in a solution *about* fabricated authority would be self-refuting.
