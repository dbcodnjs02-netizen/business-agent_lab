import type { CharacterLook, Species } from '../../types/character';

/*
 * 동물 단골의 머리 부품 — CharacterSprite 와 같은 좌표계
 * (hc = 머리 중심, 기본 방향은 앞-왼쪽, 얼굴 중심은 x = -2.2).
 */

const LINE = 'rgba(78, 51, 36, 0.55)';
const INK = '#3b2a22';
const PINK_NOSE = '#e7949f';
const FACE_X = -2.2;

export const isAnimal = (look: CharacterLook): look is CharacterLook & { species: Exclude<Species, 'human'> } =>
  look.species !== undefined && look.species !== 'human';

const both = (draw: (side: -1 | 1) => JSX.Element) => (
  <>
    {draw(-1)}
    {draw(1)}
  </>
);

/** 머리보다 먼저 그리는 것: 귀(머리 위로 솟는 것) · 양털 */
export function AnimalBehind({ look, hc }: { look: CharacterLook; hc: number }) {
  const fur = look.skin;
  const inner = look.hair;
  const s = { stroke: LINE, strokeWidth: 0.8 };
  switch (look.species) {
    case 'cat':
      return both((d) => (
        <g key={d}>
          <path d={`M ${d * 12.5} ${hc - 4} L ${d * 10.5} ${hc - 17} L ${d * 3.5} ${hc - 11.5} Z`} fill={fur} {...s} />
          <path d={`M ${d * 11} ${hc - 6.5} L ${d * 10} ${hc - 14} L ${d * 5.5} ${hc - 11} Z`} fill={inner} />
        </g>
      ));
    case 'fox':
      return both((d) => (
        <g key={d}>
          <path d={`M ${d * 13} ${hc - 3} L ${d * 11.5} ${hc - 20} L ${d * 2.5} ${hc - 11} Z`} fill={fur} {...s} />
          <path d={`M ${d * 11.3} ${hc - 6} L ${d * 10.8} ${hc - 16} L ${d * 5} ${hc - 10.5} Z`} fill={inner} />
        </g>
      ));
    case 'squirrel':
      return both((d) => (
        <g key={d}>
          <path d={`M ${d * 11.5} ${hc - 6} L ${d * 9.5} ${hc - 17} L ${d * 4} ${hc - 10.5} Z`} fill={fur} {...s} />
          <path d={`M ${d * 9.5} ${hc - 17} q ${d * -1} -3 ${d * 1.5} -4 q ${d * -0.5} 2 ${d * 0.6} 3.5 Z`} fill={inner} />
          <path d={`M ${d * 10.2} ${hc - 8} L ${d * 9.4} ${hc - 14} L ${d * 6} ${hc - 10.5} Z`} fill={inner} />
        </g>
      ));
    case 'rabbit':
      return both((d) => (
        <g key={d} transform={`rotate(${d * 10} ${d * 5} ${hc - 10})`}>
          <ellipse cx={d * 5} cy={hc - 19} rx={3.8} ry={10} fill={fur} {...s} />
          <ellipse cx={d * 5} cy={hc - 18.5} rx={1.8} ry={7} fill={inner} />
        </g>
      ));
    case 'bear':
      return both((d) => (
        <g key={d}>
          <circle cx={d * 9.6} cy={hc - 9.6} r={4.6} fill={fur} {...s} />
          <circle cx={d * 9.6} cy={hc - 9.6} r={2.4} fill={inner} />
        </g>
      ));
    case 'mouse':
      return both((d) => (
        <g key={d}>
          <circle cx={d * 11} cy={hc - 9} r={7} fill={fur} {...s} />
          <circle cx={d * 11} cy={hc - 9} r={4.4} fill={inner} />
        </g>
      ));
    case 'sheep':
      // 머리 둘레의 양털
      return (
        <g fill={inner} {...s}>
          {[-150, -120, -90, -60, -30, 0, 180].map((deg) => {
            const r = (deg * Math.PI) / 180;
            return <circle key={deg} cx={Math.cos(r) * 11.5} cy={hc + Math.sin(r) * 11.5} r={5.2} />;
          })}
        </g>
      );
    case 'owl':
      return both((d) => <path key={d} d={`M ${d * 12} ${hc - 6} L ${d * 12.5} ${hc - 18} L ${d * 5} ${hc - 11} Z`} fill={fur} {...s} />);
    default:
      return null;
  }
}

