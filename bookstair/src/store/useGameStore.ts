import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DRINKS } from '../data/drinks';
import { FURNITURE, INITIAL_INVENTORY, INITIAL_LAYOUT, INTERIOR } from '../data/furniture';
import { STAFF, STAFF_BY_ID } from '../data/staff';
import { CURATION_EVENTS, EPISODES, GUESTS, createInitialGuestProgress, guestsForDay } from '../data/guests';
import { curationReward } from '../systems/guests/curation';
import { CUSTOMER_TYPES, CUSTOMER_TYPE_BY_ID } from '../data/customers';
import { recordVisits } from '../systems/collection/collection';
import { gainExp } from '../systems/guests/friendship';
import { analyzeLayout, memoBoardSpot, seatVisitors, type Tile } from '../systems/interior/connections';
import * as grid from '../systems/interior/grid';
import type { GridContext } from '../systems/interior/grid';
import { SAVE_VERSION, exportSave, importSave, sanitizeSave, type SaveContext, type SaveData } from '../systems/save/save';
import { decideInteraction, type Interaction, type Stations } from '../systems/play/interact';
import {
  REACH,
  collides,
  createPlayer,
  distToRect,
  findPath,
  pathToward,
  stepPlayer,
  tileCenter,
  SEARCH_SECONDS,
  type InteractTarget,
  type MoveInput,
  type PlayerState,
} from '../systems/play/player';
import { EXP_GAIN, addExp, entranceOf, maxCustomersFor, perksAt, roomFor, staffSlots, type LevelPerk } from '../systems/level/level';
import { createWorker, staffSupply, tickStaff, type Worker } from '../systems/play/staff';
import { BOOK_PRICE, createSim, seatKey, serveCustomer, spawnInterval, tickSim, type Item, type SimState, type Visitor } from '../systems/sim/sim';
import { readerBonus, recruitReader, type RecruitOutcome } from '../systems/social/social';
import { blocksBusiness, nextTutorialStep, type TutorialStep } from '../systems/tutorial/tutorial';
import type { NavTab } from '../types/game';
import type { CurationEventId, CurationGrade, EpisodeId, GuestId, Reward } from '../types/guest';
import type { FurnitureId, Rotation } from '../types/interior';
import type { Reader, StoreSnapshot } from '../types/social';

export type ActionResult = { ok: true } | { ok: false; message: string };

export interface CurationOutcome {
  grade: CurationGrade;
  /** 캐스팅이었다면: 단골이 됨 / 오늘은 돌아감 */
  casting?: 'joined' | 'left';
  reward: Reward;
  levelsGained: number;
  newlyUnlocked: EpisodeId[];
}

/** 영업 시간 (분) — 오전 10시 ~ 오후 10시. 하루 영업 = 실제 5분 */
export const OPEN_MINUTES = 600;
export const CLOSE_MINUTES = 1320;
export const GAME_MINUTES_PER_SECOND = 2.4;

/** 레벨별 매장 (가구 카탈로그 + 크기) — 레벨이 오르면 넓어진다 */
const roomCache = new Map<number, GridContext>();
export function roomOf(level: number): GridContext {
  const grid = roomFor(level);
  const key = grid.cols * 100 + grid.rows;
  let room = roomCache.get(key);
  if (!room) {
    room = { catalog: FURNITURE, grid };
    roomCache.set(key, room);
  }
  return room;
}

/** 손님에게 건넨 것의 경험치 */
const expFor = (item: Item) => (item.kind === 'drink' ? EXP_GAIN.drink : EXP_GAIN.book);
const priceOf = (item: Item) => (item.kind === 'drink' ? DRINKS[item.drink].price : BOOK_PRICE);

/** 사장님이 들고 있는 것의 이름 */
export const itemLabel = (item: Item) => (item.kind === 'drink' ? DRINKS[item.drink].name : `#${item.tag} 책`);
export const itemIcon = (item: Item) => (item.kind === 'drink' ? DRINKS[item.drink].emoji : '📕');

export type Screen = 'play' | 'menu';

export interface DayReport {
  day: number;
  sales: number;
  served: number;
  missed: number;
  /** 오늘 도감에 새로 등록된 손님 유형 */
  discovered: string[];
  /** 알바 일당 합계 (매출에서 빠짐) */
  wages: number;
  /** 오늘 모은 경험치 */
  exp: number;
}

