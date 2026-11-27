import type { StoreSnapshot } from '../types/social';

// 백엔드 연결 전까지 쓰는 이웃 서점 목업

export const NEIGHBOR_STORES: StoreSnapshot[] = [
  {
    storeId: 'moonlight',
    storeName: '달빛 서점',
    ownerName: '모모',
    intro: '밤 열 시까지 불 켜두는 작은 서점이에요 🌙',
    layout: [
      { uid: 'n1', furnitureId: 'shelf-essay', x: 0, y: 0, rotation: 0 },
      { uid: 'n2', furnitureId: 'shelf-poetry', x: 3, y: 0, rotation: 0 },
      { uid: 'n3', furnitureId: 'coffee-machine', x: 6, y: 0, rotation: 0 },
      { uid: 'n4', furnitureId: 'shelf-growth', x: 0, y: 4, rotation: 3 },
      { uid: 'n5', furnitureId: 'sofa', x: 3, y: 4, rotation: 0 },
      { uid: 'n6', furnitureId: 'desk', x: 3, y: 5, rotation: 0 },
      { uid: 'n7', furnitureId: 'armchair', x: 7, y: 6, rotation: 3 },
      { uid: 'n8', furnitureId: 'side-table', x: 8, y: 6, rotation: 0 },
      { uid: 'n9', furnitureId: 'plant', x: 9, y: 0, rotation: 0 },
      { uid: 'n10', furnitureId: 'lamp', x: 0, y: 9, rotation: 0 },
      { uid: 'n11', furnitureId: 'plant', x: 9, y: 9, rotation: 0 },
    ],
    readers: [
      {
        id: 'rumi',
        name: '루미',
        look: { skin: '#fde3cf', hair: '#e8e0f5', hairStyle: 'long', top: '#cfe2ee', bottom: '#8a6a58', accessory: 'flower', accent: '#d97a8c' },
        favoriteGenre: '위로',
        intro: '힘든 날엔 시집이 제일이에요. 짧아서 덜 무겁거든요.',
        generosity: 10,
      },
      {
        id: 'haon',
        name: '하온',
        look: { skin: '#d9a77f', hair: '#2f2a35', hairStyle: 'short', top: '#f7e6a6', bottom: '#4e5a73', accessory: 'headphones', accent: '#e3946f' },
        favoriteGenre: '도전',
        intro: '다음 달에 마라톤 나가요! 그 전에 이 책 끝내는 게 목표예요.',
        generosity: 15,
      },
    ],
  },
  {
    storeId: 'catshelf',
    storeName: '고양이 책방',
    ownerName: '냥사장',
    intro: '책 읽다 졸면 고양이가 지켜줘요 🐈',
    layout: [
      { uid: 'c1', furnitureId: 'shelf-growth', x: 1, y: 0, rotation: 0 },
      { uid: 'c2', furnitureId: 'shelf-essay', x: 4, y: 0, rotation: 0 },
      { uid: 'c3', furnitureId: 'tea-station', x: 8, y: 0, rotation: 0 },
      { uid: 'c4', furnitureId: 'shelf-poetry', x: 0, y: 6, rotation: 3 },
      { uid: 'c5', furnitureId: 'sofa', x: 2, y: 3, rotation: 0 },
      { uid: 'c6', furnitureId: 'desk', x: 2, y: 4, rotation: 0 },
      { uid: 'c7', furnitureId: 'sofa', x: 2, y: 5, rotation: 2 },
      { uid: 'c8', furnitureId: 'armchair', x: 6, y: 4, rotation: 0 },
      { uid: 'c9', furnitureId: 'side-table', x: 6, y: 5, rotation: 0 },
      { uid: 'c10', furnitureId: 'plant', x: 0, y: 0, rotation: 0 },
      { uid: 'c11', furnitureId: 'lamp', x: 9, y: 9, rotation: 0 },
      { uid: 'c12', furnitureId: 'plant', x: 5, y: 8, rotation: 0 },
    ],
    readers: [
      {
        id: 'soi',
        name: '소이',
        look: { skin: '#eabf9b', hair: '#3b2a22', hairStyle: 'short', top: '#cfe7d3', bottom: '#6b4f40', accessory: 'headscarf', accent: '#f0bfa6' },
        favoriteGenre: '일상',
        intro: '퇴근길에 한 챕터씩 읽어요. 그게 제 하루의 쉼표예요.',
        generosity: 8,
      },
      {
        id: 'orae',
        name: '오래',
        look: { skin: '#f6d0b1', hair: '#d9c3a0', hairStyle: 'long', top: '#b9a9d9', bottom: '#5a4135', accessory: 'pointyHat', accent: '#7a5136', mustache: true },
        favoriteGenre: '그리움',
        intro: '오래된 책 냄새를 맡으면 옛 친구가 생각나지요.',
        generosity: 12,
      },
      {
        id: 'dami',
        name: '다미',
        look: { skin: '#fde3cf', hair: '#5a3d2b', hairStyle: 'ponytail', top: '#fffaf1', bottom: '#4e5a73', accessory: 'glasses', accent: '#7fb08a' },
        favoriteGenre: '시작',
        intro: '새로운 걸 시작할 땐 관련 책부터 사요. 연구자 버릇이죠.',
        generosity: 10,
      },
    ],
  },
];
