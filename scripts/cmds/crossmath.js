const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("canvas");

// ============================================================
//  CROSS MATH - GoatBot V2 - Camille Uchiha
//  Mots croises mathematiques generes procedurellement,
//  solution toujours unique, rendu en canvas.
//  (aucune apostrophe dans ce fichier : compatible editeur GitHub mobile)
// ============================================================

const MAX_MISTAKES = 3;
const MAX_HINTS = 3;
const HINT_COST = 50;

const DIFFS = {
  facile: { label: "FACILE", eqs: 5, maxN: 20, ops: ["+", "-"], ratio: 0.45, reward: 200, W: 9, H: 9 },
  moyen: { label: "MOYEN", eqs: 7, maxN: 30, ops: ["+", "-", "x"], ratio: 0.5, reward: 500, W: 10, H: 10 },
  difficile: { label: "DIFFICILE", eqs: 10, maxN: 40, ops: ["+", "-", "x", "/"], ratio: 0.55, reward: 1000, W: 11, H: 12 },
  expert: { label: "EXPERT", eqs: 13, maxN: 60, ops: ["+", "-", "x", "/"], ratio: 0.62, reward: 2000, W: 12, H: 13 }
};
const DIFF_ALIAS = { f: "facile", m: "moyen", d: "difficile", e: "expert", easy: "facile", medium: "moyen", hard: "difficile" };
const DAILY_ORDER = ["moyen", "difficile", "moyen", "difficile", "difficile", "expert", "moyen"];

if (!global.crossMathGames) global.crossMathGames = {};
const games = global.crossMathGames;

// ------------------------------------------------------------
//  Utilitaires
// ------------------------------------------------------------
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function ri(rng, a, b) {
  return a + Math.floor(rng() * (b - a + 1));
}

function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function dayStr(offset) {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
}

function fmtTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

// ------------------------------------------------------------
//  Generation de la grille
// ------------------------------------------------------------
function divisors(n) {
  const out = [];
  for (let d = 2; d * 2 <= n; d++) if (n % d === 0) out.push(d);
  return out;
}

// idx = position du nombre impose dans l equation a op b = c (0, 1 ou 2)
function solveEq(rng, idx, v, ops, maxN) {
  for (let t = 0; t < 60; t++) {
    const op = ops[ri(rng, 0, ops.length - 1)];
    let a = 0;
    let b = 0;
    let c = 0;
    if (idx === 0) {
      a = v;
      if (op === "+") {
        b = ri(rng, 1, maxN);
        c = a + b;
      } else if (op === "-") {
        b = ri(rng, 1, maxN);
        c = a - b;
      } else if (op === "x") {
        const m = Math.floor(maxN / a);
        if (m < 2) continue;
        b = ri(rng, 2, m);
        c = a * b;
      } else {
        const ds = divisors(a);
        if (!ds.length) continue;
        b = ds[ri(rng, 0, ds.length - 1)];
        c = a / b;
      }
    } else if (idx === 1) {
      b = v;
      if (op === "+") {
        a = ri(rng, 1, maxN);
        c = a + b;
      } else if (op === "-") {
        a = ri(rng, 1, maxN);
        c = a - b;
      } else if (op === "x") {
        const m = Math.floor(maxN / b);
        if (m < 2) continue;
        a = ri(rng, 2, m);
        c = a * b;
      } else {
        const m = Math.floor(maxN / b);
        if (m < 2 || b < 2) continue;
        c = ri(rng, 2, m);
        a = c * b;
      }
    } else {
      c = v;
      if (op === "+") {
        a = ri(rng, 1, maxN);
        b = c - a;
      } else if (op === "-") {
        b = ri(rng, 1, maxN);
        a = c + b;
      } else if (op === "x") {
        const ds = divisors(c);
        if (!ds.length) continue;
        a = ds[ri(rng, 0, ds.length - 1)];
        b = c / a;
      } else {
        b = ri(rng, 2, 9);
        a = c * b;
      }
    }
    if (a < 1 || b < 1 || c < 1 || a > maxN || b > maxN || c > maxN) continue;
    return { a: a, b: b, c: c, op: op };
  }
  return null;
}

function calc(a, op, b) {
  if (op === "+") return a + b;
  if (op === "-") return a - b;
  if (op === "x") return a * b;
  return b !== 0 && a % b === 0 ? a / b : -1;
}

function checkEq(e, val) {
  const a = val[e.n[0]];
  const b = val[e.n[1]];
  const c = val[e.n[2]];
  if (a === null || b === null || c === null) return true;
  return calc(a, e.op, b) === c;
}

