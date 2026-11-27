import { useState } from 'react';
import { CUSTOMER_TYPES } from '../../data/customers';
import { DRINKS } from '../../data/drinks';
import { HEART_VISITS, MAX_COLLECTION_HEARTS, collectionHearts, heartProgress } from '../../systems/collection/collection';
import { useGameStore } from '../../store/useGameStore';
import { CharacterPortrait } from '../characters/CharacterPortrait';

const SUNBURST =
  'bg-[repeating-conic-gradient(from_0deg_at_50%_62%,#f7cbd3_0deg_9deg,#fbe0e4_9deg_18deg)]';

/** 손님 도감 — 계산하고 나간 일반 손님 유형이 등록되고, 자주 올수록 하트가 찬다 */
export function CustomerCollection() {
  const book = useGameStore((s) => s.customerBook);
  const [openId, setOpenId] = useState<string | null>(null);
  const found = CUSTOMER_TYPES.filter((t) => book[t.id]).length;
  const open = CUSTOMER_TYPES.find((t) => t.id === openId && book[t.id]);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold text-ink-soft">손님 도감</h2>
        <span className="text-xs text-ink-faint">
          {found} / {CUSTOMER_TYPES.length} 등록
        </span>
      </div>

      <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {CUSTOMER_TYPES.map((t) => {
          const visits = book[t.id] ?? 0;
          const known = visits > 0;
          return (
            <li key={t.id}>
              <button
                type="button"
                disabled={!known}
                aria-pressed={openId === t.id}
                className={`flex w-full flex-col items-center rounded-2xl border-2 p-1.5 pb-2 transition ${
                  openId === t.id ? 'border-rose-deep' : 'border-white/80'
                } ${known ? `${SUNBURST} hover:-translate-y-0.5` : 'bg-beige-200'}`}
                onClick={() => setOpenId(openId === t.id ? null : t.id)}
              >
                <span className="aspect-square w-full overflow-hidden rounded-xl">
                  <CharacterPortrait
                    look={t.look}
                    expression={known ? 'happy' : 'neutral'}
                    className={`size-full ${known ? '' : 'opacity-25 brightness-0'}`}
                  />
                </span>
                <span className={`mt-1 w-full truncate text-center text-xs font-bold ${known ? '' : 'text-ink-faint'}`}>
                  {known ? t.name : '???'}
                </span>
                <HeartBar visits={visits} />
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <div className="mt-3 flex animate-rise items-center gap-3 rounded-2xl bg-white/60 p-3 text-sm">
          <span className="grid size-12 shrink-0 overflow-hidden rounded-full bg-rose">
            <CharacterPortrait look={open.look} expression="happy" />
          </span>
          <div className="min-w-0">
            <p className="font-bold">{open.name}</p>
            <p className="font-book text-ink-soft">“{open.line}”</p>
            <p className="text-xs text-ink-faint">
              {DRINKS[open.favoriteDrink].emoji} {DRINKS[open.favoriteDrink].name} 좋아함 · 방문 {book[open.id]}번
              {collectionHearts(book[open.id]) < MAX_COLLECTION_HEARTS &&
                ` · 다음 하트까지 ${HEART_VISITS[collectionHearts(book[open.id])] - book[open.id]}번`}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function HeartBar({ visits }: { visits: number }) {
  const hearts = collectionHearts(visits);
  return (
    <span className="mt-1 flex w-full items-center gap-1 px-0.5" aria-label={`하트 ${hearts} / ${MAX_COLLECTION_HEARTS}`}>
      <span className={`text-xs leading-none ${hearts > 0 ? 'text-rose-deep' : 'text-beige-300'}`}>♥{hearts}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/80">
        <span className="block h-full rounded-full bg-rose-deep" style={{ width: `${heartProgress(visits) * 100}%` }} />
      </span>
    </span>
  );
}
