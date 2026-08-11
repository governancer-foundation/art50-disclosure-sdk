// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * The Article 50 assessment as a signed-transportable attestation.
 *
 * The supply-chain ecosystem already standardised the envelope, the signature
 * and the verification path: an in-toto Statement carries a subject, a
 * predicate type and a payload, and DSSE signs it. Build provenance, component
 * inventories and vulnerability exploitability all travel that way. Nothing in
 * it answers "which regulatory requirements does this meet, and on what
 * evidence" — so that is the gap this fills, as a predicate rather than as a
 * new envelope.
 *
 * Emitting the shape here does not make a record trustworthy. Signing does,
 * and this package does not sign: DSSE and a transparency log are somebody
 * else's well-solved problem. What it produces is the payload they carry.
 *
 * @see https://github.com/in-toto/attestation — Statement and DSSE
 */

import {
  PREDICATE_TYPE,
  STATEMENT_TYPE,
  type AssessmentEntry,
  type AttestationSubject,
  type ConformanceStatement,
  type Outcome,
} from "@governancer-foundation/conformance-attestation";

import { resolveObligations } from "./obligations.js";
import type { Obligation, Paragraph, SystemProfile } from "./types.js";

export type { AssessmentEntry, AttestationSubject, Outcome };
export { STATEMENT_TYPE };

/** The statement this profile produces. Shape owned by the shared schema. */
export type ConformanceAttestation = ConformanceStatement;

/**
 * Predicate type URI emitted by this profile.
 *
 * Re-exported from the shared schema, and provisional there: a predicate type
 * must be a stable URI, and the neutral home the schema should live under is
 * not settled. Pass your own to pin it.
 */
export const CONFORMANCE_PREDICATE_TYPE = PREDICATE_TYPE;

/** Profile identifier for this axis. */
export const PROFILE_ID = "ai-act/art-50";

export interface AttestationOptions {
  subject: AttestationSubject;
  /** ISO 8601 instant. Supplied, not read from the clock, so records reproduce. */
  issued: string;
  assessor: { name: string; independence?: "self" | "second-party" | "third-party" };
  /** Version of this package, recorded as the tool that made the determination. */
  sdkVersion: string;
  /** Additional limitations beyond the ones this package always declares. */
  limitations?: string[];
  /** Override the provisional predicate type with a stable one. */
  predicateType?: string;
}

/**
 * Limitations this package declares of itself, always.
 *
 * A record without an explicit statement of what was not checked is invalid
 * under the schema, and rightly: it is the difference between machine-readable
 * honesty and a marketing claim. These are this tool's, and the caller adds
 * whatever else is true of its own assessment.
 */
const INHERENT_LIMITATIONS = [
  "The determination is made from a declared description of the system, not from observing the system. Nothing here verifies that the description is accurate.",
  "Whether a disclosure was actually shown, and whether it was clear, distinguishable and accessible as Article 50(5) requires, is not assessed.",
  "Machine-readable marking under Article 50(2) is reported as a duty, never as discharged: this package does not apply or detect a mark.",
  "This is a reading of the Regulation, not legal advice, and not an assessment by an independent body.",
];

function outcomeFor(obligation: Obligation): Outcome {
  // A duty that binds has not been met by being identified — the record says
  // it applies and remains open, which is `notEvaluated`, not `supports`.
  // Claiming support here would be the exact overstatement the vocabulary's
  // missing fifth value exists to prevent.
  return obligation.applies ? "notEvaluated" : "notApplicable";
}

function requirementId(paragraph: Paragraph): string {
  return `EU-2024-1689:Art${paragraph.replace(/^50\((\d)\)$/, "50.$1")}`;
}

/**
 * Build the attestation for a profile.
 *
 * Every paragraph appears, including the ones that do not bind, each with the
 * reasoning behind its outcome and the exemption claimed where one was.
 */
export function buildAttestation(
  profile: SystemProfile,
  options: AttestationOptions,
): ConformanceAttestation {
  const report = resolveObligations(profile);

  const assessment: AssessmentEntry[] = report.obligations.map((o) => ({
    requirement: requirementId(o.paragraph),
    outcome: outcomeFor(o),
    rationale: o.reason,
    ...(o.exemption ? { exemptionClaimed: o.exemption } : {}),
    ...(o.applies ? { bindingFrom: o.applicableFrom } : {}),
  }));

  const subject: AttestationSubject =
    options.subject.digest && Object.keys(options.subject.digest).length > 0
      ? options.subject
      : {
          ...options.subject,
          unpinned:
            options.subject.unpinned ??
            "An Article 50 duty attaches to a deployed system's behaviour, and the marking duty to outputs not yet produced; there is no artefact to digest.",
        };

  return {
    _type: STATEMENT_TYPE,
    subject: [subject],
    predicateType: options.predicateType ?? CONFORMANCE_PREDICATE_TYPE,
    predicate: {
      profile: { id: PROFILE_ID, version: "0.1" },
      assessment,
      method: {
        techniques: ["declaredSystemDescription"],
        tools: [{ name: "@governancer-foundation/art50-disclosure-sdk", version: options.sdkVersion }],
      },
      limitations: [...INHERENT_LIMITATIONS, ...(options.limitations ?? [])],
      assessor: {
        name: options.assessor.name,
        independence: options.assessor.independence ?? "self",
      },
      validity: { issued: options.issued },
    },
  };
}
