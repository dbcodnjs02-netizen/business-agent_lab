import { memo } from 'react';
import { facingOf, footprint, type Rect } from '../../../systems/interior/grid';
import type { Facing, FurnitureDef, Rotation } from '../../../types/interior';
import { Block } from './Block';
import { BOOK_COLORS, OUTLINE, SHADES, inset, poly, useCamera, type Pt, type Shades } from './view';

interface FurnitureSpriteProps {
  def: FurnitureDef;
  x: number;
  y: number;
  rotation: Rotation;
}

/** 가구 종류(role)별 모양 — 매 프레임 다시 그리지 않도록 memo */
export const FurnitureSprite = memo(function FurnitureSprite({ def, x, y, rotation }: FurnitureSpriteProps) {
  const r = inset(footprint(def, x, y, rotation), 0.06);
  const facing = facingOf(rotation);
  const colors = SHADES[def.tone];
  const role = def.role;

  switch (role.kind) {
    case 'bookshelf':
      return <Bookshelf r={r} facing={facing} colors={colors} />;
    case 'seat':
      return <Seat r={r} facing={facing} colors={colors} />;
    case 'desk':
      return <Desk r={r} colors={colors} />;
    case 'brewer':
      return <Brewer r={r} colors={colors} />;
    case 'decor':
      return role.sprite === 'lamp' ? <Lamp r={r} /> : <Plant r={r} />;
  }
});

/** 배지·말풍선 위치를 잡기 위한 대략적인 높이 */
export function spriteHeight(def: FurnitureDef): number {
  switch (def.role.kind) {
    case 'bookshelf':
      return 112;
    case 'seat':
      return 46;
    case 'desk':
      return 36;
    case 'brewer':
      return 86;
    case 'decor':
      return def.role.sprite === 'lamp' ? 84 : 50;
  }
}

const SHELF_H = 112;
const SHELF_ROWS = [10, 44, 78];

function Bookshelf({ r, facing, colors }: { r: Rect; facing: Facing; colors: Shades }) {
  const { project } = useCamera();
  // 벽 가구는 +y(오른쪽 벽) 또는 +x(왼쪽 벽) 를 바라본다 — 둘 다 화면에 보이는 면
  const onX = facing === 'right';
  const at = (t: number, z: number): Pt => (onX ? project(r.x + r.w, r.y + t * r.h, z) : project(r.x + t * r.w, r.y + r.h, z));
  const quad = (t0: number, t1: number, z0: number, z1: number) => poly(at(t0, z0), at(t1, z0), at(t1, z1), at(t0, z1));
  const spines = Math.round((onX ? r.h : r.w) * 7);

  return (
    <g>
      <Block r={r} z1={SHELF_H} colors={colors} />
      <polygon points={quad(0.06, 0.94, 6, SHELF_H - 6)} fill="#8a5f3f" stroke={OUTLINE} strokeWidth={1} />
      {SHELF_ROWS.map((z0, row) => (
        <g key={row}>
          <polygon points={quad(0.06, 0.94, z0 - 4, z0)} fill={colors[0]} />
          {Array.from({ length: spines }, (_, i) => {
            const t0 = 0.09 + (i / spines) * 0.82;
            const t1 = t0 + (0.82 / spines) * 0.82;
            const height = 18 + ((i * 7 + row * 3) % 4) * 2;
            return (
              <polygon
                key={i}
                points={quad(t0, t1, z0, z0 + height)}
                fill={BOOK_COLORS[(i + row * 2) % BOOK_COLORS.length]}
                stroke={OUTLINE}
                strokeWidth={0.6}
              />
            );
          })}
        </g>
      ))}
    </g>
  );
}

function Seat({ r, facing, colors }: { r: Rect; facing: Facing; colors: Shades }) {
  const { project, depthOf } = useCamera();
  const t = 0.26;
  const a = 0.16;
  const back: Rect = {
    down: { x: r.x, y: r.y, w: r.w, h: t },
    up: { x: r.x, y: r.y + r.h - t, w: r.w, h: t },
    left: { x: r.x + r.w - t, y: r.y, w: t, h: r.h },
    right: { x: r.x, y: r.y, w: t, h: r.h },
  }[facing];
  const alongX = facing === 'down' || facing === 'up';
  const arms: Rect[] = alongX
    ? [
        { x: r.x, y: r.y, w: a, h: r.h },
        { x: r.x + r.w - a, y: r.y, w: a, h: r.h },
      ]
    : [
        { x: r.x, y: r.y, w: r.w, h: a },
        { x: r.x, y: r.y + r.h - a, w: r.w, h: a },
      ];
  const parts = [
    { r: back, z1: 46 },
    ...arms.map((arm) => ({ r: arm, z1: 28 })),
  ].sort((p, q) => depthOf(p.r) - depthOf(q.r));

  // 쿠션 위 물방울무늬
  const dots: [number, number][] = [
    [0.35, 0.55],
    [0.65, 0.4],
    [0.55, 0.75],
  ];

  return (
    <g>
      <Block r={r} z1={16} colors={colors} />
      {dots.map(([fx, fy], i) => {
        const [cx, cy] = project(r.x + r.w * fx, r.y + r.h * fy, 16);
        return <ellipse key={i} cx={cx} cy={cy} rx={3.4} ry={1.8} fill="#fffaf1" opacity={0.8} />;
      })}
      {parts.map((p, i) => (
        <Block key={i} r={p.r} z0={16} z1={p.z1} colors={colors} />
      ))}
    </g>
  );
}

