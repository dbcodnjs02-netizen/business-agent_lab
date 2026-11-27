import { describe, expect, it } from 'vitest';
import { facingFrom, facingOfSeat, hashString, isLook, lookFromSeed, lookOr } from './look';

describe('lookFromSeed', () => {
  it('같은 시드는 같은 외형, 결과는 늘 유효', () => {
    expect(lookFromSeed(42)).toEqual(lookFromSeed(42));
    for (let i = 0; i < 50; i++) expect(isLook(lookFromSeed(i)), `seed ${i}`).toBe(true);
  });

  it('시드가 다르면 대체로 다른 외형', () => {
    const looks = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(lookFromSeed(i * 7919 + 13))));
    expect(looks.size).toBe(12);
  });
});

describe('isLook / lookOr', () => {
  it('색이 아니거나 모르는 머리 모양이면 거절', () => {
    const ok = lookFromSeed(1);
    expect(isLook({ ...ok, skin: 'red' })).toBe(false);
    expect(isLook({ ...ok, hairStyle: 'mohawk' })).toBe(false);
    expect(isLook(null)).toBe(false);
  });

  it('깨진 외형은 id 기반 외형으로 대체', () => {
    expect(lookOr({ skin: 1 }, 'rumi')).toEqual(lookFromSeed(hashString('rumi')));
  });
});

describe('방향', () => {
  it('이동 방향 → 화면 속 방향 (카메라가 앞쪽 위)', () => {
    expect(facingFrom(1, 0)).toBe('frontRight');
    expect(facingFrom(-1, 0.2)).toBe('frontLeft');
    expect(facingFrom(0.1, -1)).toBe('backRight');
    expect(facingFrom(0, -1, 'frontLeft')).toBe('backLeft');
    expect(facingFrom(0, 1, 'backRight')).toBe('frontRight');
    expect(facingFrom(0, 0, 'backLeft')).toBe('backLeft');
  });

  it('좌석 방향 → 앉은 사람 방향', () => {
    expect(facingOfSeat('down')).toBe('frontLeft');
    expect(facingOfSeat('up')).toBe('backRight');
  });
});
