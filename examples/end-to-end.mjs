// SPDX-License-Identifier: Apache-2.0
// SPDX-FileCopyrightText: 2026 Agonist Development AB
/**
 * One system, all the way through.
 *
 * A reader can see the functions listed and still not see how they compose.
 * This takes a single description of a real-ish product and walks it end to
 * end: which duties bind it, what to show a user and where, what a signing
 * tool should embed, and the record of the whole thing — validated by the
 * separate package that owns the record's shape.
 *
 * Run it:  node examples/end-to-end.mjs
 * It is run by continuous integration too, so it cannot quietly stop working.
 */

import {
  buildAttestation,
  buildMarkingClaim,
  planDisclosures,
  resolveObligations,
} from "../dist/index.js";
import { validateStatement } from "@governancer-foundation/conformance-attestation";

// A product that does several things at once, which is the normal case and the
// one where the paragraphs interact: it talks to people, it generates video,
// and it publishes captions written by a model.
const studio = {
  systemName: "clip-studio",
  interactsWithPersons: true,
  generatesSyntheticContent: ["video", "text"],
  syntheticOutputKind: "generated",
  producesDeepfakes: true,
  publishesPublicInterestText: true,
  humanEditorialControl: true, // an editor signs off the captions
  placedOnMarketBeforeApplication: true,
};

const line = (s = "") => process.stdout.write(`${s}\n`);
const rule = (t) => line(`\n── ${t} ${"─".repeat(Math.max(0, 62 - t.length))}`);

// ── 1. Which duties bind, and why ──────────────────────────────────────────
rule("1. obligations");
const report = resolveObligations(studio);
for (const o of report.obligations) {
  const mark = o.applies ? "binds" : "  —  ";
  line(`${mark}  ${o.paragraph}  (${o.role})  ${o.applies ? `from ${o.applicableFrom}` : ""}`);
  line(`       ${o.reason}`);
  if (o.exemption) line(`       exemption: ${o.exemption}`);
  if (o.reducedForm) line(`       reduced:   ${o.reducedForm}`);
}
line(`\nready by: ${report.readyBy}`);
// Note what happened to 50(4): the editor's sign-off answers the text branch,
// and the video branch stands anyway. One exemption, two triggers.

// ── 2. What to show, where, in which language ──────────────────────────────
rule("2. disclosures (German audience)");
for (const n of planDisclosures(studio, { locale: "de" }).notices) {
  line(`${n.paragraph}  ${n.placement.padEnd(18)} ${n.text || "(no text — machine-readable)"}`);
  if (n.note) line(`       note: ${n.note}`);
}

// ── 3. What a signing tool should embed ────────────────────────────────────
rule("3. marking values for the provenance manifest");
const claim = buildMarkingClaim(studio, { locale: "de", softwareAgent: "clip-studio/3.4" });
line(JSON.stringify(claim, null, 2));

// ── 4. The record, checked by the package that owns its shape ──────────────
rule("4. attestation");
const attestation = buildAttestation(studio, {
  subject: { name: "clip-studio" },
  issued: "2026-08-11T00:00:00.000Z",
  assessor: { name: "Agonist Development AB" },
  sdkVersion: "0.2.0",
  limitations: ["Covers the hosted service; the desktop client is assessed separately."],
});

const result = validateStatement(attestation);
line(`subject:      ${attestation.subject[0].name}`);
line(`unpinned:     ${attestation.subject[0].unpinned}`);
line(`limitations:  ${attestation.predicate.limitations.length}`);
for (const e of attestation.predicate.assessment) {
  line(`  ${e.requirement.padEnd(22)} ${e.outcome.padEnd(14)} ${e.bindingFrom ?? ""}`);
}
line(`\nvalidated by @governancer-foundation/conformance-attestation: ${result.valid}`);

if (!result.valid) {
  for (const e of result.errors) line(`  ${e.path}: ${e.message}`);
  process.exit(1);
}

// The assertions this example is also a test of.
if (report.applicable.join() !== "50(1),50(2),50(4)") {
  throw new Error(`unexpected obligations: ${report.applicable.join()}`);
}
if (claim.action !== "c2pa.created") throw new Error("unexpected provenance action");
line("\nend to end: ok");
