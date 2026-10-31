import * as THREE from 'three';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Node polyfill for FileReader
if (typeof global.FileReader === 'undefined') {
  global.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then((buf) => {
        this.result = buf;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((buf) => {
        const base64 = Buffer.from(buf).toString('base64');
        this.result = `data:${blob.type || 'application/octet-stream'};base64,${base64}`;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}

import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct High-Detail MALE UAV (Rustom-II / Tapas style)
const group = new THREE.Group();
group.name = 'MALE_UAV';

// Materials
const fuselageMat = new THREE.MeshStandardMaterial({
  color: 0x4a5568, // Tactical Slate Grey
  roughness: 0.4,
  metalness: 0.3,
});

const wingMat = new THREE.MeshStandardMaterial({
  color: 0x334155, // Darker Slate
  roughness: 0.35,
  metalness: 0.4,
});

const accentMat = new THREE.MeshStandardMaterial({
  color: 0x1e293b,
  roughness: 0.2,
  metalness: 0.6,
});

const glassMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.1,
  metalness: 0.9,
});

const propMat = new THREE.MeshStandardMaterial({
  color: 0x0f172a,
  roughness: 0.5,
  metalness: 0.2,
});

const radomeMat = new THREE.MeshStandardMaterial({
  color: 0x64748b,
  roughness: 0.2,
  metalness: 0.1,
});

// 1. Fuselage
// Main body
const bodyGeom = new THREE.CylinderGeometry(0.5, 0.4, 7.0, 16);
bodyGeom.rotateX(Math.PI / 2); // align along Z
const body = new THREE.Mesh(bodyGeom, fuselageMat);
body.position.set(0, 0, 0);
group.add(body);

// Nose cone (forward is -Z in glTF)
const noseGeom = new THREE.ConeGeometry(0.5, 2.0, 16);
noseGeom.rotateX(-Math.PI / 2);
const nose = new THREE.Mesh(noseGeom, fuselageMat);
nose.position.set(0, 0, -4.5);
group.add(nose);

// SATCOM Radome Bulb on upper nose
const radomeGeom = new THREE.SphereGeometry(0.55, 16, 16);
radomeGeom.scale(1.0, 0.65, 1.8);
const radome = new THREE.Mesh(radomeGeom, radomeMat);
radome.position.set(0, 0.45, -2.5);
group.add(radome);

// EO/IR Gimbal Turret under nose
const turretGeom = new THREE.SphereGeometry(0.35, 16, 16);
const turret = new THREE.Mesh(turretGeom, glassMat);
turret.position.set(0, -0.45, -3.8);
group.add(turret);

// 2. Wings (High aspect ratio MALE UAV wingspan ~16m scaled down)
// Center Wing
const wingGeom = new THREE.BoxGeometry(14.0, 0.12, 1.2);
const wings = new THREE.Mesh(wingGeom, wingMat);
wings.position.set(0, 0.35, -0.6);
group.add(wings);

// Winglets (upturned tips)
const leftWingletGeom = new THREE.BoxGeometry(0.1, 0.6, 0.8);
const leftWinglet = new THREE.Mesh(leftWingletGeom, accentMat);
leftWinglet.position.set(7.0, 0.6, -0.6);
group.add(leftWinglet);

const rightWinglet = new THREE.Mesh(leftWingletGeom, accentMat);
rightWinglet.position.set(-7.0, 0.6, -0.6);
group.add(rightWinglet);

// 3. Tail Boom and V-Tail (or T-Tail)
const tailBoomGeom = new THREE.CylinderGeometry(0.2, 0.1, 2.5, 12);
tailBoomGeom.rotateX(Math.PI / 2);
const tailBoom = new THREE.Mesh(tailBoomGeom, fuselageMat);
tailBoom.position.set(0, 0.1, 4.5);
group.add(tailBoom);

// V-Tail Fins (angled vertical/horizontal stabilizers)
const finGeom = new THREE.BoxGeometry(0.08, 1.6, 0.8);
const leftFin = new THREE.Mesh(finGeom, wingMat);
leftFin.rotation.z = Math.PI / 4; // 45 deg
leftFin.position.set(0.6, 0.8, 5.0);
group.add(leftFin);

const rightFin = new THREE.Mesh(finGeom, wingMat);
rightFin.rotation.z = -Math.PI / 4; // -45 deg
rightFin.position.set(-0.6, 0.8, 5.0);
group.add(rightFin);

// 4. Rear Pusher Engine Nacelle & Propeller
const nacelleGeom = new THREE.CylinderGeometry(0.35, 0.25, 1.2, 12);
nacelleGeom.rotateX(Math.PI / 2);
const nacelle = new THREE.Mesh(nacelleGeom, accentMat);
nacelle.position.set(0, 0.2, 3.4);
group.add(nacelle);

// Propeller Hub & Blades
const propGroup = new THREE.Group();
propGroup.position.set(0, 0.2, 5.75);

const hubGeom = new THREE.ConeGeometry(0.15, 0.3, 12);
hubGeom.rotateX(Math.PI / 2);
const hub = new THREE.Mesh(hubGeom, accentMat);
propGroup.add(hub);

const bladeGeom = new THREE.BoxGeometry(1.6, 0.08, 0.03);
const blade1 = new THREE.Mesh(bladeGeom, propMat);
propGroup.add(blade1);

const blade2 = new THREE.Mesh(bladeGeom, propMat);
blade2.rotation.z = Math.PI / 2;
propGroup.add(blade2);

group.add(propGroup);

// Export as binary GLB
const exporter = new GLTFExporter();
try {
  const gltf = await exporter.parseAsync(group, { binary: true });
  const buffer = Buffer.from(gltf);
  const outputPath = path.resolve(__dirname, '../frontend/public/models/male_uav.glb');
  fs.writeFileSync(outputPath, buffer);
  console.log(`Successfully generated MALE UAV GLB: ${outputPath} (${buffer.length} bytes)`);
} catch (error) {
  console.error('Error exporting GLTF:', error);
}
