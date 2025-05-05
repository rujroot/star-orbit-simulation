import { clearAllStarFolders, addFolderStar } from "./guiManager";
import { scene, mainOptions } from "./main";
import * as THREE from "three";

export const stars = [];
const scale = 1e9 * 2; // 1 billion meters to 1 unit in the scene
const G = 6.67430e-11;
const centralMass = 1e32;

class Line{
  constructor(initialPosition, color, maxPoints = 2500) {
    this.maxPoints = maxPoints;
    this.points = [initialPosition.clone()];
    this.minDistance = 0.1; // Minimum distance between points to add a new one
    
    const positions = new Float32Array(this.maxPoints * 3);
    positions.set(initialPosition.toArray());
    
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setDrawRange(0, 1); // Start with 1 point

    this.material = new THREE.LineBasicMaterial({ color: color });
    
    this.currentIndex = 1; // Start with the first point

    this.line = new THREE.Line(this.geometry, this.material);
    scene.add(this.line);
  }

  addPoint(point) {
    if(mainOptions.currentMode === "Galaxy (n-body)") return;

    const lastPoint = this.points[this.points.length - 1];
    if (point.distanceTo(lastPoint) < this.minDistance) return;

    if (this.points.length < this.maxPoints) {
      this.points.push(point.clone());

      const positions = this.geometry.attributes.position.array;
      positions[this.currentIndex * 3] = point.x;
      positions[this.currentIndex * 3 + 1] = point.y;
      positions[this.currentIndex * 3 + 2] = point.z;

      this.currentIndex++;
      this.geometry.setDrawRange(0, this.currentIndex);
    } else {
      // Shift points (trail effect)
      this.points.shift();
      this.points.push(point.clone());

      const positions = this.geometry.attributes.position.array;
      for (let i = 0; i < this.maxPoints - 1; i++) {
        positions[i * 3] = positions[(i + 1) * 3];
        positions[i * 3 + 1] = positions[(i + 1) * 3 + 1];
        positions[i * 3 + 2] = positions[(i + 1) * 3 + 2];
      }

      positions[(this.maxPoints - 1) * 3] = point.x;
      positions[(this.maxPoints - 1) * 3 + 1] = point.y;
      positions[(this.maxPoints - 1) * 3 + 2] = point.z;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }
}

class Star {
  constructor(startPosition, mesh, radius, color, massCof, massExp) {
    this.mesh = mesh;
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.radius = radius;
    this.massCof = massCof;
    this.massExp = massExp;
    this.line = new Line(mesh.position.clone(), color);
    this.name = `Star${stars.length + 1}`;
    this.displayName = this.name;
    this.startPosition = startPosition;
    this.color = color;
    this.emitLight = true;
    this.isSun = false;

    this.createLabel();
    this.setStarColor(color);
  }

  setStarColor(){
    const baseColorHex = this.color;
    let maxIntensity = 6.0;
    if(mainOptions.currentMode == 'Galaxy (n-body)') maxIntensity = 10.0;

    const baseColor = new THREE.Color(baseColorHex);
    this.mesh.material.color.set(baseColor);
    this.mesh.material.emissive.set(baseColor);
    this.line.material.color.set(baseColor);

    const brightness = getBrightness(baseColor);
    const intensity = (1 - brightness) * maxIntensity;

    if(this.emitLight) this.mesh.material.emissiveIntensity = Math.max(intensity, 2.0);
    else this.mesh.material.emissiveIntensity = 0;
  }

  setName(name) {
    this.displayName = name;
    this.createLabel();
  }

  createLabel(){
    if(mainOptions.currentMode === "Galaxy (n-body)") return;

    if(this.label) {
      this.mesh.remove(this.label); // Remove old label
    }

    this.label = createTextSprite(this.displayName);
    this.label.position.set(0, this.radius * 1.2, 0); // just above the star
    this.mesh.add(this.label); // Add new label
  }

  getmass() {
    return this.massCof * Math.pow(10, this.massExp);
  }

  reposition(){
    this.mesh.position.set(this.startPosition.x, this.startPosition.y, this.startPosition.z);
  }

