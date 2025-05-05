import * as THREE from 'three';
import { simulate, clearStars, newStar, setInitialVelocities, newRandstar, stars} from './star.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { initGUI, initModeGUI, guiControls, startGUI } from './guiManager.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// welcome section
let enter = false;
document.getElementById('startButton').addEventListener('click', () => {
  document.getElementById('welcomeOverlay').style.display = 'none';
  enter = true;
  mainOptions.cameraSpeed = 1;
  guiControls.ResetButton();
  reset();
  setup(mainOptions.currentMode);
  startGUI();

  const cornerText = document.createElement('div');
  cornerText.id = 'cornerText';
  cornerText.innerHTML = `
      WASD - Move Camera<br>
      Left Click - Rotate Camera<br>
      Right Click At Star - Move Star<br>
      R - Reset
  `;
  document.body.appendChild(cornerText);
});

document.body.style.overflow = 'hidden';
export const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.1, 10000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Load skybox images
const loader = new THREE.CubeTextureLoader();
const texture = loader.load([
  '/stars.png', // right
  '/stars.png', // left
  '/stars.png', // top
  '/stars.png', // bottom
  '/stars.png', // front
  '/stars.png'  // back
]);
scene.background = texture;

// Bloom effect
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Bloom pass
export const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,  // strength
  0.4,  // radius
  0.85  // threshold
);
composer.addPass(bloomPass);

// controls
const keys = { w: false, a: false, s: false, d: false, r:false };

