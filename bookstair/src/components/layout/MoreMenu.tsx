import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { encodeSnapshot } from '../../systems/social/social';
import { useGameStore } from '../../store/useGameStore';

/** 내 서점 공유 링크 (서버 없이 스냅샷을 URL 에 담음) */
export function buildShareLink(): string {
  const s = useGameStore.getState();
  const code = encodeSnapshot({
    storeId: s.profile.storeId,
    storeName: s.profile.storeName,
    ownerName: s.profile.ownerName,
    intro: '책과 차 한 잔이 있는 작은 서점이에요.',
    layout: s.layout,
    // 내가 영입한 독서가들이 내 서점을 배회한다
    readers: s.recruited.map(({ id, name, look, favoriteGenre, intro, generosity }) => ({ id, name, look, favoriteGenre, intro, generosity })),
  });
  return `${location.origin}${location.pathname}?visit=${code}`;
}

interface MoreMenuProps {
  trigger: ReactNode;
  label: string;
  /** 펼침 방향 */
  placement?: 'down' | 'up';
}

/** 세이브 내보내기/가져오기 · 공유 링크 · 초기화 */
export function MoreMenu({ trigger, label, placement = 'down' }: MoreMenuProps) {
  const exportSaveJson = useGameStore((s) => s.exportSaveJson);
  const importSaveJson = useGameStore((s) => s.importSaveJson);
  const resetGame = useGameStore((s) => s.resetGame);
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const copyLink = async () => {
    const url = buildShareLink();
    try {
      await navigator.clipboard.writeText(url);
      say('내 서점 링크를 복사했어요.');
    } catch {
      window.prompt('링크를 복사하세요', url);
    }
  };

  const download = () => {
    const blob = new Blob([exportSaveJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `bookstair-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    say('세이브 파일을 내려받았어요.');
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const r = importSaveJson(await file.text());
    say(r.ok ? '세이브를 불러왔어요.' : r.message);
  };

  const items: [string, () => void][] = [
    ['🔗 내 서점 링크 복사', copyLink],
    ['💾 세이브 내보내기 (JSON)', download],
    ['📂 세이브 가져오기', () => fileRef.current?.click()],
    ['🗑 처음부터 다시', () => window.confirm('저장된 진행 상황을 지우고 처음부터 시작할까요?') && resetGame()],
  ];

  return (
    <div className="relative">
      <button type="button" aria-label={label} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="contents">
        {trigger}
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className={`glass-strong absolute z-40 w-56 animate-rise overflow-hidden rounded-2xl py-1.5 text-sm ${
              placement === 'up' ? 'bottom-full left-0 mb-2' : 'top-full right-0 mt-2'
            }`}
            role="menu"
          >
            {items.map(([text, run]) => (
              <button
                key={text}
                type="button"
                role="menuitem"
                className="block w-full px-4 py-2.5 text-left hover:bg-white/70"
                onClick={() => {
                  setOpen(false);
                  run();
                }}
              >
                {text}
              </button>
            ))}
          </div>
        </>
      )}

      {toast && (
        <p className="glass-strong fixed bottom-24 left-1/2 z-50 -translate-x-1/2 animate-rise rounded-full px-4 py-2 text-sm" role="status">
          {toast}
        </p>
      )}
    </div>
  );
}
