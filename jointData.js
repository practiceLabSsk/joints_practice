// 仮座標の前提: 1単位=1m、Y軸が上、人物の前方が+Z、人物の左側が+X。
export const jointData = [
  {
    id: "AnkleLeft",
    name: "左足首 (AnkleLeft)",
    side: "left",
    position: { x: 0.12, y: 0.11, z: 0 },
  },
  {
    id: "AnkleRight",
    name: "右足首 (AnkleRight)",
    side: "right",
    position: { x: -0.12, y: 0.11, z: 0 },
  },
  {
    id: "FootLeft",
    name: "左足 (FootLeft)",
    side: "left",
    position: { x: 0.12, y: 0.07, z: 0.18 },
  },
  {
    id: "FootRight",
    name: "右足 (FootRight)",
    side: "right",
    position: { x: -0.12, y: 0.07, z: 0.18 },
  },
  {
    id: "HandLeft",
    name: "左手 (HandLeft)",
    side: "left",
    position: { x: 0.62, y: 0.98, z: 0 },
  },
  {
    id: "HandRight",
    name: "右手 (HandRight)",
    side: "right",
    position: { x: -0.62, y: 0.98, z: 0 },
  },
  {
    id: "KneeLeft",
    name: "左膝 (KneeLeft)",
    side: "left",
    position: { x: 0.14, y: 0.49, z: 0 },
  },
  {
    id: "KneeRight",
    name: "右膝 (KneeRight)",
    side: "right",
    position: { x: -0.14, y: 0.49, z: 0 },
  },
  {
    id: "Neck",
    name: "首 (Neck)",
    side: "center",
    position: { x: 0, y: 1.47, z: 0 },
  },
  {
    id: "spinebase",
    name: "腰 (spinebase)",
    side: "center",
    position: { x: 0, y: 0.78, z: 0 },
  },
  {
    id: "spinemid",
    name: "背中 (spinemid)",
    side: "center",
    position: { x: 0, y: 1.08, z: 0 },
  },
  {
    id: "spineshoulder",
    name: "首元 (spineshoulder)",
    side: "center",
    position: { x: 0, y: 1.34, z: 0 },
  },
];

export const jointConnections = [
  { startId: "Neck", endId: "spineshoulder", side: "center" },
  { startId: "spineshoulder", endId: "spinemid", side: "center" },
  { startId: "spinemid", endId: "spinebase", side: "center" },
  { startId: "spineshoulder", endId: "HandLeft", side: "left" },
  { startId: "spineshoulder", endId: "HandRight", side: "right" },
  { startId: "spinebase", endId: "KneeLeft", side: "left" },
  { startId: "spinebase", endId: "KneeRight", side: "right" },
  { startId: "KneeLeft", endId: "AnkleLeft", side: "left" },
  { startId: "KneeRight", endId: "AnkleRight", side: "right" },
  { startId: "AnkleLeft", endId: "FootLeft", side: "left" },
  { startId: "AnkleRight", endId: "FootRight", side: "right" },
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
