import { REGULAR_LEVEL } from '../level/level';

/*
 * 첫 영업 튜토리얼 — 빈 가게에서 책상 2 · 의자 4 · 커피머신 1 을 놓고 첫 음료를 건넨 뒤,
 * 가게를 4레벨까지 키우면 찾아오는 동물 손님의 취향을 듣고 맞는 책장을 놓아
 * 책을 추천해 첫 단골을 만들기까지.
 * 단계 판정은 지금 매장 상태(사실)만 보고 정한다. 저장되는 건 현재 단계 하나.
 */

export const TUTORIAL_STEPS = ['welcome', 'desks', 'chairs', 'coffee', 'open', 'serve', 'grow', 'meet', 'shelf', 'cast', 'done'] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

export const TUTORIAL_GOALS = { desks: 2, chairs: 4, coffee: 1, shelf: 1 } as const;

export interface TutorialFacts {
  /** 놓인 책상 수 */
  desks: number;
  /** 책상과 연결된 좌석 수 */
  linkedSeats: number;
  /** 놓인 커피머신 수 */
  brewers: number;
  /** 인테리어 편집 중인지 */
  editing: boolean;
  /** 지금까지 손님에게 건넨 음료 수 */
  served: number;
  /** 단골 후보와 한 번이라도 이야기했는지 */
  met: boolean;
  /** 놓인 책장 수 */
  shelves: number;
  /** 단골 수 */
  regulars: number;
  /** 가게 레벨 */
  level: number;
}

/** 이 단계에서 목표까지 얼마나 했는지 (진행 표시용) */
export function tutorialProgress(step: TutorialStep, f: TutorialFacts): { count: number; goal: number } | null {
  switch (step) {
    case 'desks':
      return { count: Math.min(f.desks, TUTORIAL_GOALS.desks), goal: TUTORIAL_GOALS.desks };
    case 'chairs':
      return { count: Math.min(f.linkedSeats, TUTORIAL_GOALS.chairs), goal: TUTORIAL_GOALS.chairs };
    case 'coffee':
      return { count: Math.min(f.brewers, TUTORIAL_GOALS.coffee), goal: TUTORIAL_GOALS.coffee };
    case 'shelf':
      return { count: Math.min(f.shelves, TUTORIAL_GOALS.shelf), goal: TUTORIAL_GOALS.shelf };
    case 'grow':
      return { count: Math.min(f.level, REGULAR_LEVEL), goal: REGULAR_LEVEL };
    default:
      return null;
  }
}

/**
 * 조건을 채웠으면 다음 단계로. 한 번에 여러 단계를 건너뛸 수 있다
 * (예: 책상을 놓다가 의자까지 다 연결해 두었으면 바로 커피머신 단계).
 * welcome 은 버튼으로만 넘어간다.
 */
export function nextTutorialStep(step: TutorialStep, f: TutorialFacts): TutorialStep {
  let s = step;
  for (;;) {
    const passed =
      (s === 'desks' && f.desks >= TUTORIAL_GOALS.desks) ||
      (s === 'chairs' && f.linkedSeats >= TUTORIAL_GOALS.chairs) ||
      (s === 'coffee' && f.brewers >= TUTORIAL_GOALS.coffee) ||
      (s === 'open' && !f.editing) ||
      (s === 'serve' && f.served > 0) ||
      (s === 'grow' && f.level >= REGULAR_LEVEL) ||
      (s === 'meet' && f.met) ||
      (s === 'shelf' && f.shelves >= TUTORIAL_GOALS.shelf) ||
      (s === 'cast' && f.regulars > 0);
    if (!passed) return s;
    s = TUTORIAL_STEPS[TUTORIAL_STEPS.indexOf(s) + 1];
  }
}

/** 가구를 놓는 동안에는 손님을 받지 않는다 */
export const blocksBusiness = (step: TutorialStep) => step === 'welcome' || step === 'desks' || step === 'chairs' || step === 'coffee';

export const isTutorialStep = (v: unknown): v is TutorialStep => TUTORIAL_STEPS.includes(v as TutorialStep);
