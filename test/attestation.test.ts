// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * The assessment as an in-toto statement carrying a conformance predicate.
 */
import { describe, expect, it } from "vitest";

import {
  CONFORMANCE_PREDICATE_TYPE,
  PROFILE_ID,
  STATEMENT_TYPE,
  buildAttestation,
} from "../src/attestation.js";
import { APPLICATION_DATE } from "../src/obligations.js";

const OPTIONS = {
  subject: { name: "support-bot" },
  issued: "2026-08-11T00:00:00.000Z",
  assessor: { name: "Agonist Development AB" },
  sdkVersion: "0.2.0",
};

describe("the envelope", () => {
  it("is an in-toto statement", () => {
    const a = buildAttestation({ interactsWithPersons: true }, OPTIONS);
    expect(a._type).toBe(STATEMENT_TYPE);
    expect(a._type).toBe("https://in-toto.io/Statement/v1");
  });

  it("carries the conformance predicate type", () => {
    expect(buildAttestation({}, OPTIONS).predicateType).toBe(CONFORMANCE_PREDICATE_TYPE);
  });

  it("lets a caller pin a stable predicate type", () => {
    const a = buildAttestation({}, { ...OPTIONS, predicateType: "https://example.org/c/v1" });
    expect(a.predicateType).toBe("https://example.org/c/v1");
  });

  it("names the profile that interprets the payload", () => {
    expect(buildAttestation({}, OPTIONS).predicate.profile).toEqual({
      id: PROFILE_ID,
      version: "0.1",
    });
  });

  it("carries the subject through, digest and all", () => {
    const subject = { name: "clip-gen", digest: { sha256: "abc123" } };
    expect(buildAttestation({}, { ...OPTIONS, subject }).subject).toEqual([subject]);
  });

  it("leaves the subject unpinned rather than inventing a digest", () => {
    // An Article 50 duty attaches to a deployed system's behaviour, not to an
    // artefact, so there is often nothing to hash. Saying so beats a hash that
    // means nothing.
    const a = buildAttestation({}, OPTIONS);
    expect(a.subject[0]?.digest).toBeUndefined();
  });

  it("states why an unpinned subject is unpinned", () => {
    // A silently absent digest and one that was never possible are different
    // facts. The schema rejects a record that does not distinguish them.
    const a = buildAttestation({}, OPTIONS);
    expect(a.subject[0]?.unpinned).toMatch(/no artefact to digest/i);
  });

  it("does not add a reason to a subject that is pinned", () => {
    const subject = { name: "clip.mp4", digest: { sha256: "abc123" } };
    const a = buildAttestation({}, { ...OPTIONS, subject });
    expect(a.subject[0]?.unpinned).toBeUndefined();
  });

  it("keeps a reason the caller supplied instead of substituting its own", () => {
    const subject = { name: "svc", unpinned: "Rolling deployment, no fixed build." };
    const a = buildAttestation({}, { ...OPTIONS, subject });
    expect(a.subject[0]?.unpinned).toBe("Rolling deployment, no fixed build.");
  });
});

describe("the assessment", () => {
  it("records every paragraph, binding or not", () => {
    const a = buildAttestation({ interactsWithPersons: true }, OPTIONS);
    expect(a.predicate.assessment).toHaveLength(4);
  });

  it("identifies requirements against the instrument, not by local shorthand", () => {
    const ids = buildAttestation({}, OPTIONS).predicate.assessment.map((e) => e.requirement);
    expect(ids).toEqual([
      "EU-2024-1689:Art50.1",
      "EU-2024-1689:Art50.2",
      "EU-2024-1689:Art50.3",
      "EU-2024-1689:Art50.4",
    ]);
  });

  it("marks a duty that binds as open, never as met", () => {
    // Identifying a duty is not discharging it. Reporting "supports" here is
    // the overstatement the vocabulary's fifth value exists to prevent.
    const entry = buildAttestation({ interactsWithPersons: true }, OPTIONS).predicate.assessment.find(
      (e) => e.requirement === "EU-2024-1689:Art50.1",
    );
    expect(entry?.outcome).toBe("notEvaluated");
    expect(entry?.bindingFrom).toBe(APPLICATION_DATE);
  });

  it("marks a duty that does not reach the system as not applicable", () => {
    const entry = buildAttestation({}, OPTIONS).predicate.assessment.find(
      (e) => e.requirement === "EU-2024-1689:Art50.2",
    );
    expect(entry?.outcome).toBe("notApplicable");
    expect(entry?.bindingFrom).toBeUndefined();
  });

  it("separates an exemption claimed from the reasoning around it", () => {
    // A requirement that never reaches you and one lifted by an exemption you
    // claim are different: the second is an assertion that can be wrong, and
    // that is where the liability sits. A reader must find every claim without
    // reading prose.
    const a = buildAttestation(
      { interactsWithPersons: true, lawEnforcementAuthorised: true },
      OPTIONS,
    );
    const entry = a.predicate.assessment.find((e) => e.requirement === "EU-2024-1689:Art50.1");
    expect(entry?.outcome).toBe("notApplicable");
    expect(entry?.exemptionClaimed).toMatch(/authorised by law/i);
  });

  it("claims no exemption where none was made", () => {
    const entry = buildAttestation({}, OPTIONS).predicate.assessment.find(
      (e) => e.requirement === "EU-2024-1689:Art50.1",
    );
    expect(entry && "exemptionClaimed" in entry).toBe(false);
  });

  it("carries the deferred date for a marking duty on an existing system", () => {
    const entry = buildAttestation(
      { generatesSyntheticContent: ["image"], placedOnMarketBeforeApplication: true },
      OPTIONS,
    ).predicate.assessment.find((e) => e.requirement === "EU-2024-1689:Art50.2");
    expect(entry?.bindingFrom).toBe("2026-12-02");
  });
});

