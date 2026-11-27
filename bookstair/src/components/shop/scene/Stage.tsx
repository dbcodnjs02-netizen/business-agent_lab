import { memo, useRef } from 'react';
import type { MouseEvent, PointerEvent, ReactNode, RefObject } from 'react';
import { FloorDecor, Room } from './Room';
import { CameraProvider, cameraFor, useCamera } from './view';

interface StageProps {
  cols: number;
  rows: number;
  label: string;
  /** 뒷벽 간판에 쓸 서점 이름 */
  sign: string;
  svgRef?: RefObject<SVGSVGElement>;
  /** 인테리어 모드 격자선 */
  showGrid?: boolean;
  /** 화면을 꽉 채울 때 (가로세로 비율 유지, 가운데 정렬) */
  fill?: boolean;
  onPointerMove?: (e: PointerEvent<SVGSVGElement>) => void;
  onPointerLeave?: () => void;
  /** 바닥을 눌렀을 때 — 그 칸 좌표 */
  onTileClick?: (x: number, y: number) => void;
  /** 바닥 바로 위(가구 아래)에 그릴 것 */
  floorOverlay?: ReactNode;
  children: ReactNode;
}

/** 매장 무대: 방 · 바닥 타일 + 그 위의 내용 */
export function Stage({
  cols,
  rows,
  label,
  sign,
  svgRef,
  showGrid,
  fill,
  onPointerMove,
  onPointerLeave,
  onTileClick,
  floorOverlay,
  children,
}: StageProps) {
  const ownRef = useRef<SVGSVGElement>(null);
  const ref = svgRef ?? ownRef;
  const cam = cameraFor(cols, rows);

  const onClick = (e: MouseEvent<SVGSVGElement>) => {
    const ctm = ref.current?.getScreenCTM();
    if (!onTileClick || !ctm) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const { gx, gy } = cam.toGrid(p.x, p.y);
    if (gx >= 0 && gy >= 0 && gx < cols && gy < rows) onTileClick(Math.floor(gx), Math.floor(gy));
  };

  const view = fill ? cam.fillView : cam.view;
  return (
    <svg
      ref={ref}
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid meet"
      // 전체화면에선 viewBox 밖(넓게 이어 그린 벽·바닥)도 보여 화면을 꽉 채운다
      overflow={fill ? 'visible' : undefined}
      className={`block touch-none select-none ${fill ? 'size-full' : 'h-auto w-full'}`}
      role="img"
      aria-label={label}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onClick={onClick}
    >
      <CameraProvider value={cam}>
        <Backdrop cols={cols} rows={rows} sign={sign} showGrid={Boolean(showGrid)} wide={Boolean(fill)} />
        {floorOverlay}
        {children}
      </CameraProvider>
    </svg>
  );
}

/** 매 프레임 다시 그리지 않도록 방·바닥은 따로 memo */
const Backdrop = memo(function Backdrop({
  cols,
  rows,
  sign,
  showGrid,
  wide,
}: {
  cols: number;
  rows: number;
  sign: string;
  showGrid: boolean;
  wide: boolean;
}) {
  const { floorQuad } = useCamera();
  return (
    <>
      <Room cols={cols} rows={rows} sign={sign} wide={wide} />
      <g>
        {Array.from({ length: cols * rows }, (_, i) => {
          const x = i % cols;
          const y = Math.floor(i / cols);
          return (
            <polygon
              key={i}
              points={floorQuad({ x, y, w: 1, h: 1 })}
              fill={(x + y) % 2 ? '#f5e0e3' : '#fbf3e4'}
              stroke={showGrid ? 'rgba(122, 81, 54, 0.35)' : 'rgba(122, 81, 54, 0.08)'}
              strokeWidth={1}
            />
          );
        })}
      </g>
      <FloorDecor cols={cols} rows={rows} />
    </>
  );
});
