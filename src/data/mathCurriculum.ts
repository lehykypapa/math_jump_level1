import type {
  CourseMode,
  MathProblem,
  MathVisualHint,
  ZoneId,
  ZoneMeta,
} from '../types/game';

export const ZONES: Record<ZoneId, ZoneMeta> = {
  two_digit_add: {
    id: 'two_digit_add',
    title: '1구간 · 두 자리 덧셈',
    subtitle: '받아올림이 있는 두 자리 수 덧셈',
    accentHex: '#0284c7',
    platformHex: '#38bdf8',
    trimHex: '#0369a1',
  },
  two_digit_sub: {
    id: 'two_digit_sub',
    title: '2구간 · 두 자리 뺄셈',
    subtitle: '받아내림이 있는 뺄셈과 100 빼기',
    accentHex: '#059669',
    platformHex: '#34d399',
    trimHex: '#047857',
  },
  multiplication: {
    id: 'multiplication',
    title: '3구간 · 곱셈구구 심화',
    subtitle: '6~9단 중심 구구단 도전',
    accentHex: '#d97706',
    platformHex: '#fbbf24',
    trimHex: '#b45309',
  },
  three_num_mix: {
    id: 'three_num_mix',
    title: '4구간 · 혼합 계산',
    subtitle: '세 수의 계산과 곱셈·덧뺄셈 혼합',
    accentHex: '#7c3aed',
    platformHex: '#a78bfa',
    trimHex: '#5b21b6',
  },
  missing_box: {
    id: 'missing_box',
    title: '5구간 · □ 값 구하기',
    subtitle: '거꾸로 계산하는 응용 문제',
    accentHex: '#e11d48',
    platformHex: '#fb7185',
    trimHex: '#be123c',
  },
};

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generates plausible 2nd-grade distractors (e.g., forgetting carry/borrow ±10,
 * adjacent multiplication facts, or ±1/±2 slip-ups) so guessing is hard.
 */
function generateSmartChoices(
  answer: number,
  trickyCandidates: number[],
  minVal: number,
  maxVal: number,
): {
  choices: [number, number, number];
  correctIndex: number;
} {
  const picked = new Set<number>();

  for (const cand of shuffle(trickyCandidates)) {
    if (cand !== answer && cand >= minVal && cand <= maxVal) {
      picked.add(cand);
      if (picked.size === 2) break;
    }
  }

  const fallbackOffsets = shuffle([-10, 10, -2, 2, -1, 1, -3, 3, -9, 9]);
  for (const offset of fallbackOffsets) {
    if (picked.size >= 2) break;
    const cand = answer + offset;
    if (cand !== answer && cand >= minVal && cand <= maxVal) {
      picked.add(cand);
    }
  }

  while (picked.size < 2) {
    const cand = randInt(minVal, maxVal);
    if (cand !== answer) picked.add(cand);
  }

  const list = shuffle([answer, ...Array.from(picked)]);
  return {
    choices: [list[0], list[1], list[2]],
    correctIndex: list.indexOf(answer),
  };
}

function makeProblem(
  id: number,
  zoneId: ZoneId,
  expression: string,
  answer: number,
  trickyCandidates: number[],
  hint: MathVisualHint,
  minChoice = 2,
  maxChoice = 180,
): MathProblem {
  const { choices, correctIndex } = generateSmartChoices(
    answer,
    trickyCandidates,
    minChoice,
    maxChoice,
  );
  return {
    id,
    zoneId,
    zoneTitle: ZONES[zoneId].title,
    expression,
    answer,
    choices,
    correctIndex,
    hint,
  };
}

// 1구간: 받아올림 1~2회 있는 두 자리 수 덧셈 (합 70~165, 백을 넘는 수 포함)
function createTwoDigitAddProblem(id: number, variant: number): MathProblem {
  const onesA = randInt(4, 9);
  const onesB = randInt(11 - onesA, 9); // 일의 자리 받아올림 필수
  const tensA = variant % 2 === 0 ? randInt(3, 6) : randInt(5, 8);
  const tensB = variant % 2 === 0 ? randInt(2, 5) : randInt(4, 7);
  const a = tensA * 10 + onesA;
  const b = tensB * 10 + onesB;
  const answer = a + b;
  const onesSum = onesA + onesB;

  return makeProblem(
    id,
    'two_digit_add',
    `${a} + ${b} = ?`,
    answer,
    [answer - 10, answer + 10, answer - 1, answer + 2, answer - 2],
    {
      title: '받아올림 순서 확인',
      steps: [
        `1) 일의 자리: ${onesA} + ${onesB} = ${onesSum} → ${onesSum % 10}을 쓰고 10을 올려요.`,
        `2) 십의 자리: ${tensA} + ${tensB} + 1 = ${tensA + tensB + 1}`,
      ],
    },
    30,
    180,
  );
}

