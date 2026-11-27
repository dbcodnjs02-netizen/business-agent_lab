import type { Book, BookTag, DrinkId } from '../../types/content';
import type { PlacedFurniture } from '../../types/interior';
import { buildOccupancy, clearanceOf, frontStrip, inBounds, overlaps, rectOf, type GridContext, type Rect } from './grid';

/*
 * 배치 상태 분석 — 놓을 수는 있지만 "제 역할을 하는가"를 판정한다.
 *
 * 소파·책상 연결 규칙:
 *   좌석(seat)이 바라보는 쪽 바로 앞 한 줄에 책상(desk)이 닿아 있으면 세트로 연결된다.
 *   책상마다 연결 가능한 좌석 수(maxLinkedSeats)가 있으며, 배치 순서대로 먼저 연결된다.
 *   연결된 좌석에만 손님이 앉는다.
 */

export interface SeatLink {
  seatUid: string;
  deskUid: string;
}

/** 손님 한 명이 앉는 칸 */
export interface SeatSlot {
  seatUid: string;
  x: number;
  y: number;
}

export interface Tile {
  x: number;
  y: number;
}

export type LayoutWarning =
  | { kind: 'seat_without_desk'; uid: string }
  | { kind: 'desk_full'; uid: string; deskUid: string }
  | { kind: 'desk_without_seat'; uid: string }
  | { kind: 'no_bookshelf' }
  | { kind: 'no_brewer' };

export interface LayoutAnalysis {
  seatLinks: SeatLink[];
  seatSlots: SeatSlot[];
  /** 책장들이 제공하는 큐레이션 도서 풀 */
  shelf: { capacity: number; genres: BookTag[] };
  /** 커피머신들이 만들 수 있는 음료 */
  menu: DrinkId[];
  /** 손님이 책을 고르러 서는 칸 (책장 앞 공간) */
  browseSpots: Tile[];
  /** 손님이 계산하러 서는 칸 (커피머신 앞 공간) */
  counterSpots: Tile[];
  warnings: LayoutWarning[];
}

export function analyzeLayout(layout: readonly PlacedFurniture[], ctx: GridContext): LayoutAnalysis {
  const roleOf = (p: PlacedFurniture) => ctx.catalog[p.furnitureId]?.role;

  const desks = layout.filter((p) => roleOf(p)?.kind === 'desk');
  const linkCount = new Map<string, number>(desks.map((d) => [d.uid, 0]));
  const seatLinks: SeatLink[] = [];
  const seatSlots: SeatSlot[] = [];
  const warnings: LayoutWarning[] = [];
  let capacity = 0;
  const genres = new Set<BookTag>();
  const menu = new Set<DrinkId>();
  const browseSpots: Tile[] = [];
  const counterSpots: Tile[] = [];
  const frontTiles = (p: PlacedFurniture) => {
    const zone = clearanceOf(p, ctx.catalog);
    return zone && inBounds(zone, ctx.grid) ? tilesOf(zone) : [];
  };

  for (const p of layout) {
    const role = roleOf(p);
    const rect = rectOf(p, ctx.catalog);
    if (!role || !rect) continue;

    if (role.kind === 'bookshelf') {
      capacity += role.bookCapacity;
      role.genres.forEach((g) => genres.add(g));
      browseSpots.push(...frontTiles(p));
    } else if (role.kind === 'brewer') {
      role.menu.forEach((d) => menu.add(d));
      counterSpots.push(...frontTiles(p));
    } else if (role.kind === 'seat') {
      const front = frontStrip(rect, p.rotation);
      const facingDesks = desks.filter((d) => {
        const r = rectOf(d, ctx.catalog);
        return r !== null && overlaps(front, r);
      });
      const desk = facingDesks.find((d) => {
        const deskRole = roleOf(d);
        return deskRole?.kind === 'desk' && linkCount.get(d.uid)! < deskRole.maxLinkedSeats;
      });

      if (desk) {
        linkCount.set(desk.uid, linkCount.get(desk.uid)! + 1);
        seatLinks.push({ seatUid: p.uid, deskUid: desk.uid });
        // 좌석 영역의 칸을 앞에서부터 손님 수만큼 사용
        for (let i = 0; i < Math.min(role.seats, rect.w * rect.h); i++) {
          seatSlots.push({ seatUid: p.uid, x: rect.x + (i % rect.w), y: rect.y + Math.floor(i / rect.w) });
        }
      } else if (facingDesks.length > 0) {
        warnings.push({ kind: 'desk_full', uid: p.uid, deskUid: facingDesks[0].uid });
      } else {
        warnings.push({ kind: 'seat_without_desk', uid: p.uid });
      }
    }
  }

  for (const d of desks) {
    if (linkCount.get(d.uid) === 0) warnings.push({ kind: 'desk_without_seat', uid: d.uid });
  }
  if (capacity === 0) warnings.push({ kind: 'no_bookshelf' });
  if (menu.size === 0) warnings.push({ kind: 'no_brewer' });

  return {
    seatLinks,
    seatSlots,
    shelf: { capacity, genres: [...genres] },
    menu: [...menu],
    browseSpots,
    counterSpots,
    warnings,
  };
}

