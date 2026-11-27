import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { api } from '../../api/bookstairApi';
import { DRINKS } from '../../data/drinks';
import { FURNITURE } from '../../data/furniture';
import { STAFF_BY_ID } from '../../data/staff';
import { CURATION_EVENTS, GUESTS } from '../../data/guests';
import { facingFrom, facingOfSeat } from '../../systems/characters/look';
import { chatterFor, nextCurationEvent } from '../../systems/guests/friendship';
import { memoBoardSpot, seatVisitors, type Tile } from '../../systems/interior/connections';
import {
  checkPlacement,
  clearanceOf,
  facingOf,
  footprint,
  frontStrip,
  rectOf,
  rotationAfter,
  type PlacementCandidate,
  type Rect,
} from '../../systems/interior/grid';
import { isWaiting, type Customer } from '../../systems/sim/sim';
import { SEARCH_SECONDS } from '../../systems/play/player';
import { itemIcon, roomOf, useGameStore } from '../../store/useGameStore';
import { OWNER_LOOK } from '../../data/customers';
import { useLayoutAnalysis } from '../../store/useLayoutAnalysis';
import type { ChatterLine, IsoFacing } from '../../types/character';
import type { GuestId } from '../../types/guest';
import type { Facing, PlacedFurniture } from '../../types/interior';
import { InteriorPanel } from './InteriorPanel';
import { Actor } from './scene/Actor';
import { FurnitureSprite, spriteHeight } from './scene/FurnitureSprite';
import { Stage } from './scene/Stage';
import { MemoBoard } from './scene/MemoBoard';
import { StationMeter } from './scene/StationMeter';
import { BOOK_COLORS, cameraFor, poly, useCamera } from './scene/view';
import type { Selection } from './selection';

const SEAT_Z = 16;

const DIR: Record<Facing, [number, number]> = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };

const CHATTER_EVERY_MS = 6500;
const CHATTER_SHOW_MS = 3800;

/** 걷는 중이 아니면 손님이 하는 일 */
const PHASE_POSE: Partial<Record<Customer['phase'], Pick<ActorPose, 'pose' | 'action' | 'expression'>>> = {
  browsing: { pose: 'stand', action: 'browse', expression: 'neutral' },
  waitBook: { pose: 'stand', action: 'none', expression: 'neutral' },
  waitDrink: { pose: 'sit', action: 'read', expression: 'neutral' },
  reading: { pose: 'sit', action: 'read', expression: 'focus' },
  drinking: { pose: 'sit', action: 'drink', expression: 'happy' },
  paying: { pose: 'stand', action: 'pay', expression: 'happy' },
};

type ActorPose = Required<Pick<Parameters<typeof Actor>[0], 'pose' | 'action' | 'expression' | 'facing'>>;

/** 책장·카운터는 벽에 붙어 있으니, 가까운 벽 쪽을 본다 */
const faceNearWall = (p: { x: number; y: number }): IsoFacing => (p.y <= p.x ? 'backRight' : 'backLeft');

function customerPose(c: Customer, seatFacing: (uid: string) => IsoFacing): ActorPose {
  if (c.target) {
    return {
      pose: 'walk',
      action: 'none',
      expression: c.mood === 'sad' ? 'sad' : c.mood === 'happy' ? 'happy' : 'neutral',
      facing: facingFrom(c.target.x - c.pos.x, c.target.y - c.pos.y),
    };
  }
  const base = PHASE_POSE[c.phase] ?? { pose: 'stand', action: 'none', expression: 'neutral' };
  // 기다리다 지쳐 가면 표정이 어두워진다
  const expression = isWaiting(c) && c.patience < c.patienceMax * 0.35 ? 'sad' : base.expression;
  // 책 추천을 기다릴 땐 사장님 쪽(화면 앞)을 본다
  const facing = base.pose === 'sit' && c.seat ? seatFacing(c.seat.seatUid) : c.phase === 'waitBook' ? 'frontLeft' : faceNearWall(c.pos);
  return { ...base, expression, facing } as ActorPose;
}

