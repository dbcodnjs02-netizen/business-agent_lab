import type { CharacterLook } from './character';
import type { DrinkId } from './content';

/** 일반 손님(사람) 유형 — 처음 계산하고 나가면 손님 도감에 등록된다 */
export interface CustomerType {
  id: string;
  /** 도감에 보이는 별명 (예: "시험기간 고3") */
  name: string;
  look: CharacterLook;
  /** 메뉴에 있으면 늘 이걸 고른다 */
  favoriteDrink: DrinkId;
  /** 도감 카드의 한마디 */
  line: string;
}
