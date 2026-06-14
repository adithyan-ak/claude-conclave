export const meta = {
  name: 'claude-conclave',
  description: 'Claude Conclave — a Constitutional Tournament: terminating, replayable, uniqueness-guaranteed decision under a frozen objective, with a measured grounding dial that triggers honest abstention instead of over-claiming.',
  phases: [
    { title: 'Constitution', detail: 'diverse drafters propose criteria; supermajority + measurability filter; freeze weighted objective + probes' },
    { title: 'Generate', detail: 'N decorrelated candidate solutions across tiers/framings/principles' },
    { title: 'Verify', detail: 'forge + run checks; score each candidate per criterion with evidence status; answer frozen probes' },
    { title: 'Tournament', detail: 'deterministic single-elimination; LLM only nominates artifact-backed critiques in near-ties' },
    { title: 'Verdict', detail: 'compute grounding ratio + n_eff in pure JS; single winner or honest Pareto abstention' },
  ],
}

// ============================================================================
// INPUT
// ============================================================================
const A = (args && typeof args === 'object') ? args : {}
const problem = (A.problem || (typeof args === 'string' ? args : '') || '').trim()
const D = Math.max(4, Math.min(12, A.D || 6))        // drafters
const N = Math.max(3, Math.min(10, A.N || 6))        // candidates
const S = A.S || (2 / 3)                              // supermajority fraction
const ALPHA = A.alpha ?? 0.5                          // freq vs importance weight blend
const EPS = A.eps ?? 0.04                             // near-tie band on aggregate score
const TAU_G = A.tau_g ?? 0.6                          // grounded-margin threshold for single winner
const TAU_N = A.tau_n ?? 3                            // effective-independence threshold
const TAU_F = A.tau_f ?? 2                            // distinct-family threshold for consensus claim
const FAMILY_COUNT = A.family_count ?? 1              // Claude-only env => 1 (cross-family hook can raise)
const USE_TIERS = A.tiers ?? false                   // false => uniform Opus (best capability; diversity from prompts). true => tier-mix hedge for unverifiable criteria.

// ============================================================================
// PURE DETERMINISTIC HELPERS  (no Date/Math.random — replay-safe)
// ============================================================================
function stable(o) {
  if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']'
  if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(k => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}'
  return JSON.stringify(o)
}
function djb2(str) { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h * 33) ^ str.charCodeAt(i)) >>> 0; return ('00000000' + h.toString(16)).slice(-8) }
function fp(o) { return djb2(stable(o)) }
function f2(x) { return (Math.round((x || 0) * 100) / 100).toString() }
function quantize(x) { const lv = [0, 0.25, 0.5, 0.75, 1]; let b = 0, bd = 9; for (const l of lv) { const d = Math.abs(l - (x || 0)); if (d < bd) { bd = d; b = l } } return b }

function aggregate(cand, weights) { let V = 0; for (const c of weights) { const s = cand.scores[c.id]; V += c.w * (s ? s.score : 0) } return V }
function dominates(a, b, weights) { let ge = true, gt = false; for (const c of weights) { const av = a.scores[c.id]?.score ?? 0, bv = b.scores[c.id]?.score ?? 0; if (av < bv) ge = false; if (av > bv) gt = true } return ge && gt }
function paretoFront(cands, weights) { return cands.filter(a => !cands.some(b => b !== a && dominates(b, a, weights))) }
function groundingRatio(cand, weights) { let num = 0, den = 0; for (const c of weights) { const s = cand.scores[c.id]; if (!s) continue; const contrib = c.w * s.score; den += contrib; if (s.status === 'EXECUTED') num += contrib * (s.coverage ?? 1) } return den > 0 ? num / den : 0 }
function groundingMargin(w, r, weights) { let tot = 0, gr = 0; for (const c of weights) { const ws = w.scores[c.id]?.score ?? 0, rs = r.scores[c.id]?.score ?? 0; const d = c.w * (ws - rs); if (d > 0) { tot += d; if (w.scores[c.id]?.status === 'EXECUTED') gr += d * (w.scores[c.id]?.coverage ?? 1) } } return tot > 0 ? gr / tot : 0 }
function commitCorr(a, b) { const x = a || [], y = b || []; const len = Math.min(x.length, y.length) || 1; let h = 0; for (let k = 0; k < len; k++) if (x[k] !== y[k]) h++; return 1 - h / len }
function commitmentNeff(cands) { const M = cands.length; if (M <= 1) return M; let sum = 0; for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) { sum += (i === j) ? 1 : Math.max(commitCorr(cands[i].commitments, cands[j].commitments), FAMILY_COUNT > 1 ? 0 : 0) } return (M * M) / sum }
function tbKey(cand, weights, Gmap) { const sw = [...weights].sort((x, y) => y.w - x.w); return { g: Gmap[cand.id] ?? 0, lex: sw.map(c => cand.scores[c.id]?.score ?? 0), cost: cand.cost ?? 0, fp: cand.fp } }
function cmpTb(a, b) { if (b.g !== a.g) return b.g - a.g; for (let i = 0; i < a.lex.length; i++) if (b.lex[i] !== a.lex[i]) return b.lex[i] - a.lex[i]; if (a.cost !== b.cost) return a.cost - b.cost; return a.fp < b.fp ? -1 : (a.fp > b.fp ? 1 : 0) }

