import { useEffect, useState } from 'react';
import { BOOKS } from '../../data/books';
import { DRINKS } from '../../data/drinks';
import { CURATION_EVENTS, EPISODES, GUESTS } from '../../data/guests';
import { getLines } from '../../data/scripts';
import { gradeCuration } from '../../systems/guests/curation';
import { MAX_FRIENDSHIP_LEVEL, expToNext, nextCurationEvent, pickGreeting } from '../../systems/guests/friendship';
import { availableBooks } from '../../systems/interior/connections';
import { useGameStore, type CurationOutcome } from '../../store/useGameStore';
import { useLayoutAnalysis } from '../../store/useLayoutAnalysis';
import type { Expression } from '../../types/character';
import type { Book, DialogueLine, DrinkId } from '../../types/content';
import type { CurationEvent, GuestDefinition, GuestProgress } from '../../types/guest';
import { CharacterPortrait } from '../characters/CharacterPortrait';
import { Button } from '../ui/Button';
import { HeartMeter } from '../ui/HeartMeter';
import { Modal } from './Modal';
import styles from './ConversationModal.module.css';

type Phase = 'dialogue' | 'curation' | 'result';

const GRADE_EXPRESSION = { perfect: 'happy', good: 'happy', miss: 'sad' } as const;

/** 지금 줄까지 손님이 마지막으로 지은 표정 */
function guestExpression(lines: DialogueLine[], upTo: number): Expression {
  for (let i = upTo; i >= 0; i--) {
    if (lines[i]?.speaker === 'guest') return lines[i].emotion ?? 'neutral';
  }
  return 'neutral';
}

interface ConversationModalProps {
  guestId: string;
}

/**
 * 대화 → 도서 추천 → 결과 3단계 팝업.
 * 아직 단골이 아닌 손님이면 캐스팅: 취향을 듣고 맞는 책을 건네면 단골이 된다.
 */
export function ConversationModal({ guestId }: ConversationModalProps) {
  const guest = GUESTS[guestId];
  const progress = useGameStore((s) => s.guestProgress[guestId]);
  const close = useGameStore((s) => s.closeConversation);
  const resolveCuration = useGameStore((s) => s.resolveCuration);
  const resolveCasting = useGameStore((s) => s.resolveCasting);
  const analysis = useLayoutAnalysis();

  // 모달을 연 시점의 대화 구성을 고정 (결과 반영 후 레벨이 올라도 흐름이 바뀌지 않게)
  const [session] = useState(() => {
    if (!progress.isRegular) {
      const event = CURATION_EVENTS[guest.castingEvent];
      return { event, lines: getLines(event.introScriptId), casting: true };
    }
    const event = nextCurationEvent(guest, progress, CURATION_EVENTS);
    const lines = [
      ...getLines(pickGreeting(guest, progress.friendshipLevel)),
      ...(event ? getLines(event.introScriptId) : []),
    ];
    return { event, lines, casting: false };
  });

  const [phase, setPhase] = useState<Phase>('dialogue');
  const [line, setLine] = useState(0);
  const [book, setBook] = useState<Book | null>(null);
  const [quote, setQuote] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<CurationOutcome | null>(null);

  const { event, lines, casting } = session;
  const isLastLine = line >= lines.length - 1;
  const expression: Expression =
    phase === 'dialogue' ? guestExpression(lines, line) : phase === 'result' && outcome ? GRADE_EXPRESSION[outcome.grade] : 'neutral';

  const handOver = () => {
    if (!book || !event) return;
    const grade = gradeCuration(book, event, guest.preferences);
    setOutcome(casting ? resolveCasting(guest.id, grade) : resolveCuration(guest.id, event.id, grade));
    setPhase('result');
  };

  const footer =
    phase === 'dialogue' ? (
      <>
        <Button variant="ghost" onClick={close}>
          대화 마치기
        </Button>
        {!isLastLine ? (
          <Button onClick={() => setLine((l) => l + 1)}>다음 ▶</Button>
        ) : event ? (
          <Button onClick={() => setPhase('curation')}>📖 책 추천하기</Button>
        ) : (
          <Button onClick={close}>또 와요!</Button>
        )}
      </>
    ) : phase === 'curation' ? (
      <>
        <Button variant="ghost" onClick={() => setPhase('dialogue')}>
          ← 대화로
        </Button>
        <Button disabled={!book || !quote} onClick={handOver}>
          🎁 건네주기
        </Button>
      </>
    ) : (
      <Button onClick={close}>고마워요, 또 와요!</Button>
    );

  return (
    <Modal
      open
      onClose={close}
      label={`대화: ${guest.name}`}
      header={<GuestHeader guest={guest} progress={progress} menu={analysis.menu} expression={expression} candidate={casting && !outcome?.casting} />}
      footer={footer}
    >
      {phase === 'dialogue' && lines.length > 0 && <DialogueView guestName={guest.name} lines={lines} line={line} />}
      {phase === 'curation' && event && (
        <CurationView
          guest={guest}
          event={event}
          casting={casting}
          books={availableBooks(analysis.shelf, BOOKS)}
          book={book}
          quote={quote}
          onPickBook={(b) => {
            setBook(b);
            setQuote(null);
          }}
          onPickQuote={setQuote}
        />
      )}
      {phase === 'result' && event && book && quote && outcome && (
        <ResultView guest={guest} event={event} book={book} quote={quote} outcome={outcome} progress={progress} />
      )}
    </Modal>
  );
}

