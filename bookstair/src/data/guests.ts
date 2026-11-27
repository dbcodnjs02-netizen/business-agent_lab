import { createProgress } from '../systems/guests/friendship';
import { REGULAR_LEVEL } from '../systems/level/level';
import type {
  CurationEvent,
  CurationEventId,
  Episode,
  EpisodeId,
  GuestDefinition,
  GuestId,
  GuestProgress,
} from '../types/guest';

/** 큐레이션 이벤트의 대사 ID 는 이벤트 ID 에서 규칙대로 만든다 (scripts.ts 참고) */
const curationScripts = (id: CurationEventId): Pick<CurationEvent, 'introScriptId' | 'reactions'> => ({
  introScriptId: `${id}.intro`,
  reactions: { perfect: `${id}.perfect`, good: `${id}.good`, miss: `${id}.miss` },
});

export const GUESTS: Record<GuestId, GuestDefinition> = {
  seoyun: {
    id: 'seoyun',
    name: '서윤',
    title: '늦깎이 대학원생',
    look: {
      species: 'squirrel',
      skin: '#d08a55',
      hair: '#f1dcc0',
      muzzle: '#f8e8d4',
      hairStyle: 'short',
      top: '#cfe2ee',
      bottom: '#4e5a73',
      accessory: 'glasses',
      accent: '#7a5136',
    },
    personality: ['성실함', '걱정 많음', '칭찬에 약함'],
    bio: '회사를 그만두고 서른에 대학원에 들어간 다람쥐. 도토리 모으듯 메모를 모으고, 좋은 문장을 만나면 꼭 밑줄을 긋는다.',
    idleAction: 'read',
    chatter: [
      { text: '이 문단만 읽고 실험실 가야지…' },
      { text: '아메리카노 한 잔이면 논문 세 쪽!', emotion: 'happy' },
      { text: '교수님 메일은… 나중에 열어볼래.', emotion: 'sad' },
      { text: '여기 오면 머릿속이 좀 정리돼요.', emotion: 'happy', minLevel: 2 },
      { text: '사장님, 저 요즘은 덜 불안해요.', emotion: 'shy', minLevel: 4 },
    ],
    preferences: {
      favoriteDrinks: ['americano'],
      likedBookTags: ['도전', '일상'],
      dislikedBookTags: ['그리움'],
    },
    greetings: [
      { minLevel: 0, scriptId: 'seoyun.greet.0' },
      { minLevel: 3, scriptId: 'seoyun.greet.3' },
      { minLevel: 5, scriptId: 'seoyun.greet.5' },
    ],
    episodes: ['seoyun.ep.notebook', 'seoyun.ep.defense'],
    curationEvents: ['seoyun.cur.late-start', 'seoyun.cur.next-step'],
    castingEvent: 'seoyun.cast',
  },
  dogyeom: {
    id: 'dogyeom',
    name: '도겸 할아버지',
    title: '은퇴한 우체부',
    look: {
      species: 'bear',
      skin: '#a77a4c',
      hair: '#d4ab82',
      muzzle: '#e8e2da',
      hairStyle: 'short',
      top: '#9cc7a6',
      bottom: '#5a4135',
      accessory: 'cap',
      accent: '#4f7a5a',
      mustache: true,
    },
    personality: ['느긋함', '이야기꾼', '정이 많음'],
    bio: '40년 동안 이 동네 편지를 배달한 곰 할아버지. 주둥이가 하얗게 셌어도 우체부 모자는 못 벗고, 매일 같은 시간에 북스테어 계단을 오른다.',
    idleAction: 'drink',
    chatter: [
      { text: '허허, 이 의자 참 푹신하구먼.', emotion: 'happy' },
      { text: '옛날엔 이 골목 편지가 다 내 손을 거쳤지.' },
      { text: '보리 냄새가 꼭 고향 냄새야.', emotion: 'happy' },
      { text: '사장 양반, 오늘 장사는 좀 되나?', minLevel: 2 },
      { text: '그 편지 말이야… 언젠가 주인을 찾겠지.', emotion: 'sad', minLevel: 4 },
    ],
    preferences: {
      favoriteDrinks: ['barley-latte'],
      likedBookTags: ['그리움', '일상'],
      dislikedBookTags: ['도전'],
    },
    greetings: [
      { minLevel: 0, scriptId: 'dogyeom.greet.0' },
      { minLevel: 3, scriptId: 'dogyeom.greet.3' },
      { minLevel: 5, scriptId: 'dogyeom.greet.5' },
    ],
    episodes: ['dogyeom.ep.last-letter', 'dogyeom.ep.old-route'],
    curationEvents: ['dogyeom.cur.long-day'],
    castingEvent: 'dogyeom.cast',
  },
  harin: {
    id: 'harin',
    name: '하린',
    title: '마감에 쫓기는 일러스트레이터',
    look: {
      species: 'cat',
      skin: '#b8aca8',
      hair: '#f3b5c0',
      muzzle: '#fffaf1',
      hairStyle: 'short',
      top: '#dcd2ee',
      bottom: '#6b4f40',
      accessory: 'beret',
      accent: '#d97a8c',
    },
    personality: ['수줍음', '관찰력', '완벽주의'],
    bio: '프리랜서 일러스트레이터 고양이. 말수는 적지만 가게 구석구석을 스케치북에 담는다. 요즘은 그림이 숙제처럼 느껴져서 고민이다.',
    idleAction: 'sketch',
    chatter: [
      { text: '…이 각도 좋다. 그려둘까.' },
      { text: '마감은… 내일의 내가 하겠지.', emotion: 'sad' },
      { text: '캐모마일 향, 좋아요.', emotion: 'happy' },
      { text: '오늘은 낙서만 해도 되는 날.', emotion: 'happy', minLevel: 2 },
      { text: '사장님 가게가 다음 그림 주인공이에요.', emotion: 'shy', minLevel: 4 },
    ],
    preferences: {
      favoriteDrinks: ['chamomile', 'yuja-tea'],
      likedBookTags: ['휴식'],
      dislikedBookTags: ['도전'],
    },
    greetings: [
      { minLevel: 0, scriptId: 'harin.greet.0' },
      { minLevel: 3, scriptId: 'harin.greet.3' },
      { minLevel: 5, scriptId: 'harin.greet.5' },
    ],
    episodes: ['harin.ep.sketchbook', 'harin.ep.exhibition'],
    curationEvents: ['harin.cur.burnout'],
    castingEvent: 'harin.cast',
  },
};

