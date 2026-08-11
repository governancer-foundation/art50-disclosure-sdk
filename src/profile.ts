// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * What this profile promises, as data.
 *
 * The shared schema asks every profile to declare the technique vocabulary it
 * permits and how its requirements map onto the common outcome vocabulary.
 * Stating that in prose leaves it unenforceable; stating it as an exported
 * value lets a consumer check a record against the declaration its profile
 * names, and lets a reviewer see the mapping without reading the source.
 */

import type { ProfileDeclaration } from "@governancer-foundation/conformance-attestation";

export const PROFILE: ProfileDeclaration = {
  id: "ai-act/art-50",
  version: "0.1",
  requirements: "Regulation (EU) 2024/1689 (the EU AI Act), Article 50",
  techniques: ["declaredSystemDescription"],
  outcomeMapping: {
    // The shared vocabulary is capability-shaped — it fits "is this control
    // operable by keyboard" better than "did you tell the user they were
    // talking to a machine". Article 50 requirements are duties, so this
    // profile has to say what it means by each value before anyone can compare
    // its records with another axis's.
    notApplicable:
      "The duty does not bind this system, either because the trigger is absent or because an exemption lifts it. Where an exemption is relied on it is named in exemptionClaimed, and it is an assertion the assessor is making rather than an observation.",
    notEvaluated:
      "The duty binds and this profile does not determine whether it has been discharged. Identifying an obligation is not performing it, and nothing here observes the running system, so every binding duty lands here.",
    supports:
      "Reserved. Reaching it requires evidence that the disclosure was actually made, which is beyond what a determination from a declared description can support.",
    partiallySupports:
      "Not used. A duty of this kind is discharged or it is not; there is no partial state between telling someone they are speaking to a machine and not telling them.",
    doesNotSupport:
      "Reserved, for the same reason as supports: asserting a failure also requires observing the system.",
  },
};
