import { useGameStore } from '../../store/useGameStore';
import type { NavTab } from '../../types/game';
import { MoreMenu } from './MoreMenu';

const TABS: { id: NavTab; icon: string; label: string }[] = [
  { id: 'cafe', icon: '🏪', label: '영업하기' },
  { id: 'interior', icon: '🔨', label: '인테리어' },
  { id: 'guests', icon: '💌', label: '단골·이웃' },
  { id: 'library', icon: '📚', label: '서재' },
  { id: 'shop', icon: '🛍️', label: '상점' },
];

/** 데스크톱: 왼쪽 아이콘 사이드바 / 모바일: 하단 탭바 */
export function SideNav() {
  const activeTab = useGameStore((s) => s.activeTab);
  const visiting = useGameStore((s) => s.visiting);
  const setTab = useGameStore((s) => s.setTab);
  const setScreen = useGameStore((s) => s.setScreen);
  const endVisit = useGameStore((s) => s.endVisit);

  // 영업·인테리어는 전체화면 매장으로, 나머지는 메뉴 화면 안에서
  const go = (tab: NavTab) => {
    if (visiting) endVisit();
    setTab(tab);
    if (tab === 'cafe' || tab === 'interior') setScreen('play');
  };

  return (
    <>
      <nav
        className="glass fixed inset-y-0 left-0 z-20 hidden w-[76px] flex-col items-center gap-1 rounded-none border-y-0 border-l-0 py-6 md:flex xl:w-60 xl:items-stretch xl:px-3"
        aria-label="메인 메뉴"
      >
        <div className="mb-8 flex items-center gap-2 px-2 xl:px-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-wood-500 to-wood-700 text-xl shadow-md">📖</span>
          <span className="hidden font-book text-xl font-bold text-wood-900 xl:inline">BookStair</span>
        </div>

        {TABS.map((t) => (
          <NavButton key={t.id} {...t} active={!visiting && t.id === activeTab} onClick={() => go(t.id)} />
        ))}

        <div className="mt-auto">
          <MoreMenu
            label="더 보기"
            placement="up"
            trigger={
              <span className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-white/60">
                <span className="text-2xl leading-none">☰</span>
                <span className="hidden text-[15px] xl:inline">더 보기</span>
              </span>
            }
          />
        </div>
      </nav>

      <nav
        className="glass fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 rounded-none border-x-0 border-b-0 px-2 pt-1.5 pb-[calc(6px+env(safe-area-inset-bottom))] md:hidden"
        aria-label="메인 메뉴"
      >
        {TABS.map((t) => {
          const active = !visiting && t.id === activeTab;
          return (
            <button
              key={t.id}
              type="button"
              className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 ${active ? 'bg-butter/80' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => go(t.id)}
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="text-[11px]">{t.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`group flex items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-white/60 ${active ? 'bg-white/70 font-bold' : ''}`}
      aria-current={active ? 'page' : undefined}
      title={label}
      onClick={onClick}
    >
      <span className="text-2xl leading-none transition group-hover:scale-110">{icon}</span>
      <span className="hidden text-[15px] xl:inline">{label}</span>
    </button>
  );
}
