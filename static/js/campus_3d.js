/**
 * Three.js 3D Interactive Model View - SENTINEL AI Campus Surveillance
 * 3D College Campus Layout with Full Campus Surroundings
 */

let scene, camera, renderer, controls;
let cameraNodes = [];
let raycaster, mouse;
let hoveredNode = null;
let animationTarget = null;
let tooltipElement = null;

function init3DCampusMap(camerasData, incidentsData) {
    const container = document.getElementById('campus3DContainer');
    if (!container) return;

    container.innerHTML = '<div id="cam3DTooltip" style="display: none; position: absolute; pointer-events: none; z-index: 100; background: rgba(13, 17, 28, 0.95); border: 1px solid var(--color-primary); border-radius: 8px; padding: 8px 12px; color: #fff; font-size: 0.8rem; box-shadow: 0 4px 20px rgba(0,0,0,0.6); backdrop-filter: blur(8px);"></div>';
    tooltipElement = document.getElementById('cam3DTooltip');

    // Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.009);

    // Camera
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 52, 68);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // Orbit Controls
    if (typeof THREE.OrbitControls === 'function') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.06;
        controls.maxPolarAngle = Math.PI / 2 - 0.04;
        controls.minDistance = 10;
        controls.maxDistance = 140;
        controls.target.set(0, 2, 0);
    }

    // Lighting
    setupCampusLighting();

    // Build Campus Surroundings & Elements
    buildCampusGround();
    buildCampusSurroundings();
    build3DCollegeBlocks();
    buildCampusFloraAndFurniture();
    plotCameraNodes(camerasData, incidentsData);

    // Interaction Raycasting
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('click', onCameraPinClick);

    window.addEventListener('resize', () => {
        if (!container) return;
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    animate();
}

/**
 * Lighting Setup: Sun, Ambient Sky, and Cyber/Security Cyan & Violet Accent Lights
 */
function setupCampusLighting() {
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.85);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.3);
    sunLight.position.set(45, 65, 35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 200;
    const d = 55;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Accent Cyber Rim Lights for Surveillance Aesthetic
    const cyanRim = new THREE.DirectionalLight(0x06b6d4, 0.65);
    cyanRim.position.set(-45, 35, -35);
    scene.add(cyanRim);

    const violetRim = new THREE.DirectionalLight(0x8b5cf6, 0.45);
    violetRim.position.set(0, 30, -50);
    scene.add(violetRim);
}

/**
 * Campus Terrain, Ring Road, Pedestrian Walkways, Central Quad & Sports Grounds
 */
function buildCampusGround() {
    const campusWidth = 130;
    const campusDepth = 130;

    // 1. Base Green Grass Terrain
    const grassGeo = new THREE.PlaneGeometry(campusWidth, campusDepth);
    const grassMat = new THREE.MeshStandardMaterial({
        color: 0x0e241b,
        roughness: 0.9,
        metalness: 0.05
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    scene.add(grass);

    // Subtle Grid Overlay for tech surveillance look
    const grid = new THREE.GridHelper(campusWidth, 65, 0x06b6d4, 0x142834);
    grid.position.y = 0.02;
    grid.material.opacity = 0.35;
    grid.material.transparent = true;
    scene.add(grid);

    // 2. Main Campus Ring Road (Dark Asphalt Loop)
    createCampusRoad(0, 0, 76, 76, 4.5);

    // 3. Main Entrance Avenue (South Entrance from Gate to Quad)
    createRectRoad(0, 24, 6.0, 32);

    // Cross-Avenues connecting East-West departments
    createRectRoad(0, 0, 80, 4.5);
    createRectRoad(0, 0, 4.5, 80);

    // 4. Central Quad Courtyard Plaza (Paved Stone Roundabout)
    const quadGeo = new THREE.CircleGeometry(15, 48);
    const quadMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.6,
        metalness: 0.2
    });
    const quad = new THREE.Mesh(quadGeo, quadMat);
    quad.rotation.x = -Math.PI / 2;
    quad.position.set(0, 0.05, 0);
    quad.receiveShadow = true;
    scene.add(quad);

    // Inner Fountain / Water Basin & Flagpole in Quad Center
    createCentralFountain();

    // 5. Sports Track & Green Turf Pitch (North-West Campus)
    createSportsArena(-38, -26);

    // 6. Basketball / Tennis Courts (North-East Campus)
    createOutdoorCourts(38, -26);
}