// ============================================================================
// DIVERSITY POOL  (coprime strides => decorrelated coordinates)
// ============================================================================
// Diversity is carried by the MODEL-INDEPENDENT prompt axes (persona × principle × framing),
// not by model tier. Default model is uniform Opus (strongest capability; cost is not a concern).
// Tier-mixing is a small, optional decorrelation hedge for ESTIMATE-ONLY (unverifiable) criteria — opt in via tiers:true.
const TIERS = ['opus', 'sonnet', 'haiku']
const FRAMINGS = ['maximize the upside', 'minimize downside and failure modes', 'falsify the obvious answer', 'steelman the unpopular alternative']
const PERSONAS = ['site-reliability engineer', 'security auditor', 'cost owner', 'maintainer three years from now', 'domain end-user', 'principal architect']
const PRINCIPLES = ['optimize for reversibility', 'optimize for simplicity', 'optimize for blast-radius containment', 'optimize for long-term evolvability', 'optimize for operational cost', 'optimize for time-to-first-value']
function pool(K) { const p = []; for (let i = 0; i < K; i++) p.push({ idx: i, model: USE_TIERS ? TIERS[i % TIERS.length] : 'opus', framing: FRAMINGS[(3 * i) % 4], persona: PERSONAS[i % 6], principle: PRINCIPLES[(5 * i) % 6] }); return p }

if (!problem) { return { verdict_markdown: '**CLAUDE CONCLAVE**: no decision/problem provided. Invoke as `/conclave <the decision to make>`.', structured: null } }

// ============================================================================
// SCHEMAS
// ============================================================================
const DRAFT_SCHEMA = { type: 'object', additionalProperties: false, required: ['criteria'], properties: { criteria: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['claim', 'why_it_matters', 'measurement_hint'], properties: { claim: { type: 'string' }, why_it_matters: { type: 'string' }, measurement_hint: { type: 'string' } } } } } }
const REG_SCHEMA = { type: 'object', additionalProperties: false, required: ['clusters', 'excluded'], properties: { clusters: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['canonical_claim', 'supporting_drafters', 'importance_0_1'], properties: { canonical_claim: { type: 'string' }, supporting_drafters: { type: 'array', items: { type: 'number' } }, importance_0_1: { type: 'number' } } } }, excluded: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['canonical_claim', 'supporting_drafters'], properties: { canonical_claim: { type: 'string' }, supporting_drafters: { type: 'array', items: { type: 'number' } } } } } } }
const FORGE_SCHEMA = { type: 'object', additionalProperties: false, required: ['criteria', 'probes'], properties: { criteria: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'status', 'check_type', 'how_to_verify', 'negative_control', 'can_execute_now'], properties: { id: { type: 'string' }, status: { type: 'string', enum: ['VERIFIED-CHECKABLE', 'ESTIMATE-ONLY', 'UNVERIFIABLE'] }, check_type: { type: 'string' }, how_to_verify: { type: 'string' }, negative_control: { type: 'string' }, can_execute_now: { type: 'boolean' } } } }, probes: { type: 'array', items: { type: 'string' } } } }
const CAND_SCHEMA = { type: 'object', additionalProperties: false, required: ['title', 'design', 'key_commitments'], properties: { title: { type: 'string' }, design: { type: 'string' }, key_commitments: { type: 'string' } } }
const SCORE_SCHEMA = { type: 'object', additionalProperties: false, required: ['per_criterion', 'probe_answers', 'cost_estimate'], properties: { per_criterion: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['criterion_id', 'score', 'status', 'coverage', 'evidence'], properties: { criterion_id: { type: 'string' }, score: { type: 'number' }, status: { type: 'string', enum: ['EXECUTED', 'ESTIMATED', 'NA'] }, coverage: { type: 'number' }, evidence: { type: 'string' } } } }, probe_answers: { type: 'array', items: { type: 'number' } }, cost_estimate: { type: 'number' } } }
const CRIT_SCHEMA = { type: 'object', additionalProperties: false, required: ['has_admissible_critique', 'criterion_id', 'favored_candidate', 'evidence_status', 'executed_finding'], properties: { has_admissible_critique: { type: 'boolean' }, criterion_id: { type: 'string' }, favored_candidate: { type: 'string', enum: ['A', 'B', 'neither'] }, evidence_status: { type: 'string', enum: ['EXECUTED', 'ESTIMATED', 'NONE'] }, executed_finding: { type: 'string' } } }

