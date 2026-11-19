import React from 'react';
import { Award, Home, RotateCcw } from 'lucide-react';
import { ZONES } from '../data/mathCurriculum';
import type { GameHudState, ZoneId } from '../types/game';

interface ResultModalProps {
  hud: GameHudState;
  onPlayAgain: () => void;
  onReturnToMenu: () => void;
}

function formatDuration(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}초`;
  return `${mins}분 ${secs}초`;
}

export const ResultModal: React.FC<ResultModalProps> = ({
  hud,
  onPlayAgain,
  onReturnToMenu,
}) => {
  const totalQuestions = hud.totalStages;
  const firstTryCount = hud.outcomes.filter((o) => o.clearedOnFirstTry).length;
  const accuracy =
    totalQuestions > 0 ? Math.round((firstTryCount / totalQuestions) * 100) : 0;

  const gradeTitle =
    accuracy >= 92
      ? '전설의 2학년 수학 오비 마스터!'
      : accuracy >= 75
        ? '씩씩한 심화 수학 탐험가!'
        : '끝까지 도전한 멋진 수학 도전자!';

  const zoneOrder: ZoneId[] = [
    'two_digit_add',
    'two_digit_sub',
    'multiplication',
    'three_num_mix',
    'missing_box',
  ];

  const missedProblems = hud.outcomes.filter((o) => o.wrongAttempts > 0);

  const formatSolvedExpression = (expression: string, answer: number): string => {
    if (expression.includes('□')) {
      return expression.replace('□', `[${answer}]`);
    }
    return expression.replace('?', String(answer));
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/55 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-900/15 bg-white p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-amber-600">
              {hud.courseMode === 'standard'
                ? '2학년 심화 · 정규 25문제 코스 완주'
                : '2학년 심화 · 연습 10문제 코스 완주'}
            </div>
            <h2 className="mt-1 font-display text-2xl font-extrabold text-slate-900 sm:text-3xl">
              {gradeTitle}
            </h2>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
            <Award className="h-7 w-7" />
          </div>
        </div>

        {/* Hero Score Highlight */}
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
          <span className="text-sm font-bold text-sky-900">최종 획득 점수</span>
          <div className="flex items-baseline gap-2">
            <span className="font-mono-num text-4xl font-extrabold text-sky-700">
              {hud.score.toLocaleString()}점
            </span>
            <span className="font-mono-num text-sm font-medium text-slate-500">
              / {hud.maxPossibleScore.toLocaleString()}점
            </span>
          </div>
        </div>

        {/* 4-Column Stat Grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">첫 시도 정답률</div>
            <div className="font-mono-num mt-1 text-xl font-extrabold text-slate-900">
              {accuracy}%
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">완주 시간</div>
            <div className="font-mono-num mt-1 text-xl font-extrabold text-slate-900">
              {formatDuration(hud.elapsedSeconds)}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">최고 연속 정답</div>
            <div className="font-mono-num mt-1 text-xl font-extrabold text-emerald-700">
              {hud.bestStreak}문제
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-xs text-slate-500">오답 / 추락</div>
            <div className="font-mono-num mt-1 text-xl font-extrabold text-rose-600">
              {hud.totalWrongAttempts} / {hud.totalFalls}회
            </div>
          </div>
        </div>

        {/* Zone-by-Zone Mastery Breakdown */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-slate-900">단원별 성취도</h3>
          <div className="mt-2.5 space-y-2.5">
            {zoneOrder.map((zId) => {
              const meta = ZONES[zId];
              const zoneItems = hud.outcomes.filter(
                (o) => o.problem.zoneId === zId,
              );
              const total = zoneItems.length;
              const perfect = zoneItems.filter((o) => o.clearedOnFirstTry).length;
              const pct = total > 0 ? Math.round((perfect / total) * 100) : 0;
              return (
                <div key={zId} className="text-xs">
                  <div className="flex items-center justify-between font-semibold text-slate-700">
                    <span>{meta.title}</span>
                    <span className="font-mono-num text-slate-600">
                      {perfect} / {total} 문제 ({pct}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: meta.accentHex,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Missed Problems Review */}
        {missedProblems.length > 0 && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-bold text-slate-900">
              다시 확인해 볼 문제 ({missedProblems.length}개)
            </h3>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {missedProblems.map((item) => (
                <div
                  key={item.stageIndex}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="font-bold text-slate-800">
                    {formatSolvedExpression(
                      item.problem.expression,
                      item.problem.answer,
                    )}
                  </span>
                  <span className="text-xs font-medium text-rose-600">
                    {item.wrongAttempts}번 실수
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-sky-600 px-5 py-3.5 text-base font-extrabold text-white shadow-sm hover:bg-sky-500"
          >
            <RotateCcw className="h-4 w-4" />
            <span>새 문제로 다시 도전하기</span>
          </button>
          <button
            type="button"
            onClick={onReturnToMenu}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <Home className="h-4 w-4" />
            <span>코스 선택</span>
          </button>
        </div>
      </div>
    </div>
  );
};
