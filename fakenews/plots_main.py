"""Main_OpinionDynamicsModel_factcheck.py 기반 레포트 도표 (60회 반복)"""
import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from multiprocessing import Pool
from Main_OpinionDynamicsModel_factcheck import OpinionModel

RUNS, TICKS = 60, 600
C = {"ctrl": "#7f8c8d", "early": "#2980b9", "mid": "#e67e22", "late": "#c0392b"}


def traj(args):
    seed, kw = args
    m = OpinionModel(seed=seed, **kw)
    for _ in range(TICKS):
        m.step()
    return [h[0] for h in m.history], m.believer_share()


def many(pool, **kw):
    out = pool.map(traj, [(s, kw) for s in range(RUNS)])
    return np.array([o[0] for o in out]), np.array([o[1] for o in out])


def ci(v, reps=3000, rng=np.random.default_rng(0)):
    b = rng.choice(v, (reps, len(v))).mean(1)
    return np.percentile(b, [2.5, 97.5])


if __name__ == "__main__":
    from matplotlib import font_manager as fm
    fm.fontManager.addfont("/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc")
    plt.rcParams.update({"font.family": "WenQuanYi Zen Hei", "axes.unicode_minus": False, "font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
    with Pool() as pool:
        # Fig A: mean believer share over time
        fig, ax = plt.subplots(figsize=(7, 4))
        for t, col, lab in [(None, C["ctrl"], "팩트체크 없음"), (60, C["early"], "팩트체크 60틱"),
                            (90, C["mid"], "90틱"), (120, "#8e44ad", "120틱"), (180, C["late"], "180틱")]:
            tr, _ = many(pool, t_fc=t)
            ax.plot(tr.mean(0), color=col, lw=2 if t is not None else 2.5, label=lab,
                    ls="--" if t is None else "-", zorder=5 if t is None else 2)
            if t in (60, 180):
                ax.axvline(t, color=col, ls=":", lw=1)
        ax.set_xlabel("틱"); ax.set_ylabel("믿는 사람 비율 (믿음 > 50), %")
        ax.set_title("그림 A. 팩트체크 시점별 믿는 사람 비율의 시간 변화 (60회 평균)")
        ax.legend(frameon=False); plt.tight_layout(); plt.savefig("figA_time_series.png", dpi=150); plt.close()

        # Fig B: final believers vs timing with 95% CI, + mean belief
        ts = [0, 30, 60, 90, 120, 150, 180, 240]
        _, base = many(pool, t_fc=None)
        means, los, his = [], [], []
        for t in ts:
            _, f = many(pool, t_fc=t)
            lo, hi = ci(f); means.append(f.mean()); los.append(lo); his.append(hi)
        means, los, his = map(np.array, (means, los, his))
        fig, ax = plt.subplots(figsize=(7, 4))
        ax.errorbar(ts, means, yerr=[means - los, his - means], fmt="o-", color=C["early"], capsize=3, lw=2,
                    label="팩트체크 실시 (95% 신뢰구간)")
        lo, hi = ci(base)
        ax.axhline(base.mean(), color=C["ctrl"], ls="--", label="팩트체크 없음")
        ax.axhspan(lo, hi, color=C["ctrl"], alpha=0.15)
        ax.set_xlabel("팩트체크 시점 (틱)"); ax.set_ylabel("최종 믿는 사람 비율, %")
        ax.set_title("그림 B. 팩트체크 시점의 효과 (600틱 시점)")
        ax.legend(frameon=False); plt.tight_layout(); plt.savefig("figB_timing.png", dpi=150); plt.close()

        # Fig C: strength / reach x timing
        times = [60, 90, 120]
        fig, ax = plt.subplots(1, 2, figsize=(10, 4), sharey=True)
        for mu, col in [(0.1, C["late"]), (0.3, C["mid"]), (0.5, C["early"])]:
            ax[0].plot(times, [many(pool, t_fc=t, mu_fc=mu)[1].mean() for t in times], "o-", color=col, lw=2,
                       label=f"설득 강도 {mu:.0%}")
        for r, col in [(0.25, C["late"]), (0.5, C["mid"]), (1.0, C["early"])]:
            ax[1].plot(times, [many(pool, t_fc=t, reach=r)[1].mean() for t in times], "o-", color=col, lw=2,
                       label=f"도달 비율 {r:.0%}")
        for a, ttl in zip(ax, ["설득 강도 (도달 100%)", "도달 비율 (설득 강도 30%)"]):
            a.axhline(base.mean(), color=C["ctrl"], ls="--"); a.set_title(ttl)
            a.set_xlabel("팩트체크 시점 (틱)"); a.set_xticks(times); a.legend(frameon=False)
        ax[0].set_ylabel("최종 믿는 사람 비율, %")
        fig.suptitle("그림 C. 팩트체크의 설득 강도와 도달 비율 (점선 = 팩트체크 없음)")
        plt.tight_layout(); plt.savefig("figC_strength_reach.png", dpi=150); plt.close()

    # Fig D: belief distribution over time, early vs late (same population)
    seed = next(s for s in range(60) if (lambda m: [m.step() for _ in range(600)] and m.believer_share() > 20)(OpinionModel(seed=s)))
    ticks = [0, 60, 120, 300, 600]
    fig, axes = plt.subplots(2, 5, figsize=(14, 5), sharey=True, sharex=True)
    for row, (t_fc, name) in enumerate([(60, "팩트체크 60틱 (이른)"), (180, "팩트체크 180틱 (늦은)")]):
        m = OpinionModel(seed=seed, t_fc=t_fc)
        snaps = {0: [p.belief for p in m.ordinary]}
        for k in range(1, 601):
            m.step()
            if k in ticks:
                snaps[k] = [p.belief for p in m.ordinary]
        for a, t in zip(axes[row], ticks):
            a.hist(snaps[t], bins=20, range=(0, 100), color=C["early"] if row == 0 else C["late"])
            a.axvline(50, color="k", ls=":", lw=0.8)
            a.set_title(f"{t}틱", fontsize=9)
            if t == 0: a.set_ylabel(name)
    for a in axes[1]: a.set_xlabel("믿음")
    fig.suptitle(f"그림 D. 일반인의 믿음 분포 변화 (seed {seed})")
    plt.tight_layout(); plt.savefig("figD_distribution.png", dpi=150)
    print("seed", seed, "base", base.mean(), "timing", np.round(means, 1))
