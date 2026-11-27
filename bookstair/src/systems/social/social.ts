import type { Reader, RecruitedReader, StoreSnapshot } from '../../types/social';
import { lookOr } from '../characters/look';
import { sanitizeLayout, type GridContext } from '../interior/grid';
import { isRecord } from '../save/save';

export const MAX_READER_AFFINITY = 5;

export type RecruitOutcome = 'joined' | 'affinity_up' | 'maxed';

/** "내 서점으로 초대하기" — 처음이면 영입, 이미 영입했으면 호감도 상승 */
export function recruitReader(
  recruited: readonly RecruitedReader[],
  reader: Reader,
  fromStoreId: string,
): { recruited: RecruitedReader[]; outcome: RecruitOutcome } {
  const existing = recruited.find((r) => r.id === reader.id);
  if (!existing) {
    return { recruited: [...recruited, { ...reader, affinity: 1, fromStoreId }], outcome: 'joined' };
  }
  if (existing.affinity >= MAX_READER_AFFINITY) return { recruited: [...recruited], outcome: 'maxed' };
  return {
    recruited: recruited.map((r) => (r.id === reader.id ? { ...r, affinity: r.affinity + 1 } : r)),
    outcome: 'affinity_up',
  };
}

/** 영입한 독서가가 손님으로 와서 계산할 때 더 내는 금액 */
export function readerBonus(r: RecruitedReader): number {
  return r.generosity + r.affinity * 5;
}

/*
 * 공유 링크 — 서버가 없어도 다른 사람이 내 서점을 구경할 수 있도록
 * 스냅샷을 URL 에 base64url(JSON) 로 담는다.
 */

export function encodeSnapshot(s: StoreSnapshot): string {
  const bytes = new TextEncoder().encode(JSON.stringify(s));
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeSnapshot(code: string, ctx: GridContext): StoreSnapshot | null {
  try {
    const bin = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
    const raw: unknown = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0))));
    if (!isRecord(raw) || typeof raw.storeId !== 'string') return null;
    return {
      storeId: raw.storeId,
      storeName: typeof raw.storeName === 'string' ? raw.storeName : '이름 없는 서점',
      ownerName: typeof raw.ownerName === 'string' ? raw.ownerName : '익명의 사장님',
      intro: typeof raw.intro === 'string' ? raw.intro : '',
      layout: sanitizeLayout(raw.layout, ctx),
      readers: Array.isArray(raw.readers) ? raw.readers.flatMap(toReader).slice(0, 6) : [],
    };
  } catch {
    return null;
  }
}

function toReader(v: unknown): Reader[] {
  if (
    !isRecord(v) ||
    typeof v.id !== 'string' ||
    typeof v.name !== 'string' ||
    typeof v.favoriteGenre !== 'string' ||
    typeof v.generosity !== 'number'
  ) {
    return [];
  }
  return [
    {
      id: v.id,
      name: v.name,
      look: lookOr(v.look, v.id),
      favoriteGenre: v.favoriteGenre as Reader['favoriteGenre'],
      intro: typeof v.intro === 'string' ? v.intro.slice(0, 80) : undefined,
      generosity: v.generosity,
    },
  ];
}
