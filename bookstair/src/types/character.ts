import type { Emotion } from './content';

/*
 * 2등신 캐릭터의 외형·자세 정의.
 * 외형(CharacterLook)은 데이터로 저장하고, 그림은 CharacterSprite 가 그린다.
 */

export type HairStyle = 'short' | 'bob' | 'long' | 'ponytail' | 'bun' | 'curly' | 'bald';

/** human 이 아니면 머리를 동물로 그린다 (단골손님) */
export type Species = 'human' | 'cat' | 'dog' | 'rabbit' | 'bear' | 'squirrel' | 'fox' | 'mouse' | 'sheep' | 'owl';

export type Accessory = 'none' | 'glasses' | 'beret' | 'cap' | 'headphones' | 'flower' | 'headscarf' | 'pointyHat';

export interface CharacterLook {
  /** 생략하면 사람 */
  species?: Species;
  /** 사람은 피부, 동물은 털 색 */
  skin: string;
  /** 사람은 머리카락, 동물은 귀 안쪽·꼬리 무늬·양털 색 */
  hair: string;
  /** 동물 전용: 주둥이·볼 색 */
  muzzle?: string;
  /** 동물은 무시 */
  hairStyle: HairStyle;
  /** 상의 색 */
  top: string;
  /** 하의 색 */
  bottom: string;
  accessory: Accessory;
  /** 모자·머리띠·꽃 등 소품 색 */
  accent: string;
  mustache?: boolean;
  freckles?: boolean;
}

/** 쿼터뷰 4방향 — 앞(화면 아래쪽)/뒤 × 왼쪽/오른쪽 */
export type IsoFacing = 'frontLeft' | 'frontRight' | 'backLeft' | 'backRight';

export type Pose = 'stand' | 'walk' | 'sit';

/** 손에 든 것·하는 일 */
export type CharacterAction = 'none' | 'read' | 'drink' | 'sketch' | 'browse' | 'pay';

/** 대사 감정 + 책에 빠진 얼굴 */
export type Expression = Emotion | 'focus';

/** 매장에 앉아 있을 때 가끔 하는 혼잣말 */
export interface ChatterLine {
  text: string;
  emotion?: Emotion;
  /** 이 친밀도부터 들을 수 있음 */
  minLevel?: number;
}
