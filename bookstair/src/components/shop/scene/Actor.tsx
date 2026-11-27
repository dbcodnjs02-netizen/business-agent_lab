import type { KeyboardEvent } from 'react';
import type { CharacterAction, CharacterLook, Expression, IsoFacing, Pose } from '../../../types/character';
import { CharacterSprite } from '../../characters/CharacterSprite';
import { useCamera } from './view';

interface ActorProps {
  /** 연속 그리드 좌표 (칸 중심 = 정수 + 0.5) */
  x: number;
  y: number;
  /** 앉아 있으면 좌석 높이 */
  z?: number;
  look: CharacterLook;
  facing?: IsoFacing;
  pose?: Pose;
  action?: CharacterAction;
  expression?: Expression;
  bookColor?: string;
  name?: string;
  /** 머리 위 작은 아이콘 (💬, 🪙 …) */
  bubble?: string;
  /** 아이콘을 생각 풍선 모양으로 */
  thought?: boolean;
  /** 말풍선 대사 */
  say?: string;
  label?: string;
  onClick?: () => void;
  /** 위치가 바뀔 때 부드럽게 이동 (초) */
  glide?: number;
  /** 깜빡임·숨쉬기가 캐릭터마다 어긋나도록 (초) */
  phase?: number;
  /** 이웃한 캐릭터와 이름표가 겹치지 않게 올리는 높이 */
  tagLift?: number;
  /** 아이콘 옆 작은 글씨 (예: "#위로") */
  bubbleTag?: string;
  /** 아이콘 아래 막대 (0~1) — 손님 인내심 또는 작업 진행도 */
  meter?: number;
  meterTone?: 'patience' | 'progress';
  /** 플레이어 캐릭터 — 발밑에 표시 */
  owner?: boolean;
}

const NAME_Y = -62;
/** 매장(타일)에 비해 캐릭터를 크게 — 2등신 캐릭터가 주인공처럼 보이게 */
const CHAR_SCALE = 1.3;

/** 매장 바닥 위의 캐릭터 + 이름표 · 말풍선 */
export function Actor({
  x,
  y,
  z = 0,
  look,
  facing,
  pose = 'stand',
  action,
  expression,
  bookColor,
  name,
  bubble,
  thought,
  say,
  label,
  onClick,
  glide,
  phase = 0,
  tagLift = 0,
  bubbleTag,
  meter,
  meterTone = 'patience',
  owner,
}: ActorProps) {
  const { project, scaleAt } = useCamera();
  const [sx, sy] = project(x, y, z);
  const k = scaleAt(x, y, z) * CHAR_SCALE;
  const interactive = Boolean(onClick);
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };
  const nameW = name ? name.length * 12 + 20 : 0;
  const nameY = NAME_Y - tagLift;

  return (
    <g
      style={{ transform: `translate(${sx}px, ${sy}px) scale(${k.toFixed(3)})`, transition: glide ? `transform ${glide}s linear` : undefined }}
      className={interactive ? 'cursor-pointer outline-none [&:focus-visible_text]:underline' : 'pointer-events-none'}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      onClick={
        onClick &&
        ((e) => {
          e.stopPropagation(); // 바닥 클릭(걸어가기)으로 번지지 않게
          onClick();
        })
      }
      onKeyDown={interactive ? onKey : undefined}
    >
      {owner && <ellipse cx={0} cy={0} rx={17} ry={7} fill="rgba(247, 230, 166, 0.55)" stroke="#d9b443" strokeWidth={1.5} />}
      <ellipse cx={0} cy={0} rx={pose === 'sit' ? 0 : 12} ry={5} fill="rgba(78, 51, 36, 0.16)" />
      {interactive && <rect x={-15} y={-52} width={30} height={54} fill="transparent" />}

      <g className={pose === 'walk' ? 'animate-walk' : 'animate-breathe'} style={{ animationDelay: `${-phase}s` }}>
        <CharacterSprite
          look={look}
          facing={facing}
          pose={pose}
          action={action}
          expression={expression}
          bookColor={bookColor}
          phase={phase}
        />
      </g>

      {name && (
        <g transform={`translate(0 ${nameY})`}>
          <rect x={-nameW / 2} y={-9} width={nameW} height={17} rx={8.5} fill="rgba(255, 250, 241, 0.92)" stroke="rgba(122, 81, 54, 0.3)" />
          <text y={3.5} textAnchor="middle" fontSize={11} fill="#4a3428">
            {name}
          </text>
        </g>
      )}
      {bubble && (
        <IconBubble
          x={name ? nameW / 2 + 12 + (bubbleTag ? bubbleTag.length * 4 : 0) : 0}
          y={name ? nameY - 4 : nameY}
          icon={bubble}
          tag={bubbleTag}
          thought={thought}
          meter={meter}
          meterTone={meterTone}
        />
      )}
      {!bubble && meter !== undefined && <Meter y={nameY + 12} value={meter} tone={meterTone} />}
      {say && <SpeechBubble y={name ? nameY - 14 : nameY + 4} text={say} />}
    </g>
  );
}

