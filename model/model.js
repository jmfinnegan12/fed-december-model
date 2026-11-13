// The maths for the Fed December 2026 decision model. Reads the config in inputs.json.
// Layers: base rate -> statement/minutes signal -> unemployment change -> crisis tail -> judgment.
(function () {
  function fromConfig(cfg) {
    const OUT = cfg.outcomes, DIR = cfg.direction;
    const norm = (p) => { const s = p.reduce((a, b) => a + b, 0); return p.map((x) => x / s); };
    // P(label | direction), add 1 to each label
    const lik = (counts, label) => {
      const o = {};
      for (const d of ['Up', 'Hold', 'Down']) {
        const c = counts[d], n = Object.values(c).reduce((a, b) => a + b, 0), k = Object.keys(c).length;
        o[d] = ((c[label] || 0) + 1) / (n + k);
      }
      return o;
    };
    const apply = (p, L) => norm(p.map((x, i) => x * L[DIR[i]]));

    const DEFAULTS = {
      signal: cfg.signal.today,
      unemployment: cfg.unemployment.today,
      tail: cfg.tail.p,
      holdShare: null, // Hold as a share of the model's Hold (set below so the defaults give judgment.hold)
      bigShare: null,  // Hike >25bp as a share of all hikes (set below so the defaults give judgment.hike_over_25)
    };

    function layers(prm) {
      const a = cfg.base.add_per_outcome, n = cfg.base.counts.reduce((x, y) => x + y, 0);
      const base = cfg.base.counts.map((c) => (c + a) / (n + a * OUT.length));
      const sig = apply(base, lik(cfg.signal.counts, prm.signal));
      const un = apply(sig, lik(cfg.unemployment.counts, prm.unemployment));
      const tail = un.map((x, i) => (1 - prm.tail) * x + prm.tail * cfg.tail.if_crisis_while_hiking[i]);
      // judgment: Hold scaled to a share of the model's Hold; hikes take the rest,
      // split by the share going to Hike >25bp; cuts keep the crisis-tail values
      const fin = tail.slice();
      fin[2] = tail[2] * prm.holdShare;
      const hikes = 1 - fin[0] - fin[1] - fin[2];
      fin[4] = hikes * prm.bigShare;
      fin[3] = hikes - fin[4];
      return [
        { key: 'base', name: 'Base rate', p: base },
        { key: 'signal', name: '+ Fed signal', p: sig },
        { key: 'unemployment', name: '+ Unemployment', p: un },
        { key: 'tail', name: '+ Crisis tail', p: tail },
        { key: 'final', name: 'Forecast', p: fin },
      ];
    }
    // set the judgment shares so the defaults reproduce the stated Hold and Hike >25bp
    const t0 = layers(Object.assign({}, DEFAULTS, { holdShare: 1, bigShare: 0 }))[3].p;
    DEFAULTS.holdShare = cfg.judgment.hold / t0[2];
    DEFAULTS.bigShare = cfg.judgment.hike_over_25 / (1 - t0[0] - t0[1] - cfg.judgment.hold);
    return { OUTCOMES: OUT, AS_OF: cfg.as_of, DEFAULTS, layers, STATE: cfg.base.state };
  }
  window.FedModel = { fromConfig };
})();