/** 앉아 있는 단골 중 한 명이 가끔 혼잣말을 한다 */
function useChatter(seated: GuestId[], active: boolean) {
  const [chat, setChat] = useState<{ guestId: GuestId; line: ChatterLine } | null>(null);
  const key = seated.join(',');
  useEffect(() => {
    setChat(null);
    if (!active || seated.length === 0) return;
    let hide: number | undefined;
    const id = window.setInterval(() => {
      const guestId = seated[Math.floor(Math.random() * seated.length)];
      const level = useGameStore.getState().guestProgress[guestId]?.friendshipLevel ?? 0;
      const lines = chatterFor(GUESTS[guestId], level);
      if (lines.length === 0) return;
      setChat({ guestId, line: lines[Math.floor(Math.random() * lines.length)] });
      window.clearTimeout(hide);
      hide = window.setTimeout(() => setChat(null), CHATTER_SHOW_MS);
    }, CHATTER_EVERY_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(hide);
    };
  }, [key, active]); // seated 배열은 매 렌더 새로 만들어지므로 key 로 비교
  return chat;
}

interface DragState {
  /** 집은 지점과 가구 좌상단 사이 거리 (그리드 단위) */
  grabDx: number;
  grabDy: number;
  startX: number;
  startY: number;
  moved: boolean;
}

interface ShopSceneProps {
  /** 전체화면 영업 화면 — 무대가 부모를 꽉 채우고, 인테리어 패널은 오른쪽에 떠 있다 */
  fill?: boolean;
}

