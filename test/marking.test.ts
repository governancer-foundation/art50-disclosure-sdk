// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * The machine-readable claim for Article 50(2).
 */
import { describe, expect, it } from "vitest";

import {
  DIGITAL_SOURCE_TYPE,
  MARKING_CLAIM_SCHEMA,
  PROVENANCE_ACTION,
  buildMarkingClaim,
} from "../src/marking.js";
import { MARKING_GRACE_DATE, APPLICATION_DATE } from "../src/obligations.js";
import { DISCLOSURES } from "../src/locales.js";

describe("buildMarkingClaim — when it produces a claim at all", () => {
  it("produces one for a system that generates synthetic output", () => {
    const claim = buildMarkingClaim({ generatesSyntheticContent: ["image"] });
    expect(claim?.schema).toBe(MARKING_CLAIM_SCHEMA);
    expect(claim?.provision).toBe("Regulation (EU) 2024/1689, Article 50(2)");
  });

  it("produces nothing when the system generates nothing synthetic", () => {
    expect(buildMarkingClaim({ interactsWithPersons: true })).toBeUndefined();
  });

  it("produces nothing when an exemption lifts the duty", () => {
    // Marking output you have no duty to mark asserts something about your own
    // system that may not be true, so silence is the right answer here.
    expect(
      buildMarkingClaim({ generatesSyntheticContent: ["text"], assistiveEditingOnly: true }),
    ).toBeUndefined();
    expect(
      buildMarkingClaim({
        generatesSyntheticContent: ["text"],
        lawEnforcementAuthorised: true,
      }),
    ).toBeUndefined();
  });
});

describe("buildMarkingClaim — the provenance vocabulary", () => {
  it("marks generated media as trained-algorithmic media", () => {
    const claim = buildMarkingClaim({ generatesSyntheticContent: ["image"] });
    expect(claim?.digitalSourceType).toBe(
      "http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia",
    );
    expect(claim?.action).toBe("c2pa.created");
  });

  it("marks manipulated media as a composite with trained-algorithmic media", () => {
    const claim = buildMarkingClaim({
      generatesSyntheticContent: ["image"],
      syntheticOutputKind: "manipulated",
    });
    expect(claim?.digitalSourceType).toBe(
      "http://cv.iptc.org/newscodes/digitalsourcetype/compositeWithTrainedAlgorithmicMedia",
    );
    expect(claim?.action).toBe("c2pa.edited");
  });

  it("defaults to generated when the caller does not say", () => {
    const claim = buildMarkingClaim({ generatesSyntheticContent: ["audio"] });
    expect(claim?.digitalSourceType).toBe(DIGITAL_SOURCE_TYPE.generated);
    expect(claim?.action).toBe(PROVENANCE_ACTION.generated);
  });

  it("uses the published vocabulary namespace, not a private one", () => {
    for (const uri of Object.values(DIGITAL_SOURCE_TYPE)) {
      expect(uri.startsWith("http://cv.iptc.org/newscodes/digitalsourcetype/")).toBe(true);
    }
  });
});

describe("buildMarkingClaim — contents", () => {
  it("carries every modality the system produces", () => {
    const claim = buildMarkingClaim({ generatesSyntheticContent: ["audio", "video", "text"] });
    expect(claim?.modalities).toEqual(["audio", "video", "text"]);
  });

  it("does not alias the caller's array", () => {
    const modalities: ("image" | "text")[] = ["image"];
    const claim = buildMarkingClaim({ generatesSyntheticContent: modalities });
    modalities.push("text");
    expect(claim?.modalities).toEqual(["image"]);
  });

  it("carries a human-readable companion in the requested language", () => {
    const claim = buildMarkingClaim({ generatesSyntheticContent: ["image"] }, { locale: "fr" });
    expect(claim?.label).toEqual({ locale: "fr", text: DISCLOSURES.fr.syntheticMarking });
  });

  it("records the producing system when the caller names one", () => {
    const claim = buildMarkingClaim(
      { generatesSyntheticContent: ["image"] },
      { softwareAgent: "studio/2.1" },
    );
    expect(claim?.softwareAgent).toBe("studio/2.1");
  });

  it("omits the producing system rather than inventing one", () => {
    const claim = buildMarkingClaim({ generatesSyntheticContent: ["image"] });
    expect(claim && "softwareAgent" in claim).toBe(false);
  });
});

describe("buildMarkingClaim — when the duty binds", () => {
  it("takes the application date for a new system", () => {
    expect(buildMarkingClaim({ generatesSyntheticContent: ["image"] })?.applicableFrom).toBe(
      APPLICATION_DATE,
    );
  });

  it("takes the later date for a system already on the market", () => {
    const claim = buildMarkingClaim({
      generatesSyntheticContent: ["image"],
      placedOnMarketBeforeApplication: true,
    });
    expect(claim?.applicableFrom).toBe(MARKING_GRACE_DATE);
  });
});
