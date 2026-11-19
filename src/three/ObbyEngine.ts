import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { soundEngine } from '../audio/soundEngine';
import { ZONES } from '../data/mathCurriculum';
import type {
  CourseMode,
  GameHudState,
  InputVector,
  MathProblem,
  StageOutcome,
} from '../types/game';
import {
  createAnswerPad,
  createCheckpointPlatform,
  createFinishPodium,
  createObbyCharacter,
  createQuestionBillboard,
  createSkyDecorations,
  type AnswerPadVisual,
  type CharacterRig,
  type CloudDriftItem,
} from './models';
import {
  createContactShadowTexture,
  createSkyGradientTexture,
} from './textures';

// Module-scope reusable math helpers (zero GC inside animation loop)
const _moveDir = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camDesiredPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _tempVec = new THREE.Vector3();

interface AabbBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
  bottomY: number;
  active: boolean;
  kind: 'checkpoint' | 'answer' | 'bridge' | 'finish' | 'barrier';
  stageIndex?: number;
  choiceIndex?: number;
}

interface StageRuntime {
  index: number;
  problem: MathProblem;
  checkpointPos: THREE.Vector3;
  checkpointBox: AabbBox;
  pads: Array<{
    visual: AnswerPadVisual;
    box: AabbBox;
    state: 'idle' | 'correct' | 'falling';
    fallVelocity: number;
    shakeTime: number;
    baseY: number;
  }>;
  bridgeMesh: THREE.Mesh;
  bridgeBox: AabbBox;
  bridgeProgress: number; // 0 = hidden below, 1 = raised into place
  barrierMesh: THREE.Mesh;
  barrierBox: AabbBox;
  billboard: THREE.Group;
  flagMesh?: THREE.Mesh;
  solved: boolean;
  wrongAttempts: number;
  falls: number;
}

interface ParticleItem {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

export class ObbyEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private keyLight: THREE.DirectionalLight;
  private isSoftwareGl: boolean;
  private maxAnisotropy: number;

  private character: CharacterRig;
  private contactShadow: THREE.Mesh;
  private clouds: CloudDriftItem[] = [];
  private trophyGroup: THREE.Group | null = null;

  private stages: StageRuntime[] = [];
  private allColliders: AabbBox[] = [];
  private worldGroup = new THREE.Group();
  private particles: ParticleItem[] = [];

  // Game & Physics State
  private problems: MathProblem[] = [];
  private courseMode: CourseMode = 'standard';
  private phase: 'menu' | 'playing' | 'finished' = 'menu';
  private activeStageIndex = 0;
  private reachedCheckpointIndex = 0;
  private score = 0;
  private streak = 0;
  private bestStreak = 0;
  private totalWrongAttempts = 0;
  private totalFalls = 0;
  private elapsedSeconds = 0;
  private outcomes: StageOutcome[] = [];
  private feedbackCounter = 0;
  private feedbackBanner: GameHudState['feedbackBanner'] = null;
  private feedbackTimer = 0;

  // Player kinematics
  private playerPos = new THREE.Vector3(0, 0, 0);
  private playerVel = new THREE.Vector3(0, 0, 0);
  private playerYaw = 0; // 0 = facing -Z
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private walkPhase = 0;
  private celebrateTimer = 0;
  private respawnFlashTimer = 0;

  // Camera
  private cameraYaw = 0;
  private cameraPos = new THREE.Vector3(0, 6.2, 10.5);
  private cameraTarget = new THREE.Vector3(0, 1.5, -3);

  // Inputs
  private joystickInput: InputVector = { x: 0, y: 0 };
  private keyboardKeys = new Set<string>();
  private isDraggingCamera = false;
  private lastPointerX = 0;

  // Loop management
  private frameId = 0;
  private disposed = false;
  private lastTime = performance.now();
  private hudSyncTimer = 0;
  private onHudUpdate: (state: GameHudState) => void;
  private onContextLostCallback?: (lost: boolean) => void;

  // Bound event listeners
  private handleResizeBound: () => void;
  private handleKeyDownBound: (e: KeyboardEvent) => void;
  private handleKeyUpBound: (e: KeyboardEvent) => void;
  private handlePointerDownBound: (e: PointerEvent) => void;
  private handlePointerMoveBound: (e: PointerEvent) => void;
  private handlePointerUpBound: () => void;
  private handleContextLostBound: (e: Event) => void;
  private handleContextRestoredBound: () => void;

  constructor(
    container: HTMLElement,
    onHudUpdate: (state: GameHudState) => void,
    onContextLost?: (lost: boolean) => void,
  ) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.onContextLostCallback = onContextLost;

