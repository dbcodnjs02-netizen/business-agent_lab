import { useEffect, useState } from 'react';
import { NOTE_COLORS, api } from '../../api/bookstairApi';
import { useGameStore } from '../../store/useGameStore';
import type { Tone } from '../../types/content';
import type { GuestNote } from '../../types/social';
import { Modal } from '../modal/Modal';
import { Button } from '../ui/Button';

const NOTE_BG: Record<Tone, string> = {
  wood: 'bg-wood-100',
  mint: 'bg-mint',
  peach: 'bg-peach',
  butter: 'bg-butter',
  lavender: 'bg-lavender',
  rose: 'bg-rose',
  sky: 'bg-sky',
};

const TILT = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];

interface GuestbookModalProps {
  storeId: string;
  storeName: string;
}

/** 방명록 — 포스트잇 메모 목록 + 남기기 */
export function GuestbookModal({ storeId, storeName }: GuestbookModalProps) {
  const close = useGameStore((s) => s.closeGuestbook);
  const me = useGameStore((s) => s.profile);
  const isMine = storeId === me.storeId;

  const [notes, setNotes] = useState<GuestNote[] | null>(null);
  const [text, setText] = useState('');
  const [color, setColor] = useState<Tone>('butter');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    api.listGuestbook(storeId).then((n) => alive && setNotes(n));
    return () => {
      alive = false;
    };
  }, [storeId]);

  const submit = async () => {
    if (!text.trim()) return;
    setSending(true);
    const note = await api.postGuestbook({ storeId, author: `${me.ownerName} (${me.storeName})`, text: text.trim(), color });
    setNotes((prev) => [note, ...(prev ?? [])]);
    setText('');
    setSending(false);
  };

  return (
    <Modal
      open
      onClose={close}
      label={`${storeName} 방명록`}
      width="max-w-[680px]"
      header={
        <div>
          <p className="text-xs text-ink-faint">📝 방명록</p>
          <h2 className="font-book text-xl font-bold">{storeName}</h2>
        </div>
      }
    >
      {!isMine && (
        <div className="mb-5 rounded-2xl bg-white/60 p-3.5">
          <textarea
            className="h-20 w-full resize-none rounded-xl border border-beige-300 bg-cream/80 p-3 text-sm outline-none focus:border-wood-300"
            placeholder="따뜻한 한마디를 남겨주세요 (120자)"
            maxLength={120}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="flex gap-1.5" role="radiogroup" aria-label="메모지 색">
              {NOTE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  aria-label={c}
                  className={`size-6 rounded-md ${NOTE_BG[c]} ${color === c ? 'ring-2 ring-wood-700 ring-offset-1' : ''}`}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
            <span className="ml-auto text-xs text-ink-faint">{text.length}/120</span>
            <Button size="sm" disabled={!text.trim() || sending} onClick={submit}>
              붙이기
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-ink-faint">※ 아직 서버가 없어서 이 브라우저에만 저장돼요.</p>
        </div>
      )}

      {notes === null ? (
        <p className="text-center text-sm text-ink-faint">불러오는 중…</p>
      ) : notes.length === 0 ? (
        <p className="text-center text-sm text-ink-faint">아직 메모가 없어요.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {notes.map((n, i) => (
            <li
              key={n.id}
              className={`flex min-h-32 flex-col rounded-sm p-3 shadow-[0_6px_12px_rgba(78,51,36,0.12)] ${NOTE_BG[n.color]} ${TILT[i % TILT.length]}`}
            >
              <p className="flex-1 font-book text-sm leading-relaxed break-words">{n.text}</p>
              <p className="mt-2 text-[11px] text-ink-soft">— {n.author}</p>
              <p className="text-[10px] text-ink-faint">{new Date(n.createdAt).toLocaleDateString('ko-KR')}</p>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
