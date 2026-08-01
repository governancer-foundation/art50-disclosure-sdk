// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * The notice set a profile produces, and the record of it.
 */
import { describe, expect, it } from "vitest";

import {
  chatPrefix,
  firstInteractionNotice,
  planDisclosures,
} from "../src/disclosure.js";
import { LOCALES, DISCLOSURES } from "../src/locales.js";
import { buildManifest, serialiseManifest, MANIFEST_SCHEMA } from "../src/manifest.js";

const STAMP = { generatedAt: "2026-08-01T00:00:00.000Z", sdkVersion: "0.1.0" };

describe("planDisclosures", () => {
  it("produces no notice when no duty applies", () => {
    expect(planDisclosures({}).notices).toEqual([]);
  });

  it("shows the interaction notice at the first interaction", () => {
    const [notice] = planDisclosures({ interactsWithPersons: true }).notices;
    expect(notice?.paragraph).toBe("50(1)");
    expect(notice?.placement).toBe("first-interaction");
    expect(notice?.text).toBe(DISCLOSURES.en.interaction);
  });

  it("omits the periodic reminder unless asked for it", () => {
    const plan = planDisclosures({ interactsWithPersons: true });
    expect(plan.notices.some((n) => n.placement === "periodic")).toBe(false);
  });

  it("adds the periodic reminder on request", () => {
    const plan = planDisclosures({ interactsWithPersons: true }, { periodicReminder: true });
    expect(plan.notices.some((n) => n.placement === "periodic")).toBe(true);
  });

  it("pairs the machine-readable duty with a human-readable companion", () => {
    const plan = planDisclosures({ generatesSyntheticContent: ["image"] });
    const placements = plan.notices.map((n) => n.placement);
    expect(placements).toContain("machine-readable");
    expect(placements).toContain("on-content");
  });

  it("says plainly that the marking itself is the caller's job", () => {
    const plan = planDisclosures({ generatesSyntheticContent: ["image"] });
    const marking = plan.notices.find((n) => n.placement === "machine-readable");
    expect(marking?.note).toMatch(/does not apply/i);
  });

  it("emits one notice per operating biometric function", () => {
    const plan = planDisclosures({ emotionRecognition: true, biometricCategorisation: true });
    expect(plan.notices.filter((n) => n.paragraph === "50(3)")).toHaveLength(2);
  });

  it("uses the softened wording for an artistic work", () => {
    const plan = planDisclosures({ producesDeepfakes: true, artisticWork: true });
    const notice = plan.notices.find((n) => n.paragraph === "50(4)");
    expect(notice?.text).toBe(DISCLOSURES.en.artisticWork);
  });

  it("uses the plain wording for a deepfake outside an artistic work", () => {
    const plan = planDisclosures({ producesDeepfakes: true });
    const notice = plan.notices.find((n) => n.paragraph === "50(4)");
    expect(notice?.text).toBe(DISCLOSURES.en.deepfake);
  });

  it("carries the full obligation report alongside the notices", () => {
    const plan = planDisclosures({ interactsWithPersons: true });
    expect(plan.report.obligations).toHaveLength(4);
  });
});

describe("locales", () => {
  it("renders the notice in a requested language", () => {
    const plan = planDisclosures({ interactsWithPersons: true }, { locale: "de" });
    expect(plan.locale).toBe("de");
    expect(plan.notices[0]?.text).toBe(DISCLOSURES.de.interaction);
  });

  it("resolves a regional tag to its base language", () => {
    expect(planDisclosures({}, { locale: "fr-BE" }).locale).toBe("fr");
  });

  it("falls back to English for an unshipped language", () => {
    expect(planDisclosures({}, { locale: "pl" }).locale).toBe("en");
  });

  it("ships a complete, non-empty string set for every locale", () => {
    for (const locale of LOCALES) {
      const strings = DISCLOSURES[locale];
      for (const [key, value] of Object.entries(strings)) {
        expect(value.length, `${locale}.${key} is empty`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every locale's key set identical to English", () => {
    const reference = Object.keys(DISCLOSURES.en).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(DISCLOSURES[locale]).sort(), locale).toEqual(reference);
    }
  });

  it("translates — no locale but English reuses the English interaction line", () => {
    for (const locale of LOCALES.filter((l) => l !== "en")) {
      expect(DISCLOSURES[locale].interaction, locale).not.toBe(DISCLOSURES.en.interaction);
    }
  });
});

describe("firstInteractionNotice", () => {
  it("returns the line to show before a conversation starts", () => {
    expect(firstInteractionNotice({ interactsWithPersons: true })).toBe(
      DISCLOSURES.en.interaction,
    );
  });

  it("joins several first-interaction duties into one line", () => {
    const line = firstInteractionNotice({
      interactsWithPersons: true,
      emotionRecognition: true,
    });
    expect(line).toContain(DISCLOSURES.en.interaction);
    expect(line).toContain(DISCLOSURES.en.emotionRecognition);
  });

  it("returns nothing when no first-interaction duty applies", () => {
    expect(firstInteractionNotice({ generatesSyntheticContent: ["image"] })).toBeUndefined();
  });
});

describe("chatPrefix", () => {
  it("brackets the short label", () => {
    expect(chatPrefix()).toBe("[AI]");
  });

  it("localises the label", () => {
    expect(chatPrefix("de")).toBe("[KI]");
  });
});

describe("buildManifest", () => {
  it("records the schema, the regulation and the stamp", () => {
    const manifest = buildManifest({ interactsWithPersons: true }, STAMP);
    expect(manifest.schema).toBe(MANIFEST_SCHEMA);
    expect(manifest.regulation).toBe("Regulation (EU) 2024/1689");
    expect(manifest.generatedAt).toBe(STAMP.generatedAt);
    expect(manifest.sdkVersion).toBe("0.1.0");
  });

  it("echoes the profile back so the input is auditable", () => {
    const profile = { systemName: "support-bot", interactsWithPersons: true };
    expect(buildManifest(profile, STAMP).profile).toEqual(profile);
  });

  it("records the paragraphs that do not apply, with their reasons", () => {
    const manifest = buildManifest({ interactsWithPersons: true }, STAMP);
    const notApplicable = manifest.obligations.filter((o) => !o.applies);
    expect(notApplicable.length).toBeGreaterThan(0);
    for (const o of notApplicable) expect(o.reason.length).toBeGreaterThan(0);
  });

  it("is reproducible — same input, same record", () => {
    const profile = { interactsWithPersons: true, generatesSyntheticContent: ["text" as const] };
    expect(buildManifest(profile, STAMP)).toEqual(buildManifest(profile, STAMP));
  });

  it("serialises as indented JSON with a trailing newline", () => {
    const text = serialiseManifest(buildManifest({}, STAMP));
    expect(text.endsWith("}\n")).toBe(true);
    expect(text).toContain('\n  "regulation"');
  });
});
