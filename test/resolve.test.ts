// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * Every requirement this profile names must resolve to the words that bind.
 *
 * The claim the format rests on is that requirements are addressed by
 * identifier and never by restated text. Untested, that claim is a private
 * code with a legal flavour.
 */
import { describe, expect, it } from "vitest";

import { buildAttestation } from "../src/attestation.js";
import {
  INSTRUMENT,
  describeRequirement,
  locateRequirement,
  resolvableRequirements,
} from "../src/resolve.js";

const ATTEST = {
  subject: { name: "x" },
  issued: "2026-08-12T00:00:00.000Z",
  assessor: { name: "Agonist Development AB" },
  sdkVersion: "0.2.0",
};

describe("every identifier the profile emits resolves", () => {
  it("for every paragraph, in every record it can build", () => {
    // The loop this closes: a record names a requirement, and the requirement
    // leads somewhere a reader can check.
    const emitted = buildAttestation(
      { interactsWithPersons: true, generatesSyntheticContent: ["text"] },
      ATTEST,
    ).predicate.assessment.map((e) => e.requirement);

    expect(emitted.length).toBeGreaterThan(0);
    for (const id of emitted) {
      const where = locateRequirement(id);
      expect(where, `unresolvable: ${id}`).toBeDefined();
      expect(where?.sourceUrl).toMatch(/^https:\/\/eur-lex\.europa\.eu\//);
    }
  });

  it("and the resolvable set covers what the profile emits", () => {
    const emitted = new Set(
      buildAttestation({}, ATTEST).predicate.assessment.map((e) => e.requirement),
    );
    const resolvable = new Set(resolvableRequirements());
    for (const id of emitted) expect(resolvable.has(id)).toBe(true);
  });
});

describe("what a resolution carries", () => {
  it("names the instrument and the publisher's own document identifier", () => {
    const where = locateRequirement("EU-2024-1689:Art50.1");
    expect(where?.instrumentName).toContain("2024/1689");
    expect(where?.citation).toBe("CELEX:32024R1689");
  });

  it("anchors the link at the article rather than the top of the act", () => {
    expect(locateRequirement("EU-2024-1689:Art50.2")?.sourceUrl).toContain("#art_50");
  });

  it("describes the provision for a reader who wants prose", () => {
    expect(describeRequirement("EU-2024-1689:Art50.2")).toMatch(/machine-readable marking/i);
  });

  it("points at a corpus only when the caller says where its corpus is", () => {
    // Corpus layout belongs to whoever holds the corpus; inventing a slug
    // would produce a URI that resolves nowhere.
    expect(locateRequirement("EU-2024-1689:Art50.1")?.corpusUri).toBeUndefined();
    expect(
      locateRequirement("EU-2024-1689:Art50.1", { corpusSlug: "eu-ai-act" })?.corpusUri,
    ).toBe("funnel-base://law-texts/eu-ai-act");
  });

  it("uses the stable publisher pointer for the instrument", () => {
    // The act has been amended; a record about a duty in force has to be read
    // against the text in force, and this is the pointer designed for that.
    expect(INSTRUMENT.eli).toBe("http://data.europa.eu/eli/reg/2024/1689/oj");
  });
});

describe("what it declines to resolve", () => {
  it("an identifier belonging to another instrument", () => {
    expect(locateRequirement("EN301549-3.2.1:9.1.1.1")).toBeUndefined();
  });

  it("a provision of this instrument the profile does not cover", () => {
    // Article 6 is real and this profile says nothing about it. A confident
    // wrong pointer is worse than none.
    expect(locateRequirement("EU-2024-1689:Art6.1")).toBeUndefined();
  });

  it("anything malformed, without throwing", () => {
    for (const bad of ["", ":", "EU-2024-1689", "nonsense", "a:b:c"]) {
      expect(() => locateRequirement(bad)).not.toThrow();
      expect(locateRequirement(bad), bad).toBeUndefined();
    }
  });
});
