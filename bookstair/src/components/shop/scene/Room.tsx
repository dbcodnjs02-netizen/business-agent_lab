import { FLOOR_DEPTH, OUTLINE, WALL_H, poly, useCamera } from './view';

const WAINSCOT = 46;
const THICK = 0.3;
/** 매장 양옆 낮은 칸막이 높이 */
const RAIL_H = 54;
/** 왼쪽 칸막이 출입구 (그리드 y 범위) — 손님이 드나드는 칸 (0, rows - 2) 앞 */
const doorOf = (rows: number): [number, number] => [rows - 2.65, rows - 0.75];

// 파스텔 섞기: 베이지 바탕에 핑크·민트·라벤더 포인트
const C = {
  wall: '#fbf1e8',
  stripe: '#f8e1e6',
  wainscot: '#cfe7d3',
  trim: '#fffaf1',
  crown: '#e8c9d6',
  ceiling: '#f3e2dc',
  rail: '#dcd2ee',
  railSide: '#cdbfe6',
  gold: '#e2bf5a',
  hall: ['#f4efe2', '#e9f2ea'] as const,
  curtain: '#f3c6cf',
  wood: '#a9774f',
};

const BULBS = ['#f7e6a6', '#f3c6cf', '#cfe7d3', '#dcd2ee', '#cfe2ee'];

interface RoomProps {
  cols: number;
  rows: number;
  /** 뒷벽 간판 글자 */
  sign: string;
  /** 전체화면 — 벽과 바닥을 매장 밖까지 이어서 화면을 채운다 */
  wide?: boolean;
}

