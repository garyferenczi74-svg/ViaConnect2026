import {
  AVATAR_VERTICAL_FOV_DEG,
  FULL_BODY_AZIMUTH_RAD,
  FULL_BODY_FRAMING,
} from '@/lib/formavision/motion/regionFraming';

// Same rear ¾ ankle-crop hero as the product camera. Not a default
// model-viewer bust crop.

export function modelViewerCameraOrbit(): string {
  const thetaDeg = Math.round((FULL_BODY_AZIMUTH_RAD * 180) / Math.PI);
  return `${thetaDeg}deg 78deg ${FULL_BODY_FRAMING.distance}m`;
}

export function modelViewerCameraTarget(): string {
  return `0m ${FULL_BODY_FRAMING.targetY}m 0m`;
}

export function modelViewerFieldOfView(): string {
  return `${AVATAR_VERTICAL_FOV_DEG}deg`;
}
