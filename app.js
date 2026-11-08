// 数独训练营 —— 闯关 / 技巧训练 / 比赛模拟 / 每日训练 / 成绩
(function () {
  'use strict';
  var S = window.SudokuCore, BANK = window.SUDOKU_BANK;
  var $app = document.getElementById('app');

  // ---------------- 配置 ----------------
  var PER_LEVEL = 30;          // 每关闯关题数；题库 30–39 号留给比赛
  var PASS_COUNT = 6;          // 拿到 ★★ 以上的题数达到这个数，解锁下一关
  var MIN = 60000;
  var LEVELS = [
    { id: '6-1', n: 6, name: '6宫·入门', need: 1, target: 3, assist: true, desc: '只用「宫排除」就能做完' },
    { id: '6-2', n: 6, name: '6宫·初级', need: 2, target: 4, after: '6-1', desc: '加上「行列排除」' },
    { id: '6-3', n: 6, name: '6宫·进阶', need: 3, target: 6, after: '6-2', desc: '需要「唯一余数」' },
    { id: '6-4', n: 6, name: '6宫·挑战', need: 4, target: 8, after: '6-3', desc: '需要「区块排除」（选做）' },
    { id: '9-1', n: 9, name: '9宫·入门', need: 1, target: 8, after: '6-3', assist: true, desc: '9 宫入门，只用宫排除' },
    { id: '9-2', n: 9, name: '9宫·初级', need: 2, target: 12, after: '9-1', desc: '宫排除 + 行列排除' },
    { id: '9-3', n: 9, name: '9宫·中级', need: 3, target: 15, after: '9-2', desc: '需要「唯一余数」' },
    { id: '9-4', n: 9, name: '9宫·高级', need: 4, target: 20, after: '9-3', desc: '需要「区块排除」' },
    { id: '9-5', n: 9, name: '9宫·挑战', need: 5, target: 25, after: '9-4', desc: '需要「数对」' }
  ];
  var MAIN_PATH = ['6-1', '6-2', '6-3', '9-1', '9-2', '9-3', '9-4', '9-5'];
  var LV = {}; LEVELS.forEach(function (l) { LV[l.id] = l; });

  // 技巧训练：target = 掌握标准（10 题至少对 9 题，且平均秒数不超过它）
  var DRILLS = [
    { id: 'box', name: '宫排除', target: { 6: 8, 9: 15 }, src: { 6: ['6-2', '6-3'], 9: ['9-2', '9-3'] },
      how: '盯住一个宫和一个数字。宫外的行、列里如果已经有这个数字，就把它经过的格子划掉。宫里只剩一格没被划掉，答案就在那里。',
      tip: '比赛时最常用、最快的方法。按 1、2、3……的顺序，一个数字一个数字地扫一遍。' },
    { id: 'line', name: '行列排除', target: { 6: 10, 9: 20 }, src: { 6: ['6-2', '6-3'], 9: ['9-2', '9-3'] },
      how: '盯住一行（或一列）和一个数字。这一行的每个空格，如果它所在的列或宫已经有这个数字，就划掉。只剩一格时就是答案。',
      tip: '宫排除找不到的时候，换成看行和列。' },
    { id: 'naked', name: '唯一余数', target: { 6: 12, 9: 25 }, src: { 6: ['6-3'], 9: ['9-3'] },
      how: '盯住一个空格，把它所在的行、列、宫里已经出现的数字都数一遍。1 到 ' + 'N 里只剩一个没出现，就填它。',
      tip: '适合「快填满」的行、列、宫。数的时候可以在心里从 1 数到最大。' },
    { id: 'pointing', name: '区块排除', target: { 6: 40, 9: 60 }, src: { 6: ['6-4'], 9: ['9-4'] },
      how: '如果某个宫里，数字 d 只可能出现在同一行（或同一列）的几格里，那这一行在别的宫里就不能再放 d。先划掉这些格，再用排除法找到答案。',
      tip: '这是从初级到高级的关键一步。卡住时，问自己：哪个宫里的某个数字被「挤」在一条线上了？' }
  ];
  var DR = {}; DRILLS.forEach(function (d) { DR[d.id] = d; });
  var DRILL_Q = 10;

  // 比赛模拟：只有全对才得分，和大部分数独比赛一样
  var COMPS = [
    { id: 'c6', name: '小试牛刀', desc: '6宫 × 3', limit: 15, items: ['6-2', '6-3', '6-3'] },
    { id: 'cstd', name: '标准赛', desc: '6宫 × 2 + 9宫 × 2', limit: 30, items: ['6-3', '6-3', '9-2', '9-3'] },
    { id: 'cadv', name: '进阶赛', desc: '9宫 × 3', limit: 45, items: ['9-3', '9-4', '9-5'] }
  ];
  var CP = {}; COMPS.forEach(function (c) { CP[c.id] = c; });
  var POINTS = { 6: 10, 9: 20 };

  // ---------------- 存储 ----------------
  var KEY = 'sudoku-trainer-v1';
  var D = load();
  function load() {
    var x = null;
    try { x = JSON.parse(localStorage.getItem(KEY)); } catch (e) { x = null; }
    if (!x || x.v !== 1) x = { v: 1 };
    x.lv = x.lv || {}; x.drills = x.drills || {}; x.comps = x.comps || []; x.days = x.days || {};
    x.settings = x.settings || {}; if (x.settings.timer == null) x.settings.timer = true;
    x.settings.assist = x.settings.assist || 'auto';
    x.used = x.used || [];
    return x;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { /* 存不了也能玩 */ } }
  function pad2(v) { return (v < 10 ? '0' : '') + v; }
  function dateKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function today() { return dateKey(new Date()); }
  function day(k) { k = k || today(); return D.days[k] || (D.days[k] = { ms: 0, drill: 0, lv: 0, comp: 0 }); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function mins(ms) { return Math.max(0, Math.round(ms / MIN)); }
  function clockText(ms) { var m = Math.floor(ms / MIN); return m < 1 ? '不到 1 分' : m + ' 分'; }
  function secs(ms) { return (ms / 1000).toFixed(1); }
  function rand(k) { return Math.floor(Math.random() * k); }

  function puzzle(levelId, idx) {
    var s = BANK[levelId][idx].split('|'), n = LV[levelId].n;
    return { n: n, givens: s[0].split('').map(Number), sol: s[1].split('').map(Number) };
  }
  function levelCount(id) { return Math.min(PER_LEVEL, BANK[id].length); }

  // ---------------- 进度规则 ----------------
  function rec(id, idx) { return (D.lv[id] || {})[idx]; }
  function passedCount(id) { var r = D.lv[id] || {}, k = 0; for (var i in r) if (r[i].s >= 2) k++; return k; }
  function starTotal(id) { var r = D.lv[id] || {}, k = 0; for (var i in r) k += r[i].s; return k; }
  function doneCount(id) { return Object.keys(D.lv[id] || {}).length; }
  function passed(id) { return passedCount(id) >= PASS_COUNT; }
  function unlocked(id) { var l = LV[id]; return D.settings.unlockAll || !l.after || passed(l.after); }
  function focusLevel() {
    for (var i = 0; i < MAIN_PATH.length; i++) if (unlocked(MAIN_PATH[i]) && !passed(MAIN_PATH[i])) return MAIN_PATH[i];
    return MAIN_PATH[MAIN_PATH.length - 1];
  }
  function nextIdx(id) { var n = levelCount(id); for (var i = 0; i < n; i++) if (!rec(id, i)) return i; return rand(n); }
  function assistOn(level) { var a = D.settings.assist; return a === 'on' || (a === 'auto' && !!(level && level.assist)); }
  function drillKey(t, n) { return t + n; }
  function mastered(t, n) { var r = D.drills[drillKey(t, n)]; return !!(r && r.mastered); }

  // 今日训练：热身技巧 + 闯关 2 题 + 周末比赛
  function plan() {
    var f = LV[focusLevel()], n = f.n, d = new Date(), weekend = d.getDay() === 0 || d.getDay() === 6;
    var maxT = Math.min(4, f.need + 1), opts = DRILLS.slice(0, maxT).map(function (x) { return x.id; });
    if (n === 6 && opts.indexOf('pointing') >= 0 && !unlocked('6-4')) opts.pop();
    var pick = null;
    for (var i = 0; i < opts.length; i++) if (!mastered(opts[i], n)) { pick = opts[i]; break; }
    if (!pick) pick = opts[Math.floor(d.getTime() / 864e5) % opts.length];
    var comp = f.need >= 4 ? 'cadv' : n === 9 ? 'cstd' : 'c6';
    var dd = day(), items = [
      { kind: 'drill', label: '热身：' + DR[pick].name + '（' + n + '宫）' + DRILL_Q + ' 题', done: dd.drill >= 1, t: pick, n: n },
      { kind: 'lv', label: '闯关：' + f.name + ' 2 题', note: Math.min(dd.lv, 2) + '/2', done: dd.lv >= 2, id: f.id }
    ];
    if (weekend) items.push({ kind: 'comp', label: '周末比赛：' + CP[comp].name + '（' + CP[comp].desc + '）', done: dd.comp >= 1, id: comp });
    return items;
  }
  function markPlan() {
    var dd = day();
    if (!dd.ok && plan().every(function (x) { return x.done; })) dd.ok = 1;
  }
  function streak() {
    var d = new Date(), k = 0;
    if (!(D.days[dateKey(d)] || {}).ok) d.setDate(d.getDate() - 1);
    while ((D.days[dateKey(d)] || {}).ok) { k++; d.setDate(d.getDate() - 1); }
    return k;
  }

  // ---------------- 计时（只记真正在做题的时间） ----------------
  var lastTick = Date.now(), lastInput = Date.now();
  function activeTimer() {
    if (screen === 'game' && G && !G.finished) return G;
    if (screen === 'drill' && R && R.phase === 'q') return R;
    return null;
  }
  function tick() {
    var now = Date.now(), dt = now - lastTick;
    lastTick = now;
    if (document.hidden || dt > 30000 || now - lastInput > 3 * MIN) return;
    var t = activeTimer();
    if (t) {
      t.ms += dt; day().ms += dt;
      if (G && G.kind === 'comp' && C) { C.ms += dt; }
    }
    if (G && G.kind === 'comp' && C && C.ms >= C.limit && screen !== 'compResult') { submitComp(true); return; }
    updateClock();
  }
  setInterval(tick, 5000);
  document.addEventListener('visibilitychange', function () { tick(); lastTick = Date.now(); persist(); });
  var shownClock = '';
  function updateClock() {
    var el = document.getElementById('clock');
    if (!el) return;
    var txt = clockLabel();
    if (txt !== shownClock) { el.textContent = txt; shownClock = txt; }
  }
  function clockLabel() {
    if (screen === 'game' && G && G.kind === 'comp' && C) return '剩 ' + Math.max(0, Math.ceil((C.limit - C.ms) / MIN)) + ' 分';
    if (!D.settings.timer) return '';
    if (screen === 'game' && G) return clockText(G.ms);
    return '';
  }

  // ---------------- 页面切换 ----------------
  var screen = 'home', G = null, R = null, C = D.comp || null, overlay = '';
  function go(name) { screen = name; overlay = ''; render(); window.scrollTo(0, 0); }
  function render() {
    var f = VIEWS[screen] || VIEWS.home;
    shownClock = '';
    $app.innerHTML = f() + (overlay || '');
    updateClock();
  }
  function top(title, back, clock) {
    return '<div class="top"><button data-act="' + (back || 'home') + '">‹ 返回</button><div class="t">' + title + '</div>' +
      (clock ? '<div class="clock" id="clock"></div>' : '') + '</div>';
  }

  // ---------------- 棋盘 ----------------
  function boardSize(n, reserve) {
    var w = Math.min(window.innerWidth - 32, 888), h = window.innerHeight - reserve;
    var s = Math.max(240, Math.min(w, h));
    return Math.floor(s / n);
  }
  // o: {n, vals, given(bool[]), notes, sel, hl, same, ring, cross, ans, wrong, conf, blk, cs, act}
  function boardHTML(o) {
    var G0 = S.geo(o.n), n = o.n, cs = o.cs, out = [];
    var set = function (a) { var m = {}; (a || []).forEach(function (i) { m[i] = 1; }); return m; };
    var hl = set(o.hl), ring = set(o.ring), cross = set(o.cross), wrong = set(o.wrong), conf = set(o.conf), blk = set(o.blk);
    for (var i = 0; i < G0.N; i++) {
      var r = G0.rowOf[i], c = G0.colOf[i], v = o.vals[i], cls = ['cell'];
      if ((c + 1) % G0.bc === 0) cls.push('rb');
      if ((r + 1) % G0.br === 0) cls.push('bb');
      if (c === n - 1) cls.push('lastc');
      if (r === n - 1) cls.push('lastr');
      if (o.given && o.given[i]) cls.push('g');
      if (hl[i]) cls.push('hl');
      if (o.same && v === o.same) cls.push('same');
      if (o.sel === i) cls.push('sel');
      if (o.ans === i) cls.push('ans');
      if (blk[i]) cls.push('blk');
      if (ring[i]) cls.push('ring');
      if (cross[i] && !v) cls.push('x');
      if (wrong[i]) cls.push('wrong');
      if (conf[i]) cls.push('conf');
      var inner = '';
      if (v) inner = '<span class="v">' + v + '</span>';
      else if (o.notes && o.notes[i]) {
        inner = '<div class="notes" style="grid-template-columns:repeat(' + G0.bc + ',1fr)">';
        for (var d = 1; d <= n; d++) inner += '<span>' + (o.notes[i] & S.bit(d) ? d : '') + '</span>';
        inner += '</div>';
      }
      out.push('<div class="' + cls.join(' ') + '"' + (o.act ? ' data-act="' + o.act + '" data-i="' + i + '"' : '') +
        ' style="width:' + cs + 'px;height:' + cs + 'px;font-size:' + Math.round(cs * 0.56) + 'px">' + inner + '</div>');
    }
    return '<div class="board" style="grid-template-columns:repeat(' + n + ',' + cs + 'px);width:' + (cs * n + 8) + 'px">' + out.join('') + '</div>';
  }
  function miniHTML(n, vals, given, wrong) {
    var G0 = S.geo(n), cs = n === 9 ? 22 : 30, out = [], w = {};
    (wrong || []).forEach(function (i) { w[i] = 1; });
    for (var i = 0; i < G0.N; i++) {
      var cls = [];
      if ((G0.colOf[i] + 1) % G0.bc === 0 && G0.colOf[i] < n - 1) cls.push('rb');
      if ((G0.rowOf[i] + 1) % G0.br === 0 && G0.rowOf[i] < n - 1) cls.push('bb');
      if (G0.colOf[i] === n - 1) cls.push('lc');
      if (G0.rowOf[i] === n - 1) cls.push('lr');
      if (given[i]) cls.push('g');
      if (w[i]) cls.push('wrong');
      out.push('<div class="' + cls.join(' ') + '" style="width:' + cs + 'px;height:' + cs + 'px">' + (vals[i] || '') + '</div>');
    }
    return '<div class="mini" style="grid-template-columns:repeat(' + n + ',' + cs + 'px)">' + out.join('') + '</div>';
  }
  function conflicts(n, vals) {
    var out = [];
    S.geo(n).units.forEach(function (u) {
      var seen = {};
      u.cells.forEach(function (p) { var v = vals[p]; if (v) (seen[v] = seen[v] || []).push(p); });
      for (var v in seen) if (seen[v].length > 1) out = out.concat(seen[v]);
    });
    return out;
  }

  // ---------------- 讲解（提示 / 训练错题共用） ----------------
  function techName(s) {
    if (s.t === 'line') return s.unit.type === 'row' ? '行排除' : '列排除';
    return S.TECH[s.t].name;
  }
  function chainText(s) {
    if (s.t === 'pointing') {
      return '<b>区块排除</b>：' + S.unitName(s.from) + '里，' + s.d + ' 只可能在' + S.unitName(s.to) + '上（粗框的格子），所以' +
        S.unitName(s.to) + '的其他格都不能放 ' + s.d + '（打 × 的格）。';
    }
    var ds = S.digits(s.mask).join(' 和 ');
    if (s.kind === 'naked') return '<b>数对</b>：' + S.unitName(s.unit) + '里，粗框的两格都只能填 ' + ds + '，所以这一' + unitWord(s.unit) + '的其他格不能填 ' + ds + '。';
    return '<b>隐性数对</b>：' + S.unitName(s.unit) + '里，' + ds + ' 只能放在粗框的两格，所以这两格不能再填别的数。';
  }
  function unitWord(u) { return u.type === 'row' ? '行' : u.type === 'col' ? '列' : '宫'; }
  // 返回 {hl, ring, cross, blk, ans, text}
  function explain(np) {
    var s = np.step, L = np.logic, m = { hl: [], ring: [], cross: [], blk: [], ans: s.cell, text: '' }, parts = [];
    np.chain.forEach(function (c) {
      parts.push(chainText(c));
      m.blk = m.blk.concat(c.cells);
      c.elim.forEach(function (e) { m.cross.push(e.cell); });
    });
    var viaChain = false;
    if (s.t === 'box' || s.t === 'line') {
      m.hl = s.unit.cells.slice();
      s.unit.cells.forEach(function (p) {
        if (p === s.cell || L.g[p]) return;
        var b = S.blocker(L, p, s.d);
        if (b >= 0) m.ring.push(b); else viaChain = true;
        m.cross.push(p);
      });
      parts.push('<b>' + techName(s) + '</b>：' + S.unitName(s.unit) + '里，其他空格的同一行、列或宫里已经有 ' + s.d +
        '（圈出来的数）' + (viaChain ? '，或者刚刚被排除了' : '') + '，只剩粗框这一格能放 <b>' + s.d + '</b>。');
    } else {
      var seen = [], ringed = {};
      for (var d = 1; d <= L.n; d++) {
        if (d === s.d) continue;
        var ps = L.G.peers[s.cell], hit = -1;
        for (var j = 0; j < ps.length; j++) if (L.g[ps[j]] === d) { hit = ps[j]; break; }
        if (hit >= 0) { if (!ringed[hit]) { m.ring.push(hit); ringed[hit] = 1; } seen.push(d); } else viaChain = true;
      }
      m.hl = L.G.peers[s.cell].slice();
      parts.push('<b>唯一余数</b>：这一格所在的行、列、宫里已经有 ' + seen.join('、') + (viaChain ? '（其余的被排除了）' : '') +
        '，只剩 <b>' + s.d + '</b>。');
    }
    m.text = parts.join('<br>');
    return m;
  }

  // ---------------- 闯关 / 比赛的做题页 ----------------
  function newGame(kind, levelId, idx, p) {
    var n = p.n;
    return { kind: kind, level: levelId, idx: idx, n: n, givens: p.givens, sol: p.sol, board: p.givens.slice(),
      notes: new Array(n * n).fill(0), sel: -1, noteMode: false, undo: [], ms: 0, mistakes: 0, hints: 0,
      wrong: [], hintKey: '', hintStage: 0, marks: null, msg: '', finished: false };
  }
  function startLevel(id, idx) {
    if (D.cur && D.cur.level === id && D.cur.idx === idx && !D.cur.finished) { G = D.cur; }
    else { G = newGame('lv', id, idx, puzzle(id, idx)); D.cur = G; }
    G.sel = -1; G.marks = null; G.msg = G.msg || '';
    save(); go('game');
  }
  function persist() {
    if (G && G.kind === 'lv' && !G.finished) D.cur = G;
    if (C) D.comp = C;
    save();
  }
  function snapshot() { G.undo.push([G.board.slice(), G.notes.slice()]); if (G.undo.length > 200) G.undo.shift(); }
  function boardChanged() { G.marks = null; G.hintStage = 0; G.hintKey = ''; }

  function gameView() {
    var lvl = LV[G.level], n = G.n, inComp = G.kind === 'comp';
    var title = inComp ? '比赛 · 第 ' + (C.cur + 1) + ' 题 / ' + C.items.length : lvl.name + ' · 第 ' + (G.idx + 1) + ' 题';
    var assist = !inComp && assistOn(lvl);
    var m = G.marks || {};
    var selV = G.sel >= 0 ? G.board[G.sel] : 0;
    var hl = m.hl || [];
    if (!G.marks && assist && G.sel >= 0) hl = S.geo(n).peers[G.sel];
    var html = top(title, inComp ? 'compSheet' : 'levelPage', true);
    html += boardHTML({ n: n, vals: G.board, given: G.givens.map(Boolean), notes: G.notes, sel: G.marks ? -1 : G.sel,
      hl: hl, same: assist && !G.marks ? selV : 0, ring: m.ring, cross: m.cross, blk: m.blk, ans: m.ans,
      wrong: G.wrong, conf: assist ? conflicts(n, G.board) : [], cs: boardSize(n, 440), act: 'cell' });
    html += '<div class="msg">' + (G.msg || (G.noteMode ? '笔记模式：点数字记下候选，再点一次去掉。' : '先点格子，再点数字。')) + '</div>';
    var cnt = {};
    G.board.forEach(function (v) { if (v) cnt[v] = (cnt[v] || 0) + 1; });
    html += '<div class="pad" style="grid-template-columns:repeat(' + n + ',1fr)">';
    for (var d = 1; d <= n; d++) html += '<button data-act="digit" data-d="' + d + '"' + ((cnt[d] || 0) >= n ? ' disabled' : '') + '>' + d + '<small>' + (n - (cnt[d] || 0)) + '</small></button>';
    html += '</div>';
    var tools = [
      '<button data-act="note" class="' + (G.noteMode ? 'on' : '') + '">笔记' + (G.noteMode ? '：开' : '') + '</button>',
      '<button data-act="erase">擦除</button>', '<button data-act="undo">撤销</button>'
    ];
    if (inComp) tools.push('<button data-act="compSheet">题单</button>');
    else tools.push('<button data-act="hint">提示</button>', '<button data-act="check">检查</button>');
    html += '<div class="tools" style="grid-template-columns:repeat(' + tools.length + ',1fr)">' + tools.join('') + '</div>';
    if (!inComp) html += '<p class="sub small">本题：错 ' + G.mistakes + ' 次 · 提示 ' + G.hints + ' 次 · ★★★ 目标 ' + lvl.target + ' 分钟内、不用提示、不出错</p>';
    return html;
  }

  function tapCell(i) {
    if (G.finished) return;
    if (G.marks) { G.marks = null; }
    G.sel = i; G.msg = '';
    render();
  }
  function tapDigit(d) {
    if (G.finished) return;
    var i = G.sel;
    if (i < 0) { G.msg = '先点一个空格。'; render(); return; }
    if (G.givens[i]) { G.msg = '这是题目给的数，不能改。'; render(); return; }
    snapshot();
    if (G.noteMode) {
      if (G.board[i]) { G.undo.pop(); return; }
      G.notes[i] ^= S.bit(d);
    } else {
      G.board[i] = G.board[i] === d ? 0 : d;
      G.notes[i] = 0;
      if (G.board[i]) S.geo(G.n).peers[i].forEach(function (p) { G.notes[p] &= ~S.bit(d); });
      G.wrong = G.wrong.filter(function (x) { return x !== i; });
    }
    boardChanged(); G.msg = '';
    afterMove();
  }
  function afterMove() {
    var full = G.board.every(Boolean);
    if (full && G.kind === 'lv') {
      var bad = wrongCells();
      if (!bad.length) { finishLevel(); return; }
      addWrong(bad);
      G.msg = '填满了，但有 <b>' + bad.length + '</b> 格不对（斜线标出）。改好就过关。';
    } else if (full && G.kind === 'comp') {
      G.msg = '这题填满了。回「题单」做下一题，全部做完再交卷。';
    }
    persist(); render();
  }
  function wrongCells() { var out = []; for (var i = 0; i < G.board.length; i++) if (G.board[i] && G.board[i] !== G.sol[i]) out.push(i); return out; }
  function addWrong(cells) {
    cells.forEach(function (i) { if (G.wrong.indexOf(i) < 0) { G.wrong.push(i); G.mistakes++; } });
  }
  function doCheck() {
    var bad = wrongCells();
    if (!bad.length) G.msg = '目前填的都对，继续！';
    else { addWrong(bad); G.msg = '有 <b>' + bad.length + '</b> 格不对，已用斜线标出（算错 ' + bad.length + ' 次）。'; }
    persist(); render();
  }
  function doHint() {
    var bad = wrongCells();
    if (bad.length) {
      var fresh = bad.filter(function (i) { return G.wrong.indexOf(i) < 0; });
      addWrong(bad); if (fresh.length) G.hints++;
      G.msg = '先改正斜线标出的格子，它们填错了。';
      persist(); render(); return;
    }
    var key = G.board.join('');
    var np = S.nextPlacement(G.board, G.n, 5);
    if (!np) { G.msg = '这一步太难了，试试先做笔记。'; render(); return; }
    if (G.hintKey !== key) { G.hintKey = key; G.hintStage = 1; G.hints++; } else G.hintStage = Math.min(3, G.hintStage + 1);
    var s = np.step, c0 = np.chain[0];
    if (G.hintStage === 1) {
      if (c0) {
        G.marks = { hl: c0.t === 'pointing' ? c0.from.cells : c0.unit.cells };
        G.msg = '提示 1/3：' + (c0.t === 'pointing' ? '看看' + S.unitName(c0.from) + '里的数字 <b>' + c0.d + '</b>，它能放的格子在一条线上吗？' : '看看' + S.unitName(c0.unit) + '，有没有两格只能填同样两个数？');
      } else if (s.t === 'naked') {
        G.marks = { ans: s.cell };
        G.msg = '提示 1/3：看看粗框这一格，它所在的行、列、宫里已经有哪些数？';
      } else {
        G.marks = { hl: s.unit.cells };
        G.msg = '提示 1/3：看看' + S.unitName(s.unit) + '（灰色）。';
      }
    } else if (G.hintStage === 2) {
      if (c0) { var e = explain(np); G.marks = { hl: e.hl, blk: e.blk, cross: np.chain.reduce(function (a, c) { return a.concat(c.elim.map(function (x) { return x.cell; })); }, []) };
        G.msg = '提示 2/3：' + chainText(c0) + '<br>再找找现在哪一格能确定。'; }
      else if (s.t === 'naked') { G.marks = { ans: s.cell, hl: S.geo(G.n).peers[s.cell] }; G.msg = '提示 2/3：用<b>唯一余数</b>：把灰色格子里出现过的数排除掉，还剩几？'; }
      else { G.marks = { hl: s.unit.cells }; G.msg = '提示 2/3：用<b>' + techName(s) + '</b>：' + S.unitName(s.unit) + '里，数字 <b>' + s.d + '</b> 应该放哪？'; }
    } else {
      var ex = explain(np);
      G.marks = ex;
      snapshot();
      G.board[s.cell] = s.d; G.notes[s.cell] = 0;
      S.geo(G.n).peers[s.cell].forEach(function (p) { G.notes[p] &= ~S.bit(s.d); });
      G.msg = '提示 3/3：' + ex.text;
      G.hintKey = '';
      if (G.board.every(Boolean)) { persist(); setTimeout(finishLevel, 1500); render(); return; }
    }
    persist(); render();
  }
  function stars(g) {
    var t = LV[g.level].target * MIN;
    if (!g.hints && !g.mistakes && g.ms <= t) return 3;
    if (g.hints <= 1 && g.mistakes <= 2 && g.ms <= t * 2) return 2;
    return 1;
  }
  function finishLevel() {
    if (G.finished) return;
    G.finished = true;
    var st = stars(G), id = G.level, r = (D.lv[id] = D.lv[id] || {}), old = r[G.idx], wasPassed = passed(id);
    var isBest = !old || G.ms < old.t;
    r[G.idx] = { s: Math.max(st, old ? old.s : 0), t: old ? Math.min(old.t, G.ms) : G.ms, k: (old ? old.k : 0) + 1,
      last: { s: st, t: G.ms, m: G.mistakes, h: G.hints, at: Date.now() } };
    day().lv++; D.cur = null; markPlan(); save();
    var wasLocked = !wasPassed && passed(id) && !D.settings.unlockAll ? LEVELS.filter(function (l) { return l.after === id; }) : [];
    var unlockMsg = wasLocked.length ? '<p><b>解锁新关卡：' + wasLocked.map(function (l) { return l.name; }).join('、') + '！</b></p>' : '';
    var why = st === 3 ? '完美！' : st === 2 ? '想拿 ★★★：不用提示、不出错、' + LV[id].target + ' 分钟内。' : '想拿 ★★：最多 1 次提示、2 次错，' + LV[id].target * 2 + ' 分钟内。';
    overlay = '<div class="overlay"><div class="card"><h2>完成！</h2><div class="result-stars">' + '★'.repeat(st) + '☆'.repeat(3 - st) + '</div>' +
      '<p>用时 ' + fmtTime(G.ms) + (isBest && old ? '（新纪录）' : '') + ' · 错 ' + G.mistakes + ' · 提示 ' + G.hints + '</p><p class="sub">' + why + '</p>' + unlockMsg +
      '<div class="row" style="justify-content:center"><button data-act="levelPage">回关卡</button><button data-act="replay">再做一次</button><button data-act="nextPuzzle" class="on">下一题</button></div></div></div>';
    render();
  }
  function fmtTime(ms) { var s = Math.round(ms / 1000); return Math.floor(s / 60) + ' 分 ' + pad2(s % 60) + ' 秒'; }

  // ---------------- 技巧训练 ----------------
  function genQ(t, n) {
    var dr = DR[t], srcs = dr.src[n];
    for (var attempt = 0; attempt < 80; attempt++) {
      var lid = srcs[rand(srcs.length)], p = puzzle(lid, rand(BANK[lid].length)), L = new S.Logic(p.givens, n);
      var q = null;
      if (t === 'pointing') q = pointingQ(L);
      else {
        var empty = L.g.filter(function (v) { return !v; }).length, k = rand(Math.max(1, Math.floor(empty * 0.6)));
        for (var j = 0; j < k; j++) { var st = L.step(3); if (!st) break; L.apply(st); }
        var cands = singles(L, t);
        if (cands.length) { var s = cands[rand(cands.length)]; q = { L: L, s: s, chain: [] }; }
      }
      if (q) { q.board = q.L.g.slice(); q.t = t; q.n = n; return q; }
    }
    return null;
  }
  function key2(s) { return s.cell + ':' + s.d; }
  // 只出「必须用这一招」的题：行列排除题不能用宫排除直接看出，唯一余数题不能用任何排除看出
  function singles(L, t) {
    if (t === 'box') return L.hidden(['box']);
    var boxK = {}; L.hidden(['box']).forEach(function (s) { boxK[key2(s)] = 1; });
    if (t === 'line') return L.hidden(['row', 'col']).filter(function (s) { return !boxK[key2(s)]; });
    var anyK = {}; L.hidden(['box', 'row', 'col']).forEach(function (s) { anyK[key2(s)] = 1; });
    return L.naked().filter(function (s) { return !anyK[key2(s)]; });
  }
  function pointingQ(L) {
    for (var guard = 0; guard < 200; guard++) {
      var st;
      while ((st = L.step(3))) L.apply(st);
      if (L.done()) return null;
      var ps = L.pointing();
      if (!ps.length) return null;
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i], L2 = L.clone(); L2.apply(p);
        var got = L2.hidden(['box', 'row', 'col']).filter(function (s) { return s.d === p.d; });
        if (got.length) {
          return { L: L2, s: got[0], chain: [p] };
        }
      }
      L.apply(ps[0]);
    }
    return null;
  }
  function qPrompt(q) {
    var s = q.s;
    if (q.t === 'naked') return '粗框这一格只能填几？点下面的数字。';
    if (q.t === 'pointing') return '先看' + S.unitName(q.chain[0].from) + '（灰色）里的数字 <b>' + s.d + '</b>。用区块排除后，哪一格<b>必须</b>是 ' + s.d + '？点那一格。';
    return S.unitName(s.unit) + '（灰色）里，数字 <b>' + s.d + '</b> 应该在哪一格？点那一格。';
  }
  function startDrill(t, n, demo) {
    R = { t: t, n: n, i: 0, res: [], ms: 0, phase: 'q', demo: !!demo, q: genQ(t, n), msg: '' };
    if (!R.q) { alert('暂时出不了这类题，换一个试试。'); return; }
    R.qStart = R.ms;
    if (demo) R.phase = 'demo';
    go('drill');
  }
  function drillView() {
    var q = R.q, s = q.s, dr = DR[R.t], n = R.n, m = {};
    var title = dr.name + '（' + n + '宫）' + (R.demo ? ' · 示范' : ' · 第 ' + (R.i + 1) + ' / ' + DRILL_Q + ' 题');
    if (R.phase === 'q') {
      if (q.t === 'naked') m = { ans: s.cell };
      else if (q.t === 'pointing') m = { hl: q.chain[0].from.cells };
      else m = { hl: s.unit.cells };
    } else {
      m = explain({ step: s, chain: q.chain, logic: q.L });
      if (R.phase === 'wrong' && R.tapped != null && R.tapped !== s.cell) m.wrong = [R.tapped];
    }
    var vals = q.board.slice();
    if (R.phase !== 'q') vals[s.cell] = s.d;
    var html = top(title, 'drillMenu', false);
    html += boardHTML({ n: n, vals: vals, given: q.board.map(Boolean), hl: m.hl, ring: m.ring, cross: m.cross, blk: m.blk, ans: m.ans,
      wrong: m.wrong, cs: boardSize(n, q.t === 'naked' ? 420 : 330), act: R.phase === 'q' && q.t !== 'naked' ? 'qcell' : '' });
    var msg = R.phase === 'q' ? qPrompt(q) : R.phase === 'ok' ? '✓ 对了！' + (R.lastMs != null ? '用了 ' + secs(R.lastMs) + ' 秒。' : '') : R.phase === 'demo' ? '示范：' + m.text : '✗ 答案是粗框这一格。' + m.text;
    html += '<div class="msg">' + msg + (R.msg ? '<br>' + R.msg : '') + '</div>';
    if (R.phase === 'q' && q.t === 'naked') {
      html += '<div class="pad" style="grid-template-columns:repeat(' + n + ',1fr)">';
      for (var d = 1; d <= n; d++) html += '<button data-act="qdigit" data-d="' + d + '">' + d + '</button>';
      html += '</div>';
    }
    if (R.phase === 'demo') html += '<div class="row"><button class="grow" data-act="demoAgain">再看一个示范</button><button class="grow on" data-act="drillGo">开始 ' + DRILL_Q + ' 题</button></div>';
    if (R.phase === 'wrong' || R.phase === 'ok') html += '<button class="big" data-act="qnext">' + (R.i + 1 >= DRILL_Q ? '看成绩' : '下一题') + '</button>';
    return html;
  }
  function answer(ok, tapped) {
    var dt = R.ms - R.qStart;
    R.res.push({ ok: ok, ms: dt });
    R.lastMs = dt; R.tapped = tapped;
    R.phase = ok ? 'ok' : 'wrong';
    R.msg = '';
    render();
  }
  function tapQCell(i) {
    if (R.phase !== 'q') return;
    flushDrillTime();
    var q = R.q, s = q.s;
    if (q.t !== 'pointing' && s.unit.cells.indexOf(i) < 0) { R.msg = '要在' + S.unitName(s.unit) + '（灰色）里找哦。'; render(); return; }
    if (q.board[i]) { R.msg = '这格已经有数了，找空格。'; render(); return; }
    answer(i === s.cell, i);
  }
  function flushDrillTime() { var now = Date.now(), dt = now - lastTick; if (dt < 30000) { R.ms += dt; day().ms += dt; } lastTick = now; }
  function nextQ() {
    R.i++;
    if (R.i >= DRILL_Q) { finishDrill(); return; }
    R.q = genQ(R.t, R.n); R.phase = 'q'; R.qStart = R.ms; R.msg = '';
    render();
  }
  function finishDrill() {
    var ok = R.res.filter(function (r) { return r.ok; }), avg = ok.length ? ok.reduce(function (a, r) { return a + r.ms; }, 0) / ok.length : 0;
    var key = drillKey(R.t, R.n), old = D.drills[key] || { sets: 0 }, target = DR[R.t].target[R.n] * 1000;
    var good = ok.length >= DRILL_Q - 1 && avg <= target;
    D.drills[key] = { sets: old.sets + 1, best: ok.length >= DRILL_Q - 1 ? (old.best ? Math.min(old.best, avg) : avg) : old.best || 0,
      last: { ok: ok.length, avg: avg, at: Date.now() }, mastered: old.mastered || good,
      hist: (old.hist || []).concat([[Date.now(), ok.length, Math.round(avg)]]).slice(-30) };
    day().drill++; markPlan(); save();
    R.summary = { ok: ok.length, avg: avg, target: target, good: good, first: good && !old.mastered };
    go('drillResult');
  }
  function drillResultView() {
    var r = R.summary, dr = DR[R.t];
    var html = top(dr.name + '（' + R.n + '宫）· 成绩', 'drillMenu', false);
    html += '<div class="card" style="text-align:center"><div class="result-stars">' + r.ok + ' / ' + DRILL_Q + '</div>' +
      '<p>答对的题平均 <b>' + secs(r.avg) + ' 秒</b> 一题（掌握标准：对 ' + (DRILL_Q - 1) + ' 题以上、平均 ' + secs(r.target) + ' 秒内）</p>' +
      (r.first ? '<p><b>🏅 掌握了「' + dr.name + '」！</b></p>' : r.good ? '<p>保持住了，很稳！</p>' :
        r.ok < DRILL_Q - 1 ? '<p class="sub">先求准：看清每个被划掉的格子，再追求速度。</p>' : '<p class="sub">已经很准了，下一步练速度：按数字顺序扫，别跳。</p>') + '</div>';
    html += '<div class="row"><button class="grow" data-act="drillMenu">换一个技巧</button><button class="grow on" data-act="drillAgain">再来 ' + DRILL_Q + ' 题</button></div>';
    return html;
  }

  // ---------------- 比赛模拟 ----------------
  function pickComp(levelId) {
    var total = BANK[levelId].length, pool = [];
    for (var i = PER_LEVEL; i < total; i++) pool.push(i);
    if (!pool.length) for (var j = 0; j < total; j++) pool.push(j);
    var fresh = pool.filter(function (i) { return D.used.indexOf(levelId + ':' + i) < 0; });
    if (!fresh.length) { D.used = D.used.filter(function (u) { return u.indexOf(levelId + ':') !== 0; }); fresh = pool; }
    var idx = fresh[rand(fresh.length)];
    D.used.push(levelId + ':' + idx);
    return idx;
  }
  function startComp(id) {
    var c = CP[id];
    C = { id: id, ms: 0, limit: c.limit * MIN, cur: -1, items: c.items.map(function (lid) {
      var idx = pickComp(lid), g = newGame('comp', lid, idx, puzzle(lid, idx)); return g;
    }) };
    D.comp = C; save(); go('compSheet');
  }
  function compSheetView() {
    var c = CP[C.id], html = top('比赛：' + c.name, 'home', false);
    html += '<p>剩 <b>' + Math.max(0, Math.ceil((C.limit - C.ms) / MIN)) + '</b> 分钟（共 ' + c.limit + ' 分钟，只在做题页计时）。只有整题全对才得分。没有提示、没有检查，交卷前自己再验一遍。</p>';
    html += '<div class="grid2">';
    C.items.forEach(function (g, k) {
      var filled = g.board.filter(Boolean).length - g.givens.filter(Boolean).length, empty = g.givens.filter(function (v) { return !v; }).length;
      html += '<button class="tile" data-act="compOpen" data-k="' + k + '"><b>第 ' + (k + 1) + ' 题 · ' + g.n + '宫 · ' + POINTS[g.n] + ' 分</b>' +
        miniHTML(g.n, g.board, g.givens.map(Boolean)) + '<span><br>已填 ' + filled + ' / ' + empty + '</span></button>';
    });
    html += '</div><button class="big on" data-act="compSubmit">交卷</button>';
    return html;
  }
  function submitComp(timeUp) {
    if (G && G.kind === 'comp') G = null;
    var c = CP[C.id], res = [], score = 0, max = 0;
    C.items.forEach(function (g) {
      var ok = g.board.every(function (v, i) { return v === g.sol[i]; });
      res.push(ok ? 1 : 0); max += POINTS[g.n]; if (ok) score += POINTS[g.n];
    });
    D.comps.push({ at: Date.now(), id: C.id, score: score, max: max, ms: Math.min(C.ms, C.limit), res: res });
    day().comp++; markPlan();
    C.result = { score: score, max: max, res: res, timeUp: !!timeUp };
    var done = C; C = null; D.comp = null; save();
    lastComp = done;
    go('compResult');
  }
  var lastComp = null;
  function compResultView() {
    var c = lastComp, r = c.result, html = top('比赛成绩', 'home', false);
    html += '<div class="card" style="text-align:center"><div class="result-stars">' + r.score + ' / ' + r.max + ' 分</div><p>' +
      (r.timeUp ? '时间到，自动交卷。' : '用时 ' + fmtTime(c.ms) + '。') + '</p></div>';
    html += '<div class="grid2">';
    c.items.forEach(function (g, k) {
      var wrong = [];
      g.board.forEach(function (v, i) { if (v !== g.sol[i]) wrong.push(i); });
      html += '<div class="card thin"><b>第 ' + (k + 1) + ' 题 ' + (r.res[k] ? '✓ 全对' : '✗ ' + wrong.length + ' 格不对或没填') + '</b><br>' +
        miniHTML(g.n, g.board, g.givens.map(Boolean), wrong) + '</div>';
    });
    html += '</div><p class="sub">灰色格 = 填错或没填。比赛里错一格整题不得分，所以交卷前一定要每行每列再看一遍。</p>';
    html += '<div class="row"><button class="grow" data-act="home">回首页</button><button class="grow on" data-act="compAgain" data-id="' + c.id + '">再比一场</button></div>';
    return html;
  }

  // ---------------- 各页面 ----------------
  var VIEWS = {
    home: function () {
      var dd = day(), sk = streak(), html = '<h1>数独训练营</h1>';
      html += '<p class="sub">' + (sk ? '已经连续练了 <b>' + sk + '</b> 天 · ' : '') + '今天练了 ' + mins(dd.ms) + ' 分钟</p>';
      var items = plan();
      html += '<div class="card"><h2 style="margin-top:4px">今日训练 <span class="tag">约 20 分钟</span></h2>';
      items.forEach(function (it, k) {
        html += '<div class="check"><div class="box' + (it.done ? ' done' : '') + '">' + (it.done ? '✓' : '') + '</div><div class="what">' + esc(it.label) +
          (it.note ? ' <span class="sub">' + it.note + '</span>' : '') + '</div>' + (it.done ? '' : '<button data-act="planGo" data-k="' + k + '">开始</button>') + '</div>';
      });
      if (items.every(function (x) { return x.done; })) html += '<p><b>今天的训练完成了！</b> 可以休息，也可以自由练。</p>';
      html += '</div>';
      if (D.cur && !D.cur.finished) html += '<button class="big" data-act="resume">继续上次：' + LV[D.cur.level].name + ' 第 ' + (D.cur.idx + 1) + ' 题</button>';
      if (C) html += '<button class="big" data-act="compSheet">继续比赛：' + CP[C.id].name + '（剩 ' + Math.ceil((C.limit - C.ms) / MIN) + ' 分）</button>';
      html += '<div class="grid2">' +
        '<button class="tile" data-act="levels"><b>闯关</b><span>' + LV[focusLevel()].name + ' · ' + passedCount(focusLevel()) + '/' + PASS_COUNT + ' 解锁下一关</span></button>' +
        '<button class="tile" data-act="drillMenu"><b>技巧训练</b><span>四种基本功，10 题一组，练准再练快</span></button>' +
        '<button class="tile" data-act="compMenu"><b>比赛模拟</b><span>限时、无提示、全对才得分</span></button>' +
        '<button class="tile" data-act="stats"><b>成绩</b><span>进步曲线 · 家长设置</span></button></div>';
      html += '<div class="card thin small"><b>怎么认格子：</b>行从上往下数，列从左往右数，宫从左上角开始一排一排数（6 宫每宫 2 行 3 列，9 宫每宫 3×3）。</div>';
      return html;
    },
    levels: function () {
      var html = top('闯关', 'home');
      html += '<p class="sub">每关拿到 ' + PASS_COUNT + ' 个 ★★ 就能解锁下一关。6 宫进阶过了之后开 9 宫。</p>';
      LEVELS.forEach(function (l) {
        var open = unlocked(l.id);
        html += '<button class="tile" style="margin:8px 0;min-height:100px" ' + (open ? 'data-act="levelOpen" data-id="' + l.id + '"' : 'disabled') + '><b>' + l.name +
          (passed(l.id) ? ' ✓' : '') + '</b><span>' + l.desc + ' · ' + (open ? '完成 ' + doneCount(l.id) + '/' + levelCount(l.id) + ' · ★ ' + starTotal(l.id) +
          ' · ★★ ' + passedCount(l.id) + '/' + PASS_COUNT : '🔒 先通过「' + LV[l.after].name + '」') + '</span></button>';
      });
      return html;
    },
    levelPage: function () {
      var l = LV[curLevel], html = top(l.name, 'levels');
      html += '<p>' + l.desc + '。★★★ = 不用提示、不出错、' + l.target + ' 分钟内；★★ = 最多 1 次提示、2 次错、' + (l.target * 2) + ' 分钟内。</p>';
      html += '<div class="lvlist">';
      for (var i = 0; i < levelCount(l.id); i++) {
        var r = rec(l.id, i), st = r ? '★'.repeat(r.s) + '☆'.repeat(3 - r.s) : '';
        var cur = D.cur && D.cur.level === l.id && D.cur.idx === i;
        html += '<button class="lvbtn" data-act="play" data-i="' + i + '"><b>' + (i + 1) + '</b><small>' + (cur ? '做到一半' : st || '·') + '</small></button>';
      }
      html += '</div><button class="big on" data-act="play" data-i="' + nextIdx(l.id) + '">开始第 ' + (nextIdx(l.id) + 1) + ' 题</button>';
      return html;
    },
    game: gameView,
    drillMenu: function () {
      var html = top('技巧训练', 'home');
      html += '<p class="sub">每组 ' + DRILL_Q + ' 题，每题只考一招。先求准，再求快。达到标准就算「掌握」🏅。</p>';
      DRILLS.forEach(function (d) {
        html += '<div class="card"><div class="row"><div class="grow"><b style="font-size:26px">' + d.name + '</b></div>';
        [6, 9].forEach(function (n) {
          var r = D.drills[drillKey(d.id, n)];
          html += '<button data-act="drillIntro" data-t="' + d.id + '" data-n="' + n + '">' + n + '宫' + (r && r.mastered ? ' 🏅' : '') + '</button>';
        });
        html += '</div><p class="small">' + d.how.replace('N', '最大的数') + '</p></div>';
      });
      return html;
    },
    drillIntro: function () {
      var d = DR[introT], n = introN, r = D.drills[drillKey(d.id, n)];
      var html = top(d.name + '（' + n + '宫）', 'drillMenu');
      html += '<div class="card"><p><b>怎么做：</b>' + d.how.replace('N', String(n)) + '</p><p><b>小窍门：</b>' + d.tip + '</p>' +
        '<p class="sub">掌握标准：' + DRILL_Q + ' 题对 ' + (DRILL_Q - 1) + ' 题以上，平均每题 ' + d.target[n] + ' 秒内。' +
        (r ? '<br>上次：对 ' + r.last.ok + ' 题，平均 ' + secs(r.last.avg) + ' 秒' + (r.best ? ' · 最好 ' + secs(r.best) + ' 秒' : '') : '') + '</p></div>';
      html += '<div class="row"><button class="grow" data-act="demo">先看示范</button><button class="grow on" data-act="drillGo">开始 ' + DRILL_Q + ' 题</button></div>';
      return html;
    },
    drill: drillView,
    drillResult: drillResultView,
    compMenu: function () {
      var html = top('比赛模拟', 'home');
      html += '<p>和正式比赛一样：<b>限时</b>、<b>没有提示和检查</b>、<b>整题全对才得分</b>（6 宫 10 分、9 宫 20 分）。可以在题单里随便先做哪题。</p>';
      COMPS.forEach(function (c) {
        var best = D.comps.filter(function (x) { return x.id === c.id; }).reduce(function (a, x) { return Math.max(a, x.score); }, -1);
        html += '<button class="tile" style="margin:8px 0" data-act="compStart" data-id="' + c.id + '"><b>' + c.name + '</b><span>' + c.desc + ' · 限时 ' + c.limit + ' 分钟' +
          (best >= 0 ? ' · 最好 ' + best + ' 分' : '') + '</span></button>';
      });
      html += '<p class="sub small">建议：平时闯关练技巧，每周末打一场，看能不能在时间内全对。</p>';
      return html;
    },
    compSheet: compSheetView,
    compResult: compResultView,
    stats: function () {
      var html = top('成绩', 'home');
      // 近 14 天
      html += '<h2>近 14 天训练（分钟）</h2><div class="days">';
      var d = new Date(); d.setDate(d.getDate() - 13);
      var rows = [], maxM = 1;
      for (var i = 0; i < 14; i++) { var k = dateKey(d), dd = D.days[k] || { ms: 0 }; rows.push([d.getDate(), mins(dd.ms), dd.ok]); maxM = Math.max(maxM, mins(dd.ms)); d.setDate(d.getDate() + 1); }
      rows.forEach(function (r) {
        html += '<div><small>' + (r[1] || '') + '</small><span style="height:' + Math.round(r[1] / maxM * 110) + 'px"></span><b>' + r[0] + (r[2] ? '<br>✓' : '<br>&nbsp;') + '</b></div>';
      });
      html += '</div><p class="sub small">柱子上的数 = 当天练了几分钟；✓ = 当天「今日训练」全部完成。</p>';
      html += '<h2>闯关</h2><table><tr><th>关卡</th><th>完成</th><th>★★ 以上</th><th>最快</th><th>平均</th></tr>';
      LEVELS.forEach(function (l) {
        var r = D.lv[l.id] || {}, ts = Object.keys(r).map(function (k) { return r[k].t; });
        if (!ts.length) return;
        html += '<tr><td>' + l.name + '</td><td>' + ts.length + '</td><td>' + passedCount(l.id) + '</td><td>' + fmtTime(Math.min.apply(null, ts)) + '</td><td>' +
          fmtTime(ts.reduce(function (a, b) { return a + b; }, 0) / ts.length) + '</td></tr>';
      });
      html += '</table>';
      html += '<h2>技巧训练</h2><table><tr><th>技巧</th><th>组数</th><th>上次</th><th>最好</th><th>掌握</th></tr>';
      DRILLS.forEach(function (dr) {
        [6, 9].forEach(function (n) {
          var r = D.drills[drillKey(dr.id, n)];
          if (!r) return;
          html += '<tr><td>' + dr.name + '（' + n + '宫）</td><td>' + r.sets + '</td><td>' + r.last.ok + '/' + DRILL_Q + ' · ' + secs(r.last.avg) + ' 秒</td><td>' +
            (r.best ? secs(r.best) + ' 秒' : '—') + '</td><td>' + (r.mastered ? '🏅' : '') + '</td></tr>';
        });
      });
      html += '</table>';
      html += '<h2>比赛</h2><table><tr><th>日期</th><th>场次</th><th>得分</th><th>用时</th></tr>';
      D.comps.slice(-10).reverse().forEach(function (c) {
        html += '<tr><td>' + dateKey(new Date(c.at)).slice(5) + '</td><td>' + CP[c.id].name + '</td><td>' + c.score + '/' + c.max + '</td><td>' + fmtTime(c.ms) + '</td></tr>';
      });
      html += '</table>';
      // 设置
      var st = D.settings;
      html += '<h2>设置（家长）</h2><div class="card">' +
        '<div class="check"><div class="what">显示计时</div><button data-act="setTimer" class="' + (st.timer ? 'on' : '') + '">' + (st.timer ? '开' : '关') + '</button></div>' +
        '<div class="check"><div class="what">辅助高亮（同数字、同行列、重复数字）<br><span class="sub small">自动 = 只在入门关打开。比赛纸面上没有高亮，熟练后建议关。</span></div>' +
        ['auto', 'on', 'off'].map(function (v) { return '<button data-act="setAssist" data-v="' + v + '" class="' + (st.assist === v ? 'on' : '') + '">' + { auto: '自动', on: '开', off: '关' }[v] + '</button>'; }).join('') + '</div>' +
        '<div class="check"><div class="what">解锁全部关卡</div><button data-act="setUnlock" class="' + (st.unlockAll ? 'on' : '') + '">' + (st.unlockAll ? '已解锁' : '未解锁') + '</button></div>' +
        '</div>';
      html += '<h2>备份进度</h2><p class="sub small">进度只存在这台设备的浏览器里。换设备或清缓存前，点「导出」把文字复制保存；恢复时粘贴后点「导入」。</p>' +
        '<textarea id="bk" placeholder="导出的进度会出现在这里"></textarea><div class="row"><button data-act="export">导出</button><button data-act="import">导入</button></div>';
      return html;
    }
  };
  var curLevel = '6-1', introT = 'box', introN = 6;

  // ---------------- 点击分发 ----------------
  document.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    lastInput = Date.now();
    tick();
    var a = el.getAttribute('data-act'), ds = el.dataset;
    switch (a) {
      case 'home': persist(); go('home'); break;
      case 'levels': persist(); go('levels'); break;
      case 'levelOpen': curLevel = ds.id; go('levelPage'); break;
      case 'levelPage': persist(); if (G) curLevel = G.level; go('levelPage'); break;
      case 'play': startLevel(curLevel, +ds.i); break;
      case 'resume': curLevel = D.cur.level; startLevel(D.cur.level, D.cur.idx); break;
      case 'replay': G = newGame('lv', G.level, G.idx, puzzle(G.level, G.idx)); D.cur = G; save(); go('game'); break;
      case 'nextPuzzle': curLevel = G.level; startLevel(G.level, nextIdx(G.level)); break;
      case 'cell': tapCell(+ds.i); break;
      case 'digit': tapDigit(+ds.d); break;
      case 'note': G.noteMode = !G.noteMode; G.msg = ''; render(); break;
      case 'erase':
        if (G.sel >= 0 && !G.givens[G.sel]) { snapshot(); G.board[G.sel] = 0; G.notes[G.sel] = 0; G.wrong = G.wrong.filter(function (x) { return x !== G.sel; }); boardChanged(); persist(); }
        render(); break;
      case 'undo':
        if (G.undo.length) { var u = G.undo.pop(); G.board = u[0]; G.notes = u[1]; boardChanged(); G.msg = ''; persist(); }
        render(); break;
      case 'hint': doHint(); break;
      case 'check': doCheck(); break;
      case 'drillMenu': R = null; go('drillMenu'); break;
      case 'drillIntro': introT = ds.t; introN = +ds.n; go('drillIntro'); break;
      case 'demo': startDrill(introT, introN, true); break;
      case 'demoAgain': startDrill(R.t, R.n, true); break;
      case 'drillGo': startDrill(introT, introN, false); break;
      case 'drillAgain': startDrill(R.t, R.n, false); break;
      case 'qcell': tapQCell(+ds.i); break;
      case 'qdigit': if (R.phase === 'q') { flushDrillTime(); answer(+ds.d === R.q.s.d); } break;
      case 'qnext': nextQ(); break;
      case 'compMenu': go('compMenu'); break;
      case 'compStart':
        if (C && !confirm('还有一场比赛没交卷，放弃它开新的？')) { go('compSheet'); break; }
        startComp(ds.id); break;
      case 'compAgain': startComp(ds.id); break;
      case 'compSheet': if (!C) { go('home'); break; } G = null; persist(); go('compSheet'); break;
      case 'compOpen': C.cur = +ds.k; G = C.items[C.cur]; G.sel = -1; G.msg = ''; go('game'); break;
      case 'compSubmit':
        var unfilled = C.items.filter(function (g) { return !g.board.every(Boolean); }).length;
        if (confirm(unfilled ? '还有 ' + unfilled + ' 题没填完，确定交卷？' : '确定交卷吗？交了就不能改了。')) submitComp(false);
        break;
      case 'planGo':
        var it = plan()[+ds.k];
        if (it.kind === 'drill') { introT = it.t; introN = it.n; go('drillIntro'); }
        else if (it.kind === 'lv') { curLevel = it.id; if (D.cur && D.cur.level === it.id) startLevel(it.id, D.cur.idx); else startLevel(it.id, nextIdx(it.id)); }
        else { if (C) go('compSheet'); else startComp(it.id); }
        break;
      case 'stats': go('stats'); break;
      case 'setTimer': D.settings.timer = !D.settings.timer; save(); render(); break;
      case 'setAssist': D.settings.assist = ds.v; save(); render(); break;
      case 'setUnlock': D.settings.unlockAll = !D.settings.unlockAll; save(); render(); break;
      case 'export':
        var t = document.getElementById('bk'); t.value = 'SDK1:' + btoa(unescape(encodeURIComponent(JSON.stringify(D)))); t.select(); break;
      case 'import':
        try {
          var raw = document.getElementById('bk').value.trim().replace(/^SDK1:/, ''), x = JSON.parse(decodeURIComponent(escape(atob(raw))));
          if (!x || x.v !== 1) throw 0;
          if (!confirm('用导入的进度覆盖现在的进度？')) break;
          localStorage.setItem(KEY, JSON.stringify(x)); location.reload();
        } catch (e) { alert('导入失败：内容不完整或不是导出的进度。'); }
        break;
    }
  });
  window.addEventListener('resize', function () { if (screen === 'game' || screen === 'drill') render(); });
  window.addEventListener('pagehide', persist);

  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(function () {});
  window.__sudoku = { D: D, S: S, genQ: genQ, plan: plan, get G() { return G; }, get R() { return R; }, get C() { return C; } };
  render();
})();
