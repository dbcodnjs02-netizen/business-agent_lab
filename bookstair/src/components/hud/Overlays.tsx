import type { ReactNode } from 'react';
import { CUSTOMER_TYPE_BY_ID } from '../../data/customers';
import { useGameStore } from '../../store/useGameStore';
import { CharacterPortrait } from '../characters/CharacterPortrait';
import { Button } from '../ui/Button';

/** 하루 영업이 끝나면 뜨는 결산 카드 */
export function DayReportCard() {
  const report = useGameStore((s) => s.dayReport);
  const startNextDay = useGameStore((s) => s.startNextDay);
  const setScreen = useGameStore((s) => s.setScreen);
  if (!report) return null;

  return (
    <Backdrop>
      <div className="glass-strong w-[min(420px,calc(100vw-2rem))] animate-rise rounded-3xl p-6 text-center" role="dialog" aria-label="오늘의 결산">
        <p className="text-sm text-ink-soft">🌙 영업 종료</p>
        <h2 className="mt-1 font-book text-2xl font-bold">{report.day}일차 결산</h2>
        <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
          <Stat label="매출" value={`🪙 ${report.sales.toLocaleString()}`} />
          <Stat label="계산한 손님" value={`${report.served}명`} />
          <Stat label="놓친 주문" value={`${report.missed}건`} warn={report.missed > 0} />
          {report.wages > 0 && <Stat label="알바 일당" value={`🪙 -${report.wages.toLocaleString()}`} />}
          {report.wages > 0 && <Stat label="순이익" value={`🪙 ${(report.sales - report.wages).toLocaleString()}`} warn={report.sales < report.wages} />}
          <Stat label="경험치" value={`+${report.exp}`} />
        </dl>
        {report.discovered.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-bold">📗 새로 도감에 등록된 손님</p>
            <ul className="mt-2 flex flex-wrap justify-center gap-3">
              {report.discovered.map((id) => (
                <li key={id} className="flex w-16 flex-col items-center text-[11px]">
                  <span className="size-12 overflow-hidden rounded-full bg-rose ring-2 ring-white">
                    <CharacterPortrait look={CUSTOMER_TYPE_BY_ID[id].look} expression="happy" />
                  </span>
                  <span className="mt-1 line-clamp-2">{CUSTOMER_TYPE_BY_ID[id].name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-5 text-xs text-ink-faint">
          {report.missed === 0 ? '모든 주문을 챙겼어요. 완벽한 하루!' : '기다리다 지친 손님만큼 평판이 조금 내려갔어요.'}
        </p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="soft" onClick={() => setScreen('menu')}>
            ☰ 메뉴 보기
          </Button>
          <Button onClick={startNextDay}>☀️ 다음 날 영업 시작</Button>
        </div>
      </div>
    </Backdrop>
  );
}

/** Esc · ⏸ 로 여는 일시정지 */
export function PauseOverlay() {
  const paused = useGameStore((s) => s.paused);
  const setPaused = useGameStore((s) => s.setPaused);
  const setScreen = useGameStore((s) => s.setScreen);
  if (!paused) return null;

  return (
    <Backdrop onClose={() => setPaused(false)}>
      <div className="glass-strong w-[min(380px,calc(100vw-2rem))] animate-rise rounded-3xl p-6" role="dialog" aria-label="일시정지">
        <h2 className="text-center font-book text-2xl font-bold">⏸ 잠깐 쉬어요</h2>
        <ul className="mt-4 space-y-1.5 text-sm text-ink-soft">
          <li>🚶 WASD·방향키로 걷거나, 바닥을 눌러 이동</li>
          <li>☕ 커피머신 앞 Space → 음료 내리기 → 완성되면 다시 Space로 들기</li>
          <li>📕 책을 부탁한 손님이 있으면 그 장르 책장 앞에서 Space</li>
          <li>💝 기다리는 손님 옆에서 Space로 건네기 — 빠를수록 팁!</li>
          <li>💬 소파의 단골은 눌러서 대화 · Q 들고 있는 것 내려놓기</li>
        </ul>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="soft" onClick={() => (setPaused(false), setScreen('menu'))}>
            ☰ 메뉴
          </Button>
          <Button onClick={() => setPaused(false)}>▶ 계속하기</Button>
        </div>
      </div>
    </Backdrop>
  );
}

function Backdrop({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  return (
    <div className="absolute inset-0 z-30 grid place-items-center bg-wood-900/35 backdrop-blur-[2px]" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      {children}
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-2xl bg-white/60 px-2 py-3">
      <dt className="text-[11px] text-ink-faint">{label}</dt>
      <dd className={`mt-1 font-bold ${warn ? 'text-rose-deep' : ''}`}>{value}</dd>
    </div>
  );
}