// 2구간: 받아내림 있는 두 자리 수 뺄셈 및 100에서의 뺄셈
function createTwoDigitSubProblem(id: number, variant: number): MathProblem {
  if (variant % 3 === 2) {
    // 100 - 두 자리 수 (가장 많이 틀리는 2학년 핵심 문제)
    const b = randInt(23, 78);
    const answer = 100 - b;
    return makeProblem(
      id,
      'two_digit_sub',
      `100 - ${b} = ?`,
      answer,
      [answer + 10, answer - 10, answer + 1, 100 - (b % 10)],
      {
        title: '100에서 빼기 힌트',
        steps: [
          `1) 100은 90과 10으로 가를 수 있어요.`,
          `2) 십의 자리끼리 90 - ${Math.floor(b / 10) * 10}, 일의 자리끼리 10 - ${b % 10}을 계산해요.`,
        ],
      },
      10,
      90,
    );
  }

  const onesA = randInt(1, 6);
  const onesB = randInt(onesA + 2, 9); // 받아내림 필수
  const tensB = randInt(2, 5);
  const tensA = tensB + randInt(2, 4);
  const a = tensA * 10 + onesA;
  const b = tensB * 10 + onesB;
  const answer = a - b;

  return makeProblem(
    id,
    'two_digit_sub',
    `${a} - ${b} = ?`,
    answer,
    [
      answer + 10, // 받아내림 깜빡한 함정
      answer - 10,
      (tensA - tensB) * 10 + Math.abs(onesA - onesB), // 거꾸로 뺀 함정
      answer + 1,
      answer - 2,
    ],
    {
      title: '받아내림 순서 확인',
      steps: [
        `1) ${onesA}에서 ${onesB}를 뺄 수 없으니 십의 자리에서 10을 빌려와 ${10 + onesA} - ${onesB} = ${10 + onesA - onesB}`,
        `2) 남은 십의 자리 ${tensA - 1}에서 ${tensB}를 빼세요.`,
      ],
    },
    10,
    90,
  );
}

// 3구간: 곱셈구구 심화 (6~9단 중심, 헷갈리는 단)
function createMultiplicationProblem(id: number): MathProblem {
  const a = randInt(6, 9);
  const b = randInt(4, 9);
  const answer = a * b;

  return makeProblem(
    id,
    'multiplication',
    `${a} × ${b} = ?`,
    answer,
    [
      a * (b - 1),
      a * (b + 1),
      (a - 1) * b,
      (a + 1) * b,
      answer + 2,
      answer - 2,
    ],
    {
      title: `${a}단 곱셈구구 힌트`,
      steps: [
        `1) ${a}를 ${b}번 더한 값과 같아요.`,
        `2) ${a} × ${b - 1} = ${a * (b - 1)} 에서 ${a}을(를) 한 번 더 더해 보세요!`,
      ],
    },
    16,
    90,
  );
}

// 4구간: 세 수의 받아올림/받아내림 계산 및 곱셈·덧뺄셈 혼합
function createThreeNumMixProblem(id: number, variant: number): MathProblem {
  if (variant % 2 === 0) {
    // 곱셈 + 두 자리 덧셈/뺄셈 혼합 (예: 7 × 8 + 19, 9 × 7 - 26)
    const a = randInt(6, 9);
    const b = randInt(4, 9);
    const prod = a * b;
    if (Math.random() < 0.5) {
      const c = randInt(14, 38);
      const answer = prod + c;
      return makeProblem(
        id,
        'three_num_mix',
        `${a} × ${b} + ${c} = ?`,
        answer,
        [answer - 10, answer + 10, a * (b - 1) + c, prod + c - 2],
        {
          title: '곱셈 먼저 계산하기',
          steps: [
            `1) 먼저 곱셈 ${a} × ${b} = ${prod} 을 구해요.`,
            `2) 그다음 ${prod} + ${c} 을 계산하세요!`,
          ],
        },
        30,
        130,
      );
    }
    const c = randInt(12, Math.min(35, prod - 10));
    const answer = prod - c;
    return makeProblem(
      id,
      'three_num_mix',
      `${a} × ${b} - ${c} = ?`,
      answer,
      [answer + 10, answer - 10, a * (b + 1) - c, prod - c + 2],
      {
        title: '곱셈 먼저 계산하기',
        steps: [
          `1) 먼저 곱셈 ${a} × ${b} = ${prod} 을 구해요.`,
          `2) 그다음 ${prod} - ${c} 을 계산하세요!`,
        ],
      },
      10,
      80,
    );
  }

  // 세 수의 혼합 덧셈·뺄셈 (받아올림 + 받아내림)
  const a = randInt(35, 68);
  const b = randInt(16, 39);
  const c = randInt(14, 36);
  const answer = a + b - c;
  return makeProblem(
    id,
    'three_num_mix',
    `${a} + ${b} - ${c} = ?`,
    answer,
    [answer - 10, answer + 10, answer + 2, answer - 2, a - b + c],
    {
      title: '앞에서부터 차례대로 계산',
      steps: [
        `1) 먼저 ${a} + ${b} = ${a + b} 을 계산해요.`,
        `2) 나온 값 ${a + b} 에서 ${c} 을 빼세요.`,
      ],
    },
    15,
    110,
  );
}

