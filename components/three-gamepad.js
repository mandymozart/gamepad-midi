let here = new URL(window.location.href);
console.log(here);

var camX = 0.0;
if (here.searchParams.has("camX"))
  camX = parseFloat(here.searchParams.getAll("camX")[0]);

var camY = 0.0;
if (here.searchParams.has("camY"))
  camY = parseFloat(here.searchParams.getAll("camY")[0]);

var camZ = 0.0;
if (here.searchParams.has("camZ"))
  camZ = parseFloat(here.searchParams.getAll("camZ")[0]);

console.log(camZ);

var keyboard = new KeyboardState();
var clock = new THREE.Clock();

/*

////apple watch funnies
// Create WebSocket connection.
const socket = new WebSocket("ws://localhost:3476");

// Connection opened
socket.addEventListener("open", (event) => {
socket.send("Hello Server!");
});


var gyroData = new THREE.Vector3(0,0,0);
var heartRate = 0;

// Listen for messages
socket.addEventListener("message", (event) => {
//if(event.StartsWith("motion:"))
//    heartrate = float.Parse(result.Remove(0,7));

var st1 = event.data.toString();

if(st1.startsWith("heartRate:"))
    {
        st1 = st1.replace("heartRate:","");

        heartRate = parseInt(st1);

    }

if(st1.startsWith("motion:"))
{
    st1 = st1.replace("motion:[","");
    st1 = st1.replace("]","");
    var vec = st1.split(",");
    gyroData = new THREE.Vector3(vec[0], vec[1], vec[2]);
    console.log(gyroData);


}

//gyroData = new THREE.Vector3(event.data.motion,event.data.motion.y,event.data.motion.z);
console.log(event.data);
console.log(heartRate)

});

*/

function lerp(a, b, alpha) {
  return a + alpha * (b - a);
}

let interval;

var xL = 0,
  yL = 0,
  xR = 0,
  yR = 0,
  pL = 0,
  pR = 0,
  south = 0,
  west = 0,
  north = 0,
  east = 0,
  dDown = 0,
  dLeft = 0,
  dUp = 0,
  dRight = 0,
  rT = 0,
  lT = 0,
  rB = 0,
  lB = 0,
  selectButton = 0,
  startButton = 0;

// three.js: 3D WebGL funny stuff hehe

const scene = new THREE.Scene();
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 2;

//const camera = new THREE.OrthographicCamera(frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 0.1, 100);
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

var renderer = new THREE.WebGLRenderer({
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

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;

  camera.left = (-frustumSize * aspect) / 2;
  camera.right = (frustumSize * aspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;

  camera.aspect = window.innerWidth / window.innerHeight;
  //camera.setViewOffset(window.innerWidth, window.innerHeight,0,0, window.innerWidth,window.innerHeight);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

const geometry = new THREE.BoxGeometry(1, 1, 1);
//const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const materialHole = new THREE.MeshBasicMaterial({
  color: 0xaaaaaa,
  depthFunc: THREE.NeverDepth,
});
const materialRed = new THREE.MeshBasicMaterial({ color: 0xff0000 });
const materialGreen = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const materialBlue = new THREE.MeshBasicMaterial({ color: 0x0000ff });
const cube = new THREE.Mesh(geometry, material);

function billboardVertexShader() {
  return `
varying vec3 vUv; 

void main() {
  vUv = position; 

  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  //gl_Position = projectionMatrix * modelViewPosition; 
  gl_Position = projectionMatrix * (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(position.x, position.y, 0.0, 0.0) * .05);

}
`;
}

function fragmentShader() {
  return `
  uniform vec3 colorA; 
  uniform vec3 colorB; 
  varying vec3 vUv;
  uniform vec3 color;

  void main() {
    gl_FragColor = vec4(color, 1.0);
  }
`;
}

function axisVertexShader() {
  return `
varying vec3 vUv; 

void main() {
  vUv = position; 

  vec4 modelViewPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * modelViewPosition; 
  //gl_Position = projectionMatrix * (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0) + vec4(position.x, position.y, 0.0, 0.0) * .05);

}
`;
}
function axisFragmentShader() {
  return `
  varying vec3 vUv;

  void main() {
    gl_FragColor = vec4(ceil(vUv), 1.0);
  }
`;
}

const billboardMatX = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Vector3(1, 0, 0) },
  },

  vertexShader: billboardVertexShader(),
  fragmentShader: fragmentShader(),
});
const billboardMatY = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Vector3(0, 1, 0) },
  },

  vertexShader: billboardVertexShader(),
  fragmentShader: fragmentShader(),
});
const billboardMatZ = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Vector3(0, 0, 1) },
  },

  vertexShader: billboardVertexShader(),
  fragmentShader: fragmentShader(),
});

