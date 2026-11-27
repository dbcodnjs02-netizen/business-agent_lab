import type { GridSize } from '../interior/grid';

/*
 * 가게 레벨 — 손님에게 음료·책을 건넬 때마다 경험치가 쌓인다.
 * 레벨이 오르면 매장이 넓어지고(ROOM_SIZES), 4레벨부터 동물 단골 후보가 찾아오며,
 * 5 · 10 · 50 · 100레벨에 알바 자리가 하나씩 열린다.
 */

export const MAX_LEVEL = 100;
/** 이 레벨부터 동물 단골 후보가 찾아온다 */
export const REGULAR_LEVEL = 4;
/** 알바 자리가 하나씩 열리는 레벨 (최대 4명) */
export const STAFF_UNLOCK_LEVELS = [5, 10, 50, 100] as const;

/** 행동별 경험치 */
export const EXP_GAIN = { drink: 8, book: 10, casting: 40 } as const;

/** 매장 크기 — 이 레벨이 되면 넓어진다 */
export const ROOM_SIZES: readonly ({ level: number } & GridSize)[] = [
  { level: 1, cols: 8, rows: 8 },
  { level: 3, cols: 9, rows: 8 },
  { level: 5, cols: 10, rows: 9 },
  { level: 10, cols: 11, rows: 10 },
  { level: 20, cols: 12, rows: 10 },
  { level: 30, cols: 13, rows: 11 },
  { level: 50, cols: 14, rows: 11 },
  { level: 75, cols: 15, rows: 12 },
  { level: 100, cols: 16, rows: 12 },
];

/** 다음 레벨까지 필요한 경험치 */
export const expToNext = (level: number) => 20 + 20 * level;

export interface LevelState {
  level: number;
  /** 지금 레벨에서 모은 경험치 */
  exp: number;
}

/** 경험치를 더하고 넘친 만큼 레벨업 (최고 레벨에선 더 쌓이지 않음) */
export function addExp(state: LevelState, gain: number): LevelState & { levelsGained: number } {
  let { level, exp } = state;
  const from = level;
  exp += Math.max(0, gain);
  while (level < MAX_LEVEL && exp >= expToNext(level)) {
    exp -= expToNext(level);
    level += 1;
  }
  if (level >= MAX_LEVEL) exp = 0;
  return { level, exp, levelsGained: level - from };
}

export function roomFor(level: number): GridSize {
  let room: GridSize = ROOM_SIZES[0];
  for (const r of ROOM_SIZES) if (level >= r.level) room = r;
  return { cols: room.cols, rows: room.rows };
}

/** 고용할 수 있는 알바 수 */
export const staffSlots = (level: number) => STAFF_UNLOCK_LEVELS.filter((l) => level >= l).length;

/** 손님이 드나드는 칸 — 왼쪽 벽 출입구 앞 */
export const entranceOf = (room: GridSize) => ({ x: 0, y: room.rows - 2 });

/** 한 번에 매장에 있을 수 있는 손님 수 — 넓어질수록 많아진다 */
export const maxCustomersFor = (room: GridSize) => Math.max(5, Math.round((room.cols * room.rows) / 12));

export type LevelPerk =
  | { kind: 'room'; cols: number; rows: number }
  | { kind: 'regulars' }
  | { kind: 'staff'; slots: number };

/** 정확히 이 레벨에 열리는 것 */
export function perksAt(level: number): LevelPerk[] {
  const perks: LevelPerk[] = [];
  const room = ROOM_SIZES.find((r) => r.level === level && level > 1);
  if (room) perks.push({ kind: 'room', cols: room.cols, rows: room.rows });
  if (level === REGULAR_LEVEL) perks.push({ kind: 'regulars' });
  if ((STAFF_UNLOCK_LEVELS as readonly number[]).includes(level)) perks.push({ kind: 'staff', slots: staffSlots(level) });
  return perks;
}

export function perkText(p: LevelPerk): string {
  switch (p.kind) {
    case 'room':
      return `매장이 ${p.cols}×${p.rows} 칸으로 넓어져요`;
    case 'regulars':
      return '동물 단골 후보가 찾아와요';
    case 'staff':
      return `알바를 ${p.slots}명까지 고용할 수 있어요`;
  }
}

/** 지금보다 높은 레벨 중 가장 가까운 혜택 */
export function nextPerk(level: number): { level: number; perks: LevelPerk[] } | null {
  for (let l = level + 1; l <= MAX_LEVEL; l++) {
    const perks = perksAt(l);
    if (perks.length > 0) return { level: l, perks };
  }
  return null;
}
