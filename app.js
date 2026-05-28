(() => {
  const canvas = document.querySelector("#game");
  const startScreen = document.querySelector("#start-screen");
  const startButton = document.querySelector("#start-button");
  let startTitle = startScreen.querySelector("h1");
  let startCopy = startScreen.querySelector("p");
  let flyToggle = document.querySelector("#fly-toggle");
  const fpsLabel = document.querySelector("#fps");
  const countLabel = document.querySelector("#count");
  const modeLabel = document.querySelector("#mode");
  let selectedLabel = document.querySelector("#selected");
  let hotbar = document.querySelector("#hotbar");
  let inventory = document.querySelector("#inventory");
  let inventoryGrid = document.querySelector("#inventory-grid");
  let inventoryClose = document.querySelector("#inventory-close");
  let slots = [];
  let inventoryButtons = [];

  if (!window.THREE) {
    startScreen.querySelector("p").textContent = "Khong tai duoc Three.js.";
    startButton.disabled = true;
    startButton.textContent = "Loi Three.js";
    return;
  }

  ensureInventoryMarkup();

  const THREE = window.THREE;
  const CHUNK_SIZE = 16;
  const RENDER_DISTANCE = 3;
  const UNLOAD_DISTANCE = RENDER_DISTANCE + 1;
  const HOTBAR_SIZE = 9;
  const WORLD_MIN_Y = -30;
  const WORLD_MAX_Y = 44;
  const VOID_Y = -66;
  const SEA_LEVEL = 3;
  const REACH = 9;
  const LOOK_SPEED = 0.0022;
  const WALK_SPEED = 5.2;
  const SPRINT_SPEED = 7.4;
  const FLY_SPEED = 8.8;
  const FLY_VERTICAL_SPEED = 7.6;
  const PLAYER_HEIGHT = 2;
  const EYE_HEIGHT = 1.72;
  const PLAYER_RADIUS = 0.35;
  const STEP_HEIGHT = 1.05;
  const GRAVITY = 22;
  const JUMP_SPEED = 8;
  const SPAWN_X = 0;
  const SPAWN_Z = 10;
  const SPAWN_PAD_Y = 8;
  const SPAWN_PAD_RADIUS = 9;
  const SPAWN_PAD_FADE = 16;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x86ceff);
  scene.fog = new THREE.Fog(0x86ceff, 55, 145);

  const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 220);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1);

  const world = new THREE.Group();
  scene.add(world);
  scene.add(new THREE.HemisphereLight(0xe8f7ff, 0x3e5f38, 1.28));

  const sun = new THREE.DirectionalLight(0xffffff, 1.75);
  sun.position.set(24, 38, 18);
  scene.add(sun);

  const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
  const chunkMaterial = new THREE.MeshLambertMaterial({
    vertexColors: true,
    
  });
  const waterMaterial = new THREE.MeshLambertMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
  });

  const blockCatalog = [
    { type: "grass", name: "Grass", color: 0x4caf3d, swatch: "linear-gradient(#5eb83f 0 44%, #805025 44%)" },
    { type: "dirt", name: "Dirt", color: 0x815129, swatch: "#815129" },
    { type: "stone", name: "Stone", color: 0x92999f, swatch: "#92999f" },
    { type: "sand", name: "Sand", color: 0xd8bf72, swatch: "#d8bf72" },
    { type: "wood", name: "Log", color: 0x9b612e, swatch: "repeating-linear-gradient(90deg, #a26733 0 7px, #70401c 7px 12px)" },
    { type: "planks", name: "Planks", color: 0xb98546, swatch: "repeating-linear-gradient(0deg, #c8914f 0 8px, #9a612d 8px 10px)" },
    { type: "leaves", name: "Leaves", color: 0x348339, swatch: "#348339" },
    { type: "cobble", name: "Cobble", color: 0x6f767c, swatch: "linear-gradient(135deg, #555b60 0 35%, #80888f 35% 64%, #666d73 64%)" },
    { type: "brick", name: "Brick", color: 0xa64f3d, swatch: "repeating-linear-gradient(0deg, #a64f3d 0 10px, #6d2f27 10px 12px)" },
    { type: "glass", name: "Glass", color: 0x9fdff2, swatch: "linear-gradient(135deg, rgba(188,244,255,0.75), rgba(69,153,207,0.7))" },
    { type: "coal", name: "Coal", color: 0x24282d, swatch: "#24282d" },
    { type: "iron", name: "Iron", color: 0xc6c9c7, swatch: "linear-gradient(135deg, #f0f1ee, #909794)" },
    { type: "gold", name: "Gold", color: 0xf4c542, swatch: "linear-gradient(135deg, #fff06b, #ca8b1c)" },
    { type: "diamond", name: "Diamond", color: 0x56d8ee, swatch: "linear-gradient(135deg, #9af8ff, #20a4c0)" },
    { type: "emerald", name: "Emerald", color: 0x36c56b, swatch: "linear-gradient(135deg, #68f39a, #168d45)" },
    { type: "clay", name: "Clay", color: 0x8b9aac, swatch: "#8b9aac" },
    { type: "snow", name: "Snow", color: 0xf3f8fb, swatch: "#f3f8fb" },
    { type: "obsidian", name: "Obsidian", color: 0x251b36, swatch: "linear-gradient(135deg, #100b1f, #3b2856)" },
    { type: "netherrack", name: "Nether", color: 0x8b2b2b, swatch: "linear-gradient(135deg, #5c151a, #b33f31)" },
    { type: "glowstone", name: "Glow", color: 0xf2d070, swatch: "linear-gradient(135deg, #fff3a4, #c88735)" },
    { type: "quartz", name: "Quartz", color: 0xe7dfd2, swatch: "#e7dfd2" },
    { type: "tile", name: "Tile", color: 0x5f6976, swatch: "repeating-linear-gradient(45deg, #48525f 0 8px, #737d8a 8px 10px)" },
    { type: "white", name: "White", color: 0xf4f4f0, swatch: "#f4f4f0" },
    { type: "black", name: "Black", color: 0x1f2226, swatch: "#1f2226" },
    { type: "red", name: "Red", color: 0xbb3a35, swatch: "#bb3a35" },
    { type: "blue", name: "Blue", color: 0x3f62c8, swatch: "#3f62c8" },
    { type: "green", name: "Green", color: 0x3b9654, swatch: "#3b9654" },
    { type: "yellow", name: "Yellow", color: 0xe4c638, swatch: "#e4c638" },
    { type: "water", name: "Water", color: 0x3f9ee3, swatch: "#3f9ee3", buildable: false },
  ];
  const blockByType = new Map(blockCatalog.map((block) => [block.type, block]));
  const inventoryBlocks = blockCatalog.filter((block) => block.buildable !== false);
  const blockColors = Object.fromEntries(blockCatalog.map((block) => [block.type, new THREE.Color(block.color)]));

  const faceDefs = [
    { normal: [1, 0, 0], corners: [[0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [0.5, -0.5, 0.5]], shade: 0.82 },
    { normal: [-1, 0, 0], corners: [[-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-0.5, -0.5, -0.5]], shade: 0.72 },
    { normal: [0, 1, 0], corners: [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]], shade: 1 },
    { normal: [0, -1, 0], corners: [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]], shade: 0.58 },
    { normal: [0, 0, 1], corners: [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]], shade: 0.9 },
    { normal: [0, 0, -1], corners: [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]], shade: 0.66 },
  ];

  const chunks = new Map();
  const blocks = new Map();
  const edits = new Map();
  const rayTargets = [];
  const dirtyChunks = new Set();

  const raycaster = new THREE.Raycaster();
  const cameraDir = new THREE.Vector3();
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const desiredVelocity = new THREE.Vector3();
  const lookTarget = new THREE.Vector3();
  const placeNormal = new THREE.Vector3();
  const blockBox = new THREE.Box3();
  const playerBox = new THREE.Box3();

  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(blockGeometry),
    new THREE.LineBasicMaterial({ color: 0xfff1b5 }),
  );
  outline.scale.setScalar(1.012);
  outline.visible = false;
  scene.add(outline);

  const player = {
    position: new THREE.Vector3(SPAWN_X, 12, SPAWN_Z),
    velocity: new THREE.Vector3(),
    yaw: Math.PI,
    pitch: -0.42,
    grounded: false,
  };

  const keys = new Set();
  let hasStarted = false;
  let playing = false;
  let pointerLocked = false;
  let inventoryOpen = false;
  let creativeFly = false;
  let ignoreMouseUntil = 0;
  let selectedSlot = 0;
  let selectedType = "grass";
  const hotbarItems = ["grass", "dirt", "stone", "sand", "wood", "planks", "leaves", "cobble", "brick"];
  let hovered = null;
  let lastTime = performance.now();
  let frames = 0;
  let fpsTime = performance.now();
  let chunkCheckTime = 0;

  renderHotbar();
  renderInventory();
  selectHotbarSlot(0);
  syncUiState();
  updateChunkLoading(true, SPAWN_X, SPAWN_Z);
  rebuildDirtyChunks(9999);
  spawnPlayer();
  resize();
  updateCamera();
  requestAnimationFrame(loop);

  startButton.addEventListener("click", startPlaying);
  canvas.addEventListener("click", () => {
    if (!pointerLocked && !inventoryOpen) startPlaying();
  });
  flyToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    creativeFly = !creativeFly;
    syncUiState();
  });
  inventoryClose.addEventListener("click", () => closeInventory(true));

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
    syncUiState();
    ignoreMouseUntil = performance.now() + 250;
  });

  document.addEventListener("mousemove", (event) => {
    if (!pointerLocked || inventoryOpen || performance.now() < ignoreMouseUntil) return;
    player.yaw -= event.movementX * LOOK_SPEED;
    player.pitch -= event.movementY * LOOK_SPEED;
    player.pitch = THREE.MathUtils.clamp(player.pitch, -1.3, 1.3);
  });

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (event.code === "KeyE" && hasStarted) {
      if (inventoryOpen) closeInventory(true);
      else openInventory();
      event.preventDefault();
      return;
    }

    if (event.code === "Escape" && inventoryOpen) {
      closeInventory(false);
      event.preventDefault();
      return;
    }

    if (inventoryOpen) return;

    keys.add(key);

    if (/^Digit[1-9]$/.test(event.code)) {
      selectHotbarSlot(Number(event.code.slice(5)) - 1);
    }

    if (!creativeFly && event.code === "Space" && player.grounded) {
      player.velocity.y = JUMP_SPEED;
      player.grounded = false;
    }

    if (["KeyW", "KeyA", "KeyS", "KeyD", "Space", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight"].includes(event.code)) {
      event.preventDefault();
    }
  });

  document.addEventListener("keyup", (event) => {
    keys.delete(event.key.toLowerCase());
  });

  document.addEventListener("mousedown", (event) => {
    if (!playing || inventoryOpen) return;
    if (event.button === 0) removeHoveredBlock();
    if (event.button === 2) placeBlock();
  });

  document.addEventListener("contextmenu", (event) => event.preventDefault());
  window.addEventListener("resize", resize);

  function ensureInventoryMarkup() {
    const app = document.querySelector("#app") || document.body;

    if (!startTitle) {
      startTitle = document.createElement("h1");
      startTitle.textContent = "BlockCraft Survival";
      startScreen.prepend(startTitle);
    }

    if (!startCopy) {
      startCopy = document.createElement("p");
      startCopy.textContent = "Co san spawn phang, hang sau, ore duoi dat va void o cuc sau.";
      startTitle.after(startCopy);
    }

    if (!flyToggle) {
      let actions = startScreen.querySelector(".panel-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "panel-actions";
        startButton.before(actions);
        actions.append(startButton);
      }

      flyToggle = document.createElement("button");
      flyToggle.id = "fly-toggle";
      flyToggle.className = "secondary-button hidden";
      flyToggle.type = "button";
      flyToggle.textContent = "Creative Fly: OFF";
      actions.append(flyToggle);
    }

    if (!selectedLabel && countLabel?.parentElement) {
      selectedLabel = document.createElement("span");
      selectedLabel.id = "selected";
      countLabel.parentElement.append(selectedLabel);
    }

    if (!hotbar) {
      hotbar = document.createElement("div");
      hotbar.id = "hotbar";
      hotbar.setAttribute("aria-label", "Chon block");
      app.append(hotbar);
    }

    if (!inventory) {
      inventory = document.createElement("section");
      inventory.id = "inventory";
      inventory.className = "inventory hidden";
      inventory.setAttribute("aria-label", "Inventory");
      inventory.innerHTML = `
        <div class="inventory-panel">
          <div class="inventory-head">
            <h2>Inventory</h2>
            <button id="inventory-close" type="button">Dong</button>
          </div>
          <div id="inventory-grid"></div>
        </div>
      `;
      app.append(inventory);
    }

    inventoryGrid = inventory.querySelector("#inventory-grid");
    inventoryClose = inventory.querySelector("#inventory-close");
  }

  function startPlaying() {
    hasStarted = true;
    lockPointer();
    syncUiState();
  }

  function lockPointer() {
    if (canvas.requestPointerLock) canvas.requestPointerLock();
  }

  function openInventory() {
    inventoryOpen = true;
    keys.clear();
    if (document.pointerLockElement === canvas && document.exitPointerLock) {
      document.exitPointerLock();
    }
    syncUiState();
  }

  function closeInventory(tryLockPointer) {
    inventoryOpen = false;
    syncUiState();
    if (tryLockPointer) lockPointer();
  }

  function syncUiState() {
    playing = pointerLocked && !inventoryOpen;
    modeLabel.textContent = inventoryOpen
      ? "Inventory"
      : pointerLocked
        ? creativeFly ? "Creative Fly" : "Survival"
        : hasStarted ? "Paused" : "Survival";

    startTitle.textContent = hasStarted ? "Paused" : "BlockCraft Survival";
    startCopy.textContent = hasStarted
      ? creativeFly
        ? "Creative Fly dang bat. Space bay len, Ctrl ha xuong, van pha/dat block binh thuong."
        : "Nhan tiep tuc de quay lai game. Bat Creative Fly neu chi muon bay."
      : "Co san spawn phang, hang sau, ore duoi dat va void o cuc sau.";
    startButton.textContent = hasStarted ? "Tiep tuc" : "Bat dau";
    flyToggle.textContent = creativeFly ? "Creative Fly: ON" : "Creative Fly: OFF";
    flyToggle.classList.toggle("active", creativeFly);
    flyToggle.classList.toggle("hidden", !hasStarted);

    startScreen.classList.toggle("hidden", pointerLocked || inventoryOpen);
    inventory.classList.toggle("hidden", !inventoryOpen);
    document.body.classList.toggle("inventory-open", inventoryOpen);
  }

  function updateChunkLoading(force = false, centerX = player.position.x, centerZ = player.position.z) {
    const now = performance.now();
    if (!force && now - chunkCheckTime < 180) return;
    chunkCheckTime = now;

    const centerChunkX = worldToChunk(centerX);
    const centerChunkZ = worldToChunk(centerZ);

    for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz += 1) {
      for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx += 1) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        const key = chunkKey(chunkX, chunkZ);
        if (!chunks.has(key)) loadChunk(chunkX, chunkZ);
      }
    }

    for (const [key, chunk] of chunks) {
      if (
        Math.abs(chunk.cx - centerChunkX) > UNLOAD_DISTANCE ||
        Math.abs(chunk.cz - centerChunkZ) > UNLOAD_DISTANCE
      ) {
        unloadChunk(key, chunk);
      }
    }

    updateHud();
  }

  function loadChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    const chunk = { key, cx, cz, blocks: new Map(), mesh: null, waterMesh: null };

    chunks.set(key, chunk);
    generateChunkBlocks(chunk);

    for (const [blockKey, type] of chunk.blocks) {
      blocks.set(blockKey, type);
    }

    markChunkDirty(cx, cz);
    markChunkNeighborsDirty(cx, cz);
  }

  function unloadChunk(key, chunk) {
    removeChunkMesh(chunk, "mesh");
    removeChunkMesh(chunk, "waterMesh");

    for (const blockKey of chunk.blocks.keys()) {
      blocks.delete(blockKey);
    }

    chunks.delete(key);
    dirtyChunks.delete(key);
    markChunkNeighborsDirty(chunk.cx, chunk.cz);
  }

  function generateChunkBlocks(chunk) {
    const minX = chunk.cx * CHUNK_SIZE;
    const minZ = chunk.cz * CHUNK_SIZE;
    const maxX = minX + CHUNK_SIZE - 1;
    const maxZ = minZ + CHUNK_SIZE - 1;

    for (let x = minX; x <= maxX; x += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        const height = terrainHeight(x, z);

        for (let y = WORLD_MIN_Y; y <= height; y += 1) {
          if (isCaveAir(x, y, z, height)) continue;
          addGeneratedBlock(chunk, x, y, z, terrainTypeAt(x, y, z, height));
        }

        if (height < SEA_LEVEL) {
          for (let y = height + 1; y <= SEA_LEVEL; y += 1) {
            addGeneratedBlock(chunk, x, y, z, "water");
          }
        }
      }
    }

    for (let x = minX - 3; x <= maxX + 3; x += 1) {
      for (let z = minZ - 3; z <= maxZ + 3; z += 1) {
        if (shouldPlaceTree(x, z)) addTreeToChunk(chunk, x, terrainHeight(x, z) + 1, z);
      }
    }

    for (const [blockKey, type] of edits) {
      const [x, y, z] = parseKey(blockKey);
      if (worldToChunk(x) !== chunk.cx || worldToChunk(z) !== chunk.cz) continue;
      if (type === null) chunk.blocks.delete(blockKey);
      else chunk.blocks.set(blockKey, type);
    }
  }

  function terrainTypeAt(x, y, z, height) {
    if (y <= WORLD_MIN_Y + 1) return "obsidian";
    if (y === height) return height <= SEA_LEVEL + 1 ? "sand" : "grass";
    if (y > height - 3) return height <= SEA_LEVEL + 1 ? "sand" : "dirt";
    if (y < height - 6) {
      const ore = oreTypeAt(x, y, z);
      if (ore) return ore;
    }
    if (y < -24 && hash("deep-cobble", x + y, z) > 0.74) return "cobble";
    return "stone";
  }

  function addGeneratedBlock(chunk, x, y, z, type) {
    if (!isInsideChunk(chunk, x, z) || y < WORLD_MIN_Y || y > WORLD_MAX_Y) return;
    const key = keyFor(x, y, z);
    if (!chunk.blocks.has(key) || chunk.blocks.get(key) === "water") chunk.blocks.set(key, type);
  }

  function addTreeToChunk(chunk, x, y, z) {
    const treeHeight = 4 + Math.floor(hash("tree-height", x, z) * 3);

    for (let i = 0; i < treeHeight; i += 1) {
      addGeneratedBlock(chunk, x, y + i, z, "wood");
    }

    const topY = y + treeHeight - 1;
    for (let dx = -2; dx <= 2; dx += 1) {
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dz = -2; dz <= 2; dz += 1) {
          const distance = Math.abs(dx) + Math.abs(dz) + Math.max(0, dy) * 0.85;
          const leafY = topY + dy;
          if (distance > 4 || hash("leaf", x + dx, z + dz + dy) < 0.16) continue;

          const key = keyFor(x + dx, leafY, z + dz);
          if (!isInsideChunk(chunk, x + dx, z + dz) || leafY < WORLD_MIN_Y || leafY > WORLD_MAX_Y) continue;
          if (!chunk.blocks.has(key) || chunk.blocks.get(key) === "water") {
            chunk.blocks.set(key, "leaves");
          }
        }
      }
    }
  }

  function shouldPlaceTree(x, z) {
    if (Math.hypot(x - SPAWN_X, z - SPAWN_Z) < SPAWN_PAD_FADE) return false;
    const height = terrainHeight(x, z);
    if (height <= SEA_LEVEL + 1) return false;
    const forestNoise = valueNoise("forest", x, z, 38);
    return forestNoise > -0.15 && hash("tree", x, z) > 0.972;
  }

  function isCaveAir(x, y, z, height) {
    if (y <= WORLD_MIN_Y + 3) return false;
    if (y > height - 5 || y > 2) return false;

    const spawnDistance = Math.hypot(x - SPAWN_X, z - SPAWN_Z);
    if (spawnDistance < SPAWN_PAD_RADIUS + 2 && y > -18) return false;

    const depth = THREE.MathUtils.clamp((height - y - 8) / 34, 0, 1);
    const room = valueNoise3("cave-room", x, y, z, 24);
    const tunnel = valueNoise3("cave-tunnel", x * 1.2, y * 1.35, z * 1.2, 13);
    const crack = Math.abs(valueNoise3("cave-crack", x, y * 1.6, z, 9));

    const wideRoom = room + tunnel * 0.45 > 0.58 - depth * 0.25;
    const longTunnel = crack < 0.18 + depth * 0.08 && room > -0.2;
    return wideRoom || longTunnel;
  }

  function oreTypeAt(x, y, z) {
    const vein = hash("ore", x + y * 3, z - y * 5);
    if (y < -30 && vein > 0.996) return "diamond";
    if (y < -26 && vein > 0.992) return "emerald";
    if (y < -20 && vein > 0.986) return "gold";
    if (y < -10 && vein > 0.974) return "iron";
    if (y < 2 && vein > 0.958) return "coal";
    return null;
  }

  function rebuildDirtyChunks(limit) {
    let rebuilt = 0;

    for (const key of [...dirtyChunks]) {
      const chunk = chunks.get(key);
      dirtyChunks.delete(key);
      if (!chunk) continue;

      rebuildChunkMesh(chunk);
      rebuilt += 1;
      if (rebuilt >= limit) break;
    }

    if (rebuilt > 0) updateHud();
  }

  function rebuildChunkMesh(chunk) {
    removeChunkMesh(chunk, "mesh");
    removeChunkMesh(chunk, "waterMesh");

    const solid = createGeometryStore();
    const water = createGeometryStore();

    for (const [blockKey, type] of chunk.blocks) {
      const [x, y, z] = parseKey(blockKey);
      const store = type === "water" ? water : solid;

      for (const face of faceDefs) {
        const nx = x + face.normal[0];
        const ny = y + face.normal[1];
        const nz = z + face.normal[2];
        const neighborType = getBlock(nx, ny, nz);
        const visible = type === "water" ? neighborType !== "water" : !isSolidType(neighborType);
        if (visible) appendFace(store, x, y, z, type, face);
      }
    }

    chunk.mesh = createChunkMesh(solid, chunkMaterial, true);
    chunk.waterMesh = createChunkMesh(water, waterMaterial, false);

    if (chunk.mesh) world.add(chunk.mesh);
    if (chunk.waterMesh) world.add(chunk.waterMesh);
  }

  function createGeometryStore() {
    return { positions: [], normals: [], colors: [], faceBlocks: [] };
  }

  function appendFace(store, x, y, z, type, face) {
    const color = blockColors[type] || blockColors.grass;
    const indices = [0, 1, 2, 0, 2, 3];
    const normalInfo = { x: face.normal[0], y: face.normal[1], z: face.normal[2] };
    const faceInfo = { key: keyFor(x, y, z), x, y, z, normal: normalInfo };

    for (const index of indices) {
      const corner = face.corners[index];
      store.positions.push(x + corner[0], y + corner[1], z + corner[2]);
      store.normals.push(face.normal[0], face.normal[1], face.normal[2]);
      store.colors.push(color.r * face.shade, color.g * face.shade, color.b * face.shade);
    }

    store.faceBlocks.push(faceInfo, faceInfo);
  }

  function createChunkMesh(store, material, raycastable) {
    if (store.positions.length === 0) return null;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(store.positions, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(store.normals, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(store.colors, 3));
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.faceBlocks = store.faceBlocks;
    if (raycastable) rayTargets.push(mesh);
    return mesh;
  }

  function removeChunkMesh(chunk, property) {
    const mesh = chunk[property];
    if (!mesh) return;

    world.remove(mesh);
    const targetIndex = rayTargets.indexOf(mesh);
    if (targetIndex >= 0) rayTargets.splice(targetIndex, 1);
    mesh.geometry.dispose();
    chunk[property] = null;
  }

  function markChunkDirty(cx, cz) {
    const key = chunkKey(cx, cz);
    if (chunks.has(key)) dirtyChunks.add(key);
  }

  function markChunkNeighborsDirty(cx, cz) {
    markChunkDirty(cx - 1, cz);
    markChunkDirty(cx + 1, cz);
    markChunkDirty(cx, cz - 1);
    markChunkDirty(cx, cz + 1);
  }

  function markBlockAreaDirty(x, z) {
    markChunkDirty(worldToChunk(x), worldToChunk(z));
    markChunkDirty(worldToChunk(x - 1), worldToChunk(z));
    markChunkDirty(worldToChunk(x + 1), worldToChunk(z));
    markChunkDirty(worldToChunk(x), worldToChunk(z - 1));
    markChunkDirty(worldToChunk(x), worldToChunk(z + 1));
  }

  function addBlock(x, y, z, type) {
    const key = keyFor(x, y, z);
    if (blocks.has(key) || y < WORLD_MIN_Y || y > WORLD_MAX_Y) return false;

    const chunk = chunks.get(chunkKey(worldToChunk(x), worldToChunk(z)));
    if (!chunk) return false;

    chunk.blocks.set(key, type);
    blocks.set(key, type);
    edits.set(key, type);
    markBlockAreaDirty(x, z);
    updateHud();
    return true;
  }

  function removeBlock(key) {
    const type = blocks.get(key);
    if (!type || type === "water") return;

    const [x, y, z] = parseKey(key);
    const chunk = chunks.get(chunkKey(worldToChunk(x), worldToChunk(z)));
    if (!chunk) return;

    chunk.blocks.delete(key);
    blocks.delete(key);
    edits.set(key, null);
    markBlockAreaDirty(x, z);
    updateHud();
  }

  function removeHoveredBlock() {
    if (hovered) removeBlock(hovered.key);
  }

  function placeBlock() {
    if (!hovered) return;

    placeNormal.set(hovered.normal.x, hovered.normal.y, hovered.normal.z);
    const x = hovered.x + placeNormal.x;
    const y = hovered.y + placeNormal.y;
    const z = hovered.z + placeNormal.z;

    if (wouldBlockPlayer(x, y, z)) return;
    addBlock(x, y, z, selectedType);
  }

  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    updateChunkLoading(false);
    rebuildDirtyChunks(1);
    updateMovement(dt);
    updateCamera();
    updateTarget();
    renderer.render(scene, camera);
    updateFps(now);
    requestAnimationFrame(loop);
  }

  function updateMovement(dt) {
    if (!playing) {
      player.velocity.set(0, 0, 0);
      return;
    }

    forward.set(Math.sin(player.yaw), 0, Math.cos(player.yaw)).normalize();
    right.set(-Math.cos(player.yaw), 0, Math.sin(player.yaw)).normalize();

    move.set(0, 0, 0);
    if (keys.has("w") || keys.has("arrowup")) move.add(forward);
    if (keys.has("s") || keys.has("arrowdown")) move.sub(forward);
    if (keys.has("d") || keys.has("arrowright")) move.add(right);
    if (keys.has("a") || keys.has("arrowleft")) move.sub(right);
    if (move.lengthSq() > 0) move.normalize();

    const moveSpeed = creativeFly ? FLY_SPEED : keys.has("shift") ? SPRINT_SPEED : WALK_SPEED;
    desiredVelocity.copy(move).multiplyScalar(moveSpeed);

    if (creativeFly) {
      if (keys.has(" ")) desiredVelocity.y += FLY_VERTICAL_SPEED;
      if (keys.has("control")) desiredVelocity.y -= FLY_VERTICAL_SPEED;

      const flyBlend = 1 - Math.exp(-16 * dt);
      player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, desiredVelocity.x, flyBlend);
      player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, desiredVelocity.z, flyBlend);
      player.velocity.y = THREE.MathUtils.lerp(player.velocity.y, desiredVelocity.y, flyBlend);

      const oldX = player.position.x;
      const oldZ = player.position.z;
      const oldY = player.position.y;
      const oldFootY = player.position.y - EYE_HEIGHT;

      player.position.x += player.velocity.x * dt;
      player.position.z += player.velocity.z * dt;
      if (!bodyClearAt(player.position.x, player.position.z, oldFootY)) {
        player.position.x = oldX;
        player.position.z = oldZ;
        player.velocity.x = 0;
        player.velocity.z = 0;
      }

      player.position.y += player.velocity.y * dt;
      if (!bodyClearAt(player.position.x, player.position.z, player.position.y - EYE_HEIGHT)) {
        player.position.y = oldY;
        player.velocity.y = 0;
      }

      player.grounded = false;
      if (player.position.y < VOID_Y) {
        updateChunkLoading(true, SPAWN_X, SPAWN_Z);
        rebuildDirtyChunks(9999);
        spawnPlayer();
      }
      return;
    }

    const blend = 1 - Math.exp(-18 * dt);
    player.velocity.x = THREE.MathUtils.lerp(player.velocity.x, desiredVelocity.x, blend);
    player.velocity.z = THREE.MathUtils.lerp(player.velocity.z, desiredVelocity.z, blend);
    player.velocity.y = Math.max(player.velocity.y - GRAVITY * dt, -30);

    const oldX = player.position.x;
    const oldZ = player.position.z;
    const oldY = player.position.y;
    const oldFootY = player.position.y - EYE_HEIGHT;

    player.position.x += player.velocity.x * dt;
    player.position.z += player.velocity.z * dt;

    if (!canStandAt(player.position.x, player.position.z, oldFootY + STEP_HEIGHT)) {
      player.position.x = oldX;
      player.position.z = oldZ;
      player.velocity.x = 0;
      player.velocity.z = 0;
    }

    player.position.y += player.velocity.y * dt;

    if (player.velocity.y > 0 && !bodyClearAt(player.position.x, player.position.z, player.position.y - EYE_HEIGHT)) {
      player.position.y = oldY;
      player.velocity.y = 0;
    }

    const groundY = groundAt(player.position.x, player.position.z, player.position.y - EYE_HEIGHT + STEP_HEIGHT);
    if (player.position.y <= groundY + EYE_HEIGHT && player.velocity.y <= 0) {
      player.position.y = groundY + EYE_HEIGHT;
      player.velocity.y = 0;
      player.grounded = true;
    } else {
      player.grounded = false;
    }

    if (player.position.y < VOID_Y) {
      updateChunkLoading(true, SPAWN_X, SPAWN_Z);
      rebuildDirtyChunks(9999);
      spawnPlayer();
    }
  }

  function groundAt(x, z, maxTop = Infinity) {
    let top = -Infinity;
    const samples = footSamples(x, z);

    for (const sample of samples) {
      top = Math.max(top, columnTop(sample.x, sample.z, maxTop));
    }

    return top;
  }

  function canStandAt(x, z, maxStepTop) {
    const samples = footSamples(x, z);

    for (const sample of samples) {
      const ground = columnTop(sample.x, sample.z, maxStepTop);
      if (ground === -Infinity || !hasBodyClearance(sample.x, sample.z, ground)) return false;
    }

    return true;
  }

  function bodyClearAt(x, z, footY) {
    const samples = footSamples(x, z);

    for (const sample of samples) {
      if (!hasBodyClearance(sample.x, sample.z, footY)) return false;
    }

    return true;
  }

  function footSamples(x, z) {
    return [
      { x, z },
      { x: x + PLAYER_RADIUS, z },
      { x: x - PLAYER_RADIUS, z },
      { x, z: z + PLAYER_RADIUS },
      { x, z: z - PLAYER_RADIUS },
    ];
  }

  function columnTop(x, z, maxTop = Infinity) {
    const ix = Math.round(x);
    const iz = Math.round(z);

    for (let y = WORLD_MAX_Y; y >= WORLD_MIN_Y - 2; y -= 1) {
      const type = getBlock(ix, y, iz);
      const top = y + 0.5;
      if (isSolidType(type) && top <= maxTop + 0.001) return top;
    }

    const fallback = terrainHeight(ix, iz) + 0.5;
    return fallback <= maxTop + 0.001 ? fallback : -Infinity;
  }

  function hasBodyClearance(x, z, footY) {
    const ix = Math.round(x);
    const iz = Math.round(z);
    const minY = Math.floor(footY - 0.5);
    const maxY = Math.ceil(footY + PLAYER_HEIGHT + 0.5);

    for (let y = minY; y <= maxY; y += 1) {
      const type = getBlock(ix, y, iz);
      if (!isSolidType(type)) continue;

      const blockBottom = y - 0.5;
      const blockTop = y + 0.5;
      const hitsBody = blockTop > footY + 0.001 && blockBottom < footY + PLAYER_HEIGHT - 0.001;
      if (hitsBody) return false;
    }

    return true;
  }

  function wouldBlockPlayer(x, y, z) {
    blockBox.min.set(x - 0.5, y - 0.5, z - 0.5);
    blockBox.max.set(x + 0.5, y + 0.5, z + 0.5);

    const footY = player.position.y - EYE_HEIGHT;
    playerBox.min.set(player.position.x - PLAYER_RADIUS, footY, player.position.z - PLAYER_RADIUS);
    playerBox.max.set(player.position.x + PLAYER_RADIUS, footY + PLAYER_HEIGHT, player.position.z + PLAYER_RADIUS);
    return playerBox.intersectsBox(blockBox);
  }

  function spawnPlayer() {
    updateChunkLoading(true, SPAWN_X, SPAWN_Z);
    rebuildDirtyChunks(9999);

    const groundY = groundAt(SPAWN_X, SPAWN_Z);
    player.position.set(SPAWN_X, groundY + EYE_HEIGHT + 0.02, SPAWN_Z);
    player.velocity.set(0, 0, 0);
    player.yaw = Math.PI;
    player.pitch = -0.42;
    player.grounded = true;
  }

  function updateCamera() {
    const pitchCos = Math.cos(player.pitch);
    cameraDir.set(
      Math.sin(player.yaw) * pitchCos,
      Math.sin(player.pitch),
      Math.cos(player.yaw) * pitchCos,
    );
    camera.position.copy(player.position);
    lookTarget.copy(player.position).add(cameraDir);
    camera.lookAt(lookTarget);
  }

  function updateTarget() {
    raycaster.set(camera.position, cameraDir);
    raycaster.far = REACH;

    const hits = raycaster.intersectObjects(rayTargets, false);
    hovered = null;

    for (const hit of hits) {
      const faceInfo = hit.object.userData.faceBlocks?.[hit.faceIndex];
      if (!faceInfo) continue;
      hovered = faceInfo;
      break;
    }

    if (hovered) {
      outline.visible = true;
      outline.position.set(hovered.x, hovered.y, hovered.z);
    } else {
      outline.visible = false;
    }
  }

  function updateFps(now) {
    frames += 1;
    if (now - fpsTime >= 500) {
      fpsLabel.textContent = `${Math.round((frames * 1000) / (now - fpsTime))} FPS`;
      fpsTime = now;
      frames = 0;
    }
  }

  function updateHud() {
    countLabel.textContent = `${chunks.size} chunks / ${blocks.size} blocks`;
  }

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function renderHotbar() {
    hotbar.innerHTML = "";
    slots = [];

    for (let i = 0; i < HOTBAR_SIZE; i += 1) {
      const type = hotbarItems[i] || inventoryBlocks[i % inventoryBlocks.length].type;
      hotbarItems[i] = type;

      const button = document.createElement("button");
      button.className = "slot";
      button.type = "button";
      button.dataset.index = String(i);
      button.dataset.type = type;
      button.setAttribute("aria-label", `${blockName(type)} ${i + 1}`);
      button.append(createSwatch(type));

      const keyLabel = document.createElement("b");
      keyLabel.textContent = String(i + 1);
      button.append(keyLabel);

      button.addEventListener("click", () => selectHotbarSlot(i));
      hotbar.append(button);
      slots.push(button);
    }

    syncActiveBlockButtons();
  }

  function renderInventory() {
    inventoryGrid.innerHTML = "";
    inventoryButtons = [];

    for (const block of inventoryBlocks) {
      const button = document.createElement("button");
      button.className = "block-button";
      button.type = "button";
      button.dataset.type = block.type;
      button.setAttribute("aria-label", block.name);
      button.append(createSwatch(block.type));

      const name = document.createElement("span");
      name.className = "block-name";
      name.textContent = block.name;
      button.append(name);

      button.addEventListener("click", (event) => {
        event.stopPropagation();
        assignBlockToSelectedSlot(block.type);
        closeInventory(true);
      });

      inventoryGrid.append(button);
      inventoryButtons.push(button);
    }

    syncActiveBlockButtons();
  }

  function createSwatch(type) {
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = blockByType.get(type)?.swatch || "#ffffff";
    return swatch;
  }

  function selectHotbarSlot(index) {
    selectedSlot = THREE.MathUtils.clamp(index, 0, HOTBAR_SIZE - 1);
    selectedType = hotbarItems[selectedSlot];
    syncActiveBlockButtons();
  }

  function assignBlockToSelectedSlot(type) {
    if (!blockByType.has(type)) return;
    hotbarItems[selectedSlot] = type;
    selectedType = type;
    renderHotbar();
  }

  function syncActiveBlockButtons() {
    slots.forEach((slot, index) => {
      const type = hotbarItems[index];
      slot.dataset.type = type;
      slot.setAttribute("aria-label", `${blockName(type)} ${index + 1}`);
      slot.classList.toggle("active", index === selectedSlot);
    });

    inventoryButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.type === selectedType);
    });

    if (selectedLabel) selectedLabel.textContent = blockName(selectedType);
  }

  function blockName(type) {
    return blockByType.get(type)?.name || type;
  }

  function terrainHeight(x, z) {
    const broad = valueNoise("broad", x, z, 80) * 6.2;
    const hills = valueNoise("hills", x, z, 34) * 4.3;
    const detail = valueNoise("detail", x, z, 13) * 1.7;
    const ridge = Math.abs(valueNoise("ridge", x + z, z - x, 46)) * 4.2;
    let height = Math.floor(8 + broad + hills + detail + ridge);
    const spawnDistance = Math.hypot(x - SPAWN_X, z - SPAWN_Z);

    if (spawnDistance <= SPAWN_PAD_RADIUS) {
      height = SPAWN_PAD_Y;
    } else if (spawnDistance < SPAWN_PAD_FADE) {
      const t = (spawnDistance - SPAWN_PAD_RADIUS) / (SPAWN_PAD_FADE - SPAWN_PAD_RADIUS);
      height = Math.round(THREE.MathUtils.lerp(SPAWN_PAD_Y, height, smoothstep(t)));
    }

    return THREE.MathUtils.clamp(height, 1, WORLD_MAX_Y - 8);
  }

  function valueNoise(seed, x, z, scale) {
    const gx = Math.floor(x / scale);
    const gz = Math.floor(z / scale);
    const tx = smoothstep((x - gx * scale) / scale);
    const tz = smoothstep((z - gz * scale) / scale);

    const a = hash(seed, gx, gz);
    const b = hash(seed, gx + 1, gz);
    const c = hash(seed, gx, gz + 1);
    const d = hash(seed, gx + 1, gz + 1);
    const top = THREE.MathUtils.lerp(a, b, tx);
    const bottom = THREE.MathUtils.lerp(c, d, tx);
    return THREE.MathUtils.lerp(top, bottom, tz) * 2 - 1;
  }

  function valueNoise3(seed, x, y, z, scale) {
    const gx = Math.floor(x / scale);
    const gy = Math.floor(y / scale);
    const gz = Math.floor(z / scale);
    const tx = smoothstep((x - gx * scale) / scale);
    const ty = smoothstep((y - gy * scale) / scale);
    const tz = smoothstep((z - gz * scale) / scale);

    const n000 = hash3(seed, gx, gy, gz);
    const n100 = hash3(seed, gx + 1, gy, gz);
    const n010 = hash3(seed, gx, gy + 1, gz);
    const n110 = hash3(seed, gx + 1, gy + 1, gz);
    const n001 = hash3(seed, gx, gy, gz + 1);
    const n101 = hash3(seed, gx + 1, gy, gz + 1);
    const n011 = hash3(seed, gx, gy + 1, gz + 1);
    const n111 = hash3(seed, gx + 1, gy + 1, gz + 1);

    const x00 = THREE.MathUtils.lerp(n000, n100, tx);
    const x10 = THREE.MathUtils.lerp(n010, n110, tx);
    const x01 = THREE.MathUtils.lerp(n001, n101, tx);
    const x11 = THREE.MathUtils.lerp(n011, n111, tx);
    const y0 = THREE.MathUtils.lerp(x00, x10, ty);
    const y1 = THREE.MathUtils.lerp(x01, x11, ty);
    return THREE.MathUtils.lerp(y0, y1, tz) * 2 - 1;
  }

  function smoothstep(value) {
    return value * value * (3 - 2 * value);
  }

  function getBlock(x, y, z) {
    return blocks.get(keyFor(x, y, z)) || null;
  }

  function isSolidType(type) {
    return Boolean(type && type !== "water");
  }

  function isInsideChunk(chunk, x, z) {
    return worldToChunk(x) === chunk.cx && worldToChunk(z) === chunk.cz;
  }

  function worldToChunk(value) {
    return Math.floor(value / CHUNK_SIZE);
  }

  function chunkKey(cx, cz) {
    return `${cx},${cz}`;
  }

  function keyFor(x, y, z) {
    return `${x},${y},${z}`;
  }

  function parseKey(key) {
    return key.split(",").map(Number);
  }

  function hash(seed, a, b) {
    let value = 0;
    const text = String(seed);
    for (let i = 0; i < text.length; i += 1) value += text.charCodeAt(i) * (i + 11);
    const raw = Math.sin(value * 12.9898 + a * 78.233 + b * 37.719) * 43758.5453;
    return raw - Math.floor(raw);
  }

  function hash3(seed, a, b, c) {
    let value = 0;
    const text = String(seed);
    for (let i = 0; i < text.length; i += 1) value += text.charCodeAt(i) * (i + 17);
    const raw = Math.sin(value * 9.161 + a * 78.233 + b * 37.719 + c * 19.371) * 43758.5453;
    return raw - Math.floor(raw);
  }
})();