import { DRINKS } from '../../../data/drinks';
import type { Rect } from '../../../systems/interior/grid';
import type { Stations } from '../../../systems/play/interact';
import { useCamera } from './view';

interface StationMeterProps {
  r: Rect;
  /** 가구 높이(px) — 그 위에 띄운다 */
  height: number;
  station: Stations[string];
}

/** 커피머신 위: 내리는 중이면 진행 막대, 다 됐으면 음료 아이콘이 통통 */
export function StationMeter({ r, height, station }: StationMeterProps) {
  const { project } = useCamera();
  const [x, y] = project(r.x + r.w / 2, r.y + r.h / 2, height + 18);
  const drink = DRINKS[station.drink];
  const ready = station.left <= 0;
  return (
    <g transform={`translate(${x} ${y})`} className="pointer-events-none">
      <g className={ready ? 'animate-pop' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <circle r={13} fill={ready ? '#fbedb8' : 'rgba(255, 250, 241, 0.95)'} stroke={ready ? '#d9b443' : 'rgba(122, 81, 54, 0.35)'} strokeWidth={ready ? 2 : 1} />
        <text y={5} textAnchor="middle" fontSize={14}>
          {drink.emoji}
        </text>
      </g>
      {!ready && (
        <g transform="translate(0 20)">
          <rect x={-18} y={-3} width={36} height={6} rx={3} fill="rgba(255, 250, 241, 0.95)" stroke="rgba(122, 81, 54, 0.35)" strokeWidth={0.8} />
          <rect x={-17} y={-2} width={34 * Math.max(0, Math.min(1, 1 - station.left / station.total))} height={4} rx={2} fill="#7fb08a" />
        </g>
      )}
      {ready && (
        <text y={-18} textAnchor="middle" fontSize={10} fontWeight={700} fill="#7a5136" stroke="#fffaf1" strokeWidth={3} paintOrder="stroke">
          완성!
        </text>
      )}
    </g>
  );
}
