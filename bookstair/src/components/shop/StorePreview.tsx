import type { ReactNode } from 'react';
import { FURNITURE } from '../../data/furniture';
import { GUESTS } from '../../data/guests';
import { facingOfSeat } from '../../systems/characters/look';
import { seatVisitors } from '../../systems/interior/connections';
import { facingOf, rectOf } from '../../systems/interior/grid';
import { roomOf, useGameStore } from '../../store/useGameStore';
import { useLayoutAnalysis } from '../../store/useLayoutAnalysis';
import { Actor } from './scene/Actor';
import { FurnitureSprite } from './scene/FurnitureSprite';
import { Stage } from './scene/Stage';
import { cameraFor } from './scene/view';

/** 메뉴 화면의 매장 미리보기 — 가구와 앉아 있는 단골만 (움직이지 않음) */
export function StorePreview() {
  const layout = useGameStore((s) => s.layout);
  const storeName = useGameStore((s) => s.profile.storeName);
  const guestsInCafe = useGameStore((s) => s.guestsInCafe);
  const analysis = useLayoutAnalysis();
  const { cols, rows } = useGameStore((s) => roomOf(s.level)).grid;
  const { depthOf } = cameraFor(cols, rows);

  const drawables: { depth: number; node: ReactNode }[] = layout.flatMap((p) => {
    const def = FURNITURE[p.furnitureId];
    const r = rectOf(p, FURNITURE);
    return def && r ? [{ depth: depthOf(r), node: <FurnitureSprite key={p.uid} def={def} x={p.x} y={p.y} rotation={p.rotation} /> }] : [];
  });
  for (const { guestId, slot } of seatVisitors(guestsInCafe, analysis.seatSlots)) {
    const seat = layout.find((p) => p.uid === slot.seatUid)!;
    drawables.push({
      depth: depthOf(rectOf(seat, FURNITURE)!) + 0.01,
      node: (
        <Actor
          key={guestId}
          x={slot.x + 0.5}
          y={slot.y + 0.5}
          z={16}
          look={GUESTS[guestId].look}
          pose="sit"
          facing={facingOfSeat(facingOf(seat.rotation))}
          action={GUESTS[guestId].idleAction}
          expression="happy"
        />
      ),
    });
  }
  drawables.sort((a, b) => a.depth - b.depth);

  return (
    <div className="overflow-hidden rounded-2xl bg-[radial-gradient(ellipse_at_center,#9a6b47_0%,#6b4630_70%)]">
      <Stage cols={cols} rows={rows} label="내 서점 미리보기" sign={storeName}>
        <g className="pointer-events-none">{drawables.map((d) => d.node)}</g>
      </Stage>
    </div>
  );
}
