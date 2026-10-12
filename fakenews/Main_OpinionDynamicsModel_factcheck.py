"""
사회경제 시뮬레이션 - 가짜뉴스 확산과 팩트체크 개입 시점
Opinion Dynamics Model (Bounded Confidence / Deffuant 계열) 행위자 기반 모델
(교수님 제공 인플루언서 모델 Main_OpinionDynamicsModel_influencer.py 를 변형)

원본에서 유지한 것
- 가상 인구, 의견 0~100, 의견 차가 임계값 이하일 때만 대화, 차이의 pull 만큼 이동
- 같은 seed 면 초기 인구(의견, 위치)가 조건과 상관없이 똑같다 (조건 간 쌍체 비교)
- 화면(GUI)과 반복 실험(--batch) 이 같은 OpinionModel 을 쓴다, 95% 부트스트랩 신뢰구간

바뀐 것
- 의견 = "가짜뉴스를 얼마나 믿는가" (0 = 전혀, 100 = 확신)
- 인플루언서 -> 유포자(spreader): 믿음 고정, 매 틱 추가로 대화를 건다
- 후보 / 지지 영역 개념 삭제, 분석 대상은 유포자를 뺀 일반인 전체
- 팩트체크: 지정한 틱에 일반인 중 reach 비율에게 fc_val(낮은 믿음 값)을 한 번 전달한다.
  현재 믿음과 fc_val 의 차이가 eps_fc 이하인 사람만 mu_fc 만큼 움직이고, 그 밖이면 무시한다
- 주요 지표: 믿는 사람 비율(믿음 > 50), 평균 믿음, 의견 군집 수

실행
    python Main_OpinionDynamicsModel_factcheck.py            # 화면
    python Main_OpinionDynamicsModel_factcheck.py --batch    # 반복 실험 (화면 없음)
    예) --batch --runs 60 --ticks 600 --times 60 120 180 240
"""
import argparse
import random

BELIEVER = 50.0


class Person:
    def __init__(self, x, y, belief):
        self.x = x
        self.y = y
        self.belief = belief
        self.spreader = False
        self.checked = False  # 팩트체크 메시지를 받아 실제로 움직였는가


