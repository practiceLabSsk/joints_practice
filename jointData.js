// 座標の前提: 1単位=1m、Y軸が上、人物の前方が+Z、人物の左側が+X。
export const jointDefinitions = [
  { id: "AnkleLeft", name: "左足首 (AnkleLeft)", side: "left" },
  { id: "AnkleRight", name: "右足首 (AnkleRight)", side: "right" },
  { id: "FootLeft", name: "左足 (FootLeft)", side: "left" },
  { id: "FootRight", name: "右足 (FootRight)", side: "right" },
  { id: "HandLeft", name: "左手 (HandLeft)", side: "left" },
  { id: "HandRight", name: "右手 (HandRight)", side: "right" },
  { id: "KneeLeft", name: "左膝 (KneeLeft)", side: "left" },
  { id: "KneeRight", name: "右膝 (KneeRight)", side: "right" },
  { id: "Neck", name: "首 (Neck)", side: "center" },
  { id: "spinebase", name: "腰 (spinebase)", side: "center" },
  { id: "spinemid", name: "背中 (spinemid)", side: "center" },
  { id: "spineshoulder", name: "首元 (spineshoulder)", side: "center" },
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

// One pose frame is { time, joints: { [jointId]: { x, y, z } } }.
// A future CSV adapter can map each row into this shape without changing the views.
const initialPoseFrame = {
  time: 0,
  joints: {
    AnkleLeft: { x: 0.12, y: 0.11, z: 0 },
    AnkleRight: { x: -0.12, y: 0.11, z: 0 },
    FootLeft: { x: 0.12, y: 0.07, z: 0.18 },
    FootRight: { x: -0.12, y: 0.07, z: 0.18 },
    HandLeft: { x: 0.62, y: 0.98, z: 0 },
    HandRight: { x: -0.62, y: 0.98, z: 0 },
    KneeLeft: { x: 0.14, y: 0.49, z: 0 },
    KneeRight: { x: -0.14, y: 0.49, z: 0 },
    Neck: { x: 0, y: 1.47, z: 0 },
    spinebase: { x: 0, y: 0.78, z: 0 },
    spinemid: { x: 0, y: 1.08, z: 0 },
    spineshoulder: { x: 0, y: 1.34, z: 0 },
  },
};

const jointIds = new Set(jointDefinitions.map(({ id }) => id));
const coordinateAxes = new Set(["x", "y", "z"]);

function copyPoseFrame(frame) {
  return {
    time: frame.time,
    joints: Object.fromEntries(
      jointDefinitions.map(({ id }) => [id, { ...frame.joints[id] }]),
    ),
  };
}

function validatePoseFrame(frame) {
  if (!frame || !Number.isFinite(frame.time) || !frame.joints) {
    throw new Error("Pose frame must include a finite time and joint coordinates");
  }

  const nextJoints = {};
  for (const { id } of jointDefinitions) {
    const position = frame.joints[id];
    if (!position || ![position.x, position.y, position.z].every(Number.isFinite)) {
      throw new Error(`Pose frame has invalid coordinates for joint: ${id}`);
    }
    nextJoints[id] = { x: position.x, y: position.y, z: position.z };
  }

  for (const id of Object.keys(frame.joints)) {
    if (!jointIds.has(id)) throw new Error(`Unknown joint in pose frame: ${id}`);
  }

  return { time: frame.time, joints: nextJoints };
}

let currentPoseFrame = copyPoseFrame(initialPoseFrame);

export function getCurrentPoseFrame() {
  return copyPoseFrame(currentPoseFrame);
}

// This is the handoff point a future timeline can use to display a selected frame.
export function setCurrentPoseFrame(frame) {
  currentPoseFrame = validatePoseFrame(frame);
  return getCurrentPoseFrame();
}

export function setJointCoordinate(jointId, axis, value) {
  if (!jointIds.has(jointId)) throw new Error(`Unknown joint: ${jointId}`);
  if (!coordinateAxes.has(axis)) throw new Error(`Unknown coordinate axis: ${axis}`);
  if (!Number.isFinite(value)) throw new Error("Coordinate must be a finite number");

  currentPoseFrame.joints[jointId][axis] = value;
  return {
    id: jointId,
    position: { ...currentPoseFrame.joints[jointId] },
  };
}

export function resetJointPositions() {
  currentPoseFrame = copyPoseFrame(initialPoseFrame);
  return getCurrentPoseFrame();
}
