// Three.js scene setup for VRM avatar system

// Keyboard state tracking
var keyboard = new KeyboardState();
var clock = new THREE.Clock();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.querySelector("#gamepad-3d-canvas").appendChild(renderer.domElement);

// Add lighting for proper VRM texture visibility
const ambientLight = new THREE.AmbientLight(0x404040, 0.6); // Soft ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 1).normalize();
scene.add(directionalLight);

// Expose globally for VRM system
window.scene = scene;
window.renderer = renderer;
window.camera = camera;

// Set camera position
camera.position.y = 1.6;
camera.position.z = 1;
camera.rotation.x = 0;  // Slight downward angle to see controller


window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

// Camera movement controls
function updateCameraControls() {
  keyboard.update();
  
  const moveDistance = 2 * clock.getDelta();
  
  // WASD movement
  if (keyboard.pressed("W")) camera.translateZ(-moveDistance);
  if (keyboard.pressed("S")) camera.translateZ(moveDistance);
  if (keyboard.pressed("A")) camera.translateX(-moveDistance);
  if (keyboard.pressed("D")) camera.translateX(moveDistance);
  
  // Q/E for up/down movement
  if (keyboard.pressed("Q")) camera.translateY(-moveDistance);
  if (keyboard.pressed("E")) camera.translateY(moveDistance);
}

// Simple animation loop for VRM updates
function animate() {
  requestAnimationFrame(animate);
  
  // Update camera controls
  updateCameraControls();
  
  // Update VRM if it exists
  if (window.vrmManager) {
    window.vrmManager.update();
  }
  
  renderer.render(scene, camera);
}

animate();
