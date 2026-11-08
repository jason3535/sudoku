// 数独核心：6 宫 / 9 宫通用的求解、按技巧分级的人类解法、讲解所需的辅助函数。
// 浏览器里挂在 window.SudokuCore，Node 里 module.exports（tools/gen.js 用它出题库）。
(function (root) {
  'use strict';

  // 技巧等级：出题分级、提示、训练都用这一套
  var TECH = {
    box: { lv: 1, name: '宫排除' },
    line: { lv: 2, name: '行列排除' },
    naked: { lv: 3, name: '唯一余数' },
    pointing: { lv: 4, name: '区块排除' },
    pair: { lv: 5, name: '数对' }
  };

  var geoCache = {};
  function geo(n) {
    if (geoCache[n]) return geoCache[n];
    var br = n === 9 ? 3 : 2, bc = n === 4 ? 2 : 3, bpr = n / bc, N = n * n;
    var rowU = [], colU = [], boxU = [], rowOf = [], colOf = [], boxOf = [], peers = [];
    var r, c, b, i;
    for (r = 0; r < n; r++) { var rc = []; for (c = 0; c < n; c++) rc.push(r * n + c); rowU.push({ type: 'row', idx: r, cells: rc }); }
    for (c = 0; c < n; c++) { var cc = []; for (r = 0; r < n; r++) cc.push(r * n + c); colU.push({ type: 'col', idx: c, cells: cc }); }
    for (b = 0; b < n; b++) {
      var r0 = Math.floor(b / bpr) * br, c0 = (b % bpr) * bc, bcells = [];
      for (r = r0; r < r0 + br; r++) for (c = c0; c < c0 + bc; c++) bcells.push(r * n + c);
      boxU.push({ type: 'box', idx: b, cells: bcells });
    }
    for (i = 0; i < N; i++) {
      r = Math.floor(i / n); c = i % n;
      rowOf.push(r); colOf.push(c); boxOf.push(Math.floor(r / br) * bpr + Math.floor(c / bc));
    }
    for (i = 0; i < N; i++) {
      var seen = {}, list = [];
      [rowU[rowOf[i]], colU[colOf[i]], boxU[boxOf[i]]].forEach(function (u) {
        u.cells.forEach(function (p) { if (p !== i && !seen[p]) { seen[p] = 1; list.push(p); } });
      });
      peers.push(list);
    }
    geoCache[n] = { n: n, N: N, br: br, bc: bc, all: (1 << n) - 1, rowU: rowU, colU: colU, boxU: boxU,
      units: rowU.concat(colU, boxU), rowOf: rowOf, colOf: colOf, boxOf: boxOf, peers: peers };
    return geoCache[n];
  }

  function bit(d) { return 1 << (d - 1); }
  function pop(m) { var k = 0; while (m) { m &= m - 1; k++; } return k; }
  function digits(m) { var a = []; for (var d = 1; m; d++, m >>= 1) if (m & 1) a.push(d); return a; }
  function shuffle(a, rng) {
    rng = rng || Math.random;
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rng() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }

  // 回溯：数解的个数（到 limit 为止），顺带给出第一个解。传 rng 则随机填（用来生成终盘）。
  function search(grid, n, limit, rng) {
    var G = geo(n), a = grid.slice(), R = [], C = [], B = [], i;
    for (i = 0; i < n; i++) { R.push(0); C.push(0); B.push(0); }
    for (i = 0; i < G.N; i++) if (a[i]) {
      var m0 = bit(a[i]), r0 = G.rowOf[i], c0 = G.colOf[i], b0 = G.boxOf[i];
      if ((R[r0] | C[c0] | B[b0]) & m0) return { count: 0, sol: null };
      R[r0] |= m0; C[c0] |= m0; B[b0] |= m0;
    }
    var count = 0, sol = null;
    (function rec() {
      var best = -1, bm = 0, bk = 99;
      for (var k = 0; k < G.N; k++) if (!a[k]) {
        var m = G.all & ~(R[G.rowOf[k]] | C[G.colOf[k]] | B[G.boxOf[k]]), p = pop(m);
        if (!p) return;
        if (p < bk) { bk = p; bm = m; best = k; if (p === 1) break; }
      }
      if (best < 0) { count++; if (!sol) sol = a.slice(); return; }
      var ds = digits(bm); if (rng) shuffle(ds, rng);
      var r = G.rowOf[best], c = G.colOf[best], b = G.boxOf[best];
      for (var j = 0; j < ds.length; j++) {
        var mm = bit(ds[j]);
        a[best] = ds[j]; R[r] |= mm; C[c] |= mm; B[b] |= mm;
        rec();
        a[best] = 0; R[r] &= ~mm; C[c] &= ~mm; B[b] &= ~mm;
        if (count >= limit) return;
      }
    })();
    return { count: count, sol: sol };
  }

  // ---------- 人类解法 ----------
  function Logic(grid, n) {
    this.n = n; this.G = geo(n); this.g = grid.slice(); this.c = [];
    for (var i = 0; i < this.G.N; i++) {
      var m = 0;
      if (!this.g[i]) {
        m = this.G.all;
        var ps = this.G.peers[i];
        for (var j = 0; j < ps.length; j++) if (this.g[ps[j]]) m &= ~bit(this.g[ps[j]]);
      }
      this.c.push(m);
    }
  }
  Logic.prototype.clone = function () {
    var L = Object.create(Logic.prototype);
    L.n = this.n; L.G = this.G; L.g = this.g.slice(); L.c = this.c.slice();
    return L;
  };
  Logic.prototype.place = function (i, d) {
    this.g[i] = d; this.c[i] = 0;
    var m = bit(d), ps = this.G.peers[i];
    for (var j = 0; j < ps.length; j++) this.c[ps[j]] &= ~m;
  };
  Logic.prototype.done = function () { for (var i = 0; i < this.G.N; i++) if (!this.g[i]) return false; return true; };
  Logic.prototype.hasIn = function (u, d) { for (var j = 0; j < u.cells.length; j++) if (this.g[u.cells[j]] === d) return true; return false; };

  // 某单元里只剩一格能放 d
  Logic.prototype.hidden = function (types) {
    var out = [], G = this.G, self = this;
    G.units.forEach(function (u) {
      if (types.indexOf(u.type) < 0) return;
      for (var d = 1; d <= self.n; d++) {
        if (self.hasIn(u, d)) continue;
        var m = bit(d), at = -1, k = 0;
        for (var j = 0; j < u.cells.length; j++) if (self.c[u.cells[j]] & m) { at = u.cells[j]; k++; }
        if (k === 1) out.push({ t: u.type === 'box' ? 'box' : 'line', cell: at, d: d, unit: u });
      }
    });
    return out;
  };
  // 某格只剩一个候选
  Logic.prototype.naked = function () {
    var out = [];
    for (var i = 0; i < this.G.N; i++) if (!this.g[i] && pop(this.c[i]) === 1) out.push({ t: 'naked', cell: i, d: digits(this.c[i])[0] });
    return out;
  };
  // 区块：宫内 d 只在一行/列 → 该行/列宫外删 d；行/列内 d 只在一宫 → 该宫其余删 d
  Logic.prototype.pointing = function () {
    var out = [], G = this.G, self = this, n = this.n;
    function scan(fromList, toLists, kind) {
      fromList.forEach(function (u) {
        for (var d = 1; d <= n; d++) {
          if (self.hasIn(u, d)) continue;
          var m = bit(d), cells = u.cells.filter(function (p) { return self.c[p] & m; });
          if (cells.length < 2) continue;
          toLists.forEach(function (tl) {
            var key = tl.of, idx = key[cells[0]];
            if (!cells.every(function (p) { return key[p] === idx; })) return;
            var target = tl.units[idx];
            var elim = target.cells.filter(function (p) { return cells.indexOf(p) < 0 && (self.c[p] & m); });
            if (elim.length) out.push({ t: 'pointing', kind: kind, d: d, from: u, to: target, cells: cells,
              elim: elim.map(function (p) { return { cell: p, mask: m }; }) });
          });
        }
      });
    }
    scan(G.boxU, [{ of: G.rowOf, units: G.rowU }, { of: G.colOf, units: G.colU }], 'point');
    scan(G.rowU.concat(G.colU), [{ of: G.boxOf, units: G.boxU }], 'claim');
    return out;
  };
  // 显性数对 / 隐性数对
  Logic.prototype.pairs = function () {
    var out = [], self = this, n = this.n;
    this.G.units.forEach(function (u) {
      var empt = u.cells.filter(function (p) { return !self.g[p]; }), i, j;
      for (i = 0; i < empt.length; i++) for (j = i + 1; j < empt.length; j++) {
        var a = empt[i], b = empt[j], m = self.c[a];
        if (pop(m) !== 2 || self.c[b] !== m) continue;
        var elim = empt.filter(function (p) { return p !== a && p !== b && (self.c[p] & m); })
          .map(function (p) { return { cell: p, mask: self.c[p] & m }; });
        if (elim.length) out.push({ t: 'pair', kind: 'naked', unit: u, cells: [a, b], mask: m, elim: elim });
      }
      var where = {};
      for (var d = 1; d <= n; d++) {
        if (self.hasIn(u, d)) continue;
        var cs = empt.filter(function (p) { return self.c[p] & bit(d); });
        if (cs.length === 2) where[d] = cs;
      }
      var ds = Object.keys(where).map(Number);
      for (i = 0; i < ds.length; i++) for (j = i + 1; j < ds.length; j++) {
        var x = where[ds[i]], y = where[ds[j]];
        if (x[0] !== y[0] || x[1] !== y[1]) continue;
        var pm = bit(ds[i]) | bit(ds[j]);
        var el = x.filter(function (p) { return self.c[p] & ~pm; }).map(function (p) { return { cell: p, mask: self.c[p] & ~pm }; });
        if (el.length) out.push({ t: 'pair', kind: 'hidden', unit: u, cells: x.slice(), mask: pm, elim: el });
      }
    });
    return out;
  };
  // 按由易到难找下一步（只用 maxLv 以内的技巧）
  Logic.prototype.step = function (maxLv) {
    maxLv = maxLv || 5;
    var s;
    if ((s = this.hidden(['box'])).length) return s[0];
    if (maxLv >= 2 && (s = this.hidden(['row', 'col'])).length) return s[0];
    if (maxLv >= 3 && (s = this.naked()).length) return s[0];
    if (maxLv >= 4 && (s = this.pointing()).length) return s[0];
    if (maxLv >= 5 && (s = this.pairs()).length) return s[0];
    return null;
  };
  Logic.prototype.apply = function (s) {
    if (s.cell != null && s.d) { this.place(s.cell, s.d); return; }
    for (var j = 0; j < s.elim.length; j++) this.c[s.elim[j].cell] &= ~s.elim[j].mask;
  };
  Logic.prototype.contradiction = function () {
    for (var i = 0; i < this.G.N; i++) if (!this.g[i] && !this.c[i]) return true;
    return false;
  };

  // 难度 = 一直用最简单可用技巧时，用到的最难技巧
  function grade(grid, n) {
    var L = new Logic(grid, n), counts = {}, max = 0, steps = 0;
    while (!L.done()) {
      var s = L.step(5);
      if (!s || ++steps > 2000) return { solved: false, max: max, counts: counts };
      counts[s.t] = (counts[s.t] || 0) + 1;
      if (TECH[s.t].lv > max) max = TECH[s.t].lv;
      L.apply(s);
    }
    return { solved: true, max: max, counts: counts };
  }

  // 下一步「填数」：前面需要的删数步骤一起带上（提示用）
  function nextPlacement(grid, n, maxLv) {
    var L = new Logic(grid, n), chain = [];
    for (var k = 0; k < 60; k++) {
      var s = L.step(maxLv || 5);
      if (!s) return null;
      if (s.cell != null && s.d) return { step: s, chain: chain, logic: L };
      chain.push(s); L.apply(s);
    }
    return null;
  }

  // 讲解：cell 为什么不能放 d —— 返回同行/列/宫里已经有 d 的那一格，-1 表示是被区块/数对删掉的
  function blocker(L, cell, d) {
    var ps = L.G.peers[cell];
    for (var j = 0; j < ps.length; j++) if (L.g[ps[j]] === d) return ps[j];
    return -1;
  }

  function unitName(u) {
    return '第 ' + (u.idx + 1) + ' ' + (u.type === 'row' ? '行' : u.type === 'col' ? '列' : '宫');
  }

  var api = { TECH: TECH, geo: geo, bit: bit, pop: pop, digits: digits, shuffle: shuffle, search: search,
    Logic: Logic, grade: grade, nextPlacement: nextPlacement, blocker: blocker, unitName: unitName };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.SudokuCore = api;
})(this);
