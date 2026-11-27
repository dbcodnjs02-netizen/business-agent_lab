import type { BookTag, DrinkId } from '../../types/content';
import type { FurnitureDef, PlacedFurniture } from '../../types/interior';
import { rectOf } from '../interior/grid';
import { isWaiting, sameItem, type Customer, type Item } from '../sim/sim';
import { REACH, distToRect, type InteractTarget, type PlayerState } from './player';

/*
 * 사장님이 [Space] 를 눌렀을 때(또는 눌러서 걸어간 곳에 도착했을 때) 무엇을 할지 정한다.
 * 상태는 바꾸지 않고 결정만 돌려준다 — 실제 반영은 스토어에서.
 */

/** 커피머신 상태 — left > 0 이면 내리는 중, 0 이하면 다 내려서 가져가기만 하면 됨 */
export type Stations = Record<string, { drink: DrinkId; left: number; total: number }>;

export interface InteractWorld {
  player: PlayerState;
  layout: readonly PlacedFurniture[];
  catalog: Record<string, FurnitureDef>;
  customers: readonly Customer[];
  stations: Stations;
  /** 알바가 들고 있거나 준비 중인 것 — 같은 주문을 두 번 만들지 않도록 */
  others?: readonly Item[];
  /** 메시지에 쓸 이름 (예: "아메리카노", "#위로 책") */
  label: (item: Item) => string;
}

export type Interaction =
  | { kind: 'serve'; customerId: number; item: Item }
  | { kind: 'brew'; uid: string; drink: DrinkId; seconds: number }
  | { kind: 'pickup'; uid: string; drink: DrinkId }
  | { kind: 'search'; uid: string; tag: BookTag }
  | { kind: 'message'; text: string };

const CUSTOMER_REACH = REACH + 0.35;

/** 기다림이 급한 순서 */
const byUrgency = (a: Customer, b: Customer) => a.patience - b.patience;

export function decideInteraction(w: InteractWorld, target?: InteractTarget): Interaction | null {
  const { player } = w;
  const waiting = w.customers.filter(isWaiting).sort(byUrgency);
  const near = (c: Customer) => Math.hypot(c.pos.x - player.pos.x, c.pos.y - player.pos.y) <= CUSTOMER_REACH;

  // 1. 손님에게 건네기
  const customers = target?.kind === 'customer' ? waiting.filter((c) => c.id === target.id) : waiting.filter(near);
  if (player.carrying) {
    const match = customers.find((c) => c.request && sameItem(c.request, player.carrying!));
    if (match) return { kind: 'serve', customerId: match.id, item: player.carrying };
  }
  if (target?.kind === 'customer') {
    const c = customers[0];
    if (!c?.request) return null;
    return { kind: 'message', text: `${w.label(c.request)}을(를) 기다리는 손님이에요` };
  }

  // 2. 가구 (커피머신 · 책장)
  const furniture =
    target?.kind === 'furniture'
      ? w.layout.filter((p) => p.uid === target.uid)
      : w.layout
          .map((p) => ({ p, d: distToRect(player.pos, rectOf(p, w.catalog) ?? { x: -9, y: -9, w: 0, h: 0 }) }))
          .filter(({ d }) => d <= REACH)
          .sort((a, b) => a.d - b.d)
          .map(({ p }) => p);

  for (const p of furniture) {
    const role = w.catalog[p.furnitureId]?.role;
    if (role?.kind === 'brewer') return atBrewer(w, p.uid, role.menu, role.brewSeconds, waiting);
    if (role?.kind === 'bookshelf') return atShelf(w, p.uid, role.genres, waiting);
  }

  // 3. 근처에 기다리는 손님만 있으면 무엇을 원하는지 알려준다
  const c = customers[0];
  if (c?.request) return { kind: 'message', text: `${w.label(c.request)}을(를) 기다리는 손님이에요` };
  return null;
}

function atBrewer(w: InteractWorld, uid: string, menu: DrinkId[], seconds: number, waiting: Customer[]): Interaction {
  const station = w.stations[uid];
  if (station && station.left <= 0) {
    if (w.player.carrying) return { kind: 'message', text: '손이 꽉 찼어요 — [Q] 로 내려놓기' };
    return { kind: 'pickup', uid, drink: station.drink };
  }
  if (station) return { kind: 'message', text: `${w.label({ kind: 'drink', drink: station.drink })} 내리는 중…` };

  // 아직 아무도 준비하지 않은 주문 중 가장 급한 것
  const supply = new Map<DrinkId, number>();
  const add = (d: DrinkId) => supply.set(d, (supply.get(d) ?? 0) + 1);
  Object.values(w.stations).forEach((s) => add(s.drink));
  if (w.player.carrying?.kind === 'drink') add(w.player.carrying.drink);
  for (const it of w.others ?? []) if (it.kind === 'drink') add(it.drink);

  for (const c of waiting) {
    if (c.request?.kind !== 'drink') continue;
    const d = c.request.drink;
    if ((supply.get(d) ?? 0) > 0) {
      supply.set(d, supply.get(d)! - 1);
      continue;
    }
    if (menu.includes(d)) return { kind: 'brew', uid, drink: d, seconds };
  }
  const elsewhere = waiting.find((c) => c.request?.kind === 'drink' && !menu.includes(c.request.drink));
  if (elsewhere?.request) return { kind: 'message', text: `${w.label(elsewhere.request)}은(는) 다른 기계에서 만들어요` };
  return { kind: 'message', text: '음료를 기다리는 손님이 없어요' };
}

function atShelf(w: InteractWorld, uid: string, genres: BookTag[], waiting: Customer[]): Interaction {
  if (w.player.carrying) return { kind: 'message', text: '손이 꽉 찼어요 — [Q] 로 내려놓기' };
  const books = waiting.filter((c) => c.request?.kind === 'book');
  // 알바가 이미 찾고 있는 책은 빼고
  const taken = (w.others ?? []).filter((it) => it.kind === 'book');
  const open = books.filter((c) => {
    const i = taken.findIndex((it) => sameItem(it, c.request!));
    if (i < 0) return true;
    taken.splice(i, 1);
    return false;
  });
  const here = open.find((c) => c.request?.kind === 'book' && genres.includes(c.request.tag));
  if (here?.request?.kind === 'book') return { kind: 'search', uid, tag: here.request.tag };
  if (books.length > 0 && open.length === 0) return { kind: 'message', text: '알바가 이미 책을 찾고 있어요' };
  if (open[0]?.request) return { kind: 'message', text: `이 책장엔 ${w.label(open[0].request)}이 없어요` };
  return { kind: 'message', text: '책을 기다리는 손님이 없어요' };
}