/** 내 서점: 영업 화면 + 인테리어 편집 */
export function ShopScene({ fill }: ShopSceneProps) {
  const layout = useGameStore((s) => s.layout);
  const guestsInCafe = useGameStore((s) => s.guestsInCafe);
  const guestProgress = useGameStore((s) => s.guestProgress);
  const talkingTo = useGameStore((s) => s.talkingTo);
  const editing = useGameStore((s) => s.activeTab === 'interior');
  const customers = useGameStore((s) => s.sim.customers);
  const popups = useGameStore((s) => s.sim.popups);
  const storeId = useGameStore((s) => s.profile.storeId);
  const storeName = useGameStore((s) => s.profile.storeName);
  const guestbookFor = useGameStore((s) => s.guestbookFor);
  const openConversation = useGameStore((s) => s.openConversation);
  const openGuestbook = useGameStore((s) => s.openGuestbook);
  const moveFurniture = useGameStore((s) => s.moveFurniture);
  const placeFromInventory = useGameStore((s) => s.placeFromInventory);
  const rotateFurniture = useGameStore((s) => s.rotateFurniture);
  const storeFurniture = useGameStore((s) => s.storeFurniture);
  const player = useGameStore((s) => s.player);
  const stations = useGameStore((s) => s.stations);
  const ownerName = useGameStore((s) => s.profile.ownerName);
  const walkTo = useGameStore((s) => s.walkTo);
  const playing = useGameStore((s) => s.screen === 'play');
  const tutorial = useGameStore((s) => s.tutorial);
  const workers = useGameStore((s) => s.workers);
  const room = useGameStore((s) => roomOf(s.level));
  const { cols, rows } = room.grid;
  const { project, floorQuad, depthAt, depthOf, toGrid } = cameraFor(cols, rows);
  const analysis = useLayoutAnalysis();

  const svgRef = useRef<SVGSVGElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [anchor, setAnchor] = useState<Tile | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [menu, setMenu] = useState<{ uid: string; left: number; top: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noteCount, setNoteCount] = useState(0);

  useEffect(() => {
    if (!editing) {
      setSelection(null);
      setMenu(null);
      setNotice(null);
    }
  }, [editing]);

  useEffect(() => {
    if (guestbookFor) return;
    let alive = true;
    api.listGuestbook(storeId).then((notes) => alive && setNoteCount(notes.length));
    return () => {
      alive = false;
    };
  }, [storeId, guestbookFor]);

  const regulars = editing ? [] : seatVisitors(guestsInCafe, analysis.seatSlots);
  // 혼잣말은 단골만 (처음 온 손님은 아직 낯가림)
  const chat = useChatter(
    regulars.map((r) => r.guestId).filter((id) => guestProgress[id]?.isRegular),
    !editing && !talkingTo,
  );

  const held = selection?.kind === 'placed' ? layout.find((p) => p.uid === selection.uid) : undefined;

  /** 화면 좌표 → 연속 그리드 좌표 */
  const gridAt = (clientX: number, clientY: number) => {
    const ctm = svgRef.current?.getScreenCTM();
    if (!ctm) return null;
    const p = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return toGrid(p.x, p.y);
  };

  /** 포인터 위치에서 가구 좌상단이 놓일 칸 (격자 스냅) */
  const anchorAt = (clientX: number, clientY: number, d: DragState | null): Tile | null => {
    const g = gridAt(clientX, clientY);
    if (!g || g.gx < 0 || g.gy < 0 || g.gx >= cols || g.gy >= rows) return null;
    return d ? { x: Math.round(g.gx - d.grabDx), y: Math.round(g.gy - d.grabDy) } : { x: Math.floor(g.gx), y: Math.floor(g.gy) };
  };

  const commit = (sel: Selection, at: Tile) => {
    if (!sel) return;
    const result =
      sel.kind === 'placed'
        ? moveFurniture(sel.uid, at.x, at.y)
        : placeFromInventory(sel.furnitureId, at.x, at.y, sel.rotation);
    if (result.ok) {
      setSelection(null);
      setNotice(null);
    } else {
      setNotice(result.message);
    }
  };

  const rotateHeld = () => {
    if (held) {
      const r = rotateFurniture(held.uid);
      setNotice(r.ok ? null : r.message);
    } else if (selection?.kind === 'inventory') {
      setSelection({ ...selection, rotation: rotationAfter(FURNITURE[selection.furnitureId], selection.rotation) });
    }
  };

  // 드래그 중에는 창 전체에서 포인터를 따라간다 (보관함에서 끌어올 때도 동작)
  const live = useRef({ selection, drag });
  live.current = { selection, drag };
  useEffect(() => {
    if (!drag) return;
    const onMove = (e: PointerEvent) => {
      const d = live.current.drag!;
      setAnchor(anchorAt(e.clientX, e.clientY, live.current.selection?.kind === 'placed' ? d : null));
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 5) setDrag({ ...d, moved: true });
    };
    const onUp = (e: PointerEvent) => {
      const { selection: sel, drag: d } = live.current;
      const at = anchorAt(e.clientX, e.clientY, sel?.kind === 'placed' ? d : null);
      if (d?.moved && at) commit(sel, at);
      setDrag(null);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag !== null]); // 드래그 시작·끝에만 다시 연결 (최신 값은 live 에서 읽음)

  // 단축키: R 회전 · Delete 보관 · Esc 취소
  useEffect(() => {
    if (!editing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Escape') {
        setSelection(null);
        setMenu(null);
      } else if (e.key === 'r' || e.key === 'R') {
        rotateHeld();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && held) {
        storeFurniture(held.uid);
        setSelection(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const startDragPlaced = (e: ReactPointerEvent, p: PlacedFurniture) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const g = gridAt(e.clientX, e.clientY);
    if (!g) return;
    setMenu(null);
    setNotice(null);
    setSelection({ kind: 'placed', uid: p.uid });
    setDrag({ grabDx: g.gx - p.x, grabDy: g.gy - p.y, startX: e.clientX, startY: e.clientY, moved: false });
  };

  const startDragInventory = (furnitureId: string, e: ReactPointerEvent) => {
    setMenu(null);
    setNotice(null);
    setSelection({ kind: 'inventory', furnitureId, rotation: 0 });
    setDrag({ grabDx: 0, grabDy: 0, startX: e.clientX, startY: e.clientY, moved: false });
  };

  const openMenu = (e: ReactMouseEvent, uid: string) => {
    e.preventDefault();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;
    setSelection(null);
    setMenu({ uid, left: e.clientX - box.left, top: e.clientY - box.top });
  };

  // ── 미리보기 ──
  const candidate: PlacementCandidate | null =
    anchor && held
      ? { furnitureId: held.furnitureId, x: anchor.x, y: anchor.y, rotation: held.rotation }
      : anchor && selection?.kind === 'inventory'
        ? { ...selection, x: anchor.x, y: anchor.y }
        : null;
  const preview = candidate && {
    candidate,
    def: FURNITURE[candidate.furnitureId],
    ok: checkPlacement(layout, candidate, room, held?.uid).ok,
  };

  // ── 그리기 목록 (앞쪽일수록 나중에) ──
  const rectByUid = new Map(layout.map((p) => [p.uid, rectOf(p, FURNITURE)!]));
  const drawables: { depth: number; node: ReactNode }[] = [];
  const linked = new Set(analysis.seatLinks.flatMap((l) => [l.seatUid, l.deskUid]));
  const warned = new Set(analysis.warnings.flatMap((w) => ('uid' in w ? [w.uid] : [])));

  for (const p of layout) {
    const def = FURNITURE[p.furnitureId];
    const r = rectByUid.get(p.uid);
    if (!def || !r) continue;
    const isHeld = held?.uid === p.uid;
    const pickable = editing && !selection;
    // 영업 중에는 커피머신·책장을 눌러 그쪽으로 걸어가 사용
    const usable = playing && !editing && (def.role.kind === 'brewer' || def.role.kind === 'bookshelf');
    const station = stations[p.uid];
    drawables.push({
      depth: depthOf(r),
      node: (
        <g
          key={p.uid}
          className={`transition-[opacity,transform] duration-150 ${isHeld ? 'opacity-30' : ''} ${
            pickable ? 'cursor-grab hover:-translate-y-1' : usable ? 'cursor-pointer hover:brightness-105' : 'pointer-events-none'
          }`}
          role={editing || usable ? 'button' : undefined}
          aria-label={editing ? `${def.name} (끌어서 이동, 우클릭 메뉴)` : usable ? `${def.name} 사용하기` : undefined}
          onPointerDown={pickable ? (e) => startDragPlaced(e, p) : undefined}
          onContextMenu={editing ? (e) => openMenu(e, p.uid) : undefined}
          onClick={
            usable
              ? (e) => {
                  e.stopPropagation();
                  walkTo({ x: p.x, y: p.y }, { kind: 'furniture', uid: p.uid });
                }
              : undefined
          }
        >
          <FurnitureSprite def={def} x={p.x} y={p.y} rotation={p.rotation} />
          {station && !editing && <StationMeter r={r} height={spriteHeight(def)} station={station} />}
        </g>
      ),
    });
  }

  const memoSpot = memoBoardSpot(layout, room);
  if (memoSpot && !editing) {
    drawables.push({
      depth: depthAt(memoSpot.x + 0.5, memoSpot.y + 0.5),
      node: <MemoBoard key="memo" tile={memoSpot} count={noteCount} onOpen={() => openGuestbook(storeId)} />,
    });
  }

  const seatFacing = (uid: string): IsoFacing => {
    const seat = layout.find((p) => p.uid === uid);
    return seat ? facingOfSeat(facingOf(seat.rotation)) : 'frontLeft';
  };

  /** 이름표가 겹치는 단골끼리는 뒤쪽(같은 줄이면 왼쪽) 사람 이름표를 위로 올린다 */
  const tagLift = (slot: Tile) => {
    const [sx, sy] = project(slot.x + 0.5, slot.y + 0.5);
    const crowded = regulars.some(({ slot: o }) => {
      if (o === slot) return false;
      const [ox, oy] = project(o.x + 0.5, o.y + 0.5);
      return Math.abs(ox - sx) < 90 && Math.abs(oy - sy) < 36 && (oy > sy + 1 || (Math.abs(oy - sy) <= 1 && ox > sx));
    });
    return crowded ? 24 : 0;
  };

  if (!editing) {
    regulars.forEach(({ guestId, slot }, i) => {
      const g = GUESTS[guestId];
      const candidate = !guestProgress[guestId]?.isRegular;
      const worried = !candidate && nextCurationEvent(g, guestProgress[guestId], CURATION_EVENTS) !== null;
      const line = chat?.guestId === guestId ? chat.line : null;
      drawables.push({
        depth: depthOf(rectByUid.get(slot.seatUid)!) + 0.01,
        node: (
          <Actor
            key={guestId}
            x={slot.x + 0.5}
            y={slot.y + 0.5}
            z={SEAT_Z}
            look={g.look}
            pose="sit"
            facing={seatFacing(slot.seatUid)}
            action={g.idleAction}
            expression={line ? (line.emotion ?? 'neutral') : g.idleAction === 'drink' ? 'happy' : 'focus'}
            bookColor={BOOK_COLORS[i % BOOK_COLORS.length]}
            name={candidate ? '새 손님' : g.name}
            bubble={candidate ? '✨' : worried ? '💭' : '💬'}
            thought={worried}
            say={line?.text}
            label={candidate ? '처음 온 손님에게 말 걸기 — 취향에 맞는 책을 추천하면 단골이 돼요' : `${g.name}에게 말 걸기${worried ? ' (고민이 있어 보여요)' : ''}`}
            onClick={() => openConversation(guestId)}
            phase={i * 1.3}
            tagLift={tagLift(slot)}
          />
        ),
      });
    });
    for (const c of customers) {
      const p = customerPose(c, seatFacing);
      const seatRect = p.pose === 'sit' && c.seat ? rectByUid.get(c.seat.seatUid) : undefined;
      const waiting = isWaiting(c) && c.request;
      drawables.push({
        depth: seatRect ? depthOf(seatRect) + 0.01 : depthAt(c.pos.x, c.pos.y),
        node: (
          <Actor
            key={`c${c.id}`}
            x={c.pos.x}
            y={c.pos.y}
            z={seatRect ? SEAT_Z : 0}
            look={c.look}
            {...p}
            bookColor={BOOK_COLORS[c.id % BOOK_COLORS.length]}
            name={c.name}
            bubble={
              waiting
                ? c.request!.kind === 'drink'
                  ? DRINKS[c.request!.drink].emoji
                  : '📕'
                : c.mood === 'sad' && c.target
                  ? '💧'
                  : undefined
            }
            bubbleTag={waiting && c.request!.kind === 'book' ? `#${c.request!.tag}` : undefined}
            meter={waiting ? c.patience / c.patienceMax : undefined}
            label={waiting ? '주문 건네러 가기' : undefined}
            onClick={waiting ? () => walkTo({ x: Math.floor(c.pos.x), y: Math.floor(c.pos.y) }, { kind: 'customer', id: c.id }) : undefined}
            phase={c.id * 0.7}
          />
        ),
      });
    }

    // 알바
    for (const w of workers) {
      const def = STAFF_BY_ID[w.staffId];
      if (!def) continue;
      drawables.push({
        depth: depthAt(w.pos.x, w.pos.y),
        node: (
          <Actor
            key={`w${w.staffId}`}
            x={w.pos.x}
            y={w.pos.y}
            look={def.look}
            facing={w.facing}
            pose={w.walking ? 'walk' : 'stand'}
            action={w.search ? 'browse' : 'none'}
            expression={w.search ? 'focus' : 'happy'}
            name={`알바 ${def.name}`}
            bubble={w.carrying ? itemIcon(w.carrying) : undefined}
            bubbleTag={w.carrying?.kind === 'book' ? `#${w.carrying.tag}` : undefined}
            meter={w.search ? 1 - w.search.left / SEARCH_SECONDS : undefined}
            meterTone="progress"
          />
        ),
      });
    }

    // 사장님
    drawables.push({
      depth: depthAt(player.pos.x, player.pos.y) + 0.001,
      node: (
        <Actor
          key="owner"
          x={player.pos.x}
          y={player.pos.y}
          look={OWNER_LOOK}
          facing={player.facing}
          pose={player.walking ? 'walk' : 'stand'}
          action={player.search ? 'browse' : 'none'}
          expression={player.search ? 'focus' : 'happy'}
          name={ownerName}
          owner
          bubble={player.carrying ? itemIcon(player.carrying) : undefined}
          bubbleTag={player.carrying?.kind === 'book' ? `#${player.carrying.tag}` : undefined}
          meter={player.search ? 1 - player.search.left / SEARCH_SECONDS : undefined}
          meterTone="progress"
        />
      ),
    });
  }

  drawables.sort((a, b) => a.depth - b.depth);

  // ── 바닥 오버레이 (편집 모드) ──
  const floorOverlay = editing && (
    <g className="pointer-events-none">
      {layout.map((p) => {
        const zone = clearanceOf(p, FURNITURE);
        return zone && <polygon key={`z${p.uid}`} points={floorQuad(clip(zone, cols, rows))} fill="rgba(207,231,211,0.45)" stroke="#7fb08a" strokeDasharray="4 3" />;
      })}
      {layout.map((p) => {
        const def = FURNITURE[p.furnitureId];
        const r = rectByUid.get(p.uid);
        return def?.rotatable && r && <FacingArrow key={`a${p.uid}`} r={r} facing={facingOf(p.rotation)} />;
      })}
      {tutorial === 'chairs' && <ChairHints layout={layout} cols={cols} rows={rows} />}
      {preview && <PreviewFloor {...preview} />}
    </g>
  );

  return (
    <div className={fill ? 'relative size-full' : 'flex flex-col gap-3'}>
      <div
        ref={boxRef}
        className={`relative overflow-hidden ${fill ? 'size-full' : 'rounded-2xl'} ${selection ? 'cursor-crosshair' : ''}`}
        onContextMenu={(e) => editing && e.preventDefault()}
      >
        <Stage
          cols={cols}
          rows={rows}
          label="내 서점"
          sign={storeName}
          svgRef={svgRef}
          showGrid={editing}
          floorOverlay={floorOverlay}
          onPointerMove={selection && !drag ? (e) => setAnchor(anchorAt(e.clientX, e.clientY, null)) : undefined}
          onPointerLeave={() => !drag && setAnchor(null)}
          fill={fill}
          onTileClick={
            selection && !drag ? (x, y) => commit(selection, { x, y }) : playing && !editing ? (x, y) => walkTo({ x, y }) : undefined
          }
        >
          {drawables.map((d) => d.node)}

          {preview && (
            <g className="pointer-events-none" opacity={0.75}>
              <FurnitureSprite def={preview.def} x={preview.candidate.x} y={preview.candidate.y} rotation={preview.candidate.rotation ?? 0} />
            </g>
          )}

          {editing &&
            layout.map((p) => {
              const badge = warned.has(p.uid) ? '⚠️' : linked.has(p.uid) ? '🔗' : null;
              const r = rectByUid.get(p.uid);
              if (!badge || !r) return null;
              const [bx, by] = project(r.x + r.w / 2, r.y + r.h / 2, spriteHeight(FURNITURE[p.furnitureId]) + 14);
              return (
                <text key={`b${p.uid}`} x={bx} y={by} textAnchor="middle" fontSize={14} className="pointer-events-none">
                  {badge}
                </text>
              );
            })}

          {popups.map((p) => {
            const [px, py] = project(p.x, p.y, 70);
            return (
              <text
                key={p.id}
                x={px}
                y={py}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fill={p.text.startsWith('+') ? '#a9774f' : p.text.startsWith('📗') ? '#4f7a5a' : '#7d6352'}
                stroke="#fffaf1"
                strokeWidth={3}
                paintOrder="stroke"
                className="pointer-events-none animate-float-up"
              >
                {p.text.startsWith('+') ? `🪙${p.text}` : p.text}
              </text>
            );
          })}
        </Stage>

        {editing && notice && (
          <p className="glass-strong absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm text-wood-900" role="status">
            ⚠ {notice}
          </p>
        )}

        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(null)} onContextMenu={(e) => (e.preventDefault(), setMenu(null))} />
            <div
              className="glass-strong absolute z-20 flex w-36 flex-col overflow-hidden rounded-2xl py-1 text-sm"
              style={{ left: menu.left, top: menu.top }}
              role="menu"
            >
              <MenuItem
                onClick={() => {
                  const r = rotateFurniture(menu.uid);
                  setNotice(r.ok ? null : r.message);
                  setMenu(null);
                }}
              >
                ↻ 회전 <kbd className="ml-auto text-xs text-ink-faint">R</kbd>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setSelection({ kind: 'placed', uid: menu.uid });
                  setMenu(null);
                }}
              >
                ✥ 이동
              </MenuItem>
              <MenuItem
                onClick={() => {
                  storeFurniture(menu.uid);
                  setMenu(null);
                }}
              >
                📦 보관 <kbd className="ml-auto text-xs text-ink-faint">Del</kbd>
              </MenuItem>
            </div>
          </>
        )}
      </div>

      {editing && (
        <div className={fill ? 'absolute top-20 right-4 bottom-4 w-[340px] max-w-[calc(100%-2rem)] overflow-y-auto rounded-3xl' : ''}>
          <InteriorPanel
            selection={selection}
            onSelect={(s) => {
              setSelection(s);
              setNotice(null);
            }}
            onRotate={rotateHeld}
            onStartDrag={startDragInventory}
            notice={notice}
            analysis={analysis}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" role="menuitem" className="flex items-center gap-2 px-3.5 py-2 text-left hover:bg-white/70" onClick={onClick}>
      {children}
    </button>
  );
}

