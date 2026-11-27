import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, addExp, expToNext, nextPerk, perksAt, roomFor, staffSlots } from './level';

describe('가게 레벨', () => {
  it('경험치가 넘치면 여러 레벨을 한 번에 오른다', () => {
    expect(addExp({ level: 1, exp: 0 }, expToNext(1) - 1)).toEqual({ level: 1, exp: expToNext(1) - 1, levelsGained: 0 });
    const r = addExp({ level: 1, exp: 0 }, expToNext(1) + expToNext(2) + 5);
    expect(r).toEqual({ level: 3, exp: 5, levelsGained: 2 });
  });

  it('최고 레벨에서 멈춘다', () => {
    expect(addExp({ level: MAX_LEVEL - 1, exp: 0 }, 1e9)).toEqual({ level: MAX_LEVEL, exp: 0, levelsGained: 1 });
  });

  it('알바 자리는 5 · 10 · 50 · 100레벨에 하나씩, 최대 4명', () => {
    expect([1, 4, 5, 9, 10, 49, 50, 99, 100].map(staffSlots)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4]);
  });

  it('레벨이 오를수록 매장이 넓어지기만 한다', () => {
    let prev = roomFor(1);
    for (let l = 2; l <= MAX_LEVEL; l++) {
      const room = roomFor(l);
      expect(room.cols).toBeGreaterThanOrEqual(prev.cols);
      expect(room.rows).toBeGreaterThanOrEqual(prev.rows);
      prev = room;
    }
    expect(roomFor(MAX_LEVEL).cols * roomFor(MAX_LEVEL).rows).toBeGreaterThan(roomFor(1).cols * roomFor(1).rows);
  });

  it('레벨업 혜택: 4레벨 단골, 5레벨 알바 + 확장', () => {
    expect(perksAt(4)).toEqual([{ kind: 'regulars' }]);
    expect(perksAt(5).map((p) => p.kind).sort()).toEqual(['room', 'staff']);
    expect(nextPerk(1)?.level).toBe(3);
    expect(nextPerk(MAX_LEVEL)).toBeNull();
  });
});
