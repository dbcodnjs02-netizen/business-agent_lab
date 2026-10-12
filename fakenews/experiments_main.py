"""Main_OpinionDynamicsModel_factcheck.py 기반 실험 (레포트 5절 수치용)"""
import random
from multiprocessing import Pool
from Main_OpinionDynamicsModel_factcheck import OpinionModel, bootstrap_ci

RUNS, TICKS = 60, 600


def one(args):
    seed, kw = args
    m = OpinionModel(seed=seed, **kw)
    for _ in range(TICKS):
        m.step()
    return m.believer_share(), m.mean_belief()


def cond(pool, kw):
    out = pool.map(one, [(s, kw) for s in range(RUNS)])
    return [o[0] for o in out], [o[1] for o in out]


def report(pool, label, kw, base):
    sh, mb = cond(pool, kw)
    diffs = [a - b for a, b in zip(sh, base)]
    lo, hi = bootstrap_ci(diffs)
    print(f"{label:34s} 믿는비율 {sum(sh)/RUNS:6.2f}%  평균믿음 {sum(mb)/RUNS:5.1f}  "
          f"대조군대비 {sum(diffs)/RUNS:+7.2f}%p  CI[{lo:+.1f}~{hi:+.1f}]", flush=True)


if __name__ == "__main__":
    with Pool() as pool:
        base, bm = cond(pool, dict(t_fc=None))
        print(f"대조군(팩트체크 없음): 믿는비율 {sum(base)/RUNS:.2f}%  평균믿음 {sum(bm)/RUNS:.1f}  ({RUNS}회)\n")
        print("== 실험1 시점 (도달 100%, 이동 30%, 범위 40)")
        for t in (0, 30, 60, 90, 120, 150, 180, 240):
            report(pool, f"시점 {t}틱", dict(t_fc=t), base)
        for t in (60, 90, 120):
            print(f"\n== 실험2a 이동 비율 (시점 {t}틱, 도달 100%)")
            for mu in (0.1, 0.3, 0.5):
                report(pool, f"이동 {mu:.0%}", dict(t_fc=t, mu_fc=mu), base)
            print(f"== 실험2b 도달 비율 (시점 {t}틱, 이동 30%)")
            for r in (0.25, 0.5, 1.0):
                report(pool, f"도달 {r:.0%}", dict(t_fc=t, reach=r), base)
        print("\n== 실험3 도달 범위 eps_fc (시점 120틱)")
        for e in (10, 20, 30, 40, 50, 70):
            report(pool, f"eps_fc {e}", dict(t_fc=120, eps_fc=float(e)), base)