const axisMat = new THREE.ShaderMaterial({
  vertexShader: axisVertexShader(),
  fragmentShader: axisFragmentShader(),
});

var homeText = new THREE.LineSegments(HVFDraw("home"), material);

var controllerObject = new THREE.Group();

///////////////
//THUMBSTICKS//
///////////////

function thumbstick() {
  var procMesh = [];
  var circleScale = 0.1;
  var meshIndex = 0;

  var circleSteps = 32;

  for (var i = 0; i < circleSteps; i++) {
    //finalMesh[i-2] = new THREE.Vector3(0,0,0);//(thumbstickLines[indices[i - 1]]);
    //finalMesh[i-1] = new THREE.Vector3(0,0,1);//(thumbstickLines[indices[i]]);

    procMesh[i * 2] = new THREE.Vector3(
      Math.sin((i / circleSteps) * Math.PI * 2.0) * circleScale,
      0.2,
      Math.cos((i / circleSteps) * Math.PI * 2.0) * circleScale
    );
    procMesh[i * 2 + 1] = new THREE.Vector3(
      Math.sin(((i + 1) / circleSteps) * Math.PI * 2.0) * circleScale,
      0.2,
      Math.cos(((i + 1) / circleSteps) * Math.PI * 2.0) * circleScale
    );
  }
  meshIndex = procMesh.length;
  circleScale = 0.13;

  for (var i = 0; i < circleSteps; i++) {
    //finalMesh[i-2] = new THREE.Vector3(0,0,0);//(thumbstickLines[indices[i - 1]]);
    //finalMesh[i-1] = new THREE.Vector3(0,0,1);//(thumbstickLines[indices[i]]);

    procMesh[meshIndex + i * 2] = new THREE.Vector3(
      Math.sin((i / circleSteps) * Math.PI * 2.0) * circleScale,
      0.175,
      Math.cos((i / circleSteps) * Math.PI * 2.0) * circleScale
    );
    procMesh[meshIndex + i * 2 + 1] = new THREE.Vector3(
      Math.sin(((i + 1) / circleSteps) * Math.PI * 2.0) * circleScale,
      0.175,
      Math.cos(((i + 1) / circleSteps) * Math.PI * 2.0) * circleScale
    );
  }

  meshIndex = procMesh.length;

  procMesh[meshIndex] = new THREE.Vector3(0, 0.1, 0);
  procMesh[meshIndex + 1] = new THREE.Vector3(0, 0.16, 0);

  return new THREE.BufferGeometry().setFromPoints(procMesh);
}

leftStick = new THREE.LineSegments(thumbstick(), material);
rightStick = new THREE.LineSegments(thumbstick(), material);

var axisLines = [
  new THREE.Vector3(0.0, 0.0, 0.0),
  new THREE.Vector3(1.0, 0.0, 0.0),
  new THREE.Vector3(0.0, 0.0, 0.0),
  new THREE.Vector3(0.0, 1.0, 0.0),
  new THREE.Vector3(0.0, 0.0, 0.0),
  new THREE.Vector3(0.0, 0.0, 1.0),
];

leftAxis = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(axisLines),
  axisMat
);
leftAxis.scale.set(0.05, 0.05, 0.05);
leftStick.attach(leftAxis);

rightAxis = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(axisLines),
  axisMat
);
rightAxis.scale.set(0.05, 0.05, 0.05);
rightStick.attach(rightAxis);

var xTextL = new THREE.LineSegments(HVFDraw("x"), billboardMatX);
xTextL.position.x = 0.075;
leftStick.attach(xTextL);

var yTextL = new THREE.LineSegments(HVFDraw("y"), billboardMatY);
yTextL.position.y = 0.075;
leftStick.attach(yTextL);

var zTextL = new THREE.LineSegments(HVFDraw("z"), billboardMatZ);
zTextL.position.z = 0.075;
leftStick.attach(zTextL);

