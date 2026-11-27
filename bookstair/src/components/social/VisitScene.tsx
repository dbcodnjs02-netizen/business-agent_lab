import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../../api/bookstairApi';
import { FURNITURE, INTERIOR } from '../../data/furniture';
import { facingFrom } from '../../systems/characters/look';
import { memoBoardSpot, type Tile } from '../../systems/interior/connections';
import { buildOccupancy, rectOf } from '../../systems/interior/grid';
import type { RecruitOutcome } from '../../systems/social/social';
import { useGameStore } from '../../store/useGameStore';
import type { IsoFacing } from '../../types/character';
import type { Reader, StoreSnapshot } from '../../types/social';
import { CharacterPortrait } from '../characters/CharacterPortrait';
import { Actor } from '../shop/scene/Actor';
import { FurnitureSprite } from '../shop/scene/FurnitureSprite';
import { Stage } from '../shop/scene/Stage';
import { MemoBoard } from '../shop/scene/MemoBoard';
import { BOOK_COLORS, cameraFor } from '../shop/scene/view';
import { Button } from '../ui/Button';
import { HeartMeter } from '../ui/HeartMeter';

const { cols, rows } = INTERIOR.grid;
const { depthAt, depthOf } = cameraFor(cols, rows);
const WANDER_EVERY_MS = 3500;
const WALK_SECONDS = 3;

interface Wander {
  tile: Tile;
  facing: IsoFacing;
  walking: boolean;
}

const OUTCOME_TEXT: Record<RecruitOutcome, (name: string) => string> = {
  joined: (n) => `${n}님이 내 서점에 오기로 했어요! 이제 손님으로 찾아와요.`,
  affinity_up: (n) => `${n}님과 조금 더 친해졌어요 ♥`,
  maxed: (n) => `${n}님과는 이미 최고로 친해요.`,
};

