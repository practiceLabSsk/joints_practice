import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  jointConnections,
  jointData,
  resetJointPositions,
  setJointCoordinate,
} from "./jointData.js";

const view = document.querySelector("#scene-view");
const canvas = document.querySelector("#scene-canvas");
const rendererStatus = document.querySelector("#renderer-status-text");
const messageTitle = document.querySelector("#scene-message-title");
const messageDetail = document.querySelector("#scene-message-detail");
const axisLegend = document.querySelector("#axis-legend");
const jointSelect = document.querySelector("#joint-select");
const coordinateList = document.querySelector("#coordinate-list");
const resetJointsButton = document.querySelector("#reset-joints");
const resetCameraButton = document.querySelector("#reset-camera");

const axes = ["x", "y", "z"];
const sliderMinimum = -3;
const sliderMaximum = 3;
let selectedJointId = jointData[0].id;
const jointsById = new Map(jointData.map((joint) => [joint.id, joint]));
const jointMeshes = new Map();
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

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0b0f17");

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
const initialCameraPosition = new THREE.Vector3(6, 5, 8);
camera.position.copy(initialCameraPosition);
camera.lookAt(0, 0, 0);

const grid = new THREE.GridHelper(10, 20, 0x52647d, 0x283444);
grid.position.y = -0.002;
scene.add(grid);

const axesHelper = new THREE.AxesHelper(3);
scene.add(axesHelper);

scene.add(new THREE.HemisphereLight(0xd9e7ff, 0x202838, 1.5));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(-4, 8, 6);
scene.add(keyLight);

const jointGeometry = new THREE.SphereGeometry(0.07, 24, 16);
const jointMaterials = {
  left: new THREE.MeshStandardMaterial({ color: 0x65aaff, roughness: 0.48 }),
  right: new THREE.MeshStandardMaterial({ color: 0xff748c, roughness: 0.48 }),
  center: new THREE.MeshStandardMaterial({ color: 0xf1c96a, roughness: 0.48 }),
};
const jointGroup = new THREE.Group();
jointGroup.name = "joints";

for (const joint of jointData) {
  const mesh = new THREE.Mesh(jointGeometry, jointMaterials[joint.side]);
  mesh.name = joint.id;
  jointMeshes.set(joint.id, mesh);
  jointGroup.add(mesh);
}
scene.add(jointGroup);

const connectionMaterials = {
  left: new THREE.LineBasicMaterial({ color: 0x65aaff, transparent: true, opacity: 0.82 }),
  right: new THREE.LineBasicMaterial({ color: 0xff748c, transparent: true, opacity: 0.82 }),
};
const connectionGroup = new THREE.Group();
connectionGroup.name = "jointConnections";
const connectionLines = jointConnections.map((connection) => {
  const start = jointsById.get(connection.startId).position;
  const end = jointsById.get(connection.endId).position;
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(start.x, start.y, start.z),
    new THREE.Vector3(end.x, end.y, end.z),
  ]);
  const line = new THREE.Line(geometry, connectionMaterials[connection.side]);
  line.name = `${connection.startId}-${connection.endId}`;
  connectionGroup.add(line);
  return { connection, line };
});
scene.add(connectionGroup);

let renderer;
let controls;
let renderScene = () => {};

function updateSceneFromData() {
  for (const joint of jointData) {
    const mesh = jointMeshes.get(joint.id);
    mesh.position.set(joint.position.x, joint.position.y, joint.position.z);
  }

  for (const { connection, line } of connectionLines) {
    const start = jointsById.get(connection.startId).position;
    const end = jointsById.get(connection.endId).position;
    const positions = line.geometry.attributes.position;
    positions.setXYZ(0, start.x, start.y, start.z);
    positions.setXYZ(1, end.x, end.y, end.z);
    positions.needsUpdate = true;
    line.geometry.computeBoundingSphere();
  }

  renderScene();
}

function formatCoordinate(value) {
  return (Object.is(value, -0) ? 0 : value).toFixed(3);
}