var xTextR = new THREE.LineSegments(HVFDraw("x"), billboardMatX);
xTextR.position.x = 0.075;
rightStick.attach(xTextR);

var yTextR = new THREE.LineSegments(HVFDraw("y"), billboardMatY);
yTextR.position.y = 0.075;
rightStick.attach(yTextR);

var zTextR = new THREE.LineSegments(HVFDraw("z"), billboardMatZ);
zTextR.position.z = 0.075;
rightStick.attach(zTextR);

leftStick.position.x = -0.35;
rightStick.position.x = 0.35;

leftStick.position.z = 0;
rightStick.position.z = 0;

leftStick.position.y = -0.25;
rightStick.position.y = -0.25;

controllerObject.add(leftStick);
controllerObject.add(rightStick);

////////////////
//FACE BUTTONS//
////////////////

var faceButtons = new THREE.Group();

function circleMesh(circleSteps = 16) {
  var procMesh = [];
  var circleScale = 0.1;
  var meshIndex = 0;

  for (var i = 0; i < circleSteps; i++) {
    procMesh[i * 2] = new THREE.Vector3(
      Math.sin((i / circleSteps) * Math.PI * 2.0) * circleScale,
      0,
      Math.cos((i / circleSteps) * Math.PI * 2.0) * circleScale
    );
    procMesh[i * 2 + 1] = new THREE.Vector3(
      Math.sin(((i + 1) / circleSteps) * Math.PI * 2.0) * circleScale,
      0,
      Math.cos(((i + 1) / circleSteps) * Math.PI * 2.0) * circleScale
    );
  }
  meshIndex = procMesh.length;

  return new THREE.BufferGeometry().setFromPoints(procMesh);
}

var southButton = new THREE.LineSegments(circleMesh(), material);
var southButtonSymbol = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.5, 0.5, 0),
    new THREE.Vector3(-0.5, -0.5, 0),
    new THREE.Vector3(-0.5, 0.5, 0),
    new THREE.Vector3(0.5, -0.5, 0),
  ]),
  material
);
southButtonSymbol.scale.set(0.1, 0.1, 0.1);
southButtonSymbol.rotation.x = -Math.PI * 0.5;

//southButtonSymbol = new THREE.LineSegments(HVFDraw("A"));
//southButtonSymbol.rotation.x = -Math.PI*.5;
//southButtonSymbol.scale.set(.2,.2,.2);

southButton.attach(southButtonSymbol);

var southButtonHole = new THREE.LineSegments(circleMesh(), materialHole);
southButtonHole.attach(southButton);

southButtonHole.scale.set(0.5, 0.5, 0.5);

southButtonHole.position.z = 0.1;

faceButtons.add(southButtonHole);

var westButton = new THREE.LineSegments(circleMesh(), material);
var westButtonSymbol = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.5, 0.5, 0),
    new THREE.Vector3(-0.5, -0.5, 0),
    new THREE.Vector3(-0.5, -0.5, 0),
    new THREE.Vector3(0.5, -0.5, 0),
    new THREE.Vector3(0.5, -0.5, 0),
    new THREE.Vector3(0.5, 0.5, 0),
    new THREE.Vector3(0.5, 0.5, 0),
    new THREE.Vector3(-0.5, 0.5, 0),
  ]),
  material
);
westButtonSymbol.scale.set(0.1, 0.1, 0.1);
westButtonSymbol.rotation.x = -Math.PI * 0.5;

//westButtonSymbol = new THREE.LineSegments(HVFDraw("X"));
//westButtonSymbol.rotation.x = -Math.PI*.5;
//westButtonSymbol.scale.set(.2,.2,.2);

westButton.attach(westButtonSymbol);

var westButtonHole = new THREE.LineSegments(circleMesh(), materialHole);
westButtonHole.attach(westButton);

westButtonHole.scale.set(0.5, 0.5, 0.5);

westButtonHole.position.x = -0.1;

faceButtons.add(westButtonHole);

