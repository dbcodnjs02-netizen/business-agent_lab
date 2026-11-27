import { describe, expect, it } from 'vitest';
import { isLook } from '../characters/look';
import { place, testCtx } from '../interior/testCatalog';
import { exportSave, importSave, sanitizeSave, type SaveContext, type SaveData } from './save';

const ctx: SaveContext = { interior: testCtx, guestIds: ['g1'], customerTypeIds: ['t1'] };

const fallback: SaveData = {
  profile: { storeId: 'me', storeName: '북스테어', ownerName: '사장님' },
  day: 1,
  minutes: 600,
  coins: 100,
  reputation: 10,
  layout: [place('a', 'sofa', 0, 1)],
  inventory: { table: 1 },
  guestProgress: {
    g1: { guestId: 'g1', isRegular: false, friendshipLevel: 0, exp: 0, unlockedEpisodes: [], completedCurations: [], visitCount: 0 },
  },
  recruited: [],
  customerBook: { t1: 2 },
  tutorial: 'welcome',
  level: 1,
  exp: 0,
  staff: [],
};

describe('sanitizeSave', () => {
  it('깨진 필드는 기본값, 정상 필드는 유지', () => {
    const data = sanitizeSave(
      {
        coins: 'lots',
        day: 3,
        profile: { storeName: '달빛 서점', storeId: '' },
        inventory: { table: 2, piano: 1, sofa: -1 },
        guestProgress: { g1: { broken: true }, ghost: fallback.guestProgress.g1 },
        recruited: [{ id: 'r', name: '루미', affinity: 2 }, { id: 3 }],
        customerBook: { t1: 4, ghost: 1, t2: -1 },
      },
      fallback,
      ctx,
    );
    expect(data.coins).toBe(100);
    expect(data.day).toBe(3);
    expect(data.profile).toEqual({ storeId: 'me', storeName: '달빛 서점', ownerName: '사장님' });
    expect(data.inventory).toEqual({ table: 2 });
    expect(data.guestProgress).toEqual(fallback.guestProgress);
    expect(data.recruited).toHaveLength(1);
    expect(isLook(data.recruited[0].look)).toBe(true);
    expect(data.customerBook).toEqual({ t1: 4 });
  });

  it('캐스팅이 생기기 전 세이브의 손님은 단골로 본다', () => {
    const { isRegular: _, ...old } = fallback.guestProgress.g1;
    expect(sanitizeSave({ guestProgress: { g1: old } }, fallback, ctx).guestProgress.g1.isRegular).toBe(true);
  });

  it('튜토리얼 필드가 없는 예전 세이브는 끝난 것으로 본다', () => {
    expect(sanitizeSave({ layout: [] }, fallback, ctx).tutorial).toBe('done');
    expect(sanitizeSave({ layout: [], tutorial: 'chairs' }, fallback, ctx).tutorial).toBe('chairs');
  });

  it('레벨은 1~100, 알바는 아는 사람만 한 번씩', () => {
    const c = { ...ctx, staffIds: ['minji'] };
    const data = sanitizeSave({ level: 250.7, exp: -3, staff: ['minji', 'ghost', 'minji', 3] }, fallback, c);
    expect(data.level).toBe(100);
    expect(data.exp).toBe(0);
    expect(data.staff).toEqual(['minji']);
  });

  it('레벨 매장보다 밖에 있던 가구(예전 10×10 세이브)는 보관함으로 돌아간다', () => {
    const c = { ...ctx, interior: { ...testCtx, grid: { cols: 10, rows: 10 } }, roomFor: () => ({ cols: 3, rows: 3 }) };
    const data = sanitizeSave({ layout: [place('a', 'table', 0, 2), place('b', 'table', 5, 5)], inventory: { table: 1 } }, fallback, c);
    expect(data.layout.map((p) => p.uid)).toEqual(['a']);
    expect(data.inventory).toEqual({ table: 2 });
  });

  it('레벨이 생기기 전 세이브가 단골 만들기 단계였다면 4레벨 키우기부터', () => {
    expect(sanitizeSave({ layout: [], tutorial: 'shelf' }, fallback, ctx).tutorial).toBe('grow');
    expect(sanitizeSave({ layout: [], tutorial: 'shelf', level: 4 }, fallback, ctx).tutorial).toBe('shelf');
  });

  it('완전히 엉뚱한 값이면 fallback 그대로', () => {
    expect(sanitizeSave(null, fallback, ctx)).toEqual(fallback);
  });
});

describe('exportSave / importSave', () => {
  it('왕복 변환', () => {
    const changed = { ...fallback, coins: 999, layout: [place('b', 'table', 3, 3)] };
    const r = importSave(exportSave(changed), fallback, ctx);
    expect(r).toEqual({ ok: true, data: changed });
  });

  it('잘못된 파일은 이유와 함께 거절', () => {
    expect(importSave('{nope', fallback, ctx)).toMatchObject({ ok: false, message: 'JSON 형식이 아니에요.' });
    expect(importSave('{"hello":1}', fallback, ctx)).toMatchObject({ ok: false });
  });
});
