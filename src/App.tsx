import { useCallback, useEffect, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { FloatingJoystick } from './components/FloatingJoystick';
import { GameHud } from './components/GameHud';
import { ResultModal } from './components/ResultModal';
import { StartOverlay } from './components/StartOverlay';
import { generateCourseProblems } from './data/mathCurriculum';
import { ObbyEngine } from './three/ObbyEngine';
import type { CourseMode, GameHudState, InputVector } from './types/game';

const INITIAL_HUD: GameHudState = {
  phase: 'menu',
  courseMode: 'standard',
  currentStage: 0,
  totalStages: 25,
  score: 0,
  maxPossibleScore: 3000,
  streak: 0,
  bestStreak: 0,
  totalWrongAttempts: 0,
  totalFalls: 0,
  elapsedSeconds: 0,
  currentProblem: null,
  feedbackBanner: null,
  outcomes: [],
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ObbyEngine | null>(null);

  const [selectedMode, setSelectedMode] = useState<CourseMode>('standard');
  const [hud, setHud] = useState<GameHudState>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new ObbyEngine(
      mount,
      (nextHud) => setHud(nextHud),
      (lost) => setContextLost(lost),
    );
    engineRef.current = engine;

    const initialProblems = generateCourseProblems('standard');
    engine.loadCourse(initialProblems, 'standard', false);

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleSelectMode = useCallback((mode: CourseMode) => {
    setSelectedMode(mode);
    const engine = engineRef.current;
    if (engine) {
      const probs = generateCourseProblems(mode);
      engine.loadCourse(probs, mode, false);
    }
  }, []);

  const handleStartGame = useCallback(() => {
    soundEngine.unlock();
    const engine = engineRef.current;
    if (!engine) return;
    const probs = generateCourseProblems(selectedMode);
    engine.loadCourse(probs, selectedMode, true);
  }, [selectedMode]);

  const handlePlayAgain = useCallback(() => {
    soundEngine.unlock();
    const engine = engineRef.current;
    if (!engine) return;
    const probs = generateCourseProblems(selectedMode);
    engine.loadCourse(probs, selectedMode, true);
  }, [selectedMode]);

  const handleReturnToMenu = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const probs = generateCourseProblems(selectedMode);
    engine.loadCourse(probs, selectedMode, false);
  }, [selectedMode]);

  const handleToggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const handleJoystickVector = useCallback((vec: InputVector) => {
    engineRef.current?.setJoystickInput(vec);
  }, []);

  const handleJump = useCallback(() => {
    engineRef.current?.triggerJump();
  }, []);

  const handleResetCamera = useCallback(() => {
    engineRef.current?.resetCameraAlignment();
  }, []);

  const handleRespawn = useCallback(() => {
    engineRef.current?.respawnAtCheckpoint();
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-sky-200">
      {/* Isolated WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 h-full w-full"
        aria-label="3D 숫자 오비 점프 게임 화면"
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sky-50 p-6 text-center">
          <h2 className="font-display text-2xl font-extrabold text-slate-900">
            3D 화면을 다시 불러오는 중입니다
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            잠시만 기다려 주시거나 새로고침해 주세요.
          </p>
        </div>
      )}

      {/* Active Playing HUD + Floating Joystick & Jump Controls */}
      {hud.phase === 'playing' && (
        <>
          <GameHud
            hud={hud}
            muted={muted}
            onToggleMute={handleToggleMute}
            onReturnToMenu={handleReturnToMenu}
          />
          <FloatingJoystick
            onVectorChange={handleJoystickVector}
            onJump={handleJump}
            onResetCamera={handleResetCamera}
            onRespawn={handleRespawn}
          />
        </>
      )}

      {/* Start Overlay */}
      {hud.phase === 'menu' && (
        <StartOverlay
          selectedMode={selectedMode}
          onSelectMode={handleSelectMode}
          onStart={handleStartGame}
        />
      )}

      {/* Final Score Modal */}
      {hud.phase === 'finished' && (
        <ResultModal
          hud={hud}
          onPlayAgain={handlePlayAgain}
          onReturnToMenu={handleReturnToMenu}
        />
      )}
    </div>
  );
}
