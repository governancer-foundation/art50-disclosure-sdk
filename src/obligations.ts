// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * Resolves which Article 50 transparency duties a system profile raises.
 *
 * Every branch below states the paragraph it implements. The resolver reports
 * paragraphs that do NOT apply as well as those that do, with the reason —
 * an audit trail is worth more than a shorter list.
 */

import type {
  Obligation,
  ObligationReport,
  Paragraph,
  SystemProfile,
} from "./types.js";

/** Article 50 applies from this date (Article 113). */
export const APPLICATION_DATE = "2026-08-02";

/**
 * Systems placed on the market before the application date get until this date
 * for the 50(2) marking duty alone. Content generated before the application
 * date is not labelled retroactively.
 */
export const MARKING_GRACE_DATE = "2026-12-02";

const LAW_ENFORCEMENT_EXEMPTION =
  "Use authorised by law to detect, prevent, investigate or prosecute criminal offences, subject to appropriate safeguards for the rights and freedoms of third parties.";

interface Verdict {
  applies: boolean;
  reason: string;
  exemption?: string;
  reducedForm?: string;
  applicableFrom?: string;
}

function resolve501(p: SystemProfile): Verdict {
  if (!p.interactsWithPersons) {
    return {
      applies: false,
      reason: "The system is not intended to interact directly with natural persons.",
    };
  }
  // The law-enforcement exemption does not reach systems the public uses to
  // report a criminal offence.
  if (p.lawEnforcementAuthorised && !p.publicCrimeReporting) {
    return {
      applies: false,
      reason: "Direct interaction, but the law-enforcement exemption is claimed.",
      exemption: LAW_ENFORCEMENT_EXEMPTION,
    };
  }
  if (p.interactionIsObvious) {
    return {
      applies: false,
      reason:
        "Direct interaction, but the AI nature is claimed to be obvious to a reasonably well-informed, observant and circumspect person. Read narrowly — be able to justify it.",
      exemption:
        "Obvious from the point of view of a reasonably well-informed, observant and circumspect natural person.",
    };
  }
  return {
    applies: true,
    reason: "The system interacts directly with natural persons and no exemption is claimed.",
  };
}

function resolve502(p: SystemProfile): Verdict {
  const modalities = p.generatesSyntheticContent ?? [];
  if (modalities.length === 0) {
    return {
      applies: false,
      reason: "The system does not generate synthetic audio, image, video or text.",
    };
  }
  if (p.lawEnforcementAuthorised) {
    return {
      applies: false,
      reason: "Synthetic output, but the law-enforcement exemption is claimed.",
      exemption: LAW_ENFORCEMENT_EXEMPTION,
    };
  }
  if (p.assistiveEditingOnly) {
    return {
      applies: false,
      reason:
        "Synthetic output, but the system performs an assistive function for standard editing or does not substantially alter the input data or its semantics.",
      exemption:
        "Assistive function for standard editing; no substantial alteration of the input data or its semantics.",
    };
  }
  return {
    applies: true,
    reason: `The system generates synthetic ${modalities.join(", ")} output.`,
    applicableFrom: p.placedOnMarketBeforeApplication ? MARKING_GRACE_DATE : APPLICATION_DATE,
  };
}

function resolve503(p: SystemProfile): Verdict {
  const kinds: string[] = [];
  if (p.emotionRecognition) kinds.push("emotion recognition");
  if (p.biometricCategorisation) kinds.push("biometric categorisation");
  if (kinds.length === 0) {
    return {
      applies: false,
      reason: "The system performs neither emotion recognition nor biometric categorisation.",
    };
  }
  if (p.lawEnforcementAuthorised) {
    return {
      applies: false,
      reason: `Operates ${kinds.join(" and ")}, but the law-enforcement exemption is claimed.`,
      exemption: LAW_ENFORCEMENT_EXEMPTION,
    };
  }
  return {
    applies: true,
    reason: `The deployer operates ${kinds.join(" and ")} on natural persons.`,
  };
}

