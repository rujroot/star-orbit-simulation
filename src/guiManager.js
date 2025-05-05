import * as dat from 'dat.gui';
import {mainOptions, reset, setup, helper, scene, bloomPass} from './main.js';
import { stars, setInitialVelocities, newStar, newRandstar } from './star.js';
import * as THREE from 'three';

// first GUI //
const leftGUI = new dat.GUI();
leftGUI.domElement.style.position = 'absolute';
leftGUI.domElement.style.top = '0px';
leftGUI.domElement.style.left = '0px'; // move it to the right of the first GUI
leftGUI.domElement.style.zIndex = '100'; // slightly higher than the first one
leftGUI.removeFolder = function(name) {
  const folder = this.__folders[name];
  if (!folder) return;

  folder.close(); // Optional: closes the folder
  this.__ul.removeChild(folder.domElement.parentNode);
  delete this.__folders[name];
};
leftGUI.hide();

const modeFolder = leftGUI.addFolder('Mode');
const helperFolder = leftGUI.addFolder('Helpers');
const bloomFolder = leftGUI.addFolder('Bloom');
const controlsFolder = leftGUI.addFolder('Controller');

// second GUI //
const gui = new dat.GUI();
gui.domElement.style.top = '0px';
gui.domElement.style.right = '0px';
gui.domElement.style.zIndex = '100';
gui.domElement.style.maxHeight = '95vh'; // max height relative to viewport
gui.domElement.style.overflowY = 'auto'; // enable vertical scroll
gui.removeFolder = function(name) {
  const folder = this.__folders[name];
  if (!folder) return;

  folder.close(); // Optional: closes the folder
  this.__ul.removeChild(folder.domElement.parentNode);
  delete this.__folders[name];
};
gui.hide();

// Create an object to store the button functionality
let closeController
let startController
export const guiControls = {
  StartButton: function() {
    mainOptions.started = true;
    mainOptions.stoped = false;
    mainOptions.dt = 10;
    closeController = controlsFolder.add(guiControls, 'StopButton').name('Stop');
    
    if(startController) {
      controlsFolder.remove(startController);
      startController = null;
    }
  },
  StopButton: function() {
    mainOptions.stoped = true;
    startController = controlsFolder.add(guiControls, 'StartButton').name('Start');
    
    if(closeController) {
      controlsFolder.remove(closeController);
      closeController = null;
    }
  },

  ResetButton: function() {
    if(!mainOptions.stoped) this.StopButton();
    mainOptions.started = false;
    mainOptions.dt = 0;
    reset();
    setup(mainOptions.currentMode);
  }

};

// Methods
export function clearAllStarFolders() {
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i].name;
    if (gui.__folders[star]) {
      gui.removeFolder(star);
    }
  }
}

export function addFolderStar(star) {
  if(gui.__folders[star.name]) {
    return;
  }
  const folder = gui.addFolder(star.name);
  folder.add(star, 'displayName').name('Name').listen().onChange(() => {
    star.setName(star.displayName);
  });
  folder.add(star, 'radius', 0, 20).name('Radius').onChange(() => {
    star.mesh.geometry.dispose();
    star.mesh.geometry = new THREE.SphereGeometry(star.radius, 32, 32);
    for (let i = 0; i < stars.length; i++) {
      stars[i].createLabel();
    }
  });
  folder.addColor(star, 'color').name('Color').onChange(() => {
    star.setStarColor();
  });
  folder.add(star, 'massCof', 1, 9.99).name('Mass Coefficient').onChange(() => {
    star.mass = star.mass;
    if(!mainOptions.started) setInitialVelocities();
  });
  folder.add(star, 'massExp', 1, 100).name('Mass Exponent (10^x)').onChange(() => {
    star.multiplier = star.multiplier;
    if(!mainOptions.started) setInitialVelocities();
  });

  const positionFolder = folder.addFolder('Position');
  positionFolder.add(star.mesh.position, 'x', -5000, 5000).name('Position X').listen().onChange(() => {
    star.startPosition.x = star.mesh.position.x;
  });
  positionFolder.add(star.mesh.position, 'z', -5000, 5000).name('Position Z').listen().onChange(() => {
    star.startPosition.z = star.mesh.position.z;
  });

  const velocityFolder = folder.addFolder('Velocity');
  velocityFolder.add(star.velocity, 'x', -1e6, 1e6).name('Velocity X').listen();
  velocityFolder.add(star.velocity, 'z', -1e6, 1e6).name('Velocity Z').listen();

  folder.open();
}

