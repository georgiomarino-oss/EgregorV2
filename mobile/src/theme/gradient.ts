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
