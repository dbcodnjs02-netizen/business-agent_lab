import type { ReactNode } from 'react';
import { NEIGHBOR_STORES } from '../data/neighbors';
import { MessagePill } from '../components/layout/MessagePill';
import { MoreMenu } from '../components/layout/MoreMenu';
import { CustomerCollection } from '../components/guests/CustomerCollection';
import { GuestProfiles, RecruitedReaders } from '../components/guests/GuestProfiles';
import { Avatar, NeighborsList, RightRail } from '../components/layout/RightRail';
import { SideNav } from '../components/layout/SideNav';
import { StoryBar } from '../components/layout/StoryBar';
import { ConversationModal } from '../components/modal/ConversationModal';
import { FurnitureShop } from '../components/shop/FurnitureShop';
import { StaffPanel } from '../components/staff/StaffPanel';
import { StorePreview } from '../components/shop/StorePreview';
import { GuestbookModal } from '../components/social/GuestbookModal';
import { VisitScene } from '../components/social/VisitScene';
import { formatClock, selectCozy, useGameStore } from '../store/useGameStore';

const PLACEHOLDER: Record<string, { icon: string; text: string }> = {
  library: { icon: '📚', text: '모은 책과 문장을 정리하는 서재 화면이에요.' },
};

/** 인스타그램형 3단 레이아웃: 사이드바 · 피드(매장) · 오른쪽 열 */
export function CafeView() {
  const activeTab = useGameStore((s) => s.activeTab);
  const visiting = useGameStore((s) => s.visiting);
  const talkingTo = useGameStore((s) => s.talkingTo);
  const guestbookFor = useGameStore((s) => s.guestbookFor);
  const profile = useGameStore((s) => s.profile);

  const guestbookName =
    guestbookFor === profile.storeId
      ? profile.storeName
      : (visiting?.storeId === guestbookFor ? visiting?.storeName : NEIGHBOR_STORES.find((s) => s.storeId === guestbookFor)?.storeName) ??
        '이웃 서점';

  return (
    <div className="min-h-dvh pb-24 md:pb-0 md:pl-[76px] xl:pl-60">
      <SideNav />

      <div className="mx-auto flex max-w-[1040px] justify-center gap-12 px-4 py-6 md:py-8">
        <main className="w-full max-w-[660px] min-w-0">
          <StoryBar />
          {visiting ? (
            <VisitCard key={visiting.storeId} />
          ) : activeTab === 'cafe' || activeTab === 'interior' ? (
            <MyStoreCard />
          ) : activeTab === 'guests' ? (
            <FeedCard title="단골 · 이웃">
              <div className="space-y-8 p-5">
                <GuestProfiles />
                <CustomerCollection />
                <RecruitedReaders />
                <NeighborsList />
              </div>
            </FeedCard>
          ) : activeTab === 'shop' ? (
            <FeedCard title="상점">
              <StaffPanel />
              <hr className="mx-4 border-beige-300" />
              <FurnitureShop />
            </FeedCard>
          ) : (
            <FeedCard title="서재">
              <div className="flex min-h-72 flex-col items-center justify-center gap-2 p-8 text-center">
                <span className="text-5xl">{PLACEHOLDER[activeTab].icon}</span>
                <p className="text-ink-soft">{PLACEHOLDER[activeTab].text}</p>
                <small className="rounded-full bg-lavender px-2.5 py-0.5">준비 중</small>
              </div>
            </FeedCard>
          )}
        </main>
        <RightRail />
      </div>

      <MessagePill />

      {/* key 로 손님이 바뀔 때마다 모달 내부 상태 초기화 */}
      {talkingTo && <ConversationModal key={talkingTo} guestId={talkingTo} />}
      {guestbookFor && <GuestbookModal key={guestbookFor} storeId={guestbookFor} storeName={guestbookName} />}
    </div>
  );
}