var northButton = new THREE.LineSegments(circleMesh(), material);
var northButtonSymbol = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.6, -0.35, 0),
    new THREE.Vector3(0, 0.6, 0),
    new THREE.Vector3(0, 0.6, 0),
    new THREE.Vector3(0.6, -0.35, 0),
    new THREE.Vector3(0.6, -0.35, 0),
    new THREE.Vector3(-0.6, -0.35, 0),
  ]),
  material
);
northButtonSymbol.scale.set(0.1, 0.1, 0.1);
northButtonSymbol.rotation.x = -Math.PI * 0.5;

//northButtonSymbol = new THREE.LineSegments(HVFDraw("Y"));
//northButtonSymbol.rotation.x = -Math.PI*.5;
//northButtonSymbol.scale.set(.2,.2,.2);

northButton.attach(northButtonSymbol);

var northButtonHole = new THREE.LineSegments(circleMesh(), materialHole);
northButtonHole.attach(northButton);

northButtonHole.scale.set(0.5, 0.5, 0.5);

northButtonHole.position.z = -0.1;

faceButtons.add(northButtonHole);

var eastButton = new THREE.LineSegments(circleMesh(), material);
var eastButtonSymbol = new THREE.LineSegments(circleMesh(), material);

eastButtonSymbol.scale.set(0.65, 0.65, 0.65);

//eastButtonSymbol = new THREE.LineSegments(HVFDraw("B"));
//eastButtonSymbol.rotation.x = -Math.PI*.5;
//eastButtonSymbol.scale.set(.2,.2,.2);

eastButton.attach(eastButtonSymbol);

var eastButtonHole = new THREE.LineSegments(circleMesh(), materialHole);
eastButtonHole.attach(eastButton);

eastButtonHole.scale.set(0.5, 0.5, 0.5);

eastButtonHole.position.x = 0.1;

faceButtons.add(eastButtonHole);

controllerObject.add(faceButtons);

faceButtons.position.x = 0.5;
faceButtons.position.z = -0.4;

////////////////
//DPAD BUTTONS//
////////////////

var dPadLines = [
  new THREE.Vector3(-3.0, 0.0, -1.0),
  new THREE.Vector3(-3.0, 0.0, 1.0),
  new THREE.Vector3(-3.0, 0.0, 1.0),
  new THREE.Vector3(-1.5, 0.0, 1.0),
  new THREE.Vector3(-1.5, 0.0, 1.0),
  new THREE.Vector3(-0.5, 0.0, 0.0),
  new THREE.Vector3(-0.5, 0.0, 0.0),
  new THREE.Vector3(-1.5, 0.0, -1.0),
  new THREE.Vector3(-1.5, 0.0, -1.0),
  new THREE.Vector3(-3.0, 0.0, -1.0),
];

var dPadLeft = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dPadLines),
  material
);
var dPadRight = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dPadLines),
  material
);
var dPadUp = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dPadLines),
  material
);
var dPadDown = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dPadLines),
  material
);

dPadRight.rotation.z = Math.PI;

dPadUp.rotation.y = Math.PI * 0.5;
dPadUp.rotation.z = Math.PI;

dPadDown.rotation.y = -Math.PI * 0.5;
dPadDown.rotation.z = Math.PI;

var dPadButtons = new THREE.Group();
dPadButtons.add(dPadLeft);
dPadButtons.add(dPadRight);
dPadButtons.add(dPadUp);
dPadButtons.add(dPadDown);

//dPadButtons.scale.set(.05,.05,.05);

var dPadLeftHole = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dPadLines),
  materialHole
);
var dPadRightHole = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dPadLines),
  materialHole
);
var dPadUpHole = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dPadLines),
  materialHole
);
var dPadDownHole = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints(dPadLines),
  materialHole
);

dPadRightHole.rotation.z = Math.PI;

dPadUpHole.rotation.y = Math.PI * 0.5;
dPadUpHole.rotation.z = Math.PI;

dPadDownHole.rotation.y = -Math.PI * 0.5;
dPadDownHole.rotation.z = Math.PI;

var dPadHole = new THREE.Group();
dPadHole.add(dPadLeftHole);
dPadHole.add(dPadRightHole);
dPadHole.add(dPadUpHole);
dPadHole.add(dPadDownHole);

var dPadFull = new THREE.Group();
dPadFull.add(dPadButtons);
dPadFull.add(dPadHole);

dPadFull.scale.set(0.04, 0.05, 0.04);

dPadFull.position.x = -faceButtons.position.x;
dPadFull.position.z = faceButtons.position.z;

