import type { FurnitureId, Rotation } from '../../types/interior';

/** 인테리어 모드에서 손에 든 가구 */
export type Selection =
  | { kind: 'placed'; uid: string }
  | { kind: 'inventory'; furnitureId: FurnitureId; rotation: Rotation }
  | null;
