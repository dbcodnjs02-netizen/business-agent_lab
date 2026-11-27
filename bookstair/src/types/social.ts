import type { CharacterLook } from './character';
import type { BookTag, Tone } from './content';
import type { PlacedFurniture } from './interior';

/** 다른 서점에서 배회하는 독서가 (영입 대상) */
export interface Reader {
  id: string;
  name: string;
  look: CharacterLook;
  favoriteGenre: BookTag;
  /** 말을 걸면 하는 한마디 */
  intro?: string;
  /** 내 서점에 손님으로 올 때 더 내는 금액의 기본값 */
  generosity: number;
}

/** 내 서점으로 영입한 독서가 (세이브 대상) */
export interface RecruitedReader extends Reader {
  affinity: number;
  /** 어느 서점에서 데려왔는지 */
  fromStoreId: string;
}

/** 방문 화면에 필요한 다른 서점의 공개 스냅샷 */
export interface StoreSnapshot {
  storeId: string;
  storeName: string;
  ownerName: string;
  intro: string;
  layout: PlacedFurniture[];
  readers: Reader[];
}

/** 방명록 포스트잇 */
export interface GuestNote {
  id: string;
  storeId: string;
  author: string;
  text: string;
  color: Tone;
  createdAt: string;
}
