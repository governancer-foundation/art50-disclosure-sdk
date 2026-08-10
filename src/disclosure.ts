// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * Turns a resolved obligation report into the notices a caller has to show,
 * with the placement and timing Article 50(5) asks for.
 */

import { DISCLOSURES, resolveLocale, type Locale } from "./locales.js";
import { resolveObligations } from "./obligations.js";
import type { ObligationReport, Paragraph, SystemProfile } from "./types.js";

/** Where a notice has to appear for the duty to be discharged. */
export type Placement =
  /** Before or at the first interaction — a banner, a modal, an opening line. */
  | "first-interaction"
  /** Restated periodically through a long-running session. */
  | "periodic"
  /** Attached to the content itself, perceivable without special tools. */
  | "on-content"
  /** Embedded in the file or stream, readable by machines. */
  | "machine-readable";

export interface Notice {
  paragraph: Paragraph;
  placement: Placement;
  /** The text to show. Empty for a machine-readable-only duty. */
  text: string;
  /** What the caller still has to do that the SDK cannot do for it. */
  note?: string;
}

export interface DisclosurePlan {
  locale: Locale;
  report: ObligationReport;
  notices: Notice[];
}

export interface DisclosureOptions {
  /** Language tag of the audience — "de", "fr-BE", anything. Defaults to English. */
  locale?: string;
  /**
   * Show the periodic restatement for a long-running conversation. Off by
   * default: the Regulation requires disclosure at the latest at the first
   * interaction, and a reminder is a defensible extra, not a requirement.
   */
  periodicReminder?: boolean;
}

/**
 * Build the notice set for a profile.
 *
 * The plan carries the full obligation report alongside the notices, so a
 * caller can show the text and file the reasoning from one call.
 */
export function planDisclosures(
  profile: SystemProfile,
  options: DisclosureOptions = {},
): DisclosurePlan {
  const locale = resolveLocale(options.locale);
  const strings = DISCLOSURES[locale];
  const report = resolveObligations(profile);
  const applies = (p: Paragraph): boolean =>
    report.obligations.some((o) => o.paragraph === p && o.applies);

  const notices: Notice[] = [];

  if (applies("50(1)")) {
    notices.push({
      paragraph: "50(1)",
      placement: "first-interaction",
      text: strings.interaction,
    });
    if (options.periodicReminder) {
      notices.push({
        paragraph: "50(1)",
        placement: "periodic",
        text: strings.interactionReminder,
      });
    }
  }

  if (applies("50(2)")) {
    notices.push({
      paragraph: "50(2)",
      placement: "machine-readable",
      text: "",
      note: "The marking itself is a technical measure — a watermark, a signed provenance manifest or an equivalent — that this SDK does not apply. Call buildMarkingClaim() for the provenance values to embed, then apply them with a signing tool.",
    });
    notices.push({
      paragraph: "50(2)",
      placement: "on-content",
      text: strings.syntheticMarking,
      note: "A human-readable companion. It does not satisfy 50(2) on its own; the machine-readable mark is the duty.",
    });
  }

  if (applies("50(3)")) {
    if (profile.emotionRecognition) {
      notices.push({
        paragraph: "50(3)",
        placement: "first-interaction",
        text: strings.emotionRecognition,
      });
    }
    if (profile.biometricCategorisation) {
      notices.push({
        paragraph: "50(3)",
        placement: "first-interaction",
        text: strings.biometricCategorisation,
      });
    }
  }

  if (applies("50(4)")) {
    const reduced = report.obligations.find((o) => o.paragraph === "50(4)")?.reducedForm;
    if (profile.producesDeepfakes) {
      notices.push({
        paragraph: "50(4)",
        placement: "on-content",
        text: reduced ? strings.artisticWork : strings.deepfake,
        ...(reduced ? { note: reduced } : {}),
      });
    }
    if (profile.publishesPublicInterestText && !profile.humanEditorialControl) {
      notices.push({
        paragraph: "50(4)",
        placement: "on-content",
        text: strings.syntheticText,
        note: "Publish this visibly. A machine-readable mark alone does not discharge the duty for published text.",
      });
    }
  }

  return { locale, report, notices };
}

/**
 * The single line to show before a conversation starts, or undefined when no
 * first-interaction duty applies. A convenience over planDisclosures for the
 * common chatbot case.
 */
export function firstInteractionNotice(
  profile: SystemProfile,
  options: DisclosureOptions = {},
): string | undefined {
  const plan = planDisclosures(profile, options);
  const lines = plan.notices
    .filter((n) => n.placement === "first-interaction")
    .map((n) => n.text)
    .filter((t) => t.length > 0);
  return lines.length > 0 ? lines.join(" ") : undefined;
}

/**
 * Prefix a single chat turn, for surfaces with no room for a banner. The
 * banner is the better discharge of 50(1); this is the fallback.
 */
export function chatPrefix(locale?: string): string {
  return `[${DISCLOSURES[resolveLocale(locale)].interactionPrefix}]`;
}