const exec = "If a criterion can be checked by actually running something (a test, static-analysis/linter, a build, a benchmark, a query, a web lookup of a hard fact, a small simulation or numeric model), DO IT using your tools and mark status EXECUTED with the real observed result in evidence. Only mark EXECUTED when you genuinely ran something and observed output. If you can only reason/guess, mark ESTIMATED and quantize the score to one of {0,0.25,0.5,0.75,1}. Mark NA if the criterion does not apply. Never dress an estimate as an execution — that is the exact failure this system exists to defeat."

// ============================================================================
// PHASE 0 — CONSTITUTION (run once, then frozen)
// ============================================================================
phase('Constitution')
log('Drafting evaluation criteria from ' + D + ' decorrelated viewpoints...')
const P = pool(D)
const drafts = (await parallel(P.map(d => () =>
  agent('You are evaluating how to judge this decision — NOT solving it yet.\n\nDECISION:\n' + problem + '\n\nReason as a ' + d.persona + ' whose guiding principle is to ' + d.principle + ', and frame your thinking to ' + d.framing + '. List the criteria that SHOULD decide this, independent of any particular solution. For each: a crisp claim, why it matters, and a concrete hint for how it could be MEASURED or VERIFIED (not just asserted). Favor criteria that can be turned into a runnable check.',
    { model: d.model, schema: DRAFT_SCHEMA, phase: 'Constitution', label: 'draft:' + d.model + ':' + d.idx })
))).filter(Boolean)

const flatCriteria = []
drafts.forEach((dr, di) => (dr.criteria || []).forEach(c => flatCriteria.push({ drafter: di, ...c })))
log('Clustering ' + flatCriteria.length + ' raw criteria and applying supermajority filter...')

const reg = await agent('Cluster these criteria by MEANING (different wordings of the same underlying criterion are one cluster). Criteria were proposed by ' + D + ' independent drafters (indices 0..' + (D - 1) + ').\n\nRAW CRITERIA (each tagged with its drafter index):\n' + JSON.stringify(flatCriteria) + '\n\nFor each cluster return: a canonical_claim, the list of DISTINCT drafter indices that proposed something in it (supporting_drafters), and importance_0_1 (how decision-critical, 0..1). A single drafter counts once per cluster. Put clusters supported by fewer than a supermajority in "excluded".',
  { schema: REG_SCHEMA, phase: 'Constitution', label: 'registrar' })

