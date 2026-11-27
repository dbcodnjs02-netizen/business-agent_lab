import type { CSSProperties } from 'react';
import type { CharacterAction, CharacterLook, Expression, IsoFacing, Pose } from '../../types/character';
import { AnimalBehind, AnimalMuzzle, AnimalOver, AnimalTail, isAnimal } from './AnimalParts';

/*
 * 2등신 캐릭터 (SVG).
 * 원점 = 발밑 중앙, 위쪽이 음수. 기본 그림은 "앞-왼쪽"을 보고 있고,
 * 오른쪽을 볼 때는 좌우 반전, 뒤를 볼 때는 얼굴 대신 뒤통수를 그린다.
 * species 가 사람이 아니면 머리카락 대신 귀·주둥이·꼬리를 그린다 (단골 동물).
 */

const INK = '#3b2a22';
const LINE = 'rgba(78, 51, 36, 0.55)';
const MOUTH = '#c8605f';
const PAPER = '#fffaf1';
const GOLD = '#ecd68a';

interface CharacterSpriteProps {
  look: CharacterLook;
  facing?: IsoFacing;
  pose?: Pose;
  action?: CharacterAction;
  expression?: Expression;
  /** 책 표지 색 */
  bookColor?: string;
  /** 캐릭터마다 깜빡임 등이 어긋나도록 (초) */
  phase?: number;
}

export function CharacterSprite({
  look,
  facing = 'frontLeft',
  pose = 'stand',
  action = 'none',
  expression = 'neutral',
  bookColor = '#ecb3c0',
  phase = 0,
}: CharacterSpriteProps) {
  const back = facing === 'backLeft' || facing === 'backRight';
  const mirror = facing === 'frontRight' || facing === 'backRight';
  const hip = pose === 'sit' ? -7 : -11;
  const top = hip - 15;
  const hc = top - 10; // 머리 중심
  const delay: CSSProperties = { animationDelay: `${-phase}s` };
  const animal = isAnimal(look);

  return (
    <g transform={mirror ? 'scale(-1 1)' : undefined}>
      {animal ? <AnimalBehind look={look} hc={hc} /> : !back && <HairBehindHead look={look} hc={hc} />}
      {animal && !back && <AnimalTail look={look} hip={hip} back={false} />}
      <Legs look={look} pose={pose} hip={hip} back={back} />
      <Torso look={look} top={top} hip={hip} back={back} />
      <Arms look={look} top={top} action={action} back={back} bookColor={bookColor} />
      {animal && back && <AnimalTail look={look} hip={hip} back />}

      <circle cx={0} cy={hc} r={animal ? 13 : 12.5} fill={look.skin} stroke={LINE} strokeWidth={0.8} />
      {back ? (
        !animal && <HairBackCover look={look} hc={hc} />
      ) : (
        <>
          <Face look={look} hc={hc} expression={expression} delay={delay} />
          {!animal && <HairFront look={look} hc={hc} />}
        </>
      )}
      {animal && <AnimalOver look={look} hc={hc} back={back} />}
      <Accessory look={look} hc={hc} back={back} />

      {!back && <HeldProp action={action} top={top} bookColor={bookColor} accent={look.accent} delay={delay} />}
    </g>
  );
}

