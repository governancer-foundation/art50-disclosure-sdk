// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * The vocabulary of Article 50 of Regulation (EU) 2024/1689 (the AI Act):
 * who bears each transparency duty, what triggers it, and what lifts it.
 *
 * Paragraph map, as the Regulation numbers them:
 *
 *   50(1)  provider  — tell people they are interacting with an AI system
 *   50(2)  provider  — mark synthetic output in machine-readable form
 *   50(3)  deployer  — tell exposed people that emotion recognition or
 *                      biometric categorisation is operating
 *   50(4)  deployer  — disclose deepfakes, and AI-generated text published to
 *                      inform the public on matters of public interest
 *   50(5)  both      — manner and timing of everything above
 *   50(6)  both      — does not displace other transparency duties
 *
 * This module encodes structure, not legal advice. Each verdict carries the
 * paragraph it rests on so the output can be checked against primary text.
 */

/** Which side of the value chain a duty falls on. */
export type Role = "provider" | "deployer";

/** The paragraphs that impose a duty a caller can act on. */
export type Paragraph = "50(1)" | "50(2)" | "50(3)" | "50(4)";

/** Output kinds that 50(2) marking covers. */
export type SyntheticModality = "audio" | "image" | "video" | "text";

/**
 * What the caller's system does. Every field is optional and defaults to the
 * conservative reading: an unset trigger means the duty is not raised, an unset
 * exemption means the exemption is not claimed.
 */
export interface SystemProfile {
  /** Free-text identifier carried through to the manifest. */
  systemName?: string;

  // ── 50(1) — direct interaction with natural persons ────────────────────
  /** The system is intended to interact directly with natural persons. */
  interactsWithPersons?: boolean;
  /**
   * The AI nature of the interaction is obvious to a reasonably well-informed,
   * observant and circumspect person. The Commission reads this narrowly; a
   * caller asserting it should be able to say why.
   */
  interactionIsObvious?: boolean;

  // ── 50(2) — synthetic content marking ──────────────────────────────────
  /** Output modalities the system generates or manipulates. */
  generatesSyntheticContent?: SyntheticModality[];
  /**
   * The system performs an assistive function for standard editing, or does
   * not substantially alter the input data or its semantics.
   */
  assistiveEditingOnly?: boolean;
  /** The system was placed on the market before the application date. */
  placedOnMarketBeforeApplication?: boolean;

  // ── 50(3) — emotion recognition / biometric categorisation ─────────────
  /** The system recognises emotions. */
  emotionRecognition?: boolean;
  /** The system categorises persons on biometric data. */
  biometricCategorisation?: boolean;

  // ── 50(4) — deepfakes and public-interest text ─────────────────────────
  /** The system generates or manipulates deepfake image, audio or video. */
  producesDeepfakes?: boolean;
  /** Its text output is published to inform the public on matters of public interest. */
  publishesPublicInterestText?: boolean;
  /**
   * That published text underwent human review or editorial control and a
   * natural or legal person holds editorial responsibility for it.
   */
  humanEditorialControl?: boolean;
  /**
   * The output is part of an evidently artistic, creative, satirical or
   * fictional work. This does not remove the duty; it reduces it to disclosing
   * the existence of generated content in a way that does not spoil the work.
   */
  artisticWork?: boolean;

  // ── Cross-cutting exemption ────────────────────────────────────────────
  /**
   * Use is authorised by law to detect, prevent, investigate or prosecute
   * criminal offences, with appropriate safeguards for third-party rights.
   */
  lawEnforcementAuthorised?: boolean;
  /**
   * The system is available to the public for reporting a criminal offence.
   * The law-enforcement exemption to 50(1) does not reach these systems.
   */
  publicCrimeReporting?: boolean;
}

/** The verdict for one paragraph against one profile. */
export interface Obligation {
  paragraph: Paragraph;
  role: Role;
  /** Whether the duty is live for this profile. */
  applies: boolean;
  /** What the duty requires, in the Regulation's own terms. */
  requirement: string;
  /** Why it applies, or why it does not. */
  reason: string;
  /** The exemption that lifted it, when one did. */
  exemption?: string;
  /**
   * A duty that is live but discharged in a reduced form — 50(4) for an
   * artistic work is disclosed without hampering the display of the work.
   */
  reducedForm?: string;
  /** The date from which this duty binds for this profile (ISO 8601). */
  applicableFrom: string;
}

/** The full report for a profile. */
export interface ObligationReport {
  systemName?: string;
  /** Every paragraph considered, in numeric order — including the ones that do not apply. */
  obligations: Obligation[];
  /** The paragraphs that do apply. */
  applicable: Paragraph[];
  /** The date the caller must be ready by: the earliest live duty. */
  readyBy?: string;
}