interface IconBubbleProps {
  x: number;
  y: number;
  icon: string;
  tag?: string;
  thought?: boolean;
  meter?: number;
  meterTone: 'patience' | 'progress';
}

function IconBubble({ x, y, icon, tag, thought, meter, meterTone }: IconBubbleProps) {
  const w = tag ? 26 + tag.length * 9 : 22;
  return (
    <g transform={`translate(${x} ${y})`}>
      {meter !== undefined && <Meter y={15} value={meter} tone={meterTone} />}
      <g className={meter === undefined ? 'animate-pop' : undefined} style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
        <rect x={-w / 2} y={-11} width={w} height={22} rx={11} fill="rgba(255, 250, 241, 0.95)" stroke="rgba(122, 81, 54, 0.35)" />
        {thought ? (
          <>
            <circle cx={-8} cy={11} r={2.6} fill="rgba(255, 250, 241, 0.95)" stroke="rgba(122, 81, 54, 0.35)" />
            <circle cx={-11.5} cy={15.5} r={1.5} fill="rgba(255, 250, 241, 0.95)" stroke="rgba(122, 81, 54, 0.35)" />
          </>
        ) : (
          <path d="M -7 7 L -11 13 L -2 9.5" fill="rgba(255, 250, 241, 0.95)" stroke="rgba(122, 81, 54, 0.35)" strokeLinejoin="round" />
        )}
        <text x={tag ? -w / 2 + 12 : 0} y={4.5} textAnchor="middle" fontSize={12}>
          {icon}
        </text>
        {tag && (
          <text x={-w / 2 + 22} y={4} fontSize={10.5} fontWeight={700} fill="#7a5136">
            {tag}
          </text>
        )}
      </g>
    </g>
  );
}

/** 인내심(초록→노랑→빨강) 또는 진행도 막대 */
function Meter({ y, value, tone }: { y: number; value: number; tone: 'patience' | 'progress' }) {
  const v = Math.max(0, Math.min(1, value));
  const color = tone === 'progress' ? '#7fb08a' : v > 0.5 ? '#7fb08a' : v > 0.25 ? '#d9b443' : '#d97a8c';
  return (
    <g transform={`translate(0 ${y})`}>
      <rect x={-15} y={-2.5} width={30} height={5} rx={2.5} fill="rgba(255, 250, 241, 0.95)" stroke="rgba(122, 81, 54, 0.35)" strokeWidth={0.8} />
      <rect x={-14} y={-1.5} width={28 * v} height={3} rx={1.5} fill={color} />
    </g>
  );
}

/** 혼잣말 말풍선 — 아래 꼬리가 캐릭터를 가리킨다 */
function SpeechBubble({ y, text }: { y: number; text: string }) {
  const w = Math.min(240, [...text].length * 10.5 + 18);
  return (
    <g transform={`translate(0 ${y})`}>
      <g className="animate-say" style={{ transformBox: 'fill-box', transformOrigin: 'bottom center' }}>
        <path
          d={`M ${-w / 2 + 10} -24 H ${w / 2 - 10} Q ${w / 2} -24 ${w / 2} -14 Q ${w / 2} -4 ${w / 2 - 10} -4 H 5 L 0 2 L -5 -4 H ${-w / 2 + 10} Q ${-w / 2} -4 ${-w / 2} -14 Q ${-w / 2} -24 ${-w / 2 + 10} -24 Z`}
          fill="rgba(255, 250, 241, 0.97)"
          stroke="rgba(122, 81, 54, 0.4)"
        />
        <text y={-10} textAnchor="middle" fontSize={11} fill="#4a3428">
          {text}
        </text>
      </g>
    </g>
  );
}
