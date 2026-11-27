import type { Facing } from '../../types/interior';
import type { Accessory, CharacterLook, HairStyle, IsoFacing, Species } from '../../types/character';

export const HAIR_STYLES: readonly HairStyle[] = ['short', 'bob', 'long', 'ponytail', 'bun', 'curly', 'bald'];
export const SPECIES: readonly Species[] = ['human', 'cat', 'dog', 'rabbit', 'bear', 'squirrel', 'fox', 'mouse', 'sheep', 'owl'];
export const ACCESSORIES: readonly Accessory[] = ['none', 'glasses', 'beret', 'cap', 'headphones', 'flower', 'headscarf', 'pointyHat'];

const SKINS = ['#fde3cf', '#f6d0b1', '#eabf9b', '#d9a77f', '#b98463'];
const HAIRS = ['#3b2a22', '#5a3d2b', '#8a5a3b', '#c48a5a', '#2f2a35', '#d9c3a0', '#a7a2a0'];
const TOPS = ['#f3c6cf', '#cfe2ee', '#cfe7d3', '#f7e6a6', '#dcd2ee', '#f8d5c2', '#c0915f', '#9fb1d0'];
const BOTTOMS = ['#6b4f40', '#4e5a73', '#8a6a58', '#56604f', '#5a4135'];
const ACCENTS = ['#d97a8c', '#e3946f', '#d9b443', '#7fb08a', '#8f7fc0', '#7a5136'];
/** 지나가는 손님은 너무 튀는 소품은 덜 쓴다 */
const WALK_IN_HAIR: readonly HairStyle[] = ['short', 'short', 'bob', 'long', 'ponytail', 'bun', 'curly'];
const WALK_IN_ACC: readonly Accessory[] = ['none', 'none', 'none', 'glasses', 'glasses', 'beret', 'cap', 'headphones', 'flower'];

/** 문자열 → 32비트 시드 */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** 시드가 같으면 늘 같은 외형 (지나가는 손님·예전 세이브 복구용) */
export function lookFromSeed(seed: number): CharacterLook {
  let t = seed >>> 0;
  const rand = () => {
    // mulberry32
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
  return {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairStyle: pick(WALK_IN_HAIR),
    top: pick(TOPS),
    bottom: pick(BOTTOMS),
    accessory: pick(WALK_IN_ACC),
    accent: pick(ACCENTS),
    freckles: rand() < 0.15,
  };
}

const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);

/** 공유 링크·세이브에서 읽은 외형 검증 */
export function isLook(v: unknown): v is CharacterLook {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return false;
  const l = v as Partial<Record<keyof CharacterLook, unknown>>;
  return (
    isColor(l.skin) &&
    isColor(l.hair) &&
    isColor(l.top) &&
    isColor(l.bottom) &&
    isColor(l.accent) &&
    HAIR_STYLES.includes(l.hairStyle as HairStyle) &&
    ACCESSORIES.includes(l.accessory as Accessory) &&
    (l.species === undefined || SPECIES.includes(l.species as Species)) &&
    (l.muzzle === undefined || isColor(l.muzzle)) &&
    (l.mustache === undefined || typeof l.mustache === 'boolean') &&
    (l.freckles === undefined || typeof l.freckles === 'boolean')
  );
}

/** 외형이 없거나 깨졌으면 id 로 만든 외형 */
export function lookOr(v: unknown, id: string): CharacterLook {
  return isLook(v) ? v : lookFromSeed(hashString(id));
}

/**
 * 그리드 이동 방향 → 화면 속 방향. 카메라가 매장 앞(+y)에서 내려다보므로
 * +y 로 가면 얼굴이, -y 로 가면 뒤통수가 보인다. 좌우는 x 방향(없으면 이전 방향)으로 정한다.
 */
export function facingFrom(dx: number, dy: number, fallback: IsoFacing = 'frontLeft'): IsoFacing {
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) return fallback;
  const right = Math.abs(dx) > 1e-6 ? dx > 0 : fallback.endsWith('Right');
  const front = Math.abs(dx) >= Math.abs(dy) || dy > 0;
  return `${front ? 'front' : 'back'}${right ? 'Right' : 'Left'}` as IsoFacing;
}

/** 가구가 바라보는 방향(그리드) → 그 가구에 앉은 사람의 화면 속 방향 */
export function facingOfSeat(f: Facing): IsoFacing {
  return { down: 'frontLeft', right: 'frontRight', up: 'backRight', left: 'frontLeft' }[f] as IsoFacing;
}