// 5구간: □ 안에 알맞은 수 구하기 (방정식 추론 심화)
function createMissingBoxProblem(id: number, variant: number): MathProblem {
  const kind = variant % 4;

  if (kind === 0) {
    // □ + B = C (받아올림 역산)
    const box = randInt(24, 58);
    const b = randInt(17, 46);
    const c = box + b;
    return makeProblem(
      id,
      'missing_box',
      `□ + ${b} = ${c}`,
      box,
      [box + 10, box - 10, c + b, box + 2, box - 1],
      {
        title: '거꾸로 빼서 □ 구하기',
        steps: [
          `1) 어떤 수에 ${b}를 더했더니 ${c}가 되었어요.`,
          `2) □ = ${c} - ${b} 로 계산하면 찾을 수 있어요!`,
        ],
      },
      10,
      95,
    );
  }

  if (kind === 1) {
    // A - □ = C (가장 많이 헷갈리는 빼는 수 찾기)
    const box = randInt(18, 49);
    const c = randInt(23, 47);
    const a = box + c;
    return makeProblem(
      id,
      'missing_box',
      `${a} - □ = ${c}`,
      box,
      [box + 10, box - 10, a + c, box + 1, box - 2],
      {
        title: '빼는 수 □ 구하기',
        steps: [
          `1) ${a}에서 □를 빼서 ${c}가 남았어요.`,
          `2) □ = ${a} - ${c} 을 계산해 보세요!`,
        ],
      },
      10,
      85,
    );
  }

  if (kind === 2) {
    // □ - B = C (처음 수 찾기: 덧셈으로 역산)
    const b = randInt(19, 44);
    const c = randInt(25, 53);
    const box = b + c;
    return makeProblem(
      id,
      'missing_box',
      `□ - ${b} = ${c}`,
      box,
      [Math.abs(c - b), box - 10, box + 10, box - 1],
      {
        title: '처음 수 □ 구하기',
        steps: [
          `1) □에서 ${b}를 빼고도 ${c}가 남았으니 □는 ${c}보다 더 커요!`,
          `2) □ = ${c} + ${b} 로 두 수를 더해 보세요.`,
        ],
      },
      20,
      110,
    );
  }

  // 곱셈 □ 구하기 (7 × □ = 56 또는 6 × 8 + □ = 65)
  if (Math.random() < 0.5) {
    const a = randInt(6, 9);
    const box = randInt(4, 9);
    const c = a * box;
    return makeProblem(
      id,
      'missing_box',
      `${a} × □ = ${c}`,
      box,
      [box - 1, box + 1, box + 2, a],
      {
        title: `${a}단 거꾸로 찾기`,
        steps: [
          `1) ${a}단에 몇을 곱하면 ${c}가 될까요?`,
          `2) ${a} × 5 = ${a * 5} 를 기준으로 위아래로 찾아보세요.`,
        ],
      },
      2,
      12,
    );
  }

  const a = randInt(5, 9);
  const b = randInt(5, 9);
  const box = randInt(8, 25);
  const c = a * b + box;
  return makeProblem(
    id,
    'missing_box',
    `${a} × ${b} + □ = ${c}`,
    box,
    [box + 10, Math.max(2, box - 5), box + 2, box - 2],
    {
      title: '곱셈을 먼저 구한 뒤 □ 찾기',
      steps: [
        `1) 먼저 ${a} × ${b} = ${a * b} 을 계산해요.`,
        `2) ${a * b} + □ = ${c} 이므로 □ = ${c} - ${a * b} 이에요!`,
      ],
    },
    3,
    40,
  );
}

export function generateCourseProblems(mode: CourseMode): MathProblem[] {
  const perZone = mode === 'standard' ? 5 : 2; // 25문제 (10~15분) 또는 10문제 (5분)
  const problems: MathProblem[] = [];
  const usedExpressions = new Set<string>();

  const generators: Array<(id: number, idx: number) => MathProblem> = [
    (id, idx) => createTwoDigitAddProblem(id, idx),
    (id, idx) => createTwoDigitSubProblem(id, idx),
    (id) => createMultiplicationProblem(id),
    (id, idx) => createThreeNumMixProblem(id, idx),
    (id, idx) => createMissingBoxProblem(id, idx),
  ];

  let id = 1;
  for (const gen of generators) {
    for (let i = 0; i < perZone; i++) {
      let attempt = 0;
      let prob = gen(id, i);
      while (usedExpressions.has(prob.expression) && attempt < 25) {
        prob = gen(id, i + attempt + 1);
        attempt++;
      }
      usedExpressions.add(prob.expression);
      problems.push(prob);
      id++;
    }
  }

  return problems;
}
