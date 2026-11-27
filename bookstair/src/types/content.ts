/** 가구·책 카드 등에 쓰는 파스텔 색 키 (tokens.css 와 대응) */
export type Tone = 'wood' | 'mint' | 'peach' | 'butter' | 'lavender' | 'rose' | 'sky';

export type BookTag = '시작' | '용기' | '도전' | '일상' | '위로' | '휴식' | '그리움';

export interface Book {
  id: string;
  title: string;
  author: string;
  tone: Tone;
  tags: BookTag[];
  quotes: string[];
}

export type DrinkId = 'americano' | 'barley-latte' | 'chamomile' | 'hot-choco' | 'yuja-tea';

export interface Drink {
  id: DrinkId;
  name: string;
  emoji: string;
  price: number;
}

/** 대사 스크립트 ID — `guest.greet.0`, `seoyun.cur.late-start.perfect` 같은 점 표기 */
export type ScriptId = string;

export type Emotion = 'neutral' | 'happy' | 'sad' | 'surprised' | 'shy';

export interface DialogueLine {
  speaker: 'guest' | 'owner' | 'narrator';
  text: string;
  /** 초상화 표정 전환용 (추후 일러스트 연결) */
  emotion?: Emotion;
}

export interface DialogueScript {
  id: ScriptId;
  lines: DialogueLine[];
}