/** 방 껍데기: 뒷벽(장식), 양옆 낮은 칸막이, 바닥 둘레 (상호작용 없음) */
export function Room({ cols, rows, sign, wide }: RoomProps) {
  const { project, scaleAt, zoom } = useCamera();
  const bw = (gx: number, z: number) => project(gx, 0, z);
  const bQuad = (x0: number, x1: number, z0: number, z1: number) => poly(bw(x0, z0), bw(x1, z0), bw(x1, z1), bw(x0, z1));
  const fQuad = (x0: number, y0: number, x1: number, y1: number, z = 0) =>
    poly(project(x0, y0, z), project(x1, y0, z), project(x1, y1, z), project(x0, y1, z));

  // 넓은 화면에서는 벽을 매장 밖까지 이어 그린다 (매장이 넓을수록 화면 밖 범위도 넓게)
  const [wx0, wx1] = wide ? [-Math.ceil(16 * zoom), cols + Math.ceil(16 * zoom)] : [0, cols];
  const signAt = bw(cols / 2, 140);
  const signScale = scaleAt(cols / 2, 0, 140);
  // 좁은 매장에선 간판을 줄여 창문·액자와 겹치지 않게
  const signHalf = cols >= 10 ? 1.7 : 1.3;
  const frame = cols - 2.65;
  const clock = bw(cols - 0.7, 160);

  return (
    <g aria-hidden>
      <defs>
        <linearGradient id="bs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#cfe2ee" />
          <stop offset="1" stopColor="#fffaf1" />
        </linearGradient>
      </defs>

      {wide && <Surroundings cols={cols} rows={rows} fQuad={fQuad} />}
      {!wide && (
        <polygon points={poly(project(0, rows), project(cols, rows), project(cols, rows, -FLOOR_DEPTH), project(0, rows, -FLOOR_DEPTH))} fill="#d4ab82" stroke={OUTLINE} />
      )}

      {/* 뒷벽: 줄무늬 벽지 · 민트 징두리 · 몰딩 */}
      <polygon points={bQuad(wx0, wx1, 0, WALL_H)} fill={C.wall} />
      {Array.from({ length: (wx1 - wx0) * 2 }, (_, i) =>
        i % 2 ? null : <polygon key={i} points={bQuad(wx0 + i / 2, wx0 + i / 2 + 0.24, WAINSCOT, WALL_H)} fill={C.stripe} />,
      )}
      <polygon points={bQuad(wx0, wx1, 0, WAINSCOT)} fill={C.wainscot} stroke={OUTLINE} strokeWidth={1} />
      <polygon points={bQuad(wx0, wx1, WAINSCOT, WAINSCOT + 5)} fill={C.trim} stroke={OUTLINE} strokeWidth={0.6} />
      <polygon points={bQuad(wx0, wx1, WALL_H - 10, WALL_H)} fill={C.crown} stroke={OUTLINE} strokeWidth={0.6} />
      {!wide && (
        <polygon points={poly(project(-THICK, -THICK, WALL_H), project(cols + THICK, -THICK, WALL_H), project(cols, 0, WALL_H), project(0, 0, WALL_H))} fill={C.wood} />
      )}

      {/* 창문 + 커튼 */}
      <polygon points={bQuad(0.55, 2.35, 108, 178)} fill={C.wood} stroke={OUTLINE} />
      <polygon points={bQuad(0.67, 2.23, 114, 172)} fill="url(#bs-sky)" />
      <polyline points={poly(bw(1.45, 114), bw(1.45, 172))} stroke={C.wood} strokeWidth={3} />
      <polyline points={poly(bw(0.67, 143), bw(2.23, 143))} stroke={C.wood} strokeWidth={3} />
      <polygon points={poly(bw(0.3, 184), bw(1.0, 184), bw(0.75, 140), bw(0.85, 104), bw(0.35, 104))} fill={C.curtain} stroke={OUTLINE} strokeWidth={0.8} />
      <polygon points={poly(bw(1.9, 184), bw(2.6, 184), bw(2.55, 104), bw(2.05, 104), bw(2.15, 140))} fill={C.curtain} stroke={OUTLINE} strokeWidth={0.8} />
      <polygon points={bQuad(0.2, 2.7, 182, 190)} fill="#ecb3c0" stroke={OUTLINE} strokeWidth={0.8} />

      {/* 간판 + 양옆 벽등 */}
      <polygon points={bQuad(cols / 2 - signHalf, cols / 2 + signHalf, 124, 162)} fill="#7a5136" stroke={OUTLINE} />
      <polygon points={bQuad(cols / 2 - signHalf + 0.12, cols / 2 + signHalf - 0.12, 128, 158)} fill="none" stroke={C.gold} strokeWidth={1.2} />
      <text x={signAt[0]} y={signAt[1] + 5 * signScale} textAnchor="middle" fontFamily="var(--font-book)" fontSize={17 * signScale * (signHalf / 1.7)} fontWeight={700} fill="#f7e6a6">
        {sign.length > 9 ? `${sign.slice(0, 8)}…` : sign}
      </text>
      {cols >= 10 &&
        [cols / 2 - 2.25, cols / 2 + 2.25].map((x) => <Sconce key={x} at={bw(x, 140)} k={signScale} />)}

      {/* 액자 · 시계 */}
      <polygon points={bQuad(frame, frame + 1.3, 112, 166)} fill={C.wood} stroke={OUTLINE} />
      <polygon points={bQuad(frame + 0.1, frame + 1.2, 118, 160)} fill="#dcd2ee" />
      <polygon points={poly(bw(frame + 0.1, 118), bw(frame + 0.6, 144), bw(frame + 0.85, 131), bw(frame + 1.2, 118))} fill="#9cc7a6" />
      <circle cx={bw(frame + 0.9, 148)[0]} cy={bw(frame + 0.9, 148)[1]} r={3} fill="#f7e6a6" />
      <circle cx={clock[0]} cy={clock[1]} r={12 * scaleAt(cols - 0.7, 0, 160)} fill="#fffaf1" stroke={C.wood} strokeWidth={3} />
      <path d={`M${clock[0]} ${clock[1]} v-6 M${clock[0]} ${clock[1]} h4`} stroke="#7a5136" strokeWidth={1.5} strokeLinecap="round" />

      {/* 전구 줄 */}
      <StringLights x0={0.2} x1={cols - 0.2} />

      {/* 양옆 낮은 칸막이 (라벤더 + 금색 기둥) */}
      <Partition x={0} rows={rows} gap={doorOf(rows)} />
      <Partition x={cols} rows={rows} />
      {/* 출입구 아치 */}
      <EntranceArch rows={rows} />
    </g>
  );
}