/**
 * Ring road using a hollow plane or combined road geometry
 */
function createCampusRoad(centerX, centerZ, outerSize, innerSize, roadWidth) {
    const roadMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.7,
        metalness: 0.15
    });

    // North, South, East, West road strips
    const halfOuter = outerSize / 2;
    const halfInner = innerSize / 2;

    const strips = [
        { x: centerX, z: centerZ - halfOuter + roadWidth / 2, w: outerSize, d: roadWidth }, // North
        { x: centerX, z: centerZ + halfOuter - roadWidth / 2, w: outerSize, d: roadWidth }, // South
        { x: centerX - halfOuter + roadWidth / 2, z: centerZ, w: roadWidth, d: outerSize }, // West
        { x: centerX + halfOuter - roadWidth / 2, z: centerZ, w: roadWidth, d: outerSize }, // East
    ];

    strips.forEach(s => {
        const geo = new THREE.PlaneGeometry(s.w, s.d);
        const mesh = new THREE.Mesh(geo, roadMat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(s.x, 0.04, s.z);
        mesh.receiveShadow = true;
        scene.add(mesh);
    });
}

function createRectRoad(x, z, w, d) {
    const geo = new THREE.PlaneGeometry(w, d);
    const mat = new THREE.MeshStandardMaterial({ color: 0x131d2e, roughness: 0.7 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.045, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
}

function createCentralFountain() {
    const fountainGroup = new THREE.Group();

    // Basin Outer Wall
    const basinGeo = new THREE.CylinderGeometry(4.8, 5.2, 0.8, 32);
    const basinMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const basin = new THREE.Mesh(basinGeo, basinMat);
    basin.position.y = 0.4;
    basin.castShadow = true;
    fountainGroup.add(basin);

    // Water Surface
    const waterGeo = new THREE.CircleGeometry(4.4, 32);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        roughness: 0.1,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.75;
    fountainGroup.add(water);

    // Center Pedestal & Flagpole
    const pedGeo = new THREE.CylinderGeometry(1.2, 1.5, 1.8, 16);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = 1.3;
    fountainGroup.add(ped);

    // Flagpole
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 10, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 6.0;
    fountainGroup.add(pole);

    // Flag
    const flagGeo = new THREE.PlaneGeometry(2.2, 1.3);
    const flagMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(flagGeo, flagMat);
    flag.position.set(1.1, 10.2, 0);
    fountainGroup.add(flag);

    fountainGroup.position.set(0, 0, 0);
    scene.add(fountainGroup);
}

function createSportsArena(x, z) {
    const group = new THREE.Group();

    // Running Track Oval (Red Clay)
    const trackGeo = new THREE.PlaneGeometry(24, 18);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
    const track = new THREE.Mesh(trackGeo, trackMat);
    track.rotation.x = -Math.PI / 2;
    track.position.y = 0.05;
    track.receiveShadow = true;
    group.add(track);

    // Inner Football / Cricket Turf
    const turfGeo = new THREE.PlaneGeometry(20, 14);
    const turfMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.85 });
    const turf = new THREE.Mesh(turfGeo, turfMat);
    turf.rotation.x = -Math.PI / 2;
    turf.position.y = 0.06;
    turf.receiveShadow = true;
    group.add(turf);

    // Pitch Markings Line
    const centerLineGeo = new THREE.PlaneGeometry(0.3, 14);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const centerLine = new THREE.Mesh(centerLineGeo, lineMat);
    centerLine.rotation.x = -Math.PI / 2;
    centerLine.position.y = 0.07;
    group.add(centerLine);

    group.position.set(x, 0, z);
    scene.add(group);
}

function createOutdoorCourts(x, z) {
    const group = new THREE.Group();

    const courtGeo = new THREE.PlaneGeometry(18, 14);
    const courtMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.7 });
    const court = new THREE.Mesh(courtGeo, courtMat);
    court.rotation.x = -Math.PI / 2;
    court.position.y = 0.05;
    court.receiveShadow = true;
    group.add(court);

    // Perimeter Court Net/Fence
    const fenceGeo = new THREE.BoxGeometry(18.2, 1.8, 0.1);
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x475569, wireframe: true });
    const fenceN = new THREE.Mesh(fenceGeo, fenceMat);
    fenceN.position.set(0, 0.9, -7);
    group.add(fenceN);

    const fenceS = fenceN.clone();
    fenceS.position.z = 7;
    group.add(fenceS);

    group.position.set(x, 0, z);
    scene.add(group);
}

