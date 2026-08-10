# @governancer-foundation/art50-disclosure-sdk

[![CI](https://github.com/governancer-foundation/art50-disclosure-sdk/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/governancer-foundation/art50-disclosure-sdk/actions/workflows/ci.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/governancer-foundation/art50-disclosure-sdk/badge)](https://scorecard.dev/viewer/?uri=github.com/governancer-foundation/art50-disclosure-sdk)
[![REUSE compliant](https://img.shields.io/badge/REUSE-compliant-brightgreen.svg)](https://api.reuse.software/info/github.com/governancer-foundation/art50-disclosure-sdk)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![npm version](https://img.shields.io/npm/v/@governancer-foundation/art50-disclosure-sdk.svg)](https://www.npmjs.com/package/@governancer-foundation/art50-disclosure-sdk)

> Which Article 50 transparency duties bind your AI system, why, and what to show the user — as a function, not a PDF.

Article 50 of **Regulation (EU) 2024/1689** — the EU AI Act — has applied since
**2 August 2026**. It is short, it is not limited to high-risk systems, and it is
easy to get subtly wrong: its exemptions do not line up paragraph to paragraph,
and one of them is narrower than it first reads.

This package takes a description of what your system does and returns which
paragraphs bind you, on what reasoning, what to display, where, in which
language, what a provenance tool should embed — and a machine-readable record
of the whole assessment.

## Quick start

```bash
npm install @governancer-foundation/art50-disclosure-sdk
```

```ts
import { planDisclosures } from "@governancer-foundation/art50-disclosure-sdk";

const plan = planDisclosures(
  { systemName: "support-bot", interactsWithPersons: true },
  { locale: "de" },
);

plan.notices;
// [{ paragraph: "50(1)", placement: "first-interaction",
//    text: "Sie interagieren mit einem KI-System." }]

plan.report.obligations.find((o) => o.paragraph === "50(2)");
// { applies: false,
//   reason: "The system does not generate synthetic audio, image, video or text.", … }
```

## What it does

Four functions, in the order you need them.

**`resolveObligations(profile)`** — which of 50(1) to 50(4) bind this system,
who bears each one (provider or deployer), and the reasoning behind every
verdict, including the negative ones. A paragraph that does not apply is
reported with the reason it does not, because that is the part you have to
defend later.

**`planDisclosures(profile, options)`** — the notices to show, each tagged with
where it belongs: before the first interaction, restated periodically, attached
to the content, or embedded machine-readably. Wording ships in English, German,
French, Spanish, Italian and Swedish.

**`buildMarkingClaim(profile, options)`** — the two values a provenance
manifest needs to satisfy 50(2): the IPTC digital-source-type term describing
how the media came about, and the corresponding action. Both drop straight into
a C2PA manifest. Returns nothing when the duty does not bind, because marking
output you have no duty to mark asserts something about your own system that
may not be true.

```ts
buildMarkingClaim({ generatesSyntheticContent: ["image"] });
// { digitalSourceType:
//     "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
//   action: "c2pa.created",
//   modalities: ["image"], applicableFrom: "2026-08-02", … }
```

The Regulation names no standard — it is technology-neutral — but
interoperability is one of the four adjectives it uses, so the package speaks
the published vocabulary rather than a private one. It does not apply the mark:
embedding and signing is a cryptographic and media-format problem, and a
package that pretended to discharge the duty by returning an object would be
worse than one that declines to.

**`buildManifest(profile, options)`** — the assessment as data: the profile it
rests on, every verdict with its reasoning, the notices undertaken, and the date
each duty binds. Deterministic for a given input, so it can be committed and
diffed. The timestamp is supplied by the caller, not read from the clock — a
record that stamps itself is not reproducible.

### The lines worth getting right

Three places where a careless reading gives the wrong answer, each held by a
test:

- The **law-enforcement exemption** lifts the interaction duty — except for a
  system the public uses to report a criminal offence, which owes the
  disclosure anyway.
- **Editorial responsibility** over published text answers the text branch of
  50(4) and leaves the deepfake branch standing. Two triggers, one exemption
  between them.
- An **artistic, creative, satirical or fictional work** does not escape the
  duty; it discharges it in a form that does not hamper the display of the work.

### Dates

| | Applies from |
|---|---|
| 50(1), 50(3), 50(4) | 2026-08-02 |
| 50(2) marking, system placed on the market before that date | 2026-12-02 |

Content generated before the application date is not labelled retroactively.

## What this is not

It is not legal advice, and it is not a safe harbour. It encodes a reading of
the Regulation, and every verdict carries the paragraph and reasoning behind it
precisely so the reading can be checked rather than trusted. The disclosure
wording is a defensible default, not an approved text — a deployer serving a
given market should have counsel read what it ships.

It does not apply the machine-readable marking that 50(2) requires. That is a
technical measure — a watermark, a signed provenance manifest — and the package
says so where the duty arises rather than pretending to discharge it.

## Install and use

```bash
npm install @governancer-foundation/art50-disclosure-sdk
```

Requires Node 20 or later. The package is ESM-only, ships types, and has no
runtime dependencies.

```ts
import {
  resolveObligations,
  planDisclosures,
  firstInteractionNotice,
  chatPrefix,
  buildMarkingClaim,
  buildManifest,
  serialiseManifest,
} from "@governancer-foundation/art50-disclosure-sdk";

// The one line to show before a conversation starts, or undefined.
firstInteractionNotice({ interactsWithPersons: true });
// "You are interacting with an AI system."

// A short label where a banner will not fit.
chatPrefix("fr"); // "[IA]"

// File the assessment as evidence.
const manifest = buildManifest(
  { systemName: "clip-generator", producesDeepfakes: true, artisticWork: true },
  { generatedAt: new Date().toISOString(), sdkVersion: "0.1.0" },
);
serialiseManifest(manifest); // indented JSON, trailing newline, ready to commit
```

## Tests

```bash
npm test          # vitest, one pass
npm run typecheck # source and specs
```

The suite covers each paragraph on both sides of every exemption line, the
notice set each profile produces, all six locales, and the determinism of the
record.

## Status

v0.1 — first release. The API surface above is what the package commits to;
additions are expected, breaking changes are not, before v1.0. See
[`ROADMAP.md`](./ROADMAP.md).

## License

**Apache-2.0** (see [`LICENSE`](./LICENSE) and [`NOTICE`](./NOTICE)).

---

Maintained by **Alexander Brichkin (Agonist Development AB)** under the
`governancer-foundation` open-source commons.
