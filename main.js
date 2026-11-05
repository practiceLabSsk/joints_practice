import {
  getCurrentPoseFrame,
  jointDefinitions,
  resetJointPositions,
  setCurrentPoseFrame,
  setJointCoordinate,
} from "./jointData.js";
import { DEMO_DURATION_SECONDS, getDemoFrameAt } from "./demoData.js";
import { createSceneRenderer } from "./sceneRenderer.js";

const view = document.querySelector("#scene-view");
const canvas = document.querySelector("#scene-canvas");
const rendererStatus = document.querySelector("#renderer-status-text");
const statusIndicator = document.querySelector(".status-indicator");
const messageTitle = document.querySelector("#scene-message-title");
const messageDetail = document.querySelector("#scene-message-detail");
const axisLegend = document.querySelector("#axis-legend");
const jointSelect = document.querySelector("#joint-select");
const selectedJointName = document.querySelector("#selected-joint-name");
const selectedJointSide = document.querySelector("#selected-joint-side");
const jointCount = document.querySelector("#joint-count");
const coordinateList = document.querySelector("#coordinate-list");
const resetJointsButton = document.querySelector("#reset-joints");
const resetCameraButton = document.querySelector("#reset-camera");
const demoTimeline = document.querySelector("#demo-timeline");
const demoPlayToggle = document.querySelector("#demo-play-toggle");
const playbackTime = document.querySelector("#playback-time");

const axes = ["x", "y", "z"];
const sliderMinimum = -3;
const sliderMaximum = 3;
let selectedJointId = jointDefinitions[0].id;
const jointsById = new Map(jointDefinitions.map((joint) => [joint.id, joint]));
const coordinateRows = new Map();
const axisControls = new Map(
  axes.map((axis) => [
    axis,
    {
      number: document.querySelector(`#coordinate-${axis}`),
      slider: document.querySelector(`#coordinate-${axis}-slider`),
    },
  ]),
);
let currentDemoTime = 0;
let demoPlaying = false;
let playbackAnchorTime = 0;
let playbackStartedAt = 0;
let animationRequestId = 0;

let sceneRenderer;
try {
  sceneRenderer = createSceneRenderer({ view, canvas });
  rendererStatus.textContent = "Three.js / WebGL 準備完了";
  statusIndicator.classList.add("is-ready");
  messageTitle.textContent = "カメラ操作";
  axisLegend.hidden = false;
  resetCameraButton.disabled = false;
} catch (error) {
  console.error("3D scene initialization failed:", error);
  rendererStatus.textContent = "3D表示を利用できません";
  statusIndicator.classList.add("is-error");
  messageTitle.textContent = "3D表示を開始できませんでした";
  messageDetail.textContent = "WebGLとOrbitControlsの読み込みを確認してください";
  axisLegend.hidden = true;
}

function formatCoordinate(value) {
  return (Object.is(value, -0) ? 0 : value).toFixed(3);
}

function updatePlaybackReadout(time) {
  const current = time.toFixed(2);
  playbackTime.textContent = `${current} / ${DEMO_DURATION_SECONDS.toFixed(2)} 秒`;
  demoTimeline.value = current;
}

function renderDemoFrame(time) {
  const frame = getDemoFrameAt(time);
  currentDemoTime = frame.time;
  setCurrentPoseFrame(frame);
  updatePlaybackReadout(currentDemoTime);
  refreshJointViews();
}

function pauseDemo() {
  if (!demoPlaying) return;
  demoPlaying = false;
  cancelAnimationFrame(animationRequestId);
  demoPlayToggle.textContent = "▶ デモ再生";
  demoPlayToggle.setAttribute("aria-pressed", "false");
}

function animateDemo(timestamp) {
  if (!demoPlaying) return;
  const elapsed = (timestamp - playbackStartedAt) / 1000;
  const time = (playbackAnchorTime + elapsed) % DEMO_DURATION_SECONDS;
  renderDemoFrame(time);
  animationRequestId = requestAnimationFrame(animateDemo);
}

function toggleDemoPlayback() {
  if (demoPlaying) {
    pauseDemo();
    return;
  }

  if (currentDemoTime >= DEMO_DURATION_SECONDS) renderDemoFrame(0);
  demoPlaying = true;
  playbackAnchorTime = currentDemoTime;
  playbackStartedAt = performance.now();
  demoPlayToggle.textContent = "⏸ 一時停止";
  demoPlayToggle.setAttribute("aria-pressed", "true");
  animationRequestId = requestAnimationFrame(animateDemo);
}

function sideLabel(side) {
  if (side === "center") return "中央";
  return side === "left" ? "左" : "右";
}

function buildJointSelector() {
  for (const joint of jointDefinitions) {
    const option = document.createElement("option");
    option.value = joint.id;
    option.textContent = joint.name;
    jointSelect.append(option);
  }
  jointSelect.value = selectedJointId;
  jointCount.textContent = String(jointDefinitions.length);
}

