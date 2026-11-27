import type { PointerEvent } from 'react';
import { DRINKS } from '../../data/drinks';
import { FURNITURE } from '../../data/furniture';
import { describeWarning, type LayoutAnalysis } from '../../systems/interior/connections';
import { roomOf, useGameStore } from '../../store/useGameStore';
import type { Tone } from '../../types/content';
import { Button } from '../ui/Button';
import type { Selection } from './selection';

interface InteriorPanelProps {
  selection: Selection;
  onSelect: (s: Selection) => void;
  onRotate: () => void;
  /** 보관함 가구를 끌기 시작 */
  onStartDrag: (furnitureId: string, e: PointerEvent) => void;
  notice: string | null;
  analysis: LayoutAnalysis;
}

const TONE_BG: Record<Tone, string> = {
  wood: 'bg-wood-100',
  mint: 'bg-mint',
  peach: 'bg-peach',
  butter: 'bg-butter',
  lavender: 'bg-lavender',
  rose: 'bg-rose',
  sky: 'bg-sky',
};

/** 인테리어 모드 패널: 선택 도구 · 보관함 · 매장 점검 */
export function InteriorPanel({ selection, onSelect, onRotate, onStartDrag, notice, analysis }: InteriorPanelProps) {
  const layout = useGameStore((s) => s.layout);
  const inventory = useGameStore((s) => s.inventory);
  const room = useGameStore((s) => roomOf(s.level));
  const storeFurniture = useGameStore((s) => s.storeFurniture);

  const held = selection?.kind === 'placed' ? layout.find((p) => p.uid === selection.uid) : undefined;
  const heldDef = held
    ? FURNITURE[held.furnitureId]
    : selection?.kind === 'inventory'
      ? FURNITURE[selection.furnitureId]
      : undefined;
  const stock = Object.entries(inventory).filter(([, n]) => (n ?? 0) > 0);

  const hint = heldDef
    ? `${heldDef.name} — ${held ? '옮길' : '놓을'} 칸을 누르거나 끌어다 놓으세요.`
    : '가구를 끌어서 옮기고, 우클릭으로 회전·보관해요. 소파·의자는 바닥 화살표 바로 앞에 책상이 있어야 손님이 앉아요.';

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white/45 p-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <p
          className={`min-w-60 flex-1 rounded-xl px-3.5 py-2 text-sm leading-relaxed ${notice ? 'bg-peach text-wood-900' : 'bg-butter/70'}`}
          aria-live="polite"
        >
          {notice ? `⚠ ${notice}` : hint}
        </p>
        {heldDef && (
          <div className="flex gap-1.5">
            <Button size="sm" variant="soft" onClick={onRotate} disabled={!heldDef.rotatable}>
              ↻ 회전 <kbd className="text-xs text-ink-faint">R</kbd>
            </Button>
            {held && (
              <Button
                size="sm"
                variant="soft"
                onClick={() => {
                  storeFurniture(held.uid);
                  onSelect(null);
                }}
              >
                📦 보관
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onSelect(null)}>
              취소
            </Button>
          </div>
        )}
      </div>

      <section>
        <h3 className="mb-2 text-sm font-bold text-wood-700">보관함</h3>
        {stock.length === 0 ? (
          <p className="text-sm text-ink-faint">보관함이 비어 있어요.</p>
        ) : (
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {stock.map(([id, n]) => {
              const def = FURNITURE[id];
              const active = selection?.kind === 'inventory' && selection.furnitureId === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`flex w-24 touch-none flex-col items-center gap-0.5 rounded-xl px-1.5 py-2.5 shadow-[0_3px_0_rgba(78,51,36,0.15)] transition hover:-translate-y-0.5 ${TONE_BG[def.tone]} ${
                      active ? '-translate-y-1 outline-3 outline-wood-700' : ''
                    }`}
                    aria-pressed={active}
                    onPointerDown={(e) => onStartDrag(id, e)}
                  >
                    <span className="text-2xl">{def.emoji}</span>
                    <span className="text-center text-xs leading-tight">{def.name}</span>
                    <span className="text-[11px] text-ink-soft">
                      {def.w}×{def.h} · ×{n}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-sm font-bold text-wood-700">매장 점검</h3>
        <ul className="mb-2 flex flex-wrap gap-1.5 text-[13px]">
          <li className="rounded-full bg-white/70 px-3 py-1">🪑 손님 좌석 {analysis.seatSlots.length}석</li>
          <li className="rounded-full bg-white/70 px-3 py-1">📚 진열 {analysis.shelf.capacity}권</li>
          <li className="rounded-full bg-white/70 px-3 py-1" title={analysis.menu.map((d) => DRINKS[d].name).join(', ')}>
            ☕ 메뉴 {analysis.menu.length}종
          </li>
        </ul>
        {analysis.warnings.length === 0 ? (
          <p className="text-[13px] text-mint-deep">✨ 모든 가구가 제 역할을 하고 있어요.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[13px]">
            {analysis.warnings.map((w, i) => (
              <li key={i} className="rounded border-l-4 border-peach-deep bg-white/60 px-2.5 py-1.5">
                {describeWarning(w, layout, room)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
