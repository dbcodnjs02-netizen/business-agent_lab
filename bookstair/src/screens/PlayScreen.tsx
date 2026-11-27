import { NEIGHBOR_STORES } from '../data/neighbors';
import { CoinBadge, ControlsHint, DayTimer, Toast, TopButtons } from '../components/hud/Hud';
import { OrderTickets } from '../components/hud/OrderTickets';
import { LevelBadge, LevelUpBanner } from '../components/hud/LevelHud';
import { DayReportCard, PauseOverlay } from '../components/hud/Overlays';
import { TutorialCard } from '../components/hud/TutorialCard';
import { ConversationModal } from '../components/modal/ConversationModal';
import { ShopScene } from '../components/shop/ShopScene';
import { GuestbookModal } from '../components/social/GuestbookModal';
import { useGameLoop } from '../hooks/useGameLoop';
import { useGameStore } from '../store/useGameStore';

/** 전체화면 영업 — 매장이 화면을 채우고 HUD 가 네 귀퉁이에 뜬다 */
export function PlayScreen() {
  useGameLoop();
  const talkingTo = useGameStore((s) => s.talkingTo);
  const guestbookFor = useGameStore((s) => s.guestbookFor);
  const profile = useGameStore((s) => s.profile);
  const editing = useGameStore((s) => s.activeTab === 'interior');

  const guestbookName =
    guestbookFor === profile.storeId ? profile.storeName : (NEIGHBOR_STORES.find((s) => s.storeId === guestbookFor)?.storeName ?? '이웃 서점');

  return (
    // 매장 벽·바닥은 화면 끝까지 이어 그려지므로 배경은 홀 바닥색 한 가지
    <div className="fixed inset-0 overflow-hidden bg-[#e9f2ea]">
      <div className="absolute inset-0 pt-14 pb-16 md:pt-16 md:pb-20">
        <ShopScene fill />
      </div>

      {/* HUD 는 클릭이 매장으로 지나가도록 기본 pointer-events-none */}
      <div className="pointer-events-none absolute inset-0 z-10">
        {!editing && (
          <div className="absolute top-0 left-3 md:left-5">
            <OrderTickets />
          </div>
        )}
        <div className="pointer-events-auto absolute top-3 right-3 md:right-5">
          <TopButtons />
        </div>
        {!editing && (
          <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 max-lg:top-16">
            <LevelBadge />
          </div>
        )}
        <div className="absolute inset-x-0 top-[124px] flex justify-center">
          <Toast />
        </div>
        <div className="absolute inset-x-0 top-[180px] flex justify-center">
          <LevelUpBanner />
        </div>
        {!editing && (
          <>
            <div className="pointer-events-auto absolute bottom-3 left-3 md:left-5">
              <CoinBadge />
            </div>
            <div className="pointer-events-auto absolute right-3 bottom-3 md:right-5">
              <DayTimer />
            </div>
            <div className="absolute inset-x-0 bottom-3 flex justify-center px-48 max-md:bottom-24 max-md:px-3">
              <ControlsHint />
            </div>
          </>
        )}
      </div>

      {/* 튜토리얼 안내 — 편집 중엔 왼쪽 아래, 영업 중엔 코인 위 */}
      <div className={`pointer-events-none absolute left-3 z-20 md:left-5 ${editing ? 'bottom-4' : 'bottom-28'}`}>
        <TutorialCard />
      </div>

      <PauseOverlay />
      <DayReportCard />
      {/* key 로 손님이 바뀔 때마다 모달 내부 상태 초기화 */}
      {talkingTo && <ConversationModal key={talkingTo} guestId={talkingTo} />}
      {guestbookFor && <GuestbookModal key={guestbookFor} storeId={guestbookFor} storeName={guestbookName} />}
    </div>
  );
}
