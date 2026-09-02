export const normalizeCircularDragDelta = (delta: number) => {
  if (delta > 180) return delta - 360;
  if (delta < -180) return delta + 360;
  return delta;
};