function buildLayout(cfg, rng) {
  const occ = {};
  const cells = [];
  const eqs = [];
  const key = function (r, c) {
    return r + "," + c;
  };

  function addEquation(pos, sol, dir, shared) {
    const nums = [];
    for (let j = 0; j < 5; j++) {
      let cell;
      if (j === shared) {
        cell = occ[key(pos[j][0], pos[j][1])];
      } else {
        let t = "n";
        let v = 0;
        if (j === 0) v = sol.a;
        else if (j === 2) v = sol.b;
        else if (j === 4) v = sol.c;
        else if (j === 1) {
          t = "o";
          v = sol.op;
        } else {
          t = "e";
          v = "=";
        }
        cell = { r: pos[j][0], c: pos[j][1], t: t, v: v, dirs: [] };
        occ[key(pos[j][0], pos[j][1])] = cell;
        cells.push(cell);
      }
      if (j % 2 === 0) {
        cell.dirs.push(dir);
        nums.push(cell);
      }
    }
    eqs.push({ n: nums, op: sol.op });
  }

  function fits(pos, k, dir) {
    const own = {};
    pos.forEach(function (p) {
      own[key(p[0], p[1])] = true;
    });
    for (let j = 0; j < 5; j++) {
      const r = pos[j][0];
      const c = pos[j][1];
      if (r < 0 || c < 0 || r >= cfg.H || c >= cfg.W) return false;
      if (j === k) continue;
      if (occ[key(r, c)]) return false;
      const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
      for (let q = 0; q < 4; q++) {
        const kk = key(nb[q][0], nb[q][1]);
        if (occ[kk] && !own[kk]) return false;
      }
    }
    const dr = dir === "v" ? 1 : 0;
    const dc = dir === "h" ? 1 : 0;
    if (occ[key(pos[0][0] - dr, pos[0][1] - dc)]) return false;
    if (occ[key(pos[4][0] + dr, pos[4][1] + dc)]) return false;
    return true;
  }

  let first = null;
  for (let t = 0; t < 30 && !first; t++) {
    first = solveEq(rng, 0, ri(rng, 2, Math.max(3, Math.floor(cfg.maxN / 2))), cfg.ops, cfg.maxN);
  }
  if (!first) return null;
  const dir0 = rng() < 0.5 ? "h" : "v";
  const r0 = dir0 === "h" ? ri(rng, 2, cfg.H - 3) : ri(rng, 0, cfg.H - 5);
  const c0 = dir0 === "h" ? ri(rng, 0, cfg.W - 5) : ri(rng, 2, cfg.W - 3);
  const pos0 = [];
  for (let j = 0; j < 5; j++) pos0.push(dir0 === "h" ? [r0, c0 + j] : [r0 + j, c0]);
  addEquation(pos0, first, dir0, -1);

  let guard = 0;
  while (eqs.length < cfg.eqs && guard < 900) {
    guard++;
    const open = cells.filter(function (c) {
      return c.t === "n" && c.dirs.length === 1;
    });
    if (!open.length) break;
    const s = open[ri(rng, 0, open.length - 1)];
    const dir = s.dirs[0] === "h" ? "v" : "h";
    const idx = ri(rng, 0, 2);
    const k = idx * 2;
    const pos = [];
    for (let j = 0; j < 5; j++) pos.push(dir === "v" ? [s.r - k + j, s.c] : [s.r, s.c - k + j]);
    if (!fits(pos, k, dir)) continue;
    const sol = solveEq(rng, idx, s.v, cfg.ops, cfg.maxN);
    if (!sol) continue;
    addEquation(pos, sol, dir, k);
  }
  return { cells: cells, eqs: eqs };
}

function countSolutions(puz, limit, maxNodes) {
  const val = puz.cells.map(function (c) {
    return c.t === "n" && !c.blank ? c.v : null;
  });
  const order = [];
  const seen = {};
  puz.eqs.forEach(function (e) {
    e.n.forEach(function (i) {
      if (puz.cells[i].blank && !seen[i]) {
        seen[i] = true;
        order.push(i);
      }
    });
  });
  const counts = {};
  order.forEach(function (i) {
    const v = puz.cells[i].v;
    counts[v] = (counts[v] || 0) + 1;
  });
  const values = Object.keys(counts).map(Number);
  let found = 0;
  let nodes = 0;
  function dfs(p) {
    if (found >= limit || nodes > maxNodes) return;
    if (p === order.length) {
      found++;
      return;
    }
    const i = order[p];
    for (let q = 0; q < values.length; q++) {
      const v = values[q];
      if (counts[v] <= 0) continue;
      nodes++;
      counts[v]--;
      val[i] = v;
      let ok = true;
      const list = puz.cellEqs[i];
      for (let z = 0; z < list.length; z++) {
        if (!checkEq(list[z], val)) {
          ok = false;
          break;
        }
      }
      if (ok) dfs(p + 1);
      counts[v]++;
      val[i] = null;
      if (found >= limit || nodes > maxNodes) return;
    }
  }
  dfs(0);
  return nodes > maxNodes ? limit : found;
}