function buildCoordinateRows() {
  for (const joint of jointDefinitions) {
    const row = document.createElement("article");
    row.className = "coordinate-row";
    row.setAttribute("role", "listitem");

    const selectButton = document.createElement("button");
    selectButton.className = "coordinate-row-select";
    selectButton.type = "button";
    selectButton.setAttribute("aria-label", `${joint.name}を選択して座標を編集`);

    const heading = document.createElement("span");
    heading.className = "coordinate-row-heading";

    const name = document.createElement("span");
    name.className = "coordinate-name";
    name.textContent = joint.name;

    const side = document.createElement("span");
    side.className = `joint-side joint-side-${joint.side}`;
    side.textContent = sideLabel(joint.side);
    heading.append(name, side);
    selectButton.append(heading);
    selectButton.addEventListener("click", () => selectJoint(joint.id));

    const values = document.createElement("div");
    values.className = "coordinate-values";
    const valueElements = new Map();

    for (const axis of axes) {
      const cell = document.createElement("span");
      cell.className = "coordinate-value";

      const axisLabel = document.createElement("b");
      axisLabel.className = `coordinate-axis-${axis}`;
      axisLabel.textContent = axis.toUpperCase();

      const value = document.createElement("span");
      cell.append(axisLabel, value);
      values.append(cell);
      valueElements.set(axis, value);
    }

    row.append(selectButton, values);
    coordinateList.append(row);
    coordinateRows.set(joint.id, { row, valueElements });
  }
}

function syncSelectedJointControls(poseFrame = getCurrentPoseFrame()) {
  const joint = jointsById.get(selectedJointId);
  const position = poseFrame.joints[selectedJointId];
  selectedJointName.textContent = joint.name;
  selectedJointSide.className = `joint-side joint-side-${joint.side}`;
  selectedJointSide.textContent = sideLabel(joint.side);

  for (const axis of axes) {
    const control = axisControls.get(axis);
    const value = position[axis];
    control.number.value = formatCoordinate(value);
    control.number.setAttribute(
      "aria-label",
      `${joint.name} ${axis.toUpperCase()}座標（m）`,
    );
    control.slider.value = String(Math.min(sliderMaximum, Math.max(sliderMinimum, value)));
    control.slider.setAttribute(
      "aria-label",
      `${joint.name} ${axis.toUpperCase()}座標スライダー`,
    );
  }

  sceneRenderer?.setSelectedJoint(selectedJointId);
}

function refreshCoordinateList(poseFrame) {
  for (const joint of jointDefinitions) {
    const row = coordinateRows.get(joint.id);
    row.row.classList.toggle("is-selected", joint.id === selectedJointId);
    for (const axis of axes) {
      row.valueElements.get(axis).textContent = formatCoordinate(
        poseFrame.joints[joint.id][axis],
      );
    }
  }
}

function refreshJointViews() {
  const poseFrame = getCurrentPoseFrame();
  sceneRenderer?.updatePose(poseFrame);
  refreshCoordinateList(poseFrame);
}

function selectJoint(jointId) {
  selectedJointId = jointId;
  jointSelect.value = jointId;
  const poseFrame = getCurrentPoseFrame();
  syncSelectedJointControls(poseFrame);
  refreshCoordinateList(poseFrame);
}

function updateSelectedCoordinate(axis, source) {
  pauseDemo();
  const control = axisControls.get(axis);
  const value = source === "slider" ? control.slider.valueAsNumber : control.number.valueAsNumber;
  if (!Number.isFinite(value)) return;

  setJointCoordinate(selectedJointId, axis, value);
  if (source === "slider") {
    control.number.value = formatCoordinate(value);
  } else {
    control.slider.value = String(Math.min(sliderMaximum, Math.max(sliderMinimum, value)));
  }

  refreshJointViews();
}

buildJointSelector();
buildCoordinateRows();
demoTimeline.max = String(DEMO_DURATION_SECONDS);
updatePlaybackReadout(0);
const initialPoseFrame = getCurrentPoseFrame();
syncSelectedJointControls(initialPoseFrame);
refreshCoordinateList(initialPoseFrame);
sceneRenderer?.updatePose(initialPoseFrame);

jointSelect.addEventListener("change", () => {
  selectJoint(jointSelect.value);
});

for (const axis of axes) {
  const control = axisControls.get(axis);
  control.number.addEventListener("input", () => updateSelectedCoordinate(axis, "number"));
  control.number.addEventListener("change", () => {
    if (!Number.isFinite(control.number.valueAsNumber)) syncSelectedJointControls();
  });
  control.slider.addEventListener("input", () => updateSelectedCoordinate(axis, "slider"));
}

demoPlayToggle.addEventListener("click", toggleDemoPlayback);
demoTimeline.addEventListener("input", () => {
  pauseDemo();
  renderDemoFrame(demoTimeline.valueAsNumber);
});

resetJointsButton.addEventListener("click", () => {
  pauseDemo();
  currentDemoTime = 0;
  updatePlaybackReadout(0);
  const poseFrame = resetJointPositions();
  syncSelectedJointControls(poseFrame);
  sceneRenderer?.updatePose(poseFrame);
  refreshCoordinateList(poseFrame);
});

resetCameraButton.addEventListener("click", () => sceneRenderer?.resetCamera());