/**
 * Campus Boundaries, Main Entrance Archway, Security Post, and Perimeter Fences
 */
function buildCampusSurroundings() {
    const boundarySize = 115;
    const half = boundarySize / 2;
    const wallColor = 0x1e293b;
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.8 });

    // Perimeter Low Boundary Wall
    const wallHeight = 1.4;
    const wallThickness = 0.6;

    // North Wall
    createWall(0, -half, boundarySize, wallThickness, wallHeight, wallMat);
    // West Wall
    createWall(-half, 0, wallThickness, boundarySize, wallHeight, wallMat);
    // East Wall
    createWall(half, 0, wallThickness, boundarySize, wallHeight, wallMat);
    // South Wall (Split for Main College Gate)
    const gateWidth = 14;
    const southSegment = (boundarySize - gateWidth) / 2;
    createWall(-half + southSegment / 2, half, southSegment, wallThickness, wallHeight, wallMat);
    createWall(half - southSegment / 2, half, southSegment, wallThickness, wallHeight, wallMat);

    // Grand Campus Entrance Gate Arch at (0, y, half)
    createEntranceGateArch(0, half);
}

function createWall(x, z, w, d, h, mat) {
    const geo = new THREE.BoxGeometry(w, h, d);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, h / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
}

function createEntranceGateArch(x, z) {
    const group = new THREE.Group();

    // 2 Grand Pillars
    const pillarGeo = new THREE.BoxGeometry(1.6, 6.5, 1.6);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });

    const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
    leftPillar.position.set(-6, 3.25, 0);
    leftPillar.castShadow = true;
    group.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.x = 6;
    group.add(rightPillar);

    // Arch Beam Top
    const beamGeo = new THREE.BoxGeometry(14.8, 1.4, 2.0);
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.set(0, 6.8, 0);
    beam.castShadow = true;
    group.add(beam);

    // Security Gatehouse Cabin
    const guardGeo = new THREE.BoxGeometry(3.5, 3.0, 3.5);
    const guardMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.set(9.0, 1.5, 0);
    guard.castShadow = true;
    group.add(guard);

    group.position.set(x, 0, z);
    scene.add(group);

    // Entrance Label
    create3DSpriteLabel("Campus Main Entrance", x, 8.5, z, "#0284c7");
}

/**
 * Detailed 3D College Department Blocks Matching Camera Coordinates
 */
function build3DCollegeBlocks() {
    // 1. Main Administration & Central Library Block (Coordinates: 0, 0, -2)
    createAdminBlock(0, -3);

    // 2. AI & Data Science Department Block (Coordinates: -19, 0, 10)
    createTechBlock(-19, 10, 16, 12, 14, 0x06b6d4, "AI & Data Science Block", 4);

    // 3. Computer Science & Engineering (CSE) Block (Coordinates: -10, 0, -15)
    createTechBlock(-10, -15, 15, 11, 13, 0x3b82f6, "Computer Science (CSE) Block", 3);

    // 4. Electronics & Communication (ECE) Block (Coordinates: 15, 0, -15)
    createTechBlock(15, -15, 15, 11, 13, 0x8b5cf6, "ECE Department Block", 3);

    // 5. Electrical & Electronics (EEE) Block (Coordinates: 18, 0, 10)
    createTechBlock(18, 10, 15, 11, 13, 0x10b981, "EEE Tech Complex", 3);

    // 6. Mechanical Engineering & Robotics Workshops (Coordinates: 6, 0, 22)
    createWorkshopBlock(6, 22, 18, 8, 14, 0xf59e0b, "Mechanical Workshop Complex");

    // 7. Campus Auditorium & Convention Center (East Campus: 34, 0, 2)
    createAuditoriumBlock(34, 2);

    // 8. Student Center & Cafeteria (West Campus: -34, 0, -2)
    createCafeteriaBlock(-34, -2);
}

/**
 * Main Administration & Central Library (Grand Multi-Tier Architecture)
 */
