// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * art50-disclosure-sdk — the transparency duties of Article 50 of Regulation
 * (EU) 2024/1689 (the AI Act), as code.
 *
 * Three things, in the order a caller needs them:
 *
 *   1. resolveObligations(profile)   — which paragraphs bind you, and why
 *   2. planDisclosures(profile)      — the notices to show, where, in which language
 *   3. buildMarkingClaim(profile, …) — the provenance values 50(2) marking needs
 *   4. buildManifest(profile, …)     — a machine-readable record of the assessment
 *   5. buildAttestation(profile, …)  — the same, as a signable in-toto statement
 *
 * The Regulation is the authority; this package is a reading of it. Every
 * verdict carries the paragraph and the reason behind it so the reading can be
 * checked rather than trusted.
 */

export {
  APPLICATION_DATE,
  MARKING_GRACE_DATE,
  resolveObligations,
} from "./obligations.js";

export {
  chatPrefix,
  firstInteractionNotice,
  planDisclosures,
  type DisclosureOptions,
  type DisclosurePlan,
  type Notice,
  type Placement,
} from "./disclosure.js";

export {
  DISCLOSURES,
  LOCALES,
  isLocale,
  resolveLocale,
  type DisclosureStrings,
  type Locale,
} from "./locales.js";

export { PROFILE } from "./profile.js";

export {
  CONFORMANCE_PREDICATE_TYPE,
  PROFILE_ID,
  STATEMENT_TYPE,
  buildAttestation,
  type AssessmentEntry,
  type AttestationOptions,
  type AttestationSubject,
  type ConformanceAttestation,
  type Outcome,
} from "./attestation.js";

export {
  DIGITAL_SOURCE_TYPE,
  MARKING_CLAIM_SCHEMA,
  PROVENANCE_ACTION,
  buildMarkingClaim,
  type MarkingClaim,
  type MarkingOptions,
} from "./marking.js";

export {
  MANIFEST_SCHEMA,
  buildManifest,
  serialiseManifest,
  type DisclosureManifest,
  type ManifestOptions,
} from "./manifest.js";

export type {
  Obligation,
  ObligationReport,
  Paragraph,
  Role,
  SyntheticModality,
  SystemProfile,
} from "./types.js";
