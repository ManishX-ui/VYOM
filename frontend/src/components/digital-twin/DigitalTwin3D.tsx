import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EngineTelemetry } from '../../types';
import {
  RotateCcw,
  Compass,
  Eye,
  Maximize2,
  Layers,
  Thermometer,
  Activity,
  Sliders,
  Radio,
  Plane,
  ShieldCheck,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface DigitalTwin3DProps {
  telemetry: EngineTelemetry;
  activeComponentId?: string | null;
  onSelectComponent?: (compId: string) => void;
  heightClass?: string;
  showThermal?: boolean;
  showVibration?: boolean;
  showSurfaces?: boolean;
  isGhostMode?: boolean;
}

export const DigitalTwin3D: React.FC<DigitalTwin3DProps> = ({
  telemetry,
  activeComponentId,
  onSelectComponent,
  heightClass = 'h-[520px]',
  showThermal = false,
  showVibration = false,
  showSurfaces = true,
  isGhostMode = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // References to 3D Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const aircraftMasterRef = useRef<THREE.Group | null>(null);
  const propellerRef = useRef<THREE.Group | null>(null);

  // Movable control surfaces refs
  const leftAileronRef = useRef<THREE.Group | null>(null);
  const rightAileronRef = useRef<THREE.Group | null>(null);
  const leftFlapRef = useRef<THREE.Group | null>(null);
  const rightFlapRef = useRef<THREE.Group | null>(null);
  const elevatorRef = useRef<THREE.Group | null>(null);
  const rudderRef = useRef<THREE.Group | null>(null);

  // Inspectable component meshes
  const inspectableMeshesRef = useRef<{ [key: string]: THREE.Mesh | THREE.Group }>({});

  const animFrameRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera preset states
  const [activeCameraView, setActiveCameraView] = useState<string>('ISO');
  const [hoveredComponent, setHoveredComponent] = useState<string | null>(null);

  // Smoothing targets
  const currentRotationRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0, 'YXZ'));
  const targetRotationRef = useRef<THREE.Euler>(new THREE.Euler(0, 0, 0, 'YXZ'));
  const propAngleRef = useRef<number>(0);

  // 1. Initialize High-Fidelity 3D MALE UAV Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene with Crisp Aerospace Studio Light Theme
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(5.5, 3.2, 6.0);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Studio IBL Environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    // Studio 3-Point Aerospace Lighting tuned for light background
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(6, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xcfd8dc, 1.4);
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.2);
    rimLight.position.set(-6, 3, -6);
    scene.add(rimLight);

    // Subtle Ground Reference Grid & Soft Ground Shadow
    const gridHelper = new THREE.GridHelper(16, 16, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = -1.2;
    scene.add(gridHelper);

    const shadowPlaneGeo = new THREE.PlaneGeometry(24, 24);
    const shadowPlaneMat = new THREE.ShadowMaterial({ opacity: 0.14 });
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.205;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    // ==========================================
    // PROCEDURAL 3D MALE UAV AIRFRAME (RUSTOM-II / TAPAS CLASS)
    // ==========================================
    const masterAircraft = new THREE.Group();
    aircraftMasterRef.current = masterAircraft;
    scene.add(masterAircraft);

    // Aerospace Material Palette
    const fuselageMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Tactical Dark Navy Slate
      metalness: 0.6,
      roughness: 0.35,
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Wing Composite
      metalness: 0.5,
      roughness: 0.4,
    });

    const controlSurfaceMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Actuator surface
      metalness: 0.7,
      roughness: 0.25,
    });

    const radomeMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Radome Black
      metalness: 0.8,
      roughness: 0.2,
    });

    const metallicMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.15,
    });

    // 1. Fuselage Body (Streamlined Aerospace Geometry)
    const fuselageGroup = new THREE.Group();

    // Central body
    const bodyGeo = new THREE.CylinderGeometry(0.38, 0.45, 4.2, 24);
    bodyGeo.rotateZ(Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, fuselageMat);
    bodyMesh.castShadow = true;
    fuselageGroup.add(bodyMesh);

    // Aerodynamic Nose Cone
    const noseGeo = new THREE.ConeGeometry(0.38, 1.1, 24);
    noseGeo.rotateZ(-Math.PI / 2);
    const noseMesh = new THREE.Mesh(noseGeo, fuselageMat);
    noseMesh.position.set(2.65, 0, 0);
    fuselageGroup.add(noseMesh);

    // Dorsal SATCOM Radome Hump
    const satcomGeo = new THREE.SphereGeometry(0.32, 16, 12);
    satcomGeo.scale(1.8, 0.6, 0.8);
    const satcomMesh = new THREE.Mesh(satcomGeo, radomeMat);
    satcomMesh.position.set(0.6, 0.35, 0);
    fuselageGroup.add(satcomMesh);

    // Ventral EO/IR Gimbal Turret (Belly Camera)
    const turretGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const turretMesh = new THREE.Mesh(turretGeo, radomeMat);
    turretMesh.position.set(1.8, -0.36, 0);
    fuselageGroup.add(turretMesh);

    masterAircraft.add(fuselageGroup);
    inspectableMeshesRef.current['fuselage'] = fuselageGroup;

    // 2. High-Aspect Main Wings (Span ~ 8.4m in scene scale)
    const wingsGroup = new THREE.Group();

    // Left Wing (Port)
    const leftWingGeo = new THREE.BoxGeometry(0.85, 0.06, 3.8);
    const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
    leftWing.position.set(0.1, 0.05, 2.1);
    leftWing.rotation.x = -0.02; // Dihedral
    wingsGroup.add(leftWing);

    // Right Wing (Starboard)
    const rightWingGeo = new THREE.BoxGeometry(0.85, 0.06, 3.8);
    const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
    rightWing.position.set(0.1, 0.05, -2.1);
    rightWing.rotation.x = 0.02;
    wingsGroup.add(rightWing);

    // Left Aileron (Movable Surface)
    const leftAilGroup = new THREE.Group();
    leftAilGroup.position.set(-0.35, 0.05, 3.1);
    const leftAilMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 1.2), controlSurfaceMat);
    leftAilGroup.add(leftAilMesh);
    wingsGroup.add(leftAilGroup);
    leftAileronRef.current = leftAilGroup;
    inspectableMeshesRef.current['left-aileron'] = leftAilGroup;

    // Right Aileron (Movable Surface)
    const rightAilGroup = new THREE.Group();
    rightAilGroup.position.set(-0.35, 0.05, -3.1);
    const rightAilMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 1.2), controlSurfaceMat);
    rightAilGroup.add(rightAilMesh);
    wingsGroup.add(rightAilGroup);
    rightAileronRef.current = rightAilGroup;
    inspectableMeshesRef.current['right-aileron'] = rightAilGroup;

    // Left Flap
    const leftFlapGroup = new THREE.Group();
    leftFlapGroup.position.set(-0.35, 0.05, 1.3);
    const leftFlapMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 1.2), controlSurfaceMat);
    leftFlapGroup.add(leftFlapMesh);
    wingsGroup.add(leftFlapGroup);
    leftFlapRef.current = leftFlapGroup;

    // Right Flap
    const rightFlapGroup = new THREE.Group();
    rightFlapGroup.position.set(-0.35, 0.05, -1.3);
    const rightFlapMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 1.2), controlSurfaceMat);
    rightFlapGroup.add(rightFlapMesh);
    wingsGroup.add(rightFlapGroup);
    rightFlapRef.current = rightFlapGroup;

    masterAircraft.add(wingsGroup);

    // 3. Twin Tail Booms & Inverted V-Tail
    const tailGroup = new THREE.Group();

    // Left & Right Booms
    const boomGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 12);
    boomGeo.rotateZ(Math.PI / 2);

    const leftBoom = new THREE.Mesh(boomGeo, fuselageMat);
    leftBoom.position.set(-1.6, 0.05, 1.1);
    tailGroup.add(leftBoom);

    const rightBoom = new THREE.Mesh(boomGeo, fuselageMat);
    rightBoom.position.set(-1.6, 0.05, -1.1);
    tailGroup.add(rightBoom);

    // Horizontal & Vertical Stabilizers
    const hStabGeo = new THREE.BoxGeometry(0.5, 0.05, 2.5);
    const hStab = new THREE.Mesh(hStabGeo, wingMat);
    hStab.position.set(-3.0, 0.4, 0);
    tailGroup.add(hStab);

    // Elevator (Movable Pitch Surface)
    const elevGroup = new THREE.Group();
    elevGroup.position.set(-3.22, 0.4, 0);
    const elevMesh = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.045, 2.4), controlSurfaceMat);
    elevGroup.add(elevMesh);
    tailGroup.add(elevGroup);
    elevatorRef.current = elevGroup;
    inspectableMeshesRef.current['elevator'] = elevGroup;

    // Twin Vertical Fins
    const vFinGeo = new THREE.BoxGeometry(0.45, 0.9, 0.05);
    const leftFin = new THREE.Mesh(vFinGeo, wingMat);
    leftFin.position.set(-2.95, 0.45, 1.1);
    tailGroup.add(leftFin);

    const rightFin = new THREE.Mesh(vFinGeo, wingMat);
    rightFin.position.set(-2.95, 0.45, -1.1);
    tailGroup.add(rightFin);

    // Rudder (Movable Yaw Surface)
    const rudGroup = new THREE.Group();
    rudGroup.position.set(-3.15, 0.45, 0);
    const rudMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.85, 0.045), controlSurfaceMat);
    rudGroup.add(rudMesh);
    tailGroup.add(rudGroup);
    rudderRef.current = rudGroup;
    inspectableMeshesRef.current['rudder'] = rudGroup;

    masterAircraft.add(tailGroup);

    // 4. Aft Pusher Propulsion & Engine Nacelle (Rotax 914 F Turbocharged)
    const engineGroup = new THREE.Group();
    engineGroup.position.set(-1.5, 0.15, 0);

    // Engine Cowl Nacelle
    const nacelleGeo = new THREE.BoxGeometry(1.2, 0.75, 0.85);
    const nacelleMesh = new THREE.Mesh(nacelleGeo, fuselageMat);
    engineGroup.add(nacelleMesh);

    // Inspectable Cylinder Bank Left & Right
    const cylLeftGeo = new THREE.BoxGeometry(0.45, 0.35, 0.4);
    const cylMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 });
    const cylLeft = new THREE.Mesh(cylLeftGeo, cylMat);
    cylLeft.position.set(0, 0, 0.45);
    engineGroup.add(cylLeft);
    inspectableMeshesRef.current['comp-cylinder-head'] = cylLeft;

    const cylRight = new THREE.Mesh(cylLeftGeo, cylMat);
    cylRight.position.set(0, 0, -0.45);
    engineGroup.add(cylRight);

    // Exhaust Pipe (EGT)
    const exhGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12);
    exhGeo.rotateZ(Math.PI / 2);
    const exhMat = new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.9, roughness: 0.2 });
    const exhMesh = new THREE.Mesh(exhGeo, exhMat);
    exhMesh.position.set(-0.65, -0.22, 0.25);
    engineGroup.add(exhMesh);
    inspectableMeshesRef.current['comp-exhaust'] = exhMesh;

    // Turbocharger Wastegate
    const turboGeo = new THREE.TorusGeometry(0.14, 0.06, 12, 16);
    const turboMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.85, roughness: 0.25 });
    const turboMesh = new THREE.Mesh(turboGeo, turboMat);
    turboMesh.position.set(0.2, 0.38, 0);
    turboMesh.rotation.x = Math.PI / 2;
    engineGroup.add(turboMesh);
    inspectableMeshesRef.current['comp-turbocharger'] = turboMesh;

    // 5. Pusher Propeller (Continuous Realistic Rotation Formula: RPM * 2PI / 60)
    const propMaster = new THREE.Group();
    propMaster.position.set(-0.65, 0, 0);

    const spinnerGeo = new THREE.ConeGeometry(0.18, 0.38, 16);
    spinnerGeo.rotateZ(-Math.PI / 2);
    const spinner = new THREE.Mesh(spinnerGeo, metallicMat);
    propMaster.add(spinner);

    // 3 Composite Blades
    const bladeGeo = new THREE.BoxGeometry(0.08, 1.4, 0.03);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.3, roughness: 0.4 });

    for (let i = 0; i < 3; i++) {
      const bladeArm = new THREE.Group();
      bladeArm.rotation.x = (i * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.65;
      blade.rotation.y = 0.2; // Pitch angle

      // Tip visibility marking
      const tip = new THREE.Mesh(
        new THREE.BoxGeometry(0.082, 0.16, 0.032),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
      );
      tip.position.set(0, 0.62, 0);
      blade.add(tip);

      bladeArm.add(blade);
      propMaster.add(bladeArm);
    }

    engineGroup.add(propMaster);
    propellerRef.current = propMaster;
    inspectableMeshesRef.current['comp-propeller'] = propMaster;

    masterAircraft.add(engineGroup);

    // Ground Shadow Plane
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.ShadowMaterial({ opacity: 0.3 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.6;
    ground.receiveShadow = true;
    scene.add(ground);

    // Mouse Drag Orbit Event Handlers
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !aircraftMasterRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      aircraftMasterRef.current.rotation.y += deltaX * 0.008;
      aircraftMasterRef.current.rotation.z += deltaY * 0.008;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Raycasting for Component Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = dom.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(masterAircraft.children, true);

      if (intersects.length > 0) {
        let hitComp = null;
        for (const hit of intersects) {
          let curr: THREE.Object3D | null = hit.object;
          while (curr && curr !== masterAircraft) {
            for (const [k, obj] of Object.entries(inspectableMeshesRef.current)) {
              if (obj === curr) {
                hitComp = k;
                break;
              }
            }
            if (hitComp) break;
            curr = curr.parent;
          }
          if (hitComp) break;
        }

        if (hitComp && onSelectComponent) {
          onSelectComponent(hitComp);
        }
      }
    };

    dom.addEventListener('click', handleClick);

    // Resize Handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Continuous 60 FPS Animation & Telemetry Sync Loop
    let clock = new THREE.Clock();

    const tick = () => {
      animFrameRef.current = requestAnimationFrame(tick);
      const dt = clock.getDelta();

      // 1. Continuous Propeller Kinematics: Omega = (RPM / 2.43) * 2 * PI / 60
      if (propellerRef.current) {
        const engineRpm = telemetry?.rpm ?? 2450;
        // Gearbox reduction 2.43:1
        const propRpm = Math.max(0, engineRpm / 2.43);
        const omega = (propRpm * 2.0 * Math.PI) / 60.0;
        propAngleRef.current += omega * dt;
        propellerRef.current.rotation.x = propAngleRef.current;
      }

      // 2. Control Surface Deflections
      const rollDeg = telemetry?.rollDeg ?? 0.0;
      const pitchDeg = telemetry?.pitchDeg ?? 0.0;
      const rollRad = THREE.MathUtils.degToRad(rollDeg);
      const pitchRad = THREE.MathUtils.degToRad(pitchDeg);

      // Ailerons differential deflections
      if (leftAileronRef.current && rightAileronRef.current) {
        const ailDeflection = THREE.MathUtils.clamp(-rollRad * 1.5, -0.35, 0.35);
        leftAileronRef.current.rotation.x = ailDeflection;
        rightAileronRef.current.rotation.x = -ailDeflection;
      }

      // Elevator deflection
      if (elevatorRef.current) {
        const elevDeflection = THREE.MathUtils.clamp(pitchRad * 1.8, -0.28, 0.28);
        elevatorRef.current.rotation.z = elevDeflection;
      }

      // 3. Aircraft Spatial Pose Synchronization (Quaternion / Euler Slerp)
      if (aircraftMasterRef.current && !isDraggingRef.current) {
        // Coordinate mapping: Three.js Y=Up, X=Right, Z=Out of screen
        // Pitch -> X axis, Roll -> Z axis, Yaw -> Y axis
        targetRotationRef.current.set(pitchRad * 0.5, 0, -rollRad * 0.5);

        // Smooth orientation lerp
        currentRotationRef.current.x += (targetRotationRef.current.x - currentRotationRef.current.x) * 0.08;
        currentRotationRef.current.z += (targetRotationRef.current.z - currentRotationRef.current.z) * 0.08;

        aircraftMasterRef.current.rotation.x = currentRotationRef.current.x;
        aircraftMasterRef.current.rotation.z = currentRotationRef.current.z;
      }

      renderer.render(scene, camera);
    };

    tick();

    // Proper Three.js Cleanup
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('click', handleClick);
      renderer.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, []);

  // Update Visual Stress Highlights & Ghost X-Ray Mode
  useEffect(() => {
    if (!inspectableMeshesRef.current) return;

    Object.entries(inspectableMeshesRef.current).forEach(([k, obj]) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // X-Ray / Ghost Mode
          if (isGhostMode) {
            child.material.wireframe = true;
            child.material.transparent = true;
            child.material.opacity = 0.35;
          } else {
            child.material.wireframe = false;
            child.material.transparent = false;
            child.material.opacity = 1.0;
          }

          // Thermal Shader Highlights
          if (showThermal) {
            if (k === 'comp-cylinder-head') {
              const cht = telemetry?.cht ?? 187;
              child.material.emissive = new THREE.Color(cht > 205 ? 0xef4444 : cht > 195 ? 0xf59e0b : 0x0284c7);
              child.material.emissiveIntensity = cht > 195 ? 0.8 : 0.2;
            } else if (k === 'comp-exhaust') {
              const egt = telemetry?.egt ?? 620;
              child.material.emissive = new THREE.Color(egt > 680 ? 0xef4444 : 0xb45309);
              child.material.emissiveIntensity = 0.7;
            } else {
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
            }
          }
          // Vibration Stress Highlights
          else if (showVibration) {
            if (k === 'comp-propeller' || k === 'fuselage') {
              const vib = telemetry?.vibrationRMS ?? 0.28;
              child.material.emissive = new THREE.Color(vib > 0.35 ? 0xef4444 : 0x0284c7);
              child.material.emissiveIntensity = Math.min(1.0, vib * 2.0);
            } else {
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
            }
          }
          // Active Component Highlight
          else if (activeComponentId && activeComponentId === k) {
            child.material.emissive = new THREE.Color(0x38bdf8);
            child.material.emissiveIntensity = 0.8;
          } else {
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      });
    });
  }, [telemetry, showThermal, showVibration, showSurfaces, isGhostMode, activeComponentId]);

  // Camera Presets
  const setCameraView = (view: 'ISO' | 'FRONT' | 'REAR' | 'TOP' | 'SIDE') => {
    setActiveCameraView(view);
    if (!cameraRef.current || !aircraftMasterRef.current) return;

    // Reset master rotation
    aircraftMasterRef.current.rotation.set(0, 0, 0);

    switch (view) {
      case 'FRONT':
        cameraRef.current.position.set(7.0, 0.4, 0);
        break;
      case 'REAR':
        cameraRef.current.position.set(-6.5, 1.2, 0);
        break;
      case 'TOP':
        cameraRef.current.position.set(0, 8.5, 0.01);
        break;
      case 'SIDE':
        cameraRef.current.position.set(0, 0.8, 7.5);
        break;
      case 'ISO':
      default:
        cameraRef.current.position.set(5.5, 3.2, 6.0);
        break;
    }
    cameraRef.current.lookAt(0, 0, 0);
  };

  // Zoom In / Zoom Out Controls
  const handleZoom = (direction: 'in' | 'out') => {
    if (!cameraRef.current) return;
    const factor = direction === 'in' ? 0.82 : 1.22;
    cameraRef.current.position.multiplyScalar(factor);
    const dist = cameraRef.current.position.length();
    if (dist < 2.5) cameraRef.current.position.setLength(2.5);
    if (dist > 22.0) cameraRef.current.position.setLength(22.0);
  };

  const propRpm = telemetry?.rpm ? Math.round(telemetry.rpm / 2.43) : 1008;

  return (
    <div className={`relative w-full ${heightClass} bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/90 shadow-sm select-none`}>
      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left: 3D Camera & Zoom Controls */}
      <div className="absolute top-4 left-4 flex items-center gap-1.5 p-1.5 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200/90 text-[11px] font-mono text-slate-700 shadow-sm">
        {(['ISO', 'FRONT', 'REAR', 'TOP', 'SIDE'] as const).map((view) => (
          <button
            key={view}
            onClick={() => setCameraView(view)}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              activeCameraView === view
                ? 'bg-blue-600 text-white font-bold shadow-xs'
                : 'hover:bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {view}
          </button>
        ))}

        <div className="h-4 w-px bg-slate-200 mx-0.5" />

        {/* Zoom In Button */}
        <button
          onClick={() => handleZoom('in')}
          className="p-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Zoom In (+)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Out Button */}
        <button
          onClick={() => handleZoom('out')}
          className="p-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Zoom Out (-)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Reset Camera */}
        <button
          onClick={() => setCameraView('ISO')}
          className="p-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Reset Camera"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Right: Live Propulsion & Kinematics Overlay */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 text-right font-mono text-xs">
        <div className="px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-sm flex items-center gap-2 text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-500 font-semibold">ENGINE:</span>
          <span className="font-bold text-slate-900">{telemetry?.rpm ?? 2450} RPM</span>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500 font-semibold">PROP:</span>
          <span className="font-bold text-blue-600">{propRpm} RPM</span>
        </div>
      </div>

      {/* Bottom Left: Spatial Attitude HUD */}
      <div className="absolute bottom-4 left-4 p-2.5 bg-white/90 backdrop-blur-md rounded-xl border border-slate-200/90 text-xs font-mono shadow-sm">
        <div className="flex items-center gap-3">
          <div>
            <span className="text-slate-400 block text-[10px] font-semibold">ROLL</span>
            <span className="font-bold text-slate-900">{telemetry?.rollDeg?.toFixed(1) ?? '0.0'}°</span>
          </div>
          <div className="border-l border-slate-200 pl-3">
            <span className="text-slate-400 block text-[10px] font-semibold">PITCH</span>
            <span className="font-bold text-slate-900">{telemetry?.pitchDeg?.toFixed(1) ?? '0.0'}°</span>
          </div>
          <div className="border-l border-slate-200 pl-3">
            <span className="text-slate-400 block text-[10px] font-semibold">HEADING</span>
            <span className="font-bold text-blue-600">{telemetry?.headingDeg ?? 180}°</span>
          </div>
        </div>
      </div>

      {/* Bottom Right: Interactive Model Hints */}
      <div className="absolute bottom-4 right-4 text-[10px] font-mono text-slate-500 bg-white/80 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-xs">
        Click components to inspect diagnostics · Drag to rotate · Scroll or +/- to zoom
      </div>
    </div>
  );
};

