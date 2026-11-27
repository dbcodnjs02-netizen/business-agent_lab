/*
 * 손님 도감 — 유형별 방문(계산) 횟수만 저장하고, 하트는 횟수에서 계산한다.
 */

/** 하트 n개가 되려면 필요한 누적 방문 수 */
export const HEART_VISITS = [1, 3, 6, 10, 15] as const;
export const MAX_COLLECTION_HEARTS = HEART_VISITS.length;

export type CustomerBook = Record<string, number>;

export function collectionHearts(visits: number): number {
  return HEART_VISITS.filter((need) => visits >= need).length;
}

/** 다음 하트까지 진행도 (0~1). 최대면 1 */
export function heartProgress(visits: number): number {
  const hearts = collectionHearts(visits);
  if (hearts >= MAX_COLLECTION_HEARTS) return 1;
  const from = hearts === 0 ? 0 : HEART_VISITS[hearts - 1];
  const to = HEART_VISITS[hearts];
  return (visits - from) / (to - from);
}

/** 계산을 마친 손님 유형을 도감에 기록 — 처음 등록된 유형도 돌려준다 */
export function recordVisits(book: CustomerBook, typeIds: readonly string[]): { book: CustomerBook; discovered: string[] } {
  if (typeIds.length === 0) return { book, discovered: [] };
  const next = { ...book };
  const discovered: string[] = [];
  for (const id of typeIds) {
    if (!next[id]) discovered.push(id);
    next[id] = (next[id] ?? 0) + 1;
  }
  return { book: next, discovered };
}
