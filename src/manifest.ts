// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * A machine-readable record of what was disclosed, why, and on what reading of
 * the Regulation.
 *
 * A screenshot of a banner proves a banner existed. It does not prove which
 * duty the banner discharged, which exemptions were claimed, or who decided
 * that. This record does, and it is stable enough to diff between releases —
 * so a change in the disclosure posture shows up as a reviewable change rather
 * than as an undocumented edit to a template.
 */

import { planDisclosures, type DisclosureOptions } from "./disclosure.js";
import type { Notice } from "./disclosure.js";
import type { Locale } from "./locales.js";
import type { Obligation, SystemProfile } from "./types.js";

/** Schema identifier, versioned independently of the package. */
export const MANIFEST_SCHEMA = "art50-disclosure-manifest/v1";

export interface DisclosureManifest {
  schema: typeof MANIFEST_SCHEMA;
  /** Regulation the assessment is made under. */
  regulation: "Regulation (EU) 2024/1689";
  /** ISO 8601 instant the record was produced. Supplied by the caller. */
  generatedAt: string;
  /** Version of the SDK that produced it. */
  sdkVersion: string;
  systemName?: string;
  locale: Locale;
  /** The claims the assessment rests on — echoed back so the input is auditable. */
  profile: SystemProfile;
  /** Every paragraph considered, applicable or not, with its reason. */
  obligations: Obligation[];
  /** The notices the caller undertakes to show. */
  notices: Notice[];
  /** Earliest date a live duty binds, if any. */
  readyBy?: string;
}

export interface ManifestOptions extends DisclosureOptions {
  /**
   * ISO 8601 instant to stamp. Required rather than defaulted to the clock:
   * a record that stamps itself is not reproducible, and two runs over the
   * same profile should differ only if the assessment differs.
   */
  generatedAt: string;
  /** Version string of the calling package, recorded for provenance. */
  sdkVersion: string;
}

/**
 * Build the evidence record for a profile.
 *
 * The output is deterministic for a given profile, locale and stamp, so it can
 * be committed and diffed.
 */
export function buildManifest(
  profile: SystemProfile,
  options: ManifestOptions,
): DisclosureManifest {
  const plan = planDisclosures(profile, options);
  return {
    schema: MANIFEST_SCHEMA,
    regulation: "Regulation (EU) 2024/1689",
    generatedAt: options.generatedAt,
    sdkVersion: options.sdkVersion,
    ...(plan.report.systemName ? { systemName: plan.report.systemName } : {}),
    locale: plan.locale,
    profile,
    obligations: plan.report.obligations,
    notices: plan.notices,
    ...(plan.report.readyBy ? { readyBy: plan.report.readyBy } : {}),
  };
}

/** Serialise a record the way it should be committed: sorted keys, trailing newline. */
export function serialiseManifest(manifest: DisclosureManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}