  setEmitLight(mode){
    this.emitLight = mode;
    if(!this.emitLight) this.mesh.material.emissiveIntensity = 1;
    else this.setStarColor();
  }

}

export function newStar(x, y, radius, color, massCof, massExp) {
  const geometry = new THREE.SphereGeometry(radius, 32, 32);
  const material = new THREE.MeshStandardMaterial({ 
    color: color,        // Base color
    emissive: color,     // Glow color
    emissiveIntensity: 2,   // Strong emissive effect
  });
  const star = new THREE.Mesh(geometry, material);
  const startPosition = new THREE.Vector3(x / scale, 0, y / scale);

  star.position.set(startPosition.x, startPosition.y, startPosition.z);
  scene.add(star);

  const starObject = new Star(startPosition, star, radius, color, massCof, massExp);
  stars.push(starObject);
  if(mainOptions.currentMode !== "Galaxy (n-body)") addFolderStar(starObject);
  return starObject;
}

export function newRandstar(rx = 2, ry = 2, mindistance = 0){
  const distance = 1.49e11;
  
  let x = Math.random() * rx * 2 - rx;
  let y = Math.random() * ry * 2 - ry;
  while(new THREE.Vector3(x,0,y).length() < mindistance){
    x = Math.random() * rx * 2 - rx;
    y = Math.random() * ry * 2 - ry;
  };

  const radius = Math.random() * 5 + 2;
  const color = new THREE.Color().setHSL(Math.random(), Math.random(), Math.random()).getHex();
  return newStar(x * distance, y * distance, radius, color, 1, 30);
}

export function clearStars() {
  clearAllStarFolders(stars);
  for (let i = 0; i < stars.length; i++) {
    stars[i].line.geometry.dispose();
    stars[i].line.material.dispose();
    scene.remove(stars[i].line.line);
    
    const star = stars[i].mesh;
    star.geometry.dispose();
    star.material.dispose();
    scene.remove(star);
  }
  stars.length = 0; // Clear the array without creating a new one
}

// Calculaion function
export function simulate() {
  let forces = [];
  for (let i = 0; i < stars.length; i++) {
    forces[i] = new THREE.Vector3(0, 0, 0); 

    if (mainOptions.currentMode === "Galaxy (n-body)") {

      forces[i] = new THREE.Vector3(0, 0, 0);

      const rVec = stars[i].mesh.position.clone().multiplyScalar(scale); // vector from center
      const distSq = rVec.lengthSq();

      if (distSq === 0) continue;

      const F = G * centralMass * stars[i].getmass() / distSq;
      const forceDir = rVec.normalize().negate(); // Toward the center
      forces[i].add(forceDir.multiplyScalar(F));
      
    }else{

      for (let j = 0; j < stars.length; j++) {
        if (i === j) continue; 

        const r = stars[j].mesh.position.clone().multiplyScalar(scale)
                  .sub(stars[i].mesh.position.clone().multiplyScalar(scale));
        const distSq = r.lengthSq();
            
        if (distSq === 0) continue; 
        if (Math.sqrt(distSq) < scale * 10) {
          continue;
        }

        const mass = stars[i].getmass() * stars[j].getmass();
        const F = G * mass / distSq;
        const forceDir = r.normalize();
        forces[i].add(forceDir.multiplyScalar(F)); 
      }

    }

  }

  const tdt = mainOptions.dt * 60 * 60;
  for (let i = 0; i < stars.length; i++) {
    const acceleration = forces[i].divideScalar(stars[i].massCof * Math.pow(10, stars[i].massExp));
    stars[i].velocity.add(acceleration.multiplyScalar(tdt));
    stars[i].mesh.position.add(stars[i].velocity.clone().multiplyScalar(tdt).multiplyScalar(1 / scale));
    stars[i].line.addPoint(stars[i].mesh.position.clone());
  }
}

export function setInitialVelocities() {
  const div = mainOptions.div;
  const centerOfMass = new THREE.Vector3(0, 0, 0);
  let totalMass = 0;

  stars.forEach(star => {
    const weightedPos = star.mesh.position.clone().multiplyScalar(scale).multiplyScalar(star.getmass());
    centerOfMass.add(weightedPos);
    totalMass += star.getmass();
  });
  centerOfMass.divideScalar(totalMass);

  if(mainOptions.currentMode === "Galaxy (n-body)") centerOfMass.set(0, 0, 0); // Center of mass is at the origin for galaxy mode

  stars.forEach((star, idx) => {
    if(star.isSun) return;
    
    const r = star.mesh.position.clone().multiplyScalar(scale).sub(centerOfMass);
    const distance = r.length();

    if (distance === 0) return;

    let effectiveMass = 0;
    stars.forEach((other, j) => {
      if (j !== idx) effectiveMass += other.getmass();
    });
    if(mainOptions.currentMode === "Galaxy (n-body)") effectiveMass = centralMass;

    const speed = Math.sqrt((G * effectiveMass) / distance);

    const perp = new THREE.Vector3().crossVectors(r, new THREE.Vector3(0, 1, 0)).normalize();

    star.velocity.copy(perp.multiplyScalar(speed / div));
  });
}

function createTextSprite(message, parameters = {}) {
  const fontface = parameters.fontface || 'Arial';
  const fontsize = parameters.fontsize || 48;
  const borderThickness = parameters.borderThickness || 4;
  const borderColor = parameters.borderColor || { r:0, g:0, b:0, a:0.0 };
  const backgroundColor = parameters.backgroundColor || { r:255, g:255, b:255, a:0.0 };

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  context.font = `Bold ${fontsize}px ${fontface}`;

  const textWidth = context.measureText(message).width;

  // Draw background
  context.fillStyle = `rgba(${backgroundColor.r},${backgroundColor.g},${backgroundColor.b},${backgroundColor.a})`;
  context.fillRect(0, 0, textWidth + borderThickness * 2, fontsize + borderThickness * 2);

  // Draw border
  context.strokeStyle = `rgba(${borderColor.r},${borderColor.g},${borderColor.b},${borderColor.a})`;
  context.lineWidth = borderThickness;
  context.strokeRect(0, 0, textWidth + borderThickness * 2, fontsize + borderThickness * 2);

  // Draw text
  context.fillStyle = 'rgba(255, 255, 255, 1.0)';
  context.fillText(message, borderThickness, fontsize + borderThickness / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(5 * mainOptions.textScale, 2 * mainOptions.textScale, 10 * mainOptions.textScale); // Adjust size as needed

  return sprite;
}

// Color calculation
function getBrightness(color) {
  const r = color.r;
  const g = color.g;
  const b = color.b;

  // Perceived brightness (ITU-R BT.709)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}