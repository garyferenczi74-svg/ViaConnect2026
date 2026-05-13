import { FORBIDDEN_PHRASES } from "../../src/lib/compliance/dictionaries/forbidden_phrases";
import { buildDiseaseClaimRegex } from "../../src/lib/compliance/dictionaries/disease_terms";
import { PROHIBITED_PEPTIDES } from "../../src/lib/compliance/dictionaries/unapproved_peptides";

const strings = [
  "Nutrition data from USDA FoodData Central.",
  "Nutrition data from USDA FoodData Central and AI estimates.",
  "Nutrition values estimated. These foods are not in the USDA database.",
  "Nutrition values entered manually.",
];

let hits = 0;
const diseaseRe = buildDiseaseClaimRegex();
console.log("FORBIDDEN_PHRASES count: " + (FORBIDDEN_PHRASES as unknown[]).length);
console.log("PROHIBITED_PEPTIDES count: " + (PROHIBITED_PEPTIDES as unknown[]).length);

for (const [i, s] of strings.entries()) {
  const sl = s.toLowerCase();
  for (const p of FORBIDDEN_PHRASES as unknown as Array<string | { phrase?: string; text?: string; term?: string }>) {
    const phrase = typeof p === "string" ? p : (p.phrase ?? p.text ?? p.term ?? "");
    if (phrase && sl.includes(String(phrase).toLowerCase())) {
      console.log("FORBIDDEN PHRASE HIT s" + (i + 1) + ": " + phrase);
      hits++;
    }
  }
  for (const pep of PROHIBITED_PEPTIDES as unknown as Array<string | { name?: string; canonical?: string }>) {
    const name = typeof pep === "string" ? pep : (pep.name ?? pep.canonical ?? "");
    if (name && sl.includes(String(name).toLowerCase())) {
      console.log("PROHIBITED PEPTIDE HIT s" + (i + 1) + ": " + name);
      hits++;
    }
  }
  diseaseRe.lastIndex = 0;
  const dm = diseaseRe.exec(s);
  if (dm) {
    console.log("DISEASE HIT s" + (i + 1) + ": " + dm[0]);
    hits++;
  }
}
console.log("TOTAL direct dictionary hits: " + hits);
