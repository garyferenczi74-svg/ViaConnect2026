import type { LucideIcon } from 'lucide-react';
import { User, UserMinus, ArrowLeft, ArrowRight } from 'lucide-react';
import type { PoseId } from '@/lib/arnold/types';

export interface PoseDefinition {
  id: PoseId;
  label: string;
  icon: LucideIcon;
  instruction: string;
  order: number;
}

export const PHOTO_POSES: readonly PoseDefinition[] = [
  { id: 'front', label: 'Front view',  icon: User,       instruction: 'Stand facing the camera with arms slightly away from your body, feet shoulder width apart.', order: 1 },
  { id: 'back',  label: 'Back view',   icon: UserMinus,  instruction: 'Turn around completely. Stand with arms slightly away from your body, same stance as front.',  order: 2 },
  { id: 'left',  label: 'Left side',   icon: ArrowLeft,  instruction: 'Turn 90 degrees to your left. Stand naturally with arms at your sides. Look straight ahead.',  order: 3 },
  { id: 'right', label: 'Right side',  icon: ArrowRight, instruction: 'Turn 90 degrees to your right. Stand naturally with arms at your sides. Look straight ahead.', order: 4 },
] as const;

export const CAPTURE_TIPS = [
  'Use a plain background, wall or door',
  'Wear form fitting clothes or swimwear',
  'Keep lighting consistent across sessions',
  'Place phone at chest height, 6 to 8 feet away',
  'Use a timer or ask someone to take the photo',
];
