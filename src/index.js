import * as THREE from "three";
import * as Tone from "tone";
import { Noise } from "noisejs";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./styles.css";

let scene, camera, renderer;
let geometry, material, cube;
let colour, intensity, light;
let ambientLight;

let orbit;

let listener, sound, audioLoader;

let clock, delta, interval;
let sceneHeight, sceneWidth;

let walker;

let startButton = document.getElementById("startButton");
startButton.addEventListener("click", init);

let numMovers, movers, synths;
let musicalScale;

function init() {
  let synthy = new Tone.MonoSynth({
    // declare synth and set some parameters
    oscillator: {
      type: "square" // set the oscillator type
    },
    envelope: {
      attack: 3 // fading in our sound over 3 seconds using a volume envelope
    },
    filterEnvelope: {
      // attaching an envelope to our low pass filter
      attack: 3,
      decay: 3,
      sustain: 1
    },
    filter: {
      // setting the frequency and resonance of our filter
      frequency: 20000,
      Q: 4
    }
  });

  synthy.toDestination(); // connect to our output
  synthy.triggerAttack(70, 0, 0.01); //trigger the attack envelope stage only

  // remove overlay
  let overlay = document.getElementById("overlay");
  overlay.remove();

  sceneWidth = window.innerWidth;
  sceneHeight = window.innerHeight;

  //create our clock and set interval at 30 fpx
  clock = new THREE.Clock();
  delta = 0;
  interval = 1 / 2;

  //create our scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdfdfdf);
  //create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 25;
  //specify our renderer and add it to our document
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  //create the orbit controls instance so we can use the mouse move around our scene
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableZoom = true;

  // lighting
  colour = 0xffffff;
  intensity = 1;
  light = new THREE.DirectionalLight(colour, intensity);
  light.position.set(-1, 2, 4);
  scene.add(light);
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // create a box to spin

  geometry = new THREE.BoxGeometry();
  material = new THREE.MeshNormalMaterial(); // Change this from normal to Phong in step 5

  //grid helper
  let gridHelper = new THREE.GridHelper(100, 100);
  scene.add(gridHelper);

  //walker = new Walker(0, 0, 0);

  numMovers = 36;
  movers = [];
  synths = [];
  musicalScale = [0, 4, 7, 11, 14];

  // makeing the movers
  for (let i = 0; i < numMovers; i++) {
    let octave = parseInt(i / 12, 10); // find our octave based on where we're at with our iteration of "i"
    let freq = 36 + (musicalScale[i % 5] + octave * 12); // starting from base 36 (C2) pick a value to add from our musicalScale array then increase our octave to spread our scale
    synths.push(
      new Tone.MonoSynth({
        // add a new synth to our synth array
        oscillator: {
          type: "sawtooth"
        },
        envelope: {
          attack: 0.01
        }
      })
    );
    synths[i].toDestination(); //connect our synth to the main output
    synths[i].triggerAttack(
      Tone.Frequency(freq, "midi") + Math.random(6),
      0,
      0.01
    ); // trigger at our desired frequency with a bit of randomness to add "thickness" to the sound
    for (let j = 0; j < numMovers / 2; j++) {
      movers.push([]);
      movers[i].push(new Mover(i - 10, 0, j - 5, i * 0.25));
    }
  }

  play();
}

class Mover {
  constructor(x, y, z, offset) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.angle = new THREE.Vector3(0, offset, 0);
    this.velocity = new THREE.Vector3(0.1, 0.01, 0.01);
    this.amplitude = new THREE.Vector3(0.5, 2.5, 0.5);
    this.geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    this.mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(0.2, 0.2, 0.2)
    });
    this.box = new THREE.Mesh(this.geo, this.mat);
    this.box.position.set(this.x, this.y, this.z);
    this.noise = new Noise();
    this.noise.seed(THREE.MathUtils.randFloat());
    scene.add(this.box);
  }

  update() {
    let perl = this.noise.perlin2(this.angle.y, this.amplitude.y) * 5;
    this.angle.add(this.velocity);
    this.y = Math.sin(this.angle.y) * this.amplitude.y + perl;
  }

  display() {
    this.box.position.set(this.x, this.y, this.z);
  }
}

class Walker {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.dotGeometry = new THREE.BoxGeometry();
  }

  step() {
    // create new sphere
    this.dotMaterial = new THREE.MeshLambertMaterial({});
    this.dotMaterial.color = new THREE.Color(0.5, 0, 0.5);

    this.dot = new THREE.Mesh(this.dotGeometry, this.dotMaterial);
    this.dot.translateX(this.x);
    this.dot.translateY(this.y);
    this.dot.translateZ(this.z);
    scene.add(this.dot);

    let choice = THREE.MathUtils.randInt(0, 5); // six possible choices
    if (choice == 0) {
      this.x += 0.5; // right
      this.dotMaterial.color = new THREE.Color(this.x, this.y, this.z);
    } else if (choice === 1) {
      this.x -= 0.5; // left
      this.dotMaterial.color = new THREE.Color(this.x, this.y, this.z);
    } else if (choice === 2) {
      this.y += 0.5; // up
      this.dotMaterial.color = new THREE.Color(this.x, this.y, this.z);
    } else if (choice === 3) {
      this.y -= 0.5; // down
      this.dotMaterial.color = new THREE.Color(this.x, this.y, this.z);
    } else if (choice === 4) {
      this.z += 0.5; // fore
      this.dotMaterial.color = new THREE.Color(this.x, this.y, this.z);
    } else {
      this.z -= 0.5; // back
      this.dotMaterial.color = new THREE.Color(this.x, this.y, this.z);
    }
  }
}

// stop animating (not currently used)
function stop() {
  renderer.setAnimationLoop(null);
}

// simple render function

function render() {
  for (let i = 0; i < numMovers; i++) {
    for (let j = 0; j < numMovers / 2; j++) {
      movers[i][j].display(); // display all movers
    }
  }
  renderer.render(scene, camera);
}

// start animating

function play() {
  //using the new setAnimationLoop method which means we are WebXR ready if need be
  renderer.setAnimationLoop(() => {
    update();
    render();
  });
}

//our update function

function update() {
  orbit.update();
  //update stuff in here
  delta += clock.getDelta();

  for (let i = 0; i < numMovers; i++) {
    let boxPosMap = THREE.MathUtils.mapLinear(
      movers[i][0].box.position.y,
      -movers[i][0].amplitude.y / 10,
      movers[i][0].amplitude.y,
      -1,
      1
    );
    let boxPosMapClamp = THREE.MathUtils.clamp(boxPosMap, 0, 3);
    let boxPosGainTodB = Tone.gainToDb(boxPosMapClamp);
    synths[i].volume.linearRampTo(boxPosGainTodB, 0.01);
    for (let j = 0; j < numMovers / 2; j++) {
      movers[i][j].update();
    }
  }

  if (delta > interval) {
    //walker.step();
    delta = delta % interval;
  }
}

function onWindowResize() {
  //resize & align
  sceneHeight = window.innerHeight;
  sceneWidth = window.innerWidth;
  renderer.setSize(sceneWidth, sceneHeight);
  camera.aspect = sceneWidth / sceneHeight;
  camera.updateProjectionMatrix();
}
