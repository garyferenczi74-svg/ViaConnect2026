export const POSES = [
  { id: 'front', label: 'FRONT', hint: 'Face the camera. Arms slightly out.' },
  { id: 'right', label: 'RIGHT', hint: 'Turn left. Your right side faces the camera.' },
  { id: 'back', label: 'BACK', hint: 'Keep turning. Face the wall, not the phone.' },
  { id: 'left', label: 'LEFT', hint: 'One more turn. Your left side faces the camera.' },
] as const;
export type PoseId = (typeof POSES)[number]['id'];
export const INTERSTITIAL: Record<PoseId, string> = {
  front: 'Got it. Turn left for RIGHT.',
  right: 'Got it. Turn left for BACK.',
  back: 'Got it. Turn left for LEFT.',
  left: 'All four captured.',
};
export const PROTOCOL_ID = '4pose_v1';
export const POSE_ORDER: PoseId[] = ['front', 'right', 'back', 'left'];