class OpinionModel:
    """화면과 분리된 시뮬레이션 본체 (GUI 와 반복 실험이 같은 규칙을 쓴다)"""

    def __init__(self, seed, n=300, n_spreaders=15, spread_belief=60.0, extra_talks=0,
                 confidence=25.0, pull=0.10, init="skewed",
                 t_fc=None, reach=1.0, fc_val=10.0, eps_fc=40.0, mu_fc=0.30,
                 mix=0, width=560, height=440):
        self.rng = random.Random(seed)
        self.confidence = confidence
        self.pull = pull
        self.extra_talks = extra_talks
        self.t_fc, self.reach = t_fc, reach
        self.fc_val, self.eps_fc, self.mu_fc = fc_val, eps_fc, mu_fc
        self.mix = mix
        self.tick = 0

        # 같은 seed 면 인구(믿음, 위치)가 조건과 상관없이 똑같다 (팩트체크 조건만 다르다)
        self.people = []
        for _ in range(n):
            x = self.rng.uniform(14, width - 14)
            y = self.rng.uniform(14, height - 14)
            belief = (self.rng.betavariate(2, 4) * 100.0 if init == "skewed"
                      else self.rng.uniform(0.0, 100.0))
            self.people.append(Person(x, y, belief))
        for p in self.people[:n_spreaders]:
            p.spreader = True
            p.belief = spread_belief
        self.ordinary = [p for p in self.people if not p.spreader]

        # 팩트체크 대상은 별도 난수로 뽑아, 대화 난수 흐름이 조건마다 달라지지 않게 한다
        self.fc_rng = random.Random(seed + 10_000)
        self.history = []
        if self.t_fc == 0:  # 시작 전에 팩트체크 (사전 반박)
            self.factcheck()
        self.record()

    # ---------------------------------------------------------------
    def pick_partner(self, index):
        people = self.people
        if self.mix == 0:
            other = index
            while other == index:
                other = self.rng.randrange(len(people))
            return other
        me = people[index]
        best, best_dist = None, None
        for _ in range(12):
            j = self.rng.randrange(len(people))
            if j == index:
                continue
            dx, dy = people[j].x - me.x, people[j].y - me.y
            dist = dx * dx + dy * dy
            if best_dist is None or dist < best_dist:
                best, best_dist = j, dist
        return best

    def factcheck(self):
        """한 번의 팩트체크: 일반인 중 reach 비율에게 fc_val 전달, 범위 안이면 이동"""
        k = int(round(self.reach * len(self.ordinary)))
        for p in self.fc_rng.sample(self.ordinary, min(k, len(self.ordinary))):
            gap = self.fc_val - p.belief
            if abs(gap) <= self.eps_fc:
                p.belief += self.mu_fc * gap
                p.checked = True

    def step(self):
        self.tick += 1
        people = self.people
        conf, pull = self.confidence, self.pull

        # 1. 이번 틱에 대화를 거는 사람 목록 (유포자는 1 + 추가 횟수만큼 들어간다)
        speakers = []
        for i, p in enumerate(people):
            speakers.extend([i] * (1 + self.extra_talks if p.spreader else 1))
        self.rng.shuffle(speakers)

        for i in speakers:
            j = self.pick_partner(i)
            if j is None:
                continue
            a, b = people[i], people[j]
            # 2. 믿음 차가 허용 범위를 넘으면 대화가 통하지 않는다
            gap = b.belief - a.belief
            if abs(gap) > conf:
                continue
            # 3. 일반인만 움직인다 (유포자는 고정)
            if not a.spreader:
                a.belief += pull * gap
            if not b.spreader:
                b.belief -= pull * gap

        # 4. 지정한 틱에 팩트체크
        if self.t_fc is not None and self.tick == self.t_fc:
            self.factcheck()
        self.record()

    # ---------------------------------------------------------------
    def believer_share(self):
        """일반인 중 믿음이 50 을 넘는 사람의 비율(%)"""
        return sum(1 for p in self.ordinary if p.belief > BELIEVER) / len(self.ordinary) * 100.0

    def mean_belief(self):
        return sum(p.belief for p in self.ordinary) / len(self.ordinary)

    def clusters(self, gap=5.0, min_size=5):
        """5점 넘게 벌어지면 다른 군집. 5명 미만 무리는 제외. (개수, 중심점 목록)"""
        ops = sorted(p.belief for p in self.ordinary)
        groups, cur = [], [ops[0]]
        for o in ops[1:]:
            if o - cur[-1] > gap:
                groups.append(cur)
                cur = []
            cur.append(o)
        groups.append(cur)
        big = [g for g in groups if len(g) >= min_size]
        return len(big), [sum(g) / len(g) for g in big]

    def record(self):
        self.history.append((self.believer_share(), self.mean_belief()))


# =====================================================================
# 반복 실험 (조건별 평균과 95% 신뢰구간)
# =====================================================================
def bootstrap_ci(diffs, reps=5000, rng=None):
    rng = rng or random.Random(0)
    n = len(diffs)
    means = sorted(sum(rng.choice(diffs) for _ in range(n)) / n for _ in range(reps))
    return means[int(reps * 0.025)], means[int(reps * 0.975)]


def run_batch(args):
    conds = [None] + list(args.times)          # None = 팩트체크 없음 (대조군)
    res = {c: {"share": [], "mean": []} for c in conds}
    for s in range(args.runs):
        for c in conds:
            m = OpinionModel(seed=s, n_spreaders=args.spreaders, extra_talks=args.extra,
                             confidence=args.conf, pull=args.pull, t_fc=c, reach=args.reach,
                             fc_val=args.fc_val, eps_fc=args.eps_fc, mu_fc=args.mu_fc)
            for _ in range(args.ticks):
                m.step()
            res[c]["share"].append(m.believer_share())
            res[c]["mean"].append(m.mean_belief())
        print(f"\r진행 {s + 1}/{args.runs}", end="", flush=True)
    print()

    print(f"\n[설정] {args.runs}회 반복 | {args.ticks}틱 | 허용 범위 {args.conf}점 | 이동 {args.pull:.0%} | "
          f"유포자 {args.spreaders}명 (+{args.extra}회) | 팩트체크 도달 {args.reach:.0%}, "
          f"값 {args.fc_val}, 범위 {args.eps_fc}, 이동 {args.mu_fc:.0%}")
    print("\n■ 최종 믿는 사람 비율(믿음>50) / 평균 믿음")
    for c in conds:
        name = "팩트체크 없음   " if c is None else f"팩트체크 @{c:>4}틱"
        v, mv = res[c]["share"], res[c]["mean"]
        print(f"  {name}: {sum(v) / len(v):6.2f}%   평균 믿음 {sum(mv) / len(mv):5.1f}")
    print("\n■ 대조군(팩트체크 없음) 대비 차이 (같은 seed 쌍체)")
    for c in conds[1:]:
        diffs = [x - y for x, y in zip(res[c]["share"], res[None]["share"])]
        lo, hi = bootstrap_ci(diffs)
        mark = "  (0 포함 -> 차이 불확실)" if lo <= 0 <= hi else ""
        print(f"  @{c:>4}틱: {sum(diffs) / len(diffs):+7.2f}%p  95% CI [{lo:.2f} ~ {hi:.2f}]{mark}")