/** 다른 사람의 서점 구경 — 배회하는 독서가 영입, 방명록 */
export function VisitScene({ store }: { store: StoreSnapshot }) {
  const recruited = useGameStore((s) => s.recruited);
  const recruit = useGameStore((s) => s.recruit);
  const openGuestbook = useGameStore((s) => s.openGuestbook);
  const guestbookFor = useGameStore((s) => s.guestbookFor);

  const freeTiles = useMemo(() => {
    const occupied = buildOccupancy(store.layout, INTERIOR);
    return occupied.flatMap((uid, i) => (uid === null ? [{ x: i % cols, y: Math.floor(i / cols) }] : []));
  }, [store.layout]);

  const [spots, setSpots] = useState<Record<string, Wander>>(() =>
    Object.fromEntries(
      store.readers.map((r, i) => [r.id, { tile: freeTiles[(i * 37 + 11) % freeTiles.length], facing: 'frontLeft', walking: false }]),
    ),
  );
  const [selected, setSelected] = useState<Reader | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [noteCount, setNoteCount] = useState(0);

  // 독서가들이 근처 빈 칸으로 천천히 걸어가서, 서서 책을 읽는다
  useEffect(() => {
    if (freeTiles.length === 0) return;
    let stop: number | undefined;
    const id = window.setInterval(() => {
      setSpots((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([readerId, w]) => {
            const near = freeTiles.filter((f) => Math.abs(f.x - w.tile.x) + Math.abs(f.y - w.tile.y) <= 2);
            const next = near[Math.floor(Math.random() * near.length)] ?? w.tile;
            const moved = next.x !== w.tile.x || next.y !== w.tile.y;
            return [readerId, { tile: next, facing: facingFrom(next.x - w.tile.x, next.y - w.tile.y, w.facing), walking: moved }];
          }),
        ),
      );
      stop = window.setTimeout(
        () => setSpots((prev) => Object.fromEntries(Object.entries(prev).map(([k, w]) => [k, { ...w, walking: false }]))),
        WALK_SECONDS * 1000,
      );
    }, WANDER_EVERY_MS);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(stop);
    };
  }, [freeTiles]);

  useEffect(() => {
    if (guestbookFor) return;
    let alive = true;
    api.listGuestbook(store.storeId).then((notes) => alive && setNoteCount(notes.length));
    return () => {
      alive = false;
    };
  }, [store.storeId, guestbookFor]);

  const drawables: { depth: number; node: ReactNode }[] = store.layout.flatMap((p) => {
    const def = FURNITURE[p.furnitureId];
    const r = rectOf(p, INTERIOR.catalog);
    return def && r
      ? [{ depth: depthOf(r), node: <g key={p.uid} className="pointer-events-none"><FurnitureSprite def={def} x={p.x} y={p.y} rotation={p.rotation} /></g> }]
      : [];
  });

  const memoSpot = memoBoardSpot(store.layout, INTERIOR);
  if (memoSpot) {
    drawables.push({
      depth: depthAt(memoSpot.x + 0.5, memoSpot.y + 0.5),
      node: <MemoBoard key="memo" tile={memoSpot} count={noteCount} onOpen={() => openGuestbook(store.storeId)} />,
    });
  }

  store.readers.forEach((r, i) => {
    const w = spots[r.id];
    if (!w) return;
    const picked = selected?.id === r.id;
    drawables.push({
      depth: depthAt(w.tile.x + 0.5, w.tile.y + 0.5),
      node: (
        <Actor
          key={r.id}
          x={w.tile.x + 0.5}
          y={w.tile.y + 0.5}
          look={r.look}
          facing={picked && !w.walking ? 'frontLeft' : w.facing}
          pose={w.walking ? 'walk' : 'stand'}
          action={w.walking || picked ? 'none' : 'read'}
          expression={picked ? 'happy' : w.walking ? 'neutral' : 'focus'}
          bookColor={BOOK_COLORS[(i + 2) % BOOK_COLORS.length]}
          name={r.name}
          say={picked && !w.walking ? r.intro : undefined}
          label={`독서가 ${r.name}`}
          glide={WALK_SECONDS}
          phase={i * 1.1}
          onClick={() => {
            setSelected(r);
            setMessage(null);
          }}
        />
      ),
    });
  });
  drawables.sort((a, b) => a.depth - b.depth);

  const mine = selected && recruited.find((r) => r.id === selected.id);

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <Stage cols={cols} rows={rows} label={`${store.storeName} 구경`} sign={store.storeName}>
        {drawables.map((d) => d.node)}
      </Stage>

      {store.readers.length === 0 && (
        <p className="glass absolute top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-sm">
          지금은 배회하는 독서가가 없어요.
        </p>
      )}

      {selected && (
        <div className="glass-strong absolute inset-x-3 bottom-3 flex animate-rise flex-wrap items-center gap-3 rounded-2xl p-3.5 sm:inset-x-auto sm:right-3 sm:w-80">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-lavender">
            <CharacterPortrait look={selected.look} expression="happy" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">
              {selected.name} <span className="text-xs font-normal text-ink-soft">독서가</span>
            </p>
            <p className="text-xs text-ink-soft">
              #{selected.favoriteGenre} 좋아함 · 씀씀이 🪙+{selected.generosity}
            </p>
            {mine && <HeartMeter value={mine.affinity} max={5} />}
          </div>
          <button type="button" className="text-ink-faint" aria-label="닫기" onClick={() => setSelected(null)}>
            ✕
          </button>
          {selected.intro && <p className="w-full font-book text-sm text-ink-soft">“{selected.intro}”</p>}
          {message ? (
            <p className="w-full rounded-xl bg-mint/70 px-3 py-2 text-sm">{message}</p>
          ) : (
            <Button className="w-full" onClick={() => setMessage(OUTCOME_TEXT[recruit(selected, store.storeId)](selected.name))}>
              🏠 내 서점으로 초대하기
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
