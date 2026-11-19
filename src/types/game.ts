export type GamePhase = 'menu' | 'playing' | 'finished';

export type CourseMode = 'standard' | 'quick';

export type ZoneId =
  | 'two_digit_add'
  | 'two_digit_sub'
  | 'multiplication'
  | 'three_num_mix'
  | 'missing_box';

export interface ZoneMeta {
  id: ZoneId;
  title: string;
  subtitle: string;
  accentHex: string;
  platformHex: string;
  trimHex: string;
}

export interface MathVisualHint {
  title: string;
  steps: string[];
}

export interface MathProblem {
  id: number;
  zoneId: ZoneId;
  zoneTitle: string;
  expression: string; // e.g., "47 + 38 = ?" or "82 - □ = 37"
  answer: number;
  choices: [number, number, number]; // Exactly 3 pads per stage
  correctIndex: number; // 0, 1, or 2
  hint: MathVisualHint;
}

export interface StageOutcome {
  stageIndex: number;
  problem: MathProblem;
  wrongAttempts: number;
  falls: number;
  pointsEarned: number;
  clearedOnFirstTry: boolean;
}

export interface GameHudState {
  phase: GamePhase;
  courseMode: CourseMode;
  currentStage: number; // 0-indexed active question (0 .. totalStages - 1)
  totalStages: number;
  score: number;
  maxPossibleScore: number;
  streak: number;
  bestStreak: number;
  totalWrongAttempts: number;
  totalFalls: number;
  elapsedSeconds: number;
  currentProblem: MathProblem | null;
  feedbackBanner: {
    id: number;
    kind: 'correct' | 'wrong' | 'fall' | 'checkpoint';
    title: string;
    detail?: string;
  } | null;
  outcomes: StageOutcome[];
}

export interface InputVector {
  x: number; // -1 (left) to +1 (right)
  y: number; // -1 (down/back) to +1 (up/forward)
}
