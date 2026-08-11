// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * Where each requirement this profile names can be read, in the words that bind.
 *
 * A conformance record names requirements by identifier and never by restated
 * text, precisely so it cannot drift from the law. That is only worth anything
 * if the identifier resolves — otherwise it is a private code with a legal
 * flavour, and a reader has to take our word for what it means.
 *
 * This resolves them. It does not fetch: fetching needs a corpus or a network,
 * and a package that quietly acquired either would be a different dependency
 * than its callers agreed to. Saying precisely where to look is the useful and
 * honest half, and a caller holding the law-text server can take it from there.
 *
 * On versions: the Act has been amended, and a record asserting anything about
 * it should point at the text in force rather than the original publication.
 * The European Legislation Identifier below is the stable pointer designed for
 * exactly that, and it is what a reader who has never heard of us can check.
 */

import {
  parseRequirementId,
  type RequirementLocation,
} from "@governancer-foundation/conformance-attestation";

/** The instrument this profile covers. */
export const INSTRUMENT = {
  /** Identifier segment used in every requirement this profile emits. */
  id: "EU-2024-1689",
  name: "Regulation (EU) 2024/1689 (the Artificial Intelligence Act)",
  /** The publisher's own document identifier. */
  celex: "32024R1689",
  /**
   * European Legislation Identifier — the stable, publisher-assigned pointer.
   * It resolves to the act including its amendments, which is what a record
   * about a duty in force has to be read against.
   */
  eli: "http://data.europa.eu/eli/reg/2024/1689/oj",
} as const;

/** The paragraphs this profile resolves, and what each one is about. */
const PROVISIONS: Record<string, string> = {
  "Art50.1": "Article 50(1) — disclosure of interaction with an AI system",
  "Art50.2": "Article 50(2) — machine-readable marking of synthetic output",
  "Art50.3": "Article 50(3) — notice of emotion recognition or biometric categorisation",
  "Art50.4": "Article 50(4) — disclosure of deepfakes and of published synthetic text",
  "Art50.5": "Article 50(5) — manner and timing of the information",
  "Art50.6": "Article 50(6) — relationship to other transparency obligations",
};

export interface ResolveOptions {
  /**
   * Slug under which a local corpus serves this instrument, if the caller has
   * one. Omitted by default on purpose: corpus layout belongs to whoever holds
   * the corpus, and inventing a slug would produce a URI that resolves nowhere.
   */
  corpusSlug?: string;
}

/**
 * Resolve one of this profile's requirement identifiers.
 *
 * Returns nothing for an identifier belonging to another instrument, or for a
 * provision this profile does not cover — rather than guessing, because a
 * confident wrong pointer is worse than none.
 */
export function locateRequirement(
  requirement: string,
  options: ResolveOptions = {},
): RequirementLocation | undefined {
  const parsed = parseRequirementId(requirement);
  if (!parsed || parsed.instrument !== INSTRUMENT.id) return undefined;

  const description = PROVISIONS[parsed.provision];
  if (!description) return undefined;

  const article = parsed.provision.replace(/^Art(\d+)\..*$/, "$1");

  return {
    requirement,
    instrument: parsed.instrument,
    provision: parsed.provision,
    instrumentName: INSTRUMENT.name,
    citation: `CELEX:${INSTRUMENT.celex}`,
    // Anchored at the article so a reader lands on the provision, not on a
    // hundred and thirteen articles of preamble.
    sourceUrl: `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${INSTRUMENT.celex}#art_${article}`,
    ...(options.corpusSlug
      ? { corpusUri: `funnel-base://law-texts/${options.corpusSlug}` }
      : {}),
  };
}

/** Every requirement identifier this profile can resolve. */
export function resolvableRequirements(): string[] {
  return Object.keys(PROVISIONS).map((p) => `${INSTRUMENT.id}:${p}`);
}

/** What a provision is about, for a reader who wants prose rather than a link. */
export function describeRequirement(requirement: string): string | undefined {
  const parsed = parseRequirementId(requirement);
  if (!parsed || parsed.instrument !== INSTRUMENT.id) return undefined;
  return PROVISIONS[parsed.provision];
}