/** 그리드 밖으로 나간 부분 잘라내기 */
function clip(r: Rect, cols: number, rows: number): Rect {
  const x1 = Math.max(0, r.x);
  const y1 = Math.max(0, r.y);
  return { x: x1, y: y1, w: Math.max(0, Math.min(cols, r.x + r.w) - x1), h: Math.max(0, Math.min(rows, r.y + r.h) - y1) };
}

/** 좌석·책상 방향 표시 (바닥 위 작은 삼각형) */
function FacingArrow({ r, facing }: { r: Rect; facing: Facing }) {
  const { project } = useCamera();
  const [dx, dy] = DIR[facing];
  const mx = r.x + r.w / 2 + (dx * r.w) / 2;
  const my = r.y + r.h / 2 + (dy * r.h) / 2;
  const tip = project(mx + dx * 0.32, my + dy * 0.32);
  const b1 = project(mx - dy * 0.18, my + dx * 0.18);
  const b2 = project(mx + dy * 0.18, my - dx * 0.18);
  return <polygon points={poly(tip, b1, b2)} fill="#7a5136" opacity={0.65} />;
}

/** 튜토리얼: 책상 긴 변 바로 옆 빈 칸 — 의자를 놓으면 책상과 이어지는 자리 */
function ChairHints({ layout, cols, rows }: { layout: PlacedFurniture[]; cols: number; rows: number }) {
  const { floorQuad } = useCamera();
  const occupied = new Set(
    layout.flatMap((p) => {
      const r = rectOf(p, FURNITURE);
      if (!r) return [];
      return Array.from({ length: r.w * r.h }, (_, i) => `${r.x + (i % r.w)},${r.y + Math.floor(i / r.w)}`);
    }),
  );
  const tiles = layout.flatMap((p) => {
    if (FURNITURE[p.furnitureId]?.role.kind !== 'desk') return [];
    const r = rectOf(p, FURNITURE)!;
    const along: Tile[] =
      r.w >= r.h
        ? Array.from({ length: r.w }, (_, i) => [{ x: r.x + i, y: r.y - 1 }, { x: r.x + i, y: r.y + r.h }]).flat()
        : Array.from({ length: r.h }, (_, i) => [{ x: r.x - 1, y: r.y + i }, { x: r.x + r.w, y: r.y + i }]).flat();
    return along.filter((t) => t.x >= 0 && t.y >= 0 && t.x < cols && t.y < rows && !occupied.has(`${t.x},${t.y}`));
  });
  return (
    <g className="animate-pulse">
      {tiles.map((t) => (
        <polygon key={`${t.x},${t.y}`} points={floorQuad({ x: t.x + 0.08, y: t.y + 0.08, w: 0.84, h: 0.84 })} fill="rgba(207,231,211,0.6)" stroke="#7fb08a" strokeWidth={2} strokeDasharray="5 3" />
      ))}
    </g>
  );
}

function PreviewFloor({ candidate, def, ok }: { candidate: PlacementCandidate; def: (typeof FURNITURE)[string]; ok: boolean }) {
  const { floorQuad, cols, rows } = useCamera();
  const rotation = candidate.rotation ?? 0;
  const rect = footprint(def, candidate.x, candidate.y, rotation);
  const stroke = ok ? '#7fb08a' : '#d97a8c';
  return (
    <>
      <polygon points={floorQuad(clip(rect, cols, rows))} fill={ok ? 'rgba(207,231,211,0.8)' : 'rgba(243,198,207,0.8)'} stroke={stroke} strokeWidth={2} />
      {def.clearance > 0 && (
        <polygon points={floorQuad(clip(frontStrip(rect, rotation, def.clearance), cols, rows))} fill="none" stroke={stroke} strokeDasharray="4 3" strokeWidth={1.5} />
      )}
    </>
  );
}