controllerObject.add(dPadFull);

////////////////////
//SHOULDER BUTTONS//
////////////////////

var leftShoulderButton = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1, 0.5, 0),
    new THREE.Vector3(-1, -0.5, 0),
    new THREE.Vector3(-1, -0.5, 0),
    new THREE.Vector3(1, -0.5, 0),
    new THREE.Vector3(1, -0.5, 0),
    new THREE.Vector3(1, 0.5, 0),
    new THREE.Vector3(1, 0.5, 0),
    new THREE.Vector3(-1, 0.5, 0),
  ]),
  material
);

var leftShoulderHole = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1, 0.5, 0),
    new THREE.Vector3(-1, -0.5, 0),
    new THREE.Vector3(-1, -0.5, 0),
    new THREE.Vector3(1, -0.5, 0),
    new THREE.Vector3(1, -0.5, 0),
    new THREE.Vector3(1, 0.5, 0),
    new THREE.Vector3(1, 0.5, 0),
    new THREE.Vector3(-1, 0.5, 0),
  ]),
  materialHole
);

leftShoulderHole.attach(leftShoulderButton);

var leftShoulder = new THREE.Group();
leftShoulder.add(leftShoulderHole);

leftShoulder.scale.set(0.1, 0.1, 0.75);
leftShoulder.position.x = -0.5;
leftShoulder.position.y = -0.125;
leftShoulder.position.z = -0.6;

controllerObject.add(leftShoulder);

var rightShoulderButton = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1, 0.5, 0),
    new THREE.Vector3(-1, -0.5, 0),
    new THREE.Vector3(-1, -0.5, 0),
    new THREE.Vector3(1, -0.5, 0),
    new THREE.Vector3(1, -0.5, 0),
    new THREE.Vector3(1, 0.5, 0),
    new THREE.Vector3(1, 0.5, 0),
    new THREE.Vector3(-1, 0.5, 0),
  ]),
  material
);

var rightShoulderHole = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1, 0.5, 0),
    new THREE.Vector3(-1, -0.5, 0),
    new THREE.Vector3(-1, -0.5, 0),
    new THREE.Vector3(1, -0.5, 0),
    new THREE.Vector3(1, -0.5, 0),
    new THREE.Vector3(1, 0.5, 0),
    new THREE.Vector3(1, 0.5, 0),
    new THREE.Vector3(-1, 0.5, 0),
  ]),
  materialHole
);

rightShoulderHole.attach(rightShoulderButton);

var rightShoulder = new THREE.Group();
rightShoulder.add(rightShoulderHole);

rightShoulder.scale.set(0.1, 0.1, 0.75);
rightShoulder.position.x = 0.5;
rightShoulder.position.y = -0.125;
rightShoulder.position.z = -0.6;

controllerObject.add(rightShoulder);

////////////
//TRIGGERS//
////////////

var leftTriggerButton = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1, 0.0, 0),
    new THREE.Vector3(-1, -1.5, 0),
    new THREE.Vector3(-1, -1.5, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(1, 0.0, 0),
    new THREE.Vector3(1, 0.0, 0),
    new THREE.Vector3(-1, 0.0, 0),
  ]),
  material
);

var leftTriggerHole = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1, 0.0, 0),
    new THREE.Vector3(-1, -1.5, 0),
    new THREE.Vector3(-1, -1.5, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(1, 0.0, 0),
    new THREE.Vector3(1, 0.0, 0),
    new THREE.Vector3(-1, 0.0, 0),
  ]),
  materialHole
);

leftTriggerButton.position.z = -0.25;
leftTriggerHole.attach(leftTriggerButton);

var leftTrigger = new THREE.Group();
leftTrigger.add(leftTriggerHole);

leftTrigger.scale.set(0.1, 0.1, 0.1);
leftTrigger.position.x = -0.5;
leftTrigger.position.y = -0.25;
leftTrigger.position.z = -0.58;
leftTrigger.rotation.x = -0.5;

controllerObject.add(leftTrigger);

var rightTriggerButton = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1, 0.0, 0),
    new THREE.Vector3(-1, -1.5, 0),
    new THREE.Vector3(-1, -1.5, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(1, 0.0, 0),
    new THREE.Vector3(1, 0.0, 0),
    new THREE.Vector3(-1, 0.0, 0),
  ]),
  material
);

