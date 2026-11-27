import type { CharacterLook } from '../../types/character';
import type { BookTag, DrinkId } from '../../types/content';
import type { SeatSlot, Tile } from '../interior/connections';

/*
 * 타이쿤 손님 루프 — 타이머 기반 순수 시뮬레이션. 음료·책은 사장님(플레이어)이 직접 건넨다.
 *
 *   입장 → 책장 앞으로(toShelf) → 책 고르기(browsing)
 *     ├ 가끔 책 추천 요청(waitBook) — 사장님이 책을 찾아 건네면 책값 + 팁
 *   → 좌석으로(toSeat) → 독서(reading) → 음료 주문(waitDrink) — 사장님이 내려서 건네면 음료값 + 팁
 *   → 마시기(drinking) → 카운터로(toCounter) → 계산(paying) → 퇴장(toExit)
 *
 * 기다리다 인내심이 바닥나면 시무룩하게 다음 단계로 넘어가거나 나간다.
 * 이동은 칸 중심을 잇는 직선 보간.
 */

export type CustomerPhase =
  | 'toShelf'
  | 'browsing'
  | 'waitBook'
  | 'toSeat'
  | 'reading'
  | 'waitDrink'
  | 'drinking'
  | 'toCounter'
  | 'paying'
  | 'toExit';

/** 손님이 기다리는 것 = 사장님이 들 수 있는 것 */
export type Item = { kind: 'drink'; drink: DrinkId } | { kind: 'book'; tag: BookTag };

export interface Point {
  x: number;
  y: number;
}

export interface Customer {
  id: number;
  look: CharacterLook;
  /** 손님 도감 유형 (일반 손님) */
  typeId?: string;
  favoriteDrink?: DrinkId;
  /** 영입한 독서가면 이름이 있다 */
  name?: string;
  phase: CustomerPhase;
  /** 연속 그리드 좌표 (칸 중심 = 정수 + 0.5) */
  pos: Point;
  target: Point | null;
  /** 시간제 단계(browsing/reading/drinking/paying)의 남은 초 */
  timer: number;
  /** 기다리는 단계에서 바라는 것 */
  request?: Item;
  /** 남은 인내심(초) / 처음 인내심 */
  patience: number;
  patienceMax: number;
  /** 이미 책 요청을 한 번 했는지 */
  askedBook?: boolean;
  seat?: SeatSlot;
  drink?: DrinkId;
  bill: number;
  /** 영입 독서가 보너스 (계산 시 추가) */
  bonus: number;
  /** 기다리다 지치면 sad, 잘 대접받으면 happy */
  mood?: 'happy' | 'sad';
}

export interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  ttl: number;
}

export interface SimState {
  customers: Customer[];
  popups: Popup[];
  nextId: number;
  spawnIn: number;
}

export interface Visitor {
  look: CharacterLook;
  typeId?: string;
  favoriteDrink?: DrinkId;
  name?: string;
  bonus: number;
}

export interface SimEnv {
  seatSlots: readonly SeatSlot[];
  /** 단골손님이 이미 앉아 있는 좌석 (seatKey) */
  reservedSeats: ReadonlySet<string>;
  browseSpots: readonly Tile[];
  counterSpots: readonly Tile[];
  menu: readonly DrinkId[];
  /** 진열된 책장의 장르 — 손님은 이 중에서 책을 부탁한다 */
  shelfTags: readonly BookTag[];
  /** 책 고르다 사장님께 추천을 부탁할 확률 */
  bookAskChance: number;
  entrance: Tile;
  /** 평균 입장 간격(초) */
  spawnEvery: number;
  maxCustomers: number;
  /** 입장할 수 있는 손님 후보 (영입한 독서가 포함) */
  visitors: readonly Visitor[];
  rng: () => number;
}

export interface TickResult {
  sim: SimState;
  income: number;
  /** 이번 틱에 계산을 마친 손님 수 */
  served: number;
  /** 이번 틱에 기다리다 지친 주문 수 */
  missed: number;
  /** 이번 틱에 계산을 마친 일반 손님의 유형 (도감 기록용) */
  paidTypes: string[];
}

export const SIM_TIMING = {
  walkSpeed: 2.2,
  browse: 3,
  read: 6,
  drink: 5,
  pay: 1.2,
  popup: 1.6,
  bookPatience: 32,
  drinkPatience: 40,
} as const;

/** 좌석 이용료 (독서 공간) */
export const READING_FEE = 20;
/** 추천한 책 판매가 */
export const BOOK_PRICE = 30;
/** 빨리 건넬수록 붙는 팁 비율 (인내심이 가득일 때 최대) */
export const TIP_RATE = 0.4;

