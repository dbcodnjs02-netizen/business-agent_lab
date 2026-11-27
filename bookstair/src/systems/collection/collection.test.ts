import { describe, expect, it } from 'vitest';
import { collectionHearts, heartProgress, recordVisits } from './collection';

describe('손님 도감', () => {
  it('방문 수에 따라 하트가 찬다', () => {
    expect([0, 1, 2, 3, 6, 9, 10, 15, 99].map(collectionHearts)).toEqual([0, 1, 1, 2, 3, 3, 4, 5, 5]);
  });

  it('다음 하트까지 진행도', () => {
    expect(heartProgress(0)).toBe(0);
    expect(heartProgress(2)).toBe(0.5);
    expect(heartProgress(20)).toBe(1);
  });

  it('처음 계산한 유형만 새로 등록으로 알려준다', () => {
    const r = recordVisits({ a: 2 }, ['a', 'b', 'b']);
    expect(r.book).toEqual({ a: 3, b: 2 });
    expect(r.discovered).toEqual(['b']);
  });
});
