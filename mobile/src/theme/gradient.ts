export interface LinearGradientPoints {
  end: { x: number; y: number };
  start: { x: number; y: number };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

// CSS/Figma mapping:
// 90deg = left -> right, 180deg = top -> bottom.
export function cssAngleToLinearPoints(angleDeg: number): LinearGradientPoints {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  const vectorX = Math.cos(radians);
  const vectorY = Math.sin(radians);

  const start = {
    x: clamp(0.5 - vectorX / 2, 0, 1),
    y: clamp(0.5 - vectorY / 2, 0, 1),
  };

  const end = {
    x: clamp(0.5 + vectorX / 2, 0, 1),
    y: clamp(0.5 + vectorY / 2, 0, 1),
  };

  return { end, start };
}

function isClose(a: number, b: number, tolerance = 1e-6) {
  return Math.abs(a - b) <= tolerance;
}

const angle180Sanity = cssAngleToLinearPoints(180);
const isAngle180Valid =
  isClose(angle180Sanity.start.x, 0.5) &&
  isClose(angle180Sanity.start.y, 0) &&
  isClose(angle180Sanity.end.x, 0.5) &&
  isClose(angle180Sanity.end.y, 1);

if (__DEV__ && !isAngle180Valid) {
  console.warn('[gradient] cssAngleToLinearPoints failed sanity check for 180deg');
}
