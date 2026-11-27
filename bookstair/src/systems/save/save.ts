import type { GuestId, GuestProgress } from '../../types/guest';
import type { FurnitureId, PlacedFurniture } from '../../types/interior';
import type { RecruitedReader } from '../../types/social';
import { lookOr } from '../characters/look';
import { isTutorialStep, type TutorialStep } from '../tutorial/tutorial';
import { sanitizeLayout, type GridContext, type GridSize } from '../interior/grid';
import { MAX_LEVEL, REGULAR_LEVEL } from '../level/level';

/*
 * 세이브 데이터 — 브라우저 저장(localStorage)과 JSON 내보내기/가져오기, 나중에 서버 동기화가
 * 모두 이 한 가지 형태를 쓴다. 불러오는 쪽은 항상 sanitizeSave 를 거친다.
 */

export interface StoreProfile {
  storeId: string;
  storeName: string;
  ownerName: string;
}

export interface SaveData {
  profile: StoreProfile;
  day: number;
  /** 하루 중 시각(분). 600 = 오전 10:00 */
  minutes: number;
  coins: number;
  reputation: number;
  layout: PlacedFurniture[];
  inventory: Partial<Record<FurnitureId, number>>;
  guestProgress: Record<GuestId, GuestProgress>;
  recruited: RecruitedReader[];
  /** 손님 도감: 유형 id → 계산한 횟수 */
  customerBook: Record<string, number>;
  /** 첫 영업 튜토리얼 진행 단계 */
  tutorial: TutorialStep;
  /** 가게 레벨 · 지금 레벨에서 모은 경험치 */
  level: number;
  exp: number;
  /** 고용한 알바 (StaffDef id) */
  staff: string[];
}

export const SAVE_VERSION = 2;

export interface SaveContext {
  /** 가구 카탈로그 (grid 는 roomFor 가 없을 때의 매장 크기) */
  interior: GridContext;
  /** 레벨별 매장 크기 — 매장 밖으로 나간 가구는 보관함으로 돌려보낸다 */
  roomFor?: (level: number) => GridSize;
  staffIds?: readonly string[];
  guestIds: readonly GuestId[];
  customerTypeIds: readonly string[];
}

/** 알 수 없는 값을 세이브 데이터로 — 깨진 필드는 fallback 값으로, 규칙 위반 가구는 제거 */
export function sanitizeSave(raw: unknown, fallback: SaveData, ctx: SaveContext): SaveData {
  const saved = isRecord(raw) ? raw : {};
  const profile = isRecord(saved.profile) ? saved.profile : {};
  const level = Math.min(MAX_LEVEL, Math.max(1, Math.floor(num(saved.level, fallback.level))));
  const room: GridContext = { catalog: ctx.interior.catalog, grid: ctx.roomFor?.(level) ?? ctx.interior.grid };
  const layout = Array.isArray(saved.layout) ? sanitizeLayout(saved.layout, room) : fallback.layout;
  const inventory: SaveData['inventory'] = isRecord(saved.inventory)
    ? (Object.fromEntries(
        Object.entries(saved.inventory).filter(
          ([id, n]) => ctx.interior.catalog[id] && typeof n === 'number' && Number.isInteger(n) && n >= 0,
        ),
      ) as SaveData['inventory'])
    : { ...fallback.inventory };
  // 매장보다 커서(예전 10×10 세이브) 놓을 수 없게 된 가구는 보관함으로
  if (Array.isArray(saved.layout) && ctx.roomFor) {
    const kept = new Set(layout.map((p) => p.uid));
    const all = sanitizeLayout(saved.layout, { catalog: ctx.interior.catalog, grid: { cols: 99, rows: 99 } });
    for (const p of all) if (!kept.has(p.uid)) inventory[p.furnitureId] = (inventory[p.furnitureId] ?? 0) + 1;
  }

  return {
    profile: {
      storeId: str(profile.storeId, fallback.profile.storeId),
      storeName: str(profile.storeName, fallback.profile.storeName),
      ownerName: str(profile.ownerName, fallback.profile.ownerName),
    },
    day: num(saved.day, fallback.day),
    minutes: num(saved.minutes, fallback.minutes),
    coins: num(saved.coins, fallback.coins),
    reputation: num(saved.reputation, fallback.reputation),
    layout,
    inventory,
    guestProgress: {
      ...fallback.guestProgress,
      ...(isRecord(saved.guestProgress)
        ? (Object.fromEntries(
            Object.entries(saved.guestProgress)
              .filter(([id, p]) => ctx.guestIds.includes(id) && isProgress(p))
              // 캐스팅이 생기기 전 세이브의 손님은 이미 단골이었다
              .map(([id, p]) => [id, { ...(p as GuestProgress), isRegular: (p as Partial<GuestProgress>).isRegular ?? true }]),
          ) as Record<GuestId, GuestProgress>)
        : {}),
    },
    recruited: Array.isArray(saved.recruited) ? saved.recruited.flatMap(toRecruited) : fallback.recruited,
    customerBook: isRecord(saved.customerBook)
      ? (Object.fromEntries(
          Object.entries(saved.customerBook).filter(
            ([id, n]) => ctx.customerTypeIds.includes(id) && typeof n === 'number' && Number.isInteger(n) && n > 0,
          ),
        ) as SaveData['customerBook'])
      : fallback.customerBook,
    tutorial: tutorialOf(saved, raw, fallback, level),
    level,
    exp: Math.max(0, num(saved.exp, fallback.exp)),
    staff: Array.isArray(saved.staff)
      ? [...new Set(saved.staff.filter((id): id is string => typeof id === 'string' && (!ctx.staffIds || ctx.staffIds.includes(id))))]
      : fallback.staff,
  };
}

