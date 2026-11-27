import type { BookTag, DrinkId } from '../../types/content';
import type { FurnitureDef, PlacedFurniture } from '../../types/interior';
import { rectOf, type Rect } from '../interior/grid';
import type { Tile } from '../interior/connections';
import { isWaiting, sameItem, serveCustomer, type Customer, type Item, type SimState } from '../sim/sim';
import type { Stations } from './interact';
import { SEARCH_SECONDS, createPlayer, pathToward, stepPlayer, tileCenter, type PlayerState } from './player';

/*
 * 알바 — 사장님과 같은 몸(PlayerState)으로 매장을 걸어 다니며 스스로 일을 고른다.
 *
 *   들고 있는 게 있으면 → 그걸 기다리는 손님에게 건네기(deliver)
 *   다 내린 음료가 있고 그 음료를 기다리는 손님이 있으면 → 가져오기(pickup)
 *   아무도 준비하지 않은 주문이 있으면 → 커피머신에서 내리기(brew) / 책장에서 책 찾기(search)
 *
 * 여러 알바가 같은 일을 하지 않도록, 다른 알바가 맡은 손님·기계는 건너뛰고
 * 이미 내리는 중이거나 누군가 들고 있는 것은 "준비된 것"으로 센다.
 */

export type StaffJob =
  | { kind: 'deliver'; customerId: number }
  | { kind: 'pickup'; uid: string }
  | { kind: 'brew'; uid: string; drink: DrinkId }
  | { kind: 'search'; uid: string; tag: BookTag };

export interface Worker extends PlayerState {
  /** 알바 정의 id */
  staffId: string;
  job: StaffJob | null;
  /** 다음 일을 고르기까지 남은 쉬는 시간 */
  rest: number;
}

export interface WorkerTraits {
  speed: number;
  pause: number;
}

export interface StaffWorld {
  layout: readonly PlacedFurniture[];
  catalog: Record<string, FurnitureDef>;
  sim: SimState;
  stations: Stations;
  /** 사장님 — 들고 있는 것·찾는 책·가는 손님을 피해서 일을 고른다 */
  owner: PlayerState;
  blocked: (x: number, y: number) => boolean;
  cols: number;
  rows: number;
  traits: (staffId: string) => WorkerTraits;
  priceOf: (item: Item) => number;
}

export interface StaffTickResult {
  workers: Worker[];
  sim: SimState;
  stations: Stations;
  /** 이번 틱에 알바가 손님에게 건넨 것 */
  served: Item[];
}

export function createWorker(staffId: string, at: Tile): Worker {
  return { ...createPlayer(at), staffId, job: null, rest: 0.5 };
}

const byUrgency = (a: Customer, b: Customer) => a.patience - b.patience;

/** 알바들이 들고 있거나, 만들러 가거나, 찾고 있는 것 */
export function staffSupply(workers: readonly Worker[]): Item[] {
  const items: Item[] = [];
  for (const w of workers) {
    if (w.carrying) items.push(w.carrying);
    if (w.search) items.push({ kind: 'book', tag: w.search.tag });
    if (w.job?.kind === 'brew') items.push({ kind: 'drink', drink: w.job.drink });
    if (w.job?.kind === 'search') items.push({ kind: 'book', tag: w.job.tag });
  }
  return items;
}

/** 누군가 들고 있거나, 만들고 있거나, 찾고 있는 것 (= 곧 손님에게 갈 것) */
function itemsInHand(owner: PlayerState, workers: readonly Worker[], stations: Stations): Item[] {
  const items: Item[] = Object.values(stations).map((s) => ({ kind: 'drink', drink: s.drink }));
  if (owner.carrying) items.push(owner.carrying);
  if (owner.search) items.push({ kind: 'book', tag: owner.search.tag });
  return [...items, ...staffSupply(workers)];
}

/** 기다리는 주문 중 아직 아무도 준비하지 않은 것 (급한 순) */
function unsupplied(waiting: readonly Customer[], supply: Item[]): Item[] {
  const left = [...supply];
  const out: Item[] = [];
  for (const c of waiting) {
    if (!c.request) continue;
    const i = left.findIndex((it) => sameItem(c.request!, it));
    if (i >= 0) left.splice(i, 1);
    else out.push(c.request);
  }
  return out;
}