var rightTriggerHole = new THREE.LineSegments(
  new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-1, 0.0, 0),
    new THREE.Vector3(-1, -1.5, 0),
    new THREE.Vector3(-1, -1.5, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(1, -1.5, 0),
    new THREE.Vector3(1, 0.0, 0),
    new THREE.Vector3(1, 0.0, 0),
    new THREE.Vector3(-1, 0.0, 0),
  ]),
  materialHole
);

rightTriggerButton.position.z = -0.25;
rightTriggerHole.attach(rightTriggerButton);

var rightTrigger = new THREE.Group();
rightTrigger.add(rightTriggerHole);

rightTrigger.scale.set(0.1, 0.1, 0.1);
rightTrigger.position.x = 0.5;
rightTrigger.position.y = -0.25;
rightTrigger.position.z = -0.58;
rightTrigger.rotation.x = -0.5;

controllerObject.add(rightTrigger);

scene.add(controllerObject);

camera.position.z = 2;
//camera.position.x = -1;
camera.position.y = 1.5;
camera.rotation.x = 0;
camera.rotation.z = 0.6;
camera.rotation.x = -0.3;

//camera.position.x += .3;
//camera.position.y += .8;

camera.rotation.z = 0; //Math.PI * .075;
//camera.rotation.x = Math.PI * -.15;
camera.rotation.x = -Math.PI * 0.3;
camera.rotation.y = Math.PI * 0.1;
camera.position.y = 2.0;
camera.position.z = 0.75;

//controllerObject.scale.set(.5,.5,.5);
camera.position.x = 1.75;
camera.position.x = 1;

camera.position.x += camX;
camera.position.y += camY;
camera.position.y += camZ;

function pollController() {
  var gamepads = navigator.getGamepads();
  for (var gp of gamepads) {
    if (gp != null) {
      //console.log(`Gamepad connected at index ${gp.index}: ${gp.id}. It has ${gp.buttons.length} buttons and ${gp.axes.length} axes.`);
      //console.log(gp.axes[0]);
      xL = gp.axes[0];
      yL = gp.axes[1];
      xR = gp.axes[2];
      yR = gp.axes[3];

      pL = gp.buttons[10].value;
      pR = gp.buttons[11].value;

      south = gp.buttons[0].value;
      north = gp.buttons[3].value;
      west = gp.buttons[2].value;
      east = gp.buttons[1].value;

      dDown = gp.buttons[13].value;
      dUp = gp.buttons[12].value;
      dLeft = gp.buttons[14].value;
      dRight = gp.buttons[15].value;

      lT = gp.buttons[6].value;
      rT = gp.buttons[7].value;

      lB = gp.buttons[4].value;
      rB = gp.buttons[5].value;

      //16 = dash

      selectButton = gp.buttons[8].value;
      startButton = gp.buttons[9].value;
    }
  }
}

