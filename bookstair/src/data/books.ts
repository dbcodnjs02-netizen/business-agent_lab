import type { Book } from '../types/content';

// 게임 내 가상의 도서들 (실존 도서 아님)
export const BOOKS: Book[] = [
  {
    id: 'slow-bloom',
    title: '천천히 피는 꽃',
    author: '온새미',
    tone: 'rose',
    tags: ['시작', '용기'],
    quotes: [
      '늦게 피는 꽃은 늦은 것이 아니라, 제 계절을 기다린 것이다.',
      '남의 시계로 내 하루를 재지 말 것.',
    ],
  },
  {
    id: 'first-step',
    title: '첫 번째 계단',
    author: '하늬',
    tone: 'butter',
    tags: ['시작', '도전'],
    quotes: [
      '계단은 위를 올려다볼 때가 아니라, 발을 올릴 때 짧아진다.',
      '오늘 한 칸이면 충분해.',
    ],
  },
  {
    id: 'morning-walk',
    title: '오늘의 산책',
    author: '윤슬',
    tone: 'mint',
    tags: ['일상', '위로'],
    quotes: [
      '익숙한 길도 천천히 걸으면 처음 보는 풍경이 된다.',
      '하루가 길다는 건, 선물 받을 시간이 많다는 뜻이기도 하지.',
    ],
  },
  {
    id: 'art-of-comma',
    title: '쉼표의 기술',
    author: '다온',
    tone: 'lavender',
    tags: ['휴식', '위로'],
    quotes: [
      '쉼표가 없는 문장은 아무리 아름다워도 숨이 차다.',
      '멈춘 자리에서도 이야기는 계속된다.',
    ],
  },
  {
    id: 'counting-stars',
    title: '별을 세는 밤',
    author: '가람',
    tone: 'sky',
    tags: ['위로', '그리움'],
    quotes: [
      '보이지 않는 별도 그 자리에서 빛나고 있다.',
      '그리움은 마음이 기억하는 방식이다.',
    ],
  },
];
