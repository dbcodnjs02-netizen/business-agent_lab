import { describe, expect, it } from 'vitest';
import { blocksBusiness, nextTutorialStep, tutorialProgress, type TutorialFacts } from './tutorial';

const facts = (over: Partial<TutorialFacts> = {}): TutorialFacts => ({
  desks: 0,
  linkedSeats: 0,
  brewers: 0,
  editing: true,
  served: 0,
  met: false,
  shelves: 0,
  regulars: 0,
  level: 1,
  ...over,
});

describe('튜토리얼 단계', () => {
  it('welcome 은 조건으로 넘어가지 않는다', () => {
    expect(nextTutorialStep('welcome', facts({ desks: 2, linkedSeats: 4, brewers: 1 }))).toBe('welcome');
  });

  it('책상 2 → 연결된 의자 4 → 커피머신 1 → 편집 완료 → 첫 음료', () => {
    expect(nextTutorialStep('desks', facts({ desks: 1 }))).toBe('desks');
    expect(nextTutorialStep('desks', facts({ desks: 2 }))).toBe('chairs');
    expect(nextTutorialStep('chairs', facts({ desks: 2, linkedSeats: 3 }))).toBe('chairs');
    expect(nextTutorialStep('chairs', facts({ desks: 2, linkedSeats: 4 }))).toBe('coffee');
    expect(nextTutorialStep('coffee', facts({ desks: 2, linkedSeats: 4, brewers: 1 }))).toBe('open');
    expect(nextTutorialStep('open', facts({ desks: 2, linkedSeats: 4, brewers: 1, editing: false }))).toBe('serve');
    expect(nextTutorialStep('serve', facts({ editing: false, served: 1 }))).toBe('grow');
  });

  it('첫 음료 뒤: 4레벨까지 키우기 → 단골 후보 이야기 듣기 → 책장 놓기 → 책 추천으로 첫 단골', () => {
    expect(nextTutorialStep('grow', facts({ editing: false, served: 1, level: 3 }))).toBe('grow');
    expect(nextTutorialStep('grow', facts({ editing: false, served: 1, level: 4 }))).toBe('meet');
    expect(tutorialProgress('grow', facts({ level: 7 }))).toEqual({ count: 4, goal: 4 });
    const base = { editing: false, served: 1, level: 4 };
    expect(nextTutorialStep('meet', facts(base))).toBe('meet');
    expect(nextTutorialStep('meet', facts({ ...base, met: true }))).toBe('shelf');
    expect(nextTutorialStep('shelf', facts({ ...base, met: true, shelves: 1 }))).toBe('cast');
    expect(nextTutorialStep('cast', facts({ ...base, met: true, shelves: 1, regulars: 1 }))).toBe('done');
  });

  it('이미 다 해 두었으면 여러 단계를 한 번에 넘어간다', () => {
    expect(nextTutorialStep('desks', facts({ desks: 2, linkedSeats: 4, brewers: 1 }))).toBe('open');
  });

  it('진행 표시는 목표에서 멈춘다', () => {
    expect(tutorialProgress('chairs', facts({ linkedSeats: 6 }))).toEqual({ count: 4, goal: 4 });
    expect(tutorialProgress('serve', facts())).toBeNull();
  });

  it('가구를 놓는 동안엔 손님을 받지 않는다', () => {
    expect(blocksBusiness('chairs')).toBe(true);
    expect(blocksBusiness('serve')).toBe(false);
  });
});
