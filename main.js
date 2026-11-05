import {
  getCurrentPoseFrame,
  jointDefinitions,
  resetJointPositions,
  setCurrentPoseFrame,
  setJointCoordinate,
} from "./jointData.js";
import { DEMO_DURATION_SECONDS, getDemoFrameAt } from "./demoData.js";
import { getCsvFrameAtTime, parseCsvPoseFrames } from "./csvData.js";
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
const timeline = document.querySelector("#demo-timeline");
const playToggle = document.querySelector("#demo-play-toggle");
const playbackTime = document.querySelector("#playback-time");
const sourceKicker = document.querySelector("#source-kicker");
const activeSourceName = document.querySelector("#active-source-name");
const csvFileInput = document.querySelector("#csv-file-input");
const csvStatus = document.querySelector("#csv-status");
const useDemoSourceButton = document.querySelector("#use-demo-source");
const useCsvSourceButton = document.querySelector("#use-csv-source");

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

let sceneRenderer;
let activeSource = "demo";
let csvFrames = null;
let csvFileName = "";
let currentPlaybackTime = 0;
let csvPlaybackTime = null;
let lastRenderedCsvTime = null;
let playbackActive = false;
let playbackAnchorTime = 0;
let playbackStartedAt = 0;
let animationRequestId = 0;

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

function sideLabel(side) {
  if (side === "center") return "中央";
  return side === "left" ? "左" : "右";
}

function getPlaybackRange() {
  if (activeSource === "csv" && csvFrames) {
    return {
      start: csvFrames[0].time,
      end: csvFrames[csvFrames.length - 1].time,
    };
  }
  return { start: 0, end: DEMO_DURATION_SECONDS };
}

function updateSourceControls() {
  const usingDemo = activeSource === "demo";
  const range = getPlaybackRange();
  sourceKicker.textContent = usingDemo ? "DEMO MOTION" : "CSV PLAYBACK";
  activeSourceName.textContent = usingDemo ? "その場で歩く" : csvFileName;
  useDemoSourceButton.disabled = usingDemo;
  useCsvSourceButton.disabled = !csvFrames || !usingDemo;
  timeline.min = String(range.start);
  timeline.max = String(range.end);
  timeline.step = usingDemo ? "0.01" : "any";
  timeline.setAttribute(
    "aria-label",
    usingDemo ? "デモ動作の時間" : "CSV再生時間（サンプル時刻へ移動）",
  );
  resetJointsButton.textContent = usingDemo
    ? "関節位置をリセット"
    : "CSVの先頭へ戻る";
  updatePlayToggle();
}

function updatePlayToggle() {
  playToggle.textContent = playbackActive
    ? "⏸ 一時停止"
    : activeSource === "demo" ? "▶ デモ再生" : "▶ CSV再生";
  playToggle.setAttribute("aria-pressed", String(playbackActive));
}