export const seatKey = (s: SeatSlot) => `${s.seatUid}@${s.x},${s.y}`;
const center = (t: Tile): Point => ({ x: t.x + 0.5, y: t.y + 0.5 });
const pick = <T,>(list: readonly T[], rng: () => number): T => list[Math.floor(rng() * list.length) % list.length];

export const isWaiting = (c: Customer) => c.phase === 'waitBook' || c.phase === 'waitDrink';

export function createSim(): SimState {
  return { customers: [], popups: [], nextId: 1, spawnIn: 2 };
}

export function tickSim(sim: SimState, dt: number, env: SimEnv): TickResult {
  let nextId = sim.nextId;
  let income = 0;
  let served = 0;
  let missed = 0;
  const paidTypes: string[] = [];
  const popups = sim.popups.map((p) => ({ ...p, ttl: p.ttl - dt })).filter((p) => p.ttl > 0);
  const addPopup = (at: Point, text: string) => popups.push({ id: nextId++, x: at.x, y: at.y, text, ttl: SIM_TIMING.popup });

  const validSeats = new Set(env.seatSlots.map(seatKey));
  const taken = new Set(env.reservedSeats);
  for (const c of sim.customers) if (c.seat) taken.add(seatKey(c.seat));

  const exitTarget = center(env.entrance);
  const customers: Customer[] = [];

  for (const original of sim.customers) {
    let c: Customer = { ...original };

    // 배치가 바뀌어 좌석이 사라졌으면 퇴장
    if (c.seat && !validSeats.has(seatKey(c.seat))) {
      c = { ...c, seat: undefined, request: undefined, phase: 'toExit', target: exitTarget };
    }

    if (c.target) {
      const dx = c.target.x - c.pos.x;
      const dy = c.target.y - c.pos.y;
      const dist = Math.hypot(dx, dy);
      const step = SIM_TIMING.walkSpeed * dt;
      if (dist > step) {
        c.pos = { x: c.pos.x + (dx / dist) * step, y: c.pos.y + (dy / dist) * step };
        customers.push(c);
        continue;
      }
      c.pos = c.target;
      c.target = null;
      c = arrive(c);
    } else if (isWaiting(c)) {
      c.patience -= dt;
      if (c.patience > 0) {
        customers.push(c);
        continue;
      }
      c = giveUp(c);
    } else {
      c.timer -= dt;
      if (c.timer > 0) {
        customers.push(c);
        continue;
      }
      c = finishTimed(c);
    }

    if (c.phase === 'toExit' && !c.target && pointsEqual(c.pos, exitTarget)) continue; // 퇴장 완료
    customers.push(c);
  }

  /** 걸어서 목적지에 도착 */
  function arrive(c: Customer): Customer {
    switch (c.phase) {
      case 'toShelf':
        return { ...c, phase: 'browsing', timer: SIM_TIMING.browse };
      case 'toSeat':
        return { ...c, phase: 'reading', timer: SIM_TIMING.read };
      case 'toCounter':
        return { ...c, phase: 'paying', timer: SIM_TIMING.pay };
      default:
        return c;
    }
  }

  /** 시간제 단계가 끝남 */
  function finishTimed(c: Customer): Customer {
    switch (c.phase) {
      case 'browsing':
        if (!c.askedBook && env.shelfTags.length > 0 && env.rng() < env.bookAskChance) {
          const tag = pick(env.shelfTags, env.rng);
          return wait({ ...c, askedBook: true }, 'waitBook', { kind: 'book', tag }, SIM_TIMING.bookPatience);
        }
        return toSeatOrLeave(c);
      case 'reading': {
        if (env.menu.length === 0) return leaveSeat(c);
        const drink = c.favoriteDrink && env.menu.includes(c.favoriteDrink) ? c.favoriteDrink : pick(env.menu, env.rng);
        return wait(c, 'waitDrink', { kind: 'drink', drink }, SIM_TIMING.drinkPatience);
      }
      case 'drinking':
        return leaveSeat({ ...c, drink: undefined });
      case 'paying':
        return pay(c);
      default:
        return c;
    }
  }

  /** 기다리다 지침 */
  function giveUp(c: Customer): Customer {
    missed += 1;
    const sad = { ...c, request: undefined, mood: 'sad' as const };
    if (c.phase === 'waitBook') {
      addPopup(c.pos, '책을 못 찾았어…');
      return toSeatOrLeave(sad);
    }
    addPopup(c.pos, '음료가 안 나오네…');
    return leaveSeat(sad);
  }

  function toSeatOrLeave(c: Customer): Customer {
    const free = env.seatSlots.find((s) => !taken.has(seatKey(s)));
    if (!free) {
      if (c.bill > 0) return goPay(c); // 책은 샀으니 계산하고 간다
      addPopup(c.pos, '자리가 없네…');
      return { ...c, phase: 'toExit', target: exitTarget, mood: 'sad' };
    }
    taken.add(seatKey(free));
    return { ...c, phase: 'toSeat', seat: free, target: center(free), bill: c.bill + READING_FEE };
  }

  function leaveSeat(c: Customer): Customer {
    return goPay({ ...c, seat: undefined });
  }

  function goPay(c: Customer): Customer {
    if (env.counterSpots.length === 0) return pay(c);
    return { ...c, phase: 'toCounter', target: center(pick(env.counterSpots, env.rng)) };
  }

  function pay(c: Customer): Customer {
    const total = c.bill + c.bonus;
    if (total > 0) {
      income += total;
      served += 1;
      if (c.typeId) paidTypes.push(c.typeId);
      addPopup(c.pos, `+${total}`);
    }
    return { ...c, bill: 0, phase: 'toExit', target: exitTarget, mood: c.mood ?? 'happy' };
  }

  // 새 손님 입장
  let spawnIn = sim.spawnIn - dt;
  if (spawnIn <= 0) {
    spawnIn = env.spawnEvery * (0.7 + env.rng() * 0.6);
    if (customers.length < env.maxCustomers && env.visitors.length > 0) {
      const v = pick(env.visitors, env.rng);
      const spot = env.browseSpots.length > 0 ? center(pick(env.browseSpots, env.rng)) : null;
      customers.push({
        id: nextId++,
        look: v.look,
        typeId: v.typeId,
        favoriteDrink: v.favoriteDrink,
        name: v.name,
        bonus: v.bonus,
        pos: exitTarget,
        // 책장이 없으면 바로 자리 찾기
        phase: spot ? 'toShelf' : 'browsing',
        target: spot,
        timer: spot ? 0 : 0.5,
        patience: 0,
        patienceMax: 0,
        bill: 0,
      });
    }
  }

  return { sim: { customers, popups, nextId, spawnIn }, income, served, missed, paidTypes };
}