function createAdminBlock(x, z) {
    const group = new THREE.Group();

    // Base Tier
    const baseGeo = new THREE.BoxGeometry(20, 5, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 2.5;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Upper Tier
    const topGeo = new THREE.BoxGeometry(14, 6, 12);
    const topMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.3 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 8;
    top.castShadow = true;
    group.add(top);

    // Front Glass Atrium Facade
    const glassGeo = new THREE.BoxGeometry(8, 7, 0.4);
    const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.1,
        metalness: 0.9,
        transparent: true,
        opacity: 0.75
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 4.5, 8.1);
    group.add(glass);

    // Entrance Steps
    const stepsGeo = new THREE.BoxGeometry(10, 0.6, 3);
    const stepsMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
    const steps = new THREE.Mesh(stepsGeo, stepsMat);
    steps.position.set(0, 0.3, 9.5);
    group.add(steps);

    // Rooftop Dome / Skylight
    const domeGeo = new THREE.SphereGeometry(3.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.8, roughness: 0.2 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 11, 0);
    group.add(dome);

    // Architectural Wireframe Highlights
    addWireframeEdges(base);
    addWireframeEdges(top);

    group.position.set(x, 0, z);
    scene.add(group);

    create3DSpriteLabel("Main Admin & Library", x, 14.5, z, "#0284c7");
}

/**
 * Standard Modern Academic Block with Glass Facades & Floor Levels
 */
function createTechBlock(x, z, width, height, depth, themeColor, labelText, floors) {
    const group = new THREE.Group();

    // Main Body
    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.4,
        metalness: 0.3
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Architectural Accent Panels (Colored glass band for floors)
    for (let f = 1; f <= floors; f++) {
        const floorY = (height / (floors + 1)) * f;
        const panelGeo = new THREE.BoxGeometry(width + 0.1, 0.8, depth + 0.1);
        const panelMat = new THREE.MeshStandardMaterial({
            color: themeColor,
            roughness: 0.2,
            metalness: 0.6,
            emissive: themeColor,
            emissiveIntensity: 0.25
        });
        const panel = new THREE.Mesh(panelGeo, panelMat);
        panel.position.y = floorY;
        group.add(panel);
    }

    // Rooftop AC / Solar Equipment
    const acGeo = new THREE.BoxGeometry(3, 1.2, 3);
    const acMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const ac = new THREE.Mesh(acGeo, acMat);
    ac.position.set(width / 4, height + 0.6, 0);
    group.add(ac);

    addWireframeEdges(body);

    group.position.set(x, 0, z);
    scene.add(group);

    create3DSpriteLabel(labelText, x, height + 3.0, z, themeColor);
}

/**
 * Mechanical Workshop Block (Industrial Bay with Sawtooth Skylight Roof)
 */
function createWorkshopBlock(x, z, width, height, depth, themeColor, labelText) {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(width, height, depth);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x182030, roughness: 0.5 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = height / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Industrial Bay Entrance Rollers
    const doorGeo = new THREE.PlaneGeometry(6, 4.5);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4, side: THREE.DoubleSide });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.set(0, 2.25, depth / 2 + 0.05);
    group.add(door);

    addWireframeEdges(body);

    group.position.set(x, 0, z);
    scene.add(group);

    create3DSpriteLabel(labelText, x, height + 3.0, z, themeColor);
}

/**
 * Campus Auditorium
 */
function createAuditoriumBlock(x, z) {
    const group = new THREE.Group();

    // Curved/Octagonal Structure
    const audiGeo = new THREE.CylinderGeometry(8, 9, 8, 8);
    const audiMat = new THREE.MeshStandardMaterial({ color: 0x241d3b, roughness: 0.4 });
    const audi = new THREE.Mesh(audiGeo, audiMat);
    audi.position.y = 4;
    audi.castShadow = true;
    group.add(audi);

    // Dome Top
    const domeGeo = new THREE.SphereGeometry(6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xec4899, roughness: 0.3 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 8;
    group.add(dome);

    group.position.set(x, 0, z);
    scene.add(group);

    create3DSpriteLabel("Campus Auditorium", x, 14.5, z, "#ec4899");
}

/**
 * Student Center & Cafeteria
 */
function createCafeteriaBlock(x, z) {
    const group = new THREE.Group();

    const cafeGeo = new THREE.BoxGeometry(14, 5, 12);
    const cafeMat = new THREE.MeshStandardMaterial({ color: 0x132e29, roughness: 0.4 });
    const cafe = new THREE.Mesh(cafeGeo, cafeMat);
    cafe.position.y = 2.5;
    cafe.castShadow = true;
    group.add(cafe);

    // Glass Terrace
    const terrGeo = new THREE.BoxGeometry(10, 2.5, 8);
    const terrMat = new THREE.MeshStandardMaterial({ color: 0x10b981, transparent: true, opacity: 0.5 });
    const terr = new THREE.Mesh(terrGeo, terrMat);
    terr.position.y = 5.5;
    group.add(terr);

    addWireframeEdges(cafe);

    group.position.set(x, 0, z);
    scene.add(group);

    create3DSpriteLabel("Student Center & Food Court", x, 9.5, z, "#10b981");
}

function addWireframeEdges(mesh) {
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const lineMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.25 });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    mesh.add(wireframe);
}

