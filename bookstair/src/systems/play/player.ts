import type { IsoFacing } from '../../types/character';
import type { BookTag } from '../../types/content';
import { facingFrom } from '../characters/look';
import type { Tile } from '../interior/connections';
import type { Rect } from '../interior/grid';
import type { Item, Point } from '../sim/sim';

/*
 * 사장님(플레이어) — 키보드로 걷거나, 바닥을 눌러 길찾기로 걷는다.
 * 가구가 있는 칸은 못 지나간다.
 */

export const PLAYER_SPEED = 3.4;
export const PLAYER_RADIUS = 0.28;
/** 책장에서 책 한 권 찾는 시간 */
export const SEARCH_SECONDS = 1.6;
/** 가구·손님과 상호작용할 수 있는 거리 */
export const REACH = 1.05;

/** 눌러서 걸어간 뒤 할 일 */
export type InteractTarget = { kind: 'customer'; id: number } | { kind: 'furniture'; uid: string };

export interface PlayerState {
  pos: Point;
  facing: IsoFacing;
  walking: boolean;
  carrying: Item | null;
  /** 길찾기로 따라가는 칸 중심들 */
  path: Point[];
  goal: InteractTarget | null;
  /** 책장에서 책 찾는 중 */
  search: { shelfUid: string; tag: BookTag; left: number } | null;
}

export function createPlayer(at: Tile): PlayerState {
  return { pos: { x: at.x + 0.5, y: at.y + 0.5 }, facing: 'frontRight', walking: false, carrying: null, path: [], goal: null, search: null };
}

export interface MoveInput {
  dx: number;
  dy: number;
}

/** 이 자리에 서면 가구·벽과 겹치는지 */
export function collides(p: Point, blocked: (x: number, y: number) => boolean): boolean {
  const r = PLAYER_RADIUS;
  for (let x = Math.floor(p.x - r); x <= Math.floor(p.x + r - 1e-9); x++) {
    for (let y = Math.floor(p.y - r); y <= Math.floor(p.y + r - 1e-9); y++) {
      if (blocked(x, y)) return true;
    }
  }
  return false;
}

/** 한 프레임 이동 — 키 입력이 있으면 길찾기를 취소하고, 축마다 따로 막힘을 검사해 벽을 타고 미끄러진다 */
export function stepPlayer(p: PlayerState, input: MoveInput, dt: number, blocked: (x: number, y: number) => boolean): PlayerState {
  const len = Math.hypot(input.dx, input.dy);
  if (len > 0) {
    const step = (PLAYER_SPEED * dt) / len;
    let pos = p.pos;
    const tryX = { x: pos.x + input.dx * step, y: pos.y };
    if (!collides(tryX, blocked)) pos = tryX;
    const tryY = { x: pos.x, y: pos.y + input.dy * step };
    if (!collides(tryY, blocked)) pos = tryY;
    return { ...p, pos, walking: true, facing: facingFrom(input.dx, input.dy, p.facing), path: [], goal: null, search: null };
  }

  if (p.path.length > 0) {
    const [next, ...rest] = p.path;
    const dx = next.x - p.pos.x;
    const dy = next.y - p.pos.y;
    const dist = Math.hypot(dx, dy);
    const step = PLAYER_SPEED * dt;
    const facing = facingFrom(dx, dy, p.facing);
    if (dist <= step) return { ...p, pos: next, path: rest, walking: rest.length > 0, facing };
    return { ...p, pos: { x: p.pos.x + (dx / dist) * step, y: p.pos.y + (dy / dist) * step }, walking: true, facing, search: null };
  }

  return p.walking ? { ...p, walking: false } : p;
}

/** 4방향 BFS — 시작 칸에서 goal 을 만족하는 칸까지 (시작 칸 제외, 도착 칸 포함). 못 가면 null */
export function findPath(
  from: Tile,
  isGoal: (t: Tile) => boolean,
  blocked: (x: number, y: number) => boolean,
  cols: number,
  rows: number,
): Tile[] | null {
  if (isGoal(from)) return [];
  const key = (t: Tile) => t.y * cols + t.x;
  const prev = new Map<number, Tile | null>([[key(from), null]]);
  const queue: Tile[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = { x: cur.x + dx, y: cur.y + dy };
      if (n.x < 0 || n.y < 0 || n.x >= cols || n.y >= rows || blocked(n.x, n.y) || prev.has(key(n))) continue;
      prev.set(key(n), cur);
      if (isGoal(n)) {
        const path: Tile[] = [];
        for (let t: Tile | null = n; t && key(t) !== key(from); t = prev.get(key(t)) ?? null) path.unshift(t);
        return path;
      }
      queue.push(n);
    }
  }
  return null;
}

/** 점과 사각형 사이 거리 */
export function distToRect(p: Point, r: Rect): number {
  const cx = Math.max(r.x, Math.min(p.x, r.x + r.w));
  const cy = Math.max(r.y, Math.min(p.y, r.y + r.h));
  return Math.hypot(p.x - cx, p.y - cy);
}

export const tileOf = (p: Point): Tile => ({ x: Math.floor(p.x), y: Math.floor(p.y) });
export const tileCenter = (t: Tile): Point => ({ x: t.x + 0.5, y: t.y + 0.5 });

/** 사각형(가구·손님) 앞까지 가는 길 — 손이 닿는 칸에서 멈춘다 */
export function pathToward(
  from: Point,
  rect: Rect,
  blocked: (x: number, y: number) => boolean,
  cols: number,
  rows: number,
): Tile[] | null {
  return findPath(tileOf(from), (t) => distToRect(tileCenter(t), rect) <= REACH - 0.1, blocked, cols, rows);
}
