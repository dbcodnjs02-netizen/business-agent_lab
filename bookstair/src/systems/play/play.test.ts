import { describe, expect, it } from 'vitest';
import { lookFromSeed } from '../characters/look';
import { place, testCtx } from '../interior/testCatalog';
import type { Customer } from '../sim/sim';
import { decideInteraction, type InteractWorld } from './interact';
import { collides, createPlayer, findPath, stepPlayer, type PlayerState } from './player';

const wallAt = (cells: [number, number][]) => (x: number, y: number) =>
  x < 0 || y < 0 || x >= 5 || y >= 5 || cells.some(([cx, cy]) => cx === x && cy === y);

describe('사장님 이동', () => {
  it('키 입력으로 걷고, 가구 칸은 못 지나간다', () => {
    const blocked = wallAt([[2, 0]]);
    let p = createPlayer({ x: 0, y: 0 });
    for (let i = 0; i < 60; i++) p = stepPlayer(p, { dx: 1, dy: 0 }, 0.05, blocked);
    expect(p.pos.x).toBeLessThan(2 - 0.27);
    expect(collides(p.pos, blocked)).toBe(false);
    expect(p.facing).toBe('frontRight');
  });

  it('벽에 막혀도 다른 축으로는 미끄러진다', () => {
    const blocked = wallAt([[1, 0]]);
    let p = createPlayer({ x: 0, y: 0 });
    for (let i = 0; i < 20; i++) p = stepPlayer(p, { dx: 1, dy: 1 }, 0.05, blocked);
    expect(p.pos.y).toBeGreaterThan(1);
  });

  it('BFS 는 가구를 돌아서 간다', () => {
    const blocked = wallAt([[1, 0], [1, 1], [1, 2]]);
    const path = findPath({ x: 0, y: 0 }, (t) => t.x === 2 && t.y === 0, blocked, 5, 5);
    expect(path?.length).toBe(8);
    expect(path?.some((t) => t.x === 1 && t.y === 3)).toBe(true);
    expect(findPath({ x: 0, y: 0 }, (t) => t.x === 1 && t.y === 1, blocked, 5, 5)).toBeNull();
  });

  it('길을 따라가다 키를 누르면 길찾기 취소', () => {
    let p: PlayerState = { ...createPlayer({ x: 0, y: 0 }), path: [{ x: 3.5, y: 0.5 }], goal: { kind: 'customer', id: 1 } };
    p = stepPlayer(p, { dx: 0, dy: 1 }, 0.05, wallAt([]));
    expect(p.path).toEqual([]);
    expect(p.goal).toBeNull();
  });
});

const customer = (over: Partial<Customer>): Customer => ({
  id: 1,
  look: lookFromSeed(1),
  phase: 'waitDrink',
  pos: { x: 2.5, y: 2.5 },
  target: null,
  timer: 0,
  request: { kind: 'drink', drink: 'americano' },
  patience: 10,
  patienceMax: 20,
  bill: 0,
  bonus: 0,
  ...over,
});

const world = (over: Partial<InteractWorld> = {}): InteractWorld => ({
  player: { ...createPlayer({ x: 2, y: 1 }) },
  layout: [place('brew', 'brewer', 1, 0), place('shelf', 'shelf', 3, 0)],
  catalog: testCtx.catalog,
  customers: [customer({})],
  stations: {},
  label: (i) => (i.kind === 'drink' ? i.drink : `#${i.tag}`),
  ...over,
});

describe('decideInteraction', () => {
  it('들고 있는 게 손님 주문과 맞으면 건넨다', () => {
    const w = world({ player: { ...createPlayer({ x: 2, y: 2 }), carrying: { kind: 'drink', drink: 'americano' } } });
    expect(decideInteraction(w)).toMatchObject({ kind: 'serve', customerId: 1 });
  });

  it('빈 커피머신 앞에서는 기다리는 주문의 음료를 내린다 — 이미 내리는 중이면 다음 주문', () => {
    const w = world({ player: { ...createPlayer({ x: 1, y: 1 }) } });
    expect(decideInteraction(w, { kind: 'furniture', uid: 'brew' })).toMatchObject({ kind: 'brew', drink: 'americano' });
    const busy = { ...w, stations: { other: { drink: 'americano' as const, left: 2, total: 4 } } };
    expect(decideInteraction(busy, { kind: 'furniture', uid: 'brew' })).toMatchObject({ kind: 'message' });
  });

  it('다 내린 음료는 가져간다', () => {
    const w = world({ stations: { brew: { drink: 'americano', left: 0, total: 4 } } });
    expect(decideInteraction(w, { kind: 'furniture', uid: 'brew' })).toEqual({ kind: 'pickup', uid: 'brew', drink: 'americano' });
  });

  it('알바가 이미 만들고 있거나 찾는 주문은 건너뛴다', () => {
    const w = world({ player: { ...createPlayer({ x: 1, y: 1 }) }, others: [{ kind: 'drink', drink: 'americano' }] });
    expect(decideInteraction(w, { kind: 'furniture', uid: 'brew' })).toMatchObject({ kind: 'message' });
    const book = world({ customers: [customer({ phase: 'waitBook', request: { kind: 'book', tag: '위로' } })], others: [{ kind: 'book', tag: '위로' }] });
    expect(decideInteraction(book, { kind: 'furniture', uid: 'shelf' })).toEqual({ kind: 'message', text: '알바가 이미 책을 찾고 있어요' });
  });

  it('책장에서는 그 책장 장르의 책 요청만 찾는다', () => {
    const want = (tag: '위로' | '도전') => world({ customers: [customer({ phase: 'waitBook', request: { kind: 'book', tag } })] });
    expect(decideInteraction(want('위로'), { kind: 'furniture', uid: 'shelf' })).toEqual({ kind: 'search', uid: 'shelf', tag: '위로' });
    expect(decideInteraction(want('도전'), { kind: 'furniture', uid: 'shelf' })).toMatchObject({ kind: 'message' });
  });
});
