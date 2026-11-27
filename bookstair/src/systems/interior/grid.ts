import type { Facing, FurnitureDef, FurnitureId, PlacedFurniture, Rotation } from '../../types/interior';

/*
 * 인테리어 그리드 배치 로직 — React·스토어와 무관한 순수 함수.
 * 여기서는 "놓을 수 있는가"(필수 규칙)만 다룬다.
 * 소파-책상 연결처럼 "놓을 수는 있지만 제 역할을 하는가"는 connections.ts.
 * 모든 조작 함수는 기존 layout 을 바꾸지 않고 새 배열을 돌려준다.
 */

export interface GridSize {
  cols: number;
  rows: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 배치 검증에 필요한 환경: 가구 카탈로그 + 매장 크기 */
export interface GridContext {
  catalog: Record<FurnitureId, FurnitureDef>;
  grid: GridSize;
}

export interface PlacementCandidate {
  furnitureId: FurnitureId;
  x: number;
  y: number;
  rotation?: Rotation;
}

export type PlacementError =
  | { ok: false; reason: 'unknown_furniture' }
  | { ok: false; reason: 'not_rotatable' }
  | { ok: false; reason: 'out_of_bounds' }
  | { ok: false; reason: 'wall_only' }
  | { ok: false; reason: 'collision'; conflicts: string[] }
  /** 내 앞 공간이 막힘 */
  | { ok: false; reason: 'front_blocked'; conflicts: string[] }
  /** 다른 가구의 앞 공간을 막음 */
  | { ok: false; reason: 'blocks_front'; conflicts: string[] }
  | { ok: false; reason: 'not_found' };

export type PlacementCheck = { ok: true; rect: Rect } | PlacementError;
export type LayoutResult = { ok: true; layout: PlacedFurniture[] } | PlacementError;

export const PLACEMENT_MESSAGES: Record<PlacementError['reason'], string> = {
  unknown_furniture: '알 수 없는 가구예요.',
  not_rotatable: '이 가구는 돌릴 수 없어요.',
  out_of_bounds: '매장 밖으로 나가요.',
  wall_only: '벽에 붙여야 하는 가구예요. 벽 쪽 맨 끝 줄에 놓아주세요.',
  collision: '다른 가구와 겹쳐요.',
  front_blocked: '앞쪽에 손님이 설 공간이 필요해요.',
  blocks_front: '다른 가구 앞을 막아요.',
  not_found: '배치된 가구를 찾을 수 없어요.',
};

const FACINGS: Facing[] = ['down', 'left', 'up', 'right'];

export function facingOf(rotation: Rotation): Facing {
  return FACINGS[rotation];
}

export function nextRotation(rotation: Rotation): Rotation {
  return ((rotation + 1) % 4) as Rotation;
}

/**
 * 벽 가구가 붙을 수 있는 방향.
 * 0 = 오른쪽 뒷벽(y = 0)에 붙어 +y 를 바라봄, 3 = 왼쪽 뒷벽(x = 0)에 붙어 +x 를 바라봄
 */
const WALL_ROTATIONS: readonly Rotation[] = [0, 3];

/** 회전 버튼을 눌렀을 때의 다음 방향 (벽 가구는 두 벽 사이를 오감) */
export function rotationAfter(def: FurnitureDef, rotation: Rotation): Rotation {
  if (def.placement === 'wall') return rotation === 0 ? 3 : 0;
  return nextRotation(rotation);
}

export function footprint(def: FurnitureDef, x: number, y: number, rotation: Rotation = 0): Rect {
  return rotation % 2 === 1 ? { x, y, w: def.h, h: def.w } : { x, y, w: def.w, h: def.h };
}

export function rectOf(p: PlacedFurniture, catalog: GridContext['catalog']): Rect | null {
  const def = catalog[p.furnitureId];
  return def ? footprint(def, p.x, p.y, p.rotation) : null;
}

/** 가구가 바라보는 쪽으로 depth 칸 만큼의 띠 영역 */
export function frontStrip(rect: Rect, rotation: Rotation, depth = 1): Rect {
  switch (facingOf(rotation)) {
    case 'down':
      return { x: rect.x, y: rect.y + rect.h, w: rect.w, h: depth };
    case 'up':
      return { x: rect.x, y: rect.y - depth, w: rect.w, h: depth };
    case 'left':
      return { x: rect.x - depth, y: rect.y, w: depth, h: rect.h };
    case 'right':
      return { x: rect.x + rect.w, y: rect.y, w: depth, h: rect.h };
  }
}

/** 앞 공간(clearance) 영역. 확보가 필요 없는 가구면 null */
export function clearanceOf(p: PlacedFurniture, catalog: GridContext['catalog']): Rect | null {
  const def = catalog[p.furnitureId];
  const rect = rectOf(p, catalog);
  if (!def || !rect || def.clearance <= 0) return null;
  return frontStrip(rect, p.rotation, def.clearance);
}

export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

export function inBounds(r: Rect, grid: GridSize): boolean {
  return (
    Number.isInteger(r.x) &&
    Number.isInteger(r.y) &&
    r.x >= 0 &&
    r.y >= 0 &&
    r.x + r.w <= grid.cols &&
    r.y + r.h <= grid.rows
  );
}

/**
 * candidate 를 layout 에 놓을 수 있는지 검사 (필수 규칙).
 * ignoreUid: 이동·회전할 때 자기 자신은 무시한다.
 */
export function checkPlacement(
  layout: readonly PlacedFurniture[],
  candidate: PlacementCandidate,
  ctx: GridContext,
  ignoreUid?: string,
): PlacementCheck {
  const def = ctx.catalog[candidate.furnitureId];
  if (!def) return { ok: false, reason: 'unknown_furniture' };

  const rotation = candidate.rotation ?? 0;
  if (rotation !== 0 && !def.rotatable) return { ok: false, reason: 'not_rotatable' };
  if (def.placement === 'wall' && !WALL_ROTATIONS.includes(rotation)) return { ok: false, reason: 'not_rotatable' };

  const rect = footprint(def, candidate.x, candidate.y, rotation);
  if (!inBounds(rect, ctx.grid)) return { ok: false, reason: 'out_of_bounds' };
  if (def.placement === 'wall' && (rotation === 0 ? rect.y !== 0 : rect.x !== 0)) {
    return { ok: false, reason: 'wall_only' };
  }

  const others = layout.filter((p) => p.uid !== ignoreUid);
  const hits = (area: Rect) =>
    others
      .filter((p) => {
        const r = rectOf(p, ctx.catalog);
        return r !== null && overlaps(area, r);
      })
      .map((p) => p.uid);

  const conflicts = hits(rect);
  if (conflicts.length > 0) return { ok: false, reason: 'collision', conflicts };

  if (def.clearance > 0) {
    const front = frontStrip(rect, rotation, def.clearance);
    if (!inBounds(front, ctx.grid)) return { ok: false, reason: 'front_blocked', conflicts: [] };
    const blockers = hits(front);
    if (blockers.length > 0) return { ok: false, reason: 'front_blocked', conflicts: blockers };
  }

  const blocked = others
    .filter((p) => {
      const zone = clearanceOf(p, ctx.catalog);
      return zone !== null && overlaps(rect, zone);
    })
    .map((p) => p.uid);
  if (blocked.length > 0) return { ok: false, reason: 'blocks_front', conflicts: blocked };

  return { ok: true, rect };
}

/** 타일별 점유 가구 uid (행 우선, 길이 cols × rows) */
export function buildOccupancy(layout: readonly PlacedFurniture[], ctx: GridContext): (string | null)[] {
  const { cols, rows } = ctx.grid;
  const cells: (string | null)[] = Array(cols * rows).fill(null);
  for (const p of layout) {
    const r = rectOf(p, ctx.catalog);
    if (!r) continue;
    for (let y = r.y; y < Math.min(r.y + r.h, rows); y++) {
      for (let x = r.x; x < Math.min(r.x + r.w, cols); x++) {
        cells[y * cols + x] = p.uid;
      }
    }
  }
  return cells;
}

/** 좌상단부터 훑어 처음으로 놓을 수 있는 좌표 */
export function findFreeSpot(
  layout: readonly PlacedFurniture[],
  furnitureId: FurnitureId,
  ctx: GridContext,
  rotation: Rotation = 0,
): { x: number; y: number } | null {
  for (let y = 0; y < ctx.grid.rows; y++) {
    for (let x = 0; x < ctx.grid.cols; x++) {
      if (checkPlacement(layout, { furnitureId, x, y, rotation }, ctx).ok) return { x, y };
    }
  }
  return null;
}

export function addFurniture(
  layout: readonly PlacedFurniture[],
  item: PlacedFurniture,
  ctx: GridContext,
): LayoutResult {
  const check = checkPlacement(layout, item, ctx);
  return check.ok ? { ok: true, layout: [...layout, item] } : check;
}

export function moveFurniture(
  layout: readonly PlacedFurniture[],
  uid: string,
  x: number,
  y: number,
  ctx: GridContext,
): LayoutResult {
  return updatePlaced(layout, uid, ctx, (p) => ({ ...p, x, y }));
}

/** 제자리(좌상단 고정)에서 회전. 일반 가구는 시계 방향 90°, 벽 가구는 반대편 벽 방향 */
export function rotateFurniture(
  layout: readonly PlacedFurniture[],
  uid: string,
  ctx: GridContext,
): LayoutResult {
  return updatePlaced(layout, uid, ctx, (p) => {
    const def = ctx.catalog[p.furnitureId];
    return { ...p, rotation: def ? rotationAfter(def, p.rotation) : nextRotation(p.rotation) };
  });
}

export function removeFurniture(layout: readonly PlacedFurniture[], uid: string): PlacedFurniture[] {
  return layout.filter((p) => p.uid !== uid);
}

/**
 * 저장 데이터 불러올 때 사용. 형식이 틀리거나, 카탈로그에 없거나,
 * 앞의 가구와 규칙이 충돌하는 항목은 버리고 유효한 것만 남긴다.
 */
export function sanitizeLayout(raw: unknown, ctx: GridContext): PlacedFurniture[] {
  if (!Array.isArray(raw)) return [];
  const result: PlacedFurniture[] = [];
  for (const item of raw) {
    if (!isPlacedFurniture(item) || result.some((p) => p.uid === item.uid)) continue;
    if (checkPlacement(result, item, ctx).ok) result.push(item);
  }
  return result;
}

function updatePlaced(
  layout: readonly PlacedFurniture[],
  uid: string,
  ctx: GridContext,
  change: (p: PlacedFurniture) => PlacedFurniture,
): LayoutResult {
  const current = layout.find((p) => p.uid === uid);
  if (!current) return { ok: false, reason: 'not_found' };
  const next = change(current);
  const check = checkPlacement(layout, next, ctx, uid);
  if (!check.ok) return check;
  return { ok: true, layout: layout.map((p) => (p.uid === uid ? next : p)) };
}

function isPlacedFurniture(v: unknown): v is PlacedFurniture {
  if (typeof v !== 'object' || v === null) return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.uid === 'string' &&
    typeof p.furnitureId === 'string' &&
    typeof p.x === 'number' &&
    typeof p.y === 'number' &&
    (p.rotation === 0 || p.rotation === 1 || p.rotation === 2 || p.rotation === 3)
  );
}
