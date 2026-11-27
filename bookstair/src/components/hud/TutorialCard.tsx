import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { FURNITURE } from '../../data/furniture';
import { CURATION_EVENTS, GUESTS } from '../../data/guests';
import { analyzeLayout } from '../../systems/interior/connections';
import { tutorialProgress, type TutorialStep } from '../../systems/tutorial/tutorial';
import { roomOf, useGameStore } from '../../store/useGameStore';
import { CharacterPortrait } from '../characters/CharacterPortrait';
import { Button } from '../ui/Button';

/** 튜토리얼 안내는 동네 터줏대감 도겸 할아버지가 맡는다 */
const GUIDE = GUESTS.dogyeom;

const TEXT: Record<Exclude<TutorialStep, 'welcome' | 'done'>, { title: string; body: string }> = {
  desks: {
    title: '① 책상 2개 놓기',
    body: '오른쪽 보관함에서 원목 책상을 끌어다 바닥에 놓아 보게. 손님들이 책을 펼칠 자리라네.',
  },
  chairs: {
    title: '② 의자 4개를 책상에 붙이기',
    body: '책상 바로 위쪽 칸에 놓으면 곧장 이어지고, 아래쪽에 놓을 땐 R(또는 우클릭 → 회전)로 책상을 보게 돌리게. 이어지면 🔗 가 뜬다네. 초록 점선 칸이 자리 후보야.',
  },
  coffee: {
    title: '③ 커피머신 놓기',
    body: '커피머신 카운터를 놓게. 앞 한 칸은 비워 둬야 내가… 아니, 자네가 커피를 내리고 손님이 계산할 수 있지.',
  },
  open: {
    title: '④ 문 열기',
    body: '준비 끝! 오른쪽 위 ✓ 편집 완료를 누르면 가게 문을 연다네.',
  },
  serve: {
    title: '⑤ 첫 손님 맞이',
    body: '앉아서 책을 읽던 손님이 음료를 주문하면 왼쪽 위에 주문표가 생겨. 커피머신 앞에서 Space(또는 클릭)로 내리고, 완성되면 다시 Space로 들어서 손님 옆에서 Space로 건네게.',
  },
  grow: {
    title: '⑥ 가게를 4레벨까지 키우기',
    body: '손님에게 음료나 책을 건넬 때마다 가게 경험치가 쌓인다네. 4레벨이 되면 소문을 듣고 동물 손님이 찾아올 게야. 레벨이 오를수록 가게도 넓어지지!',
  },
  meet: {
    title: '⑦ 처음 온 손님 이야기 듣기',
    body: '저기 ✨ 가 뜬 손님 보이나? 처음 온 손님이야. 눌러서 무슨 책을 좋아하는지 들어 보게. 잘 기억해 두라고.',
  },
  shelf: {
    title: '⑧ 취향에 맞는 책장 놓기',
    body: '그 손님 취향에 맞는 책이 꽂힌 책장을 ☰ 메뉴 → 🛍️ 상점에서 사서, 🔨 인테리어로 벽에 붙여 놓게. 책장 앞 한 칸은 비워 두고.',
  },
  cast: {
    title: '⑨ 책 추천해서 단골 만들기',
    body: '이제 그 손님에게 다시 말을 걸어 📖 책 추천하기! 취향에 맞으면 단골이 된다네. 틀려도 괜찮아, 다른 날 또 올 테니.',
  },
};

