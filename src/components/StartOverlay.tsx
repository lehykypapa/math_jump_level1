import React from 'react';
import { ArrowRight, Clock, Footprints, HelpCircle, Play } from 'lucide-react';
import type { CourseMode } from '../types/game';

interface StartOverlayProps {
  selectedMode: CourseMode;
  onSelectMode: (mode: CourseMode) => void;
  onStart: () => void;
}

export const StartOverlay: React.FC<StartOverlayProps> = ({
  selectedMode,
  onSelectMode,
  onStart,
}) => {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-900/15 bg-white p-6 shadow-2xl sm:p-8">
        <div className="text-xs font-semibold text-sky-700">
          초등 2학년 심화 수학 · 3D 오비 점프 어드벤처
        </div>
        <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          숫자 오비 점프 · 2학년 챌린지
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          받아올림·받아내림 두 자리 수 계산, 6~9단 곱셈구구, 혼합 계산과 □ 값
          구하기까지! 헷갈리는 오답 함정을 피해 정답 발판 위로 점프해 보세요.
        </p>

        {/* Course Length Selection */}
        <div className="mt-6">
          <div className="text-xs font-semibold text-slate-500">
            코스 분량 선택
          </div>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onSelectMode('standard')}
              className={`flex flex-col items-start rounded-2xl border-2 p-4 text-left transition-colors ${
                selectedMode === 'standard'
                  ? 'border-sky-600 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-extrabold text-slate-900">
                  정규 코스 (25문제)
                </span>
                <Clock className="h-4 w-4 text-sky-600" />
              </div>
              <span className="mt-1 text-xs font-medium text-slate-600">
                10~15분 완주 · 2학년 두 자리 덧뺄셈·구구단·□ 심화
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMode('quick')}
              className={`flex flex-col items-start rounded-2xl border-2 p-4 text-left transition-colors ${
                selectedMode === 'quick'
                  ? 'border-sky-600 bg-sky-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-base font-extrabold text-slate-900">
                  연습 코스 (10문제)
                </span>
                <Clock className="h-4 w-4 text-slate-500" />
              </div>
              <span className="mt-1 text-xs font-medium text-slate-600">
                약 5분 · 핵심 5개 구간 빠른 도전
              </span>
            </button>
          </div>
        </div>

        {/* Simple How-to-Play */}
        <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <Footprints className="h-3.5 w-3.5 text-sky-600" />
              <span>1. 이동하기</span>
            </div>
            <span className="text-slate-600">
              화면 조이스틱이나 방향키로 움직여요
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <HelpCircle className="h-3.5 w-3.5 text-emerald-600" />
              <span>2. 정답 점프</span>
            </div>
            <span className="text-slate-600">
              맞는 숫자 발판에 점프하면 다리가 열려요
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 font-bold text-slate-900">
              <ArrowRight className="h-3.5 w-3.5 text-amber-600" />
              <span>3. 완주 점수</span>
            </div>
            <span className="text-slate-600">
              틀리면 떨어지니 조심! 끝까지 가 보세요
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-4 text-lg font-extrabold text-white shadow-md transition-colors hover:bg-sky-500 active:scale-[0.99]"
        >
          <Play className="h-5 w-5 fill-current" />
          <span>오비 모험 시작하기</span>
        </button>
      </div>
    </div>
  );
};