function updatePlaybackReadout(time) {
  const range = getPlaybackRange();
  playbackTime.textContent = `${time.toFixed(2)} / ${range.end.toFixed(2)} 秒`;
  timeline.value = String(time);
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

function renderActiveTime(time, force = false) {
  let frame;
  if (activeSource === "demo") {
    frame = getDemoFrameAt(time);
  } else if (csvFrames) {
    frame = getCsvFrameAtTime(csvFrames, time);
  } else {
    return;
  }

  currentPlaybackTime = frame.time;
  if (activeSource === "csv") csvPlaybackTime = frame.time;
  updatePlaybackReadout(frame.time);

  if (activeSource === "demo" || force || lastRenderedCsvTime !== frame.time) {
    setCurrentPoseFrame(frame);
    if (activeSource === "csv") lastRenderedCsvTime = frame.time;
    refreshJointViews();
  }
}

function pausePlayback() {
  if (!playbackActive) return;
  playbackActive = false;
  cancelAnimationFrame(animationRequestId);
  updatePlayToggle();
}

function animatePlayback(timestamp) {
  if (!playbackActive) return;
  const elapsed = (timestamp - playbackStartedAt) / 1000;
  const requestedTime = playbackAnchorTime + elapsed;

  if (activeSource === "demo") {
    renderActiveTime(requestedTime % DEMO_DURATION_SECONDS);
  } else {
    const { end } = getPlaybackRange();
    if (requestedTime >= end) {
      renderActiveTime(end, true);
      pausePlayback();
      return;
    }
    renderActiveTime(requestedTime);
  }

  animationRequestId = requestAnimationFrame(animatePlayback);
}

function togglePlayback() {
  if (playbackActive) {
    pausePlayback();
    return;
  }

  const { start, end } = getPlaybackRange();
  if (activeSource === "csv" && currentPlaybackTime >= end) {
    renderActiveTime(start, true);
  } else if (activeSource === "demo" && currentPlaybackTime >= end) {
    renderActiveTime(0, true);
  }

  playbackActive = true;
  playbackAnchorTime = currentPlaybackTime;
  playbackStartedAt = performance.now();
  updatePlayToggle();
  animationRequestId = requestAnimationFrame(animatePlayback);
}

function sideLabelFor(joint) {
  selectedJointSide.className = `joint-side joint-side-${joint.side}`;
  selectedJointSide.textContent = sideLabel(joint.side);
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
  sideLabelFor(joint);

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

function selectJoint(jointId) {
  selectedJointId = jointId;
  jointSelect.value = jointId;
  const poseFrame = getCurrentPoseFrame();
  syncSelectedJointControls(poseFrame);
  refreshCoordinateList(poseFrame);
}

function updateSelectedCoordinate(axis, source) {
  pausePlayback();
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

function clearCsvStatusError() {
  csvStatus.classList.remove("is-error");
}

async function loadCsvFile(file) {
  clearCsvStatusError();
  try {
    const frames = parseCsvPoseFrames(await file.text());
    pausePlayback();
    csvFrames = frames;
    csvFileName = file.name;
    csvPlaybackTime = frames[0].time;
    lastRenderedCsvTime = null;
    activeSource = "csv";
    currentPlaybackTime = frames[0].time;
    updateSourceControls();
    renderActiveTime(currentPlaybackTime, true);
    csvStatus.textContent = `${file.name} · ${frames.length}行 · ${frames[0].time}〜${frames[frames.length - 1].time}秒`;
  } catch (error) {
    csvStatus.classList.add("is-error");
    csvStatus.textContent = `読み込みできませんでした: ${error.message}`;
  } finally {
    csvFileInput.value = "";
  }
}

function switchToDemo() {
  pausePlayback();
  activeSource = "demo";
  currentPlaybackTime = 0;
  updateSourceControls();
  renderActiveTime(0, true);
  csvStatus.classList.remove("is-error");
  csvStatus.textContent = csvFrames
    ? `デモ再生中 · ${csvFileName} は読み込み済みです`
    : "JavaScriptの仮データです。CSV形式はCSV_FORMAT.mdを参照してください。";
}

function switchToCsv() {
  if (!csvFrames) return;
  pausePlayback();
  activeSource = "csv";
  currentPlaybackTime = csvPlaybackTime ?? csvFrames[0].time;
  updateSourceControls();
  renderActiveTime(currentPlaybackTime, true);
  csvStatus.classList.remove("is-error");
  csvStatus.textContent = `${csvFileName} · ${csvFrames.length}行 · ${csvFrames[0].time}〜${csvFrames[csvFrames.length - 1].time}秒`;
}

function resetActiveSource() {
  pausePlayback();
  if (activeSource === "demo") {
    currentPlaybackTime = 0;
    const poseFrame = resetJointPositions();
    updatePlaybackReadout(0);
    syncSelectedJointControls(poseFrame);
    sceneRenderer?.updatePose(poseFrame);
    refreshCoordinateList(poseFrame);
  } else if (csvFrames) {
    renderActiveTime(csvFrames[0].time, true);
  }
}

buildJointSelector();
buildCoordinateRows();
updateSourceControls();
renderActiveTime(0, true);
syncSelectedJointControls();

jointSelect.addEventListener("change", () => selectJoint(jointSelect.value));

for (const axis of axes) {
  const control = axisControls.get(axis);
  control.number.addEventListener("input", () => updateSelectedCoordinate(axis, "number"));
  control.number.addEventListener("change", () => {
    if (!Number.isFinite(control.number.valueAsNumber)) syncSelectedJointControls();
  });
  control.slider.addEventListener("input", () => updateSelectedCoordinate(axis, "slider"));
}

playToggle.addEventListener("click", togglePlayback);
timeline.addEventListener("input", () => {
  pausePlayback();
  renderActiveTime(timeline.valueAsNumber, true);
});
csvFileInput.addEventListener("change", () => {
  const [file] = csvFileInput.files;
  if (file) loadCsvFile(file);
});
useDemoSourceButton.addEventListener("click", switchToDemo);
useCsvSourceButton.addEventListener("click", switchToCsv);
resetJointsButton.addEventListener("click", resetActiveSource);
resetCameraButton.addEventListener("click", () => sceneRenderer?.resetCamera());
