// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * Invariants across the whole profile space.
 *
 * A system profile is a dozen independent flags, which is several hundred
 * combinations before counting the modality list. The example-based suite
 * exercises the interesting handful by hand — the exemption edges, the branches
 * that interact — and that is the right way to cover the cases a reader needs
 * explained.
 *
 * It says nothing about the other several hundred. These do: properties that
 * must hold for every profile, checked against generated ones. Where an
 * example test documents a decision, a property test defends a guarantee.
 *
 * The strongest one is last: every record this package can produce, for any
 * profile whatsoever, validates against the separate package that owns the
 * record's shape.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { validateStatement } from "@governancer-foundation/conformance-attestation";

import { buildAttestation } from "../src/attestation.js";
import { buildMarkingClaim } from "../src/marking.js";
import { planDisclosures } from "../src/disclosure.js";
import { buildManifest } from "../src/manifest.js";
import { LOCALES } from "../src/locales.js";
import { APPLICATION_DATE, MARKING_GRACE_DATE, resolveObligations } from "../src/obligations.js";
import type { Paragraph, SystemProfile, SyntheticModality } from "../src/types.js";

const PARAGRAPHS: Paragraph[] = ["50(1)", "50(2)", "50(3)", "50(4)"];
const MODALITIES: SyntheticModality[] = ["audio", "image", "video", "text"];

/** The whole profile space, including combinations nobody would write by hand. */
const arbProfile = (): fc.Arbitrary<SystemProfile> =>
  fc.record(
    {
      systemName: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: undefined }),
      interactsWithPersons: fc.boolean(),
      interactionIsObvious: fc.boolean(),
      generatesSyntheticContent: fc.subarray(MODALITIES),
      syntheticOutputKind: fc.constantFrom("generated" as const, "manipulated" as const),
      assistiveEditingOnly: fc.boolean(),
      placedOnMarketBeforeApplication: fc.boolean(),
      emotionRecognition: fc.boolean(),
      biometricCategorisation: fc.boolean(),
      producesDeepfakes: fc.boolean(),
      publishesPublicInterestText: fc.boolean(),
      humanEditorialControl: fc.boolean(),
      artisticWork: fc.boolean(),
      lawEnforcementAuthorised: fc.boolean(),
      publicCrimeReporting: fc.boolean(),
    },
    { requiredKeys: [] },
  );

const arbLocale = (): fc.Arbitrary<string> => fc.constantFrom(...LOCALES, "pl", "fr-BE", "");

const STAMP = { generatedAt: "2026-08-12T00:00:00.000Z", sdkVersion: "0.2.0" };
const ATTEST = {
  subject: { name: "generated" },
  issued: "2026-08-12T00:00:00.000Z",
  assessor: { name: "Agonist Development AB" },
  sdkVersion: "0.2.0",
};

describe("the obligation report, for any profile", () => {
  it("reports every paragraph, in order, always", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        const report = resolveObligations(profile);
        expect(report.obligations.map((o) => o.paragraph)).toEqual(PARAGRAPHS);
      }),
    );
  });

  it("gives every verdict a reason, including the negative ones", () => {
    // The reason is the output. A verdict without one cannot be reviewed, and
    // an unreviewable verdict is worse than no verdict at all.
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        for (const o of resolveObligations(profile).obligations) {
          expect(o.reason.trim().length).toBeGreaterThan(0);
        }
      }),
    );
  });

  it("never claims an exemption for a duty that applies", () => {
    // An exemption lifts a duty. Carrying one beside a live duty would assert
    // two incompatible things at once.
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        for (const o of resolveObligations(profile).obligations) {
          if (o.applies) expect(o.exemption).toBeUndefined();
        }
      }),
    );
  });

  it("lists exactly the paragraphs that apply", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        const report = resolveObligations(profile);
        expect(report.applicable).toEqual(
          report.obligations.filter((o) => o.applies).map((o) => o.paragraph),
        );
      }),
    );
  });

  it("takes the earliest live duty as the date to be ready by, or none", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        const report = resolveObligations(profile);
        const dates = report.obligations.filter((o) => o.applies).map((o) => o.applicableFrom);
        if (dates.length === 0) expect(report.readyBy).toBeUndefined();
        else expect(report.readyBy).toBe([...dates].sort()[0]);
      }),
    );
  });

  it("only ever binds from one of the two dates the Regulation names", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        for (const o of resolveObligations(profile).obligations) {
          expect([APPLICATION_DATE, MARKING_GRACE_DATE]).toContain(o.applicableFrom);
        }
      }),
    );
  });

  it("defers only the marking duty, and only for a system already on the market", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        for (const o of resolveObligations(profile).obligations) {
          if (o.applicableFrom === MARKING_GRACE_DATE) {
            expect(o.paragraph).toBe("50(2)");
            expect(profile.placedOnMarketBeforeApplication).toBe(true);
          }
        }
      }),
    );
  });

  it("is deterministic", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        expect(resolveObligations(profile)).toEqual(resolveObligations(profile));
      }),
    );
  });

  it("does not mutate the profile it was given", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        const before = JSON.stringify(profile);
        resolveObligations(profile);
        expect(JSON.stringify(profile)).toBe(before);
      }),
    );
  });
});

