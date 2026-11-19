import * as THREE from 'three';
import {
  createAnswerTileTexture,
  createBillboardTexture,
  createCheckerboardTexture,
  createStudTexture,
  createZoneBannerTexture,
} from './textures';
import type { MathProblem, ZoneMeta } from '../types/game';

export interface CharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
}

/**
 * Composite 10+ part Roblox-inspired explorer character.
 * Pivoted strictly at bottom-center (y = 0 at soles of sneakers).
 */
export function createObbyCharacter(): CharacterRig {
  const root = new THREE.Group();
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffd19c,
    roughness: 0.55,
    metalness: 0.02,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.68,
    metalness: 0.04,
  });
  const stripeMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.4,
    metalness: 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.72,
    metalness: 0.05,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.45,
    metalness: 0.05,
  });
  const soleMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.85,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.35,
    metalness: 0.08,
  });
  const backpackMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    roughness: 0.55,
    metalness: 0.05,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.2,
    metalness: 0.85,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.2,
  });

  // Helper to build articulated leg (pivot at hip y = 0.78)
  const buildLeg = (xOffset: number): THREE.Group => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.78, 0);

    const thigh = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.58, 0.38),
      pantsMat,
    );
    thigh.position.y = -0.3;
    thigh.castShadow = true;
    legPivot.add(thigh);

    const sneaker = new THREE.Mesh(
      new THREE.BoxGeometry(0.38, 0.14, 0.48),
      shoeMat,
    );
    sneaker.position.set(0, -0.65, 0.04);
    sneaker.castShadow = true;
    legPivot.add(sneaker);

    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.06, 0.5),
      soleMat,
    );
    sole.position.set(0, -0.75, 0.04);
    legPivot.add(sole);

    return legPivot;
  };

  const leftLeg = buildLeg(-0.22);
  const rightLeg = buildLeg(0.22);
  bodyPivot.add(leftLeg, rightLeg);

  // Torso (y from 0.78 to 1.56)
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.78, 0.48),
    shirtMat,
  );
  torso.position.y = 1.17;
  torso.castShadow = true;
  torso.receiveShadow = true;
  bodyPivot.add(torso);

  // Chest star emblem / stripe
  const chestStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.16, 0.5),
    stripeMat,
  );
  chestStripe.position.y = 1.18;
  bodyPivot.add(chestStripe);

  // Backpack on back (+Z is backward or -Z is forward; character faces -Z)
  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 0.58, 0.28),
    backpackMat,
  );
  backpack.position.set(0, 1.18, 0.35);
  backpack.castShadow = true;
  bodyPivot.add(backpack);

  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.06),
    metalMat,
  );
  buckle.position.set(0, 1.24, 0.49);
  bodyPivot.add(buckle);

  // Articulated arms (pivot at shoulder y = 1.48)
  const buildArm = (xOffset: number): THREE.Group => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.48, 0);

    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.46, 0.3),
      shirtMat,
    );
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.24, 0.26),
      skinMat,
    );
    hand.position.y = -0.56;
    hand.castShadow = true;
    armPivot.add(hand);

    return armPivot;
  };

  const leftArm = buildArm(-0.6);
  const rightArm = buildArm(0.6);
  bodyPivot.add(leftArm, rightArm);

  // Head group (pivot at neck y = 1.6)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.6, 0);
  bodyPivot.add(headGroup);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.58, 0.6),
    skinMat,
  );
  head.position.y = 0.29;
  head.castShadow = true;
  headGroup.add(head);

  // Eyes (facing -Z toward the Obby course ahead)
  const eyeGeo = new THREE.BoxGeometry(0.08, 0.12, 0.04);
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.14, 0.32, -0.3);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.14, 0.32, -0.3);
  headGroup.add(leftEye, rightEye);

  // Smile
  const smile = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.05, 0.04),
    eyeMat,
  );
  smile.position.set(0, 0.16, -0.3);
  headGroup.add(smile);

  // Cap crown & visor
  const capCrown = new THREE.Mesh(
    new THREE.BoxGeometry(0.68, 0.22, 0.64),
    capMat,
  );
  capCrown.position.y = 0.58;
  capCrown.castShadow = true;
  headGroup.add(capCrown);

  const capVisor = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.06, 0.28),
    capMat,
  );
  capVisor.position.set(0, 0.5, -0.42);
  capVisor.castShadow = true;
  headGroup.add(capVisor);

  return {
    root,
    bodyPivot,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
  };
}

