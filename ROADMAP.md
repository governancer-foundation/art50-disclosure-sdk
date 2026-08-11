<!--
SPDX-FileCopyrightText: 2026 Agonist Development AB
SPDX-License-Identifier: Apache-2.0
-->

# Roadmap

What this package intends to become, and what it deliberately will not.

Dates are quarters, not promises. An item moves to **shipped** only when it is
released and documented; nothing is marked done because it is written.

## Shipped

- ✅ Obligation resolution for Article 50(1) to 50(4), with the reasoning
  attached to every verdict including the negative ones
- ✅ Disclosure wording in six languages: English, German, French, Spanish,
  Italian, Swedish
- ✅ Placement model — first interaction, periodic, on-content, machine-readable
- ✅ Reproducible assessment record, caller-stamped so two runs over the same
  input differ only if the assessment differs
- ✅ The exemption edges that a careless reading gets wrong, each held by a test
- ✅ **Machine-readable marking values** (0.2.0) — `buildMarkingClaim()` emits
  the IPTC digital-source-type term and the provenance action a signing tool
  needs, so the record and the mark carry the same claim. The package still
  does not embed a watermark, and still says so where the duty arises.

## Next (Q4 2026)

- 📋 **The remaining official languages of the Union.** Six is enough to be
  useful and not enough to serve the single market. Wording will be reviewed
  by a speaker per language rather than machine-translated, so this lands
  language by language rather than in one drop.
- 🚧 **A conformance record shared with the accessibility axis.** The shape is
  an in-toto statement carrying a conformance predicate, so it rides the
  signing and verification path the supply-chain ecosystem already has.
  `buildAttestation()` implements the AI Act profile of it. The schema itself
  should move to a package of its own before a second axis implements it
  independently, and its predicate type needs a stable, product-neutral URI —
  until then the one emitted here is explicitly provisional.
- 📋 **Guidance deltas.** The Commission's guidelines on Article 50 and the
  code of practice on marking and labelling are still moving. Where they narrow
  a term this package reads broadly, the reasoning text changes and the change
  is recorded.

## Later (2027)

- 📋 **Article 50(5) accessibility conformance.** The manner requirement points
  at accessibility law; checking a rendered notice against it needs a renderer,
  which this package does not have. Likely a companion rather than a feature.
- 📋 **A Python port.** The audience that ships generative systems is not
  uniformly a TypeScript audience. Gated on the API settling.
- 📋 **Member-state deltas.** National implementing measures may add notice
  requirements on top of Article 50. Gated on those measures existing.

## Not planned

- **Legal advice, or a claim of compliance.** The package reports a reading and
  shows its work. It cannot know your deployment, and a tool that told you it
  had made you compliant would be lying.
- **Watermarking or provenance signing.** A real 50(2) mark is a cryptographic
  and media-format problem, well served by existing projects. This package
  points at the duty and records what you did about it.
- **The rest of the AI Act.** Article 50 is a coherent scope. Risk
  classification, conformity assessment and post-market monitoring are separate
  problems and belong in separate packages.

## How to influence this

Open an issue describing the case the package gets wrong or cannot express.
A concrete profile that produces the wrong verdict is worth more than a feature
request; it becomes a test either way.

## Update history

| Version | Date | What changed |
|---|---|---|
| 1.1 | 2026-08-10 | Machine-readable marking values shipped in 0.2.0; sections named by horizon rather than by version, since a version is cut when work is done and a horizon is not. |
| 1.0 | 2026-08-10 | Initial roadmap, published with v0.1. |