function wait(c: Customer, phase: 'waitBook' | 'waitDrink', request: Item, patience: number): Customer {
  return { ...c, phase, request, patience, patienceMax: patience };
}

export type ServeResult =
  | { ok: true; sim: SimState; tip: number }
  | { ok: false; reason: 'not_waiting' | 'wrong_item' };

/** 사장님이 손님에게 음료·책을 건넨다 */
export function serveCustomer(sim: SimState, customerId: number, item: Item, price: number): ServeResult {
  const c = sim.customers.find((x) => x.id === customerId);
  if (!c || !isWaiting(c) || !c.request) return { ok: false, reason: 'not_waiting' };
  if (!sameItem(c.request, item)) return { ok: false, reason: 'wrong_item' };

  const tip = Math.round(price * TIP_RATE * Math.max(0, c.patience / c.patienceMax));
  const base = { ...c, request: undefined, bill: c.bill + price + tip, mood: 'happy' as const };
  // 책을 받으면 곧바로 자리 찾기(browsing 마무리), 음료를 받으면 마시기
  const next: Customer =
    item.kind === 'book'
      ? { ...base, phase: 'browsing', timer: 0.3 }
      : { ...base, phase: 'drinking', drink: item.drink, timer: SIM_TIMING.drink };

  return {
    ok: true,
    tip,
    sim: {
      ...sim,
      nextId: sim.nextId + 1,
      customers: sim.customers.map((x) => (x.id === customerId ? next : x)),
      popups: [...sim.popups, { id: sim.nextId, x: c.pos.x, y: c.pos.y, text: tip > 0 ? `고마워요 ♥ 팁 ${tip}` : '고마워요 ♥', ttl: SIM_TIMING.popup }],
    },
  };
}

export function sameItem(a: Item, b: Item): boolean {
  return a.kind === 'drink' ? b.kind === 'drink' && a.drink === b.drink : b.kind === 'book' && a.tag === b.tag;
}

function pointsEqual(a: Point, b: Point) {
  return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

/** 평판·아늑함이 높을수록 손님이 자주 온다 */
export function spawnInterval(reputation: number, cozy: number): number {
  return Math.min(16, Math.max(6, 16 - reputation / 10 - cozy / 10));
}