/** 굵은 선으로 그리는 팔·다리 (외곽선 + 색) */
function Limb({ d, color, width = 4.6 }: { d: string; color: string; width?: number }) {
  return (
    <>
      <path d={d} fill="none" stroke={LINE} strokeWidth={width + 1.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Legs({ look, pose, hip, back }: { look: CharacterLook; pose: Pose; hip: number; back: boolean }) {
  if (pose === 'sit') {
    if (back) return <rect x={-9} y={hip - 2} width={18} height={6} rx={3} fill={look.bottom} stroke={LINE} strokeWidth={0.8} />;
    // 앉으면 허벅지가 앞(화면 왼쪽 아래)으로 나온다
    return (
      <g>
        <Limb d={`M -4 ${hip - 1} L -8 ${hip + 2} L -8.5 ${hip + 6}`} color={look.bottom} width={5} />
        <Limb d={`M 3 ${hip - 1} L -1 ${hip + 2.5} L -1.5 ${hip + 6.5}`} color={look.bottom} width={5} />
        <ellipse cx={-9.5} cy={hip + 7} rx={3.2} ry={1.8} fill="#5a4135" />
        <ellipse cx={-2.5} cy={hip + 7.5} rx={3.2} ry={1.8} fill="#5a4135" />
      </g>
    );
  }
  const walking = pose === 'walk';
  const leg = (x: number, cls?: string) => (
    <g className={cls}>
      <rect x={x} y={hip - 1} width={5} height={-0.5 - hip} rx={2} fill={look.bottom} stroke={LINE} strokeWidth={0.8} />
      <ellipse cx={x + 2.5 - (back ? 0 : 1)} cy={-1.2} rx={3.3} ry={1.9} fill="#5a4135" />
    </g>
  );
  return (
    <g>
      {leg(-6, walking ? 'animate-step' : undefined)}
      {leg(1, walking ? 'animate-step [animation-delay:-0.22s]' : undefined)}
    </g>
  );
}

function Torso({ look, top, hip, back }: { look: CharacterLook; top: number; hip: number; back: boolean }) {
  return (
    <g>
      <path
        d={`M -7 ${top} Q -9.5 ${top} -9.8 ${top + 3} L -10.4 ${hip - 1.2} Q -10.4 ${hip} -8.5 ${hip} L 8.5 ${hip} Q 10.4 ${hip} 10.4 ${hip - 1.2} L 9.8 ${top + 3} Q 9.5 ${top} 7 ${top} Z`}
        fill={look.top}
        stroke={LINE}
        strokeWidth={0.8}
      />
      <rect x={-10.2} y={hip - 3} width={20.4} height={2} fill="rgba(78, 51, 36, 0.09)" />
      {!back && <path d={`M -4 ${top} Q -2 ${top + 4} 0 ${top}`} fill="none" stroke={LINE} strokeWidth={0.8} />}
    </g>
  );
}

function Arms({
  look,
  top,
  action,
  back,
  bookColor,
}: {
  look: CharacterLook;
  top: number;
  action: CharacterAction;
  back: boolean;
  bookColor: string;
}) {
  const sh = top + 3; // 어깨 높이
  const hang = (side: -1 | 1) => (
    <>
      <Limb d={`M ${side * 9.4} ${sh} L ${side * 10.6} ${sh + 8.5}`} color={look.top} />
      <circle cx={side * 10.7} cy={sh + 10.4} r={2.3} fill={look.skin} stroke={LINE} strokeWidth={0.6} />
    </>
  );
  /** 몸 앞으로 굽힌 팔 (뒤에서 보면 팔꿈치만) */
  const front = (side: -1 | 1, hx: number, hy: number) =>
    back ? (
      <Limb d={`M ${side * 9.4} ${sh} L ${side * 10.4} ${sh + 6}`} color={look.top} />
    ) : (
      <>
        <Limb d={`M ${side * 9.4} ${sh} Q ${side * 11.5} ${sh + 7} ${hx} ${hy}`} color={look.top} />
        <circle cx={hx} cy={hy} r={2.3} fill={look.skin} stroke={LINE} strokeWidth={0.6} />
      </>
    );

  switch (action) {
    case 'read':
    case 'sketch':
      return (
        <g>
          {front(-1, -7.5, sh + 8)}
          {front(1, 7.5, sh + 8)}
        </g>
      );
    case 'drink':
      return (
        <g>
          {front(-1, -6, sh + 7)}
          {hang(1)}
        </g>
      );
    case 'pay':
      return (
        <g>
          {hang(-1)}
          {front(1, 4, sh + 7)}
        </g>
      );
    case 'browse':
      // 책장 쪽으로 손을 뻗어 책을 꺼낸다
      return (
        <g>
          <Limb d={`M -9 ${sh} Q -13 ${sh - 4} -12.5 ${sh - 10}`} color={look.top} />
          <rect x={-16} y={sh - 19} width={7} height={9} rx={1} fill={bookColor} stroke={LINE} strokeWidth={0.7} />
          <circle cx={-12.5} cy={sh - 11} r={2.3} fill={look.skin} stroke={LINE} strokeWidth={0.6} />
          {hang(1)}
        </g>
      );
    default:
      return (
        <g>
          {hang(-1)}
          {hang(1)}
        </g>
      );
  }
}

/** 손에 든 물건 (앞모습일 때만) */
function HeldProp({
  action,
  top,
  bookColor,
  accent,
  delay,
}: {
  action: CharacterAction;
  top: number;
  bookColor: string;
  accent: string;
  delay: CSSProperties;
}) {
  const y = top + 5;
  switch (action) {
    case 'read':
      return (
        <g>
          <path d={`M -9 ${y} L 0 ${y + 2.6} L 9 ${y} L 9 ${y + 8.6} L 0 ${y + 11} L -9 ${y + 8.6} Z`} fill={bookColor} stroke={LINE} strokeWidth={0.7} />
          <path d={`M -8 ${y - 0.6} L 0 ${y + 1.8} L 0 ${y + 9.6} L -8 ${y + 7.4} Z`} fill={PAPER} />
          <path d={`M 0 ${y + 1.8} L 8 ${y - 0.6} L 8 ${y + 7.4} L 0 ${y + 9.6} Z`} fill="#f4ead8" />
          <path d={`M -6.5 ${y + 2.4} L -2 ${y + 3.6} M -6.5 ${y + 4.6} L -2 ${y + 5.8} M 2 ${y + 3.6} L 6.5 ${y + 2.4}`} stroke="rgba(78,51,36,0.35)" strokeWidth={0.7} />
        </g>
      );
    case 'sketch':
      return (
        <g>
          <path d={`M -10 ${y + 1} L 6 ${y - 1} L 7 ${y + 10} L -9 ${y + 11.5} Z`} fill={PAPER} stroke={LINE} strokeWidth={0.7} />
          <path d={`M -9 ${y + 1} L 6 ${y - 1}`} stroke={INK} strokeWidth={1.2} strokeDasharray="1 1.2" />
          <circle cx={-3} cy={y + 6} r={2.6} fill="none" stroke={accent} strokeWidth={1} />
          <path d={`M -1 ${y + 8} Q 1 ${y + 4} 3 ${y + 7}`} fill="none" stroke="#9cc7a6" strokeWidth={1} />
          <g className="animate-scribble" style={delay}>
            <path d={`M 4 ${y + 6} L 9 ${y - 1}`} stroke={GOLD} strokeWidth={2} strokeLinecap="round" />
            <path d={`M 4 ${y + 6} L 4.8 ${y + 4.8}`} stroke={INK} strokeWidth={2} strokeLinecap="round" />
          </g>
        </g>
      );
    case 'drink':
      return (
        <g className="animate-sip" style={delay}>
          <rect x={-9} y={top + 3.5} width={6.5} height={6.5} rx={1.2} fill={PAPER} stroke={LINE} strokeWidth={0.7} />
          <path d={`M -2.5 ${top + 5} q 2.4 0.4 0 3`} fill="none" stroke={LINE} strokeWidth={0.9} />
          <path className="animate-steam" d={`M -7 ${top + 1.5} q -1.4 -2 0 -4`} fill="none" stroke="rgba(122,81,54,0.4)" strokeWidth={0.9} />
          <path className="animate-steam [animation-delay:-1s]" d={`M -4.5 ${top + 1.5} q 1.4 -2 0 -4`} fill="none" stroke="rgba(122,81,54,0.4)" strokeWidth={0.9} />
        </g>
      );
    case 'pay':
      return (
        <g>
          <circle cx={4} cy={top + 6} r={3.2} fill={GOLD} stroke="#c9a54b" strokeWidth={0.8} />
          <path d={`M 3 ${top + 5} L 5 ${top + 5}`} stroke="#c9a54b" strokeWidth={0.8} />
        </g>
      );
    default:
      return null;
  }
}

function Face({ look, hc, expression, delay }: { look: CharacterLook; hc: number; expression: Expression; delay: CSSProperties }) {
  const dx = -2.2; // 얼굴이 살짝 왼쪽(보는 방향)으로 치우침
  const ey = hc + 1.5;
  const ex = [dx - 4.6, dx + 4.4];
  const animal = isAnimal(look);
  const my = hc + (animal ? 8.4 : look.mustache ? 7.6 : 6.6);
  const blush = expression === 'shy' ? 0.95 : 0.5;

  // 반짝이는 큰 눈: 진한 눈동자 + 아래쪽 갈색 홍채 + 하이라이트 두 개
  const dotEyes = (ry: number, rx = 2.2) => (
    <g className="animate-blink" style={{ ...delay, transformBox: 'fill-box', transformOrigin: 'center' }}>
      {ex.map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={ey} rx={rx} ry={ry} fill={INK} />
          <ellipse cx={x} cy={ey + ry * 0.35} rx={rx * 0.72} ry={ry * 0.5} fill="#8a5a3b" opacity={0.85} />
          <circle cx={x + rx * 0.3} cy={ey - ry * 0.38} r={rx * 0.42} fill="#fff" />
          <circle cx={x - rx * 0.35} cy={ey + ry * 0.45} r={rx * 0.2} fill="#fff" opacity={0.9} />
        </g>
      ))}
    </g>
  );
  const arcEyes = (up: boolean) => (
    <g>
      {ex.map((x) => (
        <path
          key={x}
          d={up ? `M ${x - 2.5} ${ey + 1} Q ${x} ${ey - 2.4} ${x + 2.5} ${ey + 1}` : `M ${x - 2.4} ${ey - 0.2} Q ${x} ${ey + 2} ${x + 2.4} ${ey - 0.2}`}
          fill="none"
          stroke={INK}
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
  const line = (d: string) => <path d={d} fill="none" stroke={INK} strokeWidth={1.1} strokeLinecap="round" />;

  let eyes;
  let mouth;
  switch (expression) {
    case 'happy':
      eyes = arcEyes(true);
      mouth = <path d={`M ${dx - 2.6} ${my - 0.6} Q ${dx} ${my + 3.8} ${dx + 2.6} ${my - 0.6} Z`} fill={MOUTH} />;
      break;
    case 'sad':
      eyes = (
        <>
          {dotEyes(2.5, 2.1)}
          {line(`M ${ex[0] - 2.2} ${ey - 4.2} L ${ex[0] + 2} ${ey - 5.6}`)}
          {line(`M ${ex[1] - 2} ${ey - 5.6} L ${ex[1] + 2.2} ${ey - 4.2}`)}
        </>
      );
      mouth = line(`M ${dx - 1.9} ${my + 1} Q ${dx} ${my - 0.8} ${dx + 1.9} ${my + 1}`);
      break;
    case 'surprised':
      eyes = dotEyes(3.4, 2.5);
      mouth = <ellipse cx={dx} cy={my + 0.6} rx={1.5} ry={1.9} fill={MOUTH} />;
      break;
    case 'shy':
      eyes = arcEyes(false);
      mouth = line(`M ${dx - 2} ${my} Q ${dx - 1} ${my + 1.2} ${dx} ${my} Q ${dx + 1} ${my + 1.2} ${dx + 2} ${my}`);
      break;
    case 'focus':
      eyes = arcEyes(false);
      mouth = line(`M ${dx - 1.4} ${my + 0.2} L ${dx + 1.4} ${my + 0.2}`);
      break;
    default:
      eyes = dotEyes(2.9);
      mouth = line(`M ${dx - 1.8} ${my} Q ${dx} ${my + 1.6} ${dx + 1.8} ${my}`);
  }

  return (
    <g>
      <ellipse cx={ex[0] - 2.8} cy={hc + 5.2} rx={2.6} ry={1.5} fill="#f3a5b0" opacity={blush} />
      <ellipse cx={ex[1] + 2.8} cy={hc + 5.2} rx={2.4} ry={1.4} fill="#f3a5b0" opacity={blush} />
      {look.freckles &&
        [-1.2, 0, 1.2].map((o) => (
          <g key={o} fill="#b98463" opacity={0.7}>
            <circle cx={ex[0] - 2.8 + o * 1.4} cy={hc + 4.4 + Math.abs(o) * 0.5} r={0.45} />
            <circle cx={ex[1] + 2.8 + o * 1.4} cy={hc + 4.4 + Math.abs(o) * 0.5} r={0.45} />
          </g>
        ))}
      {animal && <AnimalMuzzle look={look} hc={hc} />}
      {eyes}
      {look.mustache && (
        <path
          transform={animal ? 'translate(0 1.4)' : undefined}
          d={`M ${dx - 4.2} ${hc + 5.6} Q ${dx - 2} ${hc + 3.8} ${dx} ${hc + 5} Q ${dx + 2} ${hc + 3.8} ${dx + 4.2} ${hc + 5.6} Q ${dx + 2} ${hc + 6.8} ${dx} ${hc + 6} Q ${dx - 2} ${hc + 6.8} ${dx - 4.2} ${hc + 5.6} Z`}
          fill={animal ? '#f4efe8' : look.hair}
          stroke={LINE}
          strokeWidth={0.5}
        />
      )}
      {look.species !== 'owl' && mouth}
    </g>
  );
}

/** 앞모습: 머리 뒤로 보이는 머리카락 (머리보다 먼저 그림) */
function HairBehindHead({ look, hc }: { look: CharacterLook; hc: number }) {
  const h = look.hair;
  const s = { fill: h, stroke: LINE, strokeWidth: 0.8 };
  if (look.accessory === 'headscarf') {
    return <path d={`M -15 ${hc - 2} Q -15 ${hc - 16} 0 ${hc - 16} Q 15 ${hc - 16} 15 ${hc - 2} L 14 ${hc + 14} Q 0 ${hc + 19} -14 ${hc + 14} Z`} fill={look.accent} stroke={LINE} strokeWidth={0.8} />;
  }
  switch (look.hairStyle) {
    case 'long':
      return <path d={`M -13 ${hc - 2} Q -14.5 ${hc + 15} -10.5 ${hc + 19} L 10.5 ${hc + 19} Q 14.5 ${hc + 15} 13 ${hc - 2} Z`} {...s} />;
    case 'bob':
      return <path d={`M -14 ${hc - 3} L -14 ${hc + 8} Q -14 ${hc + 10.5} -11 ${hc + 10.5} L 11 ${hc + 10.5} Q 14 ${hc + 10.5} 14 ${hc + 8} L 14 ${hc - 3} Z`} {...s} />;
    case 'ponytail':
      return (
        <>
          <ellipse cx={12.5} cy={hc + 4} rx={4.4} ry={8.5} transform={`rotate(-18 12.5 ${hc + 4})`} {...s} />
          <circle cx={11} cy={hc - 4} r={2.1} fill={look.accent} />
        </>
      );
    case 'bun':
      return <circle cx={3} cy={hc - 13} r={5.6} {...s} />;
    case 'curly':
      return (
        <>
          {[
            [-12, hc - 1],
            [12, hc - 1],
            [-12.5, hc + 6],
            [12.5, hc + 6],
          ].map(([x, y]) => (
            <circle key={`${x},${y}`} cx={x} cy={y} r={5} {...s} />
          ))}
        </>
      );
    default:
      return null;
  }
}

function HairFront({ look, hc }: { look: CharacterLook; hc: number }) {
  const h = look.hair;
  const s = { fill: h, stroke: LINE, strokeWidth: 0.8 };
  if (look.accessory === 'headscarf') {
    return (
      <g fill={look.accent} stroke={LINE} strokeWidth={0.8}>
        <path d={`M -14 ${hc + 3} Q -15.5 ${hc - 15.5} 0 ${hc - 15.5} Q 15.5 ${hc - 15.5} 14 ${hc + 3} Q 12 ${hc - 7.5} 0 ${hc - 8.5} Q -12 ${hc - 7.5} -14 ${hc + 3} Z`} />
        <path d={`M -12.5 ${hc + 5} Q 0 ${hc + 16} 12.5 ${hc + 5} L 13.5 ${hc + 10} Q 0 ${hc + 21} -13.5 ${hc + 10} Z`} />
      </g>
    );
  }
  if (look.hairStyle === 'bald') {
    return (
      <g {...s}>
        <ellipse cx={-12} cy={hc + 0.5} rx={2.6} ry={4.2} />
        <ellipse cx={12} cy={hc + 0.5} rx={2.6} ry={4.2} />
      </g>
    );
  }
  const cap = `M -13.2 ${hc + 1.5} Q -14.2 ${hc - 14.2} 0 ${hc - 14.2} Q 14.2 ${hc - 14.2} 13.2 ${hc + 1.5} Q 12 ${hc - 5} 6 ${hc - 6.2} Q 0.5 ${hc - 3} -5 ${hc - 5.2} Q -10 ${hc - 4} -13.2 ${hc + 1.5} Z`;
  return (
    <g>
      <path d={cap} {...s} />
      {(look.hairStyle === 'bob' || look.hairStyle === 'long') && (
        <>
          <path d={`M -13.6 ${hc - 2} L -14 ${hc + (look.hairStyle === 'long' ? 13 : 9)} L -10.6 ${hc + (look.hairStyle === 'long' ? 13 : 9)} L -11 ${hc - 2} Z`} {...s} />
          <path d={`M 13.6 ${hc - 2} L 14 ${hc + (look.hairStyle === 'long' ? 13 : 9)} L 10.6 ${hc + (look.hairStyle === 'long' ? 13 : 9)} L 11 ${hc - 2} Z`} {...s} />
        </>
      )}
      {look.hairStyle === 'curly' &&
        [
          [-9, hc - 9.5],
          [-3, hc - 12.5],
          [4, hc - 12.5],
          [10, hc - 9.5],
        ].map(([x, y]) => <circle key={x} cx={x} cy={y} r={4.2} {...s} />)}
      <path d={`M -6 ${hc - 11} Q -1 ${hc - 13} 4 ${hc - 11.5}`} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.4} strokeLinecap="round" />
    </g>
  );
}

/** 뒷모습: 뒤통수와 등을 덮는 머리카락 (몸보다 나중에 그림) */
function HairBackCover({ look, hc }: { look: CharacterLook; hc: number }) {
  const s = { fill: look.hair, stroke: LINE, strokeWidth: 0.8 };
  if (look.accessory === 'headscarf') {
    return <path d={`M -15 ${hc - 2} Q -15 ${hc - 16} 0 ${hc - 16} Q 15 ${hc - 16} 15 ${hc - 2} L 14 ${hc + 14} Q 0 ${hc + 19} -14 ${hc + 14} Z`} fill={look.accent} stroke={LINE} strokeWidth={0.8} />;
  }
  if (look.hairStyle === 'bald') {
    return (
      <path d={`M -12.4 ${hc + 1} Q 0 ${hc + 7} 12.4 ${hc + 1} L 12.4 ${hc + 4} Q 0 ${hc + 10} -12.4 ${hc + 4} Z`} {...s} />
    );
  }
  const len = look.hairStyle === 'long' ? 19 : look.hairStyle === 'bob' ? 10.5 : 5;
  return (
    <g>
      <path d={`M -13.3 ${hc + len} Q -14.6 ${hc - 14.4} 0 ${hc - 14.4} Q 14.6 ${hc - 14.4} 13.3 ${hc + len} Q 0 ${hc + len + 4} -13.3 ${hc + len} Z`} {...s} />
      {look.hairStyle === 'ponytail' && (
        <>
          <ellipse cx={0} cy={hc + 10} rx={4.2} ry={8.5} {...s} />
          <circle cx={0} cy={hc + 1.5} r={2.1} fill={look.accent} />
        </>
      )}
      {look.hairStyle === 'bun' && <circle cx={0} cy={hc - 12} r={5.6} {...s} />}
      {look.hairStyle === 'curly' &&
        [-10, -4, 4, 10].map((x) => <circle key={x} cx={x} cy={hc + 3 + Math.abs(x) * 0.15} r={4.4} {...s} />)}
    </g>
  );
}

function Accessory({ look, hc, back }: { look: CharacterLook; hc: number; back: boolean }) {
  const a = look.accent;
  const s = { stroke: LINE, strokeWidth: 0.8 };
  switch (look.accessory) {
    case 'glasses': {
      if (back) return <path d={`M -12.8 ${hc + 1} L -9 ${hc + 1.5} M 12.8 ${hc + 1} L 9 ${hc + 1.5}`} stroke="#4e3324" strokeWidth={1} />;
      const ex = [-6.8, 2.2];
      return (
        <g fill="rgba(255,255,255,0.25)" stroke="#4e3324" strokeWidth={1.1}>
          {ex.map((x) => (
            <circle key={x} cx={x} cy={hc + 1.5} r={3.7} />
          ))}
          <path d={`M -3.1 ${hc + 1.2} L -1.5 ${hc + 1.2} M -10.5 ${hc + 1} L -12.6 ${hc}`} fill="none" />
        </g>
      );
    }
    case 'beret':
      return (
        <g>
          <ellipse cx={1.5} cy={hc - 11} rx={13.5} ry={5.2} transform={`rotate(-8 1.5 ${hc - 11})`} fill={a} {...s} />
          <rect x={1} y={hc - 18.5} width={2} height={3.5} rx={1} fill={a} />
        </g>
      );
    case 'cap':
      return (
        <g>
          <path d={`M -12.6 ${hc - 4.5} Q -12.4 ${hc - 16.5} 0 ${hc - 16.5} Q 12.4 ${hc - 16.5} 12.6 ${hc - 4.5} Z`} fill={a} {...s} />
          {!back && <ellipse cx={-9} cy={hc - 4.6} rx={8.5} ry={2.6} fill={a} {...s} />}
          {!back && <circle cx={-2} cy={hc - 10} r={2.1} fill={GOLD} />}
        </g>
      );
    case 'headphones':
      return (
        <g>
          <path d={`M -13 ${hc} Q -13.5 ${hc - 17.5} 0 ${hc - 17.5} Q 13.5 ${hc - 17.5} 13 ${hc}`} fill="none" stroke="#4e3324" strokeWidth={2.4} />
          <rect x={-16} y={hc - 4.5} width={5.2} height={9} rx={2.4} fill={a} {...s} />
          <rect x={10.8} y={hc - 4.5} width={5.2} height={9} rx={2.4} fill={a} {...s} />
        </g>
      );
    case 'flower': {
      const [cx, cy] = back ? [-9, hc - 9] : [8.5, hc - 10];
      return (
        <g>
          {[0, 72, 144, 216, 288].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <circle key={deg} cx={cx + Math.cos(r) * 2.6} cy={cy + Math.sin(r) * 2.6} r={2.2} fill={a} />;
          })}
          <circle cx={cx} cy={cy} r={1.5} fill={GOLD} />
        </g>
      );
    }
    case 'pointyHat':
      return (
        <g>
          <ellipse cx={0} cy={hc - 10} rx={17} ry={4.6} fill={a} {...s} />
          <path d={`M -9.5 ${hc - 11} Q -3 ${hc - 25} 7 ${hc - 35} Q 5 ${hc - 22} 9.5 ${hc - 11} Z`} fill={a} {...s} />
          <path d={`M -9 ${hc - 13} Q 0 ${hc - 16} 9.2 ${hc - 13} L 9.4 ${hc - 11} Q 0 ${hc - 14} -9.3 ${hc - 11} Z`} fill={GOLD} />
          <circle cx={2} cy={hc - 21} r={1.3} fill={GOLD} />
        </g>
      );
    default:
      return null;
  }
}