// deterministic supermajority + weight assignment (pure JS)
let survivors = (reg.clusters || []).map((cl, i) => {
  const support = new Set(cl.supporting_drafters || []).size
  return { id: 'c' + (i + 1), claim: cl.canonical_claim, support, importance: Math.max(0, Math.min(1, cl.importance_0_1 || 0)) }
}).filter(c => c.support / D >= S)
if (survivors.length === 0 && (reg.clusters || []).length) {
  survivors = reg.clusters.map((cl, i) => ({ id: 'c' + (i + 1), claim: cl.canonical_claim, support: new Set(cl.supporting_drafters || []).size, importance: cl.importance_0_1 || 0 }))
    .sort((a, b) => b.support - a.support).slice(0, Math.min(5, reg.clusters.length))
}
const sumSupport = survivors.reduce((a, c) => a + c.support, 0) || 1
survivors.forEach(c => { c.freq = c.support / sumSupport })
const sumImp = survivors.reduce((a, c) => a + c.importance, 0) || 1
survivors.forEach(c => { c.raw = ALPHA * c.freq + (1 - ALPHA) * (c.importance / sumImp) })

log('Forging runnable checks for ' + survivors.length + ' surviving criteria (negative-control gated)...')
const forge = await agent('For each criterion below, design the STRONGEST runnable verification you can, and classify it.\n\nDECISION CONTEXT:\n' + problem + '\n\nCRITERIA:\n' + JSON.stringify(survivors.map(c => ({ id: c.id, claim: c.claim }))) + '\n\nFor each criterion give: status (VERIFIED-CHECKABLE if a real executable/checkable verifier exists; ESTIMATE-ONLY if only a bounded estimate is possible; UNVERIFIABLE if it is purely aesthetic/normative with no check), check_type, how_to_verify (concrete: the command/test/lookup), a negative_control (an input that the check MUST fail on — if you cannot state one, it is not VERIFIED-CHECKABLE), and can_execute_now (true only if it can actually be run in THIS environment without external credentials/infrastructure). Also return a FROZEN list of "probes": 5-10 binary (yes/no) design-choice questions that meaningfully distinguish candidate solutions for THIS decision (used to measure how independent the candidates really are). Be conservative: a check you cannot state a negative control for is NOT VERIFIED-CHECKABLE.',
  { model: 'opus', schema: FORGE_SCHEMA, phase: 'Constitution', label: 'forge' })

// merge forge classification; zero-out unverifiable; renormalize deciding weights (pure JS)
const fmap = {}; (forge.criteria || []).forEach(c => { fmap[c.id] = c })
survivors.forEach(c => { const f = fmap[c.id] || {}; c.status = f.status || 'ESTIMATE-ONLY'; c.role = c.status === 'UNVERIFIABLE' ? 'descriptive' : 'deciding'; c.check_type = f.check_type || 'none'; c.how_to_verify = f.how_to_verify || ''; c.negative_control = f.negative_control || ''; c.can_execute_now = !!f.can_execute_now })
const deciding = survivors.filter(c => c.role === 'deciding')
const sumDecRaw = deciding.reduce((a, c) => a + c.raw, 0) || 1
deciding.forEach(c => { c.w = c.raw / sumDecRaw })
survivors.filter(c => c.role !== 'deciding').forEach(c => { c.w = 0 })
const probes = (forge.probes || []).slice(0, 10)
const weights = deciding.map(c => ({ id: c.id, w: c.w }))

const constitution = Object.freeze({ criteria: survivors, probes, weights, params: { D, N, S, ALPHA, EPS, TAU_G, TAU_N, TAU_F } })
const H = fp(constitution)
log('Constitution frozen [' + H + ']: ' + deciding.length + ' deciding criteria, ' + (survivors.length - deciding.length) + ' descriptive, ' + probes.length + ' probes.')

if (deciding.length === 0) {
  return { verdict_markdown: '## 🕊️ CLAUDE CONCLAVE  `[' + H + ']`  —  **ABSTAIN (no measurable criteria)**\n\nEvery criterion that survived consensus was UNVERIFIABLE (aesthetic/normative with no runnable check). This decision cannot be grounded by this system; it is a pure judgment call. Surviving criteria (descriptive only):\n' + survivors.map(c => '- ' + c.claim).join('\n'), structured: { H, constitution, mode: 'ABSTAIN_NO_CRITERIA' } }
}

