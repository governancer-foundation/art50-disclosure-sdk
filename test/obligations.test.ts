// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * Each case below states the Article 50 paragraph it exercises. Where the
 * Regulation draws a line — an exemption that reaches one paragraph but not
 * another, a trigger that survives an exemption aimed at its sibling — there is
 * a test on both sides of it.
 */
import { describe, expect, it } from "vitest";

import { APPLICATION_DATE, MARKING_GRACE_DATE, resolveObligations } from "../src/obligations.js";
import type { Paragraph, SystemProfile } from "../src/types.js";

function applies(profile: SystemProfile, paragraph: Paragraph): boolean {
  return resolveObligations(profile).obligations.some(
    (o) => o.paragraph === paragraph && o.applies,
  );
}

function obligation(profile: SystemProfile, paragraph: Paragraph) {
  const found = resolveObligations(profile).obligations.find((o) => o.paragraph === paragraph);
  if (!found) throw new Error(`no verdict for ${paragraph}`);
  return found;
}

describe("50(1) — direct interaction with natural persons", () => {
  it("binds a system that interacts directly with people", () => {
    expect(applies({ interactsWithPersons: true }, "50(1)")).toBe(true);
  });

  it("falls on the provider", () => {
    expect(obligation({ interactsWithPersons: true }, "50(1)").role).toBe("provider");
  });

  it("does not bind a system with no human-facing interaction", () => {
    expect(applies({ interactsWithPersons: false }, "50(1)")).toBe(false);
  });

  it("lifts when the AI nature is obvious", () => {
    const verdict = obligation(
      { interactsWithPersons: true, interactionIsObvious: true },
      "50(1)",
    );
    expect(verdict.applies).toBe(false);
    expect(verdict.exemption).toMatch(/obvious/i);
  });

  it("lifts for an authorised law-enforcement use", () => {
    expect(
      applies({ interactsWithPersons: true, lawEnforcementAuthorised: true }, "50(1)"),
    ).toBe(false);
  });

  it("still binds a law-enforcement system the public uses to report crimes", () => {
    // The carve-out from the law-enforcement exemption: a public crime-reporting
    // system owes the disclosure even though the operator is authorised.
    expect(
      applies(
        {
          interactsWithPersons: true,
          lawEnforcementAuthorised: true,
          publicCrimeReporting: true,
        },
        "50(1)",
      ),
    ).toBe(true);
  });
});

describe("50(2) — machine-readable marking of synthetic output", () => {
  it("binds a system that generates synthetic content", () => {
    expect(applies({ generatesSyntheticContent: ["image"] }, "50(2)")).toBe(true);
  });

  it("does not bind when no modality is generated", () => {
    expect(applies({ generatesSyntheticContent: [] }, "50(2)")).toBe(false);
  });

  it("names the modalities in the reason", () => {
    const verdict = obligation({ generatesSyntheticContent: ["audio", "video"] }, "50(2)");
    expect(verdict.reason).toContain("audio, video");
  });

  it("lifts for assistive editing that does not substantially alter the input", () => {
    const verdict = obligation(
      { generatesSyntheticContent: ["text"], assistiveEditingOnly: true },
      "50(2)",
    );
    expect(verdict.applies).toBe(false);
    expect(verdict.exemption).toMatch(/assistive/i);
  });

  it("binds from the application date for a new system", () => {
    expect(obligation({ generatesSyntheticContent: ["text"] }, "50(2)").applicableFrom).toBe(
      APPLICATION_DATE,
    );
  });

  it("binds from the later date for a system already on the market", () => {
    expect(
      obligation(
        { generatesSyntheticContent: ["text"], placedOnMarketBeforeApplication: true },
        "50(2)",
      ).applicableFrom,
    ).toBe(MARKING_GRACE_DATE);
  });
});

describe("50(3) — emotion recognition and biometric categorisation", () => {
  it("binds on emotion recognition", () => {
    expect(applies({ emotionRecognition: true }, "50(3)")).toBe(true);
  });

  it("binds on biometric categorisation", () => {
    expect(applies({ biometricCategorisation: true }, "50(3)")).toBe(true);
  });

  it("falls on the deployer", () => {
    expect(obligation({ emotionRecognition: true }, "50(3)").role).toBe("deployer");
  });

  it("names both kinds when both operate", () => {
    const verdict = obligation(
      { emotionRecognition: true, biometricCategorisation: true },
      "50(3)",
    );
    expect(verdict.reason).toContain("emotion recognition and biometric categorisation");
  });

  it("lifts for an authorised law-enforcement use", () => {
    expect(applies({ emotionRecognition: true, lawEnforcementAuthorised: true }, "50(3)")).toBe(
      false,
    );
  });
});

describe("50(4) — deepfakes and public-interest text", () => {
  it("binds on deepfake output", () => {
    expect(applies({ producesDeepfakes: true }, "50(4)")).toBe(true);
  });

  it("binds on AI-generated text published on a matter of public interest", () => {
    expect(applies({ publishesPublicInterestText: true }, "50(4)")).toBe(true);
  });

  it("lifts the text branch when a person holds editorial responsibility", () => {
    const verdict = obligation(
      { publishesPublicInterestText: true, humanEditorialControl: true },
      "50(4)",
    );
    expect(verdict.applies).toBe(false);
    expect(verdict.exemption).toMatch(/editorial/i);
  });

  it("keeps the deepfake branch even when editorial control lifts the text branch", () => {
    // Editorial responsibility is an answer about published text. It says
    // nothing about a synthetic video, so the duty survives.
    expect(
      applies(
        {
          producesDeepfakes: true,
          publishesPublicInterestText: true,
          humanEditorialControl: true,
        },
        "50(4)",
      ),
    ).toBe(true);
  });

  it("keeps the duty for an artistic work but reduces its form", () => {
    const verdict = obligation({ producesDeepfakes: true, artisticWork: true }, "50(4)");
    expect(verdict.applies).toBe(true);
    expect(verdict.reducedForm).toMatch(/does not hamper/i);
  });

  it("lifts for an authorised law-enforcement use", () => {
    expect(applies({ producesDeepfakes: true, lawEnforcementAuthorised: true }, "50(4)")).toBe(
      false,
    );
  });
});

describe("the report as a whole", () => {
  it("reports every paragraph, applicable or not", () => {
    const report = resolveObligations({});
    expect(report.obligations.map((o) => o.paragraph)).toEqual([
      "50(1)",
      "50(2)",
      "50(3)",
      "50(4)",
    ]);
  });

  it("gives a reason for every verdict, including the negative ones", () => {
    const report = resolveObligations({});
    for (const o of report.obligations) {
      expect(o.reason.length).toBeGreaterThan(0);
    }
  });

  it("lists the applicable paragraphs", () => {
    const report = resolveObligations({
      interactsWithPersons: true,
      generatesSyntheticContent: ["text"],
    });
    expect(report.applicable).toEqual(["50(1)", "50(2)"]);
  });

  it("reports no duties for a profile that raises none", () => {
    const report = resolveObligations({});
    expect(report.applicable).toEqual([]);
    expect(report.readyBy).toBeUndefined();
  });

  it("takes the earliest live duty as the date to be ready by", () => {
    const report = resolveObligations({
      interactsWithPersons: true,
      generatesSyntheticContent: ["image"],
      placedOnMarketBeforeApplication: true,
    });
    // The marking duty is deferred, but the interaction duty is not.
    expect(report.readyBy).toBe(APPLICATION_DATE);
  });

  it("carries the system name through", () => {
    expect(resolveObligations({ systemName: "support-bot" }).systemName).toBe("support-bot");
  });
});
