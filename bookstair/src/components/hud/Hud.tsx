import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { CLOSE_MINUTES, GAME_MINUTES_PER_SECOND, OPEN_MINUTES, formatClock, itemIcon, itemLabel, useGameStore } from '../../store/useGameStore';

/** 왼쪽 아래 — 동전과 오늘 매출 */
export function CoinBadge() {
  const coins = useGameStore((s) => s.coins);
  const todaySales = useGameStore((s) => s.todaySales);
  const reputation = useGameStore((s) => s.reputation);
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-butter to-butter-deep text-3xl shadow-lg ring-4 ring-cream/80">🪙</span>
      <div className="glass-strong rounded-2xl px-4 py-2">
        <p className="text-2xl leading-none font-bold tabular-nums">{coins.toLocaleString()}</p>
        <p className="mt-1 text-xs text-ink-soft">
          오늘 +{todaySales.toLocaleString()} · ⭐ {reputation}
        </p>
      </div>
    </div>
  );
}

/** 오른쪽 아래 — 남은 영업 시간 */
export function DayTimer() {
  const minutes = useGameStore((s) => s.minutes);
  const day = useGameStore((s) => s.day);
  const left = Math.max(0, (CLOSE_MINUTES - minutes) / GAME_MINUTES_PER_SECOND);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(Math.floor(left % 60)).padStart(2, '0');
  const ratio = (minutes - OPEN_MINUTES) / (CLOSE_MINUTES - OPEN_MINUTES);
  const hurry = left < 30;

  return (
    <div className="glass-strong flex items-center gap-3 rounded-3xl px-4 py-2.5">
      <span className={`text-3xl ${hurry ? 'animate-pulse' : ''}`}>⏳</span>
      <div>
        <p className={`font-book text-4xl leading-none font-bold tabular-nums ${hurry ? 'text-rose-deep' : 'text-wood-900'}`}>
          {mm}:{ss}
        </p>
        <span className="mt-1.5 block h-1.5 w-36 overflow-hidden rounded-full bg-beige-300">
          <span className="block h-full rounded-full bg-wood-500" style={{ width: `${ratio * 100}%` }} />
        </span>
        <p className="mt-1 text-[11px] text-ink-soft">
          {day}일차 · {formatClock(minutes)}
        </p>
      </div>
    </div>
  );
}

/** 오른쪽 위 — 일시정지 · 인테리어 · 메뉴 */
export function TopButtons() {
  const editing = useGameStore((s) => s.activeTab === 'interior');
  const setTab = useGameStore((s) => s.setTab);
  const setPaused = useGameStore((s) => s.setPaused);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <div className="flex gap-2">
      {editing ? (
        <HudButton onClick={() => setTab('cafe')} label="편집 완료" strong>
          ✓ 편집 완료
        </HudButton>
      ) : (
        <>
          <HudButton onClick={() => setPaused(true)} label="일시정지 (Esc)">
            ⏸
          </HudButton>
          <HudButton onClick={() => setTab('interior')} label="인테리어 편집">
            🔨 <span className="hidden sm:inline">인테리어</span>
          </HudButton>
          <HudButton onClick={() => (setTab('shop'), setScreen('menu'))} label="알바 고용 · 상점">
            🧑‍🍳 <span className="hidden sm:inline">알바</span>
          </HudButton>
        </>
      )}
      <HudButton onClick={() => setScreen('menu')} label="메뉴 — 단골·도감·이웃 서점">
        ☰ <span className="hidden sm:inline">메뉴</span>
      </HudButton>
    </div>
  );
}

function HudButton({ onClick, label, strong, children }: { onClick: () => void; label: string; strong?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-11 items-center gap-1.5 rounded-2xl px-3.5 text-[15px] font-bold shadow-md transition hover:-translate-y-0.5 ${
        strong ? 'bg-wood-700 text-cream' : 'glass-strong text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** 아래 가운데 — 들고 있는 것 + 조작법 */
export function ControlsHint() {
  const carrying = useGameStore((s) => s.player.carrying);
  const editing = useGameStore((s) => s.activeTab === 'interior');
  if (editing) return null;
  return (
    <div className="flex flex-col items-center gap-1.5">
      {carrying && (
        <p className="glass-strong animate-rise rounded-full px-4 py-1.5 text-sm font-bold">
          {itemIcon(carrying)} {itemLabel(carrying)} 들고 있음 <span className="font-normal text-ink-faint">· Q 내려놓기</span>
        </p>
      )}
      <p className="hidden rounded-full bg-wood-900/55 px-4 py-1 text-xs text-cream md:block">
        WASD·방향키 이동 · Space 사용/건네기 · 바닥·손님·기계를 눌러도 이동 · Esc 일시정지
      </p>
    </div>
  );
}

/** 화면 위쪽 가운데에 잠깐 뜨는 안내 */
export function Toast() {
  const toast = useGameStore((s) => s.toast);
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!toast) return;
    setShown(toast.id);
    const t = window.setTimeout(() => setShown(null), 1800);
    return () => window.clearTimeout(t);
  }, [toast]);
  if (!toast || shown !== toast.id) return null;
  return (
    <p role="status" className="glass-strong animate-rise rounded-full px-5 py-2 text-sm font-bold text-wood-900 shadow-lg">
      {toast.text}
    </p>
  );
}