// ============================================================================
// PHASE 1 — GENERATE N DECORRELATED CANDIDATES
// ============================================================================
phase('Generate')
log('Generating ' + N + ' decorrelated candidate solutions...')
const G = pool(N)
let cands = (await parallel(G.map(g => () =>
  agent('Propose ONE concrete, complete solution to this decision. Commit fully to a single coherent design — do not hedge across options.\n\nDECISION:\n' + problem + '\n\nApproach it as a ' + g.persona + ' who will ' + g.principle + '. Give it a short title, the design itself (concrete and specific), and a crisp list of its key technical commitments.',
    { model: g.model, schema: CAND_SCHEMA, phase: 'Generate', label: 'cand:' + g.model + ':' + g.idx })
    .then(r => r ? { id: 'A' + g.idx, gen_model: g.model, ...r } : null)
))).filter(Boolean)
cands.forEach(c => { c.fp = fp({ t: c.title, d: c.design, k: c.key_commitments }) })

// ============================================================================
// PHASE 2 — VERIFY / SCORE (against frozen constitution; answer frozen probes)
// ============================================================================
phase('Verify')
log('Scoring ' + cands.length + ' candidates against the frozen constitution (executing checks where possible)...')
const decidingList = survivors.filter(c => c.role === 'deciding')
const scored = (await parallel(cands.map(c => () =>
  agent('Score this candidate solution against the FROZEN constitution. ' + exec + '\n\nDECISION:\n' + problem + '\n\nCONSTITUTION CRITERIA (score every one):\n' + JSON.stringify(decidingList.map(x => ({ id: x.id, claim: x.claim, how_to_verify: x.how_to_verify, status: x.status }))) + '\n\nFROZEN PROBES (answer each 1=yes/0=no for THIS candidate, in order):\n' + JSON.stringify(probes) + '\n\nCANDIDATE:\n' + JSON.stringify({ title: c.title, design: c.design, key_commitments: c.key_commitments }) + '\n\nReturn per_criterion [{criterion_id, score 0..1, status, coverage 0..1, evidence}], probe_answers (array of 0/1 same length/order as probes), and cost_estimate (relative build/operate complexity, lower is better, 0..1).',
    { model: 'opus', agentType: 'general-purpose', schema: SCORE_SCHEMA, phase: 'Verify', label: 'score:' + c.id })
    .then(r => {
      if (!r) return null
      const scores = {}; (r.per_criterion || []).forEach(p => { scores[p.criterion_id] = { score: quantize(Math.max(0, Math.min(1, p.score || 0))), status: p.status === 'EXECUTED' ? 'EXECUTED' : (p.status === 'NA' ? 'NA' : 'ESTIMATED'), coverage: Math.max(0, Math.min(1, p.coverage ?? 1)), evidence: p.evidence || '' } })
      return { ...c, scores, commitments: (r.probe_answers || []).map(x => x ? 1 : 0), cost: Math.max(0, Math.min(1, r.cost_estimate ?? 0.5)) }
    })
))).filter(Boolean)
cands = scored
cands.forEach(c => { c.V = aggregate(c, weights) })

// grounding map (pure JS)
const Gmap = {}; cands.forEach(c => { Gmap[c.id] = groundingRatio(c, weights) })

