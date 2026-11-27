import { useEffect, useState } from 'react';
import { api } from '../../api/bookstairApi';
import { useGameStore } from '../../store/useGameStore';
import type { GuestNote } from '../../types/social';

/** 오른쪽 아래 떠 있는 내 방명록 버튼 */
export function MessagePill() {
  const storeId = useGameStore((s) => s.profile.storeId);
  const guestbookFor = useGameStore((s) => s.guestbookFor);
  const openGuestbook = useGameStore((s) => s.openGuestbook);
  const [notes, setNotes] = useState<GuestNote[]>([]);

  useEffect(() => {
    if (guestbookFor) return;
    let alive = true;
    api.listGuestbook(storeId).then((n) => alive && setNotes(n));
    return () => {
      alive = false;
    };
  }, [storeId, guestbookFor]);

  return (
    <button
      type="button"
      className="glass fixed right-4 bottom-20 z-20 flex items-center gap-3 rounded-full py-2.5 pr-3 pl-4 transition hover:-translate-y-0.5 md:right-8 md:bottom-8"
      onClick={() => openGuestbook(storeId)}
    >
      <span className="relative text-xl">
        💌
        {notes.length > 0 && (
          <span className="absolute -right-2 -bottom-1 grid min-w-[18px] place-items-center rounded-full bg-rose-deep px-1 text-[10px] font-bold text-cream">
            {notes.length}
          </span>
        )}
      </span>
      <span className="text-[15px] font-bold">방명록</span>
      <span className="hidden -space-x-2 sm:flex">
        {notes.slice(0, 3).map((n) => (
          <span
            key={n.id}
            className="grid size-6 place-items-center rounded-full border-2 border-cream bg-beige-200 text-[10px]"
            title={n.author}
          >
            {n.author.slice(0, 1)}
          </span>
        ))}
      </span>
    </button>
  );
}