function Desk({ r, colors }: { r: Rect; colors: Shades }) {
  const { project } = useCamera();
  const l = 0.1;
  const legs: [number, number][] = [
    [r.x, r.y],
    [r.x + r.w - l, r.y],
    [r.x, r.y + r.h - l],
    [r.x + r.w - l, r.y + r.h - l],
  ];
  const [cupX, cupY] = project(r.x + r.w * 0.72, r.y + r.h * 0.55, 31);

  return (
    <g>
      {legs.map(([x, y], i) => (
        <Block key={i} r={{ x, y, w: l, h: l }} z1={26} colors={SHADES.wood} />
      ))}
      <Block r={r} z0={26} z1={31} colors={colors} />
      <Block r={{ x: r.x + r.w * 0.2, y: r.y + r.h * 0.3, w: 0.32, h: 0.24 }} z0={31} z1={35} colors={SHADES.rose} />
      <ellipse cx={cupX} cy={cupY - 3} rx={4} ry={2} fill="#fffaf1" stroke={OUTLINE} strokeWidth={0.8} />
      <path d={`M${cupX - 4} ${cupY - 3} v4 a4 2 0 0 0 8 0 v-4`} fill="#fffaf1" stroke={OUTLINE} strokeWidth={0.8} />
    </g>
  );
}

function Brewer({ r, colors }: { r: Rect; colors: Shades }) {
  const { project } = useCamera();
  const m = 0.42;
  const machine: Rect = { x: r.x + r.w / 2 - m / 2, y: r.y + r.h / 2 - m / 2, w: m, h: m };
  const [steamX, steamY] = project(machine.x + m / 2, machine.y + m / 2, 92);

  return (
    <g>
      <Block r={r} z1={42} colors={colors} />
      <Block r={r} z0={42} z1={46} colors={SHADES.cream} />
      <Block r={machine} z0={46} z1={84} colors={SHADES.cocoa} />
      <path
        d={`M${steamX} ${steamY} q-4 -6 0 -12 q4 -6 0 -12`}
        fill="none"
        stroke="#fffaf1"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.8}
      />
    </g>
  );
}

function Plant({ r }: { r: Rect }) {
  const { project } = useCamera();
  const s = 0.38;
  const pot: Rect = { x: r.x + r.w / 2 - s / 2, y: r.y + r.h / 2 - s / 2, w: s, h: s };
  const [cx, cy] = project(r.x + r.w / 2, r.y + r.h / 2, 32);
  const leaves: [number, number, number, string][] = [
    [-9, 2, 11, '#8fc49a'],
    [9, 0, 11, '#7fb08a'],
    [0, -10, 13, '#9fd0a8'],
    [0, 4, 10, '#7fb08a'],
  ];

  return (
    <g>
      <Block r={pot} z1={18} colors={SHADES.peach} />
      {leaves.map(([dx, dy, rad, fill], i) => (
        <circle key={i} cx={cx + dx} cy={cy + dy} r={rad} fill={fill} stroke={OUTLINE} strokeWidth={0.8} />
      ))}
    </g>
  );
}

function Lamp({ r }: { r: Rect }) {
  const { project } = useCamera();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  const [gx, gy] = project(cx, cy);
  const pole = 0.08;
  const shade = 0.44;

  return (
    <g>
      <ellipse cx={gx} cy={gy} rx={30} ry={15} fill="#fbedb8" opacity={0.45} />
      <Block r={{ x: cx - 0.18, y: cy - 0.18, w: 0.36, h: 0.36 }} z1={4} colors={SHADES.wood} />
      <Block r={{ x: cx - pole / 2, y: cy - pole / 2, w: pole, h: pole }} z0={4} z1={64} colors={SHADES.wood} />
      <Block r={{ x: cx - shade / 2, y: cy - shade / 2, w: shade, h: shade }} z0={60} z1={82} colors={SHADES.butter} />
    </g>
  );
}