function tilesOf(r: Rect): Tile[] {
  const tiles: Tile[] = [];
  for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles.push({ x, y });
  return tiles;
}

export function describeWarning(w: LayoutWarning, layout: readonly PlacedFurniture[], ctx: GridContext): string {
  const nameOf = (uid: string) => {
    const p = layout.find((f) => f.uid === uid);
    return (p && ctx.catalog[p.furnitureId]?.name) ?? '가구';
  };
  switch (w.kind) {
    case 'seat_without_desk':
      return `${nameOf(w.uid)}: 바라보는 쪽에 책상이 없어 손님이 앉지 않아요.`;
    case 'desk_full':
      return `${nameOf(w.uid)}: 앞의 ${nameOf(w.deskUid)}에 연결된 좌석이 이미 가득 찼어요.`;
    case 'desk_without_seat':
      return `${nameOf(w.uid)}: 이쪽을 바라보는 좌석이 없어요.`;
    case 'no_bookshelf':
      return '책장이 없어서 손님에게 추천할 책이 없어요.';
    case 'no_brewer':
      return '커피머신이 없어서 음료를 팔 수 없어요.';
  }
}

/** 배치된 책장 분야에 맞는 책만, 진열 가능 권수까지 */
export function availableBooks(shelf: LayoutAnalysis['shelf'], books: readonly Book[]): Book[] {
  return books.filter((b) => b.tags.some((t) => shelf.genres.includes(t))).slice(0, shelf.capacity);
}

/** 연결된 좌석에 손님을 순서대로 앉힌다. 자리가 모자라면 남는 손님은 입장하지 않음 */
export function seatVisitors(guestIds: readonly string[], slots: readonly SeatSlot[]) {
  return guestIds.slice(0, slots.length).map((guestId, i) => ({ guestId, slot: slots[i] }));
}

/**
 * 방명록 메모판을 세울 칸 — 커피머신(카운터) 옆의 빈 칸.
 * 가구나 앞 공간이 차지하지 않은 첫 칸, 없으면 null.
 */
export function memoBoardSpot(layout: readonly PlacedFurniture[], ctx: GridContext): Tile | null {
  const { cols, rows } = ctx.grid;
  const occupied = buildOccupancy(layout, ctx);
  const zones = layout.flatMap((p) => {
    const z = clearanceOf(p, ctx.catalog);
    return z ? [z] : [];
  });
  const free = (t: Tile) =>
    t.x >= 0 &&
    t.y >= 0 &&
    t.x < cols &&
    t.y < rows &&
    occupied[t.y * cols + t.x] === null &&
    !zones.some((z) => overlaps(z, { ...t, w: 1, h: 1 }));

  for (const p of layout) {
    if (ctx.catalog[p.furnitureId]?.role.kind !== 'brewer') continue;
    const r = rectOf(p, ctx.catalog)!;
    const around: Tile[] = [
      ...Array.from({ length: r.h }, (_, i) => ({ x: r.x + r.w, y: r.y + i })),
      ...Array.from({ length: r.h }, (_, i) => ({ x: r.x - 1, y: r.y + i })),
      ...Array.from({ length: r.w }, (_, i) => ({ x: r.x + i, y: r.y + r.h })),
    ];
    const spot = around.find(free);
    if (spot) return spot;
  }
  return null;
}
