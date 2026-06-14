---
name: Bug report
about: Something in the conclave behaved incorrectly
title: "[bug] "
labels: bug
---

**Constitution hash**
The `[xxxxxxxx]` stamp from the verdict (lets the run be identified/replayed).

**Decision you passed to `/conclave`**
The exact text and any tuning args (`D`, `N`, `tau_g`, etc.).

**What happened**
The verdict header + the part that looks wrong. Paste `verdict_markdown` if you can.

**What you expected**
e.g. "expected SINGLE because all rivals were eliminated by executed checks, got PARETO."

**Was it a procedure bug or a grounding judgement?**
- [ ] The deterministic math/gate did the wrong thing (procedure bug — high priority)
- [ ] An agent mis-scored or mis-forged a check (grounding-quality issue)
- [ ] Not sure

**Environment**
Claude Code version; Claude-only or cross-family; anything unusual.