/** 넓은 화면: 매장 밖 홀 바닥 · 왼쪽 입구 카펫 · 오른쪽 단상 */
function Surroundings({ cols, rows, fQuad }: { cols: number; rows: number; fQuad: (x0: number, y0: number, x1: number, y1: number, z?: number) => string }) {
  const { project, zoom } = useCamera();
  const x0 = -2 * Math.ceil(8 * zoom);
  const x1 = cols + 2 * Math.ceil(8 * zoom);
  const wideY = rows + 2 * Math.ceil(2.5 * zoom);
  const door = doorOf(rows);
  const tiles: JSX.Element[] = [];
  // 큰 타일 (2×2 칸) — 매장 안 바닥과 구분
  for (let y = 0; y < wideY; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const inside = x >= 0 && x < cols && y < rows;
      if (inside) continue;
      tiles.push(<polygon key={`${x},${y}`} points={fQuad(x, y, x + 2, y + 2)} fill={C.hall[((x - x0) / 2 + y / 2) % 2]} />);
    }
  }
  return (
    <g>
      {/* 화면 끝까지: 위쪽은 천장색, 아래는 홀 바닥색 */}
      <rect x={-6000} y={-6000} width={12000} height={12000} fill={C.hall[1]} />
      <rect x={-6000} y={-6000} width={12000} height={6000 + project(0, 0, WALL_H)[1]} fill={C.ceiling} />
      {tiles}
      {/* 매장 앞 금색 단 테두리 */}
      <polygon points={fQuad(-0.05, rows, cols + 0.05, rows + 0.12)} fill={C.gold} opacity={0.8} />
      {/* 왼쪽: 길에서 들어오는 분홍 카펫 */}
      <polygon points={fQuad(x0, door[0] + 0.15, 0, door[1] - 0.15, 0.5)} fill="#f3c6cf" stroke={OUTLINE} strokeWidth={0.6} />
      <polygon points={fQuad(x0, door[0] + 0.3, 0, door[0] + 0.38, 0.6)} fill={C.gold} opacity={0.7} />
      <polygon points={fQuad(x0, door[1] - 0.38, 0, door[1] - 0.3, 0.6)} fill={C.gold} opacity={0.7} />
      {/* 오른쪽: 단상 */}
      <Stage3D x={cols + 0.8} y={1} w={3.6} h={4.4} />
    </g>
  );
}

/** 오른쪽 홀의 낮은 단상 + 금색 난간 */
function Stage3D({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const { project } = useCamera();
  const z = 12;
  const front = poly(project(x, y + h, 0), project(x + w, y + h, 0), project(x + w, y + h, z), project(x, y + h, z));
  const side = poly(project(x, y, 0), project(x, y + h, 0), project(x, y + h, z), project(x, y, z));
  const top = poly(project(x, y, z), project(x + w, y, z), project(x + w, y + h, z), project(x, y + h, z));
  const posts = Array.from({ length: Math.round(w) + 1 }, (_, i) => x + (i * w) / Math.round(w));
  return (
    <g>
      <polygon points={side} fill="#c9b6e4" stroke={OUTLINE} />
      <polygon points={front} fill="#d6c8ee" stroke={OUTLINE} />
      <polygon points={top} fill="#e9e1f6" stroke={OUTLINE} />
      {/* 단상 위 러그 */}
      <polygon points={poly(project(x + 0.5, y + 0.6, z + 1), project(x + w - 0.5, y + 0.6, z + 1), project(x + w - 0.5, y + h - 0.6, z + 1), project(x + 0.5, y + h - 0.6, z + 1))} fill="#f8e1e6" stroke="#ecb3c0" strokeWidth={1.5} />
      {/* 앞쪽 금색 난간 */}
      <polyline points={poly(...posts.map((px) => project(px, y + h, z + 34)))} fill="none" stroke={C.gold} strokeWidth={3} strokeLinecap="round" />
      {posts.map((px) => (
        <polyline key={px} points={poly(project(px, y + h, z), project(px, y + h, z + 36))} stroke={C.gold} strokeWidth={3} strokeLinecap="round" />
      ))}
    </g>
  );
}

/** 벽등 */
function Sconce({ at: [x, y], k }: { at: [number, number]; k: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <ellipse cx={0} cy={4} rx={16} ry={20} fill="#fbedb8" opacity={0.35} />
      <rect x={-2} y={0} width={4} height={14} rx={2} fill="#e2bf5a" />
      <path d="M -9 -2 L 9 -2 L 6 -14 L -6 -14 Z" fill="#fff4cc" stroke="rgba(78,51,36,0.45)" strokeWidth={1} />
    </g>
  );
}

/** 뒷벽 위쪽에 늘어진 전구 줄 */
function StringLights({ x0, x1 }: { x0: number; x1: number }) {
  const { project } = useCamera();
  const segs = 4;
  const per = 6;
  const pts: [number, number][] = [];
  for (let s = 0; s < segs; s++) {
    for (let i = 0; i <= per; i++) {
      const t = i / per;
      const gx = x0 + ((s + t) * (x1 - x0)) / segs;
      const z = 182 - Math.sin(t * Math.PI) * 14;
      pts.push(project(gx, 0, z));
    }
  }
  return (
    <g>
      <polyline points={poly(...pts)} fill="none" stroke="#a9774f" strokeWidth={1.2} />
      {pts.map(([x, y], i) =>
        i % per === 0 ? null : (
          <g key={i} className="animate-pulse" style={{ animationDelay: `${(i % 5) * 0.3}s` }}>
            <circle cx={x} cy={y + 4} r={5.5} fill={BULBS[i % BULBS.length]} opacity={0.35} />
            <circle cx={x} cy={y + 4} r={3} fill={BULBS[i % BULBS.length]} stroke="rgba(78,51,36,0.4)" strokeWidth={0.6} />
          </g>
        ),
      )}
    </g>
  );
}

/** 매장 양옆의 낮은 칸막이 — 가운데가 들여다보이도록 낮게 */
function Partition({ x, rows, gap }: { x: number; rows: number; gap?: [number, number] }) {
  const { project, scaleAt } = useCamera();
  const spans: [number, number][] = gap ? [[0, gap[0]], [gap[1], rows]] : [[0, rows]];
  const out = x === 0 ? -THICK : THICK;
  const quad = (xx: number, y0: number, y1: number, z0: number, z1: number) =>
    poly(project(xx, y0, z0), project(xx, y1, z0), project(xx, y1, z1), project(xx, y0, z1));
  return (
    <g>
      {spans.map(([y0, y1]) => (
        <g key={y0}>
          <polygon points={quad(x, y0, y1, 0, RAIL_H)} fill={C.rail} stroke={OUTLINE} strokeWidth={1} />
          <polygon points={quad(x, y0, y1, RAIL_H - 14, RAIL_H - 10)} fill={C.trim} opacity={0.8} />
          {/* 윗단 */}
          <polygon points={poly(project(x, y0, RAIL_H), project(x, y1, RAIL_H), project(x + out, y1, RAIL_H), project(x + out, y0, RAIL_H))} fill={C.trim} stroke={OUTLINE} strokeWidth={0.8} />
          {/* 앞쪽 끝면 */}
          <polygon points={poly(project(x, y1, 0), project(x + out, y1, 0), project(x + out, y1, RAIL_H), project(x, y1, RAIL_H))} fill={C.railSide} stroke={OUTLINE} strokeWidth={0.8} />
          {/* 금색 기둥 장식 */}
          {Array.from({ length: Math.floor(y1 - y0) + 1 }, (_, i) => y0 + i)
            .filter((y) => y <= y1)
            .map((y) => {
              const [px, py] = project(x + out / 2, y, RAIL_H + 6);
              return <circle key={y} cx={px} cy={py} r={3.4 * scaleAt(x, y)} fill={C.gold} stroke={OUTLINE} strokeWidth={0.6} />;
            })}
        </g>
      ))}
    </g>
  );
}

/** 왼쪽 출입구 위 꽃 아치 */
function EntranceArch({ rows }: { rows: number }) {
  const { project } = useCamera();
  const [y0, y1] = doorOf(rows);
  const post = (y: number) => poly(project(-0.12, y, 0), project(0.04, y, 0), project(0.04, y, 128), project(-0.12, y, 128));
  const arch: [number, number][] = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return project(-0.04, y0 + (y1 - y0) * t, 128 + Math.sin(t * Math.PI) * 26);
  });
  return (
    <g>
      <polygon points={post(y0)} fill={C.gold} stroke={OUTLINE} strokeWidth={0.8} />
      <polygon points={post(y1)} fill={C.gold} stroke={OUTLINE} strokeWidth={0.8} />
      <polyline points={poly(...arch)} fill="none" stroke={C.gold} strokeWidth={4} strokeLinecap="round" />
      {arch.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4.5} fill={['#f3c6cf', '#cfe7d3', '#f7e6a6'][i % 3]} stroke={OUTLINE} strokeWidth={0.5} />
      ))}
    </g>
  );
}

