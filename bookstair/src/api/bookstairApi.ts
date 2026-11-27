import { NEIGHBOR_STORES } from '../data/neighbors';
import type { Tone } from '../types/content';
import type { GuestNote, StoreSnapshot } from '../types/social';

/**
 * 서버와 주고받을 기능의 경계.
 * 지금은 localApi(브라우저 저장소 목업)를 쓰고, 백엔드가 생기면 같은 인터페이스로
 * fetch 구현을 만들어 `api` 만 바꿔 끼우면 된다.
 */
export interface BookstairApi {
  listNeighbors(): Promise<StoreSnapshot[]>;
  getStore(storeId: string): Promise<StoreSnapshot | null>;
  listGuestbook(storeId: string): Promise<GuestNote[]>;
  postGuestbook(note: Omit<GuestNote, 'id' | 'createdAt'>): Promise<GuestNote>;
}

const GUESTBOOK_KEY = 'bookstair-guestbook';

/** 방명록이 비어 있는 서점에 처음 보여줄 메모 */
const WELCOME_NOTES: Pick<GuestNote, 'author' | 'text' | 'color'>[] = [
  { author: '모모 (달빛 서점)', text: '개업 축하해요! 소파 배치 너무 아늑하다 🛋️', color: 'butter' },
  { author: '냥사장 (고양이 책방)', text: '다음에 우리 책방에도 놀러 와요 🐈', color: 'mint' },
];

export function createLocalApi(storage: () => Storage | undefined = () => globalThis.localStorage): BookstairApi {
  const readAll = (): Record<string, GuestNote[]> => {
    try {
      const raw = storage()?.getItem(GUESTBOOK_KEY);
      return raw ? (JSON.parse(raw) as Record<string, GuestNote[]>) : {};
    } catch {
      return {};
    }
  };
  const writeAll = (all: Record<string, GuestNote[]>) => {
    try {
      storage()?.setItem(GUESTBOOK_KEY, JSON.stringify(all));
    } catch {
      // 저장 불가(사생활 보호 모드 등) — 이번 세션에서만 보임
    }
  };
  let memory = readAll();

  const newId = () => `note-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  return {
    async listNeighbors() {
      return NEIGHBOR_STORES;
    },
    async getStore(storeId) {
      return NEIGHBOR_STORES.find((s) => s.storeId === storeId) ?? null;
    },
    async listGuestbook(storeId) {
      if (!memory[storeId]) {
        memory = {
          ...memory,
          [storeId]: WELCOME_NOTES.map((n, i) => ({
            ...n,
            id: `welcome-${i}`,
            storeId,
            createdAt: new Date(Date.now() - (i + 1) * 3_600_000).toISOString(),
          })),
        };
        writeAll(memory);
      }
      return [...memory[storeId]].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async postGuestbook(input) {
      const note: GuestNote = { ...input, text: input.text.slice(0, 120), id: newId(), createdAt: new Date().toISOString() };
      memory = { ...memory, [input.storeId]: [...(memory[input.storeId] ?? []), note] };
      writeAll(memory);
      return note;
    },
  };
}

export const NOTE_COLORS: Tone[] = ['butter', 'rose', 'mint', 'sky', 'lavender', 'peach'];

export const api: BookstairApi = createLocalApi();
