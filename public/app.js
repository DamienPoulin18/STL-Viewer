// STL Viewer minimal — public/app.js
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(window.devicePixelRatio);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071018);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
camera.position.set(0, 0, 200);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(50, 50, 50);
scene.add(dirLight);

const grid = new THREE.GridHelper(400, 40, 0x0b2a36, 0x08202a);
grid.position.y = -80;
scene.add(grid);

let currentMesh = null;
const loader = new THREE.STLLoader();

function resize() {
  const wrap = document.getElementById('canvasWrap');
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

function fitCameraToObject(object, offset = 1.4) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const fitHeightDistance = maxSize / (2 * Math.tan((camera.fov * Math.PI) / 360));
  const distance = fitHeightDistance * offset;
  camera.position.copy(center);
  camera.position.x += distance;
  camera.position.y += distance / 3;
  camera.position.z += distance;
  camera.lookAt(center);
  controls.target.copy(center);
  controls.update();
}

function addMeshFromGeometry(geometry, color = 0xff8a65, wireframe = false, scale = 1) {
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh.geometry.dispose();
    currentMesh.material.dispose();
    currentMesh = null;
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color, metalness: 0.2, roughness: 0.6, wireframe });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(scale);
  geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  geometry.boundingBox.getCenter(center);
  mesh.position.sub(center);
  scene.add(mesh);
  currentMesh = mesh;
  fitCameraToObject(mesh);
  const triCount = geometry.index ? geometry.index.count / 3 : Math.round(geometry.attributes.position.count / 3);
  document.getElementById('modelInfo').textContent = `Triangles: ${triCount}`;
}

// Drag & drop + file input
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const thumbList = document.getElementById('thumbList');
const resetBtn = document.getElementById('resetBtn');

dropArea.addEventListener('dragover', e => { e.preventDefault(); dropArea.classList.add('hover'); });
dropArea.addEventListener('dragleave', () => dropArea.classList.remove('hover'));
dropArea.addEventListener('drop', e => {
  e.preventDefault();
  dropArea.classList.remove('hover');
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

fileInput.addEventListener('change', e => {
  const f = e.target.files[0];
  if (f) handleFile(f);
});

resetBtn.addEventListener('click', () => {
  if (currentMesh) {
    scene.remove(currentMesh);
    currentMesh = null;
    document.getElementById('modelInfo').textContent = 'Aucun modèle chargé';
  }
});

function handleFile(file) {
  if (!file.name.toLowerCase().endsWith('.stl')) {
    alert('Veuillez sélectionner un fichier .stl');
    return;
  }
  const reader = new FileReader();
  reader.onload = (ev) => {
    const arrayBuffer = ev.target.result;
    const geometry = loader.parse(arrayBuffer);
    const color = document.getElementById('color').value || '#ff8a65';
    const wire = document.getElementById('wireframe').checked;
    const scale = parseFloat(document.getElementById('scale').value);
    addMeshFromGeometry(geometry, new THREE.Color(color).getHex(), wire, scale);
    addThumbnailFromFile(file);
  };
  reader.readAsArrayBuffer(file);
}

function addThumbnailFromFile(file) {
  // On crée une vignette simple à partir du fichier (URL blob)
  const url = URL.createObjectURL(file);
  const div = document.createElement('div');
  div.className = 'thumb';
  const img = document.createElement('img');
  img.src = url;
  img.alt = file.name;
  div.appendChild(img);
  thumbList.prepend(div);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// UI bindings
document.getElementById('wireframe').addEventListener('change', e => { if (currentMesh) currentMesh.material.wireframe = e.target.checked; });
document.getElementById('color').addEventListener('input', e => { if (currentMesh) currentMesh.material.color.set(e.target.value); });
document.getElementById('scale').addEventListener('input', e => { if (currentMesh) currentMesh.scale.setScalar(parseFloat(e.target.value)); });
document.getElementById('ambient').addEventListener('input', e => { ambientLight.intensity = parseFloat(e.target.value); });
document.getElementById('dir').addEventListener('input', e => { dirLight.intensity = parseFloat(e.target.value); });

// Render loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