    // 1. Software WebGL probe
    this.isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    this.renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.maxAnisotropy = this.renderer.capabilities.getMaxAnisotropy();

    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    // 3. Scene & Studio Environment
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x93c5fd);
    this.scene.fog = new THREE.FogExp2(0xbae6fd, 0.0085);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmrem.dispose();

    // Sky dome
    const skyDome = new THREE.Mesh(
      new THREE.SphereGeometry(420, 24, 16),
      new THREE.MeshBasicMaterial({
        map: createSkyGradientTexture(),
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      }),
    );
    this.scene.add(skyDome);

    // 4. Camera
    const aspect =
      (container.clientWidth || window.innerWidth) /
      Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(56, aspect, 0.1, 650);
    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraTarget);

    // 5. 3-Point Outdoor Daylight Rig (Warm Key + Cool Sky Hemi + Rim)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x94a3b8, 0.9);
    hemiLight.position.set(0, 60, 0);
    this.scene.add(hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 1.45);
    this.keyLight.position.set(16, 28, 14);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 90;
    const d = 24;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    rimLight.position.set(-14, 12, -22);
    this.scene.add(rimLight);

    // 6. Character & Contact Shadow
    this.character = createObbyCharacter();
    this.scene.add(this.character.root);

    this.contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshBasicMaterial({
        map: createContactShadowTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      }),
    );
    this.contactShadow.rotation.x = -Math.PI / 2;
    this.scene.add(this.contactShadow);

    // 7. Particle Pool
    this.initParticlePool();
    this.scene.add(this.worldGroup);

    // 8. Listeners
    this.handleResizeBound = this.handleResize.bind(this);
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
    this.handleKeyUpBound = this.handleKeyUp.bind(this);
    this.handlePointerDownBound = this.handlePointerDown.bind(this);
    this.handlePointerMoveBound = this.handlePointerMove.bind(this);
    this.handlePointerUpBound = this.handlePointerUp.bind(this);
    this.handleContextLostBound = (e: Event) => {
      e.preventDefault();
      this.onContextLostCallback?.(true);
    };
    this.handleContextRestoredBound = () => {
      this.onContextLostCallback?.(false);
    };

    window.addEventListener('resize', this.handleResizeBound);
    window.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('keyup', this.handleKeyUpBound);
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDownBound);
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound);
    dom.addEventListener('webglcontextlost', this.handleContextLostBound);
    dom.addEventListener(
      'webglcontextrestored',
      this.handleContextRestoredBound,
    );

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.scheduleNextTick();
  }

  private initParticlePool(): void {
    const geo = new THREE.BoxGeometry(0.24, 0.24, 0.24);
    const palette = [0xfacc15, 0x34d399, 0x38bdf8, 0xfb7185, 0xa78bfa];
    for (let i = 0; i < 42; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: palette[i % palette.length],
        roughness: 0.35,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false,
      });
    }
  }

  private spawnBurst(pos: THREE.Vector3, count: number, upward = 6): void {
    let spawned = 0;
    for (const p of this.particles) {
      if (p.active) continue;
      p.active = true;
      p.life = 0;
      p.maxLife = 0.65 + Math.random() * 0.45;
      p.mesh.visible = true;
      p.mesh.position.set(
        pos.x + (Math.random() - 0.5) * 0.8,
        pos.y + 0.4,
        pos.z + (Math.random() - 0.5) * 0.8,
      );
      p.mesh.scale.setScalar(1);
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.2 + Math.random() * 3.8;
      p.velocity.set(
        Math.cos(angle) * speed,
        upward + Math.random() * 4.5,
        Math.sin(angle) * speed,
      );
      spawned++;
      if (spawned >= count) break;
    }
  }

  public loadCourse(
    problems: MathProblem[],
    mode: CourseMode,
    startImmediately: boolean,
  ): void {
    this.clearWorld();
    this.problems = problems;
    this.courseMode = mode;
    this.stages = [];
    this.allColliders = [];

    this.activeStageIndex = 0;
    this.reachedCheckpointIndex = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.totalWrongAttempts = 0;
    this.totalFalls = 0;
    this.elapsedSeconds = 0;
    this.outcomes = [];
    this.feedbackBanner = null;
    this.phase = startImmediately ? 'playing' : 'menu';

    const stageSpacingZ = 14.5;
    const stageStepY = 0.38;
    const padColors = ['#38bdf8', '#fbbf24', '#c084fc'];
    const padTrims = ['#0284c7', '#d97706', '#7c3aed'];

    // Build all stages
    for (let i = 0; i < problems.length; i++) {
      const prob = problems[i];
      const zone = ZONES[prob.zoneId];
      const cpX = 0;
      const cpY = i * stageStepY;
      const cpZ = -i * stageSpacingZ;
      const isZoneStart =
        i === 0 || problems[i - 1].zoneId !== prob.zoneId;

      const cpW = i === 0 ? 8.6 : 8.2;
      const cpD = i === 0 ? 6.2 : 5.2;

      const cpObj = createCheckpointPlatform(
        cpW,
        cpD,
        zone,
        this.maxAnisotropy,
        true,
        isZoneStart,
      );
      cpObj.group.position.set(cpX, cpY, cpZ);
      this.worldGroup.add(cpObj.group);

      const cpBox: AabbBox = {
        minX: cpX - cpW / 2,
        maxX: cpX + cpW / 2,
        minZ: cpZ - cpD / 2,
        maxZ: cpZ + cpD / 2,
        topY: cpY,
        bottomY: cpY - 0.7,
        active: true,
        kind: 'checkpoint',
        stageIndex: i,
      };
      this.allColliders.push(cpBox);

      // 3 Answer pads ahead
      const padZ = cpZ - 5.4;
      const padY = cpY + 0.18;
      const padXs = [-4.0, 0, 4.0];
      const pads: StageRuntime['pads'] = [];

      for (let c = 0; c < 3; c++) {
        const isCorrect = c === prob.correctIndex;
        const visual = createAnswerPad(
          prob.choices[c],
          c,
          isCorrect,
          padColors[c],
          padTrims[c],
          this.maxAnisotropy,
        );
        visual.group.position.set(padXs[c], padY, padZ);
        this.worldGroup.add(visual.group);

        const padBox: AabbBox = {
          minX: padXs[c] - 1.72,
          maxX: padXs[c] + 1.72,
          minZ: padZ - 1.72,
          maxZ: padZ + 1.72,
          topY: padY,
          bottomY: padY - 0.7,
          active: true,
          kind: 'answer',
          stageIndex: i,
          choiceIndex: c,
        };
        this.allColliders.push(padBox);
        pads.push({
          visual,
          box: padBox,
          state: 'idle',
          fallVelocity: 0,
          shakeTime: 0,
          baseY: padY,
        });
      }

      // Compact 3D Question Signpost placed off to the right flank (never blocks view)
      const billboard = createQuestionBillboard(
        prob,
        i + 1,
        problems.length,
        zone,
        this.maxAnisotropy,
      );
      billboard.position.set(7.8, padY - 0.15, padZ + 2.2);
      billboard.rotation.y = -0.45;
      this.worldGroup.add(billboard);

      // Bridge connecting correct answer pad -> next checkpoint (initially lowered & inactive)
      const correctPadX = padXs[prob.correctIndex];
      const nextCpZ = -(i + 1) * stageSpacingZ;
      const nextCpY = (i + 1) * stageStepY;
      const bridgeStartZ = padZ - 1.7;
      const bridgeEndZ = nextCpZ + (i + 1 === problems.length ? 5.0 : 2.6);
      const bridgeLen = Math.max(2.6, bridgeStartZ - bridgeEndZ + 0.8);
      const bridgeMidZ = (bridgeStartZ + bridgeEndZ) / 2;
      const bridgeY = (padY + nextCpY) / 2;

      const bridgeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.45, bridgeLen),
        new THREE.MeshStandardMaterial({
          color: 0x10b981,
          roughness: 0.35,
          metalness: 0.1,
          emissive: 0x059669,
          emissiveIntensity: 0.18,
        }),
      );
      bridgeMesh.position.set(correctPadX, bridgeY - 3.0, bridgeMidZ);
      bridgeMesh.visible = false;
      bridgeMesh.castShadow = true;
      bridgeMesh.receiveShadow = true;
      this.worldGroup.add(bridgeMesh);

      const bridgeBox: AabbBox = {
        minX: correctPadX - 1.35,
        maxX: correctPadX + 1.35,
        minZ: bridgeMidZ - bridgeLen / 2 - 0.3,
        maxZ: bridgeMidZ + bridgeLen / 2 + 0.3,
        topY: bridgeY,
        bottomY: bridgeY - 0.5,
        active: false,
        kind: 'bridge',
        stageIndex: i,
      };
      this.allColliders.push(bridgeBox);

      // Subtle low laser-rail Math Lock Barrier behind answer pads (keeps view completely clear)
      const barrierMesh = new THREE.Mesh(
        new THREE.BoxGeometry(11.6, 0.32, 0.22),
        new THREE.MeshStandardMaterial({
          color: 0xf43f5e,
          transparent: true,
          opacity: 0.65,
          roughness: 0.25,
          emissive: 0xe11d48,
          emissiveIntensity: 0.35,
        }),
      );
      const barrierZ = padZ - 2.35;
      barrierMesh.position.set(0, padY + 0.65, barrierZ);
      this.worldGroup.add(barrierMesh);

      const barrierBox: AabbBox = {
        minX: -5.9,
        maxX: 5.9,
        minZ: barrierZ - 0.25,
        maxZ: barrierZ + 0.25,
        topY: padY + 4.5,
        bottomY: padY - 1,
        active: true,
        kind: 'barrier',
        stageIndex: i,
      };
      this.allColliders.push(barrierBox);

      this.stages.push({
        index: i,
        problem: prob,
        checkpointPos: new THREE.Vector3(cpX, cpY, cpZ),
        checkpointBox: cpBox,
        pads,
        bridgeMesh,
        bridgeBox,
        bridgeProgress: 0,
        barrierMesh,
        barrierBox,
        billboard,
        flagMesh: cpObj.flagMesh,
        solved: false,
        wrongAttempts: 0,
        falls: 0,
      });
    }

    // Finish Podium at end of course
    const finishZ = -problems.length * stageSpacingZ - 1.5;
    const finishY = problems.length * stageStepY;
    const finishObj = createFinishPodium(this.maxAnisotropy);
    finishObj.group.position.set(0, finishY, finishZ);
    this.worldGroup.add(finishObj.group);
    this.trophyGroup = finishObj.trophyGroup;

    const finishBox: AabbBox = {
      minX: -5.75,
      maxX: 5.75,
      minZ: finishZ - 5.0,
      maxZ: finishZ + 5.0,
      topY: finishY,
      bottomY: finishY - 0.9,
      active: true,
      kind: 'finish',
    };
    this.allColliders.push(finishBox);

    // Sky clouds & distant islands
    const skyDecor = createSkyDecorations(problems.length * stageSpacingZ);
    this.worldGroup.add(skyDecor.group);
    this.clouds = skyDecor.clouds;

    // Reset player at stage 0
    this.playerPos.set(0, 0, 1.2);
    this.playerVel.set(0, 0, 0);
    this.playerYaw = 0;
    this.cameraYaw = 0;
    this.grounded = true;
    this.cameraPos.set(0, 6.2, 11.2);
    this.cameraTarget.set(0, 1.6, -3.5);

    this.emitHud();
  }

  private clearWorld(): void {
    while (this.worldGroup.children.length > 0) {
      const child = this.worldGroup.children[0];
      this.worldGroup.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material)
            ? mesh.material
            : [mesh.material];
          for (const m of mats) {
            if (!m) continue;
            const std = m as THREE.MeshStandardMaterial;
            std.map?.dispose();
            std.emissiveMap?.dispose();
            m.dispose();
          }
        }
      });
    }
    this.clouds = [];
    this.trophyGroup = null;
  }

  public setPhase(phase: 'menu' | 'playing' | 'finished'): void {
    this.phase = phase;
    this.emitHud();
  }

  public setJoystickInput(vec: InputVector): void {
    this.joystickInput.x = vec.x;
    this.joystickInput.y = vec.y;
  }

  public triggerJump(): void {
    if (this.phase !== 'playing') return;
    this.jumpBufferTimer = 0.16;
  }

  public resetCameraAlignment(): void {
    this.cameraYaw = 0;
  }

  public respawnAtCheckpoint(): void {
    if (this.phase !== 'playing') return;
    const cp = this.stages[this.reachedCheckpointIndex]?.checkpointPos;
    if (cp) {
      this.playerPos.set(cp.x, cp.y + 0.6, cp.z + 0.8);
      this.playerVel.set(0, 0, 0);
      this.grounded = false;
      this.respawnFlashTimer = 0.6;
    }
  }

  private handleResize(): void {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (
      ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
        e.code,
      )
    ) {
      e.preventDefault();
    }
    this.keyboardKeys.add(e.code);
    if (e.code === 'Space') {
      soundEngine.unlock();
      this.triggerJump();
    }
    if (e.code === 'KeyR' && this.phase === 'playing') {
      this.resetCameraAlignment();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keyboardKeys.delete(e.code);
  }

  private handlePointerDown(e: PointerEvent): void {
    soundEngine.unlock();
    if (e.button === 0 || e.pointerType === 'touch') {
      this.isDraggingCamera = true;
      this.lastPointerX = e.clientX;
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (!this.isDraggingCamera) return;
    const dx = e.clientX - this.lastPointerX;
    this.lastPointerX = e.clientX;
    this.cameraYaw = THREE.MathUtils.clamp(
      this.cameraYaw - dx * 0.0045,
      -0.95,
      0.95,
    );
  }

  private handlePointerUp(): void {
    this.isDraggingCamera = false;
  }

  private showFeedback(
    kind: NonNullable<GameHudState['feedbackBanner']>['kind'],
    title: string,
    detail?: string,
  ): void {
    this.feedbackCounter++;
    this.feedbackBanner = {
      id: this.feedbackCounter,
      kind,
      title,
      detail,
    };
    this.feedbackTimer = 2.4;
    this.emitHud();
  }

  private handleLandedOnBox(box: AabbBox): void {
    if (box.kind === 'answer' && box.stageIndex !== undefined && box.choiceIndex !== undefined) {
      const stage = this.stages[box.stageIndex];
      const pad = stage?.pads[box.choiceIndex];
      if (!stage || !pad) return;

      if (pad.visual.isCorrect) {
        if (!stage.solved) {
          stage.solved = true;
          pad.state = 'correct';
          pad.visual.topMesh.material = pad.visual.correctTopMat;

          // Disable barrier & activate connecting bridge
          stage.barrierBox.active = false;
          stage.barrierMesh.visible = false;
          stage.bridgeBox.active = true;
          stage.bridgeMesh.visible = true;

          // Fade other two pads cleanly
          for (const other of stage.pads) {
            if (other !== pad && other.state === 'idle') {
              other.box.active = false;
              other.visual.group.visible = false;
            }
          }

          // Scoring: base 100 - 20 per wrong attempt (min 40) + streak bonus
          const basePoints = Math.max(40, 100 - stage.wrongAttempts * 20);
          this.streak = stage.wrongAttempts === 0 ? this.streak + 1 : 0;
          if (this.streak > this.bestStreak) this.bestStreak = this.streak;
          const streakBonus = this.streak >= 3 ? 20 : 0;
          const earned = basePoints + streakBonus;
          this.score += earned;

          this.outcomes.push({
            stageIndex: stage.index,
            problem: stage.problem,
            wrongAttempts: stage.wrongAttempts,
            falls: stage.falls,
            pointsEarned: earned,
            clearedOnFirstTry: stage.wrongAttempts === 0,
          });

          soundEngine.playCorrect();
          this.spawnBurst(this.playerPos, 18, 7.5);
          this.showFeedback(
            'correct',
            `정답! ${stage.problem.answer}`,
            streakBonus > 0
              ? `+${earned}점 (연속 정답 보너스!) · 다리가 열렸어요!`
              : `+${earned}점 · 초록 다리를 건너 다음 칸으로 가세요!`,
          );
        }
      } else if (pad.state === 'idle') {
        // Wrong answer! Shake, turn red, and drop out from beneath player
        pad.state = 'falling';
        pad.shakeTime = 0.18;
        pad.box.active = false;
        pad.visual.topMesh.material = pad.visual.wrongTopMat;
        stage.wrongAttempts++;
        this.totalWrongAttempts++;
        this.streak = 0;
        this.grounded = false;
        this.playerVel.y = Math.min(this.playerVel.y, -1.5);

        soundEngine.playWrong();
        this.showFeedback(
          'wrong',
          `${pad.visual.value}은(는) 정답이 아니에요!`,
          '문제를 다시 천천히 계산해 볼까요?',
        );
      }
    } else if (box.kind === 'checkpoint' && box.stageIndex !== undefined) {
      if (box.stageIndex > this.reachedCheckpointIndex) {
        this.reachedCheckpointIndex = box.stageIndex;
        this.activeStageIndex = box.stageIndex;

        const prevZone = this.stages[box.stageIndex - 1]?.problem.zoneId;
        const currZone = this.stages[box.stageIndex]?.problem.zoneId;
        if (prevZone && currZone && prevZone !== currZone) {
          soundEngine.playCheckpoint();
          this.spawnBurst(this.playerPos, 20, 8);
          this.showFeedback(
            'checkpoint',
            ZONES[currZone].title,
            ZONES[currZone].subtitle,
          );
        } else {
          this.emitHud();
        }
      }
    } else if (box.kind === 'finish' && this.phase === 'playing') {
      this.phase = 'finished';
      this.celebrateTimer = 4.0;
      soundEngine.playFinishFanfare();
      this.spawnBurst(this.playerPos, 32, 10);
      this.emitHud();
    }
  }

  private getEffectiveInput(): InputVector {
    let x = this.joystickInput.x;
    let y = this.joystickInput.y;

    if (this.keyboardKeys.has('KeyA') || this.keyboardKeys.has('ArrowLeft')) {
      x -= 1;
    }
    if (this.keyboardKeys.has('KeyD') || this.keyboardKeys.has('ArrowRight')) {
      x += 1;
    }
    if (this.keyboardKeys.has('KeyW') || this.keyboardKeys.has('ArrowUp')) {
      y += 1;
    }
    if (this.keyboardKeys.has('KeyS') || this.keyboardKeys.has('ArrowDown')) {
      y -= 1;
    }

    const len = Math.hypot(x, y);
    if (len > 1) {
      x /= len;
      y /= len;
    }
    return { x, y };
  }

  private stepSimulation(dt: number): void {
    const time = performance.now() * 0.001;

    // Drift clouds gently
    for (const c of this.clouds) {
      c.group.position.x = c.baseX + Math.sin(time * c.speed + c.phase) * 2.2;
    }

    // Rotate finish trophy
    if (this.trophyGroup) {
      this.trophyGroup.rotation.y += dt * 1.1;
    }

    // Animate stage bridges, billboards, flags, and falling wrong pads
    for (const s of this.stages) {
      if (s.flagMesh) {
        s.flagMesh.rotation.y = Math.sin(time * 3.5 + s.index) * 0.22;
      }
      if (s.solved && s.bridgeProgress < 1) {
        s.bridgeProgress = Math.min(1, s.bridgeProgress + dt * 4.5);
        const ease = 1 - Math.pow(1 - s.bridgeProgress, 3);
        s.bridgeMesh.position.y =
          s.bridgeBox.topY - 0.225 - (1 - ease) * 2.8;
      }
      for (const pad of s.pads) {
        if (pad.state === 'falling') {
          if (pad.shakeTime > 0) {
            pad.shakeTime -= dt;
            pad.visual.group.position.x =
              [-4.0, 0, 4.0][pad.visual.choiceIndex] +
              Math.sin(time * 65) * 0.14;
          } else {
            pad.fallVelocity += 24 * dt;
            pad.visual.group.position.y -= pad.fallVelocity * dt;
            pad.visual.group.rotation.x += dt * 1.4;
          }
        }
      }
    }

    // Update particle bursts
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.velocity.y -= 18 * dt;
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.x += dt * 6;
      p.mesh.rotation.y += dt * 5;
      const remain = 1 - p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(0.05, remain));
    }

    if (this.feedbackTimer > 0) {
      this.feedbackTimer -= dt;
      if (this.feedbackTimer <= 0 && this.feedbackBanner) {
        this.feedbackBanner = null;
        this.emitHud();
      }
    }

    if (this.phase === 'playing') {
      this.elapsedSeconds += dt;
      this.hudSyncTimer += dt;
      if (this.hudSyncTimer >= 0.5) {
        this.hudSyncTimer = 0;
        this.emitHud();
      }
    }

    // Player movement & physics (active in playing, gentle idle in menu/finished)
    if (this.phase === 'playing') {
      const input = this.getEffectiveInput();
      const hasInput = Math.hypot(input.x, input.y) > 0.08;

      // Camera-relative directions
      _forward.set(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
      _right.set(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

      _moveDir.set(0, 0, 0);
      _moveDir.addScaledVector(_forward, input.y);
      _moveDir.addScaledVector(_right, input.x);
      if (_moveDir.lengthSq() > 0.001) {
        _moveDir.normalize();
      }

      const maxSpeed = 7.4;
      const accel = this.grounded ? 36 : 22;
      const targetVx = _moveDir.x * maxSpeed;
      const targetVz = _moveDir.z * maxSpeed;

      this.playerVel.x = THREE.MathUtils.damp(
        this.playerVel.x,
        targetVx,
        accel * 0.4,
        dt,
      );
      this.playerVel.z = THREE.MathUtils.damp(
        this.playerVel.z,
        targetVz,
        accel * 0.4,
        dt,
      );

      if (hasInput) {
        const targetYaw = Math.atan2(-_moveDir.x, -_moveDir.z);
        let diff = targetYaw - this.playerYaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerYaw += diff * Math.min(1, dt * 14);
      }

      // Coyote time & jump buffering
      if (this.grounded) {
        this.coyoteTimer = 0.14;
      } else {
        this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
      }
      if (this.jumpBufferTimer > 0) {
        this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
      }

      if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
        this.playerVel.y = 12.2;
        this.grounded = false;
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        soundEngine.playJump();
        this.spawnBurst(this.playerPos, 6, 2.5);
      }

      // Gravity
      this.playerVel.y -= 28 * dt;

      // Horizontal step + barrier collision check
      const playerRadius = 0.36;
      const nextX = this.playerPos.x + this.playerVel.x * dt;
      const nextZ = this.playerPos.z + this.playerVel.z * dt;

      let blockedZ = false;
      for (const box of this.allColliders) {
        if (!box.active || box.kind !== 'barrier') continue;
        if (
          nextX + playerRadius > box.minX &&
          nextX - playerRadius < box.maxX &&
          nextZ + playerRadius > box.minZ &&
          nextZ - playerRadius < box.maxZ &&
          this.playerPos.y < box.topY
        ) {
          blockedZ = true;
          break;
        }
      }
      this.playerPos.x = nextX;
      if (!blockedZ) {
        this.playerPos.z = nextZ;
      } else {
        this.playerVel.z = 0;
      }

      // Vertical step + platform landing
      const prevY = this.playerPos.y;
      const nextY = prevY + this.playerVel.y * dt;
      let landedBox: AabbBox | null = null;
      let bestTopY = -Infinity;

      for (const box of this.allColliders) {
        if (!box.active || box.kind === 'barrier') continue;
        const withinXZ =
          this.playerPos.x + playerRadius > box.minX &&
          this.playerPos.x - playerRadius < box.maxX &&
          this.playerPos.z + playerRadius > box.minZ &&
          this.playerPos.z - playerRadius < box.maxZ;
        if (!withinXZ) continue;

        if (
          this.playerVel.y <= 0 &&
          prevY >= box.topY - 0.32 &&
          nextY <= box.topY + 0.06
        ) {
          if (box.topY > bestTopY) {
            bestTopY = box.topY;
            landedBox = box;
          }
        }
      }

      if (landedBox) {
        if (!this.grounded && this.playerVel.y < -4) {
          soundEngine.playLand();
        }
        this.playerPos.y = bestTopY;
        this.playerVel.y = 0;
        this.grounded = true;
        this.handleLandedOnBox(landedBox);
      } else {
        this.playerPos.y = nextY;
        this.grounded = false;
      }

      // Check fall out of sky
      const currentCp =
        this.stages[this.reachedCheckpointIndex]?.checkpointPos ?? _tempVec.set(0, 0, 0);
      if (this.playerPos.y < currentCp.y - 9.5) {
        const activeStage = this.stages[this.activeStageIndex];
        if (activeStage) activeStage.falls++;
        this.totalFalls++;
        this.streak = 0;
        soundEngine.playFall();
        this.playerPos.set(currentCp.x, currentCp.y + 0.8, currentCp.z + 0.8);
        this.playerVel.set(0, 0, 0);
        this.grounded = false;
        this.respawnFlashTimer = 0.65;
        if (!this.feedbackBanner || this.feedbackBanner.kind !== 'wrong') {
          this.showFeedback(
            'fall',
            '아래로 떨어졌어요! 다시 출발!',
            '안전한 체크포인트 발판으로 돌아왔어요.',
          );
        } else {
          this.emitHud();
        }
      }
    }

    // Character Transform & Procedural Limb Animation
    this.character.root.position.copy(this.playerPos);
    this.character.root.rotation.y = this.playerYaw;

    if (this.respawnFlashTimer > 0) {
      this.respawnFlashTimer -= dt;
      this.character.root.visible = Math.floor(this.respawnFlashTimer * 18) % 2 === 0;
    } else {
      this.character.root.visible = true;
    }

    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.phase === 'finished') {
      // Celebration jump loop
      const hop = Math.abs(Math.sin(time * 5.2)) * 0.55;
      this.character.bodyPivot.position.y = hop;
      this.character.leftArm.rotation.x = -2.4 + Math.sin(time * 8) * 0.3;
      this.character.rightArm.rotation.x = -2.4 - Math.sin(time * 8) * 0.3;
      this.character.leftLeg.rotation.x = 0;
      this.character.rightLeg.rotation.x = 0;
    } else if (!this.grounded) {
      // Jump pose
      this.character.bodyPivot.position.y = 0;
      this.character.leftArm.rotation.x = THREE.MathUtils.damp(
        this.character.leftArm.rotation.x,
        -2.2,
        12,
        dt,
      );
      this.character.rightArm.rotation.x = THREE.MathUtils.damp(
        this.character.rightArm.rotation.x,
        -2.2,
        12,
        dt,
      );
      this.character.leftLeg.rotation.x = 0.45;
      this.character.rightLeg.rotation.x = -0.35;
    } else if (horizSpeed > 0.35 && this.phase === 'playing') {
      // Walk / run cycle
      this.walkPhase += dt * horizSpeed * 2.1;
      const swing = Math.sin(this.walkPhase) * 0.85;
      this.character.bodyPivot.position.y =
        Math.abs(Math.cos(this.walkPhase)) * 0.08;
      this.character.leftLeg.rotation.x = swing;
      this.character.rightLeg.rotation.x = -swing;
      this.character.leftArm.rotation.x = -swing * 0.8;
      this.character.rightArm.rotation.x = swing * 0.8;
    } else {
      // Calm idle bob
      this.character.bodyPivot.position.y = Math.sin(time * 2.4) * 0.03;
      this.character.leftLeg.rotation.x = THREE.MathUtils.damp(
        this.character.leftLeg.rotation.x,
        0,
        10,
        dt,
      );
      this.character.rightLeg.rotation.x = THREE.MathUtils.damp(
        this.character.rightLeg.rotation.x,
        0,
        10,
        dt,
      );
      this.character.leftArm.rotation.x = THREE.MathUtils.damp(
        this.character.leftArm.rotation.x,
        0,
        10,
        dt,
      );
      this.character.rightArm.rotation.x = THREE.MathUtils.damp(
        this.character.rightArm.rotation.x,
        0,
        10,
        dt,
      );
    }

    // Contact shadow tracking directly beneath player onto nearest active surface
    let shadowSurfaceY = -999;
    for (const box of this.allColliders) {
      if (!box.active || box.kind === 'barrier') continue;
      if (
        this.playerPos.x >= box.minX - 0.1 &&
        this.playerPos.x <= box.maxX + 0.1 &&
        this.playerPos.z >= box.minZ - 0.1 &&
        this.playerPos.z <= box.maxZ + 0.1 &&
        box.topY <= this.playerPos.y + 0.15
      ) {
        if (box.topY > shadowSurfaceY) {
          shadowSurfaceY = box.topY;
        }
      }
    }
    if (shadowSurfaceY > -900) {
      const heightAbove = Math.max(0, this.playerPos.y - shadowSurfaceY);
      this.contactShadow.visible = true;
      this.contactShadow.position.set(
        this.playerPos.x,
        shadowSurfaceY + 0.04,
        this.playerPos.z,
      );
      const scale = Math.max(0.45, 1 - heightAbove * 0.12);
      this.contactShadow.scale.setScalar(scale);
      (this.contactShadow.material as THREE.MeshBasicMaterial).opacity =
        Math.max(0.16, 0.58 - heightAbove * 0.1);
    } else {
      this.contactShadow.visible = false;
    }

    // Keep directional light shadow frustum centered near player
    this.keyLight.position.set(
      this.playerPos.x + 14,
      this.playerPos.y + 26,
      this.playerPos.z + 10,
    );
    this.keyLight.target.position.set(
      this.playerPos.x,
      this.playerPos.y,
      this.playerPos.z - 6,
    );
    this.keyLight.target.updateMatrixWorld();

    // Smooth third-person Obby camera follow
    const camDist = this.phase === 'menu' ? 11.2 : 9.8;
    const camHeight = this.phase === 'menu' ? 5.8 : 5.4;
    _camDesiredPos.set(
      this.playerPos.x + Math.sin(this.cameraYaw) * camDist,
      this.playerPos.y + camHeight,
      this.playerPos.z + Math.cos(this.cameraYaw) * camDist,
    );
    _camLookTarget.set(
      this.playerPos.x - Math.sin(this.cameraYaw) * 4.2,
      this.playerPos.y + 1.8,
      this.playerPos.z - Math.cos(this.cameraYaw) * 4.2,
    );

    this.cameraPos.x = THREE.MathUtils.damp(
      this.cameraPos.x,
      _camDesiredPos.x,
      7.5,
      dt,
    );
    this.cameraPos.y = THREE.MathUtils.damp(
      this.cameraPos.y,
      _camDesiredPos.y,
      6.5,
      dt,
    );
    this.cameraPos.z = THREE.MathUtils.damp(
      this.cameraPos.z,
      _camDesiredPos.z,
      7.5,
      dt,
    );
    this.cameraTarget.x = THREE.MathUtils.damp(
      this.cameraTarget.x,
      _camLookTarget.x,
      9,
      dt,
    );
    this.cameraTarget.y = THREE.MathUtils.damp(
      this.cameraTarget.y,
      _camLookTarget.y,
      9,
      dt,
    );
    this.cameraTarget.z = THREE.MathUtils.damp(
      this.cameraTarget.z,
      _camLookTarget.z,
      9,
      dt,
    );

    this.camera.position.copy(this.cameraPos);
    this.camera.lookAt(this.cameraTarget);
  }

  private emitHud(): void {
    const totalStages = this.problems.length;
    const currentProblem = this.problems[this.activeStageIndex] ?? null;
    this.onHudUpdate({
      phase: this.phase,
      courseMode: this.courseMode,
      currentStage: this.activeStageIndex,
      totalStages,
      score: this.score,
      maxPossibleScore: totalStages * 120,
      streak: this.streak,
      bestStreak: this.bestStreak,
      totalWrongAttempts: this.totalWrongAttempts,
      totalFalls: this.totalFalls,
      elapsedSeconds: Math.floor(this.elapsedSeconds),
      currentProblem,
      feedbackBanner: this.feedbackBanner,
      outcomes: [...this.outcomes],
    });
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private scheduleNextTick(): void {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private tick(): void {
    if (this.disposed) return;
    const now = performance.now();
    const dt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;

    this.stepSimulation(dt);
    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.handleResizeBound);
    window.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('keyup', this.handleKeyUpBound);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDownBound);
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
    dom.removeEventListener('webglcontextlost', this.handleContextLostBound);
    dom.removeEventListener(
      'webglcontextrestored',
      this.handleContextRestoredBound,
    );

    this.clearWorld();
    for (const p of this.particles) {
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.contactShadow.geometry.dispose();
    (this.contactShadow.material as THREE.Material).dispose();

    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