export function tickStaff(workers: readonly Worker[], world: StaffWorld, dt: number): StaffTickResult {
  let { sim, stations } = world;
  const served: Item[] = [];
  const out: Worker[] = [...workers];

  const rectOfUid = (uid: string): Rect | null => {
    const p = world.layout.find((f) => f.uid === uid);
    return p ? rectOf(p, world.catalog) : null;
  };
  const customerBox = (c: Customer): Rect => ({ x: c.pos.x - 0.35, y: c.pos.y - 0.35, w: 0.7, h: 0.7 });
  const waitingFor = (id: number) => sim.customers.find((c) => c.id === id && isWaiting(c));

  /** 이 일이 아직 할 만한지 (걷는 동안 상황이 바뀔 수 있다) */
  const stillValid = (w: Worker, job: StaffJob): boolean => {
    switch (job.kind) {
      case 'deliver': {
        const c = waitingFor(job.customerId);
        return Boolean(c?.request && w.carrying && sameItem(c.request, w.carrying));
      }
      case 'pickup':
        return !w.carrying && Boolean(stations[job.uid]) && rectOfUid(job.uid) !== null;
      case 'brew':
        return !stations[job.uid] && rectOfUid(job.uid) !== null;
      case 'search':
        return !w.carrying && rectOfUid(job.uid) !== null;
    }
  };

  for (let i = 0; i < out.length; i++) {
    let w = out[i];
    const t = world.traits(w.staffId);

    if (w.search) {
      const left = w.search.left - dt;
      out[i] =
        left > 0
          ? { ...w, search: { ...w.search, left } }
          : { ...w, search: null, carrying: { kind: 'book', tag: w.search.tag }, rest: t.pause };
      continue;
    }

    if (w.job && !stillValid(w, w.job)) w = { ...w, job: null, path: [], rest: t.pause };

    if (w.path.length > 0) {
      out[i] = stepPlayer(w, { dx: 0, dy: 0 }, dt * t.speed, world.blocked) as Worker;
      continue;
    }

    if (w.job) {
      // 도착 — 일 처리
      const job = w.job;
      w = { ...w, job: null, walking: false, rest: t.pause };
      if (job.kind === 'deliver' && w.carrying) {
        const r = serveCustomer(sim, job.customerId, w.carrying, world.priceOf(w.carrying));
        if (r.ok) {
          sim = r.sim;
          served.push(w.carrying);
          w = { ...w, carrying: null };
        }
      } else if (job.kind === 'pickup') {
        const st = stations[job.uid];
        if (st && st.left <= 0) {
          const { [job.uid]: _, ...rest } = stations;
          stations = rest;
          w = { ...w, carrying: { kind: 'drink', drink: st.drink } };
        } else {
          // 아직 내리는 중 — 옆에서 기다린다
          w = { ...w, job, rest: 0.2 };
        }
      } else if (job.kind === 'brew') {
        const role = world.catalog[world.layout.find((p) => p.uid === job.uid)?.furnitureId ?? '']?.role;
        if (role?.kind === 'brewer' && !stations[job.uid]) {
          stations = { ...stations, [job.uid]: { drink: job.drink, left: role.brewSeconds, total: role.brewSeconds } };
        }
      } else if (job.kind === 'search') {
        w = { ...w, search: { shelfUid: job.uid, tag: job.tag, left: SEARCH_SECONDS } };
      }
      out[i] = w;
      continue;
    }

    if (w.rest > 0) {
      out[i] = { ...w, rest: w.rest - dt, walking: false };
      continue;
    }

    // 다음 일 고르기
    const others = out.filter((_, j) => j !== i);
    const plan = chooseJob(w, others);
    if (plan.drop) w = { ...w, carrying: null };
    if (!plan.job) {
      out[i] = { ...w, rest: t.pause + 0.3, walking: false };
      continue;
    }
    const target = plan.job.kind === 'deliver' ? customerBox(waitingFor(plan.job.customerId)!) : rectOfUid(plan.job.uid)!;
    const path = pathToward(w.pos, target, world.blocked, world.cols, world.rows);
    out[i] = path ? { ...w, job: plan.job, path: path.map(tileCenter) } : { ...w, rest: 1 };
  }

  return { workers: out, sim, stations, served };

  function chooseJob(w: Worker, others: Worker[]): { job: StaffJob | null; drop?: boolean } {
    const waiting = sim.customers.filter((c) => isWaiting(c) && c.request).sort(byUrgency);
    const claimed = new Set<string>();
    for (const o of others) {
      if (o.job?.kind === 'deliver') claimed.add(`c${o.job.customerId}`);
      if (o.job?.kind === 'pickup' || o.job?.kind === 'brew') claimed.add(`f${o.job.uid}`);
    }
    if (world.owner.goal?.kind === 'customer') claimed.add(`c${world.owner.goal.id}`);

    if (w.carrying) {
      const item = w.carrying;
      const c = waiting.find((x) => sameItem(x.request!, item) && !claimed.has(`c${x.id}`));
      if (c) return { job: { kind: 'deliver', customerId: c.id } };
      // 기다리는 손님이 없으면 내려놓고 다른 일을 찾는다
      if (!waiting.some((x) => sameItem(x.request!, item))) return { ...chooseJob({ ...w, carrying: null }, others), drop: true };
      return { job: null };
    }

    // 다 내린 음료 가져오기 — 그 음료를 기다리는 손님이 들고 가는 사람보다 많을 때
    const carried = [world.owner, ...others].flatMap((p) => (p.carrying ? [p.carrying] : []));
    for (const [uid, st] of Object.entries(stations)) {
      if (st.left > 0 || claimed.has(`f${uid}`)) continue;
      const drink: Item = { kind: 'drink', drink: st.drink };
      const demand = waiting.filter((c) => sameItem(c.request!, drink)).length;
      const pickups = others.filter((o) => o.job?.kind === 'pickup' && stations[o.job.uid]?.drink === st.drink).length;
      if (demand > carried.filter((it) => sameItem(it, drink)).length + pickups) return { job: { kind: 'pickup', uid } };
    }

    // 아무도 준비하지 않은 주문
    for (const need of unsupplied(waiting, itemsInHand(world.owner, others, stations))) {
      const near = (p: PlacedFurniture) => {
        const r = rectOf(p, world.catalog)!;
        return Math.hypot(r.x + r.w / 2 - w.pos.x, r.y + r.h / 2 - w.pos.y);
      };
      const candidates = world.layout
        .filter((p) => {
          const role = world.catalog[p.furnitureId]?.role;
          if (need.kind === 'drink') return role?.kind === 'brewer' && role.menu.includes(need.drink) && !stations[p.uid] && !claimed.has(`f${p.uid}`);
          return role?.kind === 'bookshelf' && role.genres.includes(need.tag);
        })
        .sort((a, b) => near(a) - near(b));
      const p = candidates[0];
      if (!p) continue;
      return { job: need.kind === 'drink' ? { kind: 'brew', uid: p.uid, drink: need.drink } : { kind: 'search', uid: p.uid, tag: need.tag } };
    }
    return { job: null };
  }
}
