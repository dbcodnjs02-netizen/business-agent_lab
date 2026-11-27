import type { CharacterLook } from '../types/character';

/*
 * 고용할 수 있는 알바 — 모두 사람, 민트색 앞치마.
 * 알바는 혼자서 음료를 내려 건네고, 책장에서 책을 찾아 건넨다.
 * 고용할 때 계약금을 한 번 내고, 매일 영업이 끝나면 일당을 준다.
 */

export interface StaffDef {
  id: string;
  name: string;
  look: CharacterLook;
  /** 한 줄 소개 */
  intro: string;
  /** 특기 (설명용) */
  perk: string;
  /** 걷는 속도 배율 (사장님 = 1) */
  speed: number;
  /** 일을 하나 끝내고 다음 일을 고르기까지 쉬는 시간(초) */
  pause: number;
  hireCost: number;
  /** 하루 일당 */
  wage: number;
}

const APRON = '#b5d9bd';

export const STAFF: StaffDef[] = [
  {
    id: 'minji',
    name: '민지',
    look: { skin: '#fde3cf', hair: '#3b2a22', hairStyle: 'ponytail', top: APRON, bottom: '#4e5a73', accessory: 'none', accent: '#ecb3c0' },
    intro: '동네 대학 문헌정보학과 2학년. 책 정리가 취미예요.',
    perk: '꼼꼼해요 — 다음 일을 고르는 손이 빨라요',
    speed: 0.9,
    pause: 0.3,
    hireCost: 400,
    wage: 120,
  },
  {
    id: 'junho',
    name: '준호',
    look: { skin: '#eabf9b', hair: '#2f2a35', hairStyle: 'short', top: APRON, bottom: '#56604f', accessory: 'cap', accent: '#a3c4dc' },
    intro: '배달 알바 3년 차. 길 찾기는 자신 있어요.',
    perk: '발이 빨라요',
    speed: 1.1,
    pause: 0.7,
    hireCost: 500,
    wage: 140,
  },
  {
    id: 'yerin',
    name: '예린',
    look: { skin: '#f6d0b1', hair: '#8a5a3b', hairStyle: 'bob', top: APRON, bottom: '#7a5136', accessory: 'flower', accent: '#f7e6a6', freckles: true },
    intro: '라떼아트 대회 예선 통과! 커피 향을 좋아해요.',
    perk: '느긋하지만 실수가 없어요',
    speed: 0.85,
    pause: 0.5,
    hireCost: 300,
    wage: 100,
  },
  {
    id: 'taeyang',
    name: '태양',
    look: { skin: '#d9a77f', hair: '#1f1a1f', hairStyle: 'curly', top: APRON, bottom: '#4e3324', accessory: 'headphones', accent: '#8f7fc0' },
    intro: '밴드 드러머. 박자 맞춰 일하면 하나도 안 힘들어요.',
    perk: '빠르고 쉬지 않아요',
    speed: 1.05,
    pause: 0.4,
    hireCost: 700,
    wage: 180,
  },
  {
    id: 'sora',
    name: '소라',
    look: { skin: '#fde3cf', hair: '#5a3d2b', hairStyle: 'long', top: APRON, bottom: '#4e5a73', accessory: 'glasses', accent: '#7a5136' },
    intro: '퇴직한 국어 선생님. 손님 이름은 한 번 들으면 안 잊어요.',
    perk: '차분해요',
    speed: 0.8,
    pause: 0.4,
    hireCost: 250,
    wage: 90,
  },
  {
    id: 'haneul',
    name: '하늘',
    look: { skin: '#f6d0b1', hair: '#c9a25e', hairStyle: 'bun', top: APRON, bottom: '#56604f', accessory: 'headscarf', accent: '#f3c6cf' },
    intro: '워킹홀리데이 다녀와서 카페 일만 5년.',
    perk: '베테랑 — 빠르고 손도 빨라요',
    speed: 1.15,
    pause: 0.25,
    hireCost: 1200,
    wage: 260,
  },
];

export const STAFF_BY_ID: Record<string, StaffDef> = Object.fromEntries(STAFF.map((s) => [s.id, s]));