/**
 * 3D Campus Flora, Trees, Street Lamps, and Walkway Furniture
 */
function buildCampusFloraAndFurniture() {
    const treePositions = [
        // Along Main Entrance Avenue
        [-4, 18], [4, 18], [-4, 26], [4, 26], [-4, 34], [4, 34],
        // Around Central Quad
        [-11, -11], [11, -11], [-11, 11], [11, 11],
        [-15, 0], [15, 0], [0, -15], [0, 15],
        // Perimeter Tree Green Belt (North)
        [-45, -45], [-30, -45], [-15, -45], [0, -45], [15, -45], [30, -45], [45, -45],
        // Perimeter Tree Green Belt (South)
        [-45, 45], [-35, 45], [-20, 45], [20, 45], [35, 45], [45, 45],
        // Perimeter Tree Green Belt (West & East)
        [-48, -30], [-48, -15], [-48, 15], [-48, 30],
        [48, -30], [48, -15], [48, 15], [48, 30],
        // Landscaping near Blocks
        [-28, 8], [-28, 16], [-12, 18], [24, 18], [28, 8],
        [-18, -24], [-6, -24], [8, -24], [22, -24]
    ];

    treePositions.forEach(([tx, tz], idx) => {
        const type = idx % 3 === 0 ? 'pine' : 'deciduous';
        create3DTree(tx, tz, type);
    });

    // Street Lamps along Walkways
    const lampPositions = [
        [-3.2, 12], [3.2, 12], [-3.2, 22], [3.2, 22], [-3.2, 32], [3.2, 32],
        [-12, 3.2], [12, 3.2], [-12, -3.2], [12, -3.2],
        [0, -12], [0, 12]
    ];

    lampPositions.forEach(([lx, lz]) => {
        createStreetLamp(lx, lz);
    });
}

/**
 * Procedural 3D Low-Poly Tree (Trunk + Foliage Clusters)
 */
function create3DTree(x, z, type) {
    const group = new THREE.Group();

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 2.2, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    group.add(trunk);

    if (type === 'pine') {
        // Conical Evergreen
        const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.8 });
        for (let i = 0; i < 3; i++) {
            const coneGeo = new THREE.ConeGeometry(2.0 - i * 0.4, 2.0, 7);
            const cone = new THREE.Mesh(coneGeo, foliageMat);
            cone.position.y = 2.2 + i * 1.2;
            cone.castShadow = true;
            group.add(cone);
        }
    } else {
        // Round Deciduous Lush Tree
        const greenShades = [0x15803d, 0x166534, 0x14532d];
        const folColor = greenShades[Math.floor(Math.random() * greenShades.length)];
        const folMat = new THREE.MeshStandardMaterial({ color: folColor, roughness: 0.75 });

        const fol1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), folMat);
        fol1.position.y = 3.0;
        fol1.castShadow = true;
        group.add(fol1);

        const fol2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 1), folMat);
        fol2.position.set(0.6, 3.8, 0.4);
        group.add(fol2);
    }

    const scale = 0.85 + Math.random() * 0.35;
    group.scale.set(scale, scale, scale);
    group.position.set(x, 0, z);
    scene.add(group);
}

/**
 * Street Light Pole with Soft Glowing Top
 */
function createStreetLamp(x, z) {
    const group = new THREE.Group();

    // Pole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.8, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.9;
    group.add(pole);

    // Lamp Head / Arm
    const armGeo = new THREE.BoxGeometry(0.8, 0.1, 0.2);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(0.3, 3.7, 0);
    group.add(arm);

    // Glowing Bulb
    const bulbGeo = new THREE.SphereGeometry(0.2, 8, 8);
    const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xfef08a,
        emissiveIntensity: 1.2
    });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0.6, 3.6, 0);
    group.add(bulb);

    group.position.set(x, 0, z);
    scene.add(group);
}

