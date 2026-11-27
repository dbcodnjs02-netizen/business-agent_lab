import type { Tile } from '../../../systems/interior/connections';
import { Block } from './Block';
import { OUTLINE, SHADES, useCamera } from './view';

interface MemoBoardProps {
  tile: Tile;
  count: number;
  onOpen: () => void;
}

/** 카운터 옆 방명록 메모판 — 누르면 방명록이 열린다 */
export function MemoBoard({ tile, count, onOpen }: MemoBoardProps) {
  const { project } = useCamera();
  const cx = tile.x + 0.5;
  const cy = tile.y + 0.5;
  const [bx, by] = project(cx, cy, 58);
  const [tx, ty] = project(cx, cy, 92);

  return (
    <g
      className="cursor-pointer outline-none hover:brightness-105"
      role="button"
      tabIndex={0}
      aria-label={`방명록 열기 (메모 ${count}개)`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
    >
      <Block r={{ x: cx - 0.05, y: cy - 0.05, w: 0.1, h: 0.1 }} z1={40} colors={SHADES.wood} />
      <rect x={bx - 20} y={by - 18} width={40} height={36} rx={4} fill="#c0915f" stroke={OUTLINE} />
      <rect x={bx - 16} y={by - 14} width={14} height={12} fill="#fbedb8" transform={`rotate(-6 ${bx - 9} ${by - 8})`} />
      <rect x={bx + 1} y={by - 13} width={14} height={12} fill="#f7d3da" transform={`rotate(5 ${bx + 8} ${by - 7})`} />
      <rect x={bx - 8} y={by + 1} width={15} height={12} fill="#d6eedb" transform={`rotate(-3 ${bx} ${by + 7})`} />
      <g className="animate-bob">
        <rect x={tx - 14} y={ty - 10} width={28} height={18} rx={9} fill="rgba(255, 250, 241, 0.92)" stroke="rgba(122, 81, 54, 0.3)" />
        <text x={tx} y={ty + 3} textAnchor="middle" fontSize={11} fill="#4a3428">
          📝{count}
        </text>
      </g>
    </g>
  );
}