/** 레벨업 알림 */
export interface LevelUpNotice {
  id: number;
  level: number;
  perks: LevelPerk[];
}

/** 일반 손님(사람) 유형 */
const WALK_INS: Visitor[] = CUSTOMER_TYPES.map((t) => ({ look: t.look, typeId: t.id, favoriteDrink: t.favoriteDrink, bonus: 0 }));

interface GameState extends SaveData {
  /** 전체화면 영업(play) 또는 인스타그램형 메뉴(menu) */
  screen: Screen;
  activeTab: NavTab;
  /** 오늘 매장에 들어온 단골 (좌석은 배치에서 자동 배정) */
  guestsInCafe: GuestId[];
  /** 사장님이 손님에게 건넨 횟수 (튜토리얼 판정용, 저장 안 함) */
  ownerServes: number;
  /** 오늘 캐스팅에 실패해 돌아간 단골 후보 */
  leftToday: GuestId[];
  sim: SimState;
  todaySales: number;
  todayServed: number;
  todayMissed: number;
  todayDiscovered: string[];
  /** 영업이 끝나면 결산 카드 — 닫기 전까지 멈춤 */
  dayReport: DayReport | null;

  player: PlayerState;
  /** 매장에서 일하는 알바들 */
  workers: Worker[];
  stations: Stations;
  todayExp: number;
  levelUp: LevelUpNotice | null;
  /** 화면 가운데 잠깐 뜨는 안내 */
  toast: { id: number; text: string } | null;
  paused: boolean;

  /** 대화/큐레이션 모달이 열려 있는 단골 */
  talkingTo: GuestId | null;
  /** 방명록 모달이 열려 있는 서점 */
  guestbookFor: string | null;
  /** 다른 서점 방문 중이면 그 서점 */
  visiting: StoreSnapshot | null;

  setScreen: (screen: Screen) => void;
  setPaused: (paused: boolean) => void;
  setTab: (tab: NavTab) => void;
  /** 튜토리얼 시작 (인사 → 인테리어 편집으로) / 건너뛰기 */
  startTutorial: () => void;
  skipTutorial: () => void;
  /** 상점에서 가구 사기 → 보관함 */
  buyFurniture: (furnitureId: FurnitureId) => ActionResult;
  openConversation: (guestId: GuestId) => void;
  closeConversation: () => void;
  resolveCuration: (guestId: GuestId, eventId: CurationEventId, grade: CurationGrade) => CurationOutcome;
  /** 처음 온 손님에게 책을 추천 — 맞으면 단골이 되고, 틀리면 오늘은 돌아간다 */
  resolveCasting: (guestId: GuestId, grade: CurationGrade) => CurationOutcome;

  placeFromInventory: (furnitureId: FurnitureId, x: number, y: number, rotation: Rotation) => ActionResult;
  moveFurniture: (uid: string, x: number, y: number) => ActionResult;
  rotateFurniture: (uid: string) => ActionResult;
  /** 배치된 가구를 보관함으로 */
  storeFurniture: (uid: string) => void;

  /** 게임 한 프레임 (초 단위) — 사장님 이동, 커피머신, 손님 */
  tick: (dt: number, input?: MoveInput) => void;
  /** [Space] — 가까운 것과 상호작용, 또는 눌러서 고른 대상 */
  interact: (target?: InteractTarget) => void;
  /** [Q] — 들고 있는 것 내려놓기 */
  dropCarry: () => void;
  /** 바닥·손님·가구를 눌러 그쪽으로 걸어가기 */
  walkTo: (tile: Tile, target?: InteractTarget) => void;
  /** 알바 고용 / 내보내기 */
  hireStaff: (staffId: string) => ActionResult;
  fireStaff: (staffId: string) => void;
  dismissLevelUp: () => void;
  startNextDay: () => void;

  openGuestbook: (storeId: string) => void;
  closeGuestbook: () => void;
  startVisit: (store: StoreSnapshot) => void;
  endVisit: () => void;
  recruit: (reader: Reader, fromStoreId: string) => RecruitOutcome;

  exportSaveJson: () => string;
  importSaveJson: (json: string) => ActionResult;
  resetGame: () => void;
}