export function initGUI(){
  modeFolder.add(mainOptions, 'currentMode', ["Solar System", "3-body Problem", "Galaxy (n-body)", "Custom"]).name("Current Mode").onChange(() => {
    console.log(`Mode changed to: ${mainOptions.currentMode}`);
    if(mainOptions.started) guiControls.ResetButton();
    reset();
    setup(mainOptions.currentMode);
  });
  modeFolder.open();

  helperFolder.add(mainOptions, 'gridOn').name('Grid').listen().onChange(() => {
    if (mainOptions.gridOn) {
      scene.add(helper.gridHelper);
    } else {
      scene.remove(helper.gridHelper);
    }
  });
  helperFolder.add(mainOptions, 'axisOn').name('Axis').listen().onChange(() => {
    if (mainOptions.axisOn) {
      scene.add(helper.axisHelper);
    } else {
      scene.remove(helper.axisHelper);
    }
  });
  helperFolder.add(mainOptions, 'background').name('Background').listen().onChange(() => {
    if(mainOptions.background) scene.background = helper.background;
    else scene.background = null;
  })
  helperFolder.add(mainOptions, 'textScale', 0, 20).name('Text Scale').onChange(() => {
    for (let i = 0; i < stars.length; i++) {
      stars[i].createLabel();
    }
  });
  helperFolder.add(mainOptions, 'cameraSpeed', 1, 10).listen().name('Camera Speed')
  helperFolder.open();

  //controller
  controlsFolder.add(mainOptions, 'dt', 1, 20).listen().name('Time Step (hours/frame)');
  controlsFolder.add(guiControls, 'ResetButton').name('Reset');
  startController = controlsFolder.add(guiControls, 'StartButton').name('Start');
  controlsFolder.open();

  //bloom
  bloomFolder.add(bloomPass, 'strength', 0, 3).listen().name("Strength");
  bloomFolder.add(bloomPass, 'radius', 0, 1).listen().name("Radius");
  bloomFolder.add(bloomPass, 'threshold', 0.5, 2).listen().name("Threshold");
  bloomFolder.open();
}

export function startGUI(){
  gui.show();
  gui.open();
  leftGUI.show();
  leftGUI.open();
}

let modeContollers = leftGUI.addFolder('Mode Controllers');
export function initModeGUI(){
  leftGUI.removeFolder('Mode Controllers');
  modeContollers = leftGUI.addFolder('Mode Controllers');

  switch (mainOptions.currentMode) {
    case "3-body Problem":
      setupThreeBodyProblemGUI();
      break;
    case "Galaxy (n-body)":
      setupGalaxyGUI();
      break;
    case "Custom":
      setupCustomGUI();
      break;
  }
}

function setupThreeBodyProblemGUI() {
  const controller = {
    Random: function() {
      if(mainOptions.started) guiControls.ResetButton();
      reset();
      newRandstar();
      newRandstar();
      newRandstar();
      setInitialVelocities();
    }
  }

  modeContollers.add(controller, 'Random').name('Random');
  modeContollers.open();
}

function setupGalaxyGUI() {
  modeContollers.add(mainOptions, 'starCount', 100, 1000).name('Number of Stars').onChange(() => {
    const diff = stars.length - mainOptions.starCount;
    if(diff > 0){
      for(let i = 0; i < diff; ++i){
        const star = stars.pop();
        star.mesh.geometry.dispose();
        star.mesh.material.dispose();
        scene.remove(star.mesh);
      }
    }else{
      for(let i = 0; i < -diff; ++i){
        const rand = Math.random();
        if(rand > 0.5) newRandstar(30, 5, 2);
        else newRandstar(5, 30, 2);
      }
    }

    setInitialVelocities();
  });
  modeContollers.open();
}

function setupCustomGUI() {
  const controller = {
    haveSun : false,
    AddStar: function() {
      newRandstar(10,10);
      setInitialVelocities();
    },
    AddCenter: function(){
      if(this.haveSun) return;
      this.haveSun = true;

      const sun = newStar(0, 0, 15, 0xffff00, 1, 33);
      sun.isSun = true;
      setInitialVelocities();
    }
  }

  modeContollers.add(controller, 'AddStar').name('Add Star');
  modeContollers.add(controller, 'AddCenter').name('Add Sun');
  modeContollers.open();
}