/** 머리 위에 겹쳐 그리는 것: 늘어진 귀 · 앞머리 양털 (앞·뒤 모두) */
export function AnimalOver({ look, hc, back }: { look: CharacterLook; hc: number; back: boolean }) {
  const s = { stroke: LINE, strokeWidth: 0.8 };
  switch (look.species) {
    case 'dog':
      return both((d) => (
        <path
          key={d}
          d={`M ${d * 9.5} ${hc - 10} Q ${d * 17.5} ${hc - 9} ${d * 16} ${hc + 5} Q ${d * 13.5} ${hc + 8.5} ${d * 11} ${hc + 2} Q ${d * 10} ${hc - 4} ${d * 9.5} ${hc - 10} Z`}
          fill={look.hair}
          {...s}
        />
      ));
    case 'sheep':
      return (
        <g fill={look.hair} {...s}>
          {(back ? [-8, -3, 3, 8] : [-8, -1.5, 5]).map((x) => (
            <circle key={x} cx={x} cy={hc - 10 - (Math.abs(x) < 4 ? 1.5 : 0)} r={4.6} />
          ))}
          {both((d) => <ellipse key={`ear${d}`} cx={d * 14} cy={hc - 1} rx={4.6} ry={2.2} fill={look.skin} transform={`rotate(${d * 15} ${d * 14} ${hc - 1})`} />)}
        </g>
      );
    default:
      return null;
  }
}

/** 얼굴 아래쪽: 주둥이 · 코 · 수염 (부리) */
export function AnimalMuzzle({ look, hc }: { look: CharacterLook; hc: number }) {
  const x = FACE_X;
  const muzzle = look.muzzle ?? '#fbf3e4';
  const noseColor = look.species === 'rabbit' || look.species === 'mouse' || look.species === 'cat' ? PINK_NOSE : INK;
  const nose = (
    <path
      d={`M ${x - 1.9} ${hc + 3.4} Q ${x} ${hc + 2.5} ${x + 1.9} ${hc + 3.4} Q ${x + 0.7} ${hc + 5.6} ${x} ${hc + 5.6} Q ${x - 0.7} ${hc + 5.6} ${x - 1.9} ${hc + 3.4} Z`}
      fill={noseColor}
    />
  );
  const whiskers = (
    <g stroke="rgba(78,51,36,0.45)" strokeWidth={0.6} strokeLinecap="round">
      {both((d) => (
        <g key={d}>
          <path d={`M ${x + d * 5} ${hc + 5} L ${x + d * 10} ${hc + 4}`} />
          <path d={`M ${x + d * 5} ${hc + 6.4} L ${x + d * 10} ${hc + 6.8}`} />
        </g>
      ))}
    </g>
  );

  switch (look.species) {
    case 'owl':
      return (
        <g>
          {[x - 4.6, x + 4.4].map((ex) => (
            <circle key={ex} cx={ex} cy={hc + 1.5} r={4.6} fill={muzzle} />
          ))}
          <path d={`M ${x - 2} ${hc + 4} L ${x + 2} ${hc + 4} L ${x} ${hc + 8} Z`} fill="#e9a85c" stroke={LINE} strokeWidth={0.5} />
        </g>
      );
    case 'fox':
      return (
        <g>
          <path d={`M ${x - 11} ${hc + 2} Q ${x - 6} ${hc + 12} ${x} ${hc + 11} Q ${x + 6} ${hc + 12} ${x + 11} ${hc + 2} Q ${x} ${hc + 5} ${x - 11} ${hc + 2} Z`} fill={muzzle} />
          {nose}
        </g>
      );
    case 'sheep':
      return nose;
    case 'cat':
    case 'mouse':
      return (
        <g>
          <ellipse cx={x} cy={hc + 5.6} rx={4.6} ry={3.2} fill={muzzle} />
          {nose}
          {whiskers}
        </g>
      );
    default:
      return (
        <g>
          <ellipse cx={x} cy={hc + 5.8} rx={5.8} ry={4} fill={muzzle} />
          {nose}
        </g>
      );
  }
}

