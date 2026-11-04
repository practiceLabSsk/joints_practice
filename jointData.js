// 仮座標の前提: 1単位=1m、Y軸が上、人物の前方が+Z、人物の左側が+X。
export const jointData = [
  {
    id: "leftAnkle",
    name: "左足首",
    side: "left",
    position: { x: 0.12, y: 0.11, z: 0 },
  },
  {
    id: "rightAnkle",
    name: "右足首",
    side: "right",
    position: { x: -0.12, y: 0.11, z: 0 },
  },
  {
    id: "leftFoot",
    name: "左足",
    side: "left",
    position: { x: 0.12, y: 0.07, z: 0.18 },
  },
  {
    id: "rightFoot",
    name: "右足",
    side: "right",
    position: { x: -0.12, y: 0.07, z: 0.18 },
  },
  {
    id: "leftHand",
    name: "左手",
    side: "left",
    position: { x: 0.62, y: 0.98, z: 0 },
  },
  {
    id: "rightHand",
    name: "右手",
    side: "right",
    position: { x: -0.62, y: 0.98, z: 0 },
  },
  {
    id: "leftKnee",
    name: "左膝",
    side: "left",
    position: { x: 0.14, y: 0.49, z: 0 },
  },
  {
    id: "rightKnee",
    name: "右膝",
    side: "right",
    position: { x: -0.14, y: 0.49, z: 0 },
  },
  {
    id: "neck",
    name: "首",
    side: "center",
    position: { x: 0, y: 1.47, z: 0 },
  },
];

export const jointConnections = [
  { startId: "neck", endId: "leftHand", side: "left" },
  { startId: "neck", endId: "rightHand", side: "right" },
  { startId: "neck", endId: "leftKnee", side: "left" },
  { startId: "neck", endId: "rightKnee", side: "right" },
  { startId: "leftKnee", endId: "leftAnkle", side: "left" },
  { startId: "rightKnee", endId: "rightAnkle", side: "right" },
  { startId: "leftAnkle", endId: "leftFoot", side: "left" },
  { startId: "rightAnkle", endId: "rightFoot", side: "right" },
];

const initialPositions = new Map(
  jointData.map(({ id, position }) => [id, { ...position }]),
);
const coordinateAxes = new Set(["x", "y", "z"]);

export function setJointCoordinate(jointId, axis, value) {
  const joint = jointData.find(({ id }) => id === jointId);
  if (!joint) throw new Error(`Unknown joint: ${jointId}`);
  if (!coordinateAxes.has(axis)) throw new Error(`Unknown coordinate axis: ${axis}`);
  if (!Number.isFinite(value)) throw new Error("Coordinate must be a finite number");

  joint.position[axis] = value;
  return joint;
}

export function resetJointPositions() {
  for (const joint of jointData) {
    Object.assign(joint.position, initialPositions.get(joint.id));
  }
}
