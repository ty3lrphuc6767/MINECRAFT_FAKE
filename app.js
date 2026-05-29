(() => {
  const canvas = document.querySelector("#game");
  const startScreen = document.querySelector("#start-screen");
  const startButton = document.querySelector("#start-button");
  let startTitle = startScreen.querySelector("h1");
  let startCopy = startScreen.querySelector("p");
  let flyToggle = document.querySelector("#fly-toggle");
  let touchToggle = document.querySelector("#touch-toggle");
  const fpsLabel = document.querySelector("#fps");
  const countLabel = document.querySelector("#count");
  const modeLabel = document.querySelector("#mode");
  let selectedLabel = document.querySelector("#selected");
  let hotbar = document.querySelector("#hotbar");
  let inventory = document.querySelector("#inventory");
  let inventoryGrid = document.querySelector("#inventory-grid");
  let inventoryClose = document.querySelector("#inventory-close");
  let mobileControls = document.querySelector("#mobile-controls");
  let mobileLook = document.querySelector("#mobile-look");
  let mobileJoystick = document.querySelector("#mobile-joystick");
  let mobileStick = document.querySelector("#mobile-stick");
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
  const DESKTOP_RENDER_DISTANCE = 2;
  const MOBILE_RENDER_DISTANCE = 2;
  const LOW_FPS_RENDER_DISTANCE = 1;
  const DESKTOP_CHUNK_LOAD_BUDGET = 2;
  const MOBILE_CHUNK_LOAD_BUDGET = 1;
  const DESKTOP_CHUNK_REBUILD_BUDGET = 1;
  const MOBILE_CHUNK_REBUILD_BUDGET = 1;
  const LOW_FPS_LIMIT = 28;
  const RECOVER_FPS_LIMIT = 50;
  const HOTBAR_SIZE = 9;
  const WORLD_MIN_Y = -42;
  const WORLD_MAX_Y = 44;
  const VOID_Y = -66;
  const SEA_LEVEL = 3;
  const REACH = 9;
  const LOOK_SPEED = 0.0022;
  const WALK_SPEED = 5.2;
  const SPRINT_SPEED = 7.4;
  const FLY_SPEED = 10.6;
  const FLY_VERTICAL_SPEED = 7.6;
  const PLAYER_HEIGHT = 2;
  const EYE_HEIGHT = 1.72;
  const PLAYER_RADIUS = 0.35;
  const STEP_HEIGHT = 1.05;
  const GRAVITY = 22;
  const JUMP_SPEED = 10;
  const SPAWN_X = 0;
  const SPAWN_Z = 10;
  const SPAWN_PAD_Y = 8;
  const SPAWN_PAD_RADIUS = 9;
  const SPAWN_PAD_FADE = 16;
  const MOBILE_LOOK_SPEED = 0.006;

  let forcedMobile = getSavedTouchMode() || getUrlTouchMode();
  let isMobile = isMobileDevice();
  let renderDistance = isMobile ? MOBILE_RENDER_DISTANCE : DESKTOP_RENDER_DISTANCE;
  let unloadDistance = renderDistance + 1;
  let qualityScale = isMobile ? 0.85 : 1;
  document.body.classList.toggle("mobile", isMobile);
  document.body.classList.toggle("touch-forced", forcedMobile);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x86ceff);
  scene.fog = new THREE.Fog(0x86ceff, 42, fogFarForDistance());

  const camera = new THREE.PerspectiveCamera(65, 1, 0.05, 220);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(pixelRatioForQuality());

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
    {
      normal: [1, 0, 0],
      corners: [
        [0.5, -0.5, -0.5],
        [0.5, 0.5, -0.5],
        [0.5, 0.5, 0.5],
        [0.5, -0.5, 0.5],
      ],
      shade: 0.82,
    },
    {
      normal: [-1, 0, 0],
      corners: [
        [-0.5, -0.5, 0.5],
        [-0.5, 0.5, 0.5],
        [-0.5, 0.5, -0.5],
        [-0.5, -0.5, -0.5],
      ],
      shade: 0.72,
    },
    {
      normal: [0, 1, 0],
      corners: [
        [-0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5],
        [0.5, 0.5, -0.5],
        [-0.5, 0.5, -0.5],
      ],
      shade: 1,
    },
    {
      normal: [0, -1, 0],
      corners: [
        [-0.5, -0.5, -0.5],
        [0.5, -0.5, -0.5],
        [0.5, -0.5, 0.5],
        [-0.5, -0.5, 0.5],
      ],
      shade: 0.58,
    },
    {
      normal: [0, 0, 1],
      corners: [
        [-0.5, -0.5, 0.5],
        [0.5, -0.5, 0.5],
        [0.5, 0.5, 0.5],
        [-0.5, 0.5, 0.5],
      ],
      shade: 0.9,
    },
    {
      normal: [0, 0, -1],
      corners: [
        [0.5, -0.5, -0.5],
        [-0.5, -0.5, -0.5],
        [-0.5, 0.5, -0.5],
        [0.5, 0.5, -0.5],
      ],
      shade: 0.66,
    },
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
  let mobilePaused = false;
  let creativeFly = false;
  let ignoreMouseUntil = 0;
  let selectedSlot = 0;
  let selectedType = "grass";
  const hotbarItems = ["grass", "dirt", "stone", "sand", "wood", "planks", "leaves", "cobble", "brick"];
  let hovered = null;
  let mobileMoveX = 0;
  let mobileMoveY = 0;
  let joystickPointerId = null;
  let lookPointerId = null;
  let lastLookX = 0;
  let lastLookY = 0;
  const mobileActions = {
    jump: false,
    down: false,
    sprint: false,
  };
  let lastTime = performance.now();
  let frames = 0;
  let fpsTime = performance.now();
  let chunkCheckTime = 0;
  let targetCheckTime = 0;
  let lowFpsTicks = 0;
  let highFpsTicks = 0;

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
  if (touchToggle) {
    touchToggle.addEventListener("click", (event) => {
      event.stopPropagation();
      setForcedMobile(!forcedMobile);
    });
  }
  inventoryClose.addEventListener("click", () => closeInventory(true));

  document.addEventListener("pointerlockchange", () => {
    pointerLocked = document.pointerLockElement === canvas;
    syncUiState();
    ignoreMouseUntil = performance.now() + 250;
  });

  document.addEventListener("mousemove", (event) => {
    if (!pointerLocked || inventoryOpen || performance.now() < ignoreMouseUntil) return;
    rotateView(event.movementX, event.movementY, LOOK_SPEED);
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

    if (event.code === "Escape" && hasStarted) {
      pauseGame();
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
  setupMobileControls();

  function setupMobileControls() {
    mobileLook.addEventListener("pointerdown", (event) => {
      if (!isMobile || inventoryOpen || !hasStarted || mobilePaused || event.pointerType === "mouse") return;
      lookPointerId = event.pointerId;
      lastLookX = event.clientX;
      lastLookY = event.clientY;
      mobileLook.setPointerCapture(event.pointerId);
      event.preventDefault();
    });

    mobileLook.addEventListener("pointermove", (event) => {
      if (event.pointerId !== lookPointerId || !playing) return;
      const dx = event.clientX - lastLookX;
      const dy = event.clientY - lastLookY;
      lastLookX = event.clientX;
      lastLookY = event.clientY;
      rotateView(dx, dy, MOBILE_LOOK_SPEED);
      event.preventDefault();
    });

    mobileLook.addEventListener("pointerup", stopMobileLook);
    mobileLook.addEventListener("pointercancel", stopMobileLook);

    mobileJoystick.addEventListener("pointerdown", (event) => {
      if (!isMobile || inventoryOpen || !hasStarted || mobilePaused) return;
      joystickPointerId = event.pointerId;
      mobileJoystick.setPointerCapture(event.pointerId);
      updateMobileJoystick(event);
      event.preventDefault();
    });

    mobileJoystick.addEventListener("pointermove", (event) => {
      if (event.pointerId !== joystickPointerId || !playing) return;
      updateMobileJoystick(event);
      event.preventDefault();
    });

    mobileJoystick.addEventListener("pointerup", stopMobileJoystick);
    mobileJoystick.addEventListener("pointercancel", stopMobileJoystick);

    mobileControls.querySelectorAll("[data-mobile-action]").forEach((button) => {
      button.addEventListener("pointerdown", (event) => {
        if (!isMobile || !hasStarted) return;
        event.preventDefault();
        event.stopPropagation();
        button.setPointerCapture(event.pointerId);
        handleMobileAction(button.dataset.mobileAction, true);
        button.classList.add("active");
      });

      button.addEventListener("pointerup", (event) => {
        event.preventDefault();
        event.stopPropagation();
        handleMobileAction(button.dataset.mobileAction, false);
        button.classList.remove("active");
      });

      button.addEventListener("pointercancel", () => {
        handleMobileAction(button.dataset.mobileAction, false);
        button.classList.remove("active");
      });
    });
  }

  function handleMobileAction(action, pressed) {
    if (action === "jump") {
      if (creativeFly) {
        mobileActions.jump = pressed;
      } else if (pressed && playing && player.grounded) {
        player.velocity.y = JUMP_SPEED;
        player.grounded = false;
      }
      return;
    }

    if (action === "down") {
      mobileActions.down = pressed;
      return;
    }

    if (action === "sprint") {
      mobileActions.sprint = pressed;
      return;
    }

    if (!pressed) return;

    if (action === "break" && playing) removeHoveredBlock();
    else if (action === "place" && playing) placeBlock();
    else if (action === "inventory") openInventory();
    else if (action === "pause") pauseGame();
  }

  function updateMobileJoystick(event) {
    const rect = mobileJoystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const radius = rect.width * 0.36;
    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const length = Math.hypot(rawX, rawY);
    const scale = length > radius ? radius / length : 1;
    const x = rawX * scale;
    const y = rawY * scale;

    mobileMoveX = x / radius;
    mobileMoveY = y / radius;
    mobileStick.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  function stopMobileJoystick(event) {
    if (event.pointerId !== joystickPointerId) return;
    joystickPointerId = null;
    mobileMoveX = 0;
    mobileMoveY = 0;
    mobileStick.style.transform = "translate(-50%, -50%)";
  }

  function stopMobileLook(event) {
    if (event.pointerId !== lookPointerId) return;
    lookPointerId = null;
  }

  function resetMobileInput() {
    mobileMoveX = 0;
    mobileMoveY = 0;
    joystickPointerId = null;
    lookPointerId = null;
    mobileActions.jump = false;
    mobileActions.down = false;
    mobileActions.sprint = false;
    if (mobileStick) mobileStick.style.transform = "translate(-50%, -50%)";
  }

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

    if (!touchToggle) {
      let actions = startScreen.querySelector(".panel-actions");
      if (!actions) {
        actions = document.createElement("div");
        actions.className = "panel-actions";
        startButton.before(actions);
        actions.append(startButton);
        if (flyToggle) actions.append(flyToggle);
      }

      touchToggle = document.createElement("button");
      touchToggle.id = "touch-toggle";
      touchToggle.className = "secondary-button";
      touchToggle.type = "button";
      touchToggle.textContent = "Touch Mode: AUTO";
      actions.append(touchToggle);
    }

    if (!mobileControls) {
      mobileControls = document.createElement("div");
      mobileControls.id = "mobile-controls";
      mobileControls.setAttribute("aria-label", "Dieu khien mobile");
      mobileControls.innerHTML = `
        <div id="mobile-look" aria-hidden="true"></div>
        <div id="mobile-joystick" aria-label="Di chuyen">
          <div id="mobile-stick"></div>
        </div>
        <div id="mobile-actions">
          <button class="mobile-btn small" data-mobile-action="pause" type="button">MENU</button>
          <button class="mobile-btn small" data-mobile-action="inventory" type="button">INV</button>
          <button class="mobile-btn small" data-mobile-action="sprint" type="button">RUN</button>
          <button class="mobile-btn" data-mobile-action="break" type="button">PHA</button>
          <button class="mobile-btn" data-mobile-action="place" type="button">DAT</button>
          <button class="mobile-btn" data-mobile-action="jump" type="button">UP</button>
          <button class="mobile-btn small" data-mobile-action="down" type="button">DOWN</button>
        </div>
      `;
      app.append(mobileControls);
    }

    mobileLook = mobileControls.querySelector("#mobile-look");
    mobileJoystick = mobileControls.querySelector("#mobile-joystick");
    mobileStick = mobileControls.querySelector("#mobile-stick");

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
    mobilePaused = false;
    if (!isMobile) lockPointer();
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
    if (tryLockPointer && !isMobile) lockPointer();
  }

  function pauseGame() {
    keys.clear();
    resetMobileInput();

    if (isMobile) {
      mobilePaused = true;
      syncUiState();
      return;
    }

    if (document.pointerLockElement === canvas && document.exitPointerLock) {
      document.exitPointerLock();
    } else {
      syncUiState();
    }
  }

  function rotateView(dx, dy, speed) {
    player.yaw -= dx * speed;
    player.pitch -= dy * speed;
    player.pitch = THREE.MathUtils.clamp(player.pitch, -1.3, 1.3);
  }

  function syncUiState() {
    const activeView = isMobile ? hasStarted && !mobilePaused : pointerLocked;
    playing = activeView && !inventoryOpen;
    modeLabel.textContent = inventoryOpen
      ? "Inventory"
      : playing
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
    if (touchToggle) {
      touchToggle.textContent = forcedMobile
        ? "Touch Mode: ON"
        : isMobile ? "Touch Mode: AUTO" : "Touch Mode: OFF";
      touchToggle.classList.toggle("active", isMobile);
    }

    startScreen.classList.toggle("hidden", activeView || inventoryOpen);
    inventory.classList.toggle("hidden", !inventoryOpen);
    document.body.classList.toggle("inventory-open", inventoryOpen);
    document.body.classList.toggle("playing", playing);
  }

  function updateChunkLoading(force = false, centerX = player.position.x, centerZ = player.position.z) {
    const now = performance.now();
    if (!force && now - chunkCheckTime < (isMobile ? 260 : 180)) return;
    chunkCheckTime = now;

    const centerChunkX = worldToChunk(centerX);
    const centerChunkZ = worldToChunk(centerZ);
    const wanted = new Set();
    const toLoad = [];

    for (let dz = -renderDistance; dz <= renderDistance; dz += 1) {
      for (let dx = -renderDistance; dx <= renderDistance; dx += 1) {
        const chunkX = centerChunkX + dx;
        const chunkZ = centerChunkZ + dz;
        const key = chunkKey(chunkX, chunkZ);
        wanted.add(key);
        if (!chunks.has(key)) toLoad.push({ chunkX, chunkZ, distance: dx * dx + dz * dz });
      }
    }

    toLoad.sort((a, b) => a.distance - b.distance);
    const loadLimit = force ? 9999 : isMobile ? MOBILE_CHUNK_LOAD_BUDGET : DESKTOP_CHUNK_LOAD_BUDGET;
    for (let i = 0; i < Math.min(loadLimit, toLoad.length); i += 1) {
      loadChunk(toLoad[i].chunkX, toLoad[i].chunkZ);
    }

    for (const [key, chunk] of chunks) {
      if (
        Math.abs(chunk.cx - centerChunkX) > unloadDistance ||
        Math.abs(chunk.cz - centerChunkZ) > unloadDistance
      ) {
        unloadChunk(key, chunk);
      }
    }

    updateHud();
  }

  function loadChunk(cx, cz) {
    const key = chunkKey(cx, cz);
    const chunk = {
      key,
      cx,
      cz,
      blocks: new Map(),
      mesh: null,
      waterMesh: null,
    };

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
    return {
      positions: [],
      normals: [],
      colors: [],
      faceBlocks: [],
    };
  }

  function appendFace(store, x, y, z, type, face) {
    const color = blockColors[type] || blockColors.grass;
    const indices = [0, 1, 2, 0, 2, 3];
    const normalInfo = {
      x: face.normal[0],
      y: face.normal[1],
      z: face.normal[2],
    };
    const faceInfo = {
      key: keyFor(x, y, z),
      x,
      y,
      z,
      normal: normalInfo,
    };

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
    updateTarget(performance.now(), true);
    if (hovered) removeBlock(hovered.key);
  }

  function placeBlock() {
    updateTarget(performance.now(), true);
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
    rebuildDirtyChunks(isMobile ? MOBILE_CHUNK_REBUILD_BUDGET : DESKTOP_CHUNK_REBUILD_BUDGET);
    updateMovement(dt);
    updateCamera();
    updateTarget(now);
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
    if (isMobile) {
      move.addScaledVector(right, mobileMoveX);
      move.addScaledVector(forward, -mobileMoveY);
    }
    if (move.lengthSq() > 0) move.normalize();

    const moveSpeed = creativeFly ? FLY_SPEED : keys.has("shift") || mobileActions.sprint ? SPRINT_SPEED : WALK_SPEED;
    desiredVelocity.copy(move).multiplyScalar(moveSpeed);

    if (creativeFly) {
      if (keys.has(" ") || mobileActions.jump) desiredVelocity.y += FLY_VERTICAL_SPEED;
      if (keys.has("control") || mobileActions.down) desiredVelocity.y -= FLY_VERTICAL_SPEED;

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

  function updateTarget(now = performance.now(), force = false) {
    if (!force && now - targetCheckTime < (isMobile ? 80 : 45)) return;
    targetCheckTime = now;

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
      const fps = Math.round((frames * 1000) / (now - fpsTime));
      fpsLabel.textContent = `${fps} FPS`;
      tuneQuality(fps);
      fpsTime = now;
      frames = 0;
    }
  }

  function updateHud() {
    countLabel.textContent = `${chunks.size} chunks / ${blocks.size} blocks | RD ${renderDistance}`;
  }

  function resize() {
    const nextIsMobile = isMobileDevice();
    if (nextIsMobile !== isMobile) {
      isMobile = nextIsMobile;
      document.body.classList.toggle("mobile", isMobile);
      setRenderDistance(isMobile ? MOBILE_RENDER_DISTANCE : DESKTOP_RENDER_DISTANCE);
      qualityScale = isMobile ? Math.min(qualityScale, 0.85) : 1;
      renderer.setPixelRatio(pixelRatioForQuality());
      resetMobileInput();
      syncUiState();
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
  }

  function tuneQuality(fps) {
    if (fps < LOW_FPS_LIMIT) {
      lowFpsTicks += 1;
      highFpsTicks = 0;
    } else if (fps > RECOVER_FPS_LIMIT) {
      highFpsTicks += 1;
      lowFpsTicks = 0;
    } else {
      lowFpsTicks = 0;
      highFpsTicks = 0;
    }

    if (lowFpsTicks >= 5) {
      lowFpsTicks = 0;
      qualityScale = Math.max(0.65, qualityScale - 0.1);
      renderer.setPixelRatio(pixelRatioForQuality());
      if (!isMobile) setRenderDistance(LOW_FPS_RENDER_DISTANCE);
      return;
    }

    if (!isMobile && highFpsTicks >= 10 && qualityScale < 1) {
      highFpsTicks = 0;
      qualityScale = Math.min(1, qualityScale + 0.1);
      renderer.setPixelRatio(pixelRatioForQuality());
      if (qualityScale >= 0.95) setRenderDistance(DESKTOP_RENDER_DISTANCE);
    }
  }

  function setRenderDistance(nextDistance) {
    const distance = Math.max(1, Math.round(nextDistance));
    if (distance === renderDistance) return;
    renderDistance = distance;
    unloadDistance = renderDistance + 1;
    updateViewDistance();
    updateChunkLoading(true);
  }

  function updateViewDistance() {
    camera.far = Math.max(100, renderDistance * CHUNK_SIZE * 3.5);
    camera.updateProjectionMatrix();
    scene.fog.near = renderDistance * CHUNK_SIZE * 0.7;
    scene.fog.far = fogFarForDistance();
    updateHud();
  }

  function fogFarForDistance() {
    return Math.max(90, renderDistance * CHUNK_SIZE * 2.35);
  }

  function pixelRatioForQuality() {
    const deviceRatio = window.devicePixelRatio || 1;
    const cap = isMobile ? 1 : Math.min(deviceRatio, 1.5);
    return Math.max(0.6, cap * qualityScale);
  }

  function setForcedMobile(enabled) {
    forcedMobile = enabled;
    saveTouchMode(enabled);
    document.body.classList.toggle("touch-forced", forcedMobile);

    const nextIsMobile = isMobileDevice();
    if (nextIsMobile !== isMobile) {
      isMobile = nextIsMobile;
      document.body.classList.toggle("mobile", isMobile);
      setRenderDistance(isMobile ? MOBILE_RENDER_DISTANCE : DESKTOP_RENDER_DISTANCE);
      qualityScale = isMobile ? Math.min(qualityScale, 0.85) : 1;
      renderer.setPixelRatio(pixelRatioForQuality());
      resetMobileInput();

      if (isMobile && document.pointerLockElement === canvas && document.exitPointerLock) {
        document.exitPointerLock();
      }
    }

    syncUiState();
    resize();
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

  function isMobileDevice() {
    if (forcedMobile) return true;

    const coarsePointer = window.matchMedia("(pointer: coarse)").matches || window.matchMedia("(any-pointer: coarse)").matches;
    const touchCapable = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
    const mobileName = /android|iphone|ipad|ipod|mobile|tablet|xiaomi|redmi|miui/i.test(navigator.userAgent);

    return coarsePointer || touchCapable || mobileName || window.innerWidth <= 760;
  }

  function getUrlTouchMode() {
    const params = new URLSearchParams(window.location.search);
    const value = (params.get("mobile") || params.get("touch") || "").toLowerCase();
    return ["1", "true", "yes", "on"].includes(value);
  }

  function getSavedTouchMode() {
    try {
      return localStorage.getItem("blockcraft-touch-mode") === "on";
    } catch {
      return false;
    }
  }

  function saveTouchMode(enabled) {
    try {
      if (enabled) localStorage.setItem("blockcraft-touch-mode", "on");
      else localStorage.removeItem("blockcraft-touch-mode");
    } catch {
      // Some browsers block localStorage on file pages.
    }
  }
})();