export const EPISODES: Record<EpisodeId, Episode> = {
  'seoyun.ep.notebook': {
    id: 'seoyun.ep.notebook',
    title: '두고 간 연구 노트',
    summary: '서윤이 깜빡 두고 간 노트 속 낙서 한 줄.',
    requiredLevel: 2,
    scriptId: 'seoyun.ep.notebook',
  },
  'seoyun.ep.defense': {
    id: 'seoyun.ep.defense',
    title: '논문 심사 전날 밤',
    summary: '불이 늦게까지 꺼지지 않던 창가 자리.',
    requiredLevel: 4,
    scriptId: 'seoyun.ep.defense',
  },
  'dogyeom.ep.last-letter': {
    id: 'dogyeom.ep.last-letter',
    title: '배달하지 못한 편지',
    summary: '수신인 주소는 다름 아닌 이 건물 2층.',
    requiredLevel: 3,
    scriptId: 'dogyeom.ep.last-letter',
  },
  'dogyeom.ep.old-route': {
    id: 'dogyeom.ep.old-route',
    title: '옛 배달길 산책',
    summary: '골목마다 놓인 할아버지의 이야기.',
    requiredLevel: 5,
    scriptId: 'dogyeom.ep.old-route',
  },
  'harin.ep.sketchbook': {
    id: 'harin.ep.sketchbook',
    title: '스케치북 첫 장',
    summary: '그냥 좋아서 그렸던 고양이 한 마리.',
    requiredLevel: 2,
    scriptId: 'harin.ep.sketchbook',
  },
  'harin.ep.exhibition': {
    id: 'harin.ep.exhibition',
    title: '첫 전시의 첫 그림',
    summary: '하린의 전시 첫 작품은 북스테어의 계단.',
    requiredLevel: 4,
    scriptId: 'harin.ep.exhibition',
  },
};

/** 캐스팅 보상 — 실패해도 잃는 건 없고, 그날은 돌아간다 */
const CASTING_REWARDS: CurationEvent['rewards'] = {
  perfect: { exp: 20, coins: 120, reputation: 3 },
  good: { exp: 0, coins: 60, reputation: 1 },
  miss: {},
};

