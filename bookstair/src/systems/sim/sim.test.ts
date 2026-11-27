import { describe, expect, it } from 'vitest';
import { lookFromSeed } from '../characters/look';
import {
  BOOK_PRICE,
  READING_FEE,
  SIM_TIMING,
  createSim,
  seatKey,
  serveCustomer,
  tickSim,
  type Item,
  type SimEnv,
  type SimState,
} from './sim';

const env = (over: Partial<SimEnv> = {}): SimEnv => ({
  seatSlots: [{ seatUid: 'sofa', x: 3, y: 3 }],
  reservedSeats: new Set(),
  browseSpots: [{ x: 1, y: 1 }],
  counterSpots: [{ x: 5, y: 1 }],
  menu: ['americano'],
  shelfTags: ['위로'],
  bookAskChance: 0,
  entrance: { x: 0, y: 8 },
  spawnEvery: 5,
  maxCustomers: 4,
  visitors: [{ look: lookFromSeed(1), bonus: 0 }],
  rng: () => 0,
  ...over,
});

const PRICE = 40;

/**
 * 손님 한 명이 나갈 때까지 돌린다. serveAfter 초 기다렸다가 원하는 걸 건네준다 (null 이면 안 건넴).
 */
function runOneCustomer(e: SimEnv, serveAfter: number | null = 0) {
  let sim: SimState = { ...createSim(), spawnIn: 0 };
  const phases: string[] = [];
  let income = 0;
  let served = 0;
  let missed = 0;
  let waited = 0;
  const paidTypes: string[] = [];
  for (let i = 0; i < 4000; i++) {
    const r = tickSim(sim, 0.05, { ...e, maxCustomers: phases.length === 0 ? 1 : 0 });
    sim = r.sim;
    income += r.income;
    served += r.served;
    missed += r.missed;
    paidTypes.push(...r.paidTypes);
    const c = sim.customers[0];
    if (c && phases[phases.length - 1] !== c.phase) {
      phases.push(c.phase);
      waited = 0;
    }
    if (c?.request && serveAfter !== null) {
      waited += 0.05;
      if (waited >= serveAfter) {
        const item: Item = c.request;
        const res = serveCustomer(sim, c.id, item, item.kind === 'drink' ? PRICE : BOOK_PRICE);
        if (res.ok) sim = res.sim;
      }
    }
    if (phases.length > 0 && sim.customers.length === 0) break;
  }
  return { phases, income, served, missed, paidTypes };
}

describe('tickSim — 손님 한 명의 하루', () => {
  it('책 고르기 → 착석·독서 → 음료 주문 → (건네받음) 마시기 → 계산 → 퇴장', () => {
    const r = runOneCustomer(env());
    expect(r.phases).toEqual(['toShelf', 'browsing', 'toSeat', 'reading', 'waitDrink', 'drinking', 'toCounter', 'paying', 'toExit']);
    // 바로 건네면 팁이 가득
    expect(r.income).toBe(READING_FEE + PRICE + PRICE * 0.4);
    expect(r.served).toBe(1);
  });

  it('책 추천 요청을 받아 건네면 책값을 더 낸다', () => {
    const r = runOneCustomer(env({ bookAskChance: 1, menu: [], counterSpots: [] }));
    expect(r.phases.slice(0, 4)).toEqual(['toShelf', 'browsing', 'waitBook', 'browsing']);
    expect(r.income).toBe(BOOK_PRICE + BOOK_PRICE * 0.4 + READING_FEE);
  });

  it('늦게 건네면 팁이 줄어든다', () => {
    const fast = runOneCustomer(env(), 0).income;
    const slow = runOneCustomer(env(), SIM_TIMING.drinkPatience * 0.9).income;
    expect(slow).toBeLessThan(fast);
    expect(slow).toBeGreaterThanOrEqual(READING_FEE + PRICE);
  });

  it('음료를 끝내 못 받으면 좌석 이용료만 내고 시무룩하게 나간다', () => {
    const r = runOneCustomer(env(), null);
    expect(r.phases).toEqual(['toShelf', 'browsing', 'toSeat', 'reading', 'waitDrink', 'toCounter', 'paying', 'toExit']);
    expect(r.missed).toBe(1);
    expect(r.income).toBe(READING_FEE);
  });

  it('빈 좌석이 없으면 책만 보고 나간다', () => {
    const e = env({ reservedSeats: new Set([seatKey({ seatUid: 'sofa', x: 3, y: 3 })]) });
    const r = runOneCustomer(e);
    expect(r.phases).toEqual(['toShelf', 'browsing', 'toExit']);
    expect(r.income).toBe(0);
  });

  it('커피머신이 없으면 음료 없이 자리에서 계산', () => {
    const r = runOneCustomer(env({ menu: [], counterSpots: [] }));
    expect(r.phases).toEqual(['toShelf', 'browsing', 'toSeat', 'reading', 'toExit']);
    expect(r.income).toBe(READING_FEE);
  });

  it('좋아하는 음료가 메뉴에 있으면 그걸 주문하고, 계산하면 유형이 기록된다', () => {
    let asked: Item | undefined;
    const e = env({
      menu: ['americano', 'yuja-tea'],
      visitors: [{ look: lookFromSeed(3), typeId: 'runner', favoriteDrink: 'yuja-tea', bonus: 0 }],
    });
    let sim: SimState = { ...createSim(), spawnIn: 0 };
    for (let i = 0; i < 800 && !asked; i++) {
      sim = tickSim(sim, 0.05, { ...e, maxCustomers: i === 0 ? 1 : 0 }).sim;
      asked = sim.customers[0]?.request;
    }
    expect(asked).toEqual({ kind: 'drink', drink: 'yuja-tea' });
    expect(runOneCustomer(e).paidTypes).toEqual(['runner']);
  });

  it('영입 독서가는 보너스를 더 낸다', () => {
    const base = runOneCustomer(env()).income;
    const r = runOneCustomer(env({ visitors: [{ look: lookFromSeed(2), name: '루미', bonus: 15 }] }));
    expect(r.income).toBe(base + 15);
  });
});