function finalize(raw, cfg, rng) {
  let minR = 999;
  let minC = 999;
  let maxR = -1;
  let maxC = -1;
  raw.cells.forEach(function (c) {
    if (c.r < minR) minR = c.r;
    if (c.c < minC) minC = c.c;
    if (c.r > maxR) maxR = c.r;
    if (c.c > maxC) maxC = c.c;
  });
  const idxOf = new Map();
  const cells = raw.cells.map(function (c, i) {
    idxOf.set(c, i);
    return { r: c.r - minR, c: c.c - minC, t: c.t, v: c.v, blank: false, solved: false, hint: false, id: 0 };
  });
  const eqs = raw.eqs.map(function (e) {
    return {
      n: e.n.map(function (c) {
        return idxOf.get(c);
      }),
      op: e.op
    };
  });
  const cellEqs = cells.map(function () {
    return [];
  });
  eqs.forEach(function (e) {
    e.n.forEach(function (i) {
      cellEqs[i].push(e);
    });
  });
  const numIdx = [];
  cells.forEach(function (c, i) {
    if (c.t === "n") numIdx.push(i);
  });
  const target = Math.max(3, Math.round(numIdx.length * cfg.ratio));
  shuffle(rng, numIdx)
    .slice(0, target)
    .forEach(function (i) {
      cells[i].blank = true;
    });
  const puz = { w: maxC - minC + 1, h: maxR - minR + 1, cells: cells, eqs: eqs, cellEqs: cellEqs, byId: {} };

  // unicite : on devoile des cases tant que plusieurs solutions existent
  let guard = 0;
  while (countSolutions(puz, 2, 40000) > 1 && guard < 60) {
    const bl = [];
    cells.forEach(function (c, i) {
      if (c.blank) bl.push(i);
    });
    if (bl.length <= 3) break;
    const n = bl.length > 12 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const pick = ri(rng, 0, bl.length - 1);
      cells[bl[pick]].blank = false;
      bl.splice(pick, 1);
    }
    guard++;
  }
  if (countSolutions(puz, 2, 400000) > 1) return null;

  const blanks = [];
  cells.forEach(function (c, i) {
    if (c.blank) blanks.push(i);
  });
  if (blanks.length < 3) return null;
  blanks.sort(function (a, b) {
    return cells[a].r - cells[b].r || cells[a].c - cells[b].c;
  });
  blanks.forEach(function (i, n) {
    cells[i].id = n + 1;
    puz.byId[n + 1] = i;
  });
  return puz;
}

function generatePuzzle(diff, rng) {
  const cfg = DIFFS[diff];
  for (let attempt = 0; attempt < 60; attempt++) {
    const raw = buildLayout(cfg, rng);
    if (!raw || raw.eqs.length < Math.max(3, cfg.eqs - 2)) continue;
    const puz = finalize(raw, cfg, rng);
    if (puz) return puz;
  }
  return null;
}

function unsolvedValues(puz) {
  const out = [];
  puz.cells.forEach(function (c) {
    if (c.blank && !c.solved) out.push(c.v);
  });
  return out;
}

// ------------------------------------------------------------
//  Dessin canvas (tout en vectoriel, pas d emoji)
// ------------------------------------------------------------
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawHeart(ctx, cx, cy, s, filled) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.5, cy - s * 0.2, cx - s * 0.7, cy - s * 1.1, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.1, cx + s * 1.5, cy - s * 0.2, cx, cy + s * 0.9);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = "#ee3b4f";
    ctx.fill();
  } else {
    ctx.fillStyle = "#e6e6ee";
    ctx.fill();
  }
}

