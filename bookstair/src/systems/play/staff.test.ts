import { describe, expect, it } from 'vitest';
import { lookFromSeed } from '../characters/look';
import { place, testCtx } from '../interior/testCatalog';
import { createSim, type Customer, type SimState } from '../sim/sim';
import type { Stations } from './interact';
import { createPlayer } from './player';
import { createWorker, staffSupply, tickStaff, type StaffWorld, type Worker } from './staff';

const customer = (over: Partial<Customer>): Customer => ({
  id: 1,
  look: lookFromSeed(1),
  phase: 'waitDrink',
  pos: { x: 3.5, y: 4.5 },
  target: null,
  timer: 0,
  request: { kind: 'drink', drink: 'americano' },
  patience: 60,
  patienceMax: 60,
  bill: 0,
  bonus: 0,
  ...over,
});

const layout = [place('brew', 'brewer', 1, 0), place('shelf', 'shelf', 3, 0)];

const world = (sim: SimState, stations: Stations = {}, over: Partial<StaffWorld> = {}): StaffWorld => ({
  layout,
  catalog: testCtx.catalog,
  sim,
  stations,
  owner: createPlayer({ x: 0, y: 5 }),
  blocked: (x, y) => x < 0 || y < 0 || x >= 6 || y >= 6 || (y === 0 && (x === 1 || x === 3 || x === 4)),
  cols: 6,
  rows: 6,
  traits: () => ({ speed: 1, pause: 0.1 }),
  priceOf: () => 40,
  ...over,
});

/** 알바가 손님 주문을 다 처리할 때까지 돌린다 */
function run(workers: Worker[], sim: SimState, seconds: number, stations: Stations = {}) {
  let served = 0;
  for (let t = 0; t < seconds; t += 0.1) {
    // 커피머신 시간도 흐른다
    stations = Object.fromEntries(Object.entries(stations).map(([k, s]) => [k, { ...s, left: s.left - 0.1 }]));
    const r = tickStaff(workers, world(sim, stations), 0.1);
    ({ workers, sim, stations } = r);
    served += r.served.length;
  }
  return { workers, sim, stations, served };
}

describe('알바', () => {
  it('음료 주문을 보면 커피머신에서 내려 손님에게 건넨다', () => {
    const sim = { ...createSim(), customers: [customer({})] };
    const r = run([createWorker('a', { x: 0, y: 3 })], sim, 20);
    expect(r.served).toBe(1);
    expect(r.sim.customers[0].phase).toBe('drinking');
    expect(r.workers[0].carrying).toBeNull();
  });

  it('책 요청은 그 장르 책장에서 찾아 건넨다', () => {
    const sim = { ...createSim(), customers: [customer({ phase: 'waitBook', request: { kind: 'book', tag: '위로' } })] };
    const r = run([createWorker('a', { x: 0, y: 3 })], sim, 15);
    expect(r.served).toBe(1);
  });

  it('주문이 하나면 알바 둘이 같은 음료를 두 번 내리지 않는다', () => {
    const sim = { ...createSim(), customers: [customer({})] };
    const r = tickStaff([createWorker('a', { x: 0, y: 3 }), createWorker('b', { x: 2, y: 3 })].map((w) => ({ ...w, rest: 0 })), world(sim), 0.1);
    expect(r.workers.filter((w) => w.job?.kind === 'brew')).toHaveLength(1);
    expect(staffSupply(r.workers)).toEqual([{ kind: 'drink', drink: 'americano' }]);
  });

  it('사장님이 이미 들고 있는 음료는 다시 만들지 않는다', () => {
    const sim = { ...createSim(), customers: [customer({})] };
    const owner = { ...createPlayer({ x: 0, y: 5 }), carrying: { kind: 'drink' as const, drink: 'americano' as const } };
    const r = tickStaff([{ ...createWorker('a', { x: 0, y: 3 }), rest: 0 }], world(sim, {}, { owner }), 0.1);
    expect(r.workers[0].job).toBeNull();
  });

  it('기다리는 손님이 없어진 음료는 내려놓는다', () => {
    const w: Worker = { ...createWorker('a', { x: 0, y: 3 }), rest: 0, carrying: { kind: 'drink', drink: 'americano' } };
    const r = tickStaff([w], world(createSim()), 0.1);
    expect(r.workers[0].carrying).toBeNull();
  });
});
