import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Home,
  Volume2,
  VolumeX,
  AlertTriangle,
  Flag,
} from 'lucide-react';
import { ZONES } from '../data/mathCurriculum';
import type { GameHudState, MathProblem } from '../types/game';

interface GameHudProps {
  hud: GameHudState;
  muted: boolean;
  onToggleMute: () => void;
  onReturnToMenu: () => void;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const StepByStepHint: React.FC<{ problem: MathProblem }> = ({ problem }) => {
  const { hint } = problem;
  return (
    <div className="mt-1.5 flex flex-col gap-1.5 border-t border-slate-200 pt-2 text-left text-xs text-slate-700">
      <div className="font-bold text-sky-700">{hint.title}</div>
      {hint.steps.map((step, idx) => (
        <p key={idx} className="leading-snug text-slate-600">
          {step}
        </p>
      ))}
    </div>
  );
};

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  muted,
  onToggleMute,
  onReturnToMenu,
}) => {
  const [showHint, setShowHint] = useState(false);

  const prob = hud.currentProblem;

  useEffect(() => {
    setShowHint(false);
  }, [prob?.id]);
  const zoneMeta = prob ? ZONES[prob.zoneId] : null;
  const progressPct =
    hud.totalStages > 0
      ? Math.round((hud.outcomes.length / hud.totalStages) * 100)
      : 0;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center px-2.5 pt-2 sm:px-5 sm:pt-3">
      <div className="flex w-full max-w-6xl items-center justify-between gap-2">
        {/* Top-Left: Compact Progress & Score */}
        <div className="pointer-events-auto flex flex-col gap-1 rounded-xl border border-slate-900/12 bg-white/92 px-3 py-1.5 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 sm:text-xs">
            <span className="font-bold text-slate-900 whitespace-nowrap">
              {hud.currentStage + 1}/{hud.totalStages}단계
            </span>
            <span aria-hidden="true" className="hidden sm:inline">·</span>
            <span className="hidden max-w-[140px] truncate sm:inline">
              {zoneMeta?.title ?? '모험'}
            </span>
          </div>
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 sm:w-44">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600 sm:text-xs">
            <span className="font-mono-num font-bold text-slate-900 whitespace-nowrap">
              {hud.score.toLocaleString()}점
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num whitespace-nowrap">
              {formatTime(hud.elapsedSeconds)}
            </span>
            {hud.streak >= 2 && (
              <>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span className="hidden font-bold text-emerald-700 sm:inline whitespace-nowrap">
                  {hud.streak}연속
                </span>
              </>
            )}
          </div>
        </div>

        {/* Top-Center: Slim Single-Row Math Question Strip */}
        {prob && (
          <div className="pointer-events-auto relative flex items-center gap-3 rounded-xl border-2 border-slate-900/15 bg-white/95 px-3.5 py-1.5 shadow-md sm:px-5 sm:py-2">
            <div className="flex items-baseline gap-2.5">
              <span className="hidden text-xs font-semibold text-slate-500 md:inline whitespace-nowrap">
                문제 {hud.currentStage + 1}
              </span>
              <span className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl whitespace-nowrap">
                {prob.expression}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowHint((v) => !v)}
              className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 whitespace-nowrap sm:text-xs"
            >
              {showHint ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">닫기</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>풀이 힌트</span>
                </>
              )}
            </button>

            {showHint && (
              <div className="absolute left-1/2 top-full z-30 mt-2 w-72 -translate-x-1/2 rounded-xl border border-slate-900/15 bg-white p-3.5 shadow-xl">
                <div className="text-[11px] font-semibold text-slate-500">
                  초등 2학년 풀이 힌트
                </div>
                <StepByStepHint problem={prob} />
              </div>
            )}
          </div>
        )}

        {/* Top-Right: Audio & Course Menu Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? '소리 켜기' : '소리 끄기'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-900/12 bg-white/92 text-slate-700 shadow-sm hover:bg-white sm:h-10 sm:w-10"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-slate-500 sm:h-5 sm:w-5" />
            ) : (
              <Volume2 className="h-4 w-4 text-sky-600 sm:h-5 sm:w-5" />
            )}
          </button>
          <button
            type="button"
            onClick={onReturnToMenu}
            className="flex h-9 items-center gap-1 rounded-xl border border-slate-900/12 bg-white/92 px-2.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-white whitespace-nowrap sm:h-10 sm:px-3"
          >
            <Home className="h-4 w-4 text-slate-600" />
            <span className="hidden sm:inline">처음으로</span>
          </button>
        </div>
      </div>

      {/* Transient Non-Blocking Feedback Toast */}
      {hud.feedbackBanner && (
        <div
          key={hud.feedbackBanner.id}
          className={`mt-2 flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-bold shadow-md sm:text-sm ${
            hud.feedbackBanner.kind === 'correct'
              ? 'border-emerald-700 bg-emerald-600 text-white'
              : hud.feedbackBanner.kind === 'checkpoint'
                ? 'border-sky-700 bg-sky-600 text-white'
                : 'border-rose-700 bg-rose-600 text-white'
          }`}
        >
          {hud.feedbackBanner.kind === 'correct' && (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          {hud.feedbackBanner.kind === 'checkpoint' && (
            <Flag className="h-4 w-4 shrink-0" />
          )}
          {(hud.feedbackBanner.kind === 'wrong' ||
            hud.feedbackBanner.kind === 'fall') && (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span>{hud.feedbackBanner.title}</span>
          {hud.feedbackBanner.detail && (
            <span className="hidden text-xs font-medium text-white/90 sm:inline">
              · {hud.feedbackBanner.detail}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
