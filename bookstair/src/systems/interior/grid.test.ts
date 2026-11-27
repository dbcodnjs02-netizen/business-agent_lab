import { describe, expect, it } from 'vitest';
import {
  addFurniture,
  buildOccupancy,
  checkPlacement,
  findFreeSpot,
  frontStrip,
  moveFurniture,
  rotateFurniture,
  sanitizeLayout,
} from './grid';
import { place, testCtx as ctx } from './testCatalog';

describe('checkPlacement — 기본 규칙', () => {
  it('빈 칸이면 통과하고 차지하는 영역을 돌려준다', () => {
    expect(checkPlacement([], { furnitureId: 'sofa', x: 1, y: 1 }, ctx)).toEqual({
      ok: true,
      rect: { x: 1, y: 1, w: 2, h: 1 },
    });
  });

  it('그리드 밖으로 나가면 실패', () => {
    expect(checkPlacement([], { furnitureId: 'sofa', x: 3, y: 0 }, ctx)).toMatchObject({ reason: 'out_of_bounds' });
    expect(checkPlacement([], { furnitureId: 'table', x: -1, y: 0 }, ctx)).toMatchObject({ reason: 'out_of_bounds' });
    expect(checkPlacement([], { furnitureId: 'table', x: 0.5, y: 0 }, ctx)).toMatchObject({ reason: 'out_of_bounds' });
  });

  it('홀수 회전이면 가로·세로가 바뀐다', () => {
    expect(checkPlacement([], { furnitureId: 'sofa', x: 3, y: 1, rotation: 1 }, ctx)).toMatchObject({
      ok: true,
      rect: { w: 1, h: 2 },
    });
    expect(checkPlacement([], { furnitureId: 'sofa', x: 0, y: 3, rotation: 3 }, ctx)).toMatchObject({
      reason: 'out_of_bounds',
    });
  });

  it('겹치는 가구 uid 를 알려준다', () => {
    const layout = [place('a', 'sofa', 0, 1), place('b', 'table', 3, 1)];
    expect(checkPlacement(layout, { furnitureId: 'sofa', x: 1, y: 1 }, ctx)).toEqual({
      ok: false,
      reason: 'collision',
      conflicts: ['a'],
    });
  });

  it('맞닿기만 하면 겹침이 아니다', () => {
    const layout = [place('a', 'sofa', 0, 1)];
    expect(checkPlacement(layout, { furnitureId: 'table', x: 2, y: 1 }, ctx).ok).toBe(true);
  });

  it('벽 가구는 오른쪽 벽(y=0, 방향 0) 또는 왼쪽 벽(x=0, 방향 3)에만', () => {
    expect(checkPlacement([], { furnitureId: 'shelf', x: 0, y: 0 }, ctx).ok).toBe(true);
    expect(checkPlacement([], { furnitureId: 'shelf', x: 0, y: 1 }, ctx)).toMatchObject({ reason: 'wall_only' });
    expect(checkPlacement([], { furnitureId: 'shelf', x: 0, y: 2, rotation: 3 }, ctx)).toMatchObject({ ok: true });
    expect(checkPlacement([], { furnitureId: 'shelf', x: 1, y: 2, rotation: 3 }, ctx)).toMatchObject({
      reason: 'wall_only',
    });
    expect(checkPlacement([], { furnitureId: 'shelf', x: 0, y: 0, rotation: 2 }, ctx)).toMatchObject({
      reason: 'not_rotatable',
    });
  });

  it('회전 불가 가구', () => {
    expect(checkPlacement([], { furnitureId: 'brewer', x: 0, y: 0, rotation: 1 }, ctx)).toMatchObject({
      reason: 'not_rotatable',
    });
  });

  it('카탈로그에 없는 가구', () => {
    expect(checkPlacement([], { furnitureId: 'piano', x: 0, y: 0 }, ctx)).toMatchObject({
      reason: 'unknown_furniture',
    });
  });
});

