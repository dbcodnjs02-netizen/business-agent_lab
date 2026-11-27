import { useEffect } from 'react';
import { MAX_LEVEL, expToNext, nextPerk, perkText, type LevelPerk } from '../../systems/level/level';
import { useGameStore } from '../../store/useGameStore';
import { Button } from '../ui/Button';

const PERK_ICON: Record<LevelPerk['kind'], string> = { room: '📐', regulars: '🐾', staff: '🧑‍🍳' };

/** 위 가운데 — 가게 레벨과 경험치, 다음 혜택 */
export function LevelBadge() {
  const level = useGameStore((s) => s.level);
  const exp = useGameStore((s) => s.exp);
  const max = level >= MAX_LEVEL;
  const need = expToNext(level);
  const next = nextPerk(level);

  return (
    <div className="glass-strong flex items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 shadow-md" title="손님에게 음료·책을 건넬 때마다 경험치가 쌓여요">
      <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-rose to-lavender font-book text-lg leading-none font-bold text-wood-900 ring-2 ring-white">
        {level}
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2 text-xs font-bold">
          <span>Lv.{level} 북카페</span>
          {!max && <span className="font-normal text-ink-faint tabular-nums">{exp} / {need}</span>}
        </p>
        <span className="mt-1 block h-2 w-40 overflow-hidden rounded-full bg-beige-300 sm:w-52">
          <span className="block h-full rounded-full bg-gradient-to-r from-rose-deep to-peach-deep transition-[width]" style={{ width: `${max ? 100 : (exp / need) * 100}%` }} />
        </span>
        {next && (
          <p className="mt-0.5 hidden truncate text-[11px] text-ink-soft sm:block">
            Lv.{next.level} {next.perks.map((p) => `${PERK_ICON[p.kind]} ${perkText(p)}`).join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

/** 레벨이 오르면 화면 가운데에 잠깐 뜨는 축하 카드 */
export function LevelUpBanner() {
  const notice = useGameStore((s) => s.levelUp);
  const dismiss = useGameStore((s) => s.dismissLevelUp);
  const setTab = useGameStore((s) => s.setTab);
  const setScreen = useGameStore((s) => s.setScreen);

  // 혜택이 없으면 짧게, 있으면 조금 더 오래 보여 준다
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(dismiss, notice.perks.length > 0 ? 6000 : 2600);
    return () => window.clearTimeout(t);
  }, [notice, dismiss]);

  if (!notice) return null;
  const staff = notice.perks.some((p) => p.kind === 'staff');

  return (
    <div className="glass-strong pointer-events-auto w-[min(360px,calc(100vw-2rem))] animate-rise rounded-3xl px-5 py-4 text-center shadow-xl" role="status">
      <p className="text-sm font-bold text-rose-deep">✨ LEVEL UP ✨</p>
      <p className="mt-0.5 font-book text-3xl font-bold">Lv.{notice.level}</p>
      {notice.perks.length > 0 && (
        <ul className="mt-2 space-y-1 text-sm">
          {notice.perks.map((p) => (
            <li key={p.kind} className="rounded-xl bg-white/60 px-3 py-1">
              {PERK_ICON[p.kind]} {perkText(p)}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex justify-center gap-2">
        <Button size="sm" variant="soft" onClick={dismiss}>
          좋아요
        </Button>
        {staff && (
          <Button
            size="sm"
            onClick={() => {
              dismiss();
              setTab('shop');
              setScreen('menu');
            }}
          >
            🧑‍🍳 알바 고용하러 가기
          </Button>
        )}
      </div>
    </div>
  );
}
