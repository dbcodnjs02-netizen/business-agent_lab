import { useState } from 'react';
import { STAFF } from '../../data/staff';
import { STAFF_UNLOCK_LEVELS, staffSlots } from '../../systems/level/level';
import { useGameStore } from '../../store/useGameStore';
import { CharacterPortrait } from '../characters/CharacterPortrait';

/** 알바 고용 — 5 · 10 · 50 · 100레벨에 자리가 하나씩 열린다 */
export function StaffPanel() {
  const level = useGameStore((s) => s.level);
  const coins = useGameStore((s) => s.coins);
  const hired = useGameStore((s) => s.staff);
  const hire = useGameStore((s) => s.hireStaff);
  const fire = useGameStore((s) => s.fireStaff);
  const [message, setMessage] = useState<{ id: string; text: string } | null>(null);
  const slots = staffSlots(level);
  const wages = STAFF.filter((d) => hired.includes(d.id)).reduce((sum, d) => sum + d.wage, 0);

  return (
    <section className="p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold">🧑‍🍳 알바 고용</h3>
        <span className="text-xs text-ink-soft">
          {hired.length} / {slots}명 · 하루 일당 🪙{wages.toLocaleString()} (영업 끝나면 지급)
        </span>
      </header>

      {/* 자리 4개 — 레벨에 따라 열림 */}
      <ol className="mt-3 grid grid-cols-4 gap-2">
        {STAFF_UNLOCK_LEVELS.map((unlock, i) => {
          const def = STAFF.find((d) => d.id === hired[i]);
          const open = level >= unlock;
          return (
            <li
              key={unlock}
              className={`flex flex-col items-center rounded-2xl px-1 py-2 text-center text-[11px] ${open ? 'bg-mint/60' : 'bg-beige-200/70 text-ink-faint'}`}
            >
              {def ? (
                <>
                  <span className="size-10 overflow-hidden rounded-full bg-white ring-2 ring-white">
                    <CharacterPortrait look={def.look} expression="happy" />
                  </span>
                  <span className="mt-1 font-bold text-ink">{def.name}</span>
                </>
              ) : (
                <>
                  <span className="grid size-10 place-items-center rounded-full bg-white/70 text-lg">{open ? '＋' : '🔒'}</span>
                  <span className="mt-1">{open ? '빈 자리' : `Lv.${unlock}`}</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
      {slots === 0 && <p className="mt-2 text-xs text-ink-soft">가게가 5레벨이 되면 첫 알바를 뽑을 수 있어요. 지금은 Lv.{level}.</p>}

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {STAFF.map((def) => {
          const working = hired.includes(def.id);
          const full = hired.length >= slots;
          const short = coins < def.hireCost;
          return (
            <li key={def.id} className={`flex gap-3 rounded-2xl p-3 ${working ? 'bg-mint/50 ring-2 ring-mint-deep' : 'bg-white/60'}`}>
              <span className="size-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-mint to-butter ring-2 ring-white">
                <CharacterPortrait look={def.look} expression="happy" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">
                  {def.name} {working && <span className="ml-1 rounded-full bg-mint-deep px-1.5 py-0.5 text-[10px] text-white">근무 중</span>}
                </p>
                <p className="text-xs leading-snug text-ink-soft">{def.intro}</p>
                <p className="mt-1 text-[11px] text-ink-faint">
                  ✨ {def.perk} · 🏃 {Math.round(def.speed * 100)}%
                </p>
                <p className="text-[11px] text-ink-faint">
                  계약금 🪙{def.hireCost.toLocaleString()} · 일당 🪙{def.wage}
                </p>
                <div className="mt-2">
                  {working ? (
                    <button
                      type="button"
                      className="rounded-full px-3 py-1 text-xs text-ink-soft ring-1 ring-beige-300 hover:bg-white"
                      onClick={() => {
                        fire(def.id);
                        setMessage({ id: def.id, text: '오늘까지 고마웠어요!' });
                      }}
                    >
                      내보내기
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={full || short}
                      className="rounded-full bg-wood-700 px-3 py-1 text-xs font-bold text-cream transition enabled:hover:bg-wood-900 disabled:bg-beige-300 disabled:text-ink-faint"
                      onClick={() => {
                        const r = hire(def.id);
                        setMessage({ id: def.id, text: r.ok ? '내일… 아니, 지금부터 일해요!' : r.message });
                      }}
                    >
                      {full ? (slots === 0 ? '🔒 Lv.5부터' : '자리 없음') : `🪙 ${def.hireCost.toLocaleString()} 고용`}
                    </button>
                  )}
                  {message?.id === def.id && <span className="ml-2 text-[11px] text-ink-soft">{message.text}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