export interface AnswerPadVisual {
  group: THREE.Group;
  choiceIndex: number;
  value: number;
  isCorrect: boolean;
  topMesh: THREE.Mesh;
  baseMesh: THREE.Mesh;
  trimMesh: THREE.Mesh;
  normalTopMat: THREE.MeshStandardMaterial;
  correctTopMat: THREE.MeshStandardMaterial;
  wrongTopMat: THREE.MeshStandardMaterial;
}

export function createAnswerPad(
  choiceValue: number,
  choiceIndex: number,
  isCorrect: boolean,
  padColorHex: string,
  trimColorHex: string,
  maxAnisotropy: number,
): AnswerPadVisual {
  const group = new THREE.Group();

  // Base block (3.4 x 0.7 x 3.4)
  const baseGeo = new THREE.BoxGeometry(3.4, 0.58, 3.4);
  const baseMat = new THREE.MeshStandardMaterial({
    color: padColorHex,
    roughness: 0.45,
    metalness: 0.08,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -0.39;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Trim collar around top edge (top face at y = -0.04, cleanly separated from topMesh)
  const trimGeo = new THREE.BoxGeometry(3.56, 0.14, 3.56);
  const trimMat = new THREE.MeshStandardMaterial({
    color: trimColorHex,
    roughness: 0.35,
    metalness: 0.18,
  });
  const trimMesh = new THREE.Mesh(trimGeo, trimMat);
  trimMesh.position.y = -0.11;
  trimMesh.receiveShadow = true;
  group.add(trimMesh);

  // Top number plate (top face cleanly at y = 0.00, 0.04 above trimMesh)
  const normalTopMat = new THREE.MeshStandardMaterial({
    map: createAnswerTileTexture(
      choiceValue,
      padColorHex,
      trimColorHex,
      maxAnisotropy,
      'normal',
    ),
    roughness: 0.4,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const correctTopMat = new THREE.MeshStandardMaterial({
    map: createAnswerTileTexture(
      choiceValue,
      padColorHex,
      trimColorHex,
      maxAnisotropy,
      'correct',
    ),
    roughness: 0.3,
    metalness: 0.08,
    emissive: 0x059669,
    emissiveIntensity: 0.25,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const wrongTopMat = new THREE.MeshStandardMaterial({
    map: createAnswerTileTexture(
      choiceValue,
      padColorHex,
      trimColorHex,
      maxAnisotropy,
      'wrong',
    ),
    roughness: 0.6,
    transparent: true,
    opacity: 0.78,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const topMesh = new THREE.Mesh(
    new THREE.BoxGeometry(3.32, 0.08, 3.32),
    normalTopMat,
  );
  topMesh.position.y = -0.04;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // Four subtle corner bumper studs
  const cornerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.3,
    metalness: 0.2,
  });
  const cornerGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 12);
  const offsets = [-1.58, 1.58];
  for (const cx of offsets) {
    for (const cz of offsets) {
      const bumper = new THREE.Mesh(cornerGeo, cornerMat);
      bumper.position.set(cx, 0.04, cz);
      group.add(bumper);
    }
  }

  return {
    group,
    choiceIndex,
    value: choiceValue,
    isCorrect,
    topMesh,
    baseMesh,
    trimMesh,
    normalTopMat,
    correctTopMat,
    wrongTopMat,
  };
}

export function createCheckpointPlatform(
  width: number,
  depth: number,
  zone: ZoneMeta,
  maxAnisotropy: number,
  withFlag = true,
  withZoneArch = false,
): { group: THREE.Group; flagMesh?: THREE.Mesh } {
  const group = new THREE.Group();

  const studTex = createStudTexture(
    zone.platformHex,
    '#ffffff',
    maxAnisotropy,
  );

  // Main deck (top surface at y = 0)
  const deckMat = new THREE.MeshStandardMaterial({
    map: studTex,
    roughness: 0.42,
    metalness: 0.05,
  });
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(width, 0.65, depth),
    deckMat,
  );
  deck.position.y = -0.325;
  deck.castShadow = true;
  deck.receiveShadow = true;
  group.add(deck);

  // Trim rail
  const trimMat = new THREE.MeshStandardMaterial({
    color: zone.trimHex,
    roughness: 0.35,
    metalness: 0.15,
  });
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.24, 0.16, depth + 0.24),
    trimMat,
  );
  trim.position.y = -0.1;
  trim.receiveShadow = true;
  group.add(trim);

  // Glowing checkpoint pad center ring
  const padRing = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.04, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
    }),
  );
  padRing.position.set(0, 0.015, 0);
  padRing.receiveShadow = true;
  group.add(padRing);

  let flagMesh: THREE.Mesh | undefined;
  if (withFlag) {
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.85,
    });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.7, 10),
      poleMat,
    );
    pole.position.set(-width / 2 + 0.55, 1.35, -depth / 2 + 0.55);
    pole.castShadow = true;
    group.add(pole);

    const finial = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        roughness: 0.25,
        metalness: 0.75,
      }),
    );
    finial.position.set(-width / 2 + 0.55, 2.75, -depth / 2 + 0.55);
    group.add(finial);

    flagMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 0.52, 0.06),
      new THREE.MeshStandardMaterial({
        color: zone.accentHex,
        roughness: 0.5,
      }),
    );
    flagMesh.position.set(-width / 2 + 1.05, 2.38, -depth / 2 + 0.55);
    flagMesh.castShadow = true;
    group.add(flagMesh);
  }

  if (withZoneArch) {
    // Side-mounted signpost outside the platform corridor so it never blocks the camera
    const signGroup = new THREE.Group();
    signGroup.position.set(-width / 2 - 1.55, 0, -depth / 2 + 0.6);
    signGroup.rotation.y = 0.35;

    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 2.3, 10),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.4,
        metalness: 0.15,
      }),
    );
    post.position.y = 1.15;
    post.castShadow = true;

    const bannerTex = createZoneBannerTexture(
      zone.title,
      zone.subtitle,
      zone.accentHex,
      maxAnisotropy,
    );
    const sideSign = new THREE.Mesh(
      new THREE.BoxGeometry(2.9, 0.95, 0.18),
      new THREE.MeshStandardMaterial({
        map: bannerTex,
        roughness: 0.35,
      }),
    );
    sideSign.position.set(0, 2.25, 0);
    sideSign.castShadow = true;

    signGroup.add(post, sideSign);
    group.add(signGroup);
  }

  return { group, flagMesh };
}

