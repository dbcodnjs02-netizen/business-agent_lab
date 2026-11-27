import { DRINKS } from '../../data/drinks';
import { CURATION_EVENTS, EPISODES, GUESTS } from '../../data/guests';
import { NEIGHBOR_STORES } from '../../data/neighbors';
import { MAX_FRIENDSHIP_LEVEL, nextCurationEvent } from '../../systems/guests/friendship';
import { MAX_READER_AFFINITY } from '../../systems/social/social';
import { useGameStore } from '../../store/useGameStore';
import { CharacterPortrait } from '../characters/CharacterPortrait';
import { HeartMeter } from '../ui/HeartMeter';

/** 단골 프로필 카드 — 외형 · 성격 · 소개 · 취향 · 에피소드 */
export function GuestProfiles() {
  const progress = useGameStore((s) => s.guestProgress);
  const guestsInCafe = useGameStore((s) => s.guestsInCafe);
  const visiting = useGameStore((s) => s.visiting);
  const openConversation = useGameStore((s) => s.openConversation);
  const setTab = useGameStore((s) => s.setTab);

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-ink-soft">단골손님 · 동물 친구들</h2>
      <ul className="flex flex-col gap-4">
        {Object.values(GUESTS).map((g) => {
          const p = progress[g.id];
          if (!p?.isRegular) return <CandidateCard key={g.id} guestId={g.id} />;
          const worried = p && nextCurationEvent(g, p, CURATION_EVENTS) !== null;
          const canTalk = guestsInCafe.includes(g.id) && !visiting;
          return (
            <li key={g.id} className="flex gap-4 rounded-2xl bg-white/50 p-4">
              <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-peach to-butter ring-4 ring-cream">
                <CharacterPortrait look={g.look} expression={worried ? 'sad' : 'happy'} />
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <p className="font-book text-lg font-bold">{g.name}</p>
                  <p className="text-xs text-ink-faint">{g.title}</p>
                  {p && <HeartMeter value={p.friendshipLevel} max={MAX_FRIENDSHIP_LEVEL} />}
                  {canTalk && (
                    <button
                      type="button"
                      className="ml-auto rounded-full bg-wood-700 px-3 py-1 text-xs font-bold text-cream"
                      onClick={() => {
                        setTab('cafe');
                        openConversation(g.id);
                      }}
                    >
                      {worried ? '💭 고민 듣기' : '대화'}
                    </button>
                  )}
                </div>
                <p className="flex flex-wrap gap-1 text-[11px]">
                  {g.personality.map((t) => (
                    <span key={t} className="rounded-full bg-lavender px-2 py-0.5 text-ink-soft">
                      #{t}
                    </span>
                  ))}
                </p>
                <p className="text-sm leading-relaxed">{g.bio}</p>
                <p className="text-xs text-ink-soft">
                  좋아함 {g.preferences.favoriteDrinks.map((d) => `${DRINKS[d].emoji} ${DRINKS[d].name}`).join(', ')} ·{' '}
                  {g.preferences.likedBookTags.map((t) => `#${t}`).join(' ')}
                  <span className="text-ink-faint"> / 싫어함 {g.preferences.dislikedBookTags.map((t) => `#${t}`).join(' ')}</span>
                </p>
                <ul className="flex flex-wrap gap-1.5 text-xs">
                  {g.episodes.map((id) => {
                    const ep = EPISODES[id];
                    const open = p?.unlockedEpisodes.includes(id);
                    return (
                      <li
                        key={id}
                        className={`rounded-lg px-2 py-1 ${open ? 'bg-butter/70' : 'bg-beige-200 text-ink-faint'}`}
                        title={open ? ep.summary : undefined}
                      >
                        {open ? `📖 ${ep.title}` : `🔒 Lv.${ep.requiredLevel}에 열려요`}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** 아직 단골이 아닌 손님 — 만나기 전엔 실루엣, 만난 뒤엔 취향 힌트 */
function CandidateCard({ guestId }: { guestId: string }) {
  const g = GUESTS[guestId];
  const met = useGameStore((s) => s.guestProgress[guestId]?.visitCount > 0);
  const here = useGameStore((s) => s.guestsInCafe.includes(guestId));
  return (
    <li className="flex items-center gap-4 rounded-2xl border-2 border-dashed border-beige-300 bg-white/30 p-4">
      <span className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-full bg-beige-200 ring-4 ring-cream">
        <CharacterPortrait look={g.look} className={`size-full ${met ? '' : 'opacity-25 brightness-0'}`} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-book text-lg font-bold">{met ? g.name : '???'}</p>
        <p className="text-xs text-ink-faint">{met ? `${g.title} · 단골 후보` : '아직 만나지 못한 손님'}</p>
        <p className="mt-1.5 text-sm text-ink-soft">
          {met
            ? `“${CURATION_EVENTS[g.castingEvent].worry}” — 취향에 맞는 책을 추천하면 단골이 돼요.`
            : here
              ? '✨ 오늘 가게에 와 있어요! 말을 걸어 보세요.'
              : '언젠가 가게에 찾아올 거예요.'}
        </p>
      </div>
    </li>
  );
}

/** 영입한 독서가 */
export function RecruitedReaders() {
  const recruited = useGameStore((s) => s.recruited);
  if (recruited.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 text-sm font-bold text-ink-soft">영입한 독서가</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {recruited.map((r) => (
          <li key={r.id} className="flex gap-3 rounded-2xl bg-white/50 p-3">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-lavender to-sky ring-2 ring-cream">
              <CharacterPortrait look={r.look} expression="happy" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {r.name}{' '}
                <span className="text-xs font-normal text-ink-faint">
                  {NEIGHBOR_STORES.find((s) => s.storeId === r.fromStoreId)?.storeName ?? '이웃 서점'}에서
                </span>
              </p>
              <HeartMeter value={r.affinity} max={MAX_READER_AFFINITY} />
              {r.intro && <p className="mt-1 truncate text-xs text-ink-soft">“{r.intro}”</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