function resolve504(p: SystemProfile): Verdict {
  // Two independent triggers. An exemption that lifts the text branch leaves
  // the deepfake branch standing, so they are resolved separately.
  const deepfakeTrigger = p.producesDeepfakes === true;
  const textTrigger = p.publishesPublicInterestText === true && !p.humanEditorialControl;

  if (!deepfakeTrigger && !textTrigger) {
    if (p.publishesPublicInterestText && p.humanEditorialControl) {
      return {
        applies: false,
        reason:
          "Public-interest text is published, but it underwent human review and a natural or legal person holds editorial responsibility for it.",
        exemption: "Human review or editorial control with editorial responsibility held.",
      };
    }
    return {
      applies: false,
      reason:
        "The system produces neither deepfake content nor AI-generated text published to inform the public on matters of public interest.",
    };
  }

  if (p.lawEnforcementAuthorised) {
    return {
      applies: false,
      reason: "Disclosable output, but the law-enforcement exemption is claimed.",
      exemption: LAW_ENFORCEMENT_EXEMPTION,
    };
  }

  const triggers = [
    deepfakeTrigger ? "deepfake image, audio or video" : null,
    textTrigger ? "text published to inform the public on matters of public interest" : null,
  ].filter(Boolean);

  const verdict: Verdict = {
    applies: true,
    reason: `The deployer publishes ${triggers.join(" and ")}.`,
  };

  // An artistic, creative, satirical or fictional work still carries the duty;
  // it is discharged in a form that does not hamper the display of the work.
  if (deepfakeTrigger && p.artisticWork) {
    verdict.reducedForm =
      "The work is evidently artistic, creative, satirical or fictional: disclose the existence of the generated or manipulated content in an appropriate manner that does not hamper the display or enjoyment of the work.";
  }

  return verdict;
}

const REQUIREMENTS: Record<Paragraph, { role: Obligation["role"]; requirement: string }> = {
  "50(1)": {
    role: "provider",
    requirement:
      "Design and develop the system so the natural persons concerned are informed that they are interacting with an AI system.",
  },
  "50(2)": {
    role: "provider",
    requirement:
      "Mark the outputs in a machine-readable format and make them detectable as artificially generated or manipulated, by technical solutions that are effective, interoperable, robust and reliable as far as technically feasible.",
  },
  "50(3)": {
    role: "deployer",
    requirement:
      "Inform the natural persons exposed to the system of its operation, and process their personal data in accordance with the applicable data-protection law.",
  },
  "50(4)": {
    role: "deployer",
    requirement:
      "Disclose that the content has been artificially generated or manipulated.",
  },
};

const ORDER: Paragraph[] = ["50(1)", "50(2)", "50(3)", "50(4)"];

const RESOLVERS: Record<Paragraph, (p: SystemProfile) => Verdict> = {
  "50(1)": resolve501,
  "50(2)": resolve502,
  "50(3)": resolve503,
  "50(4)": resolve504,
};

/**
 * Work out which Article 50 duties a profile raises.
 *
 * The report lists every paragraph, applicable or not, each with the reason it
 * landed where it did, so the result can be filed as evidence rather than
 * merely acted on.
 */
export function resolveObligations(profile: SystemProfile): ObligationReport {
  const obligations: Obligation[] = ORDER.map((paragraph) => {
    const verdict = RESOLVERS[paragraph](profile);
    const { role, requirement } = REQUIREMENTS[paragraph];
    return {
      paragraph,
      role,
      applies: verdict.applies,
      requirement,
      reason: verdict.reason,
      ...(verdict.exemption ? { exemption: verdict.exemption } : {}),
      ...(verdict.reducedForm ? { reducedForm: verdict.reducedForm } : {}),
      applicableFrom: verdict.applicableFrom ?? APPLICATION_DATE,
    };
  });

  const applicable = obligations.filter((o) => o.applies);
  const readyBy = applicable
    .map((o) => o.applicableFrom)
    .sort()
    .at(0);

  return {
    ...(profile.systemName ? { systemName: profile.systemName } : {}),
    obligations,
    applicable: applicable.map((o) => o.paragraph),
    ...(readyBy ? { readyBy } : {}),
  };
}