function drawStrawberry(ctx, x, y, s) {
  ctx.fillStyle = "#e5383b";
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.55);
  ctx.bezierCurveTo(x + s * 1.1, y - s * 0.75, x + s * 0.95, y + s * 0.45, x, y + s);
  ctx.bezierCurveTo(x - s * 0.95, y + s * 0.45, x - s * 1.1, y - s * 0.75, x, y - s * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2d9d4f";
  ctx.beginPath();
  ctx.moveTo(x, y - s * 0.5);
  ctx.lineTo(x - s * 0.6, y - s * 0.85);
  ctx.lineTo(x - s * 0.2, y - s * 0.5);
  ctx.lineTo(x, y - s * 1.0);
  ctx.lineTo(x + s * 0.2, y - s * 0.5);
  ctx.lineTo(x + s * 0.6, y - s * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#ffe8a3";
  const seeds = [[-0.4, -0.1], [0.4, -0.1], [0, 0.15], [-0.25, 0.45], [0.25, 0.45]];
  seeds.forEach(function (p) {
    ctx.beginPath();
    ctx.arc(x + p[0] * s, y + p[1] * s, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawOp(ctx, op, cx, cy, s) {
  ctx.strokeStyle = "#202020";
  ctx.fillStyle = "#202020";
  ctx.lineWidth = Math.max(3, s * 0.34);
  ctx.lineCap = "round";
  ctx.beginPath();
  if (op === "+") {
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx, cy + s);
  } else if (op === "-") {
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
  } else if (op === "x") {
    ctx.moveTo(cx - s * 0.8, cy - s * 0.8);
    ctx.lineTo(cx + s * 0.8, cy + s * 0.8);
    ctx.moveTo(cx + s * 0.8, cy - s * 0.8);
    ctx.lineTo(cx - s * 0.8, cy + s * 0.8);
  } else if (op === "=") {
    ctx.moveTo(cx - s, cy - s * 0.45);
    ctx.lineTo(cx + s, cy - s * 0.45);
    ctx.moveTo(cx - s, cy + s * 0.45);
    ctx.lineTo(cx + s, cy + s * 0.45);
  } else {
    ctx.moveTo(cx - s, cy);
    ctx.lineTo(cx + s, cy);
  }
  ctx.stroke();
  if (op === "/") {
    const rad = Math.max(2, ctx.lineWidth * 0.62);
    ctx.beginPath();
    ctx.arc(cx, cy - s * 0.8, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy + s * 0.8, rad, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBox(ctx, x, y, cs, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  rr(ctx, x + 1.5, y + 1.5, cs - 3, cs - 3, 4);
  ctx.fill();
  ctx.stroke();
}

function drawNum(ctx, text, cx, cy, cs, color) {
  const t = String(text);
  const size = t.length >= 3 ? cs * 0.4 : cs * 0.52;
  ctx.fillStyle = color;
  ctx.font = "bold " + Math.round(size) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(t, cx, cy + 1);
}

function render(game, opts) {
  opts = opts || {};
  const puz = game.puz;
  const cs = puz.w > 10 ? 44 : 50;
  const pad = 18;
  const gw = puz.w * cs;
  const gh = puz.h * cs;
  const tw = 46;
  const th = 40;
  const tg = 8;
  const bank = unsolvedValues(puz).sort(function (a, b) {
    return a - b;
  });
  const W = Math.max(gw + 2 * pad + 24, 7 * (tw + tg) - tg + 2 * pad + 24, 400);
  const perRow = Math.max(1, Math.floor((W - 2 * pad - 24 + tg) / (tw + tg)));
  const rows = Math.max(1, Math.ceil(bank.length / perRow));
  const headerH = 100;
  const gridCardH = gh + 24;
  const bankCardH = rows * (th + tg) + 20;
  const H = headerH + gridCardH + 14 + bankCardH + 56;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#fdeff3");
  bg.addColorStop(1, "#eef2fd");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // en-tete
  drawStrawberry(ctx, W / 2 - 128, 34, 15);
  drawStrawberry(ctx, W / 2 + 128, 34, 15);
  ctx.fillStyle = "#2b3358";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("CROSS MATH", W / 2, 34);

  const cfg = DIFFS[game.diff];
  ctx.font = "bold 17px sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#5a6190";
  ctx.fillText(cfg.label + (game.daily ? "  DEFI" : ""), pad + 6, 76);

  ctx.textAlign = "center";
  if (opts.status === "win") {
    ctx.fillStyle = "#1f9d5a";
    ctx.fillText("BRAVO !", W / 2, 76);
  } else if (opts.status === "lose") {
    ctx.fillStyle = "#d63b3b";
    ctx.fillText("PERDU", W / 2, 76);
  } else if (opts.status === "abandon") {
    ctx.fillStyle = "#7b7f99";
    ctx.fillText("ABANDON", W / 2, 76);
  } else {
    ctx.fillStyle = "#5a6190";
    ctx.fillText(fmtTime((game.endedAt || Date.now()) - game.startedAt), W / 2, 76);
  }
  const lives = MAX_MISTAKES - game.mistakes;
  for (let i = 0; i < MAX_MISTAKES; i++) {
    drawHeart(ctx, W - pad - 20 - (MAX_MISTAKES - 1 - i) * 30, 76, 11, i < lives);
  }

  // carte de la grille
  ctx.save();
  ctx.shadowColor = "rgba(60,70,120,0.18)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  rr(ctx, pad, headerH, W - 2 * pad, gridCardH, 18);
  ctx.fill();
  ctx.restore();

  const gx = Math.round((W - gw) / 2);
  const gy = headerH + 12;
  puz.cells.forEach(function (cell) {
    const x = gx + cell.c * cs;
    const y = gy + cell.r * cs;
    const cx = x + cs / 2;
    const cy = y + cs / 2;
    if (cell.t === "o" || cell.t === "e") {
      drawBox(ctx, x, y, cs, "#f8e2a0", "#2a2a2a");
      drawOp(ctx, cell.v, cx, cy, cs * 0.17);
    } else if (!cell.blank) {
      drawBox(ctx, x, y, cs, "#f8e2a0", "#2a2a2a");
      drawNum(ctx, cell.v, cx, cy, cs, "#1c1c1c");
    } else if (cell.solved) {
      drawBox(ctx, x, y, cs, "#e2f6ec", "#4fb27f");
      drawNum(ctx, cell.v, cx, cy, cs, cell.hint ? "#2f6fdb" : "#1f9d5a");
    } else if (opts.reveal) {
      drawBox(ctx, x, y, cs, "#fde4e4", "#e07a7a");
      drawNum(ctx, cell.v, cx, cy, cs, "#d63b3b");
    } else {
      drawBox(ctx, x, y, cs, "#fff8df", "#d6c898");
      drawNum(ctx, cell.id, cx, cy, cs * 0.75, "#b9aa78");
    }
  });

  // banque de nombres
  const bankTop = headerH + gridCardH + 14;
  ctx.save();
  ctx.shadowColor = "rgba(60,70,120,0.18)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#ffffff";
  rr(ctx, pad, bankTop, W - 2 * pad, bankCardH, 18);
  ctx.fill();
  ctx.restore();

  if (!bank.length) {
    ctx.fillStyle = "#9aa0c0";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("BANQUE VIDE", W / 2, bankTop + bankCardH / 2);
  }
  bank.forEach(function (v, i) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const inRow = Math.min(perRow, bank.length - row * perRow);
    const rowW = inRow * (tw + tg) - tg;
    const x = Math.round((W - rowW) / 2) + col * (tw + tg);
    const y = bankTop + 12 + row * (th + tg);
    ctx.fillStyle = "#e4f7ee";
    ctx.strokeStyle = "#9bd6b9";
    ctx.lineWidth = 2;
    rr(ctx, x, y, tw, th, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#2f9e5c";
    ctx.font = "bold " + (String(v).length >= 3 ? 20 : 24) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(v), x + tw / 2, y + th / 2 + 1);
  });

  // pied de page
  ctx.fillStyle = "#8a8fb0";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("MINI BOT  -  CAMILLE UCHIHA", W / 2, H - 24);
  drawStrawberry(ctx, W / 2 - 124, H - 25, 8);
  drawStrawberry(ctx, W / 2 + 124, H - 25, 8);

  return canvas.toBuffer("image/png");
}

// ------------------------------------------------------------
//  Donnees joueur (argent + stats)
// ------------------------------------------------------------
async function getStats(usersData, uid) {
  const user = (await usersData.get(uid)) || {};
  const data = user.data || {};
  const s = data.crossmath || {};
  return {
    user: user,
    data: data,
    s: { wins: s.wins || 0, losses: s.losses || 0, streak: s.streak || 0, lastDaily: s.lastDaily || "" }
  };
}

async function saveStats(usersData, uid, st, money) {
  st.data.crossmath = st.s;
  const upd = { data: st.data };
  if (typeof money === "number") upd.money = money;
  await usersData.set(uid, upd);
}

// ------------------------------------------------------------
//  Envoi de la grille
// ------------------------------------------------------------
async function sendBoard(message, body, game, opts, uid) {
  const dir = path.join(__dirname, "cache");
  fs.ensureDirSync(dir);
  const file = path.join(dir, "crossmath_" + uid + "_" + Date.now() + ".png");
  fs.writeFileSync(file, render(game, opts));
  const register = function (info) {
    if (!opts.listen || !info || !info.messageID) return;
    if (!global.GoatBot || !global.GoatBot.onReply) return;
    global.GoatBot.onReply.set(info.messageID, { commandName: "crossmath", messageID: info.messageID, author: uid });
  };
  const ret = await message.reply(
    { body: body, attachment: fs.createReadStream(file) },
    function (err, info) {
      if (!err) register(info);
    }
  );
  register(ret);
  setTimeout(function () {
    fs.unlink(file, function () {});
  }, 60000);
}

function parsePlacements(args) {
  const tokens = args
    .join(" ")
    .replace(/[=:,;]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.length || tokens.length % 2 !== 0) return null;
  const out = [];
  for (let i = 0; i < tokens.length; i += 2) {
    const id = parseInt(tokens[i], 10);
    const v = parseInt(tokens[i + 1], 10);
    if (isNaN(id) || isNaN(v)) return null;
    out.push({ id: id, v: v });
  }
  return out;
}

// ------------------------------------------------------------
//  Logique de jeu
// ------------------------------------------------------------
async function handle(o) {
  const message = o.message;
  const event = o.event;
  const args = o.args || [];
  const usersData = o.usersData;
  const getLang = o.getLang;
  const uid = String(event.senderID);
  const sub = String(args[0] || "").toLowerCase();
  const B = getLang("border");
  const head = B + "\n" + getLang("title") + "\n" + B + "\n";
  const prefix = (global.GoatBot && global.GoatBot.config && global.GoatBot.config.prefix) || "";

  if (games[uid] && Date.now() - games[uid].startedAt > 3 * 3600 * 1000) delete games[uid];

  function statusLine(game) {
    return getLang("status", game.mistakes, MAX_MISTAKES, game.hints, MAX_HINTS, unsolvedValues(game.puz).length);
  }

  async function winGame(game) {
    const cfg = DIFFS[game.diff];
    game.endedAt = Date.now();
    let reward = Math.round(cfg.reward * Math.max(0.3, 1 - game.mistakes * 0.2 - game.hints * 0.1));
    const st = await getStats(usersData, uid);
    st.s.wins++;
    let extra = "";
    if (game.daily) {
      st.s.streak = st.s.lastDaily === dayStr(-1) ? st.s.streak + 1 : 1;
      st.s.lastDaily = dayStr(0);
      const bonus = Math.min(st.s.streak, 7) * 50;
      reward = reward * 2 + bonus;
      extra = "\n" + getLang("dailyWin", st.s.streak, bonus);
    }
    await saveStats(usersData, uid, st, (st.user.money || 0) + reward);
    delete games[uid];
    const body =
      head +
      getLang("win", fmtTime(game.endedAt - game.startedAt), game.mistakes, game.hints, reward) +
      extra;
    return sendBoard(message, body, game, { status: "win" }, uid);
  }

  // ---- aide
  if (!sub || sub === "aide" || sub === "help") {
    return message.reply(head + getLang("help", prefix));
  }

  // ---- stats
  if (sub === "stats") {
    const st = await getStats(usersData, uid);
    return message.reply(
      head + getLang("stats", st.user.name || "Joueur", st.s.wins, st.s.losses, st.s.streak, st.user.money || 0)
    );
  }

  // ---- nouvelle partie / defi du jour
  if (["start", "new", "jouer", "play", "defi", "daily"].indexOf(sub) !== -1) {
    if (games[uid]) return message.reply(head + getLang("hasGame", prefix));
    const daily = sub === "defi" || sub === "daily";
    let diff = "facile";
    let rng;
    if (daily) {
      const st = await getStats(usersData, uid);
      if (st.s.lastDaily === dayStr(0)) return message.reply(head + getLang("dailyDone"));
      diff = DAILY_ORDER[new Date().getUTCDay()];
      rng = makeRng(hashStr("crossmath-" + dayStr(0)));
    } else {
      const raw = String(args[1] || "facile").toLowerCase();
      diff = DIFF_ALIAS[raw] || raw;
      if (!DIFFS[diff]) return message.reply(head + getLang("badDiff"));
      rng = makeRng(Math.floor(Math.random() * 4294967296));
    }
    const puz = generatePuzzle(diff, rng);
    if (!puz) return message.reply(head + getLang("genFail"));
    const game = {
      puz: puz,
      diff: diff,
      mistakes: 0,
      hints: 0,
      history: [],
      startedAt: Date.now(),
      endedAt: 0,
      daily: daily
    };
    games[uid] = game;
    const body = head + getLang("started", DIFFS[diff].label, daily ? getLang("dailyTag") : "", statusLine(game));
    return sendBoard(message, body, game, { listen: true }, uid);
  }

  // ---- abandon
  if (sub === "abandon" || sub === "stop" || sub === "quitter") {
    const game = games[uid];
    if (!game) return message.reply(head + getLang("noGame", prefix));
    game.endedAt = Date.now();
    delete games[uid];
    return sendBoard(message, head + getLang("abandon"), game, { reveal: true, status: "abandon" }, uid);
  }

  // ---- annuler
  if (sub === "annuler" || sub === "undo") {
    const game = games[uid];
    if (!game) return message.reply(head + getLang("noGame", prefix));
    if (!game.history.length) return message.reply(head + getLang("nothingUndo"));
    const idx = game.history.pop();
    const cell = game.puz.cells[idx];
    cell.solved = false;
    return sendBoard(message, head + getLang("undone", cell.id) + "\n" + statusLine(game), game, { listen: true }, uid);
  }

  // ---- indice
  if (sub === "indice" || sub === "hint") {
    const game = games[uid];
    if (!game) return message.reply(head + getLang("noGame", prefix));
    if (game.hints >= MAX_HINTS) return message.reply(head + getLang("maxHints", MAX_HINTS));
    const st = await getStats(usersData, uid);
    if ((st.user.money || 0) < HINT_COST) return message.reply(head + getLang("noMoney", HINT_COST));
    const left = [];
    game.puz.cells.forEach(function (c, i) {
      if (c.blank && !c.solved) left.push(i);
    });
    const idx = left[Math.floor(Math.random() * left.length)];
    const cell = game.puz.cells[idx];
    cell.solved = true;
    cell.hint = true;
    game.hints++;
    await usersData.set(uid, { money: (st.user.money || 0) - HINT_COST });
    if (!unsolvedValues(game.puz).length) return winGame(game);
    const body = head + getLang("hintUsed", cell.id, cell.v, HINT_COST) + "\n" + statusLine(game);
    return sendBoard(message, body, game, { listen: true }, uid);
  }

  // ---- placement : numero valeur
  const pls = parsePlacements(args);
  if (!pls) {
    if (o.quiet) return;
    return message.reply(head + getLang("badFormat", prefix));
  }
  const game = games[uid];
  if (!game) return message.reply(head + getLang("noGame", prefix));

  const notes = [];
  let lost = false;
  for (let i = 0; i < pls.length; i++) {
    const p = pls[i];
    const idx = game.puz.byId[p.id];
    if (idx === undefined) {
      notes.push(getLang("badId", p.id));
      continue;
    }
    const cell = game.puz.cells[idx];
    if (cell.solved) {
      notes.push(getLang("already", p.id));
      continue;
    }
    if (cell.v === p.v) {
      cell.solved = true;
      game.history.push(idx);
      notes.push(getLang("good", p.id, p.v));
    } else {
      game.mistakes++;
      notes.push(getLang("bad", p.id, p.v, game.mistakes, MAX_MISTAKES));
      if (game.mistakes >= MAX_MISTAKES) {
        lost = true;
        break;
      }
    }
  }

  if (lost) {
    game.endedAt = Date.now();
    const st = await getStats(usersData, uid);
    st.s.losses++;
    await saveStats(usersData, uid, st);
    delete games[uid];
    const bodyLose = head + notes.join("\n") + "\n" + getLang("lose", MAX_MISTAKES);
    return sendBoard(message, bodyLose, game, { reveal: true, status: "lose" }, uid);
  }

  if (!unsolvedValues(game.puz).length) {
    const winNotes = notes.join("\n") + "\n";
    game.endedAt = Date.now();
    const cfg = DIFFS[game.diff];
    let reward = Math.round(cfg.reward * Math.max(0.3, 1 - game.mistakes * 0.2 - game.hints * 0.1));
    const st = await getStats(usersData, uid);
    st.s.wins++;
    let extra = "";
    if (game.daily) {
      st.s.streak = st.s.lastDaily === dayStr(-1) ? st.s.streak + 1 : 1;
      st.s.lastDaily = dayStr(0);
      const bonus = Math.min(st.s.streak, 7) * 50;
      reward = reward * 2 + bonus;
      extra = "\n" + getLang("dailyWin", st.s.streak, bonus);
    }
    await saveStats(usersData, uid, st, (st.user.money || 0) + reward);
    delete games[uid];
    const bodyWin =
      head +
      winNotes +
      getLang("win", fmtTime(game.endedAt - game.startedAt), game.mistakes, game.hints, reward) +
      extra;
    return sendBoard(message, bodyWin, game, { status: "win" }, uid);
  }

  const body = head + notes.join("\n") + "\n" + statusLine(game);
  return sendBoard(message, body, game, { listen: true }, uid);
}

// ------------------------------------------------------------
//  Commande GoatBot
// ------------------------------------------------------------
module.exports = {
  config: {
    name: "crossmath",
    aliases: ["cm", "mathcross"],
    version: "1.0",
    author: "Camille Uchiha 🍓",
    countDown: 2,
    role: 0,
    description: "Jeu de mots croises mathematiques (grille en canvas, defi du jour, indices)",
    category: "game",
    guide: "{pn} start [facile|moyen|difficile|expert] | {pn} defi | {pn} indice | {pn} annuler | {pn} abandon | {pn} stats"
  },

  langs: {
    fr: {
      border: "🍓━━━━━━━━🍓",
      title: "🧮 𝗖𝗥𝗢𝗦𝗦 𝗠𝗔𝗧𝗛",
      help:
        "📖 𝗖𝗼𝗺𝗺𝗲𝗻𝘁 𝗷𝗼𝘂𝗲𝗿 :\n" +
        "• %1crossmath start [facile|moyen|difficile|expert]\n" +
        "• %1crossmath defi → défi du jour (récompense x2)\n" +
        "• Réponds à la grille avec : numéro valeur (ex : 3 15 ou 1:12 2:5)\n" +
        "• %1crossmath indice → révèle une case (50 coins, 3 max)\n" +
        "• %1crossmath annuler → retire le dernier nombre posé\n" +
        "• %1crossmath abandon\n" +
        "• %1crossmath stats\n\n" +
        "🎯 Chaque ligne et chaque colonne est une équation. Chaque case vide porte un numéro : pose-y un nombre de la banque verte. 3 erreurs maximum.",
      badDiff: "❌ Difficulté inconnue. Choisis : facile, moyen, difficile ou expert.",
      hasGame: "⚠️ Tu as déjà une partie en cours. Réponds à la grille avec tes cases, ou tape %1crossmath abandon.",
      noGame: "❌ Aucune partie en cours. Lance-en une avec : %1crossmath start facile",
      genFail: "❌ Impossible de générer la grille, réessaie.",
      dailyDone: "✅ Tu as déjà terminé le défi du jour. Reviens demain !",
      dailyTag: "  ⭐ DÉFI DU JOUR",
      started:
        "🎯 Niveau : %1%2\n" +
        "✍️ Réponds à cette image avec : numéro valeur (ex : 1 12 ou 1:12 2:5)\n" +
        "💡 indice • annuler • abandon\n%3",
      status: "❤️ Erreurs : %1/%2  •  💡 Indices : %3/%4  •  🔢 Cases restantes : %5",
      good: "✅ Case %1 = %2",
      bad: "❌ Case %1 : %2 est faux (erreur %3/%4)",
      already: "⚠️ Case %1 déjà remplie",
      badId: "❓ Case %1 introuvable",
      badFormat: "❌ Format : %1crossmath <numéro> <valeur>  (ex : %1crossmath 3 15)",
      win: "🎉 Bravo ! Grille terminée en %1\n❌ Erreurs : %2  •  💡 Indices : %3\n💰 Récompense : +%4 coins",
      dailyWin: "🔥 Série du défi : %1 jour(s)  •  bonus série : +%2 coins",
      lose: "💀 Perdu ! %1 erreurs. La solution est affichée en rouge sur la grille.",
      abandon: "🏳️ Partie abandonnée. La solution est affichée en rouge sur la grille.",
      nothingUndo: "❌ Rien à annuler.",
      undone: "↩️ Case %1 retirée.",
      maxHints: "❌ Maximum %1 indices par partie.",
      noMoney: "❌ Il te faut %1 coins pour un indice.",
      hintUsed: "💡 Indice : case %1 = %2 (-%3 coins)",
      stats: "📊 Stats de %1\n🏆 Victoires : %2\n💀 Défaites : %3\n🔥 Série défi : %4 jour(s)\n💰 Solde : %5 coins"
    }
  },

  onStart: async function ({ message, event, args, usersData, getLang }) {
    return handle({ message: message, event: event, args: args, usersData: usersData, getLang: getLang });
  },

  onReply: async function ({ message, event, Reply, usersData, getLang }) {
    if (!Reply || String(event.senderID) !== String(Reply.author)) return;
    const args = String(event.body || "")
      .trim()
      .split(/\s+/);
    return handle({
      message: message,
      event: event,
      args: args,
      usersData: usersData,
      getLang: getLang,
      quiet: true
    });
  }
};