/**
 * Floating 3D Text / Sprite Badge Label for Departments
 */
function create3DSpriteLabel(text, x, y, z, accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');

    // Rounded Pill Background
    ctx.fillStyle = 'rgba(10, 15, 26, 0.88)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(10, 10, 360, 60, 20);
    } else {
        ctx.rect(10, 10, 360, 60);
    }
    ctx.fill();
    ctx.stroke();

    // Text Label
    ctx.font = 'bold 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 190, 40);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(x, y, z);
    sprite.scale.set(10, 2.2, 1);
    scene.add(sprite);
}

/**
 * Plot Live CCTV Camera Pins with Laser Ray and Status Pulses
 */
function plotCameraNodes(camerasData, incidentsData) {
    const alertCameraIds = incidentsData ? incidentsData.map(inc => inc.camera_id) : [];

    cameraNodes = [];

    camerasData.forEach(cam => {
        const isAlert = alertCameraIds.includes(cam.camera_id);
        const pinColor = isAlert ? 0xf43f5e : 0x10b981;

        // 3D Pin Sphere
        const pinGeo = new THREE.SphereGeometry(1.0, 20, 20);
        const pinMat = new THREE.MeshStandardMaterial({
            color: pinColor,
            emissive: pinColor,
            emissiveIntensity: isAlert ? 1.0 : 0.6,
            roughness: 0.2
        });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        const targetY = (cam.pos_y || 2) + 3;
        pinMesh.position.set(cam.pos_x || 0, targetY, cam.pos_z || 0);
        pinMesh.userData = Object.assign({}, cam, { isAlert });
        scene.add(pinMesh);

        // Surrounding Pulsing Ring for Alerts (in pinMesh local coordinates)
        if (isAlert) {
            const ringGeo = new THREE.RingGeometry(1.4, 1.8, 24);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0xf43f5e,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.set(0, 0, 0);
            pinMesh.add(ring);
            pinMesh.alertRing = ring;
        }

        // Laser Guide Beam to Ground
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(cam.pos_x || 0, 0, cam.pos_z || 0),
            new THREE.Vector3(cam.pos_x || 0, targetY, cam.pos_z || 0)
        ]);
        const lineMat = new THREE.LineBasicMaterial({
            color: pinColor,
            transparent: true,
            opacity: isAlert ? 0.9 : 0.4,
            linewidth: isAlert ? 2 : 1
        });
        const line = new THREE.Line(lineGeo, lineMat);
        scene.add(line);

        cameraNodes.push(pinMesh);
    });
}

/**
 * Mouse Hover Tooltip Interaction
 */
function onMouseMove(event) {
    const container = document.getElementById('campus3DContainer');
    if (!container || !tooltipElement) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cameraNodes);

    if (intersects.length > 0) {
        container.style.cursor = 'pointer';
        const cam = intersects[0].object.userData;
        const statusBadge = cam.isAlert
            ? '<span style="color: #f43f5e; font-weight: 700;">[THREAT DETECTED]</span>'
            : '<span style="color: #10b981; font-weight: 700;">[SECURE]</span>';

        tooltipElement.innerHTML = `
            <div style="font-weight: 700; margin-bottom: 2px;">${cam.camera_id}: ${cam.name}</div>
            <div style="color: #94a3b8; font-size: 0.75rem;">Dept: ${cam.department} &bull; ${cam.class_section}</div>
            <div style="color: #cbd5e1; font-size: 0.75rem; margin-top: 4px;">Status: ${statusBadge} &bull; Click to View Feed</div>
        `;
        tooltipElement.style.display = 'block';
        tooltipElement.style.left = `${event.clientX - rect.left + 15}px`;
        tooltipElement.style.top = `${event.clientY - rect.top + 15}px`;
    } else {
        container.style.cursor = 'default';
        tooltipElement.style.display = 'none';
    }
}

/**
 * Click to Open Live Camera Feed Modal
 */
function onCameraPinClick(event) {
    const container = document.getElementById('campus3DContainer');
    if (!container) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / container.clientWidth) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / container.clientHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(cameraNodes);

    if (intersects.length > 0) {
        const camData = intersects[0].object.userData;
        open3DCameraModal(camData);
    }
}

function close3DCameraModal() {
    const modal = document.getElementById('cameraStreamModal3D');
    if (modal) {
        const img = modal.querySelector('img');
        if (img) img.src = '';
        modal.remove();
    }
}