export const CURATION_EVENTS: Record<CurationEventId, CurationEvent> = {
  // ── 캐스팅: 처음 온 손님의 취향 ──
  'seoyun.cast': {
    id: 'seoyun.cast',
    requiredLevel: 0,
    worry: '다시 시작할 힘이 나는 책이 좋아요.',
    needTags: ['시작', '도전'],
    ...curationScripts('seoyun.cast'),
    rewards: CASTING_REWARDS,
  },
  'dogyeom.cast': {
    id: 'dogyeom.cast',
    requiredLevel: 0,
    worry: '옛날 생각이 나고, 마음이 따뜻해지는 책이면 좋겠구먼.',
    needTags: ['그리움', '위로'],
    ...curationScripts('dogyeom.cast'),
    rewards: CASTING_REWARDS,
  },
  'harin.cast': {
    id: 'harin.cast',
    requiredLevel: 0,
    worry: '쉬어 가도 된다고 말해 주는 책이요.',
    needTags: ['휴식', '위로'],
    ...curationScripts('harin.cast'),
    rewards: CASTING_REWARDS,
  },

  // ── 단골이 된 뒤의 고민 상담 ──
  'seoyun.cur.late-start': {
    id: 'seoyun.cur.late-start',
    requiredLevel: 0,
    worry: '다들 저만치 앞서가는데, 저만 너무 늦게 출발한 것 같아요.',
    needTags: ['시작', '용기'],
    ...curationScripts('seoyun.cur.late-start'),
  },
  'seoyun.cur.next-step': {
    id: 'seoyun.cur.next-step',
    requiredLevel: 3,
    worry: '첫 학회 발표. 기쁜데, 무대에 설 생각만 하면 다리가 떨려요.',
    needTags: ['도전', '시작'],
    ...curationScripts('seoyun.cur.next-step'),
    rewards: { perfect: { exp: 60, coins: 200, reputation: 5 } },
  },
  'dogyeom.cur.long-day': {
    id: 'dogyeom.cur.long-day',
    requiredLevel: 0,
    worry: '평생 걷던 골목을 이제 안 걸으니, 하루가 참 길구먼.',
    needTags: ['일상', '위로'],
    ...curationScripts('dogyeom.cur.long-day'),
  },
  'harin.cur.burnout': {
    id: 'harin.cur.burnout',
    requiredLevel: 0,
    worry: '그림이 더 이상 즐겁지 않아요. 붓을 들기만 해도 지쳐요.',
    needTags: ['휴식', '위로'],
    ...curationScripts('harin.cur.burnout'),
  },
};

/** 단골 후보가 가게를 찾는 순서 */
export const ALL_REGULARS: GuestId[] = ['seoyun', 'dogyeom', 'harin'];

/** 오늘 처음 찾아오는 단골 후보 — 아직 단골이 아닌 손님이 날마다 돌아가며 온다 (오늘 돌아간 손님 제외) */
export function castingCandidate(
  day: number,
  progress: Record<GuestId, GuestProgress>,
  leftToday: readonly GuestId[],
  level = REGULAR_LEVEL,
): GuestId | null {
  // 가게가 4레벨이 되어야 동물 손님이 찾아온다
  if (level < REGULAR_LEVEL) return null;
  const waiting = ALL_REGULARS.filter((id) => !progress[id]?.isRegular);
  if (waiting.length === 0) return null;
  const id = waiting[(day - 1) % waiting.length];
  return leftToday.includes(id) ? null : id;
}

/** 오늘 가게에 오는 동물 손님: 단골 전원 + 단골 후보 한 명 (입장 순서 = 좌석 배정 순서) */
export function guestsForDay(
  day: number,
  progress: Record<GuestId, GuestProgress>,
  leftToday: readonly GuestId[] = [],
  level = REGULAR_LEVEL,
): GuestId[] {
  const regulars = ALL_REGULARS.filter((id) => progress[id]?.isRegular);
  const candidate = castingCandidate(day, progress, leftToday, level);
  return candidate ? [...regulars, candidate] : regulars;
}

/** 새 게임 시작 시 진행 상태 */
export function createInitialGuestProgress(): Record<GuestId, GuestProgress> {
  // 처음엔 아무도 단골이 아니다 — 캐스팅으로 한 명씩
  return Object.fromEntries(Object.values(GUESTS).map((guest) => [guest.id, createProgress(guest.id, 0, 0, false)]));
}
