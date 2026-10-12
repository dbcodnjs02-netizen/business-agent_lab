import numpy as np, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from model import run, metrics

S = 60
base = dict(beta=4, gamma=0.5, lam=0.25)

def stats(**kw):
    r = [metrics(run(seed=s, **{**base, **kw})[0]) for s in range(S)]
    r = np.array(r, float)
    return dict(peak=r[:,0].mean(), bubble=r[:,2].mean(), crash=r[:,3].mean())

# Exp1: confidence bound
eps_list = [5, 10, 15, 20, 25, 30, 40, 50]
e1 = [stats(eps=e) for e in eps_list]
print("EXP1 eps -> bubble / crash / peak")
for e, d in zip(eps_list, e1): print(e, "%.2f %.2f %.2f" % (d['bubble'], d['crash'], d['peak']))

# Exp2: pessimist share
f_list = [0, 0.02, 0.05, 0.1, 0.2]
e2 = [stats(f_pess=f) for f in f_list]
print("EXP2 f -> bubble / crash / peak")
for f, d in zip(f_list, e2): print(f, "%.2f %.2f %.2f" % (d['bubble'], d['crash'], d['peak']))

# Exp3: eps x f heatmap (bubble rate)
H = np.array([[stats(eps=e, f_pess=f)['bubble'] for e in eps_list] for f in f_list])
print("HEAT bubble rate\n", np.round(H, 2))

fig, ax = plt.subplots(1, 3, figsize=(15, 4))
ax[0].plot(eps_list, [d['bubble'] for d in e1], 'o-', label='bubble (peak>=1.5x)')
ax[0].plot(eps_list, [d['crash'] for d in e1], 's-', label='bubble then crash')
ax[0].set_xlabel('confidence bound eps'); ax[0].set_ylabel('share of 60 runs'); ax[0].legend()
ax[1].plot(f_list, [d['bubble'] for d in e2], 'o-', label='bubble')
ax[1].plot(f_list, [d['crash'] for d in e2], 's-', label='crash')
ax[1].set_xlabel('pessimist share f'); ax[1].legend()
im = ax[2].imshow(H, origin='lower', aspect='auto', vmin=0, vmax=1)
ax[2].set_xticks(range(len(eps_list))); ax[2].set_xticklabels(eps_list)
ax[2].set_yticks(range(len(f_list))); ax[2].set_yticklabels(f_list)
ax[2].set_xlabel('eps'); ax[2].set_ylabel('f'); plt.colorbar(im, ax=ax[2], label='bubble rate')
plt.tight_layout(); plt.savefig('results.png', dpi=130)

fig, ax = plt.subplots(1, 2, figsize=(11, 4))
for s in range(8):
    p, m, _ = run(seed=s, **base)
    ax[0].plot(p, lw=1); ax[1].plot(m, lw=1)
ax[0].set_title('price'); ax[1].set_title('mean optimism'); ax[0].set_yscale('log')
plt.tight_layout(); plt.savefig('paths.png', dpi=130)