export function createQuestionBillboard(
  problem: MathProblem,
  stageNum: number,
  totalStages: number,
  zone: ZoneMeta,
  maxAnisotropy: number,
): THREE.Group {
  const group = new THREE.Group();
  const tex = createBillboardTexture(
    stageNum,
    totalStages,
    problem.expression,
    zone.title,
    zone.accentHex,
    maxAnisotropy,
  );

  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 1.85, 10),
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.3,
      metalness: 0.6,
    }),
  );
  post.position.y = 0.92;
  post.castShadow = true;
  group.add(post);

  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.4, 1.35, 0.16),
    [
      new THREE.MeshStandardMaterial({ color: zone.trimHex, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: zone.trimHex, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: zone.trimHex, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({ color: zone.trimHex, roughness: 0.4 }),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.35,
        emissive: 0xffffff,
        emissiveMap: tex,
        emissiveIntensity: 0.14,
      }),
      new THREE.MeshStandardMaterial({ color: zone.trimHex, roughness: 0.4 }),
    ],
  );
  board.position.y = 2.05;
  board.castShadow = true;
  group.add(board);
  return group;
}

export function createFinishPodium(maxAnisotropy: number): {
  group: THREE.Group;
  trophyGroup: THREE.Group;
} {
  const group = new THREE.Group();
  const checkerTex = createCheckerboardTexture(maxAnisotropy);

  // Main finish platform (top at y = 0)
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(11.5, 0.85, 10),
    new THREE.MeshStandardMaterial({
      map: checkerTex,
      roughness: 0.4,
      metalness: 0.08,
    }),
  );
  deck.position.y = -0.425;
  deck.receiveShadow = true;
  deck.castShadow = true;
  group.add(deck);

  // Golden border trim
  const goldTrim = new THREE.Mesh(
    new THREE.BoxGeometry(11.9, 0.22, 10.4),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.22,
      metalness: 0.85,
    }),
  );
  goldTrim.position.y = -0.14;
  group.add(goldTrim);

  // Podium pedestal at center-back
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.7, 0.9, 24),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.1,
    }),
  );
  pedestal.position.set(0, 0.45, -2.5);
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  group.add(pedestal);

  // Composite Gold Trophy using LatheGeometry
  const trophyGroup = new THREE.Group();
  trophyGroup.position.set(0, 0.92, -2.5);

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.18,
    metalness: 0.92,
  });

  const points = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.65, 0),
    new THREE.Vector2(0.55, 0.22),
    new THREE.Vector2(0.2, 0.35),
    new THREE.Vector2(0.18, 0.85),
    new THREE.Vector2(0.75, 1.35),
    new THREE.Vector2(0.85, 2.05),
    new THREE.Vector2(0.68, 2.05),
    new THREE.Vector2(0.55, 1.45),
    new THREE.Vector2(0, 1.25),
  ];
  const cup = new THREE.Mesh(new THREE.LatheGeometry(points, 24), goldMat);
  cup.castShadow = true;
  trophyGroup.add(cup);

  // Trophy handles
  const handleGeo = new THREE.TorusGeometry(0.32, 0.08, 10, 20, Math.PI);
  const leftHandle = new THREE.Mesh(handleGeo, goldMat);
  leftHandle.position.set(-0.72, 1.65, 0);
  leftHandle.rotation.z = Math.PI / 2;
  const rightHandle = new THREE.Mesh(handleGeo, goldMat);
  rightHandle.position.set(0.72, 1.65, 0);
  rightHandle.rotation.z = -Math.PI / 2;
  trophyGroup.add(leftHandle, rightHandle);

  // Floating star crown above trophy
  const starGeo = new THREE.OctahedronGeometry(0.42, 0);
  const star = new THREE.Mesh(starGeo, goldMat);
  star.position.y = 2.65;
  trophyGroup.add(star);

  group.add(trophyGroup);

  // Finish banner arch
  const archTex = createZoneBannerTexture(
    '수학 오비 완주 성공!',
    '모든 2학년 심화 수학 문제를 멋지게 풀었어요!',
    '#eab308',
    maxAnisotropy,
  );
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.28,
    metalness: 0.75,
  });
  const leftP = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.6, 0.55), pillarMat);
  leftP.position.set(-5.2, 2.3, 3.8);
  leftP.castShadow = true;
  const rightP = new THREE.Mesh(new THREE.BoxGeometry(0.55, 4.6, 0.55), pillarMat);
  rightP.position.set(5.2, 2.3, 3.8);
  rightP.castShadow = true;
  const sign = new THREE.Mesh(
    new THREE.BoxGeometry(10.8, 1.7, 0.35),
    new THREE.MeshStandardMaterial({ map: archTex, roughness: 0.3 }),
  );
  sign.position.set(0, 4.8, 3.8);
  sign.castShadow = true;
  group.add(leftP, rightP, sign);

  return { group, trophyGroup };
}