# =====================================================================
# 화면
# =====================================================================
def run_gui():
    import tkinter as tk
    from tkinter import ttk

    class FactCheckApp:
        def __init__(self, root):
            self.root = root
            self.root.title("사회경제 시뮬레이션: 가짜뉴스와 팩트체크 (Opinion Dynamics Model)")
            self.root.resizable(False, False)
            self.sim_w, self.sim_h = 560, 440
            self.graph_w, self.graph_h = 340, 440
            self.radius = 5
            self.running = False
            self.model = None
            self.setup_ui()
            self.reset_simulation()

        def setup_ui(self):
            font = ("맑은 고딕", 9)
            bold = ("맑은 고딕", 9, "bold")
            main = ttk.Frame(self.root, padding=10)
            main.grid(row=0, column=0, sticky="NSEW")
            view = ttk.Frame(main)
            view.grid(row=0, column=0, pady=5)
            self.sim_canvas = tk.Canvas(view, width=self.sim_w, height=self.sim_h, bg="#1a1a24")
            self.sim_canvas.grid(row=0, column=0, padx=5)
            self.graph_canvas = tk.Canvas(view, width=self.graph_w, height=self.graph_h, bg="#ffffff")
            self.graph_canvas.grid(row=0, column=1, padx=5)

            legend = ttk.Frame(main)
            legend.grid(row=1, column=0, sticky="W")
            ttk.Label(legend, text="● 믿음 0 (파랑)", foreground="#3498db", font=bold).pack(side="left", padx=8)
            ttk.Label(legend, text="● 믿음 50 (회색)", foreground="#95a5a6", font=bold).pack(side="left", padx=8)
            ttk.Label(legend, text="● 믿음 100 (빨강)", foreground="#e74c3c", font=bold).pack(side="left", padx=8)
            ttk.Label(legend, text="★ 유포자(믿음 고정)   ◎ 팩트체크로 움직인 사람",
                      foreground="#7f8c8d", font=font).pack(side="left", padx=8)

            summary = ttk.LabelFrame(main, text="결과 요약 (분석 대상: 유포자를 뺀 일반인)", padding=10)
            summary.grid(row=2, column=0, sticky="EW", pady=5)
            self.card_share = ttk.Label(summary, font=bold, foreground="#c0392b")
            self.card_share.grid(row=0, column=0, padx=12, sticky="W")
            self.card_mean = ttk.Label(summary, font=bold, foreground="#d35400")
            self.card_mean.grid(row=0, column=1, padx=12, sticky="W")
            self.card_clusters = ttk.Label(summary, font=bold, foreground="#2980b9")
            self.card_clusters.grid(row=0, column=2, padx=12, sticky="W")
            self.card_state = ttk.Label(summary, font=bold, foreground="#27ae60")
            self.card_state.grid(row=0, column=3, padx=12, sticky="W")

            ctrl = ttk.LabelFrame(main, text="실험 조건 설정 (변경 후 초기화를 누르세요)", padding=10)
            ctrl.grid(row=3, column=0, sticky="EW", pady=5)

            def slider(row, col, text, var, lo, hi, unit):
                ttk.Label(ctrl, text=text).grid(row=row, column=col, sticky="W", padx=5)
                label = ttk.Label(ctrl, text=f"{var.get()}{unit}", width=7)
                ttk.Scale(ctrl, from_=lo, to=hi, variable=var,
                          command=lambda v: (var.set(int(float(v))),
                                             label.config(text=f"{int(float(v))}{unit}"))
                          ).grid(row=row, column=col + 1, sticky="EW", padx=5)
                label.grid(row=row, column=col + 2, sticky="W")

            self.pop_val = tk.IntVar(value=300)
            self.conf_val = tk.IntVar(value=25)
            self.pull_val = tk.IntVar(value=10)
            self.spr_val = tk.IntVar(value=15)
            self.extra_val = tk.IntVar(value=0)
            self.fc_time = tk.IntVar(value=120)
            self.reach_val = tk.IntVar(value=100)
            self.mufc_val = tk.IntVar(value=30)
            slider(0, 0, "인구 수 (N):", self.pop_val, 100, 600, "명")
            slider(0, 3, "상호작용 임계값:", self.conf_val, 5, 50, "점")
            slider(1, 0, "믿음 이동 비율:", self.pull_val, 5, 50, "%")
            slider(1, 3, "유포자 수:", self.spr_val, 0, 40, "명")
            slider(2, 0, "유포자 추가 발언:", self.extra_val, 0, 8, "회")
            slider(2, 3, "팩트체크 시점:", self.fc_time, 0, 600, "틱")
            slider(3, 0, "팩트체크 도달 비율:", self.reach_val, 0, 100, "%")
            slider(3, 3, "팩트체크 이동 비율:", self.mufc_val, 5, 50, "%")

            self.use_fc = tk.BooleanVar(value=True)
            ttk.Checkbutton(ctrl, text="팩트체크 실행 (끄면 대조군)", variable=self.use_fc
                            ).grid(row=4, column=0, columnspan=2, sticky="W", padx=5)
            ttk.Label(ctrl, text="관찰 기간:").grid(row=4, column=3, sticky="W", padx=5)
            self.max_tick = tk.IntVar(value=600)
            box = ttk.Frame(ctrl)
            box.grid(row=4, column=4, columnspan=2, sticky="W")
            for v in (300, 600, 1000):
                ttk.Radiobutton(box, text=f"{v:,}틱", variable=self.max_tick, value=v).pack(side="left", padx=3)

            ttk.Label(ctrl, text="초기 인구 seed:").grid(row=5, column=0, sticky="W", padx=5, pady=4)
            self.seed_val = tk.IntVar(value=0)
            ttk.Spinbox(ctrl, from_=0, to=99, textvariable=self.seed_val, width=6).grid(row=5, column=1, sticky="W", padx=5)
            self.speed_val = tk.IntVar(value=2)
            ttk.Label(ctrl, text="속도(틱/프레임):").grid(row=5, column=4, sticky="E")
            ttk.Spinbox(ctrl, from_=1, to=50, textvariable=self.speed_val, width=4).grid(row=5, column=5, sticky="W")

            btns = ttk.Frame(ctrl)
            btns.grid(row=6, column=0, columnspan=6, pady=6)
            self.start_btn = ttk.Button(btns, text="▶ 실행 (Run)", width=14, command=self.toggle_run)
            self.start_btn.pack(side="left", padx=6)
            ttk.Button(btns, text="⏭ 1틱 진행", width=13, command=self.step_once).pack(side="left", padx=6)
            ttk.Button(btns, text="🔄 초기화 (Reset)", width=16, command=self.reset_simulation).pack(side="left", padx=6)

            self.status_bar = ttk.Label(main, font=font, relief="sunken", anchor="center", padding=4)
            self.status_bar.grid(row=4, column=0, sticky="EW", pady=2)

        # -----------------------------------------------------------
        def reset_simulation(self):
            self.running = False
            self.start_btn.config(text="▶ 실행 (Run)")
            self.model = OpinionModel(
                seed=self.seed_val.get(), n=self.pop_val.get(), n_spreaders=self.spr_val.get(),
                extra_talks=self.extra_val.get(), confidence=float(self.conf_val.get()),
                pull=self.pull_val.get() / 100.0,
                t_fc=self.fc_time.get() if self.use_fc.get() else None,
                reach=self.reach_val.get() / 100.0, mu_fc=self.mufc_val.get() / 100.0,
                width=self.sim_w, height=self.sim_h)
            self.redraw()
            self.update_dashboard()

        def toggle_run(self):
            self.running = not self.running
            self.start_btn.config(text="⏸ 일시정지 (Pause)" if self.running else "▶ 실행 (Run)")
            if self.running:
                self.loop()

        def loop(self):
            if not self.running:
                return
            for _ in range(max(1, self.speed_val.get())):
                if not self.step_model():
                    break
            self.redraw()
            self.update_dashboard()
            if self.running:
                self.root.after(30, self.loop)

        def step_model(self):
            if self.model.tick >= self.max_tick.get():
                self.running = False
                self.start_btn.config(text="▶ 실행 (Run)")
                return False
            self.model.step()
            return True

        def step_once(self):
            self.step_model()
            self.redraw()
            self.update_dashboard()

        def update_dashboard(self):
            m = self.model
            share, mean = m.history[-1]
            count, _ = m.clusters()
            self.card_share.config(text=f"믿는 사람(믿음>50): {share:.1f}%")
            self.card_mean.config(text=f"평균 믿음: {mean:.1f}")
            self.card_clusters.config(text=f"의견 군집: {count}개")
            done = m.tick >= self.max_tick.get()
            self.card_state.config(text=f"{'🏁 관찰 종료' if done else '진행'} ({m.tick:,}틱)",
                                   foreground="#8e44ad" if done else "#27ae60")
            fc = "없음" if m.t_fc is None else f"{m.t_fc}틱" + (" (실시됨)" if m.tick >= m.t_fc else "")
            n_spr = sum(1 for p in m.people if p.spreader)
            self.status_bar.config(
                text=f"인구 {len(m.people)}명 | 유포자 {n_spr}명 (매 틱 {1 + m.extra_talks}회 발언) | "
                     f"임계값 {m.confidence:.0f}점 | 이동 {m.pull * 100:.0f}% | 팩트체크 {fc} | seed {self.seed_val.get()}")

        # -----------------------------------------------------------
        def belief_color(self, belief):
            t = min(1.0, max(0.0, belief / 100.0))
            if t < 0.5:
                k = t / 0.5
                rgb = (52 + (149 - 52) * k, 152 + (165 - 152) * k, 219 + (166 - 219) * k)
            else:
                k = (t - 0.5) / 0.5
                rgb = (149 + (231 - 149) * k, 165 + (76 - 165) * k, 166 + (60 - 166) * k)
            return "#%02x%02x%02x" % tuple(int(v) for v in rgb)

        def star(self, x, y, r):
            import math
            pts = []
            for i in range(10):
                ang = -math.pi / 2 + i * math.pi / 5
                rr = r if i % 2 == 0 else r * 0.45
                pts += [x + rr * math.cos(ang), y + rr * math.sin(ang)]
            return pts

        def redraw(self):
            c = self.sim_canvas
            c.delete("all")
            r = self.radius
            for p in self.model.people:
                if p.spreader:
                    continue
                c.create_oval(p.x - r, p.y - r, p.x + r, p.y + r, fill=self.belief_color(p.belief),
                              outline="#ffffff" if p.checked else "")
            for p in self.model.people:
                if p.spreader:
                    c.create_polygon(self.star(p.x, p.y, 11), fill=self.belief_color(p.belief),
                                     outline="#ffffff", width=1)
            self.draw_graph()

        def nice_step(self, top):
            for step in (1, 2, 5, 10, 20, 25, 50, 100, 200, 500, 1000):
                if top / step <= 4:
                    return step
            return 2000

        def draw_axes(self, box, x_max, x_step, y_max, y_step, label_gap=14):
            left, top, right, bottom = box
            c = self.graph_canvas
            for value in range(0, y_max + 1, y_step):
                y = bottom - value / y_max * (bottom - top)
                c.create_line(left, y, right, y, fill="#ecf0f1")
                c.create_text(left - 5, y, text=f"{value}", anchor="e", fill="#7f8c8d", font=("맑은 고딕", 8))
            for value in range(0, x_max + 1, x_step):
                x = left + value / x_max * (right - left)
                c.create_line(x, bottom, x, bottom + 4, fill="#7f8c8d")
                c.create_text(x, bottom + label_gap, text=f"{value:,}", fill="#7f8c8d", font=("맑은 고딕", 8))
            c.create_line(left, top, left, bottom, right, bottom, fill="#7f8c8d")

        def draw_graph(self):
            self.graph_canvas.delete("all")
            self.draw_histogram()
            self.draw_share()

        def draw_histogram(self):
            c = self.graph_canvas
            c.create_text(self.graph_w / 2, 12, text="일반인 믿음 분포 (점선 = 믿는 사람 기준 50)",
                          fill="#2c3e50", font=("맑은 고딕", 9, "bold"))
            bins = 40
            counts = [0] * bins
            for p in self.model.ordinary:
                counts[min(bins - 1, max(0, int(p.belief / 100.0 * bins)))] += 1
            step = self.nice_step(max(counts))
            top_count = (max(counts) + step - 1) // step * step
            box = (38, 30, self.graph_w - 14, 160)
            left, top, right, bottom = box
            self.draw_axes(box, 100, 20, top_count, step, label_gap=21)
            width = (right - left) / bins
            for i, count in enumerate(counts):
                if count > 0:
                    h = count / top_count * (bottom - top)
                    c.create_rectangle(left + i * width, bottom - h, left + (i + 1) * width - 1, bottom,
                                       fill=self.belief_color((i + 0.5) / bins * 100.0), outline="")
            x50 = left + 0.5 * (right - left)
            c.create_line(x50, top, x50, bottom, fill="#7f8c8d", dash=(3, 3))

        def draw_share(self):
            c = self.graph_canvas
            c.create_text(self.graph_w / 2, 219, text="믿는 사람 비율 변화 (가로: 틱, 세로: %)",
                          fill="#2c3e50", font=("맑은 고딕", 9, "bold"))
            hist = self.model.history
            span = max(self.max_tick.get(), 1)
            box = (38, 238, self.graph_w - 14, self.graph_h - 46)
            self.draw_axes(box, span, self.nice_step(span), 100, 25)
            left, top, right, bottom = box
            if self.model.t_fc is not None and self.model.t_fc <= span:
                x = left + self.model.t_fc / span * (right - left)
                c.create_line(x, top, x, bottom, fill="#27ae60", dash=(4, 3), width=2)
                c.create_text(x, top - 2, text="팩트체크", fill="#27ae60", font=("맑은 고딕", 8))
            if len(hist) > 1:
                pts = []
                stride = max(1, len(hist) // 400)
                for t in range(0, len(hist), stride):
                    pts += [left + t / span * (right - left),
                            bottom - min(hist[t][0], 100.0) / 100.0 * (bottom - top)]
                if len(pts) >= 4:
                    c.create_line(pts, fill="#c0392b", width=2)
            c.create_text(self.graph_w / 2, self.graph_h - 12, text="━ 믿는 사람(믿음>50)     ┆ 팩트체크 시점",
                          fill="#7f8c8d", font=("맑은 고딕", 8))

    root = tk.Tk()
    FactCheckApp(root)
    root.mainloop()


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="가짜뉴스와 팩트체크 Opinion Dynamics Model")
    ap.add_argument("--batch", action="store_true", help="화면 없이 팩트체크 시점별 반복 실험")
    ap.add_argument("--runs", type=int, default=60, help="반복 횟수 (초기 인구 세트 수)")
    ap.add_argument("--ticks", type=int, default=600, help="관찰 틱 수")
    ap.add_argument("--times", type=int, nargs="+", default=[0, 60, 120, 180, 240, 360],
                    help="팩트체크 시점 목록 (틱)")
    ap.add_argument("--conf", type=float, default=25.0, help="상호작용 임계값")
    ap.add_argument("--pull", type=float, default=0.10, help="믿음 이동 비율")
    ap.add_argument("--spreaders", type=int, default=15, help="유포자 수")
    ap.add_argument("--extra", type=int, default=0, help="유포자 추가 발언 횟수")
    ap.add_argument("--reach", type=float, default=1.0, help="팩트체크 도달 비율 (0~1)")
    ap.add_argument("--fc_val", type=float, default=10.0, help="팩트체크 메시지 값")
    ap.add_argument("--eps_fc", type=float, default=40.0, help="팩트체크가 통하는 믿음 차이 범위")
    ap.add_argument("--mu_fc", type=float, default=0.30, help="팩트체크 이동 비율")
    a = ap.parse_args()
    if a.batch:
        run_batch(a)
    else:
        run_gui()
