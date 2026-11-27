import type { Rect } from '../../../systems/interior/grid';
import { OUTLINE, poly, useCamera, type Shades } from './view';

interface BlockProps {
  r: Rect;
  z0?: number;
  z1: number;
  colors: Shades;
}

/** 카메라에 보이는 면(윗면, 앞면, 카메라 쪽 옆면)만 그린 상자 */
export function Block({ r, z0 = 0, z1, colors }: BlockProps) {
  const { project, floorQuad, centerX } = useCamera();
  const { x, y, w, h } = r;
  // 카메라보다 왼쪽에 있으면 오른쪽 옆면이, 오른쪽에 있으면 왼쪽 옆면이 보인다
  const sideX = x + w <= centerX ? x + w : x >= centerX ? x : null;
  return (
    <g stroke={OUTLINE} strokeWidth={1} strokeLinejoin="round">
      {sideX !== null && (
        <polygon
          points={poly(project(sideX, y, z0), project(sideX, y + h, z0), project(sideX, y + h, z1), project(sideX, y, z1))}
          fill={colors[2]}
        />
      )}
      <polygon points={poly(project(x, y + h, z0), project(x + w, y + h, z0), project(x + w, y + h, z1), project(x, y + h, z1))} fill={colors[1]} />
      <polygon points={floorQuad(r, z1)} fill={colors[0]} />
    </g>
  );
}