export interface CloudDriftItem {
  group: THREE.Group;
  baseX: number;
  speed: number;
  phase: number;
}

export function createSkyDecorations(courseLengthZ: number): {
  group: THREE.Group;
  clouds: CloudDriftItem[];
} {
  const group = new THREE.Group();
  const clouds: CloudDriftItem[] = [];

  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.92,
    metalness: 0.0,
  });

  // Flanking floating clouds
  for (let i = 0; i < 36; i++) {
    const cloud = new THREE.Group();
    const puffCount = 3 + (i % 3);
    for (let p = 0; p < puffCount; p++) {
      const r = 1.6 + ((i + p) % 3) * 0.65;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), cloudMat);
      puff.position.set((p - 1) * 1.6, ((p % 2) * 0.5), ((p % 3) - 1) * 0.6);
      puff.scale.y = 0.68;
      cloud.add(puff);
    }
    const side = i % 2 === 0 ? -1 : 1;
    const baseX = side * (16 + (i % 5) * 7.5);
    const y = -6 + (i % 6) * 3.8;
    const z = 12 - (i / 36) * (courseLengthZ + 55);
    cloud.position.set(baseX, y, z);
    group.add(cloud);
    clouds.push({
      group: cloud,
      baseX,
      speed: 0.25 + (i % 4) * 0.08,
      phase: i * 1.1,
    });
  }

  // Distant floating blocky sky islands with trees
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    roughness: 0.78,
  });
  const dirtMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.88,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.9,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.75,
  });

  for (let i = 0; i < 16; i++) {
    const island = new THREE.Group();
    const w = 5.5 + (i % 3) * 2.2;
    const grass = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, w), grassMat);
    grass.position.y = 0;
    const dirt = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.82, 2.1, w * 0.82),
      dirtMat,
    );
    dirt.position.y = -1.45;
    island.add(grass, dirt);

    // Blocky tree on island
    const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), trunkMat);
    trunk.position.set(0.5, 1.5, 0);
    const leavesBottom = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 1.6, 2.6),
      leafMat,
    );
    leavesBottom.position.set(0.5, 2.9, 0);
    const leavesTop = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.2, 1.7),
      leafMat,
    );
    leavesTop.position.set(0.5, 4.1, 0);
    island.add(trunk, leavesBottom, leavesTop);

    const side = i % 2 === 0 ? -1 : 1;
    island.position.set(
      side * (22 + (i % 4) * 6),
      -4 + (i % 5) * 2.5,
      6 - (i / 16) * (courseLengthZ + 40),
    );
    group.add(island);
  }

  return { group, clouds };
}