const newStoreId = () => `store-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const createInitialSave = (): SaveData => ({
  profile: { storeId: newStoreId(), storeName: '북스테어', ownerName: '사장님' },
  day: 1,
  minutes: OPEN_MINUTES,
  coins: 1200,
  reputation: 38,
  layout: INITIAL_LAYOUT,
  inventory: { ...INITIAL_INVENTORY },
  guestProgress: createInitialGuestProgress(),
  recruited: [],
  customerBook: {},
  tutorial: 'welcome',
  level: 1,
  exp: 0,
  staff: [],
});

const SAVE_CTX: SaveContext = {
  interior: INTERIOR,
  guestIds: Object.keys(GUESTS),
  customerTypeIds: CUSTOMER_TYPES.map((t) => t.id),
  roomFor,
  staffIds: STAFF.map((s) => s.id),
};

const pickSave = (s: GameState): SaveData => ({
  profile: s.profile,
  day: s.day,
  minutes: s.minutes,
  coins: s.coins,
  reputation: s.reputation,
  layout: s.layout,
  inventory: s.inventory,
  guestProgress: s.guestProgress,
  recruited: s.recruited,
  customerBook: s.customerBook,
  tutorial: s.tutorial,
  level: s.level,
  exp: s.exp,
  staff: s.staff,
});

const newUid = () => `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const fail = (e: grid.PlacementError): ActionResult => ({ ok: false, message: grid.PLACEMENT_MESSAGES[e.reason] });

const blockedBy = (layout: SaveData['layout'], room: GridContext) => {
  const { cols, rows } = room.grid;
  const occ = grid.buildOccupancy(layout, room);
  return (x: number, y: number) => x < 0 || y < 0 || x >= cols || y >= rows || occ[y * cols + x] !== null;
};

/** 출입문 옆 빈칸 — 사장님·알바가 나타나는 자리 */
function spawnTile(layout: SaveData['layout'], level: number): Tile {
  const room = roomOf(level);
  const entrance = entranceOf(room.grid);
  const blocked = blockedBy(layout, room);
  const path = findPath(entrance, (t) => !blocked(t.x, t.y) && t.x >= 1, blocked, room.grid.cols, room.grid.rows);
  return path?.length ? path[path.length - 1] : entrance;
}

const spawnPlayer = (layout: SaveData['layout'], level: number) => createPlayer(spawnTile(layout, level));
const spawnWorkers = (staff: readonly string[], layout: SaveData['layout'], level: number) =>
  staff.map((id) => createWorker(id, spawnTile(layout, level)));

/** 오늘 오는 동물 손님 (4레벨 전에는 단골 후보가 오지 않는다) */
const guestsOf = (s: Pick<SaveData, 'day' | 'guestProgress' | 'level'>, leftToday: GuestId[] = []) =>
  guestsForDay(s.day, s.guestProgress, leftToday, s.level);

let levelSeq = 0;

/** 경험치를 더하고, 레벨이 오르면 알림 · 단골 후보 · 튜토리얼까지 맞춘다 */
function withExp(s: GameState, gain: number, patch: Partial<GameState> = {}): Partial<GameState> {
  const r = addExp({ level: s.level, exp: s.exp }, gain);
  const base = { ...patch, exp: r.exp, todayExp: s.todayExp + gain };
  if (r.levelsGained === 0) return base;
  const perks = Array.from({ length: r.levelsGained }, (_, i) => perksAt(s.level + 1 + i)).flat();
  const next = { ...s, ...base, level: r.level };
  return {
    ...base,
    level: r.level,
    levelUp: { id: ++levelSeq, level: r.level, perks },
    guestsInCafe: guestsOf(next, next.leftToday),
    tutorial: tutorialAfter(s, { ...base, level: r.level }),
  };
}

/** 바뀐 매장 상태를 보고 튜토리얼을 다음 단계로 */
function tutorialAfter(s: GameState, patch: Partial<GameState> = {}): TutorialStep {
  const next = { ...s, ...patch };
  if (next.tutorial === 'done' || next.tutorial === 'welcome') return next.tutorial;
  const count = (kind: string) => next.layout.filter((p) => FURNITURE[p.furnitureId]?.role.kind === kind).length;
  return nextTutorialStep(next.tutorial, {
    desks: count('desk'),
    linkedSeats: analyzeLayout(next.layout, roomOf(next.level)).seatSlots.length,
    brewers: count('brewer'),
    editing: next.activeTab === 'interior',
    served: next.ownerServes,
    met: Object.values(next.guestProgress).some((p) => p.visitCount > 0),
    shelves: count('bookshelf'),
    regulars: Object.values(next.guestProgress).filter((p) => p.isRegular).length,
    level: next.level,
  });
}