function updateControllerGraphic() {
  leftStick.rotation.z = -xL / 2.0;
  leftStick.rotation.x = yL / 2.0;
  leftStick.position.y = pL ? -0.02 : 0.0;

  rightStick.rotation.z = -xR / 2.0;
  rightStick.rotation.x = yR / 2.0;
  rightStick.position.y = pR ? -0.02 : 0.0;

  southButton.position.y = lerp(
    southButton.position.y,
    0.04 - 0.03 * south,
    0.5
  );
  westButton.position.y = lerp(westButton.position.y, 0.04 - 0.03 * west, 0.5);
  northButton.position.y = lerp(
    northButton.position.y,
    0.04 - 0.03 * north,
    0.5
  );
  eastButton.position.y = lerp(eastButton.position.y, 0.04 - 0.03 * east, 0.5);

  //dPadDown.position.y     = lerp(dPadDown.position.y,     dDown ? 0.0 : .25,      .7);
  //dPadLeft.position.y     = lerp(dPadLeft.position.y,     dLeft ? 0.0 : .25,      .7);
  //dPadUp.position.y       = lerp(dPadUp.position.y,         dUp ? 0.0 : .25,      .7);
  //dPadRight.position.y    = lerp(dPadRight.position.y,   dRight ? 0.0 : .25,      .7);

  //dPadDown.position.y     = .25;
  //dPadLeft.position.y     = .25;
  //dPadUp.position.y       = .25;
  //dPadRight.position.y    = .25;

  dPadDown.position.y = 0.4;
  dPadLeft.position.y = 0.4;
  dPadUp.position.y = 0.4;
  dPadRight.position.y = 0.4;

  dPadButtons.rotation.x = lerp(
    dPadButtons.rotation.x,
    0.1 * (dDown - dUp),
    0.5
  );
  dPadButtons.rotation.z = lerp(
    dPadButtons.rotation.z,
    0.1 * (dLeft - dRight),
    0.5
  );

  //southButton.position.y  = lerp(southButton.position.y,  south ? 0.0 : 0.5,    .7);
  //westButton.position.y   = lerp(westButton.position.y,   west ?  0.0 : 0.5,     .7);
  //northButton.position.y  = lerp(northButton.position.y,  north ? 0.0 : 0.5,    .7);
  //eastButton.position.y   = lerp(eastButton.position.y,   east ?  0.0 : 0.5,     .7);

  leftShoulderButton.position.z = lerp(
    leftShoulderButton.position.z,
    -0.04 + 0.03 * lB,
    0.5
  );
  leftTriggerButton.rotation.x = lerp(
    leftTriggerButton.rotation.x,
    (1.0 - lT) * 0.5,
    0.7
  );
  leftTriggerButton.position.z = lerp(
    leftTriggerButton.position.z,
    -0.4 + 0.3 * lT,
    0.7
  );

  rightShoulderButton.position.z = lerp(
    rightShoulderButton.position.z,
    -0.04 + 0.03 * rB,
    0.5
  );
  rightTriggerButton.rotation.x = lerp(
    rightTriggerButton.rotation.x,
    (1.0 - rT) * 0.5,
    0.7
  );
  rightTriggerButton.position.z = lerp(
    rightTriggerButton.position.z,
    -0.4 + 0.3 * rT,
    0.7
  );

  //var lsAxis = new THREE.Vector2(xL,yL);
  //var rsAxis = new THREE.Vector2(xR,yR);
  //twist controller with weight of inputs, for funsies

  controllerObject.rotation.z = lerp(
    controllerObject.rotation.z,
    (dDown +
      dUp +
      dRight +
      dLeft -
      xL * 1 -
      yL * 2 +
      pL +
      lB +
      lT -
      (south + north + east + west + xR * 1 - yR * 2 + pR + rB + rT)) *
      0.1 *
      0.25,
    0.1
  );

  controllerObject.rotation.x = lerp(
    controllerObject.rotation.x,
    ((dDown + south) * 0 -
      (dUp + north) * 0 +
      (lB + lT + rB + rT) * 1 -
      0 +
      (yL + yR) * (Math.sign(yL) == Math.sign(yR) ? 1.0 : 0.0)) *
      0.25 *
      0.25,
    0.05
  );
}
var moveDistance = 0.0;

function update() {
  keyboard.update();

  moveDistance = 1 * clock.getDelta();

  if (keyboard.pressed("A")) camera.translateX(-moveDistance);

  if (keyboard.pressed("D")) camera.translateX(moveDistance);

  if (keyboard.pressed("Q")) camera.translateY(-moveDistance);

  if (keyboard.pressed("E")) camera.translateY(moveDistance);

  if (keyboard.pressed("W")) camera.translateZ(-moveDistance);

  if (keyboard.pressed("S")) camera.translateZ(moveDistance);
}

function animate() {
  pollController();
  updateControllerGraphic();

  update();

  // Use setInterval for more reliable background execution
  // requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

// Start animation with setInterval instead of requestAnimationFrame
// This ensures consistent execution even when window loses focus
let animationInterval;

function startAnimation() {
  // Clear any existing interval
  if (animationInterval) {
    clearInterval(animationInterval);
  }
  
  // Use setInterval for consistent 60fps execution
  animationInterval = setInterval(animate, 16); // ~60fps (1000ms/60 ≈ 16.67ms)
  console.log('Animation started with setInterval for background compatibility');
}

function stopAnimation() {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
    console.log('Animation stopped');
  }
}

// Start the animation
startAnimation();

// Optional: Listen for page visibility changes to provide feedback
document.addEventListener('visibilitychange', function() {
  console.log('Visibility changed:', document.visibilityState, 'Hidden:', document.hidden);
});
