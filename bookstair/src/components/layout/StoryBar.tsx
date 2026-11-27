import { CURATION_EVENTS, GUESTS } from '../../data/guests';
import { nextCurationEvent } from '../../systems/guests/friendship';
import { useGameStore } from '../../store/useGameStore';
import type { CharacterLook } from '../../types/character';
import { CharacterPortrait } from '../characters/CharacterPortrait';

/** 상단 스토리 줄 — 단골(고민이 있으면 링이 빛남)과 영입한 독서가 */
export function StoryBar() {
  const guestsInCafe = useGameStore((s) => s.guestsInCafe);
  const progress = useGameStore((s) => s.guestProgress);
  const recruited = useGameStore((s) => s.recruited);
  const visiting = useGameStore((s) => s.visiting);
  const openConversation = useGameStore((s) => s.openConversation);
  const setTab = useGameStore((s) => s.setTab);

  return (
    <ul className="flex gap-4 overflow-x-auto px-1 pt-1 pb-3" aria-label="오늘의 손님">
      {guestsInCafe.map((id) => {
        const g = GUESTS[id];
        const candidate = !progress[id]?.isRegular;
        const hasWorry = !candidate && nextCurationEvent(g, progress[id], CURATION_EVENTS) !== null;
        return (
          <li key={id}>
            <Story
              look={g.look}
              name={candidate ? '✨ 새 손님' : g.name}
              ring={
                candidate
                  ? 'bg-gradient-to-tr from-butter via-mint to-lavender'
                  : hasWorry
                    ? 'bg-gradient-to-tr from-butter-deep via-peach-deep to-rose-deep'
                    : 'bg-beige-300'
              }
              hint={candidate ? '처음 온 손님 — 취향에 맞는 책을 추천하면 단골이 돼요' : hasWorry ? '고민이 있어 보여요' : undefined}
              disabled={Boolean(visiting)}
              onClick={() => {
                setTab('cafe');
                openConversation(id);
              }}
            />
          </li>
        );
      })}
      {recruited.map((r) => (
        <li key={r.id}>
          <Story look={r.look} name={r.name} ring="bg-gradient-to-tr from-lavender to-sky" hint="영입한 독서가 — 손님으로 찾아와요" />
        </li>
      ))}
    </ul>
  );
}

interface StoryProps {
  look: CharacterLook;
  name: string;
  ring: string;
  hint?: string;
  disabled?: boolean;
  onClick?: () => void;
}

function Story({ look, name, ring, hint, disabled, onClick }: StoryProps) {
  const body = (
    <>
      <span className={`grid size-[74px] place-items-center rounded-full p-[3px] ${ring}`}>
        <span className="grid size-full place-items-center overflow-hidden rounded-full border-[3px] border-cream bg-beige-100">
          <CharacterPortrait look={look} />
        </span>
      </span>
      <span className="max-w-[76px] truncate text-xs">{name}</span>
    </>
  );
  return onClick ? (
    <button
      type="button"
      className="flex flex-col items-center gap-1 transition hover:-translate-y-0.5 disabled:opacity-50"
      title={hint}
      disabled={disabled}
      onClick={onClick}
    >
      {body}
    </button>
  ) : (
    <div className="flex flex-col items-center gap-1" title={hint}>
      {body}
    </div>
  );
}