// ============================================================================
// PHASE 3 — DETERMINISTIC SINGLE-ELIMINATION TOURNAMENT
// ============================================================================
phase('Tournament')
function seedOrder(cs) { return [...cs].sort((a, b) => { if (Math.abs(b.V - a.V) > 1e-9) return b.V - a.V; return cmpTb(tbKey(a, weights, Gmap), tbKey(b, weights, Gmap)) }) }
async function match(a, b) {
  if (!b) return a
  if (Math.abs(a.V - b.V) > EPS) return a.V > b.V ? a : b   // deterministic: reality/score decides
  // ε-near-tie: LLM may ONLY nominate an artifact-backed, criterion-citing critique
  const crit = await agent('Two candidate solutions are tied within noise on the frozen objective. You may break the tie ONLY by producing an ADMISSIBLE critique: it must (1) cite exactly one frozen criterion id, and (2) be backed by something you ACTUALLY RAN (a test/check/lookup) whose observed result favors one candidate. ' + exec + ' If you cannot run a discriminating check, return has_admissible_critique=false — do NOT argue rhetorically.\n\nDECISION:\n' + problem + '\n\nFROZEN CRITERIA:\n' + JSON.stringify(decidingList.map(x => ({ id: x.id, claim: x.claim, how_to_verify: x.how_to_verify }))) + '\n\nCANDIDATE A:\n' + JSON.stringify({ title: a.title, design: a.design }) + '\n\nCANDIDATE B:\n' + JSON.stringify({ title: b.title, design: b.design }),
    { model: 'opus', agentType: 'general-purpose', schema: CRIT_SCHEMA, phase: 'Tournament', label: 'match:' + a.id + 'v' + b.id })
  const validId = crit && crit.has_admissible_critique && constitution.criteria.some(c => c.id === crit.criterion_id) && crit.evidence_status === 'EXECUTED' && crit.favored_candidate !== 'neither'
  if (validId) return crit.favored_candidate === 'A' ? a : b
  // no admissible critique => frozen total-order tiebreak
  return cmpTb(tbKey(a, weights, Gmap), tbKey(b, weights, Gmap)) <= 0 ? a : b
}
let live = seedOrder(cands)
let rounds = 0
log('Tournament: ' + live.length + ' seeds, ' + Math.ceil(Math.log2(live.length)) + ' rounds...')
while (live.length > 1) {
  rounds++
  const pairs = []
  for (let i = 0; i < Math.ceil(live.length / 2); i++) { pairs.push([live[i], live[live.length - 1 - i]]) }   // top seed vs bottom; middle may self-pair => bye
  const seen = new Set(); const realPairs = []
  for (const [a, b] of pairs) { if (a === b || seen.has(b?.id)) { realPairs.push([a, null]) } else { realPairs.push([a, b]); seen.add(a.id); seen.add(b.id) } }
  const winners = await parallel(realPairs.map(([a, b]) => () => match(a, b)))
  const nextSet = []; const ids = new Set()
  for (const w of winners) { if (w && !ids.has(w.id)) { nextSet.push(w); ids.add(w.id) } }
  if (nextSet.length >= live.length) { live = nextSet.slice(0, Math.floor(live.length / 2) || 1) } else { live = nextSet }   // INV-3: strict shrink
}
const champion = live[0]

// ============================================================================
// PHASE 4 — VERDICT (pure-JS honesty gate)
// ============================================================================
phase('Verdict')
const ranked = seedOrder(cands)
const winner = ranked.find(c => c.id === champion.id) || ranked[0]
const runner = ranked.find(c => c.id !== winner.id)
const nearTie = runner ? (winner.V - runner.V) <= EPS : false
const Gwin = groundingRatio(winner, weights)
const Gmar = runner ? groundingMargin(winner, runner, weights) : Gwin
const neff = commitmentNeff(cands)
const wrongGreen = false   // negative-control gating happens at forge time; flagged criteria are demoted there
const groundedDecision = Gmar >= TAU_G
const consensusDecision = (neff >= TAU_N && FAMILY_COUNT >= TAU_F)
const single = !nearTie && (groundedDecision || consensusDecision)
const mode = single ? 'SINGLE' : 'PARETO'
const pareto = paretoFront(cands, weights)
const paretoRanked = [...pareto].sort((a, b) => cmpTb(tbKey(a, weights, Gmap), tbKey(b, weights, Gmap)))

const estimated = survivors.filter(c => c.role === 'deciding' && (winner.scores[c.id]?.status !== 'EXECUTED'))
const excluded = survivors.filter(c => c.role !== 'deciding')

