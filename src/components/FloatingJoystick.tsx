import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Compass, RotateCcw } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import type { InputVector } from '../types/game';

interface FloatingJoystickProps {
  onVectorChange: (vec: InputVector) => void;
  onJump: () => void;
  onResetCamera: () => void;
  onRespawn: () => void;
}

export const FloatingJoystick: React.FC<FloatingJoystickProps> = ({
  onVectorChange,
  onJump,
  onResetCamera,
  onRespawn,
}) => {
  const baseRef = useRef<HTMLDivElement>(null);
  const activePointerId = useRef<number | null>(null);
  const [knobOffset, setKnobOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [jumpPressed, setJumpPressed] = useState(false);
  const [keyEcho, setKeyEcho] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });

  const maxRadius = 46;

  // Echo physical keyboard arrows / WASD on the floating joystick so desktop users get tactile feedback too
  useEffect(() => {
    const pressed = new Set<string>();
    const syncEcho = () => {
      let x = 0;
      let y = 0;
      if (pressed.has('ArrowLeft') || pressed.has('KeyA')) x -= 1;
      if (pressed.has('ArrowRight') || pressed.has('KeyD')) x += 1;
      if (pressed.has('ArrowUp') || pressed.has('KeyW')) y -= 1;
      if (pressed.has('ArrowDown') || pressed.has('KeyS')) y += 1;
      const len = Math.hypot(x, y);
      if (len > 1) {
        x /= len;
        y /= len;
      }
      setKeyEcho({ x: x * maxRadius * 0.85, y: y * maxRadius * 0.85 });
    };

    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') setJumpPressed(true);
      pressed.add(e.code);
      syncEcho();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setJumpPressed(false);
      pressed.delete(e.code);
      syncEcho();
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  const updateFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = baseRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      let dx = clientX - centerX;
      let dy = clientY - centerY;
      const dist = Math.hypot(dx, dy);
      if (dist > maxRadius) {
        dx = (dx / dist) * maxRadius;
        dy = (dy / dist) * maxRadius;
      }
      setKnobOffset({ x: dx, y: dy });
      // Screen Y down is negative forward in game space
      onVectorChange({
        x: dx / maxRadius,
        y: -dy / maxRadius,
      });
    },
    [onVectorChange],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    soundEngine.unlock();
    if (activePointerId.current !== null) return;
    activePointerId.current = e.pointerId;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromClientPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.stopPropagation();
    updateFromClientPoint(e.clientX, e.clientY);
  };

  const releaseJoystick = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activePointerId.current !== e.pointerId) return;
    e.stopPropagation();
    activePointerId.current = null;
    setIsDragging(false);
    setKnobOffset({ x: 0, y: 0 });
    onVectorChange({ x: 0, y: 0 });
  };

  const displayOffset = isDragging ? knobOffset : keyEcho;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex items-end justify-between px-4 pb-5 sm:px-8 sm:pb-7">
      {/* Bottom-Left: Floating Analog Joystick */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        <div
          ref={baseRef}
          role="application"
          aria-label="이동 조이스틱"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={releaseJoystick}
          onPointerCancel={releaseJoystick}
          className="relative flex h-36 w-36 touch-none items-center justify-center rounded-full border-2 border-slate-900/15 bg-white/85 shadow-lg sm:h-40 sm:w-40"
        >
          {/* Subtle inner guide ring */}
          <div className="pointer-events-none absolute inset-4 rounded-full border border-dashed border-slate-400/50" />

          {/* Directional chevrons */}
          <ArrowUp className="pointer-events-none absolute top-2.5 h-4 w-4 text-slate-500" />
          <ArrowDown className="pointer-events-none absolute bottom-2.5 h-4 w-4 text-slate-500" />
          <ArrowLeft className="pointer-events-none absolute left-2.5 h-4 w-4 text-slate-500" />
          <ArrowRight className="pointer-events-none absolute right-2.5 h-4 w-4 text-slate-500" />

          {/* Movable Thumb Knob */}
          <div
            style={{
              transform: `translate3d(${displayOffset.x}px, ${displayOffset.y}px, 0)`,
              transition: isDragging ? 'none' : 'transform 120ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            className={`pointer-events-none flex h-14 w-14 items-center justify-center rounded-full border-2 shadow-md sm:h-16 sm:w-16 ${
              isDragging || Math.hypot(displayOffset.x, displayOffset.y) > 4
                ? 'border-sky-700 bg-sky-500 text-white'
                : 'border-slate-300 bg-slate-800 text-white'
            }`}
          >
            <div className="h-5 w-5 rounded-full border-2 border-white/60 bg-white/25" />
          </div>
        </div>
        <span className="rounded-md bg-slate-900/75 px-2.5 py-0.5 text-xs font-medium text-white">
          이동 · 방향키 / WASD
        </span>
      </div>

      {/* Bottom-Right: Floating Action Controls (Camera Reset, Respawn, Jump) */}
      <div className="pointer-events-auto flex items-end gap-3 sm:gap-4">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onResetCamera();
            }}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-900/15 bg-white/90 px-3 text-xs font-semibold text-slate-800 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
            title="카메라 시점 정면으로 맞추기 (R)"
          >
            <Compass className="h-4 w-4 text-sky-600" />
            <span>시점 정렬</span>
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onRespawn();
            }}
            className="flex h-11 items-center gap-1.5 rounded-xl border border-slate-900/15 bg-white/90 px-3 text-xs font-semibold text-slate-800 shadow-sm transition-transform active:scale-95 whitespace-nowrap"
            title="현재 체크포인트로 돌아가기"
          >
            <RotateCcw className="h-4 w-4 text-amber-600" />
            <span>제자리로</span>
          </button>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            aria-label="점프"
            onPointerDown={(e) => {
              e.stopPropagation();
              soundEngine.unlock();
              setJumpPressed(true);
              onJump();
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              setJumpPressed(false);
            }}
            onPointerLeave={() => setJumpPressed(false)}
            className={`flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 text-white shadow-lg transition-transform sm:h-28 sm:w-28 ${
              jumpPressed
                ? 'scale-92 border-emerald-800 bg-emerald-600'
                : 'border-emerald-700 bg-emerald-500 hover:bg-emerald-400 active:scale-92'
            }`}
          >
            <ArrowUp className="h-9 w-9 stroke-[3]" />
            <span className="mt-0.5 text-base font-extrabold tracking-tight">
              점프
            </span>
          </button>
          <span className="rounded-md bg-slate-900/75 px-2.5 py-0.5 text-xs font-medium text-white">
            스페이스바 (Space)
          </span>
        </div>
      </div>
    </div>
  );
};
