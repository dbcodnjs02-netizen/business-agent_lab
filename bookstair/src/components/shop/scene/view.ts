import { createContext, useContext } from 'react';
import type { Rect } from '../../../systems/interior/grid';
import type { Tone } from '../../../types/content';

/*
 * 매장 카메라 — 매장 앞쪽 위에서 비스듬히 내려다보는 원근 투영.
 * 그리드 x 는 화면 오른쪽, y 는 화면 아래(카메라 쪽), z 는 높이(px, 64px = 한 칸).
 * y = 0 줄이 뒷벽, x = 0 / x = cols 가 양옆 벽이고, 앞쪽 벽은 잘라내어 안이 보인다.
 *
 * 매장 크기(레벨에 따라 넓어짐)마다 카메라가 따로 있다. 넓은 매장일수록 카메라가 뒤로 물러나
 * 같은 화면에 매장 전체가 들어오고, 칸·캐릭터는 그만큼 작게 보인다.
 * 무대(Stage) 안의 그림들은 useCamera() 로 지금 매장의 카메라를 받는다.
 */

/** 기준 매장 크기 (이웃 서점은 모두 10×10) */
export const GRID = 10;
export const WALL_H = 200;
export const FLOOR_DEPTH = 16;
/** 높이 64px = 바닥 한 칸 */
const Z_UNIT = 64;
const FOCAL = 1035;

export type Pt = [number, number];

export interface Camera {
  cols: number;
  rows: number;
  /** 10×10 매장에 비해 카메라가 물러난 정도 */
  zoom: number;
  /** 그리드 좌표 + 높이(z, px) → SVG 좌표 */
  project: (gx: number, gy: number, z?: number) => Pt;
  /** 그 자리에 선 캐릭터·소품의 크기 배율 (10×10 매장 한가운데 = 1) */
  scaleAt: (gx: number, gy: number, z?: number) => number;
  /** 바닥(또는 높이 z)의 사각 영역 */
  floorQuad: (r: Rect, z?: number) => string;
  /** SVG 좌표 → 바닥(z = 0) 위의 연속 그리드 좌표 (화면 클릭 위치 계산용) */
  toGrid: (sx: number, sy: number) => { gx: number; gy: number };
  /** 그리기 순서용 깊이 — 카메라에 가까울수록(앞쪽·가운데) 크다 */
  depthAt: (x: number, y: number) => number;
  depthOf: (r: Rect) => number;
  /** 카메라가 보는 가로 위치 — 상자의 어느 옆면이 보이는지 정할 때 */
  centerX: number;
  /** SVG viewBox — 벽 꼭대기부터 바닥 앞 두께까지 */
  view: ViewBox;
  /** 전체화면용 — 매장 바닥과 뒷벽 아래쪽에 딱 맞춘 범위 (밖은 넓게 이어 그린 벽·바닥이 채운다) */
  fillView: ViewBox;
}

export interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const poly = (...points: Pt[]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export const inset = (r: Rect, m: number): Rect => ({ x: r.x + m, y: r.y + m, w: r.w - 2 * m, h: r.h - 2 * m });

function build(cols: number, rows: number): Camera {
  const zoom = Math.max(cols, rows) / GRID;
  // 10×10 기준 카메라 (5, 17, 13) → 매장 앞 가운데를 기준으로 zoom 만큼 물러난다
  const cam = { x: cols / 2, y: rows + 7 * zoom, z: 13 * zoom };
  const targetY = rows - 5.8 * zoom;
  // 카메라는 좌우로는 돌지 않고 아래로만 기울어 있다: forward = (0, -cos, -sin), up = (0, -sin, cos)
  const len = Math.hypot(cam.y - targetY, cam.z);
  const COS = (cam.y - targetY) / len;
  const SIN = cam.z / len;

  /** 카메라까지의 깊이 (클수록 멀다) */
  const depthTo = (gy: number, z: number) => -(gy - cam.y) * COS - (z / Z_UNIT - cam.z) * SIN;

  const project = (gx: number, gy: number, z = 0): Pt => {
    const dy = gy - cam.y;
    const dz = z / Z_UNIT - cam.z;
    const zc = -dy * COS - dz * SIN;
    const yc = -dy * SIN + dz * COS;
    return [(FOCAL * (gx - cam.x)) / zc, (-FOCAL * yc) / zc];
  };

  const scaleAt = (_gx: number, gy: number, z = 0) => REF_DEPTH / depthTo(gy, z);

  const floorQuad = (r: Rect, z = 0) =>
    poly(project(r.x, r.y, z), project(r.x + r.w, r.y, z), project(r.x + r.w, r.y + r.h, z), project(r.x, r.y + r.h, z));

  const toGrid = (sx: number, sy: number) => {
    // 화면 점을 지나는 시선을 바닥 평면과 만나게 한다
    const rx = sx / FOCAL;
    const ry = -sy / FOCAL;
    // 카메라 공간 방향 (rx, ry, 1) → 월드: right·rx + up·ry + forward
    const dirY = -SIN * ry - COS;
    const dirZ = COS * ry - SIN;
    const t = -cam.z / dirZ;
    return { gx: cam.x + rx * t, gy: cam.y + dirY * t };
  };

  const depthAt = (x: number, y: number) => y - Math.abs(x - cam.x) * 0.002;

  const top = project(0, 0, WALL_H)[1];
  const bottom = project(0, rows, -FLOOR_DEPTH)[1];
  const half = Math.abs(project(0, rows, -FLOOR_DEPTH)[0]);
  const pad = 1 / zoom;
  const fillTop = project(0, 0, 172)[1];
  const fillBottom = project(0, rows, 0)[1];
  const fillHalf = Math.abs(project(0, rows, 0)[0]);

  return {
    cols,
    rows,
    zoom,
    project,
    scaleAt,
    floorQuad,
    toGrid,
    depthAt,
    depthOf: (r) => depthAt(r.x + r.w / 2, r.y + r.h / 2),
    centerX: cam.x,
    view: { x: -half - 30 * pad, y: top - 40 * pad, w: 2 * half + 60 * pad, h: bottom - top + 70 * pad },
    fillView: { x: -fillHalf, y: fillTop, w: 2 * fillHalf, h: fillBottom - fillTop + 14 * pad },
  };
}

/** 10×10 매장 한가운데의 깊이 — 모든 매장의 크기 배율 기준 */
const REF_DEPTH = (() => {
  const len = Math.hypot(17 - 4.2, 13);
  return -(GRID / 2 - 17) * ((17 - 4.2) / len) + 13 * (13 / len);
})();

const cache = new Map<string, Camera>();

/** 매장 크기별 카메라 (같은 크기면 같은 객체) */
export function cameraFor(cols: number, rows: number): Camera {
  const key = `${cols}x${rows}`;
  let cam = cache.get(key);
  if (!cam) {
    cam = build(cols, rows);
    cache.set(key, cam);
  }
  return cam;
}

const CameraContext = createContext<Camera>(cameraFor(GRID, GRID));
export const CameraProvider = CameraContext.Provider;
export const useCamera = () => useContext(CameraContext);

export type Shades = readonly [top: string, front: string, side: string];

/** 윗면 · 앞면 · 옆면 */
export const SHADES: Record<Tone | 'cream' | 'cocoa', Shades> = {
  wood: ['#dcb48a', '#c0915f', '#a77a4c'],
  mint: ['#d6eedb', '#b5d9bd', '#9cc7a6'],
  peach: ['#fbdccb', '#f0bfa6', '#e2a88b'],
  butter: ['#fbedb8', '#ecd68a', '#dcc070'],
  lavender: ['#e5ddf3', '#cdbfe6', '#b9a9d9'],
  rose: ['#f7d3da', '#ecb3c0', '#dd9aaa'],
  sky: ['#dbeaf4', '#bcd6e8', '#a3c4dc'],
  cream: ['#fffaf1', '#f1e6d4', '#e4d5be'],
  cocoa: ['#8a6a58', '#6b4f40', '#5a4135'],
};

export const OUTLINE = 'rgba(78, 51, 36, 0.5)';

export const BOOK_COLORS = ['#ecb3c0', '#bcd6e8', '#ecd68a', '#b5d9bd', '#cdbfe6', '#f0bfa6', '#c0915f'];