describe('serveCustomer', () => {
  const waitingSim = (): SimState => {
    let sim: SimState = { ...createSim(), spawnIn: 0 };
    for (let i = 0; i < 800 && sim.customers[0]?.phase !== 'waitDrink'; i++) sim = tickSim(sim, 0.05, { ...env(), maxCustomers: i === 0 ? 1 : 0 }).sim;
    return sim;
  };

  it('다른 걸 건네면 거절', () => {
    const sim = waitingSim();
    expect(serveCustomer(sim, sim.customers[0].id, { kind: 'drink', drink: 'yuja-tea' }, 40)).toEqual({ ok: false, reason: 'wrong_item' });
    expect(serveCustomer(sim, 999, { kind: 'drink', drink: 'americano' }, 40)).toEqual({ ok: false, reason: 'not_waiting' });
  });

  it('맞는 걸 건네면 마시기 시작', () => {
    const sim = waitingSim();
    const r = serveCustomer(sim, sim.customers[0].id, { kind: 'drink', drink: 'americano' }, 40);
    expect(r.ok && r.sim.customers[0]).toMatchObject({ phase: 'drinking', drink: 'americano', mood: 'happy' });
  });
});

describe('tickSim — 입장·좌석 관리', () => {
  it('최대 인원까지만 입장', () => {
    let sim = createSim();
    for (let i = 0; i < 400; i++) sim = tickSim(sim, 0.1, env({ maxCustomers: 2, seatSlots: [] })).sim;
    expect(sim.customers.length).toBeLessThanOrEqual(2);
  });

  it('두 손님이 같은 좌석을 잡지 않는다', () => {
    let sim: SimState = createSim();
    const e = env({ seatSlots: [{ seatUid: 'a', x: 2, y: 2 }, { seatUid: 'b', x: 3, y: 2 }], spawnEvery: 0.5 });
    for (let i = 0; i < 200; i++) {
      sim = tickSim(sim, 0.05, e).sim;
      const seats = sim.customers.flatMap((c) => (c.seat ? [seatKey(c.seat)] : []));
      expect(new Set(seats).size).toBe(seats.length);
    }
  });

  it('앉아 있던 좌석이 사라지면 퇴장한다', () => {
    let sim: SimState = { ...createSim(), spawnIn: 0 };
    const e = env();
    for (let i = 0; i < 200 && sim.customers[0]?.phase !== 'reading'; i++) sim = tickSim(sim, 0.05, e).sim;
    expect(sim.customers[0].phase).toBe('reading');
    sim = tickSim(sim, 0.05, { ...e, seatSlots: [], maxCustomers: 0 }).sim;
    expect(sim.customers[0]).toMatchObject({ phase: 'toExit', seat: undefined });
  });

  it('팝업은 시간이 지나면 사라진다', () => {
    const sim: SimState = { ...createSim(), spawnIn: 99, popups: [{ id: 1, x: 0, y: 0, text: '+1', ttl: 0.1 }] };
    expect(tickSim(sim, SIM_TIMING.popup, env()).sim.popups).toEqual([]);
  });
});