/** 첫 영업 튜토리얼 안내 카드 */
export function TutorialCard() {
  const step = useGameStore((s) => s.tutorial);
  const editing = useGameStore((s) => s.activeTab === 'interior');
  const layout = useGameStore((s) => s.layout);
  const ownerServes = useGameStore((s) => s.ownerServes);
  const guestProgress = useGameStore((s) => s.guestProgress);
  const guestsInCafe = useGameStore((s) => s.guestsInCafe);
  const setScreen = useGameStore((s) => s.setScreen);
  const startTutorial = useGameStore((s) => s.startTutorial);
  const skipTutorial = useGameStore((s) => s.skipTutorial);
  const setTab = useGameStore((s) => s.setTab);
  const level = useGameStore((s) => s.level);
  // 레벨 올리는 단계는 오래 걸리니 작게 접어 둘 수 있다
  const [folded, setFolded] = useState(false);

  // 마지막 단계를 마친 순간에만 축하 카드를 띄운다 (건너뛰기는 제외)
  const prev = useRef(step);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (prev.current === 'cast' && step === 'done') setFinished(true);
    prev.current = step;
  }, [step]);

  if (step === 'welcome') {
    return (
      <div className="pointer-events-auto fixed inset-0 z-40 grid place-items-center bg-wood-900/30 backdrop-blur-[2px]">
        <div className="glass-strong w-[min(420px,calc(100vw-2rem))] animate-rise rounded-3xl p-6 text-center" role="dialog" aria-label="튜토리얼 시작">
          <Guide size="lg" />
          <p className="mt-3 text-sm text-ink-faint">{GUIDE.title} · {GUIDE.name}</p>
          <p className="mt-2 font-book text-lg leading-relaxed">
            허허, 새 가게 주인이구먼! 아직 텅 비었네.
            <br />
            책상이랑 의자, 커피머신부터 같이 놓아 보세.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="ghost" onClick={skipTutorial}>
              건너뛰기
            </Button>
            <Button onClick={startTutorial}>🔨 가게 꾸미기 시작</Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'done') {
    if (!finished) return null;
    return (
      <Card>
        <p className="font-bold">🎉 첫 단골이 생겼구먼!</p>
        <p className="mt-1 text-sm leading-relaxed">
          잘했네! 단골은 매일 찾아오고, 친해지면 고민도 털어놓는다네. 아직 단골이 아닌 손님도 날마다 한 명씩 찾아올 테니, 취향을 잘 듣고 맞는 책장을 늘려 가게.
        </p>
        <div className="mt-3 flex justify-end">
          <Button size="sm" onClick={() => setFinished(false)}>
            알겠어요
          </Button>
        </div>
      </Card>
    );
  }

  const count = (kind: string) => layout.filter((p) => FURNITURE[p.furnitureId]?.role.kind === kind).length;
  const progress = tutorialProgress(step, {
    desks: count('desk'),
    linkedSeats: analyzeLayout(layout, roomOf(level)).seatSlots.length,
    brewers: count('brewer'),
    editing,
    served: ownerServes,
    met: Object.values(guestProgress).some((p) => p.visitCount > 0),
    shelves: count('bookshelf'),
    regulars: Object.values(guestProgress).filter((p) => p.isRegular).length,
    level,
  });
  // 지금 와 있는 단골 후보의 취향 (책장 고를 때 참고)
  const candidate = guestsInCafe.find((id) => !guestProgress[id]?.isRegular);
  const taste = candidate && (step === 'shelf' || step === 'cast') ? CURATION_EVENTS[GUESTS[candidate].castingEvent].worry : null;
  const needsEditing = step === 'desks' || step === 'chairs' || step === 'coffee';

  if (step === 'grow' && folded) {
    return (
      <button
        type="button"
        className="glass-strong pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold"
        onClick={() => setFolded(false)}
      >
        {TEXT.grow.title} <span className="rounded-full bg-mint px-2 py-0.5 text-xs tabular-nums">Lv.{Math.min(level, 4)} / 4</span>
      </button>
    );
  }

  return (
    <Card>
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-bold">{TEXT[step].title}</p>
        {progress && (
          <span className="rounded-full bg-mint px-2 py-0.5 text-xs font-bold tabular-nums">
            {progress.count} / {progress.goal}
          </span>
        )}
      </div>
      {progress && (
        <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-beige-300">
          <span className="block h-full rounded-full bg-mint-deep transition-[width]" style={{ width: `${(progress.count / progress.goal) * 100}%` }} />
        </span>
      )}
      <p className="mt-2 text-sm leading-relaxed">{TEXT[step].body}</p>
      {taste && (
        <p className="mt-2 rounded-xl bg-butter/60 px-3 py-1.5 font-book text-sm">
          📌 {GUESTS[candidate!].name}: “{taste}”
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" className="text-xs text-ink-faint hover:text-ink" onClick={skipTutorial}>
          튜토리얼 건너뛰기
        </button>
        {needsEditing && !editing && (
          <Button size="sm" onClick={() => setTab('interior')}>
            🔨 인테리어로 돌아가기
          </Button>
        )}
        {step === 'shelf' && (
          <span className="flex gap-1.5">
            <Button
              size="sm"
              variant="soft"
              onClick={() => {
                setTab('shop');
                setScreen('menu');
              }}
            >
              🛍️ 상점
            </Button>
            {!editing && (
              <Button size="sm" onClick={() => setTab('interior')}>
                🔨 인테리어
              </Button>
            )}
          </span>
        )}
        {step === 'grow' && (
          <Button size="sm" variant="soft" onClick={() => setFolded(true)}>
            접어 두기
          </Button>
        )}
        {step === 'open' && editing && (
          <Button size="sm" onClick={() => setTab('cafe')}>
            ✓ 편집 완료
          </Button>
        )}
      </div>
    </Card>
  );
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="glass-strong pointer-events-auto flex w-[min(360px,calc(100vw-1.5rem))] animate-rise gap-3 rounded-3xl p-4" role="status">
      <Guide />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Guide({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <span
      className={`mx-auto grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-mint to-butter ring-4 ring-cream ${
        size === 'lg' ? 'size-20' : 'size-12'
      }`}
    >
      <CharacterPortrait look={GUIDE.look} expression="happy" />
    </span>
  );
}
