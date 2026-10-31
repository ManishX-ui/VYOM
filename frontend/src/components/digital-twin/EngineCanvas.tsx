import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EngineTelemetry } from '../../types';
import {
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layers,
  Eye,
  Sliders,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface EngineCanvasProps {
  activeComponentId?: string | null;
  onSelectComponent?: (componentId: string) => void;
  heightClass?: string;
  showHotspots?: boolean;
  anomalyHighlight?: string | null;
  initialViewMode?: 'solid' | 'ghost' | 'component' | 'exploded';
  telemetry?: EngineTelemetry;
}

export const EngineCanvas: React.FC<EngineCanvasProps> = ({
  activeComponentId,
  onSelectComponent,
  heightClass = 'h-[440px]',
  showHotspots = true,
  anomalyHighlight = null,
  initialViewMode = 'solid',
  telemetry,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'solid' | 'ghost' | 'component' | 'exploded'>(initialViewMode);
  const [explodedAmount, setExplodedAmount] = useState<number>(initialViewMode === 'exploded' ? 0.6 : 0);
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [hotspotsVisible, setHotspotsVisible] = useState<boolean>(showHotspots);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // References to 3D scene objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const propGroupRef = useRef<THREE.Group | null>(null);
  const partsRef = useRef<{ [key: string]: THREE.Object3D }>({});
  const initialPositionsRef = useRef<{ [key: string]: THREE.Vector3 }>({});
  const explodedOffsetsRef = useRef<{ [key: string]: THREE.Vector3 }>({});
  const animFrameRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const telemetryRef = useRef<EngineTelemetry | undefined>(telemetry);

  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  // Determine dynamic anomaly highlight if any parameter exceeds limits
  const effectiveAnomalyHighlight = anomalyHighlight || (
    telemetry && telemetry.cht > 205 ? 'comp-cylinder-head' :
    telemetry && (telemetry.oilPressure < 2.5 || telemetry.oilTemperature > 105) ? 'comp-lubrication' :
    telemetry && telemetry.vibrationRMS > 0.35 ? 'comp-crankshaft' : null
  );

  // Hotspot anchor coordinates mapped to 2D screen space
  const [hotspotScreenPositions, setHotspotScreenPositions] = useState<{
    [key: string]: { x: number; y: number; visible: boolean };
  }>({});

  const hotspotWorldPositions: { [key: string]: THREE.Vector3 } = {
    'comp-cylinder-head': new THREE.Vector3(-1.1, 0.75, 0.2),
    'comp-fuel-system': new THREE.Vector3(0.7, 0.95, -0.2),
    'comp-crankshaft': new THREE.Vector3(0.0, 0.1, 0.85),
    'comp-lubrication': new THREE.Vector3(0.65, -0.7, 0.4),
    'comp-propeller': new THREE.Vector3(-2.1, 0.1, 0.0),
    'comp-gearbox': new THREE.Vector3(-1.45, -0.4, 0.0),
  };

  // Grouped to left and right columns to keep the 3D model in the center unobstructed
  const leftGroupKeys = ['comp-cylinder-head', 'comp-propeller', 'comp-gearbox'];
  const rightGroupKeys = ['comp-fuel-system', 'comp-crankshaft', 'comp-lubrication'];
  const slotVerticalPositions = [0.24, 0.49, 0.74];

  // Dynamic values driven by centralized telemetry stream
  const hotspotLabels: { [key: string]: { name: string; value: string; isWarning?: boolean } } = {
    'comp-cylinder-head': {
      name: 'Cylinder Head',
      value: telemetry ? `${telemetry.cht} °C` : '187 °C',
      isWarning: telemetry ? telemetry.cht > 205 : false,
    },
    'comp-propeller': {
      name: 'Engine RPM',
      value: telemetry ? `${telemetry.rpm} RPM` : '2450 RPM',
      isWarning: telemetry ? telemetry.rpm > 2700 : false,
    },
    'comp-gearbox': {
      name: 'Exhaust (EGT)',
      value: telemetry ? `${telemetry.egt} °C` : '620 °C',
      isWarning: telemetry ? telemetry.egt > 680 : false,
    },
    'comp-fuel-system': {
      name: 'Fuel Flow',
      value: telemetry ? `${telemetry.fuelFlow} L/hr` : '12.5 L/hr',
      isWarning: telemetry ? telemetry.fuelFlow > 22 : false,
    },
    'comp-crankshaft': {
      name: 'Vibration',
      value: telemetry ? `${telemetry.vibrationRMS} g` : '0.28 g',
      isWarning: telemetry ? telemetry.vibrationRMS > 0.35 : false,
    },
    'comp-lubrication': {
      name: 'Oil System',
      value: telemetry ? `${telemetry.oilPressure} bar` : '4.2 bar',
      isWarning: telemetry ? telemetry.oilPressure < 2.5 || telemetry.oilTemperature > 105 : false,
    },
  };

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    setContainerSize({ width, height });

    // Detect software GL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(3.8, 2.2, 4.4);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Studio Environment map
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio 3-Point Lighting
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 3.2); // warm key
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.2); // cool fill
    scene.add(hemiLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.8); // cyan aerospace rim
    rimLight.position.set(-6, 3, -5);
    scene.add(rimLight);

    const bottomFill = new THREE.DirectionalLight(0x94a3b8, 1.0);
    bottomFill.position.set(0, -4, 2);
    scene.add(bottomFill);

    // Engine Master Assembly Group
    const engineMasterGroup = new THREE.Group();
    groupRef.current = engineMasterGroup;
    scene.add(engineMasterGroup);

    // ==========================================
    // PROCEDURAL AERO-PISTON ENGINE (ROTAX 914-CLASS)
    // ==========================================

    // Material Library
    const crankcaseMat = new THREE.MeshStandardMaterial({
      color: 0x242d38,
      metalness: 0.85,
      roughness: 0.25,
    });

    const cylinderFinMat = new THREE.MeshStandardMaterial({
      color: 0x1e2530,
      metalness: 0.9,
      roughness: 0.35,
    });

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.8,
      roughness: 0.2,
    });

    const polishedSteelMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.95,
      roughness: 0.1,
    });

    const copperBronzeMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
    });

    const turboHousingMat = new THREE.MeshStandardMaterial({
      color: 0xb45309, // heated bronze turbine
      metalness: 0.85,
      roughness: 0.3,
    });

    const hoseMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.1,
    });

    const blueAnodizedMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      metalness: 0.9,
      roughness: 0.2,
    });

    // 1. Central Crankcase Block
    const crankcaseGroup = new THREE.Group();
    const mainBlockGeo = new THREE.BoxGeometry(1.6, 1.1, 1.2);
    const mainBlock = new THREE.Mesh(mainBlockGeo, crankcaseMat);
    mainBlock.castShadow = true;
    mainBlock.receiveShadow = true;
    crankcaseGroup.add(mainBlock);

    // Crankcase inspection covers & bolts
    const coverGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16);
    coverGeo.rotateZ(Math.PI / 2);
    const coverMesh = new THREE.Mesh(coverGeo, polishedSteelMat);
    coverMesh.position.set(0.81, 0, 0);
    crankcaseGroup.add(coverMesh);

    partsRef.current['crankcase'] = crankcaseGroup;
    initialPositionsRef.current['crankcase'] = crankcaseGroup.position.clone();
    explodedOffsetsRef.current['crankcase'] = new THREE.Vector3(0, 0, 0);
    engineMasterGroup.add(crankcaseGroup);

    // 2. Cylinder Heads & Barrels (Horizontally Opposed 4-Cylinder)
    const cylinderGroup = new THREE.Group();
    const cylinderOffsets = [
      { x: -0.4, z: 0.75, angle: 0 },
      { x: 0.4, z: 0.75, angle: 0 },
      { x: -0.4, z: -0.75, angle: Math.PI },
      { x: 0.4, z: -0.75, angle: Math.PI },
    ];

    cylinderOffsets.forEach((pos) => {
      const cylSub = new THREE.Group();
      cylSub.position.set(pos.x, 0.1, pos.z);
      cylSub.rotation.y = pos.angle;

      // Barrel
      const barrel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.32, 0.65, 20),
        cylinderFinMat
      );
      barrel.rotation.x = Math.PI / 2;
      cylSub.add(barrel);

      // Cooling fins (stacked rings)
      for (let f = -0.25; f <= 0.25; f += 0.08) {
        const fin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.42, 0.42, 0.02, 20),
          cylinderFinMat
        );
        fin.rotation.x = Math.PI / 2;
        fin.position.z = f;
        cylSub.add(fin);
      }

      // Cylinder Head cap
      const headCap = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.68, 0.3),
        headMat
      );
      headCap.position.z = 0.42;
      cylSub.add(headCap);

      // Spark plugs
      const sparkPlug = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.05, 0.2, 8),
        copperBronzeMat
      );
      sparkPlug.position.set(0.18, 0.25, 0.42);
      sparkPlug.rotation.x = 0.4;
      cylSub.add(sparkPlug);

      cylinderGroup.add(cylSub);
    });

    partsRef.current['comp-cylinder-head'] = cylinderGroup;
    initialPositionsRef.current['comp-cylinder-head'] = cylinderGroup.position.clone();
    explodedOffsetsRef.current['comp-cylinder-head'] = new THREE.Vector3(0, 0.5, 0.8);
    engineMasterGroup.add(cylinderGroup);

    // 3. Gearbox & Reduction Drive (Front)
    const gearboxGroup = new THREE.Group();
    gearboxGroup.position.set(-1.0, 0.05, 0);

    const gearHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.58, 0.55, 24),
      crankcaseMat
    );
    gearHousing.rotation.z = Math.PI / 2;
    gearboxGroup.add(gearHousing);

    const reductionHub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.32, 0.35, 20),
      polishedSteelMat
    );
    reductionHub.rotation.z = Math.PI / 2;
    reductionHub.position.x = -0.38;
    gearboxGroup.add(reductionHub);

    partsRef.current['comp-gearbox'] = gearboxGroup;
    initialPositionsRef.current['comp-gearbox'] = gearboxGroup.position.clone();
    explodedOffsetsRef.current['comp-gearbox'] = new THREE.Vector3(-0.6, 0, 0);
    engineMasterGroup.add(gearboxGroup);

    // 4. Propeller Assembly (Pusher / Forward)
    const propellerGroup = new THREE.Group();
    propellerGroup.position.set(-1.6, 0.05, 0);
    propGroupRef.current = propellerGroup;

    // Spinner Dome
    const spinner = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.65, 24),
      polishedSteelMat
    );
    spinner.rotation.z = Math.PI / 2;
    propellerGroup.add(spinner);

    // 2 Propeller Blades (Carbon Composite)
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      metalness: 0.4,
      roughness: 0.3,
    });

    const bladeGeo = new THREE.BoxGeometry(0.14, 2.2, 0.04);
    const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
    blade1.position.x = 0.08;
    blade1.rotation.x = 0.18; // Pitch angle
    propellerGroup.add(blade1);

    // Yellow tip markings
    const tipGeo = new THREE.BoxGeometry(0.142, 0.22, 0.042);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const tipTop = new THREE.Mesh(tipGeo, tipMat);
    tipTop.position.set(0.08, 1.0, 0);
    propellerGroup.add(tipTop);

    const tipBottom = new THREE.Mesh(tipGeo, tipMat);
    tipBottom.position.set(0.08, -1.0, 0);
    propellerGroup.add(tipBottom);

    partsRef.current['comp-propeller'] = propellerGroup;
    initialPositionsRef.current['comp-propeller'] = propellerGroup.position.clone();
    explodedOffsetsRef.current['comp-propeller'] = new THREE.Vector3(-1.2, 0, 0);
    engineMasterGroup.add(propellerGroup);

    // 5. Turbocharger & Intercooler Ducting (Aft/Top)
    const turboGroup = new THREE.Group();
    turboGroup.position.set(0.85, 0.45, -0.35);

    // Turbine scroll casing (Lathe geometry)
    const turbine = new THREE.Mesh(
      new THREE.TorusGeometry(0.28, 0.12, 16, 24),
      turboHousingMat
    );
    turbine.rotation.x = Math.PI / 2;
    turboGroup.add(turbine);

    // Wastegate actuator
    const actuator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.32, 16),
      polishedSteelMat
    );
    actuator.position.set(0.25, 0.2, 0.1);
    turboGroup.add(actuator);

    // Intake Pipe curving into manifold
    const intakeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.4, 0.2, 0.2),
      new THREE.Vector3(-0.9, 0.15, 0.1),
    ]);
    const intakePipe = new THREE.Mesh(
      new THREE.TubeGeometry(intakeCurve, 20, 0.08, 12, false),
      polishedSteelMat
    );
    turboGroup.add(intakePipe);

    partsRef.current['turbo'] = turboGroup;
    initialPositionsRef.current['turbo'] = turboGroup.position.clone();
    explodedOffsetsRef.current['turbo'] = new THREE.Vector3(0.7, 0.6, -0.4);
    engineMasterGroup.add(turboGroup);

    // 6. Fuel Rail & Injection System
    const fuelGroup = new THREE.Group();
    fuelGroup.position.set(0, 0.65, 0);

    const railGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.4, 12);
    railGeo.rotateZ(Math.PI / 2);
    const fuelRail = new THREE.Mesh(railGeo, blueAnodizedMat);
    fuelGroup.add(fuelRail);

    // Injector connectors
    [-0.5, -0.2, 0.2, 0.5].forEach((rx) => {
      const inj = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.03, 0.18, 8),
        copperBronzeMat
      );
      inj.position.set(rx, -0.09, 0.15);
      inj.rotation.x = 0.5;
      fuelGroup.add(inj);
    });

    partsRef.current['comp-fuel-system'] = fuelGroup;
    initialPositionsRef.current['comp-fuel-system'] = fuelGroup.position.clone();
    explodedOffsetsRef.current['comp-fuel-system'] = new THREE.Vector3(0, 0.7, 0);
    engineMasterGroup.add(fuelGroup);

    // 7. Oil Sump & Lubrication Pan (Bottom)
    const oilGroup = new THREE.Group();
    oilGroup.position.set(0, -0.65, 0);

    const sumpPan = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.28, 0.9),
      crankcaseMat
    );
    oilGroup.add(sumpPan);

    // Oil Filter Cannister
    const oilFilter = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.35, 16),
      headMat
    );
    oilFilter.position.set(0.5, -0.1, 0.4);
    oilGroup.add(oilFilter);

    // Braided return lines
    const lineCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.5, 0, 0.4),
      new THREE.Vector3(0.2, 0.3, 0.5),
      new THREE.Vector3(-0.3, 0.4, 0.3),
    ]);
    const oilLine = new THREE.Mesh(
      new THREE.TubeGeometry(lineCurve, 20, 0.035, 10, false),
      hoseMat
    );
    oilGroup.add(oilLine);

    partsRef.current['comp-lubrication'] = oilGroup;
    initialPositionsRef.current['comp-lubrication'] = oilGroup.position.clone();
    explodedOffsetsRef.current['comp-lubrication'] = new THREE.Vector3(0, -0.6, 0);
    engineMasterGroup.add(oilGroup);

    // Contact Shadow Ground Plane
    const groundGeo = new THREE.PlaneGeometry(8, 8);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Mouse Interaction for Drag Orbit
    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !groupRef.current) return;
      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      groupRef.current.rotation.y += deltaX * 0.008;
      groupRef.current.rotation.x += deltaY * 0.008;

      // Clamp vertical tilt
      groupRef.current.rotation.x = Math.max(-0.8, Math.min(0.8, groupRef.current.rotation.x));

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    // Resize Observer
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
      setContainerSize({ width: w, height: h });
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    const _vec3 = new THREE.Vector3();

    const tick = () => {
      animFrameRef.current = requestAnimationFrame(tick);
      const delta = clock.getDelta();

      // Spin propeller blade synchronized to live engine RPM
      if (propGroupRef.current) {
        const liveRpm = telemetryRef.current?.rpm ?? 2450;
        const rpmFactor = liveRpm > 0 ? (liveRpm / 2450.0) : 0.0;
        propGroupRef.current.rotation.x += delta * 12.0 * rpmFactor;
      }

      // Auto rotation if enabled and not actively dragging
      if (isRotating && !isDraggingRef.current && groupRef.current) {
        groupRef.current.rotation.y += delta * 0.25;
      }

      // Update 2D Screen Coordinates for Hotspots
      if (cameraRef.current && groupRef.current && mountRef.current) {
        const currentW = mountRef.current.clientWidth;
        const currentH = mountRef.current.clientHeight;
        const positions: { [key: string]: { x: number; y: number; visible: boolean } } = {};
        const groupMatrix = groupRef.current.matrixWorld;

        Object.keys(hotspotWorldPositions).forEach((key) => {
          const worldPos = hotspotWorldPositions[key].clone().applyMatrix4(groupMatrix);
          const screenPos = worldPos.project(cameraRef.current!);

          // Check if in front of camera
          const isVisible = screenPos.z < 1.0;
          const x = (screenPos.x * 0.5 + 0.5) * currentW;
          const y = (-(screenPos.y * 0.5) + 0.5) * currentH;

          positions[key] = { x, y, visible: isVisible };
        });

        setHotspotScreenPositions(positions);
      }

      renderer.render(scene, camera);
    };

    tick();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      renderer.dispose();
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
    };
  }, []);

  // Update visual mode (solid, ghost, component, exploded)
  useEffect(() => {
    if (!partsRef.current) return;

    Object.keys(partsRef.current).forEach((partKey) => {
      const part = partsRef.current[partKey];
      if (!part) return;

      part.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (viewMode === 'ghost') {
            child.material.wireframe = true;
            child.material.transparent = true;
            child.material.opacity = 0.4;
          } else {
            child.material.wireframe = false;
            child.material.transparent = false;
            child.material.opacity = 1.0;
          }

          // Component highlight mode
          if (viewMode === 'component' || activeComponentId) {
            const isTarget =
              activeComponentId === partKey ||
              (activeComponentId === 'comp-crankshaft' && partKey === 'crankcase');
            if (isTarget) {
              child.material.emissive = new THREE.Color(0x0284c7);
              child.material.emissiveIntensity = 0.6;
            } else if (effectiveAnomalyHighlight && (effectiveAnomalyHighlight === partKey || (effectiveAnomalyHighlight === 'comp-cylinder-head' && (partKey === 'cylinders' || partKey === 'comp-cylinder-head')))) {
              child.material.emissive = new THREE.Color(0xef4444);
              child.material.emissiveIntensity = 0.8;
            } else {
              child.material.emissive = new THREE.Color(0x000000);
              child.material.emissiveIntensity = 0;
            }
          } else if (effectiveAnomalyHighlight && (effectiveAnomalyHighlight === partKey || (effectiveAnomalyHighlight === 'comp-cylinder-head' && (partKey === 'cylinders' || partKey === 'comp-cylinder-head')))) {
            child.material.emissive = new THREE.Color(0xef4444);
            child.material.emissiveIntensity = 0.8;
          } else {
            child.material.emissive = new THREE.Color(0x000000);
            child.material.emissiveIntensity = 0;
          }
        }
      });
    });
  }, [viewMode, activeComponentId, effectiveAnomalyHighlight]);

  // Update exploded view positions smoothly
  useEffect(() => {
    Object.keys(partsRef.current).forEach((key) => {
      const part = partsRef.current[key];
      const initialPos = initialPositionsRef.current[key];
      const offset = explodedOffsetsRef.current[key];
      if (part && initialPos && offset) {
        part.position.x = initialPos.x + offset.x * explodedAmount;
        part.position.y = initialPos.y + offset.y * explodedAmount;
        part.position.z = initialPos.z + offset.z * explodedAmount;
      }
    });
  }, [explodedAmount]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current && groupRef.current) {
      cameraRef.current.position.set(3.8, 2.2, 4.4);
      cameraRef.current.lookAt(0, 0, 0);
      groupRef.current.rotation.set(0, 0, 0);
    }
  }, []);

  const zoomCamera = (direction: number) => {
    if (cameraRef.current) {
      const factor = direction > 0 ? 0.85 : 1.15;
      cameraRef.current.position.multiplyScalar(factor);
    }
  };

  return (
    <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden bg-slate-950 border border-slate-800 select-none shadow-sm`}>
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left Spec HUD */}
      <div className="absolute top-3.5 left-4 z-10 flex items-center gap-2">
        <span className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 backdrop-blur-sm">
          Rotax 914 F Aero-Piston Twin
        </span>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
          Telemetry Synced
        </span>
      </div>

      {/* Top Right Quick Controls */}
      <div className="absolute top-3.5 right-4 z-10 flex items-center gap-1.5">
        <button
          onClick={() => setIsRotating(!isRotating)}
          title={isRotating ? 'Pause auto-rotation' : 'Resume auto-rotation'}
          className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
            isRotating
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          {isRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => zoomCamera(1)}
          title="Zoom In"
          className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => zoomCamera(-1)}
          title="Zoom Out"
          className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setHotspotsVisible(!hotspotsVisible)}
          title={hotspotsVisible ? 'Hide Telemetry Arrows' : 'Show Telemetry Arrows'}
          className={`p-1.5 rounded-lg border text-xs font-medium transition-colors ${
            hotspotsVisible
              ? 'bg-blue-600/20 border-blue-500/50 text-blue-300'
              : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={resetCamera}
          title="Reset Camera Orientation"
          className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* SVG Dynamic Leader Lines & Arrows to 3D Model Components (Zero Center Congestion) */}
      {hotspotsVisible && viewMode !== 'exploded' && containerSize.width > 0 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 overflow-visible">
          <defs>
            {/* Standard Cyan Arrow */}
            <marker
              id="arrowhead-blue"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>

            {/* Selected Blue Arrow */}
            <marker
              id="arrowhead-selected"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#60a5fa" />
            </marker>

            {/* Anomaly Red Arrow */}
            <marker
              id="arrowhead-red"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto"
            >
              <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#ef4444" />
            </marker>
          </defs>

          {/* Left Column Leader Lines & Arrows */}
          {leftGroupKeys.map((key, index) => {
            const pos = hotspotScreenPositions[key];
            if (!pos) return null;

            const isSelected = activeComponentId === key;
            const isAnomaly = anomalyHighlight === key;
            const isHovered = hoveredHotspot === key;

            const cardWidth = 148;
            const startX = 14 + cardWidth;
            const startY = containerSize.height * slotVerticalPositions[index];
            const elbowX = startX + 14;
            const targetX = pos.x;
            const targetY = pos.y;

            const strokeColor = isAnomaly ? '#ef4444' : isSelected ? '#60a5fa' : '#38bdf8';
            const markerId = isAnomaly ? 'url(#arrowhead-red)' : isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead-blue)';
            const opacity = isAnomaly || isSelected || isHovered ? 1.0 : pos.visible ? 0.7 : 0.25;

            return (
              <g key={`line-${key}`} opacity={opacity} className="transition-opacity duration-200">
                {/* Clean CAD Technical Leader Line with Elbow */}
                <path
                  d={`M ${startX} ${startY} L ${elbowX} ${startY} L ${targetX} ${targetY}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isAnomaly || isSelected || isHovered ? 1.75 : 1.2}
                  strokeDasharray={isSelected || isAnomaly ? undefined : '3 3'}
                  markerEnd={markerId}
                />
                {/* Target Anchor Point on 3D Model */}
                <circle cx={targetX} cy={targetY} r="3.5" fill={strokeColor} />
                <circle
                  cx={targetX}
                  cy={targetY}
                  r="7"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.2"
                  opacity={isAnomaly ? 1 : 0.4}
                />
              </g>
            );
          })}

          {/* Right Column Leader Lines & Arrows */}
          {rightGroupKeys.map((key, index) => {
            const pos = hotspotScreenPositions[key];
            if (!pos) return null;

            const isSelected = activeComponentId === key;
            const isAnomaly = anomalyHighlight === key;
            const isHovered = hoveredHotspot === key;

            const cardWidth = 148;
            const startX = containerSize.width - 14 - cardWidth;
            const startY = containerSize.height * slotVerticalPositions[index];
            const elbowX = startX - 14;
            const targetX = pos.x;
            const targetY = pos.y;

            const strokeColor = isAnomaly ? '#ef4444' : isSelected ? '#60a5fa' : '#38bdf8';
            const markerId = isAnomaly ? 'url(#arrowhead-red)' : isSelected ? 'url(#arrowhead-selected)' : 'url(#arrowhead-blue)';
            const opacity = isAnomaly || isSelected || isHovered ? 1.0 : pos.visible ? 0.7 : 0.25;

            return (
              <g key={`line-${key}`} opacity={opacity} className="transition-opacity duration-200">
                {/* Clean CAD Technical Leader Line with Elbow */}
                <path
                  d={`M ${startX} ${startY} L ${elbowX} ${startY} L ${targetX} ${targetY}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isAnomaly || isSelected || isHovered ? 1.75 : 1.2}
                  strokeDasharray={isSelected || isAnomaly ? undefined : '3 3'}
                  markerEnd={markerId}
                />
                {/* Target Anchor Point on 3D Model */}
                <circle cx={targetX} cy={targetY} r="3.5" fill={strokeColor} />
                <circle
                  cx={targetX}
                  cy={targetY}
                  r="7"
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth="1.2"
                  opacity={isAnomaly ? 1 : 0.4}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Sleek, Non-Congested Perimeter Callout Frames (Left & Right Margins) */}
      {hotspotsVisible && viewMode !== 'exploded' && (
        <>
          {/* Left Column HUD Frames */}
          {leftGroupKeys.map((key, index) => {
            const info = hotspotLabels[key];
            const isSelected = activeComponentId === key;
            const isAnomaly = effectiveAnomalyHighlight === key || (info && info.isWarning);
            const isHovered = hoveredHotspot === key;

            return (
              <div
                key={key}
                style={{
                  top: `${slotVerticalPositions[index] * 100}%`,
                  transform: 'translateY(-50%)',
                }}
                className="absolute left-3.5 z-20 pointer-events-auto"
              >
                <button
                  onClick={() => onSelectComponent && onSelectComponent(key)}
                  onMouseEnter={() => setHoveredHotspot(key)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                  className={`w-[148px] h-7 px-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all shadow-md backdrop-blur-md cursor-pointer ${
                    isAnomaly
                      ? 'bg-red-950/85 border-red-500 text-red-200 ring-2 ring-red-500/30'
                      : isSelected
                      ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-500/40 shadow-blue-500/20'
                      : isHovered
                      ? 'bg-slate-900/90 border-sky-400/80 text-white'
                      : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isAnomaly
                          ? 'bg-red-500 animate-pulse'
                          : isSelected
                          ? 'bg-white'
                          : 'bg-sky-400'
                      }`}
                    />
                    <span className="font-medium text-[11px] truncate">{info.name}</span>
                  </div>
                  <span
                    className={`font-mono text-[10px] shrink-0 font-semibold ml-1.5 ${
                      isAnomaly
                        ? 'text-red-300'
                        : isSelected
                        ? 'text-white'
                        : 'text-sky-300'
                    }`}
                  >
                    {info.value}
                  </span>
                </button>
              </div>
            );
          })}

          {/* Right Column HUD Frames */}
          {rightGroupKeys.map((key, index) => {
            const info = hotspotLabels[key];
            const isSelected = activeComponentId === key;
            const isAnomaly = effectiveAnomalyHighlight === key || (info && info.isWarning);
            const isHovered = hoveredHotspot === key;

            return (
              <div
                key={key}
                style={{
                  top: `${slotVerticalPositions[index] * 100}%`,
                  transform: 'translateY(-50%)',
                }}
                className="absolute right-3.5 z-20 pointer-events-auto"
              >
                <button
                  onClick={() => onSelectComponent && onSelectComponent(key)}
                  onMouseEnter={() => setHoveredHotspot(key)}
                  onMouseLeave={() => setHoveredHotspot(null)}
                  className={`w-[148px] h-7 px-2.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all shadow-md backdrop-blur-md cursor-pointer ${
                    isAnomaly
                      ? 'bg-red-950/85 border-red-500 text-red-200 ring-2 ring-red-500/30'
                      : isSelected
                      ? 'bg-blue-600 border-blue-400 text-white ring-2 ring-blue-500/40 shadow-blue-500/20'
                      : isHovered
                      ? 'bg-slate-900/90 border-sky-400/80 text-white'
                      : 'bg-slate-900/80 border-slate-700/60 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        isAnomaly
                          ? 'bg-red-500 animate-pulse'
                          : isSelected
                          ? 'bg-white'
                          : 'bg-sky-400'
                      }`}
                    />
                    <span className="font-medium text-[11px] truncate">{info.name}</span>
                  </div>
                  <span
                    className={`font-mono text-[10px] shrink-0 font-semibold ml-1.5 ${
                      isAnomaly
                        ? 'text-red-300'
                        : isSelected
                        ? 'text-white'
                        : 'text-sky-300'
                    }`}
                  >
                    {info.value}
                  </span>
                </button>
              </div>
            );
          })}
        </>
      )}

      {/* Collapsible Ergonomic Bottom Control Dock (Zero Viewport Occlusion) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-xl transition-all duration-300 ${
          isControlsCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
      >
        {/* Toggle Bar */}
        <div className="flex justify-center mb-1">
          <button
            onClick={() => setIsControlsCollapsed(!isControlsCollapsed)}
            className="flex items-center gap-1 px-3 py-0.5 rounded-t-md bg-slate-900/90 border border-b-0 border-slate-700 text-[11px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            {isControlsCollapsed ? (
              <>
                <ChevronUp className="w-3 h-3" /> Show Viewport Controls
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" /> Hide Controls
              </>
            )}
          </button>
        </div>

        {/* Control Panel Surface */}
        <div className="p-2.5 rounded-lg bg-slate-900/95 border border-slate-800 backdrop-blur-md shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 shrink-0">
            <button
              onClick={() => {
                setViewMode('solid');
                setExplodedAmount(0);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'solid'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Solid View
            </button>
            <button
              onClick={() => {
                setViewMode('ghost');
                setExplodedAmount(0);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'ghost'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ghost View
            </button>
            <button
              onClick={() => {
                setViewMode('component');
                setExplodedAmount(0);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'component'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Component View
            </button>
            <button
              onClick={() => {
                setViewMode('exploded');
                if (explodedAmount === 0) setExplodedAmount(0.65);
              }}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                viewMode === 'exploded'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Exploded
            </button>
          </div>

          {/* Exploded Separation Slider */}
          <div className="flex items-center gap-2 w-full md:w-44 text-slate-300">
            <Sliders className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={explodedAmount}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setExplodedAmount(val);
                if (val > 0 && viewMode !== 'exploded') setViewMode('exploded');
                if (val === 0 && viewMode === 'exploded') setViewMode('solid');
              }}
              className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span className="font-mono text-[10px] w-7 text-right text-slate-400">
              {Math.round(explodedAmount * 100)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