describe("the notice set, for any profile and any language tag", () => {
  it("never speaks for a paragraph that does not apply", () => {
    fc.assert(
      fc.property(arbProfile(), arbLocale(), (profile, locale) => {
        const plan = planDisclosures(profile, { locale });
        const live = new Set(plan.report.applicable);
        for (const n of plan.notices) expect(live.has(n.paragraph)).toBe(true);
      }),
    );
  });

  it("renders text for every notice except the machine-readable one", () => {
    fc.assert(
      fc.property(arbProfile(), arbLocale(), (profile, locale) => {
        for (const n of planDisclosures(profile, { locale }).notices) {
          if (n.placement === "machine-readable") expect(n.text).toBe("");
          else expect(n.text.trim().length).toBeGreaterThan(0);
        }
      }),
    );
  });

  it("resolves any language tag to a shipped locale", () => {
    fc.assert(
      fc.property(arbProfile(), arbLocale(), (profile, locale) => {
        expect(LOCALES).toContain(planDisclosures(profile, { locale }).locale);
      }),
    );
  });
});

describe("the marking claim, for any profile", () => {
  it("exists exactly when the marking duty applies", () => {
    // Marking output you have no duty to mark asserts something about your own
    // system that may not be true; staying silent is the other half of that.
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        const applies = resolveObligations(profile).applicable.includes("50(2)");
        expect(buildMarkingClaim(profile) !== undefined).toBe(applies);
      }),
    );
  });

  it("carries the binding date the report gives for the same duty", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        const claim = buildMarkingClaim(profile);
        if (!claim) return;
        const duty = resolveObligations(profile).obligations.find((o) => o.paragraph === "50(2)");
        expect(claim.applicableFrom).toBe(duty?.applicableFrom);
      }),
    );
  });
});

describe("the records, for any profile", () => {
  it("record every paragraph considered", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        expect(buildManifest(profile, STAMP).obligations).toHaveLength(4);
        expect(buildAttestation(profile, ATTEST).predicate.assessment).toHaveLength(4);
      }),
    );
  });

  it("never report a live duty as met", () => {
    // Identifying an obligation is not discharging it, and this is the value
    // the outcome vocabulary's fifth entry exists to carry.
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        for (const e of buildAttestation(profile, ATTEST).predicate.assessment) {
          expect(["notEvaluated", "notApplicable"]).toContain(e.outcome);
        }
      }),
    );
  });

  it("always declare what the tool could not know", () => {
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        expect(
          buildAttestation(profile, ATTEST).predicate.limitations.length,
        ).toBeGreaterThanOrEqual(4);
      }),
    );
  });

  it("validate against the package that owns the record's shape", () => {
    // The guarantee this whole file exists for. Not "the examples we wrote
    // produce valid records" but "no profile exists that produces an invalid
    // one" — and a counterexample would be shrunk to its smallest form.
    fc.assert(
      fc.property(arbProfile(), (profile) => {
        const result = validateStatement(buildAttestation(profile, ATTEST));
        expect(result.errors).toEqual([]);
      }),
      { numRuns: 300 },
    );
  });
});