/** 출입구 앞 발매트 + 바닥 광택 (바닥 타일 위에 그림) */
export function FloorDecor({ cols, rows }: { cols: number; rows: number }) {
  const { project } = useCamera();
  const door = doorOf(rows);
  const sx = cols / 10;
  const sy = rows / 10;
  const streak = (x: number, y: number, len: number) =>
    poly(project(x, y, 0), project(x + 0.35, y, 0), project(x + 0.35 + len, y + len, 0), project(x + len, y + len, 0));
  return (
    <g aria-hidden className="pointer-events-none">
      <polygon
        points={poly(project(0.08, door[0] + 0.1, 0), project(0.9, door[0] + 0.1, 0), project(0.9, door[1] - 0.1, 0), project(0.08, door[1] - 0.1, 0))}
        fill="#f3c6cf"
        stroke={OUTLINE}
        strokeWidth={0.8}
      />
      {/* 반짝이는 바닥 — 대각선 빛줄기 */}
      {[
        [1.5, 1.2, 2.2],
        [4.2, 2.6, 3],
        [6.8, 1.4, 1.8],
        [2.6, 6.2, 2.4],
        [6.8, 5.6, 2.6],
      ].map(([x, y, len], i) => (
        <polygon key={i} points={streak(x * sx, y * sy, len * Math.min(sx, sy))} fill="#ffffff" opacity={0.28} />
      ))}
    </g>
  );
}