function open3DCameraModal(cam) {
    close3DCameraModal();

    const modal = document.createElement('div');
    modal.id = 'cameraStreamModal3D';
    modal.className = 'alert-modal-backdrop';
    modal.innerHTML = `
        <div class="alert-modal-box" style="border-color: var(--color-primary); max-width: 620px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                <h3 style="color: #fff; display: flex; align-items: center; gap: 0.5rem; font-size: 1.1rem;">
                    <i class="bi bi-camera-video-fill" style="color: var(--color-primary);"></i>
                    Live Camera Feed: ${cam.camera_id} (${cam.name})
                </h3>
                <button onclick="close3DCameraModal()" class="btn btn-secondary" style="padding: 0.2rem 0.6rem;">&times;</button>
            </div>
            <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 1rem;">
                Department: <strong>${cam.department}</strong> &bull; Section: <strong>${cam.class_section}</strong> &bull; Location: ${cam.location}
            </p>
            <div style="aspect-ratio: 16/9; background: #000; border-radius: 8px; overflow: hidden; margin-bottom: 1.5rem; border: 1px solid var(--glass-border); position: relative;">
                <img src="/video_feed/${cam.camera_id}" alt="Live Stream" style="width: 100%; height: 100%; object-fit: cover;">
                <div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); padding: 4px 8px; border-radius: 4px; font-size: 0.75rem; color: #10b981;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; margin-right: 4px;"></span> LIVE AI INFERENCE
                </div>
            </div>
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button onclick="triggerDemoAlert('${cam.camera_id}')" class="btn btn-danger">Simulate AI Alert</button>
                <button onclick="close3DCameraModal()" class="btn btn-secondary">Close Stream</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Camera View Navigation Presets
 */
window.flyToPreset = function(preset) {
    if (!controls) return;

    let targetPos, lookAt;
    switch (preset) {
        case 'overview':
            targetPos = { x: 0, y: 55, z: 68 };
            lookAt = { x: 0, y: 2, z: 0 };
            break;
        case 'admin':
            targetPos = { x: 0, y: 16, z: 22 };
            lookAt = { x: 0, y: 4, z: -3 };
            break;
        case 'aids':
            targetPos = { x: -19, y: 20, z: 32 };
            lookAt = { x: -19, y: 5, z: 10 };
            break;
        case 'cse':
            targetPos = { x: -10, y: 18, z: 6 };
            lookAt = { x: -10, y: 4, z: -15 };
            break;
        case 'ece_eee':
            targetPos = { x: 26, y: 22, z: 22 };
            lookAt = { x: 16, y: 5, z: 0 };
            break;
        case 'me':
            targetPos = { x: 6, y: 16, z: 42 };
            lookAt = { x: 6, y: 4, z: 22 };
            break;
        default:
            targetPos = { x: 0, y: 52, z: 68 };
            lookAt = { x: 0, y: 2, z: 0 };
    }

    animationTarget = {
        camStart: camera.position.clone(),
        camEnd: new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z),
        targetStart: controls ? controls.target.clone() : new THREE.Vector3(0, 2, 0),
        targetEnd: new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z),
        startTime: performance.now(),
        duration: 900 // ms
    };
};

/**
 * Main Animation Loop
 */
function animate() {
    requestAnimationFrame(animate);

    // Smooth Camera Fly-to Animation
    if (animationTarget) {
        const now = performance.now();
        const progress = Math.min((now - animationTarget.startTime) / animationTarget.duration, 1.0);
        const ease = 0.5 - Math.cos(progress * Math.PI) / 2; // Ease in-out

        camera.position.lerpVectors(animationTarget.camStart, animationTarget.camEnd, ease);
        if (controls) {
            controls.target.lerpVectors(animationTarget.targetStart, animationTarget.targetEnd, ease);
        }

        if (progress >= 1.0) {
            animationTarget = null;
        }
    }

    if (controls) controls.update();

    // Pulse Alert Camera Nodes
    const time = Date.now() * 0.006;
    cameraNodes.forEach(mesh => {
        if (mesh.userData && mesh.userData.isAlert) {
            mesh.scale.setScalar(1 + Math.sin(time) * 0.28);
            if (mesh.alertRing) {
                mesh.alertRing.scale.setScalar(1 + Math.sin(time * 1.5) * 0.2);
            }
        }
    });

    renderer.render(scene, camera);
}