function buildJointSelector() {
  for (const joint of jointData) {
    const option = document.createElement("option");
    option.value = joint.id;
    option.textContent = joint.name;
    jointSelect.append(option);
  }
  jointSelect.value = selectedJointId;
}

function buildCoordinateRows() {
  for (const joint of jointData) {
    const row = document.createElement("article");
    row.className = "coordinate-row";
    row.setAttribute("role", "listitem");

    const heading = document.createElement("div");
    heading.className = "coordinate-row-heading";

    const name = document.createElement("span");
    name.className = "coordinate-name";
    name.textContent = joint.name;

    const side = document.createElement("span");
    side.className = `joint-side joint-side-${joint.side}`;
    side.textContent = joint.side === "center" ? "中央" : joint.side === "left" ? "左" : "右";
    heading.append(name, side);

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
      value.textContent = formatCoordinate(joint.position[axis]);
      cell.append(axisLabel, value);
      values.append(cell);
      valueElements.set(axis, value);
    }

    row.append(heading, values);
    coordinateList.append(row);
    coordinateRows.set(joint.id, { row, valueElements });
  }
}

function syncSelectedJointControls() {
  const joint = jointsById.get(selectedJointId);
  for (const axis of axes) {
    const control = axisControls.get(axis);
    const value = joint.position[axis];
    control.number.value = formatCoordinate(value);
    control.slider.value = String(Math.min(sliderMaximum, Math.max(sliderMinimum, value)));
  }
}

function refreshCoordinateList() {
  for (const joint of jointData) {
    const row = coordinateRows.get(joint.id);
    row.row.classList.toggle("is-selected", joint.id === selectedJointId);
    for (const axis of axes) {
      row.valueElements.get(axis).textContent = formatCoordinate(joint.position[axis]);
    }
  }
}

function refreshJointViews() {
  updateSceneFromData();
  refreshCoordinateList();
}

function updateSelectedCoordinate(axis, source) {
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

function resetCamera() {
  if (!controls) return;
  camera.position.copy(initialCameraPosition);
  camera.up.set(0, 1, 0);
  controls.target.set(0, 0, 0);
  controls.update();
  renderScene();
}

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderScene = () => renderer.render(scene, camera);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 2;
  controls.maxDistance = 24;
  controls.target.set(0, 0, 0);
  controls.update();
  controls.addEventListener("change", renderScene);

  const resizeRenderer = () => {
    const { width, height } = view.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderScene();
  };

  new ResizeObserver(resizeRenderer).observe(view);
  resizeRenderer();

  rendererStatus.textContent = "Three.js / WebGL 準備完了";
  messageTitle.textContent = "カメラ操作";
  axisLegend.hidden = false;
  resetCameraButton.disabled = false;
} catch (error) {
  console.error("Three.js renderer initialization failed:", error);
  rendererStatus.textContent = "WebGL を初期化できませんでした";
  messageTitle.textContent = "3D表示を開始できませんでした";
  messageDetail.textContent = "WebGLに対応したブラウザーで開いてください";
  axisLegend.hidden = true;
}

buildJointSelector();
buildCoordinateRows();
syncSelectedJointControls();
refreshJointViews();

jointSelect.addEventListener("change", () => {
  selectedJointId = jointSelect.value;
  syncSelectedJointControls();
  refreshCoordinateList();
});

for (const axis of axes) {
  const control = axisControls.get(axis);
  control.number.addEventListener("input", () => updateSelectedCoordinate(axis, "number"));
  control.number.addEventListener("change", () => {
    if (!Number.isFinite(control.number.valueAsNumber)) syncSelectedJointControls();
  });
  control.slider.addEventListener("input", () => updateSelectedCoordinate(axis, "slider"));
}

resetJointsButton.addEventListener("click", () => {
  resetJointPositions();
  syncSelectedJointControls();
  refreshJointViews();
});

resetCameraButton.addEventListener("click", resetCamera);
