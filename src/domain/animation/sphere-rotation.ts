export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface SphereRotation {
  x: number;
  y: number;
}

const normalizeAngle = (angle: number) => {
  const normalized = ((angle + 180) % 360 + 360) % 360 - 180;
  return Object.is(normalized, -0) ? 0 : normalized;
};

export const advanceSphereRotation = (
  rotation: SphereRotation,
  delta: SphereRotation,
): SphereRotation => ({
  x: normalizeAngle(rotation.x + delta.x),
  y: normalizeAngle(rotation.y + delta.y),
});

export const rotateSpherePoint = (point: Point3D, rotation: SphereRotation): Point3D => {
  const xRad = rotation.x * (Math.PI / 180);
  const yRad = rotation.y * (Math.PI / 180);
  const x1 = point.x * Math.cos(yRad) + point.z * Math.sin(yRad);
  const z1 = -point.x * Math.sin(yRad) + point.z * Math.cos(yRad);
  return {
    x: x1,
    y: point.y * Math.cos(xRad) - z1 * Math.sin(xRad),
    z: point.y * Math.sin(xRad) + z1 * Math.cos(xRad),
  };
};
