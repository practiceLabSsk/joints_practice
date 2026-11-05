import { jointConnections, jointDefinitions } from "./jointData.js";

const initialCameraPosition = { x: 6, y: 5, z: 8 };

export function createSceneRenderer({ view, canvas }) {
  const THREE = window.THREE;
  if (!THREE || !THREE.OrbitControls) {
    throw new Error("Three.js and its matching OrbitControls are required");
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b0f17");

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(
    initialCameraPosition.x,
    initialCameraPosition.y,
    initialCameraPosition.z,
  );
  camera.lookAt(0, 0, 0);

  const grid = new THREE.GridHelper(10, 20, 0x52647d, 0x283444);
  grid.position.y = -0.002;
  scene.add(grid);
  scene.add(new THREE.AxesHelper(3));
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
  const jointMeshes = new Map();
  const jointGroup = new THREE.Group();
  jointGroup.name = "joints";

  for (const joint of jointDefinitions) {
    const mesh = new THREE.Mesh(jointGeometry, jointMaterials[joint.side]);
    mesh.name = joint.id;
    jointMeshes.set(joint.id, mesh);
    jointGroup.add(mesh);
  }
  scene.add(jointGroup);

  const connectionMaterials = {
    left: new THREE.LineBasicMaterial({ color: 0x65aaff, transparent: true, opacity: 0.82 }),
    right: new THREE.LineBasicMaterial({ color: 0xff748c, transparent: true, opacity: 0.82 }),
    center: new THREE.LineBasicMaterial({ color: 0xf1c96a, transparent: true, opacity: 0.82 }),
  };
  const connectionGroup = new THREE.Group();
  connectionGroup.name = "jointConnections";
  const connectionLines = jointConnections.map((connection) => {
    if (!jointMeshes.has(connection.startId) || !jointMeshes.has(connection.endId)) {
      throw new Error(`Unknown joint in connection: ${connection.startId}-${connection.endId}`);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(),
      new THREE.Vector3(),
    ]);
    const line = new THREE.Line(geometry, connectionMaterials[connection.side]);
    line.name = `${connection.startId}-${connection.endId}`;
    connectionGroup.add(line);
    return { connection, line };
  });
  scene.add(connectionGroup);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const renderScene = () => renderer.render(scene, camera);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
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

  if ("ResizeObserver" in window) {
    new ResizeObserver(resizeRenderer).observe(view);
  } else {
    window.addEventListener("resize", resizeRenderer);
  }
  resizeRenderer();

  function updatePose(poseFrame) {
    for (const joint of jointDefinitions) {
      const position = poseFrame.joints[joint.id];
      jointMeshes.get(joint.id).position.set(position.x, position.y, position.z);
    }

    for (const { connection, line } of connectionLines) {
      const start = poseFrame.joints[connection.startId];
      const end = poseFrame.joints[connection.endId];
      const positions = line.geometry.attributes.position;
      positions.setXYZ(0, start.x, start.y, start.z);
      positions.setXYZ(1, end.x, end.y, end.z);
      positions.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    }

    renderScene();
  }

  function setSelectedJoint(jointId) {
    for (const joint of jointDefinitions) {
      const scale = joint.id === jointId ? 1.38 : 1;
      jointMeshes.get(joint.id).scale.setScalar(scale);
    }
    renderScene();
  }

  function resetCamera() {
    camera.position.set(
      initialCameraPosition.x,
      initialCameraPosition.y,
      initialCameraPosition.z,
    );
    camera.up.set(0, 1, 0);
    controls.target.set(0, 0, 0);
    controls.update();
    renderScene();
  }

  return { updatePose, setSelectedJoint, resetCamera };
}
