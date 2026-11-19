import * as THREE from 'three';

function applyTextureQuality(
  tex: THREE.CanvasTexture,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1,
): THREE.CanvasTexture {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, maxAnisotropy || 4);
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createStudTexture(
  baseHex: string,
  studHighlightHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  const cell = 32;
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const cx = x + cell / 2;
      const cy = y + cell / 2;
      // Subtle shadow beneath stud
      ctx.fillStyle = 'rgba(0,0,0,0.16)';
      ctx.beginPath();
      ctx.arc(cx, cy + 2, 9.5, 0, Math.PI * 2);
      ctx.fill();

      // Stud body
      ctx.fillStyle = baseHex;
      ctx.beginPath();
      ctx.arc(cx, cy, 9, 0, Math.PI * 2);
      ctx.fill();

      // Stud rim highlight
      ctx.strokeStyle = studHighlightHex;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy - 0.5, 8.5, Math.PI * 0.9, Math.PI * 2.1);
      ctx.stroke();
    }
  }

  return applyTextureQuality(new THREE.CanvasTexture(canvas), maxAnisotropy, 2, 2);
}

export function createAnswerTileTexture(
  value: number,
  bgHex: string,
  rimHex: string,
  maxAnisotropy: number,
  state: 'normal' | 'correct' | 'wrong' = 'normal',
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base plate
  ctx.fillStyle =
    state === 'correct' ? '#10b981' : state === 'wrong' ? '#ef4444' : '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Outer colorful frame
  ctx.strokeStyle =
    state === 'correct' ? '#047857' : state === 'wrong' ? '#b91c1c' : rimHex;
  ctx.lineWidth = 38;
  ctx.strokeRect(19, 19, size - 38, size - 38);

  // Inner soft tint card
  ctx.fillStyle =
    state === 'correct'
      ? '#ecfdf5'
      : state === 'wrong'
        ? '#fef2f2'
        : bgHex;
  ctx.beginPath();
  ctx.roundRect(48, 48, size - 96, size - 96, 44);
  ctx.fill();

  // Subtle corner studs
  const studOffsets = [86, size - 86];
  for (const sx of studOffsets) {
    for (const sy of studOffsets) {
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Crisp high-contrast number
  const text = String(value);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tileFontSize = text.length >= 3 ? 162 : text.length === 2 ? 205 : 250;
  ctx.font = `900 ${tileFontSize}px "Outfit", "Noto Sans KR", sans-serif`;

  // Dark drop outline for maximum legibility
  ctx.lineWidth = 18;
  ctx.strokeStyle =
    state === 'correct'
      ? '#064e3b'
      : state === 'wrong'
        ? '#7f1d1d'
        : '#0f172a';
  ctx.strokeText(text, size / 2, size / 2 + 8);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, size / 2, size / 2 + 8);

  if (state === 'correct') {
    ctx.font = '800 54px "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#065f46';
    ctx.fillText('정답!', size / 2, size - 84);
  } else if (state === 'wrong') {
    ctx.font = '800 54px "Noto Sans KR", sans-serif';
    ctx.fillStyle = '#991b1b';
    ctx.fillText('앗! 땡!', size / 2, size - 84);
  }

  return applyTextureQuality(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

export function createBillboardTexture(
  stageNum: number,
  totalStages: number,
  expression: string,
  zoneTitle: string,
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 1024;
  const h = 384;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // White crisp board
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 42);
  ctx.fill();

  // Outer accent border
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.roundRect(12, 12, w - 24, h - 24, 34);
  ctx.stroke();

  // Top header strip
  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.roundRect(30, 28, w - 60, 74, 22);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 34px "Noto Sans KR", "Outfit", sans-serif';
  ctx.fillText(
    `문제 ${stageNum} / ${totalStages}   ·   ${zoneTitle}`,
    w / 2,
    66,
  );

  // Main math expression (auto-scale for multi-step 2nd-grade equations)
  const exprFontSize =
    expression.length > 13 ? 88 : expression.length > 10 ? 106 : 128;
  ctx.fillStyle = '#0f172a';
  ctx.font = `900 ${exprFontSize}px "Outfit", "Noto Sans KR", sans-serif`;
  ctx.fillText(expression, w / 2, 240);

  return applyTextureQuality(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

export function createZoneBannerTexture(
  zoneTitle: string,
  subtitle: string,
  accentHex: string,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const w = 1024;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = accentHex;
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 36);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.roundRect(14, 14, w - 28, h - 28, 28);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 66px "Noto Sans KR", "Outfit", sans-serif';
  ctx.fillText(zoneTitle, w / 2, 102);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = '600 38px "Noto Sans KR", sans-serif';
  ctx.fillText(subtitle, w / 2, 178);

  return applyTextureQuality(new THREE.CanvasTexture(canvas), maxAnisotropy);
}

export function createCheckerboardTexture(
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cells = 8;
  const step = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#0f172a' : '#f8fafc';
      ctx.fillRect(x * step, y * step, step, step);
    }
  }
  return applyTextureQuality(new THREE.CanvasTexture(canvas), maxAnisotropy, 2, 2);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    6,
    size / 2,
    size / 2,
    size / 2,
  );
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.25)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSkyGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.45, '#7dd3fc');
  grad.addColorStop(0.75, '#e0f2fe');
  grad.addColorStop(1, '#fef3c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 16, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
