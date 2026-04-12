import type { IdentifiedItem } from './analyzeMeal';

export interface FoodInteraction {
  foodItem: string;
  interactsWith: string;
  interactionType: 'absorption' | 'contraindication' | 'timing' | 'enhancement';
  severity: 'info' | 'caution' | 'warning';
  description: string;
  recommendation: string;
}

interface KnownInteraction {
  triggers: string[];
  target: string;
  interactionType: FoodInteraction['interactionType'];
  severity: FoodInteraction['severity'];
  description: string;
  recommendation: string;
}

const KNOWN_INTERACTIONS: KnownInteraction[] = [
  { triggers: ['grapefruit'], target: 'statins', interactionType: 'contraindication', severity: 'warning', description: 'Grapefruit inhibits CYP3A4, dramatically increasing drug absorption', recommendation: 'Avoid grapefruit within 4 hours of medication' },
  { triggers: ['grapefruit'], target: 'calcium channel blocker', interactionType: 'contraindication', severity: 'warning', description: 'Grapefruit can amplify medication effects unpredictably', recommendation: 'Consult your healthcare provider about grapefruit consumption' },
  { triggers: ['spinach', 'kale', 'broccoli'], target: 'warfarin', interactionType: 'absorption', severity: 'caution', description: 'High Vitamin K content can reduce Warfarin effectiveness', recommendation: 'Maintain consistent intake of Vitamin K-rich foods' },
  { triggers: ['spinach', 'kale'], target: 'iron', interactionType: 'enhancement', severity: 'info', description: 'Contains iron but oxalates can reduce absorption', recommendation: 'Pair with Vitamin C to enhance iron absorption' },
  { triggers: ['milk', 'cheese', 'yogurt', 'dairy'], target: 'tetracycline', interactionType: 'absorption', severity: 'caution', description: 'Calcium in dairy binds to tetracyclines, reducing absorption', recommendation: 'Take antibiotics 2 hours before or after dairy' },
  { triggers: ['milk', 'cheese', 'yogurt', 'dairy'], target: 'iron', interactionType: 'absorption', severity: 'caution', description: 'Calcium competes with iron for absorption', recommendation: 'Separate iron supplements and dairy by 2 hours' },
  { triggers: ['coffee', 'espresso', 'caffeine', 'tea'], target: 'iron', interactionType: 'absorption', severity: 'caution', description: 'Caffeine and tannins reduce iron absorption', recommendation: 'Take iron supplements 1 hour before or 2 hours after coffee' },
  { triggers: ['beer', 'wine', 'alcohol', 'cocktail'], target: 'b vitamin', interactionType: 'absorption', severity: 'warning', description: 'Alcohol impairs absorption of B vitamins, Vitamin C, zinc, and magnesium', recommendation: 'Separate supplement intake from alcohol consumption' },
  { triggers: ['beer', 'wine', 'alcohol', 'cocktail'], target: 'melatonin', interactionType: 'contraindication', severity: 'warning', description: 'Alcohol disrupts sleep architecture and interacts with melatonin', recommendation: 'Avoid alcohol within 3 hours of melatonin' },
  { triggers: ['banana', 'avocado', 'potato'], target: 'potassium', interactionType: 'enhancement', severity: 'info', description: 'Rich potassium source synergizes with potassium supplements', recommendation: 'Monitor total potassium intake if supplementing' },
];

export function checkFoodInteractions(
  items: IdentifiedItem[],
  userStack: { name: string }[],
): FoodInteraction[] {
  const interactions: FoodInteraction[] = [];
  const stackLower = userStack.map((s) => s.name.toLowerCase());

  for (const item of items) {
    const itemLower = item.name.toLowerCase();
    for (const known of KNOWN_INTERACTIONS) {
      const foodMatch = known.triggers.some((t) => itemLower.includes(t));
      if (!foodMatch) continue;

      const stackMatch = stackLower.some((s) => s.includes(known.target));
      if (!stackMatch) continue;

      const matchedSupplement = userStack.find((s) =>
        s.name.toLowerCase().includes(known.target),
      );

      interactions.push({
        foodItem: item.name,
        interactsWith: matchedSupplement?.name ?? known.target,
        interactionType: known.interactionType,
        severity: known.severity,
        description: known.description,
        recommendation: known.recommendation,
      });
    }
  }

  return interactions;
}