/** 상태를 바꾸면서 튜토리얼 단계도 함께 맞춘다 */
const withTutorial = (s: GameState, patch: Partial<GameState>): Partial<GameState> => ({ ...patch, tutorial: tutorialAfter(s, patch) });

let toastSeq = 0;
const toastOf = (text: string) => ({ id: ++toastSeq, text });

type PlayParts = Pick<GameState, 'player' | 'sim' | 'stations'>;

/** 상호작용 결정을 실제로 반영 — 안내 문구도 함께 돌려준다 */
function perform(parts: PlayParts, it: Interaction): PlayParts & { text: string | null; served?: Item } {
  const { player, sim, stations } = parts;
  switch (it.kind) {
    case 'serve': {
      const r = serveCustomer(sim, it.customerId, it.item, priceOf(it.item));
      if (!r.ok) return { ...parts, text: '지금은 받을 수 없대요' };
      return { player: { ...player, carrying: null }, sim: r.sim, stations, text: null, served: it.item };
    }
    case 'brew':
      return {
        ...parts,
        stations: { ...stations, [it.uid]: { drink: it.drink, left: it.seconds, total: it.seconds } },
        text: `${DRINKS[it.drink].emoji} ${DRINKS[it.drink].name} 내리기 시작!`,
      };
    case 'pickup': {
      const { [it.uid]: _, ...rest } = stations;
      return { player: { ...player, carrying: { kind: 'drink', drink: it.drink } }, sim, stations: rest, text: null };
    }
    case 'search':
      return { ...parts, player: { ...player, search: { shelfUid: it.uid, tag: it.tag, left: SEARCH_SECONDS } }, text: `#${it.tag} 책을 찾는 중…` };
    case 'message':
      return { ...parts, text: it.text };
  }
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...createInitialSave(),
      screen: 'play',
      activeTab: 'cafe',
      guestsInCafe: [],
      ownerServes: 0,
      leftToday: [],
      sim: createSim(),
      todaySales: 0,
      todayServed: 0,
      todayMissed: 0,
      todayDiscovered: [],
      todayExp: 0,
      dayReport: null,
      player: spawnPlayer(INITIAL_LAYOUT, 1),
      workers: [],
      levelUp: null,
      stations: {},
      toast: null,
      paused: false,
      talkingTo: null,
      guestbookFor: null,
      visiting: null,

      setScreen: (screen) =>
        set((s) => ({
          screen,
          visiting: screen === 'play' ? null : s.visiting,
          activeTab: screen === 'play' && s.activeTab !== 'interior' ? 'cafe' : s.activeTab === 'cafe' && screen === 'menu' ? 'guests' : s.activeTab,
        })),
      setPaused: (paused) => set({ paused }),
      setTab: (tab) => set((s) => withTutorial(s, { activeTab: tab })),

      startTutorial: () => set({ tutorial: 'desks', screen: 'play', activeTab: 'interior' }),
      skipTutorial: () => set({ tutorial: 'done' }),

      buyFurniture: (furnitureId) => {
        const s = get();
        const def = FURNITURE[furnitureId];
        if (!def) return { ok: false, message: '없는 가구예요.' };
        if (s.coins < def.price) return { ok: false, message: `코인이 ${def.price - s.coins} 모자라요.` };
        set({ coins: s.coins - def.price, inventory: { ...s.inventory, [furnitureId]: (s.inventory[furnitureId] ?? 0) + 1 } });
        return { ok: true };
      },

      openConversation: (guestId) =>
        set((s) => {
          const p = s.guestProgress[guestId];
          return withTutorial(s, {
            talkingTo: guestId,
            guestProgress: { ...s.guestProgress, [guestId]: { ...p, visitCount: p.visitCount + 1 } },
          });
        }),

      closeConversation: () => set({ talkingTo: null }),

      resolveCuration: (guestId, eventId, grade) => {
        const s = get();
        const reward = curationReward(CURATION_EVENTS[eventId], grade);
        const gain = gainExp(s.guestProgress[guestId], reward.exp ?? 0, GUESTS[guestId], EPISODES);
        // miss 는 완료 처리하지 않아 다음 방문 때 다시 도전할 수 있다
        const progress =
          grade === 'miss'
            ? gain.progress
            : { ...gain.progress, completedCurations: [...gain.progress.completedCurations, eventId] };

        set({
          guestProgress: { ...s.guestProgress, [guestId]: progress },
          coins: s.coins + (reward.coins ?? 0),
          reputation: s.reputation + (reward.reputation ?? 0),
        });
        return { grade, reward, levelsGained: gain.levelsGained, newlyUnlocked: gain.newlyUnlocked };
      },

      resolveCasting: (guestId, grade) => {
        const s = get();
        const event = CURATION_EVENTS[GUESTS[guestId].castingEvent];
        const reward = curationReward(event, grade);
        if (grade === 'miss') {
          const leftToday = [...s.leftToday, guestId];
          set({ leftToday, guestsInCafe: guestsOf(s, leftToday) });
          return { grade, reward, levelsGained: 0, newlyUnlocked: [], casting: 'left' };
        }
        const gain = gainExp({ ...s.guestProgress[guestId], isRegular: true }, reward.exp ?? 0, GUESTS[guestId], EPISODES);
        const guestProgress = { ...s.guestProgress, [guestId]: gain.progress };
        const patch = withTutorial(s, {
          guestProgress,
          guestsInCafe: guestsOf({ ...s, guestProgress }, s.leftToday),
          coins: s.coins + (reward.coins ?? 0),
          reputation: s.reputation + (reward.reputation ?? 0),
        });
        // 단골이 생기면 가게 경험치도
        set(withExp({ ...s, ...patch } as GameState, EXP_GAIN.casting, patch));
        return { grade, reward, levelsGained: gain.levelsGained, newlyUnlocked: gain.newlyUnlocked, casting: 'joined' };
      },

      placeFromInventory: (furnitureId, x, y, rotation) => {
        const s = get();
        const count = s.inventory[furnitureId] ?? 0;
        if (count <= 0) return { ok: false, message: '보관함에 남은 가구가 없어요.' };
        const result = grid.addFurniture(s.layout, { uid: newUid(), furnitureId, x, y, rotation }, roomOf(s.level));
        if (!result.ok) return fail(result);
        set(withTutorial(s, { layout: result.layout, inventory: { ...s.inventory, [furnitureId]: count - 1 } }));
        return { ok: true };
      },

      moveFurniture: (uid, x, y) => {
        const result = grid.moveFurniture(get().layout, uid, x, y, roomOf(get().level));
        if (!result.ok) return fail(result);
        set((s) => withTutorial(s, { layout: result.layout }));
        return { ok: true };
      },

      rotateFurniture: (uid) => {
        const result = grid.rotateFurniture(get().layout, uid, roomOf(get().level));
        if (!result.ok) return fail(result);
        set((s) => withTutorial(s, { layout: result.layout }));
        return { ok: true };
      },

      storeFurniture: (uid) =>
        set((s) => {
          const item = s.layout.find((p) => p.uid === uid);
          if (!item) return {};
          return withTutorial(s, {
            layout: grid.removeFurniture(s.layout, uid),
            inventory: { ...s.inventory, [item.furnitureId]: (s.inventory[item.furnitureId] ?? 0) + 1 },
          });
        }),

      tick: (dt, input = { dx: 0, dy: 0 }) =>
        set((s) => {
          // 메뉴 화면 · 인테리어 편집 · 이웃 방문 · 대화창 · 결산 중에는 멈춤
          if (
            s.screen !== 'play' ||
            s.activeTab === 'interior' ||
            blocksBusiness(s.tutorial) ||
            s.visiting ||
            s.paused ||
            s.talkingTo ||
            s.guestbookFor ||
            s.dayReport
          ) {
            return {};
          }

          const room = roomOf(s.level);
          const { cols, rows } = room.grid;
          const entrance = entranceOf(room.grid);
          const analysis = analyzeLayout(s.layout, room);
          const blocked = blockedBy(s.layout, room);

          // 사장님
          let player = collides(s.player.pos, blocked) ? spawnPlayer(s.layout, s.level) : stepPlayer(s.player, input, dt, blocked);
          let toast = s.toast;
          if (player.search) {
            const left = player.search.left - dt;
            player =
              left > 0
                ? { ...player, search: { ...player.search, left } }
                : { ...player, search: null, carrying: { kind: 'book', tag: player.search.tag } };
          }

          // 커피머신
          let stations: Stations = Object.fromEntries(
            Object.entries(s.stations)
              .filter(([uid]) => s.layout.some((p) => p.uid === uid))
              .map(([uid, st]) => [uid, { ...st, left: st.left - dt }]),
          );

          // 눌러서 고른 대상에 도착
          let sim = s.sim;
          let ownerServes = s.ownerServes;
          let gained = 0;
          if (player.goal && player.path.length === 0) {
            const it = decideInteraction(
              {
                player,
                layout: s.layout,
                catalog: FURNITURE,
                customers: sim.customers,
                stations,
                others: staffSupply(s.workers),
                label: itemLabel,
              },
              player.goal,
            );
            player = { ...player, goal: null };
            if (it) {
              const r = perform({ player, sim, stations }, it);
              ({ player, sim, stations } = r);
              if (r.text) toast = toastOf(r.text);
              if (r.served) {
                ownerServes += 1;
                gained += expFor(r.served);
              }
            }
          }

          // 알바 — 가구에 끼었으면(배치가 바뀜) 출입문 옆으로
          const staffed = tickStaff(
            s.workers.map((w) => (collides(w.pos, blocked) ? createWorker(w.staffId, spawnTile(s.layout, s.level)) : w)),
            {
              layout: s.layout,
              catalog: FURNITURE,
              sim,
              stations,
              owner: player,
              blocked,
              cols,
              rows,
              traits: (id) => STAFF_BY_ID[id] ?? { speed: 1, pause: 0.5 },
              priceOf,
            },
            dt,
          );
          ({ sim, stations } = staffed);
          gained += staffed.served.reduce((sum, it) => sum + expFor(it), 0);

          // 손님
          const regulars = seatVisitors(s.guestsInCafe, analysis.seatSlots);
          const cozy = s.layout.reduce((sum, p) => sum + (FURNITURE[p.furnitureId]?.cozy ?? 0), 0);
          const result = tickSim(sim, dt, {
            seatSlots: analysis.seatSlots,
            reservedSeats: new Set(regulars.map((r) => seatKey(r.slot))),
            browseSpots: analysis.browseSpots,
            counterSpots: analysis.counterSpots,
            menu: analysis.menu,
            shelfTags: [...analysis.shelf.genres],
            bookAskChance: 0.45,
            entrance,
            // 넓은 매장일수록 손님이 자주 온다
            spawnEvery: spawnInterval(s.reputation, cozy) * Math.min(1, Math.max(0.45, 64 / (cols * rows))),
            maxCustomers: maxCustomersFor(room.grid),
            visitors: [
              ...WALK_INS,
              ...s.recruited.map((r) => ({ look: r.look, name: r.name, bonus: readerBonus(r) })),
            ],
            rng: Math.random,
          });

          // 처음 계산한 손님 유형은 도감 등록 알림
          const book = recordVisits(s.customerBook, result.paidTypes);
          sim = book.discovered.reduce(
            (acc, id) => {
              const c = acc.customers.find((x) => x.typeId === id);
              const at = c?.pos ?? entrance;
              return {
                ...acc,
                nextId: acc.nextId + 1,
                popups: [...acc.popups, { id: acc.nextId, x: at.x - 1, y: at.y - 1, text: `📗 도감 등록: ${CUSTOMER_TYPE_BY_ID[id].name}`, ttl: 2.6 }],
              };
            },
            result.sim,
          );

          const minutes = Math.min(CLOSE_MINUTES, s.minutes + dt * GAME_MINUTES_PER_SECOND);
          const todaySales = s.todaySales + result.income;
          const todayServed = s.todayServed + result.served;
          const todayMissed = s.todayMissed + result.missed;
          const todayDiscovered = [...s.todayDiscovered, ...book.discovered];
          const closing = minutes >= CLOSE_MINUTES;
          // 영업이 끝나면 알바 일당을 준다
          const wages = closing ? s.staff.reduce((sum, id) => sum + (STAFF_BY_ID[id]?.wage ?? 0), 0) : 0;

          const patch: Partial<GameState> = {
            player,
            workers: staffed.workers,
            stations,
            toast,
            sim,
            ownerServes,
            tutorial: ownerServes !== s.ownerServes ? tutorialAfter(s, { ownerServes }) : s.tutorial,
            customerBook: book.book,
            coins: s.coins + result.income - wages,
            // 실패한 주문은 평판을 조금 깎는다
            reputation: Math.max(0, s.reputation - result.missed),
            minutes,
            todaySales,
            todayServed,
            todayMissed,
            todayDiscovered,
          };
          const withLevel = gained > 0 ? withExp({ ...s, ...patch } as GameState, gained, patch) : patch;
          return {
            ...withLevel,
            dayReport: closing
              ? {
                  day: s.day,
                  sales: todaySales,
                  served: todayServed,
                  missed: todayMissed,
                  discovered: todayDiscovered,
                  wages,
                  exp: (withLevel.todayExp ?? s.todayExp),
                }
              : null,
          };
        }),

      interact: (target) =>
        set((s) => {
          if (s.screen !== 'play' || s.activeTab === 'interior' || s.paused || s.dayReport) return {};
          const it = decideInteraction(
            {
              player: s.player,
              layout: s.layout,
              catalog: FURNITURE,
              customers: s.sim.customers,
              stations: s.stations,
              others: staffSupply(s.workers),
              label: itemLabel,
            },
            target,
          );
          if (it) {
            const r = perform({ player: s.player, sim: s.sim, stations: s.stations }, it);
            const ownerServes = s.ownerServes + (r.served ? 1 : 0);
            const patch = withTutorial(s, { player: r.player, sim: r.sim, stations: r.stations, ownerServes, toast: r.text ? toastOf(r.text) : s.toast });
            return r.served ? withExp({ ...s, ...patch } as GameState, expFor(r.served), patch) : patch;
          }
          // 가까운 단골이면 대화, 메모판이면 방명록
          const room = roomOf(s.level);
          const analysis = analyzeLayout(s.layout, room);
          const regular = seatVisitors(s.guestsInCafe, analysis.seatSlots).find(
            ({ slot }) => Math.hypot(slot.x + 0.5 - s.player.pos.x, slot.y + 0.5 - s.player.pos.y) <= REACH + 0.4,
          );
          if (regular) return { talkingTo: regular.guestId };
          const memo = memoBoardSpot(s.layout, room);
          if (memo && distToRect(s.player.pos, { ...memo, w: 1, h: 1 }) <= REACH) return { guestbookFor: s.profile.storeId };
          return { toast: toastOf(s.player.carrying ? `${itemLabel(s.player.carrying)}을(를) 들고 있어요` : '근처에 할 일이 없어요') };
        }),

      dropCarry: () =>
        set((s) => (s.player.carrying ? { player: { ...s.player, carrying: null }, toast: toastOf('내려놓았어요') } : {})),

      walkTo: (tile, target) => {
        const s = get();
        const room = roomOf(s.level);
        const { cols, rows } = room.grid;
        const blocked = blockedBy(s.layout, room);
        const placed = target?.kind === 'furniture' ? s.layout.find((p) => p.uid === target.uid) : undefined;
        const goalRect =
          target?.kind === 'furniture'
            ? placed && grid.rectOf(placed, FURNITURE)
            : target?.kind === 'customer'
              ? (() => {
                  const c = s.sim.customers.find((x) => x.id === target.id);
                  return c ? { x: c.pos.x - 0.35, y: c.pos.y - 0.35, w: 0.7, h: 0.7 } : null;
                })()
              : null;
        const path = goalRect
          ? pathToward(s.player.pos, goalRect, blocked, cols, rows)
          : findPath({ x: Math.floor(s.player.pos.x), y: Math.floor(s.player.pos.y) }, (t) => t.x === tile.x && t.y === tile.y, blocked, cols, rows);
        if (!path) {
          set({ toast: toastOf('거기엔 갈 수 없어요') });
          return;
        }
        set({ player: { ...s.player, path: path.map(tileCenter), goal: target ?? null, search: null } });
      },

      hireStaff: (staffId) => {
        const s = get();
        const def = STAFF_BY_ID[staffId];
        if (!def) return { ok: false, message: '없는 알바예요.' };
        if (s.staff.includes(staffId)) return { ok: false, message: '이미 함께 일하고 있어요.' };
        if (s.staff.length >= staffSlots(s.level)) return { ok: false, message: '빈 알바 자리가 없어요. 레벨을 올려 자리를 늘려 주세요.' };
        if (s.coins < def.hireCost) return { ok: false, message: `코인이 ${def.hireCost - s.coins} 모자라요.` };
        set({
          coins: s.coins - def.hireCost,
          staff: [...s.staff, staffId],
          workers: [...s.workers, createWorker(staffId, spawnTile(s.layout, s.level))],
          toast: toastOf(`🧑‍🍳 ${def.name} 알바가 오늘부터 함께해요!`),
        });
        return { ok: true };
      },

      fireStaff: (staffId) =>
        set((s) => ({ staff: s.staff.filter((id) => id !== staffId), workers: s.workers.filter((w) => w.staffId !== staffId) })),

      dismissLevelUp: () => set({ levelUp: null }),

      startNextDay: () =>
        set((s) => ({
          day: s.day + 1,
          guestsInCafe: guestsOf({ ...s, day: s.day + 1 }),
          leftToday: [],
          minutes: OPEN_MINUTES,
          sim: createSim(),
          stations: {},
          player: spawnPlayer(s.layout, s.level),
          workers: spawnWorkers(s.staff, s.layout, s.level),
          todaySales: 0,
          todayServed: 0,
          todayMissed: 0,
          todayDiscovered: [],
          todayExp: 0,
          dayReport: null,
        })),

      openGuestbook: (storeId) => set({ guestbookFor: storeId }),
      closeGuestbook: () => set({ guestbookFor: null }),
      startVisit: (store) => set({ visiting: store, screen: 'menu', activeTab: 'cafe', talkingTo: null }),
      endVisit: () => set({ visiting: null }),

      recruit: (reader, fromStoreId) => {
        const r = recruitReader(get().recruited, reader, fromStoreId);
        set({ recruited: r.recruited });
        return r.outcome;
      },

      exportSaveJson: () => exportSave(pickSave(get())),

      importSaveJson: (json) => {
        const r = importSave(json, createInitialSave(), SAVE_CTX);
        if (!r.ok) return r;
        set({
          ...r.data,
          guestsInCafe: guestsOf(r.data),
          leftToday: [],
          sim: createSim(),
          stations: {},
          player: spawnPlayer(r.data.layout, r.data.level),
          workers: spawnWorkers(r.data.staff, r.data.layout, r.data.level),
          levelUp: null,
          dayReport: null,
          talkingTo: null,
          visiting: null,
        });
        return { ok: true };
      },

      resetGame: () =>
        set({
          ...createInitialSave(),
          guestsInCafe: [],
          ownerServes: 0,
          leftToday: [],
          screen: 'play',
          activeTab: 'cafe',
          sim: createSim(),
          stations: {},
          player: spawnPlayer(INITIAL_LAYOUT, 1),
          workers: [],
          levelUp: null,
          todayExp: 0,
          dayReport: null,
          todaySales: 0,
          todayServed: 0,
          todayMissed: 0,
          todayDiscovered: [],
          talkingTo: null,
          visiting: null,
        }),
    }),
    {
      name: 'bookstair-save',
      version: SAVE_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: pickSave,
      // 예전 버전 세이브도 sanitizeSave 가 빠진 필드를 기본값으로 채운다
      migrate: (persisted) => persisted as GameState,
      merge: (persisted, current) => {
        const save = sanitizeSave(persisted, pickSave(current), SAVE_CTX);
        return {
          ...current,
          ...save,
          guestsInCafe: guestsOf(save),
          player: spawnPlayer(save.layout, save.level),
          workers: spawnWorkers(save.staff, save.layout, save.level),
        };
      },
    },
  ),
);

/** 배치된 가구의 아늑함 합계 */
export const selectCozy = (s: GameState) =>
  s.layout.reduce((sum, p) => sum + (FURNITURE[p.furnitureId]?.cozy ?? 0), 0);

export function formatClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`;
}
