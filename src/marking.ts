// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * The machine-readable half of Article 50(2), in the vocabulary the tools that
 * actually apply the mark already speak.
 *
 * 50(2) requires synthetic output to be marked in a machine-readable format and
 * detectable as artificially generated or manipulated, by solutions that are
 * "effective, interoperable, robust and reliable". The Regulation names no
 * standard — it is written to be technology-neutral — but interoperability is
 * one of its four adjectives, and inventing a private shape would work against
 * the word it uses.
 *
 * So this module emits the two values a provenance manifest needs and nothing
 * more: the IPTC digital-source-type term describing how the media came about,
 * and the corresponding action. Both drop straight into a C2PA manifest; both
 * are equally usable by anything else that reads the same vocabulary.
 *
 * What this module does NOT do is apply the mark. Embedding and signing is a
 * cryptographic and media-format problem, and a package that pretended to
 * discharge the duty by returning an object would be worse than one that
 * declines to.
 *
 * Vocabulary: http://cv.iptc.org/newscodes/digitalsourcetype/
 */

import { DISCLOSURES, resolveLocale, type Locale } from "./locales.js";
import { resolveObligations } from "./obligations.js";
import type { SyntheticModality, SystemProfile } from "./types.js";

/** Schema identifier, versioned independently of the package. */
export const MARKING_CLAIM_SCHEMA = "art50-marking-claim/v1";

/**
 * IPTC Digital Source Type NewsCodes, by how the media came about.
 *
 * - `generated` — created by a model trained on captured content
 * - `manipulated` — captured content augmented or altered by such a model
 */
export const DIGITAL_SOURCE_TYPE = {
  generated: "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
  manipulated:
    "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
} as const;

/** The provenance action that carries the source type. */
export const PROVENANCE_ACTION = {
  generated: "c2pa.created",
  manipulated: "c2pa.edited",
} as const;

export interface MarkingClaim {
  schema: typeof MARKING_CLAIM_SCHEMA;
  /** The provision the mark discharges. */
  provision: "Regulation (EU) 2024/1689, Article 50(2)";
  /** IPTC NewsCode URI naming how the media came about. */
  digitalSourceType: string;
  /** The provenance action the source type belongs to. */
  action: string;
  /** Output kinds this claim covers. */
  modalities: SyntheticModality[];
  /**
   * A human-readable companion. It does not satisfy 50(2) — the machine-
   * readable mark is the duty — but a viewer that surfaces provenance to a
   * person needs words, and these are the same words the notice uses.
   */
  label: { locale: Locale; text: string };
  /** The date the marking duty binds for this system (ISO 8601). */
  applicableFrom: string;
  /** Identifier of the producing system, when the caller supplies one. */
  softwareAgent?: string;
}

export interface MarkingOptions {
  /** Language tag for the human-readable companion. Defaults to English. */
  locale?: string;
  /** Identifier of the producing system, recorded in the claim. */
  softwareAgent?: string;
}

/**
 * Build the claim for a profile, or `undefined` when 50(2) does not bind it.
 *
 * Returning nothing rather than an empty claim is deliberate: a caller that
 * marks output it has no duty to mark is asserting something about its own
 * system that may not be true.
 */
export function buildMarkingClaim(
  profile: SystemProfile,
  options: MarkingOptions = {},
): MarkingClaim | undefined {
  const duty = resolveObligations(profile).obligations.find((o) => o.paragraph === "50(2)");
  if (!duty?.applies) return undefined;

  const kind = profile.syntheticOutputKind ?? "generated";
  const locale = resolveLocale(options.locale);

  return {
    schema: MARKING_CLAIM_SCHEMA,
    provision: "Regulation (EU) 2024/1689, Article 50(2)",
    digitalSourceType: DIGITAL_SOURCE_TYPE[kind],
    action: PROVENANCE_ACTION[kind],
    modalities: [...(profile.generatesSyntheticContent ?? [])],
    label: { locale, text: DISCLOSURES[locale].syntheticMarking },
    applicableFrom: duty.applicableFrom,
    ...(options.softwareAgent ? { softwareAgent: options.softwareAgent } : {}),
  };
}
