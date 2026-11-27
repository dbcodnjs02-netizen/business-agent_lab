import type { FurnitureDef, FurnitureRole, PlacedFurniture, Rotation } from '../../types/interior';
import type { GridContext } from './grid';

// 테스트 전용 미니 카탈로그

const def = (
  id: string,
  w: number,
  h: number,
  role: FurnitureRole,
  opts: Partial<Pick<FurnitureDef, 'placement' | 'rotatable' | 'clearance'>> = {},
): FurnitureDef => ({
  id,
  name: id,
  emoji: '',
  w,
  h,
  cozy: 1,
  price: 0,
  tone: 'wood',
  placement: 'floor',
  rotatable: true,
  clearance: 0,
  role,
  ...opts,
});

export const testCtx: GridContext = {
  catalog: {
    table: def('table', 1, 1, { kind: 'decor', sprite: 'plant' }),
    sofa: def('sofa', 2, 1, { kind: 'seat', seats: 2 }),
    chair: def('chair', 1, 1, { kind: 'seat', seats: 1 }),
    desk: def('desk', 2, 1, { kind: 'desk', maxLinkedSeats: 2 }),
    shelf: def(
      'shelf',
      2,
      1,
      { kind: 'bookshelf', bookCapacity: 3, genres: ['위로'] },
      { placement: 'wall', clearance: 1 },
    ),
    brewer: def(
      'brewer',
      1,
      1,
      { kind: 'brewer', menu: ['americano'], brewSeconds: 5 },
      { rotatable: false, clearance: 1 },
    ),
  },
  grid: { cols: 4, rows: 4 },
};

export const place = (
  uid: string,
  furnitureId: string,
  x: number,
  y: number,
  rotation: Rotation = 0,
): PlacedFurniture => ({ uid, furnitureId, x, y, rotation });