interface GuestHeaderProps {
  guest: GuestDefinition;
  progress: GuestProgress;
  menu: DrinkId[];
  expression: Expression;
  /** 아직 단골이 아닌 처음 온 손님 */
  candidate?: boolean;
}

function GuestHeader({ guest, progress, menu, expression, candidate }: GuestHeaderProps) {
  const need = expToNext(progress.friendshipLevel);
  const drink = guest.preferences.favoriteDrinks.find((d) => menu.includes(d)) ?? guest.preferences.favoriteDrinks[0];

  return (
    <div className={styles.guestHeader}>
      <span className={styles.portrait}>
        <CharacterPortrait look={guest.look} expression={expression} />
      </span>
      <div className={styles.guestInfo}>
        <p className={styles.guestTitle}>{guest.title}</p>
        <h2 className={styles.guestName}>{guest.name}</h2>
        {candidate ? (
          <p className={styles.candidate}>✨ 처음 온 손님 · 취향에 맞는 책을 추천하면 단골이 돼요</p>
        ) : (
          <div className={styles.friendship}>
            <HeartMeter value={progress.friendshipLevel} max={MAX_FRIENDSHIP_LEVEL} />
            <span className={styles.expBar} aria-label={need ? `경험치 ${progress.exp} / ${need}` : '최대 친밀도'}>
              <span style={{ width: need ? `${(progress.exp / need) * 100}%` : '100%' }} />
            </span>
          </div>
        )}
        {drink && (
          <p className={styles.drink}>
            {DRINKS[drink].emoji} {DRINKS[drink].name} 좋아함
            {!menu.includes(drink) && <span className={styles.offMenu}>메뉴에 없음</span>}
          </p>
        )}
        <p className={styles.traits}>
          {guest.personality.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </p>
      </div>
    </div>
  );
}

function DialogueView({ guestName, lines, line }: { guestName: string; lines: DialogueLine[]; line: number }) {
  const current = lines[line];
  const text = useTypewriter(current.text);
  const speaker = { guest: guestName, owner: '나 (사장)', narrator: null }[current.speaker];

  return (
    <div className={styles.dialogue}>
      {lines.slice(0, line).map((l, i) => (
        <p key={i} className={`${styles.pastLine} ${styles[l.speaker]}`}>
          {l.text}
        </p>
      ))}
      <div className={`${styles.speech} ${styles[`speech_${current.speaker}`]}`}>
        {speaker && <span className={styles.speaker}>{speaker}</span>}
        <p className={styles.speechText} aria-live="polite">
          {text}
          <span className={styles.caret} aria-hidden />
        </p>
      </div>
    </div>
  );
}

interface CurationViewProps {
  guest: GuestDefinition;
  event: CurationEvent;
  books: Book[];
  book: Book | null;
  quote: string | null;
  onPickBook: (b: Book) => void;
  onPickQuote: (q: string) => void;
  casting?: boolean;
}

function CurationView({ guest, event, books, book, quote, casting, onPickBook, onPickQuote }: CurationViewProps) {
  return (
    <div className={styles.curation}>
      <div className={styles.worry}>
        <span className={styles.worryPin} aria-hidden>
          📌
        </span>
        <p className={styles.worryLabel}>
          {guest.name}의 {casting ? '취향' : '고민'}
        </p>
        <p className={styles.worryText}>“{event.worry}”</p>
      </div>

      <h3 className={styles.step}>1. 어울리는 책을 골라주세요</h3>
      {books.length === 0 ? (
        <p className={styles.noBooks}>진열된 책이 없어요. ☰ 메뉴 → 🛍️ 상점에서 책장을 사서 🔨 인테리어로 놓아 주세요.</p>
      ) : (
        <div className={styles.shelf} role="radiogroup" aria-label="책 선택">
          {books.map((b) => (
            <button
              key={b.id}
              type="button"
              role="radio"
              aria-checked={book?.id === b.id}
              className={`${styles.book} ${styles[b.tone]} ${book?.id === b.id ? styles.picked : ''}`}
              onClick={() => onPickBook(b)}
            >
              <span className={styles.bookTitle}>{b.title}</span>
              <span className={styles.bookAuthor}>{b.author}</span>
              <span className={styles.tags}>
                {b.tags.map((t) => (
                  <span key={t}>#{t}</span>
                ))}
              </span>
            </button>
          ))}
        </div>
      )}

      {book && (
        <>
          <h3 className={styles.step}>2. 건넬 문장을 골라주세요</h3>
          <div className={styles.quotes} role="radiogroup" aria-label="문장 선택">
            {book.quotes.map((q) => (
              <button
                key={q}
                type="button"
                role="radio"
                aria-checked={quote === q}
                className={`${styles.quote} ${quote === q ? styles.quotePicked : ''}`}
                onClick={() => onPickQuote(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ResultViewProps {
  guest: GuestDefinition;
  event: CurationEvent;
  book: Book;
  quote: string;
  outcome: CurationOutcome;
  progress: GuestProgress;
}

const GRADE_EMOJI = { perfect: '🌷', good: '🌱', miss: '🍂' } as const;

function ResultView({ guest, event, book, quote, outcome, progress }: ResultViewProps) {
  const { grade, reward, levelsGained, newlyUnlocked } = outcome;
  const rewardText = [
    reward.exp && `♥ +${reward.exp}`,
    reward.coins && `🪙 +${reward.coins}`,
    reward.reputation && `⭐ +${reward.reputation}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={styles.result}>
      <span className={styles.resultEmoji} aria-hidden>
        {GRADE_EMOJI[grade]}
      </span>
      <blockquote className={styles.bookmark}>
        <p>{quote}</p>
        <cite>
          — 『{book.title}』, {book.author}
        </cite>
      </blockquote>
      <div className={styles.reaction}>
        {getLines(event.reactions[grade]).map((l, i) => (
          <p key={i} className={l.speaker === 'narrator' ? styles.narration : undefined}>
            {l.speaker === 'guest' ? `${guest.name}: ${l.text}` : l.text}
          </p>
        ))}
      </div>
      {outcome.casting === 'joined' && <p className={styles.levelUp}>🎉 {guest.name}이(가) 단골이 되었어요! 내일부터 매일 찾아와요.</p>}
      {outcome.casting === 'left' && <p className={styles.unlock}>오늘은 돌아갔어요. 취향에 맞는 책을 준비해 두면 다른 날 다시 올 거예요.</p>}
      {rewardText && <p className={styles.reward}>{rewardText}</p>}
      {levelsGained > 0 && <p className={styles.levelUp}>💗 친밀도 Lv.{progress.friendshipLevel} 달성!</p>}
      {newlyUnlocked.map((id) => (
        <p key={id} className={styles.unlock}>
          🔓 새 에피소드 「{EPISODES[id].title}」
        </p>
      ))}
    </div>
  );
}

/** 한 글자씩 출력되는 대사 효과 */
function useTypewriter(text: string, speed = 35) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(0);
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed]);

  return text.slice(0, count);
}
