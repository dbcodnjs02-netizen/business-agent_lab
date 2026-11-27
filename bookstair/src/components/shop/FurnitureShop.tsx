import { useState } from 'react';
import { DRINKS } from '../../data/drinks';
import { FURNITURE } from '../../data/furniture';
import { useGameStore } from '../../store/useGameStore';
import type { FurnitureDef } from '../../types/interior';

/** 가구가 하는 일 한 줄 */
function roleText(def: FurnitureDef): string {
  const r = def.role;
  switch (r.kind) {
    case 'bookshelf':
      return `책 ${r.genres.map((g) => `#${g}`).join(' ')}`;
    case 'seat':
      return `좌석 ${r.seats}개`;
    case 'desk':
      return `의자 ${r.maxLinkedSeats}개까지 연결`;
    case 'brewer':
      return `메뉴 ${r.menu.map((d) => DRINKS[d].emoji).join(' ')}`;
    case 'decor':
      return `아늑함 +${def.cozy}`;
  }
}

/** 상점 — 코인으로 가구를 사서 보관함에 넣는다 */
export function FurnitureShop() {
  const coins = useGameStore((s) => s.coins);
  const inventory = useGameStore((s) => s.inventory);
  const layout = useGameStore((s) => s.layout);
  const buy = useGameStore((s) => s.buyFurniture);
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null);

  return (
    <div className="p-4">
      <p className="mb-3 flex items-center justify-between text-sm">
        <span className="text-ink-soft">산 가구는 보관함에 들어가요. 영업 화면 🔨 인테리어에서 놓으세요.</span>
        <span className="rounded-full bg-butter px-3 py-1 font-bold tabular-nums">🪙 {coins.toLocaleString()}</span>
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.values(FURNITURE).map((def) => {
          const owned = (inventory[def.id] ?? 0) + layout.filter((p) => p.furnitureId === def.id).length;
          const short = coins < def.price;
          return (
            <li key={def.id} className="flex flex-col rounded-2xl bg-white/60 p-3">
              <span className="text-3xl">{def.emoji}</span>
              <p className="mt-1 text-sm leading-snug font-bold">{def.name}</p>
              <p className="text-xs text-ink-soft">{roleText(def)}</p>
              <p className="text-[11px] text-ink-faint">
                {def.w}×{def.h} · {def.placement === 'wall' ? '벽에 붙이기' : '바닥'} · 가진 것 {owned}
              </p>
              <button
                type="button"
                disabled={short}
                className="mt-auto rounded-full bg-wood-700 px-3 py-1.5 text-xs font-bold text-cream transition enabled:hover:bg-wood-900 disabled:bg-beige-300 disabled:text-ink-faint"
                style={{ marginTop: 10 }}
                onClick={() => {
                  const r = buy(def.id);
                  setMessage({ id: def.id, text: r.ok ? '보관함에 넣었어요!' : r.message });
                }}
              >
                🪙 {def.price.toLocaleString()} 사기
              </button>
              {message?.id === def.id && <p className="mt-1 text-center text-[11px] text-ink-soft">{message.text}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
