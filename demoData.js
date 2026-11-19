import { getInitialPoseFrame, jointDefinitions } from "./jointData.js";

// Synthetic in-place walking cycle. Each keyframe uses offsets from the rest pose.
const keyframeOffsets = [
  { time: 0, joints: {} },
  {
    time: 0.5,
    joints: {
      FootLeft: { y: 7, z: 16 },
      FootRight: { z: -10 },
      KneeLeft: { y: 3.5, z: 4 },
      KneeRight: { y: -1, z: -1.5 },
      HandLeft: { y: -2.5, z: -13 },
      HandRight: { y: 2.5, z: 13 },
      spinebase: { x: 2.5, z: 1.2 },
      spinemid: { x: 1.8, z: 1 },
      spineshoulder: { x: 1.2, z: 0.8 },
      Neck: { x: 0.8, z: 0.4 },
    },
  },
  { time: 1, joints: {} },
  {
    time: 1.5,
    joints: {
      FootLeft: { z: -10 },
      FootRight: { y: 7, z: 16 },
      KneeLeft: { y: -1, z: -1.5 },
      KneeRight: { y: 3.5, z: 4 },
      HandLeft: { y: 2.5, z: 13 },
      HandRight: { y: -2.5, z: -13 },
      spinebase: { x: -2.5, z: 1.2 },
      spinemid: { x: -1.8, z: 1 },
      spineshoulder: { x: -1.2, z: 0.8 },
      Neck: { x: -0.8, z: 0.4 },
    },
  },
  { time: 2, joints: {} },
];

function expandKeyframe(keyframe) {
  const poseFrame = getInitialPoseFrame();
  for (const [jointId, offsets] of Object.entries(keyframe.joints)) {
    for (const [axis, offset] of Object.entries(offsets)) {
      poseFrame.joints[jointId][axis] += offset;
    }
  }
  return { time: keyframe.time, joints: poseFrame.joints };
}

const demoFrames = keyframeOffsets.map(expandKeyframe);
export const DEMO_DURATION_SECONDS = demoFrames[demoFrames.length - 1].time;

export function getDemoFrameAt(time) {
  if (!Number.isFinite(time)) throw new Error("Demo time must be finite");
  const currentTime = Math.min(DEMO_DURATION_SECONDS, Math.max(0, time));

  let rightIndex = demoFrames.findIndex((frame) => frame.time >= currentTime);
  if (rightIndex < 0) rightIndex = demoFrames.length - 1;
  const rightFrame = demoFrames[rightIndex];
  if (rightIndex === 0 || rightFrame.time === currentTime) {
    return {
      time: currentTime,
      joints: Object.fromEntries(
        jointDefinitions.map(({ id }) => [id, { ...rightFrame.joints[id] }]),
      ),
    };
  }

  const leftFrame = demoFrames[rightIndex - 1];
  const progress = (currentTime - leftFrame.time) / (rightFrame.time - leftFrame.time);
  const joints = {};
  for (const { id } of jointDefinitions) {
    joints[id] = {};
    for (const axis of ["x", "y", "z"]) {
      const start = leftFrame.joints[id][axis];
      const end = rightFrame.joints[id][axis];
      joints[id][axis] = start + (end - start) * progress;
    }
  }

  return { time: currentTime, joints };
}