// ---- render (numbers built in JS so they cannot be re-narrated by a model) ----
function critTable(c) { const w = winner.scores[c.id] || {}; return '| ' + c.id + ' | ' + c.claim.slice(0, 60) + ' | ' + f2(c.w) + ' | ' + c.status + ' | ' + (w.status || '-') + ' (' + f2(w.score) + ') |' }
let md = ''
md += '## 🕊️ CLAUDE CONCLAVE VERDICT  `[' + H + ']`  —  **' + mode + '**\n\n'
md += '**Decision:** ' + problem + '\n\n'
if (single) {
  md += '### Winner: ' + winner.title + '\n\n' + winner.design + '\n\n'
  md += '**Why this is returnable as a single answer:** ' + (groundedDecision ? 'the winning margin is ' + Math.round(Gmar * 100) + '% backed by executed checks (≥ ' + Math.round(TAU_G * 100) + '% bar) — reality decided it, not model agreement.' : 'effectively-independent sources (' + f2(neff) + ' ≥ ' + TAU_N + ') across ' + FAMILY_COUNT + ' families converged.') + '\n\n'
} else {
  md += '### No single winner — honest Pareto shortlist\n\n'
  md += '**Why the system refuses to over-claim:** '
  const reasons = []
  if (nearTie) reasons.push('top candidates are within noise (Δscore ≤ ' + EPS + ') — the lead is not real')
  if (!groundedDecision) reasons.push('only ' + Math.round(Gmar * 100) + '% of the deciding margin is backed by executed checks (need ' + Math.round(TAU_G * 100) + '%)')
  if (!consensusDecision) reasons.push('effective independence is ' + f2(neff) + ' of ' + cands.length + ' (need ' + TAU_N + ') across ' + FAMILY_COUNT + ' model family(ies) — agreement here is correlated, not consensus')
  md += reasons.join('; ') + '.\n\n'
  md += 'These are the non-dominated options (deterministically ranked by groundedness, then weighted score, then cost). Picking among them requires accepting the assumptions below — that is the human/owner call this system will not fake:\n\n'
  paretoRanked.forEach((c, i) => { md += (i + 1) + '. **' + c.title + '** — score ' + f2(c.V) + ', grounding ' + Math.round((Gmap[c.id] || 0) * 100) + '%\n' })
  md += '\n'
}
md += '### Grounding (the trust dial)\n'
md += '- **Winner grounding ratio:** ' + Math.round(Gwin * 100) + '% of its score is backed by executed checks; the rest is model estimate.\n'
md += '- **Grounded margin (decisive):** ' + Math.round(Gmar * 100) + '% — the share of *why it won* that rests on real execution.\n'
md += '- **Effective independence:** ' + f2(neff) + ' of ' + cands.length + ' candidates (commitment-decorrelation; ' + FAMILY_COUNT + ' model family' + (USE_TIERS ? ', tier-mixed' : ', uniform Opus — diversity from prompts only') + ').\n'
md += '  *Caveat: this measures whether candidates **chose** differently, not whether their **errors** are independent. ' + (USE_TIERS ? 'Tier-mixing adds a small error-decorrelation hedge.' : 'With uniform Opus, shared-model blind spots are NOT captured here — so the true independence is likely lower than this number. Trust the executed-grounding dial above it, not agreement.') + '*\n\n'
md += '### Frozen objective (' + deciding.length + ' deciding criteria)\n'
md += '| id | criterion | weight | verifiability | winner evidence |\n|---|---|---|---|---|\n'
deciding.forEach(c => { md += critTable(c) + '\n' })
md += '\n### Assumptions this rests on (NOT executed — verify before trusting)\n'
if (estimated.length) estimated.forEach(c => { md += '- *' + c.claim + '* — winner scored ' + f2(winner.scores[c.id]?.score || 0) + ' by ESTIMATE (' + (winner.scores[c.id]?.evidence || 'no execution').slice(0, 100) + ')\n' })
else md += '- None — every deciding criterion for the winner was executed.\n'
if (excluded.length) { md += '\n### Excluded from the decision (unverifiable / aesthetic — described, never decisive)\n'; excluded.forEach(c => { md += '- ' + c.claim + '\n' }) }
md += '\n---\n*Guarantees: terminated in ' + rounds + ' rounds over ' + cands.length + ' candidates; same problem + same frozen constitution `[' + H + ']` replays to the same ranking. What is NOT guaranteed: that the constitution itself is complete — it was drafted by Claude-family models and supermajority-filtered, so a blind spot shared across all of them survives as "consensus." This is the irreducible foundation the system makes inspectable rather than hides. Re-run with a human-ratified or cross-family constitution to harden it.*'

return {
  verdict_markdown: md,
  structured: { H, mode, winner: single ? { id: winner.id, title: winner.title } : null, pareto: paretoRanked.map(c => ({ id: c.id, title: c.title, V: c.V, grounding: Gmap[c.id] })), grounding_ratio: Gwin, grounded_margin: Gmar, n_eff: neff, family_count: FAMILY_COUNT, near_tie: nearTie, constitution: { criteria: survivors, probes, weights }, params: constitution.params },
}
