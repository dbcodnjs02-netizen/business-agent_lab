import { describe, expect, it } from 'vitest';
import type { Reader, StoreSnapshot } from '../../types/social';
import { isLook, lookFromSeed } from '../characters/look';
import { place, testCtx } from '../interior/testCatalog';
import { MAX_READER_AFFINITY, decodeSnapshot, encodeSnapshot, readerBonus, recruitReader } from './social';

const reader: Reader = { id: 'r1', name: '루미', look: lookFromSeed(7), favoriteGenre: '위로', intro: '안녕하세요', generosity: 10 };

describe('recruitReader', () => {
  it('처음 초대하면 영입, 다시 초대하면 호감도 상승, 최대치에서 멈춤', () => {
    let r = recruitReader([], reader, 'store-a');
    expect(r.outcome).toBe('joined');
    expect(r.recruited).toEqual([{ ...reader, affinity: 1, fromStoreId: 'store-a' }]);

    r = recruitReader(r.recruited, reader, 'store-b');
    expect(r.outcome).toBe('affinity_up');
    expect(r.recruited[0]).toMatchObject({ affinity: 2, fromStoreId: 'store-a' });

    const maxed = [{ ...r.recruited[0], affinity: MAX_READER_AFFINITY }];
    expect(recruitReader(maxed, reader, 'x').outcome).toBe('maxed');
  });

  it('readerBonus: 기본 씀씀이 + 호감도', () => {
    expect(readerBonus({ ...reader, affinity: 3, fromStoreId: '' })).toBe(25);
  });
});

describe('공유 링크 스냅샷', () => {
  const snap: StoreSnapshot = {
    storeId: 'abc',
    storeName: '달빛 서점',
    ownerName: '채원',
    intro: '어서 오세요 ☕',
    layout: [place('a', 'sofa', 0, 1)],
    readers: [reader],
  };

  it('한글·이모지를 포함해 왕복 변환된다', () => {
    const code = encodeSnapshot(snap);
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeSnapshot(code, testCtx)).toEqual(snap);
  });

  it('깨진 코드나 규칙 위반 가구는 걸러낸다', () => {
    expect(decodeSnapshot('!!!', testCtx)).toBeNull();
    const bad = encodeSnapshot({ ...snap, layout: [place('a', 'sofa', 0, 1), place('b', 'sofa', 1, 1)] });
    expect(decodeSnapshot(bad, testCtx)?.layout.map((p) => p.uid)).toEqual(['a']);
  });

  it('외형이 없는 예전 링크의 독서가도 외형을 받는다', () => {
    const { look: _, ...old } = reader;
    const code = encodeSnapshot({ ...snap, readers: [{ ...old, emoji: '🧝' } as unknown as Reader] });
    const look = decodeSnapshot(code, testCtx)?.readers[0].look;
    expect(isLook(look)).toBe(true);
  });
});