/** 꼬리 — 앞모습이면 몸 뒤 오른쪽(먼저 그림), 뒷모습이면 등 위 가운데(나중에 그림) */
export function AnimalTail({ look, hip, back }: { look: CharacterLook; hip: number; back: boolean }) {
  const fur = look.skin;
  const inner = look.hair;
  const s = { stroke: LINE, strokeWidth: 0.8 };
  const at = back ? 'translate(-7 0)' : undefined;
  switch (look.species) {
    case 'squirrel':
      return (
        <g transform={at}>
          <path d={`M 6 ${hip - 2} Q 22 ${hip - 2} 21 ${hip - 18} Q 20 ${hip - 30} 11 ${hip - 28} Q 17 ${hip - 22} 13 ${hip - 13} Q 10 ${hip - 6} 6 ${hip - 2} Z`} fill={fur} {...s} />
          <path d={`M 14 ${hip - 25} Q 19 ${hip - 22} 17.5 ${hip - 14}`} fill="none" stroke={inner} strokeWidth={2} strokeLinecap="round" />
        </g>
      );
    case 'fox':
      return (
        <g transform={at}>
          <path d={`M 6 ${hip - 3} Q 15 ${hip + 1} 21 ${hip - 9} Q 23 ${hip - 15} 19 ${hip - 17} Q 16 ${hip - 8} 7 ${hip - 6} Z`} fill={fur} {...s} />
          <path d={`M 19 ${hip - 17} Q 23 ${hip - 15} 21 ${hip - 9} Q 19.5 ${hip - 11} 17.5 ${hip - 12.5} Z`} fill={look.muzzle ?? '#fffaf1'} />
        </g>
      );
    case 'cat':
    case 'mouse':
      return (
        <g transform={at}>
          <path
            d={`M 7 ${hip - 2} Q 18 ${hip} 15.5 ${hip - 10} Q 14.5 ${hip - 15} 18 ${hip - 16}`}
            fill="none"
            stroke={LINE}
            strokeWidth={look.species === 'cat' ? 4.2 : 2.2}
            strokeLinecap="round"
          />
          <path
            d={`M 7 ${hip - 2} Q 18 ${hip} 15.5 ${hip - 10} Q 14.5 ${hip - 15} 18 ${hip - 16}`}
            fill="none"
            stroke={look.species === 'cat' ? fur : inner}
            strokeWidth={look.species === 'cat' ? 3 : 1.2}
            strokeLinecap="round"
          />
        </g>
      );
    case 'dog':
      return (
        <g transform={at}>
          <path d={`M 8 ${hip - 3} Q 14 ${hip - 5} 14.5 ${hip - 11}`} fill="none" stroke={LINE} strokeWidth={4.6} strokeLinecap="round" />
          <path d={`M 8 ${hip - 3} Q 14 ${hip - 5} 14.5 ${hip - 11}`} fill="none" stroke={inner} strokeWidth={3.4} strokeLinecap="round" />
        </g>
      );
    case 'rabbit':
    case 'bear':
    case 'sheep':
      return <circle cx={back ? 0 : 10} cy={hip - 2.5} r={look.species === 'bear' ? 2.6 : 3.4} fill={look.species === 'bear' ? fur : look.species === 'sheep' ? inner : (look.muzzle ?? '#fffaf1')} {...s} />;
    default:
      return null;
  }
}
