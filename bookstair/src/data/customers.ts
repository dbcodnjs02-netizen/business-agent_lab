import type { CharacterLook } from '../types/character';
import type { CustomerType } from '../types/customer';

/** 사장님(플레이어) — 원목색 앞치마 */
export const OWNER_LOOK: CharacterLook = {
  skin: '#f6d0b1',
  hair: '#5a3d2b',
  hairStyle: 'bun',
  top: '#a9774f',
  bottom: '#4e3324',
  accessory: 'none',
  accent: '#f7e6a6',
};

/** 일반 손님 유형 12가지 (사람) — 단골은 동물, 일반 손님은 사람 */
export const CUSTOMER_TYPES: CustomerType[] = [
  {
    id: 'exam-senior',
    name: '시험기간 고3',
    look: { skin: '#fde3cf', hair: '#2f2a35', hairStyle: 'bob', top: '#9fb1d0', bottom: '#4e5a73', accessory: 'glasses', accent: '#7a5136' },
    favoriteDrink: 'hot-choco',
    line: '단어장 한 바퀴만 더 돌리고 갈게요.',
  },
  {
    id: 'first-job',
    name: '첫 출근 신입',
    look: { skin: '#f6d0b1', hair: '#3b2a22', hairStyle: 'short', top: '#cfe2ee', bottom: '#4e5a73', accessory: 'none', accent: '#7a5136' },
    favoriteDrink: 'americano',
    line: '점심시간 30분, 여기서 숨 돌려요.',
  },
  {
    id: 'web-novelist',
    name: '웹소설 작가',
    look: { skin: '#eabf9b', hair: '#5a3d2b', hairStyle: 'curly', top: '#dcd2ee', bottom: '#56604f', accessory: 'headphones', accent: '#8f7fc0' },
    favoriteDrink: 'americano',
    line: '연재 마감까지 4시간… 커피 한 잔 더요.',
  },
  {
    id: 'morning-runner',
    name: '아침 러너',
    look: { skin: '#d9a77f', hair: '#3b2a22', hairStyle: 'ponytail', top: '#cfe7d3', bottom: '#4e5a73', accessory: 'cap', accent: '#7fb08a' },
    favoriteDrink: 'yuja-tea',
    line: '5km 뛰고 마시는 유자차가 최고예요.',
  },
  {
    id: 'knitting-grandma',
    name: '뜨개 할머니',
    look: { skin: '#f6d0b1', hair: '#d8d2cc', hairStyle: 'bun', top: '#f8d5c2', bottom: '#8a6a58', accessory: 'glasses', accent: '#d97a8c' },
    favoriteDrink: 'barley-latte',
    line: '손주 목도리 뜨다가 책 한 장씩 읽지.',
  },
  {
    id: 'parental-leave',
    name: '육아휴직 아빠',
    look: { skin: '#eabf9b', hair: '#5a3d2b', hairStyle: 'short', top: '#f7e6a6', bottom: '#5a4135', accessory: 'none', accent: '#e3946f', mustache: true },
    favoriteDrink: 'barley-latte',
    line: '아기 낮잠 시간이 제 독서 시간이에요.',
  },
  {
    id: 'backpacker',
    name: '배낭 여행자',
    look: { skin: '#b98463', hair: '#8a5a3b', hairStyle: 'long', top: '#e2a88b', bottom: '#56604f', accessory: 'cap', accent: '#e3946f' },
    favoriteDrink: 'yuja-tea',
    line: '여행지마다 서점 한 곳씩 들러요.',
  },
  {
    id: 'indie-guitarist',
    name: '인디 밴드 기타리스트',
    look: { skin: '#fde3cf', hair: '#2f2a35', hairStyle: 'long', top: '#5a4135', bottom: '#2f2a35', accessory: 'headphones', accent: '#d97a8c' },
    favoriteDrink: 'americano',
    line: '가사가 막히면 시집을 펼쳐요.',
  },
  {
    id: 'florist',
    name: '꽃집 사장님',
    look: { skin: '#fde3cf', hair: '#c48a5a', hairStyle: 'ponytail', top: '#f3c6cf', bottom: '#8a6a58', accessory: 'flower', accent: '#d97a8c' },
    favoriteDrink: 'chamomile',
    line: '오늘 들어온 꽃 이름, 책에서 찾아봤어요.',
  },
  {
    id: 'first-edition',
    name: '초판본 수집가',
    look: { skin: '#eabf9b', hair: '#a7a2a0', hairStyle: 'bald', top: '#c0915f', bottom: '#4e3324', accessory: 'glasses', accent: '#7a5136', mustache: true },
    favoriteDrink: 'americano',
    line: '책은 첫 쇄가 제일 향기롭지요.',
  },
  {
    id: 'neighborhood-kid',
    name: '동네 꼬마',
    look: { skin: '#fde3cf', hair: '#5a3d2b', hairStyle: 'bob', top: '#f7e6a6', bottom: '#d97a8c', accessory: 'beret', accent: '#e3946f', freckles: true },
    favoriteDrink: 'hot-choco',
    line: '그림 많은 책 어디 있어요?',
  },
  {
    id: 'night-developer',
    name: '야근 개발자',
    look: { skin: '#f6d0b1', hair: '#3b2a22', hairStyle: 'short', top: '#7d8fa8', bottom: '#2f2a35', accessory: 'glasses', accent: '#4e5a73' },
    favoriteDrink: 'americano',
    line: '버그 잡다가 머리 식히러 왔어요.',
  },
];

export const CUSTOMER_TYPE_BY_ID: Record<string, CustomerType> = Object.fromEntries(CUSTOMER_TYPES.map((t) => [t.id, t]));