function MyStoreCard() {
  const profile = useGameStore((s) => s.profile);
  const day = useGameStore((s) => s.day);
  const minutes = useGameStore((s) => s.minutes);
  const coins = useGameStore((s) => s.coins);
  const reputation = useGameStore((s) => s.reputation);
  const cozy = useGameStore(selectCozy);
  const todaySales = useGameStore((s) => s.todaySales);
  const todayServed = useGameStore((s) => s.todayServed);
  const level = useGameStore((s) => s.level);
  const staff = useGameStore((s) => s.staff);
  const setScreen = useGameStore((s) => s.setScreen);

  return (
    <FeedCard
      avatar="📖"
      title={profile.storeName}
      meta={`${day}일차`}
      sub={`${formatClock(minutes)} · 메뉴를 보는 동안 영업은 잠시 멈춰요`}
      menu
      action={
        <button type="button" className="rounded-full bg-wood-700 px-3.5 py-1.5 text-xs font-bold text-cream" onClick={() => setScreen('play')}>
          🏪 가게로
        </button>
      }
    >
      <button type="button" className="block w-full" onClick={() => setScreen('play')} aria-label="가게로 들어가 영업하기">
        <StorePreview />
      </button>
      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-sm">
        <Stat>🎖️ Lv.{level}</Stat>
        <Stat>🪙 {coins.toLocaleString()}</Stat>
        <Stat>⭐ 평판 {reputation}</Stat>
        <Stat>🕯️ 아늑함 {cozy}</Stat>
        {staff.length > 0 && <Stat>🧑‍🍳 알바 {staff.length}명</Stat>}

      </div>
      <p className="px-4 pt-2 pb-4 text-sm text-ink-soft">
        <span className="font-bold text-ink">{profile.ownerName}</span> 오늘 매출 🪙{todaySales} · 계산한 손님 {todayServed}명
      </p>
    </FeedCard>
  );
}

function VisitCard() {
  const store = useGameStore((s) => s.visiting)!;
  const endVisit = useGameStore((s) => s.endVisit);

  const leave = () => {
    // 공유 링크로 들어왔다면 주소창의 ?visit= 도 지운다
    if (location.search) history.replaceState(null, '', location.pathname);
    endVisit();
  };

  return (
    <FeedCard
      avatar="🏠"
      title={store.storeName}
      meta={`${store.ownerName}의 서점`}
      sub="구경 중 · 독서가를 눌러 초대하고, 메모판에 방명록을 남겨보세요"
      action={
        <button type="button" className="rounded-full bg-wood-700 px-3 py-1.5 text-xs font-bold text-cream" onClick={leave}>
          ← 내 서점
        </button>
      }
    >
      <VisitScene store={store} />
      {store.intro && <p className="px-4 py-3 text-sm text-ink-soft">{store.intro}</p>}
    </FeedCard>
  );
}

interface FeedCardProps {
  avatar?: string;
  title: string;
  meta?: string;
  sub?: string;
  menu?: boolean;
  action?: ReactNode;
  children: ReactNode;
}

/** 게시물 모양 카드 */
function FeedCard({ avatar, title, meta, sub, menu, action, children }: FeedCardProps) {
  return (
    <article className="glass overflow-hidden rounded-3xl">
      <header className="flex items-center gap-3 px-4 py-3">
        {avatar && <Avatar emoji={avatar} />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px]">
            <span className="font-bold">{title}</span>
            {meta && <span className="text-ink-faint"> · {meta}</span>}
          </p>
          {sub && <p className="truncate text-xs text-ink-soft">{sub}</p>}
        </div>
        {action}
        {menu && (
          <MoreMenu
            label="게시물 메뉴"
            trigger={<span className="grid size-9 place-items-center rounded-full text-xl hover:bg-white/60">⋯</span>}
          />
        )}
      </header>
      <div className={avatar ? 'px-2' : ''}>{children}</div>
    </article>
  );
}

function Stat({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/60 px-3 py-1">{children}</span>;
}
