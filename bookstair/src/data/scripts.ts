import type { DialogueLine, DialogueScript, ScriptId } from '../types/content';

/*
 * 대사 스크립트 레지스트리.
 * ID 규칙: <손님>.greet.<레벨> / <손님>.ep.<이름> / <큐레이션 이벤트 id>.<intro|perfect|good|miss>
 */

const g = (text: string, emotion?: DialogueLine['emotion']): DialogueLine => ({ speaker: 'guest', text, emotion });
const me = (text: string): DialogueLine => ({ speaker: 'owner', text });
const n = (text: string): DialogueLine => ({ speaker: 'narrator', text });

const RAW: Record<ScriptId, DialogueLine[]> = {
  // ── 서윤 ──
  'seoyun.greet.0': [
    g('안녕하세요, 사장님. 오늘도 창가 자리 비어 있네요.'),
    me('서윤 씨 자리라서 비워뒀죠. 오늘도 아메리카노?'),
  ],
  'seoyun.greet.3': [
    g('사장님! 오늘 실험 결과 잘 나왔어요. 자랑하러 왔어요.', 'happy'),
    me('어머, 축하해요. 오늘 커피는 제가 살게요.'),
  ],
  'seoyun.cast.intro': [
    g('저… 여기 처음 와 봤어요. 요즘 매일 같은 자리만 맴도는 기분이라서요.', 'shy'),
    g('다시 시작할 힘이 나는 책이 좋아요. 한 권 골라 주실래요?'),
  ],
  'seoyun.cast.perfect': [g('와, 딱 제 취향이에요! 여기… 자주 와도 돼요?', 'happy'), n('서윤은 창가 자리를 자기 자리로 정했다.')],
  'seoyun.cast.good': [g('괜찮네요. 또 올게요.')],
  'seoyun.cast.miss': [g('음… 오늘은 그냥 갈게요.', 'sad'), n('서윤은 조용히 문을 나섰다. 다른 날 또 올지도 모른다.')],
  'seoyun.greet.5': [
    g('사장님, 저 논문에 감사의 글 쓸 때 여기 이름 넣어도 돼요?', 'shy'),
    me('그럼요. 대신 북스테어 맞춤법 틀리면 안 돼요.'),
    g('헤헤, 세 번 확인할게요.', 'happy'),
  ],
  'seoyun.cur.late-start.intro': [
    g('사실… 동기들은 벌써 졸업하고 취업했거든요.', 'sad'),
    g('저만 제자리인 것 같아서요. 이런 마음일 때 읽을 만한 책, 있을까요?'),
  ],
  'seoyun.cur.late-start.perfect': [
    g('“늦게 피는 꽃”… 꼭 저한테 하는 말 같아요.', 'happy'),
    n('서윤은 책을 꼭 끌어안았다.'),
  ],
  'seoyun.cur.late-start.good': [g('조금은 힘이 나네요. 천천히 읽어볼게요.')],
  'seoyun.cur.late-start.miss': [g('음… 지금 제 얘기랑은 조금 다른 것 같아요.', 'sad')],
  'seoyun.cur.next-step.intro': [
    g('다음 달에 학회 발표를 하게 됐어요. 기쁜데, 무대에 설 생각만 하면 다리가 떨려요.', 'shy'),
  ],
  'seoyun.cur.next-step.perfect': [g('한 칸씩이면 되는 거죠? 발표 날 이 문장 들고 갈래요!', 'happy')],
  'seoyun.cur.next-step.good': [g('고마워요. 마음이 조금 가벼워졌어요.')],
  'seoyun.cur.next-step.miss': [g('위로는 되는데… 지금은 등을 떠밀어 줄 말이 필요했나 봐요.')],
  'seoyun.ep.notebook': [
    n('서윤이 두고 간 연구 노트. 빼곡한 메모 사이에 작은 낙서가 있다.'),
    n('“오늘도 북스테어에서 한 페이지.”'),
    me('…다음에 오면 돌려줘야겠다. 책갈피 하나 끼워서.'),
  ],
  'seoyun.ep.defense': [
    g('사장님, 내일 논문 심사예요. 오늘은 그냥 여기 앉아만 있다 갈게요.', 'shy'),
    me('그래요. 마감 시간 지나도 불 켜둘게요.'),
    n('그날 밤, 창가 자리의 스탠드는 늦게까지 꺼지지 않았다.'),
  ],

  // ── 도겸 할아버지 ──
  'dogyeom.greet.0': [
    g('허허, 오늘도 여기 커피 냄새가 제일 좋구먼.', 'happy'),
    me('어서 오세요, 할아버지. 늘 드시던 보리차 라떼로 드릴게요.'),
  ],
  'dogyeom.greet.3': [
    g('이 집 계단 오르는 게 요즘 내 출근길이야.'),
    me('그럼 저는 할아버지 직장 동료네요.'),
  ],
  'dogyeom.cast.intro': [
    g('허허, 이 골목에 새 가게가 생겼구먼.'),
    g('옛날 생각이 나고 마음이 따뜻해지는 책이면 좋겠는데. 도전이니 뭐니 하는 건 숨이 차서 말이야.'),
  ],
  'dogyeom.cast.perfect': [g('이거 참 좋구먼! 내일도 이 시간에 오겠네.', 'happy'), n('할아버지는 우체부 모자를 의자 등받이에 걸었다.')],
  'dogyeom.cast.good': [g('나쁘지 않네. 또 들르지.')],
  'dogyeom.cast.miss': [g('허허… 젊은 사람들 책이구먼.', 'sad'), n('할아버지는 천천히 계단을 내려갔다.')],
  'dogyeom.greet.5': [
    g('사장 양반, 이거 받게. 내가 마지막으로 쓴 우편 모자야.', 'happy'),
    me('이렇게 귀한 걸요? 계산대 위에 잘 걸어둘게요.'),
    g('허허, 이제 이 집이 내 우체국이구먼.'),
  ],
  'dogyeom.cur.long-day.intro': [
    g('평생 걷던 골목을 이제 안 걸으니, 하루가 참 길구먼.'),
    g('편지 대신 시간만 배달받는 기분이야. 뭐 읽을 만한 거 있나?'),
  ],
  'dogyeom.cur.long-day.perfect': [
    g('익숙한 길도 천천히 걸으면 처음 보는 풍경이라… 내일은 옛 배달길을 걸어봐야겠어.', 'happy'),
  ],
  'dogyeom.cur.long-day.good': [g('허허, 고맙네. 돋보기 끼고 읽어보지.')],
  'dogyeom.cur.long-day.miss': [g('젊은 사람들 책이구먼. 나한텐 좀 숨이 차.')],
  'dogyeom.ep.last-letter': [
    g('이거, 내가 마지막으로 배달 못 한 편지야. 주소지 집이 없어졌더라고.'),
    n('누렇게 바랜 봉투에는 “북스테어 2층”이라고 적혀 있다.'),
    me('…여기요? 이 건물이요?'),
  ],
  'dogyeom.ep.old-route': [
    g('같이 걸어주겠나? 내 옛 배달길.'),
    n('골목마다 할아버지의 이야기가 하나씩 놓여 있었다.'),
  ],

  // ── 하린 ──
  'harin.greet.0': [
    g('…아, 여기 앉아도 될까요? 조용한 데가 필요해서요.', 'shy'),
    me('물론이죠. 천천히 쉬다 가세요.'),
  ],
  'harin.greet.3': [
    g('사장님, 이거 받아요. 카페 그려봤어요.', 'happy'),
    n('스케치북 한 장에 북스테어의 계단이 따뜻한 색으로 그려져 있다.'),
  ],
  'harin.cast.intro': [
    g('…조용한 데를 찾다가 들어왔어요.', 'shy'),
    g('쉬어 가도 된다고 말해 주는 책이 있으면 좋겠어요.'),
  ],
  'harin.cast.perfect': [g('…이 문장, 그려 두고 싶어요. 또 와도 되죠?', 'happy'), n('하린의 스케치북 첫 장에 북스테어의 창문이 그려졌다.')],
  'harin.cast.good': [g('고마워요. 조금 쉬다 갈게요.')],
  'harin.cast.miss': [g('…지금은 힘내라는 말이 무거워요.', 'sad'), n('하린은 모자를 눌러쓰고 나갔다.')],
  'harin.greet.5': [
    g('사장님, 저 요즘 그림 그리는 게 다시 좋아졌어요.', 'happy'),
    g('…여기서 쉬는 법을 배운 것 같아요.', 'shy'),
    me('그럼 오늘은 쉬는 날로 해요. 유자차 서비스!'),
  ],
  'harin.cur.burnout.intro': [
    g('그림이 더 이상 즐겁지 않아요. 붓을 들기만 해도 지쳐요.', 'sad'),
    g('좋아하던 일이 숙제처럼 느껴지는 거, 이상한 거죠?'),
  ],
  'harin.cur.burnout.perfect': [
    g('쉼표가 없는 문장은 숨이 차다… 저 오늘은 그냥 쉬어도 되는 거죠.', 'happy'),
    n('하린의 어깨가 조금 내려앉았다.'),
  ],
  'harin.cur.burnout.good': [g('조금 위로가 돼요. 고마워요.')],
  'harin.cur.burnout.miss': [g('…지금은 힘내라는 말이 제일 무거워요.', 'sad')],
  'harin.ep.sketchbook': [
    n('하린이 놓고 간 스케치북. 첫 장에는 낙서 같은 고양이 한 마리.'),
    n('그 아래 작게: “그냥 좋아서 그린 그림.”'),
  ],
  'harin.ep.exhibition': [
    g('작은 전시를 하게 됐어요. 첫 그림은… 여기 계단이에요.', 'happy'),
    me('그럼 오프닝 날 커피는 북스테어가 책임질게요.'),
  ],
};

export const SCRIPTS: Record<ScriptId, DialogueScript> = Object.fromEntries(
  Object.entries(RAW).map(([id, lines]) => [id, { id, lines }]),
);

export function getLines(id: ScriptId): DialogueLine[] {
  return SCRIPTS[id]?.lines ?? [];
}
