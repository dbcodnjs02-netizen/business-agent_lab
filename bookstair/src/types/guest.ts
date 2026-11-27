import type { CharacterAction, CharacterLook, ChatterLine } from './character';
import type { BookTag, DrinkId, ScriptId } from './content';

export type GuestId = string;
export type EpisodeId = string;
export type CurationEventId = string;

export interface GuestPreferences {
  favoriteDrinks: DrinkId[];
  /** 좋아하는 책 태그 — 큐레이션 점수 가산 */
  likedBookTags: BookTag[];
  /** 싫어하는 책 태그 — 포함되면 큐레이션 실패 */
  dislikedBookTags: BookTag[];
}

/** 친밀도 레벨에 따라 바뀌는 기본 인사 대사 */
export interface GreetingLink {
  minLevel: number;
  scriptId: ScriptId;
}

/**
 * 손님의 정적 정의 (콘텐츠). 게임 중에 바뀌지 않으며 세이브하지 않는다.
 * 대사·에피소드·큐레이션 이벤트는 ID로만 연결한다.
 */
export interface GuestDefinition {
  id: GuestId;
  name: string;
  /** 짧은 수식어 (예: "늦깎이 대학원생") */
  title: string;
  /** 2등신 캐릭터 외형 */
  look: CharacterLook;
  /** 성격 키워드 (프로필 카드에 표시) */
  personality: string[];
  /** 한두 문장 소개 */
  bio: string;
  /** 매장에 앉아 있을 때의 버릇 (책 읽기, 차 마시기, 그림 그리기 …) */
  idleAction: CharacterAction;
  /** 매장에서 가끔 하는 혼잣말 */
  chatter: ChatterLine[];
  preferences: GuestPreferences;
  /** 최소 1개 필수 */
  greetings: [GreetingLink, ...GreetingLink[]];
  /** 해제 순서대로 */
  episodes: EpisodeId[];
  /** 진행 순서대로 — 앞에서부터 아직 완료하지 않은 이벤트가 나온다 */
  curationEvents: CurationEventId[];
  /** 처음 왔을 때 취향을 듣고 책을 추천하는 캐스팅 — 성공하면 단골이 된다 */
  castingEvent: CurationEventId;
}

/** 친밀도 레벨 달성 시 해제되는 서브 스토리 */
export interface Episode {
  id: EpisodeId;
  title: string;
  summary: string;
  requiredLevel: number;
  scriptId: ScriptId;
}

export type CurationGrade = 'perfect' | 'good' | 'miss';

export interface Reward {
  exp?: number;
  coins?: number;
  reputation?: number;
}

/** 손님의 고민 → 책/문장 추천 이벤트 */
export interface CurationEvent {
  id: CurationEventId;
  requiredLevel: number;
  /** 고민을 털어놓는 대사 (인사 뒤에 이어짐) */
  introScriptId: ScriptId;
  worry: string;
  /** 이 고민에 맞는 책 태그 */
  needTags: BookTag[];
  /** 결과 등급별 반응 대사 */
  reactions: Record<CurationGrade, ScriptId>;
  /** 생략 시 기본 보상 사용 */
  rewards?: Partial<Record<CurationGrade, Reward>>;
}

/** 손님별 진행 상태 (세이브 대상) */
export interface GuestProgress {
  guestId: GuestId;
  /** 캐스팅에 성공해 단골이 되었는지 */
  isRegular: boolean;
  friendshipLevel: number;
  /** 현재 레벨 안에서 모은 경험치 */
  exp: number;
  unlockedEpisodes: EpisodeId[];
  completedCurations: CurationEventId[];
  visitCount: number;
}