document.addEventListener('keydown', (event) => {
  if (event.key.toLowerCase() in keys) keys[event.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (event) => {
  if (event.key.toLowerCase() in keys) keys[event.key.toLowerCase()] = false;
});

function zoomOut(){
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  camera.position.addScaledVector(direction, -0.1);
}

function updateCameraPosition() {
  const moveSpeed = mainOptions.cameraSpeed; // Adjust speed as needed
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);

  if (keys.w) {
    camera.position.addScaledVector(direction, moveSpeed);
  }
  if (keys.s) {
    camera.position.addScaledVector(direction, -moveSpeed);
  }

  const right = new THREE.Vector3();
  right.crossVectors(direction, camera.up).normalize();

  if (keys.a) {
    camera.position.addScaledVector(right, -moveSpeed);
  }
  if (keys.d) {
    camera.position.addScaledVector(right, moveSpeed);
  }

  //spacial
  if(keys.r){
    guiControls.ResetButton();
  }

  // Keep target at a point in front of the camera
  controls.target.copy(camera.position).add(direction);
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.zoomSpeed = 0;

// Helpers
const axisHelper = new THREE.AxesHelper(100);
//scene.add(axisHelper);
const gridHelper = new THREE.GridHelper(10000, 100);
//scene.add(gridHelper);

export const helper = {
  axisHelper: axisHelper,
  gridHelper: gridHelper,
  background: texture,
}

export const mainOptions = {
  dt: 10,
  div: 1,
  started: false,
  stoped: true,
  currentMode: "Solar System",
  gridOn: true,
  axisOn: true,
  background: true,
  textScale: 10,
  cameraSpeed: 0,
  starCount: 500
};
initGUI();

function animate() {
  requestAnimationFrame(animate);
  if(mainOptions && !mainOptions.stoped) simulate();
  if(!enter) zoomOut();
  updateCameraPosition();
  controls.update();
  composer.render();
  //renderer.render(scene, camera);
}

export function reset(){
  mainOptions.dt = 0;
  clearStars();
  mainOptions.gridOn = true;
  mainOptions.axisOn = true;
  mainOptions.background = true
  scene.background = texture;
  scene.add(axisHelper);
  scene.add(gridHelper);
  bloomPass.strength = 1.5;
  bloomPass.radius = 0.4;
  bloomPass.threshold = 0.85;
}

export function setup(mode) {
  switch (mode) {
    case "Solar System":
      setupSolarSystem();
      break;
    case "3-body Problem":
      setupThreeBodyProblem();
      break;
    case "Galaxy (n-body)":
      setupGalaxy();
      break;
    case "Custom":
      setupCustom();
      break;
    default:
      setupSolarSystem();
      console.error("Unknown mode:", mode);
  }
  initModeGUI();
}

function setupSolarSystem() {
  camera.position.set(100, 100, 300);
  camera.lookAt(0, 0, 0);
  const distance = 1.49e11;

  const sun = newStar(0, 0, 15, 0xffff00, 2, 30);
  sun.setName("Sun");
  sun.isSun = true;
  const mercury = newStar(distance * 0.387, 0, 1, 0xaaaaaa, 3.3, 23);
  mercury.setName("Mercury");
  mercury.setEmitLight(false);
  const venus = newStar(distance * 0.723, 0, 1, 0xffa500, 4.87, 24);
  venus.setName("Venus");
  venus.setEmitLight(false);
  const earth = newStar(distance, 0, 3, 0x3333ff, 5.97, 24);
  earth.setName("Earth");
  earth.setEmitLight(false);
  const mars = newStar(distance * 1.524, 0, 2, 0xff0000, 6.42, 23);
  mars.setName("Mars");
  mars.setEmitLight(false);
  const jupiter = newStar(distance * 5.2, 0, 7, 0xffa500, 1.898, 27);
  jupiter.setName("Jupiter");
  jupiter.setEmitLight(false);
  const saturn = newStar(distance * 9.58, 0, 6, 0xffd700, 5.683, 26);
  saturn.setName("Saturn");
  saturn.setEmitLight(false);
  const uranus = newStar(distance * 19.22, 0, 5, 0x00ffff, 8.681, 25);
  uranus.setName("Uranus");
  uranus.setEmitLight(false);
  const neptune = newStar(distance * 30.05, 0, 5, 0x0000ff, 1.024, 26);
  neptune.setName("Neptune");
  neptune.setEmitLight(false);
  
  mainOptions.div = 1;
  setInitialVelocities();
}

function setupThreeBodyProblem(){
  camera.position.set(100, 100, 300);
  camera.lookAt(0, 0, 0);

  const distance = 1.49e11;
  const massCof = 1;
  const massExp = 30;

  const A = newStar(-distance, 0, 6, 0xff3333, massCof, massExp);
  const B = newStar(distance , 0, 6, 0x6565ff, massCof, massExp);
  const C = newStar(0, distance * Math.sqrt(3), 6, 0xffff00, massCof, massExp);

  mainOptions.div = 3;
  setInitialVelocities();
}

function setupGalaxy(){
  camera.position.set(0, 2000, 0);
  camera.lookAt(0, 0, 0);

  for(let i = 0; i < mainOptions.starCount; i++){
    const rand = Math.random();
    if(rand > 0.5) newRandstar(30, 5, 2);
    else newRandstar(5, 30, 2);
  }
  bloomPass.strength = 3;
  bloomPass.radius = 1.0;
  bloomPass.threshold = 0.5;
  mainOptions.div = 1;
  mainOptions.gridOn = false;
  mainOptions.axisOn = false;
  mainOptions.background = false;
  scene.remove(axisHelper);
  scene.remove(gridHelper);
  scene.background = null;
  setInitialVelocities();
}

function setupCustom(){
  camera.position.set(100, 100, 300);
  camera.lookAt(0, 0, 0);
  mainOptions.div = 1;
}  

setup(mainOptions.currentMode);
animate();
guiControls.StartButton();

// Camera setup
camera.position.z = 30;
camera.position.y = 10;
camera.position.x = 10;

// mouse drag
renderer.domElement.addEventListener('contextmenu', e => e.preventDefault());

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let selectedSphere = null;
let dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // XZ plane
let dragOffset = new THREE.Vector3();

renderer.domElement.addEventListener('mousedown', event => {
  if (event.button !== 2) return; // Right mouse only

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(getMeshStars());

  let found = false;
  for(let i = 0; i < intersects.length; ++i){
    if(intersects[i].object.type === "Mesh"){
      found = true;
      selectedSphere = intersects[i].object;
      break;
    }
  }
  if(!found) return;

  isDragging = true;
  // Fix plane at current y-level of sphere
  dragPlane.set(new THREE.Vector3(0, 1, 0), -selectedSphere.position.y);

  // Get intersection point on the plane
  const intersection = new THREE.Vector3();
  raycaster.ray.intersectPlane(dragPlane, intersection);

  // Store the offset between the intersection and the object's origin
  dragOffset.copy(intersection).sub(selectedSphere.position);
  
});

renderer.domElement.addEventListener('mousemove', event => {
  if (!isDragging || !selectedSphere) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersection = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
    selectedSphere.position.copy(intersection.sub(dragOffset));
  }
});


renderer.domElement.addEventListener('mouseup', event => {
  if (event.button === 2) {
    isDragging = false;
    selectedSphere = null;
    setInitialVelocities();
  }
});

function getMeshStars(){
  let meshStar = [];
  stars.forEach((star) => {
    meshStar.push(star.mesh);
  })
  return meshStar;
}
