import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../../api/bookstairApi';
import { CURATION_EVENTS, GUESTS } from '../../data/guests';
import { nextCurationEvent } from '../../systems/guests/friendship';
import { useGameStore } from '../../store/useGameStore';
import type { StoreSnapshot } from '../../types/social';
import { buildShareLink } from './MoreMenu';
import type { CharacterLook, Expression } from '../../types/character';
import { CharacterPortrait } from '../characters/CharacterPortrait';

/** 오른쪽 열: 내 프로필 · 단골 · 추천 이웃 서점 */
export function RightRail() {
  const profile = useGameStore((s) => s.profile);
  const reputation = useGameStore((s) => s.reputation);
  const [copied, setCopied] = useState(false);

  return (
    <aside className="sticky top-8 hidden w-[320px] shrink-0 self-start lg:block">
      <div className="mb-6 flex items-center gap-3">
        <Avatar emoji="📖" size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold">{profile.storeName}</p>
          <p className="truncate text-sm text-ink-soft">
            {profile.ownerName} · 평판 {reputation}
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-bold text-wood-500 hover:text-wood-700"
          onClick={async () => {
            await navigator.clipboard?.writeText(buildShareLink()).catch(() => undefined);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? '복사됨!' : '링크 복사'}
        </button>
      </div>

      <RegularsList />
      <div className="h-6" />
      <NeighborsList />

      <footer className="mt-8 space-y-2 text-[11px] leading-relaxed text-ink-faint">
        <p>소개 · 도움말 · 단축키(R 회전 · Del 보관 · Esc 취소)</p>
        <p>© 2026 BOOKSTAIR</p>
      </footer>
    </aside>
  );
}

export function RegularsList() {
  const guestsInCafe = useGameStore((s) => s.guestsInCafe);
  const progress = useGameStore((s) => s.guestProgress);
  const visiting = useGameStore((s) => s.visiting);
  const openConversation = useGameStore((s) => s.openConversation);
  const setTab = useGameStore((s) => s.setTab);

  return (
    <Section title="오늘의 단골" action={['모두 보기', () => setTab('guests')]}>
      {guestsInCafe.map((id) => {
        const g = GUESTS[id];
        const p = progress[id];
        const candidate = !p.isRegular;
        const worry = !candidate && nextCurationEvent(g, p, CURATION_EVENTS) !== null;
        return (
          <Row
            key={id}
            avatar={<Avatar look={g.look} />}
            title={candidate ? '✨ 새 손님' : g.name}
            sub={
              candidate
                ? '처음 온 손님 · 취향을 듣고 책을 추천해 보세요'
                : `Lv.${p.friendshipLevel} · ${worry ? '고민이 있어 보여요' : `에피소드 ${p.unlockedEpisodes.length}개 해제`}`
            }
            action={visiting ? undefined : ['대화', () => (setTab('cafe'), openConversation(id))]}
          />
        );
      })}
    </Section>
  );
}

export function NeighborsList() {
  const startVisit = useGameStore((s) => s.startVisit);
  const [stores, setStores] = useState<StoreSnapshot[]>([]);

  useEffect(() => {
    api.listNeighbors().then(setStores);
  }, []);

  return (
    <Section title="추천 이웃 서점">
      {stores.map((s) => (
        <Row
          key={s.storeId}
          avatar={<Avatar emoji="🏠" />}
          title={s.storeName}
          sub={`${s.ownerName} · 독서가 ${s.readers.length}명`}
          action={['방문', () => startVisit(s)]}
        />
      ))}
    </Section>
  );
}

function Section({ title, action, children }: { title: string; action?: [string, () => void]; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-soft">{title}</h2>
        {action && (
          <button type="button" className="text-xs font-bold hover:text-wood-500" onClick={action[1]}>
            {action[0]}
          </button>
        )}
      </div>
      <ul className="flex flex-col gap-3">{children}</ul>
    </section>
  );
}

function Row({ avatar, title, sub, action }: { avatar: ReactNode; title: string; sub: string; action?: [string, () => void] }) {
  return (
    <li className="flex items-center gap-3">
      {avatar}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{title}</p>
        <p className="truncate text-xs text-ink-soft">{sub}</p>
      </div>
      {action && (
        <button type="button" className="text-xs font-bold text-wood-500 hover:text-wood-700" onClick={action[1]}>
          {action[0]}
        </button>
      )}
    </li>
  );
}

interface AvatarProps {
  /** 서점·이웃 같은 사물 아이콘 */
  emoji?: string;
  /** 사람이면 그린 얼굴 */
  look?: CharacterLook;
  expression?: Expression;
  size?: 'md' | 'lg';
}

export function Avatar({ emoji, look, expression, size = 'md' }: AvatarProps) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-beige-100 to-beige-300 ring-1 ring-white ${
        size === 'lg' ? 'size-14 text-2xl' : 'size-11 text-xl'
      }`}
    >
      {look ? <CharacterPortrait look={look} expression={expression} /> : emoji}
    </span>
  );
}
