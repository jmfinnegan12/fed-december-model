// The Model page for this event. The maths is in model.js; the shared look and controls come from eventneutral.com/kit/v1.
fetch('inputs.json', { cache: 'no-cache' }).then((r) => r.json()).then((cfg) => {
  const M = window.FedModel.fromConfig(cfg);
  const pct1 = (v) => `${(v * 100).toFixed(1)}%`;
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let prm = clone(M.DEFAULTS);
  const el = (tag, cls, parent, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; if (parent) parent.appendChild(n); return n; };

  // ---------- inputs ----------
  const root = document.getElementById('inputs');
  const seg = {}, fields = {};
  const SEGS = [
    { key: 'signal', group: 'model', label: 'Fed signal toward Dec 9', opts: ['easing', 'neutral', 'tightening'] },
    { key: 'unemployment', group: 'model', label: 'Unemployment rate since Oct 28', opts: ['down', 'flat', 'up'],
      note: 'Up or down means a change of 0.2 points or more.' },
  ];
  const SLIDERS = [
    { key: 'tail', group: 'model', label: 'Chance a crisis starts before Dec 9', step: 0.1, sliderMax: 10 },
    { key: 'holdShare', group: 'judgment', label: "Hold, as a share of the model's Hold", step: 0.1, sliderMax: 100 },
    { key: 'bigShare', group: 'judgment', label: 'Hike >25bp, as a share of all hikes', step: 0.1, sliderMax: 50 },
  ];
  const GROUPS = [{ key: 'model', name: 'Model' }, { key: 'judgment', name: 'Judgment' }];
  GROUPS.forEach((g) => {
    const sec = el('section', 'group', root);
    el('h3', '', sec, g.name);
    SEGS.filter((s) => s.group === g.key).forEach((s) => {
      const row = el('div', 'field', sec);
      el('div', 'name', row, s.label);
      const wrap = el('div', 'en-seg', row);
      wrap.setAttribute('role', 'radiogroup'); wrap.setAttribute('aria-label', s.label);
      seg[s.key] = s.opts.map((o) => {
        const lab = el('label', '', wrap);
        const inp = el('input', '', lab); inp.type = 'radio'; inp.name = s.key; inp.value = o;
        lab.appendChild(document.createTextNode(o[0].toUpperCase() + o.slice(1)));
        inp.addEventListener('change', () => { prm[s.key] = o; changed(); });
        return inp;
      });
      if (s.note) el('p', 'note', row, s.note);
    });
    SLIDERS.filter((s) => s.group === g.key).forEach((s) => {
      const row = el('div', 'field', sec);
      el('div', 'name', row, s.label);
      const f = EN.sliderField({ value: prm[s.key] * 100, min: 0, max: 100, step: s.step, unit: '%', sliderMax: s.sliderMax,
        label: s.label, onChange: (v) => { prm[s.key] = v / 100; changed(); } });
      row.appendChild(f.range); row.appendChild(f.box.el);
      fields[s.key] = f;
    });
    if (g.key === 'judgment') el('p', 'note', sec, 'Cuts keep the crisis-tail values.');
  });
  const resetBtn = document.getElementById('reset');
  resetBtn.textContent = `Reset to ${M.AS_OF} values`;
  resetBtn.addEventListener('click', () => { prm = clone(M.DEFAULTS); changed(); });

  // ---------- the forecast ----------
  const fc = EN.chart.frame(document.getElementById('forecast'), () => 5 * 40 + 8, ({ svg, width }) => {
    svg.selectAll('*').remove();
    const p = M.layers(prm)[4].p, base = M.layers(M.DEFAULTS)[4].p;
    const lw = width < 520 ? 104 : 124, vw = 62, bw = width - lw - vw;
    const x = d3.scaleLinear([0, 1], [0, bw]);
    M.OUTCOMES.forEach((o, i) => {
      const y = i * 40 + 8;
      svg.append('text').attr('x', 0).attr('y', y + 17).attr('fill', 'var(--ink)').attr('font-size', 16).text(o);
      svg.append('rect').attr('x', lw).attr('y', y + 2).attr('width', bw).attr('height', 22).attr('fill', 'var(--band)');
      svg.append('rect').attr('x', lw).attr('y', y + 2).attr('width', Math.max(1, x(p[i]))).attr('height', 22)
        .attr('fill', i === 3 ? 'var(--accent)' : 'var(--ink-faint)');
      if (Math.abs(p[i] - base[i]) > 1e-9) svg.append('line').attr('x1', lw + x(base[i])).attr('x2', lw + x(base[i]))
        .attr('y1', y - 1).attr('y2', y + 27).attr('stroke', 'var(--ink)').attr('stroke-dasharray', '3 2');
      svg.append('text').attr('x', width).attr('y', y + 18).attr('text-anchor', 'end').attr('fill', 'var(--ink)')
        .attr('font-size', 16).attr('font-weight', 650).text(pct1(p[i]));
    });
  });

  // ---------- how the layers get there ----------
  const lc = EN.chart.frame(document.getElementById('layers'), (w) => (w < 560 ? 5 * 58 + 40 : 5 * 42 + 34), ({ svg, width }) => {
    svg.selectAll('*').remove();
    const L = M.layers(prm);
    const narrow = width < 560;
    const lw = narrow ? 0 : 128, top = narrow ? 30 : 28, rowH = narrow ? 58 : 42;
    const cw = (width - lw) / 5;
    const short = ['Cut >25', 'Cut 25', 'Hold', 'Hike 25', 'Hike >25'];
    short.forEach((s, j) => svg.append('text').attr('x', lw + j * cw).attr('y', 16).attr('fill', 'var(--ink-faint)').attr('font-size', 14).text(s));
    L.forEach((row, i) => {
      const y = top + i * rowH + (narrow ? 18 : 0);
      if (narrow) svg.append('text').attr('x', 0).attr('y', y - 4).attr('fill', 'var(--ink-soft)').attr('font-size', 14).text(row.name);
      else svg.append('text').attr('x', 0).attr('y', y + 19).attr('fill', i === 4 ? 'var(--ink)' : 'var(--ink-soft)')
        .attr('font-size', 15.5).attr('font-weight', i === 4 ? 650 : 400).text(row.name);
      row.p.forEach((v, j) => {
        const x0 = lw + j * cw, bw = cw - 14;
        svg.append('rect').attr('x', x0).attr('y', y + 24).attr('width', bw).attr('height', 4).attr('fill', 'var(--band)');
        svg.append('rect').attr('x', x0).attr('y', y + 24).attr('width', Math.max(0.5, bw * v)).attr('height', 4)
          .attr('fill', i === 4 ? 'var(--accent)' : 'var(--ink-faint)');
        svg.append('text').attr('x', x0).attr('y', y + 18).attr('fill', 'var(--ink)').attr('font-size', 15.5)
          .attr('font-weight', i === 4 ? 650 : 400).text(pct1(v));
      });
    });
  });

  function changed() {
    SEGS.forEach((s) => seg[s.key].forEach((inp) => { inp.checked = inp.value === prm[s.key]; }));
    SLIDERS.forEach((s) => fields[s.key].set(prm[s.key] * 100));
    const same = Object.keys(M.DEFAULTS).every((k) => prm[k] === M.DEFAULTS[k] || Math.abs(prm[k] - M.DEFAULTS[k]) < 1e-12);
    resetBtn.disabled = same;
    document.getElementById('legend').hidden = same;
    fc.redraw(); lc.redraw();
  }
  changed();
});
