import { RuleEngine } from "../../src/lib/compliance/engine/RuleEngine";
import { allRules } from "../../src/lib/compliance/rules";

const strings = [
  'Nutrition data from USDA FoodData Central.',
  'Nutrition data from USDA FoodData Central and AI estimates.',
  'Nutrition values estimated. These foods are not in the USDA database.',
  'Nutrition values entered manually.'
];

(async () => {
  const engine = RuleEngine.fromRules(allRules);
  let totalFindings = 0;
  for (const [i, s] of strings.entries()) {
    for (const surface of ["marketing_copy", "marketing_page", "content_cms", "ai_output"] as const) {
      const r = await engine.evaluate({
        surface,
        source: "claude_code",
        content: s,
        location: { filePath: `phase7_string_${i+1}` },
      });
      if (r.findings.length > 0) {
        totalFindings += r.findings.length;
        console.log("HIT on string " + (i+1) + " surface " + surface);
        for (const f of r.findings) {
          console.log("  " + f.ruleId + " [" + f.severity + "]: " + f.message);
        }
      }
    }
  }
  console.log("Total findings across 4 strings x 4 surfaces: " + totalFindings);
})();
