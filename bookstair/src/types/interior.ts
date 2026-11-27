import type { BookTag, DrinkId, Tone } from './content';

export type FurnitureId = string;

/** 시계 방향 90° 회전 횟수. 0 = 아래(손님 쪽)를 바라봄 */
export type Rotation = 0 | 1 | 2 | 3;
export type Facing = 'down' | 'left' | 'up' | 'right';

/** 가구 종류별 상호작용 속성 */
export type FurnitureRole =
  | {
      kind: 'bookshelf';
      /** 진열 가능한 책 권수 — 큐레이션 후보 수 상한 */
      bookCapacity: number;
      /** 이 책장이 다루는 분야 — 해당 태그의 책이 큐레이션 후보가 됨 */
      genres: BookTag[];
    }
  | {
      kind: 'seat';
      /** 앉을 수 있는 손님 수 */
      seats: number;
    }
  | {
      kind: 'desk';
      /** 이 책상에 연결할 수 있는 좌석 가구 수 */
      maxLinkedSeats: number;
    }
  | {
      kind: 'brewer';
      /** 제조 가능한 음료 */
      menu: DrinkId[];
      brewSeconds: number;
    }
  | {
      kind: 'decor';
      /** 매장 화면에 그릴 모양 */
      sprite: 'plant' | 'lamp';
    };

export type FurnitureKind = FurnitureRole['kind'];

export interface FurnitureDef {
  id: FurnitureId;
  name: string;
  emoji: string;
  /** 회전 0 기준 크기 (타일 단위) */
  w: number;
  h: number;
  /** 매장 아늑함 점수 기여도 */
  cozy: number;
  price: number;
  tone: Tone;
  /** wall: 뒷벽에 붙여야 함 — 오른쪽 벽(y = 0, 방향 0) 또는 왼쪽 벽(x = 0, 방향 3) */
  placement: 'floor' | 'wall';
  rotatable: boolean;
  /** 앞쪽으로 비워둬야 하는 칸 수 (손님이 책을 고르거나 주문하는 공간) */
  clearance: number;
  role: FurnitureRole;
}

/** 매장에 배치된 가구 한 개 (세이브 대상) */
export interface PlacedFurniture {
  uid: string;
  furnitureId: FurnitureId;
  /** 좌상단 기준 타일 좌표 */
  x: number;
  y: number;
  rotation: Rotation;
}