describe("limitations", () => {
  it("always declares what the tool cannot know", () => {
    const l = buildAttestation({}, OPTIONS).predicate.limitations;
    expect(l.length).toBeGreaterThanOrEqual(4);
    expect(l.join(" ")).toMatch(/not from observing the system/i);
    expect(l.join(" ")).toMatch(/never as discharged/i);
  });

  it("appends the caller's own limitations after its own", () => {
    const l = buildAttestation({}, { ...OPTIONS, limitations: ["Mobile client excluded."] })
      .predicate.limitations;
    expect(l[l.length - 1]).toBe("Mobile client excluded.");
  });
});

describe("method and assessor", () => {
  it("says the determination came from a declaration, not an observation", () => {
    expect(buildAttestation({}, OPTIONS).predicate.method.techniques).toEqual([
      "declaredSystemDescription",
    ]);
  });

  it("records the tool and its version", () => {
    expect(buildAttestation({}, OPTIONS).predicate.method.tools).toEqual([
      { name: "@governancer-foundation/art50-disclosure-sdk", version: "0.2.0" },
    ]);
  });

  it("defaults independence to self-assessment rather than flattering the assessor", () => {
    expect(buildAttestation({}, OPTIONS).predicate.assessor.independence).toBe("self");
  });

  it("honours a declared independence", () => {
    const a = buildAttestation({}, {
      ...OPTIONS,
      assessor: { name: "Notified body", independence: "third-party" },
    });
    expect(a.predicate.assessor.independence).toBe("third-party");
  });
});

describe("reproducibility", () => {
  it("produces the same record for the same input", () => {
    const p = { interactsWithPersons: true, generatesSyntheticContent: ["text" as const] };
    expect(buildAttestation(p, OPTIONS)).toEqual(buildAttestation(p, OPTIONS));
  });

  it("takes its timestamp from the caller", () => {
    expect(buildAttestation({}, OPTIONS).predicate.validity.issued).toBe(OPTIONS.issued);
  });
});

describe("the record satisfies the shared schema, checked by its own validator", () => {
  it("passes for an unpinned subject", async () => {
    // The portability claim, made checkable: a record this package produces is
    // verified by a validator that lives in a different package and knows
    // nothing about Article 50.
    const { validateStatement } = await import("@governancer-foundation/conformance-attestation");
    const result = validateStatement(buildAttestation({ interactsWithPersons: true }, OPTIONS));
    expect(result.errors).toEqual([]);
  });

  it("passes for a pinned subject", async () => {
    const { validateStatement } = await import("@governancer-foundation/conformance-attestation");
    const a = buildAttestation({}, { ...OPTIONS, subject: { name: "clip.mp4", digest: { sha256: "abc" } } });
    expect(validateStatement(a).errors).toEqual([]);
  });

  it("passes for every exemption branch the profile can take", async () => {
    const { validateStatement } = await import("@governancer-foundation/conformance-attestation");
    const profiles = [
      { interactsWithPersons: true, lawEnforcementAuthorised: true },
      { interactsWithPersons: true, interactionIsObvious: true },
      { generatesSyntheticContent: ["text" as const], assistiveEditingOnly: true },
      { publishesPublicInterestText: true, humanEditorialControl: true },
      { producesDeepfakes: true, artisticWork: true },
      { emotionRecognition: true, biometricCategorisation: true },
    ];
    for (const p of profiles) {
      expect(validateStatement(buildAttestation(p, OPTIONS)).errors, JSON.stringify(p)).toEqual([]);
    }
  });
});

describe("the profile declaration", () => {
  it("names the axis the attestation reports", async () => {
    const { PROFILE } = await import("../src/profile.js");
    const a = buildAttestation({}, OPTIONS);
    expect(a.predicate.profile).toEqual({ id: PROFILE.id, version: PROFILE.version });
  });

  it("permits exactly the technique the attestation uses", async () => {
    // A record claiming a technique its own profile does not declare would be
    // unverifiable by anyone downstream.
    const { PROFILE } = await import("../src/profile.js");
    for (const t of buildAttestation({}, OPTIONS).predicate.method.techniques) {
      expect(PROFILE.techniques).toContain(t);
    }
  });

  it("explains every outcome value it can emit", async () => {
    const { PROFILE } = await import("../src/profile.js");
    const emitted = new Set(
      [
        buildAttestation({ interactsWithPersons: true }, OPTIONS),
        buildAttestation({}, OPTIONS),
      ].flatMap((a) => a.predicate.assessment.map((e) => e.outcome)),
    );
    for (const o of emitted) expect(PROFILE.outcomeMapping[o]).toBeTruthy();
  });

  it("explains the values it deliberately does not emit, and why", async () => {
    const { PROFILE } = await import("../src/profile.js");
    expect(PROFILE.outcomeMapping.partiallySupports).toMatch(/not used/i);
    expect(PROFILE.outcomeMapping.supports).toMatch(/reserved/i);
  });
});
