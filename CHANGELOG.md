<!--
SPDX-FileCopyrightText: 2026 Agonist Development AB
SPDX-License-Identifier: Apache-2.0
-->

# Changelog

Notable changes to `@governancer-foundation/art50-disclosure-sdk`, newest first. Versions follow
[Semantic Versioning](https://semver.org/); before 1.0 a minor version may add,
and does not break.

## Unreleased

### Added

- The profile declaration, exported as data: the techniques it permits and what
  it means by each outcome value. Two values are reserved and one is unused —
  there is no partial state between telling someone they are speaking to a
  machine and not telling them.
- A worked example that runs end to end, exercised by continuous integration.

## 0.2.0 — 2026-08-10

### Added

- `buildMarkingClaim()` — the provenance values Article 50(2) marking needs, in
  the published vocabulary rather than a private one. Still no watermark:
  returning an object is not discharging a duty.
- `buildAttestation()` — the assessment as an in-toto statement, so existing
  supply-chain verification tooling accepts it unmodified.

### Changed

- The record shape now comes from
  `@governancer-foundation/conformance-attestation` rather than a local copy.
  That dependency is the point: it makes "two regulatory axes share one format"
  checkable in the registry instead of asserted.

### Fixed

- An unpinned subject now says why it carries no digest. An independent
  validator rejected these records, correctly: a digest omitted carelessly and
  one that was never possible looked identical.

## 0.1.0 — 2026-08-10

First release. Obligation resolution for Article 50(1) to 50(4) with the
reasoning attached to every verdict, disclosure wording in six languages, and a
reproducible assessment record.