function tutorialOf(saved: Record<string, unknown>, raw: unknown, fallback: SaveData, level: number): TutorialStep {
  // 튜토리얼이 생기기 전 세이브는 이미 가게를 꾸며 둔 상태라 끝난 것으로 본다
  if (!isTutorialStep(saved.tutorial)) return isRecord(raw) && Array.isArray(saved.layout) ? 'done' : fallback.tutorial;
  // 레벨이 생기기 전 세이브: 단골 만들기 단계였다면 4레벨까지 키우기부터
  if (level < REGULAR_LEVEL && (saved.tutorial === 'meet' || saved.tutorial === 'shelf' || saved.tutorial === 'cast')) return 'grow';
  return saved.tutorial;
}

/** 파일로 저장할 JSON 문자열 */
export function exportSave(data: SaveData): string {
  return JSON.stringify({ game: 'bookstair', version: SAVE_VERSION, exportedAt: new Date().toISOString(), data }, null, 2);
}

export type ImportResult = { ok: true; data: SaveData } | { ok: false; message: string };

export function importSave(json: string, fallback: SaveData, ctx: SaveContext): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, message: 'JSON 형식이 아니에요.' };
  }
  if (!isRecord(parsed) || parsed.game !== 'bookstair' || !isRecord(parsed.data)) {
    return { ok: false, message: '북스테어 세이브 파일이 아니에요.' };
  }
  return { ok: true, data: sanitizeSave(parsed.data, fallback, ctx) };
}

function isProgress(v: unknown): v is GuestProgress {
  return (
    isRecord(v) &&
    typeof v.friendshipLevel === 'number' &&
    typeof v.exp === 'number' &&
    Array.isArray(v.unlockedEpisodes) &&
    Array.isArray(v.completedCurations) &&
    typeof v.visitCount === 'number'
  );
}

/** 예전 세이브(이모지 시절)의 독서가는 id 로 외형을 만들어 준다 */
function toRecruited(v: unknown): RecruitedReader[] {
  if (!isRecord(v) || typeof v.id !== 'string' || typeof v.name !== 'string' || typeof v.affinity !== 'number') return [];
  return [{ ...(v as unknown as RecruitedReader), look: lookOr(v.look, v.id) }];
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function str(v: unknown, fallback: string): string {
  return typeof v === 'string' && v.trim() ? v : fallback;
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}