describe('checkPlacement — 앞 공간(clearance)', () => {
  it('책장 앞칸이 막혀 있으면 놓을 수 없다', () => {
    const layout = [place('t', 'table', 1, 1)];
    expect(checkPlacement(layout, { furnitureId: 'shelf', x: 0, y: 0 }, ctx)).toEqual({
      ok: false,
      reason: 'front_blocked',
      conflicts: ['t'],
    });
  });

  it('앞칸이 매장 밖이면 놓을 수 없다', () => {
    expect(checkPlacement([], { furnitureId: 'brewer', x: 0, y: 3 }, ctx)).toMatchObject({
      reason: 'front_blocked',
    });
  });

  it('다른 가구의 앞칸에 들어가면 안 된다', () => {
    const layout = [place('s', 'shelf', 0, 0)];
    expect(checkPlacement(layout, { furnitureId: 'table', x: 1, y: 1 }, ctx)).toEqual({
      ok: false,
      reason: 'blocks_front',
      conflicts: ['s'],
    });
    expect(checkPlacement(layout, { furnitureId: 'table', x: 2, y: 1 }, ctx).ok).toBe(true);
  });

  it('frontStrip: 방향별 앞 영역', () => {
    const r = { x: 1, y: 1, w: 2, h: 1 };
    expect(frontStrip(r, 0)).toEqual({ x: 1, y: 2, w: 2, h: 1 });
    expect(frontStrip(r, 1)).toEqual({ x: 0, y: 1, w: 1, h: 1 });
    expect(frontStrip(r, 2)).toEqual({ x: 1, y: 0, w: 2, h: 1 });
    expect(frontStrip(r, 3)).toEqual({ x: 3, y: 1, w: 1, h: 1 });
  });
});

describe('레이아웃 조작', () => {
  const layout = [place('a', 'sofa', 0, 1), place('b', 'table', 3, 3)];

  it('addFurniture: 실패하면 원본 유지', () => {
    expect(addFurniture(layout, place('c', 'table', 1, 1), ctx)).toMatchObject({ ok: false, reason: 'collision' });
    const added = addFurniture(layout, place('c', 'table', 2, 1), ctx);
    expect(added.ok && added.layout).toHaveLength(3);
    expect(layout).toHaveLength(2);
  });

  it('moveFurniture: 자기 자신과 겹치는 위치로 한 칸 이동 가능', () => {
    const moved = moveFurniture(layout, 'a', 1, 1, ctx);
    expect(moved.ok && moved.layout[0]).toMatchObject({ x: 1, y: 1 });
  });

  it('moveFurniture: 없는 uid', () => {
    expect(moveFurniture(layout, 'zzz', 0, 0, ctx)).toMatchObject({ reason: 'not_found' });
  });

  it('rotateFurniture: 0→1→2→3→0 순환, 공간 없으면 실패', () => {
    let current = layout;
    for (const expected of [1, 2, 3, 0]) {
      const r = rotateFurniture(current, 'a', ctx);
      expect(r.ok && r.layout[0].rotation).toBe(expected);
      if (r.ok) current = r.layout;
    }
    const blocked = [place('a', 'sofa', 0, 3)];
    expect(rotateFurniture(blocked, 'a', ctx)).toMatchObject({ reason: 'out_of_bounds' });
  });

  it('rotateFurniture: 벽 가구는 두 벽 방향(0 ↔ 3)만 오간다', () => {
    const corner = rotateFurniture([place('s', 'shelf', 0, 0)], 's', ctx);
    expect(corner.ok && corner.layout[0].rotation).toBe(3);
    expect(rotateFurniture([place('s', 'shelf', 2, 0)], 's', ctx)).toMatchObject({ reason: 'wall_only' });
  });
});

describe('조회 도우미', () => {
  it('buildOccupancy: 타일마다 점유 uid', () => {
    const cells = buildOccupancy([place('a', 'sofa', 1, 0)], ctx);
    expect(cells.slice(0, 4)).toEqual([null, 'a', 'a', null]);
  });

  it('findFreeSpot: 첫 번째 빈 자리', () => {
    expect(findFreeSpot([place('a', 'sofa', 0, 0)], 'sofa', ctx)).toEqual({ x: 2, y: 0 });
  });
});

describe('sanitizeLayout', () => {
  it('깨진 항목·중복·겹침을 버린다', () => {
    const raw = [
      place('a', 'sofa', 0, 1),
      place('a', 'table', 3, 2),
      place('b', 'table', 1, 1),
      place('c', 'piano', 3, 0),
      { uid: 'd', x: 1 },
      { ...place('e', 'table', 3, 3), rotation: 7 },
      place('f', 'table', 3, 3),
    ];
    expect(sanitizeLayout(raw, ctx).map((p) => p.uid)).toEqual(['a', 'f']);
    expect(sanitizeLayout('garbage', ctx)).toEqual([]);
  });
});
