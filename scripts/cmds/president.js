// ============================================================
//  president.js — 🏛️ PRÉSIDENT : du simple militant au palais présidentiel
//  (même base que ecole.js / royaume.js / police.js : UNE commande + des sous-commandes)
//
//  La carrière : 📣 Militant → 🏘️ Conseiller municipal → 🏙️ Maire → 🎙️ Député
//                → 💼 Ministre → 🧑‍💼 Premier ministre → 🏛️ PRÉSIDENT
//
//  La vie politique :
//   • Fais des meetings, des discours, du porte-à-porte : gagne en 📊 popularité
//   • Construis ton 🤝 influence (alliances, lobbys, réseau)
//   • Paie ta campagne et gagne les ÉLECTIONS pour monter en grade
//   • Affronte les autres joueurs : débats, scandales, alliances, soutiens
//   • Attention au 🔥 scandale : corruption = enquêtes, amendes, chute !
//
//  Une fois PRÉSIDENT : tu diriges TON pays 🌍
//   • 5 jauges : Économie, Santé, Éducation, Sécurité, Stabilité
//   • Trésor public, impôts, décrets, conseil des ministres
//   • Crises aléatoires avec des choix (grève, épidémie, inondation...)
//   • Mandat de 7 jours puis RÉÉLECTION. Pays instable = ⚠️ coup d'État !
//
//  Données : data.president de chaque joueur. Argent : user.money (le même que
//  dans ecole, royaume et police).
//  Installation : mets ce fichier dans scripts/cmds/ (à côté de ecole.js).
// ============================================================

"use strict";

let fonts = null;
try { fonts = require("../../func/font.js"); } catch (e) { fonts = null; }
const B = (s) => { try { return fonts && typeof fonts.bold === "function" ? fonts.bold(s) : s; } catch (e) { return s; } };

const CMD = "president";

// 💰 Échelle de l'argent (comme ecole.js)
const M = 100;
const $ = (n) => n * M;
const $r = (a, b) => [a * M, b * M];
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// ─── ⚙️ RÉGLAGES ───
const STARTER_MONEY = $(500);
const ENERGY_MAX = 100;
const ENERGY_REGEN = 2 * MIN;
const MANDAT = 7 * DAY;                 // durée d'un mandat présidentiel
const HEAT_DECAY = HOUR;                // -1 scandale par heure
const ELECTION_CD = 30 * MIN;
const WIN_SCORE = 55;                   // score à atteindre pour gagner une élection

const MEETING = { energy: 20, cd: 15 * MIN, pop: [3, 6], cost: $(40) };
const DISCOURS = { energy: 10, cd: 10 * MIN };
const PORTE = { energy: 15, cd: 20 * MIN, camp: [4, 8] };
const LOBBY = { energy: 10, cd: 40 * MIN, inf: [4, 9] };
const CAMPAGNE = { cd: 10 * MIN, max: 40 };          // campagne : max 40 points
const REPOS = { energy: 40, cd: HOUR };
const SALAIRE_CD = 4 * HOUR;
const CORRUPTION = { cd: HOUR, gain: $r(300, 900), heat: [15, 25] };
const DEBAT = { energy: 15, cd: 30 * MIN };
const SCANDALE = { cost: $(300), cd: HOUR, success: 0.5 };
const ALLIANCE = { cd: 2 * HOUR, inf: [5, 10] };
const PRESENCE = { cd: DAY, base: $r(60, 120), per_streak: $(15), streak_max: 10 };
const QUEST_COUNT = 3;
const CONSEIL_CD = HOUR;
const DECRET_CD = 30 * MIN;
const DETOURNER = { cd: 3 * HOUR, heat: [20, 35] };

// ─── Les postes politiques ───
// pop = popularité min, inf = influence min, fee = caution électorale, pay = salaire
const POSTES = [
  { emoji: "📣", nom: "Militant", pop: 0, inf: 0, fee: 0, pay: $r(20, 50) },
  { emoji: "🏘️", nom: "Conseiller municipal", pop: 20, inf: 10, fee: $(200), pay: $r(80, 150) },
  { emoji: "🏙️", nom: "Maire", pop: 30, inf: 25, fee: $(600), pay: $r(200, 350) },
  { emoji: "🎙️", nom: "Député", pop: 40, inf: 45, fee: $(1500), pay: $r(400, 700) },
  { emoji: "💼", nom: "Ministre", pop: 50, inf: 70, fee: $(3500), pay: $r(800, 1300) },
  { emoji: "🧑‍💼", nom: "Premier ministre", pop: 60, inf: 100, fee: $(7000), pay: $r(1500, 2400) },
  { emoji: "🏛️", nom: "Président", pop: 70, inf: 140, fee: $(15000), pay: $r(3000, 5000) }
];
const PRES = POSTES.length - 1;

// Jauges du pays
const JAUGES = {
  eco: { emoji: "📈", nom: "Économie" },
  sante: { emoji: "🏥", nom: "Santé" },
  edu: { emoji: "📚", nom: "Éducation" },
  secu: { emoji: "🛡️", nom: "Sécurité" },
  stab: { emoji: "⚖️", nom: "Stabilité" }
};

// Décrets présidentiels : coût pris dans le TRÉSOR PUBLIC
const DECRETS = {
  usine: { emoji: "🏭", nom: "Plan industriel", cost: $(3000), fx: { eco: 12, stab: 2 }, pop: 2, alias: ["usine", "industrie", "economie", "eco"] },
  hopital: { emoji: "🏥", nom: "Construire des hôpitaux", cost: $(2500), fx: { sante: 14 }, pop: 4, alias: ["hopital", "sante", "hopitaux"] },
  ecoles: { emoji: "🏫", nom: "Construire des écoles", cost: $(2000), fx: { edu: 14 }, pop: 3, alias: ["ecoles", "ecole", "education", "edu"] },
  police: { emoji: "👮", nom: "Renforcer la police", cost: $(2200), fx: { secu: 14, stab: 3 }, pop: 1, alias: ["police", "securite", "secu"] },
  routes: { emoji: "🛣️", nom: "Grands travaux (routes)", cost: $(4000), fx: { eco: 8, stab: 4 }, pop: 5, alias: ["routes", "route", "travaux"] },
  dialogue: { emoji: "🕊️", nom: "Dialogue national", cost: $(1500), fx: { stab: 12 }, pop: 3, alias: ["dialogue", "paix", "stabilite"] },
  subvention: { emoji: "🍞", nom: "Baisse du prix du pain", cost: $(1800), fx: { stab: 6, eco: -3 }, pop: 9, alias: ["subvention", "pain", "prix"] },
  armee: { emoji: "🪖", nom: "Moderniser l'armée", cost: $(5000), fx: { secu: 18, stab: 6 }, pop: -2, alias: ["armee", "militaire"] }
};
const findDecret = (s) => { const q = strip(s); return Object.keys(DECRETS).find((id) => id === q || DECRETS[id].alias.includes(q)); };

// Impôts : revenu par conseil et effet sur la popularité
const IMPOTS = {
  bas: { nom: "Bas", income: 0.6, pop: 2, stab: 1 },
  moyen: { nom: "Moyen", income: 1.0, pop: 0, stab: 0 },
  haut: { nom: "Élevé", income: 1.5, pop: -3, stab: -2 }
};

// Crises : 2 choix, chacun avec ses effets (fx = jauges, pop, treso = trésor, money = perso, heat)
const CRISES = [
  { t: "🪧 Grève générale des enseignants !", a: { txt: "Augmenter les salaires", treso: -$(1500), fx: { edu: 6, stab: 5 }, pop: 4 }, b: { txt: "Ignorer la grève", fx: { edu: -8, stab: -8 }, pop: -6 } },
  { t: "🦠 Une épidémie se déclare dans le nord.", a: { txt: "Confinement + vaccins", treso: -$(2000), fx: { sante: 8, eco: -5 }, pop: 3 }, b: { txt: "Minimiser l'épidémie", fx: { sante: -14, stab: -5 }, pop: -8 } },
  { t: "🌊 Des inondations ravagent la capitale.", a: { txt: "Aide d'urgence massive", treso: -$(2500), fx: { stab: 6 }, pop: 7 }, b: { txt: "Demander l'aide internationale", fx: { stab: -2, eco: -3 }, pop: -1 } },
  { t: "💸 Un investisseur étranger propose une méga-usine… contre un « cadeau » personnel.", a: { txt: "Accepter le pot-de-vin", money: $(3000), fx: { eco: 8 }, heat: 30 }, b: { txt: "Refuser fermement", fx: { eco: 2 }, pop: 3 } },
  { t: "📰 Un journal révèle tes dépenses au palais.", a: { txt: "Faire fermer le journal", fx: { stab: -6 }, pop: -5, heat: 10 }, b: { txt: "Conférence de presse honnête", pop: 2, heat: -15 } },
  { t: "🔫 Des bandes armées attaquent des villages.", a: { txt: "Envoyer l'armée", treso: -$(1800), fx: { secu: 10, stab: 3 }, pop: 3 }, b: { txt: "Négocier avec les chefs", fx: { secu: -6, stab: 2 }, pop: -2 } },
  { t: "⛽ Le prix du carburant explose.", a: { txt: "Subventionner le carburant", treso: -$(2200), fx: { stab: 6, eco: -2 }, pop: 6 }, b: { txt: "Laisser le marché faire", fx: { eco: 3, stab: -7 }, pop: -6 } },
  { t: "🛢️ On découvre du pétrole au large des côtes !", a: { txt: "Nationaliser le gisement", treso: $(5000), fx: { eco: 6 }, pop: 4 }, b: { txt: "Vendre à une multinationale", treso: $(3000), money: $(1500), heat: 12, fx: { eco: 3 } } },
  { t: "🎓 Les étudiants manifestent pour des bourses.", a: { txt: "Créer des bourses", treso: -$(1200), fx: { edu: 7, stab: 4 }, pop: 4 }, b: { txt: "Disperser la manifestation", fx: { stab: -9, secu: 2 }, pop: -7 } },
  { t: "🤝 Un pays voisin propose un accord commercial.", a: { txt: "Signer l'accord", fx: { eco: 9 }, pop: 2 }, b: { txt: "Protéger nos produits", fx: { eco: -2, stab: 3 }, pop: 1 } }
];

// Thèmes de discours : chacun a un public
const THEMES = {
  emploi: { emoji: "💼", nom: "l'emploi des jeunes", pop: [2, 5] },
  sante: { emoji: "🏥", nom: "la santé pour tous", pop: [2, 5] },
  securite: { emoji: "🛡️", nom: "la sécurité", pop: [1, 6] },
  corruption: { emoji: "🧹", nom: "la lutte anti-corruption", pop: [0, 7] },
  education: { emoji: "📚", nom: "l'éducation", pop: [2, 5] }
};

// Boutique politique
const ITEMS = {
  cafe: { emoji: "☕", nom: "Café serré", prix: $(40), desc: "+20 énergie (président utiliser cafe)", alias: ["cafe", "coffee"] },
  affiches: { emoji: "🪧", nom: "Affiches de campagne", prix: $(150), desc: "+6 points de campagne (président utiliser affiches)", alias: ["affiches", "affiche", "poster"] },
  sondeur: { emoji: "📊", nom: "Institut de sondage", prix: $(200), desc: "Ton score exact d'élection au prochain « sondage » est révélé + 3 pop", alias: ["sondeur", "institut"] },
  avocat: { emoji: "⚖️", nom: "Avocat d'affaires", prix: $(800), desc: "-40 🔥 scandale (président utiliser avocat)", alias: ["avocat", "lawyer"] },
  garde: { emoji: "🕶️", nom: "Garde du corps", prix: $(600), desc: "Bloque automatiquement 1 scandale lancé contre toi", alias: ["garde", "gardeducorps", "bodyguard"] },
  conseiller: { emoji: "🧠", nom: "Conseiller en com'", prix: $(2500), desc: "+20 % popularité gagnée à vie (1 seul)", alias: ["conseiller", "com", "communication"] },
  tele: { emoji: "📺", nom: "Chaîne de télé", prix: $(8000), desc: "+3 popularité automatique à chaque salaire (1 seule)", alias: ["tele", "television", "tv", "chaine"] }
};
const findItem = (s) => { const q = strip(s); return Object.keys(ITEMS).find((id) => id === q || ITEMS[id].alias.includes(q)); };

const QUEST_POOL = [
  { id: "meeting", text: "Organiser 2 meetings", key: "meeting", need: 2, reward: $r(80, 140) },
  { id: "discours", text: "Faire 2 discours", key: "discours", need: 2, reward: $r(60, 100) },
  { id: "porte", text: "Faire du porte-à-porte", key: "porte", need: 1, reward: $r(60, 110) },
  { id: "lobby", text: "Rencontrer un lobby", key: "lobby", need: 1, reward: $r(70, 120) },
  { id: "debat", text: "Gagner un débat", key: "debat", need: 1, reward: $r(120, 200) },
  { id: "alliance", text: "Signer une alliance", key: "alliance", need: 1, reward: $r(90, 150) },
  { id: "present", text: "Pointer à la permanence", key: "present", need: 1, reward: $r(50, 80) },
  { id: "conseil", text: "Tenir un conseil des ministres", key: "conseil", need: 1, reward: $r(300, 500), cond: (g) => g.rank === PRES },
  { id: "decret", text: "Signer un décret", key: "decret", need: 1, reward: $r(250, 400), cond: (g) => g.rank === PRES }
];

const TIPS = [
  "Le 🔥 scandale fait perdre des voix : un avocat peut l'effacer.",
  "Le porte-à-porte et les affiches remplissent ta jauge de campagne.",
  "Une alliance avec un autre joueur fait monter vos deux influences.",
  "Président ? Garde la ⚖️ Stabilité au-dessus de 20, sinon gare au coup d'État !",
  "Lance « president sondage » avant une élection pour estimer tes chances.",
  "Les décrets sont payés avec le trésor public, pas avec ton argent.",
  "Des impôts élevés remplissent le trésor… mais fâchent le peuple."
];

const ACH = {
  PREMIER_MEETING: { emoji: "📣", nom: "Premier meeting", desc: "Organiser un meeting", test: (p) => p.g.stats.meeting >= 1 },
  ELU: { emoji: "🗳️", nom: "Premier mandat", desc: "Gagner une élection", test: (p) => p.g.stats.wins >= 1 },
  MAIRE: { emoji: "🏙️", nom: "Monsieur le Maire", desc: "Devenir Maire", test: (p) => p.g.best >= 2 },
  DEPUTE: { emoji: "🎙️", nom: "Député", desc: "Entrer à l'Assemblée", test: (p) => p.g.best >= 3 },
  MINISTRE: { emoji: "💼", nom: "Ministre", desc: "Entrer au gouvernement", test: (p) => p.g.best >= 4 },
  PRESIDENT: { emoji: "🏛️", nom: "Chef de l'État", desc: "Devenir Président", test: (p) => p.g.best >= PRES },
  REELU: { emoji: "👑", nom: "Réélu", desc: "Être réélu Président", test: (p) => p.g.stats.reelu >= 1 },
  ORATEUR: { emoji: "🎤", nom: "Orateur", desc: "Gagner 10 débats", test: (p) => p.g.stats.debatWin >= 10 },
  INTEGRE: { emoji: "🧼", nom: "Intègre", desc: "Devenir Président sans jamais être corrompu", test: (p) => p.g.best >= PRES && p.g.stats.corrupt === 0 },
  BATISSEUR: { emoji: "🏗️", nom: "Bâtisseur", desc: "Signer 20 décrets", test: (p) => p.g.stats.decrets >= 20 },
  GESTIONNAIRE: { emoji: "🧯", nom: "Gestionnaire de crise", desc: "Résoudre 10 crises", test: (p) => p.g.stats.crises >= 10 },
  ADORE: { emoji: "❤️", nom: "Adoré du peuple", desc: "Atteindre 95 de popularité", test: (p) => p.g.pop >= 95 },
  FIDELE: { emoji: "🗓️", nom: "Fidèle au poste", desc: "Série de 7 jours de présence", test: (p) => p.g.streak >= 7 }
};
const ACH_REWARD = { PREMIER_MEETING: 50, ELU: 200, MAIRE: 500, DEPUTE: 1000, MINISTRE: 2500, PRESIDENT: 8000, REELU: 10000, ORATEUR: 1500, INTEGRE: 5000, BATISSEUR: 3000, GESTIONNAIRE: 2500, ADORE: 2000, FIDELE: 800 };
for (const k of Object.keys(ACH_REWARD)) ACH_REWARD[k] *= M;

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (n) => String(Math.floor(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const FM = (n) => `${fmt(n)} $`;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const L = (ch = "─", n = 40) => ch.repeat(n);
const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const bar = (v, max, w = 15) => { const f = Math.floor(clamp(v / (max || 1), 0, 1) * w); return "█".repeat(f) + "░".repeat(w - f); };
const sign = (n) => (n >= 0 ? `+${n}` : `${n}`);
function dur(ms) {
  const d = Math.floor(ms / DAY), h = Math.floor((ms % DAY) / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
  return d > 0 ? `${d}j ${h}h` : h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Joueur ───────────────────────────────────────────────────
function initCountry() {
  return { nom: null, eco: 50, sante: 50, edu: 50, secu: 50, stab: 55, treso: $(10000), impots: "moyen", since: Date.now(), crisis: null };
}
function initPres() {
  return {
    rank: 0, best: 0,
    pop: 10, inf: 0, charisme: 5,
    camp: 0,                     // points de campagne pour la prochaine élection
    heat: 0, heatAt: Date.now(), // scandale (0-100)
    energy: ENERGY_MAX, energyAt: Date.now(),
    parti: null,
    pays: null,                  // seulement quand président
    term: 0,                     // nombre de mandats
    stats: { meeting: 0, discours: 0, wins: 0, losses: 0, debatWin: 0, debatLoss: 0, corrupt: 0, decrets: 0, crises: 0, reelu: 0, quests: 0, coups: 0 },
    achievements: [], inv: {}, streak: 0, quest: null, welcomed: false, cd: {}
  };
}
function normalize(raw) {
  const d = initPres();
  const g = Object.assign(initPres(), raw || {});
  g.stats = Object.assign(d.stats, (raw && raw.stats) || {});
  g.cd = Object.assign({}, (raw && raw.cd) || {});
  g.inv = Object.assign({}, (raw && raw.inv) || {});
  if (!Array.isArray(g.achievements)) g.achievements = [];
  g.rank = clamp(Math.floor(Number(g.rank) || 0), 0, PRES);
  g.best = Math.max(g.best || 0, g.rank);
  g.pop = clamp(Number(g.pop) || 0, 0, 100);
  g.heat = clamp(Number(g.heat) || 0, 0, 100);
  g.energy = clamp(Number(g.energy) || 0, 0, ENERGY_MAX);
  if (g.rank === PRES && !g.pays) g.pays = initCountry();
  if (g.pays) g.pays = Object.assign(initCountry(), g.pays);
  if (g.quest && !Array.isArray(g.quest.list)) g.quest = null;
  return g;
}

const wallet = (p) => Number(p.user.money) || 0;
function addMoney(p, n) { p.user.money = Math.max(0, wallet(p) + n); }
const cdLeft = (g, key, ms) => { const d = ms - (Date.now() - (g.cd[key] || 0)); return d > 0 ? dur(d) : null; };
const poste = (g) => POSTES[g.rank];
const isPres = (g) => g.rank === PRES && !!g.pays;
const popMult = (g) => ((g.inv.conseiller || 0) > 0 ? 1.2 : 1);
function addPop(g, n) { const v = n > 0 ? Math.round(n * popMult(g)) : n; g.pop = clamp(g.pop + v, 0, 100); return v; }
const addHeat = (g, n) => { g.heat = clamp(g.heat + n, 0, 100); };
const jauge = (pays, k, n) => { pays[k] = clamp(pays[k] + n, 0, 100); };
const paysAvg = (pays) => Math.round((pays.eco + pays.sante + pays.edu + pays.secu + pays.stab) / 5);

function tick(g) {
  const now = Date.now();
  const gain = Math.floor((now - (g.energyAt || now)) / ENERGY_REGEN);
  if (gain > 0) { g.energy = Math.min(ENERGY_MAX, g.energy + gain); g.energyAt += gain * ENERGY_REGEN; }
  if (g.energy >= ENERGY_MAX) g.energyAt = now;
  const cool = Math.floor((now - (g.heatAt || now)) / HEAT_DECAY);
  if (cool > 0) { g.heat = Math.max(0, g.heat - cool); g.heatAt += cool * HEAT_DECAY; }
  if (g.heat <= 0) g.heatAt = now;
}

// Score d'élection (sans le hasard) — sert aussi au sondage
function electionBase(g) {
  const next = POSTES[Math.min(g.rank + 1, PRES)];
  let s = g.pop * 0.55 + Math.min(30, (g.inf / Math.max(1, next.inf)) * 15) + g.camp * 0.6 + g.charisme * 0.3 - g.heat * 0.35;
  return Math.round(s);
}
function reelectionBase(g) {
  return Math.round(g.pop * 0.5 + paysAvg(g.pays) * 0.4 + g.camp * 0.5 - g.heat * 0.35);
}

// ─── Objectifs du jour ───
const todayNum = () => Math.floor(Date.now() / DAY);
function ensureQuests(g) {
  if (g.quest && g.quest.d === todayNum()) return g.quest;
  const pool = QUEST_POOL.filter((q) => !q.cond || q.cond(g));
  const chosen = [];
  while (chosen.length < QUEST_COUNT && pool.length) chosen.push(pool.splice(rand(0, pool.length - 1), 1)[0]);
  g.quest = { d: todayNum(), list: chosen.map((q) => ({ id: q.id, got: 0, done: false })), bonus: false };
  return g.quest;
}
function bump(p, key, n = 1) {
  const g = p.g, quest = ensureQuests(g), mult = 1 + 0.25 * g.rank;
  for (const e of quest.list) {
    const q = QUEST_POOL.find((x) => x.id === e.id);
    if (!q || e.done || q.key !== key) continue;
    e.got = Math.min(q.need, e.got + n);
    if (e.got < q.need) continue;
    e.done = true;
    const reward = Math.floor(rand(q.reward[0], q.reward[1]) * mult);
    addMoney(p, reward);
    g.stats.quests++;
    p.notes.push(`🎯 Objectif accompli : ${q.text} (+${FM(reward)})`);
  }
  if (!quest.bonus && quest.list.length && quest.list.every((e) => e.done)) {
    quest.bonus = true;
    const gold = Math.floor(rand($(200), $(400)) * mult);
    addMoney(p, gold);
    g.inv.cafe = (g.inv.cafe || 0) + 1;
    g.inf += 5;
    p.notes.push(`🎁 Coffre du jour : +${FM(gold)}, +5 🤝 influence et un ☕ café !`);
  }
}

// ─── Chargement / sauvegarde ───
async function load(usersData, uid) {
  let user = await usersData.get(uid);
  if (!user) user = { money: 0, exp: 0, data: {} };
  if (!user.data) user.data = {};
  user.data.president = normalize(user.data.president);
  tick(user.data.president);
  return { uid: String(uid), user, g: user.data.president, notes: [] };
}
async function save(usersData, p) { await usersData.set(p.uid, { money: wallet(p), data: p.user.data }); }
async function getP(c, uid) {
  uid = String(uid);
  if (!c.players.has(uid)) c.players.set(uid, await load(c.usersData, uid));
  return c.players.get(uid);
}
async function nm(c, id) {
  id = String(id);
  if (!c.names.has(id)) {
    let n = null;
    try { n = await c.usersData.getName(id); } catch (e) { /* défaut */ }
    c.names.set(id, n || `Utilisateur ${id.slice(-4)}`);
  }
  return c.names.get(id);
}
function targetOf(event) {
  let id = Object.keys(event.mentions || {})[0];
  if (!id && event.messageReply) id = event.messageReply.senderID;
  return id ? String(id) : null;
}
function checkAch(p) {
  const fresh = [];
  for (const [id, a] of Object.entries(ACH)) {
    if (!p.g.achievements.includes(id) && a.test(p)) {
      p.g.achievements.push(id);
      const r = ACH_REWARD[id] || 0;
      if (r) addMoney(p, r);
      fresh.push(`${a.emoji} ${a.nom}${r ? ` (+${FM(r)})` : ""}`);
    }
  }
  return fresh;
}

const reply = (c, text) => c.message.reply(B(text));
async function finish(c, text, { others = [] } = {}) {
  const players = [c.me];
  for (const o of others) if (!players.includes(o)) players.push(o);
  let out = text;
  for (const p of players) {
    const ach = checkAch(p);
    if (ach.length) p.notes.push(`🏆 Succès : ${ach.join(", ")}`);
    if (!p.notes.length) continue;
    const who = p === c.me ? "" : `${await nm(c, p.uid)} → `;
    out += `\n\n${p.notes.map((n) => who + n).join("\n")}`;
    p.notes = [];
  }
  for (const p of players) await save(c.usersData, p);
  return c.message.reply(B(out));
}
function tired(c, need) {
  if (c.me.g.energy >= need) return false;
  reply(c, `😴 Trop fatigué (⚡ ${Math.floor(c.me.g.energy)}/${ENERGY_MAX}, il faut ${need}).\n👉 « ${CMD} repos », un ☕ café, ou attends un peu.`);
  return true;
}
function waitCd(c, key, ms, label) {
  const left = cdLeft(c.me.g, key, ms);
  if (!left) return false;
  reply(c, `⏳ ${label} : encore ${left}.`);
  return true;
}
const needPres = (c) => { if (isPres(c.me.g)) return false; reply(c, `🚫 Réservé au 🏛️ Président. Tu es ${poste(c.me.g).emoji} ${poste(c.me.g).nom}.\n👉 « ${CMD} election » pour grimper.`); return true; };

// ============================================================
//  👤 PROFIL & INFOS
// ============================================================
function renderHelp() {
  const P = CMD;
  return [
    `🏛️ PRÉSIDENT — AIDE`, L("═"),
    `👤 PROFIL`,
    `• ${P} / ${P} stat [@]  → ta fiche politique`,
    `• ${P} carriere  → les postes et conditions`,
    `• ${P} parti <nom>  → fonder ton parti`,
    `• ${P} top  → classement des politiciens`,
    `• ${P} succes  → tes succès`,
    "",
    `📣 CAMPAGNE`,
    `• ${P} meeting  → grand rassemblement (+pop)`,
    `• ${P} discours <emploi|sante|securite|corruption|education>`,
    `• ${P} porte  → porte-à-porte (+campagne)`,
    `• ${P} campagne <montant>  → financer ta campagne`,
    `• ${P} lobby  → rencontrer un lobby (+influence)`,
    `• ${P} sondage  → tes chances à l'élection`,
    `• ${P} election  → te présenter au poste suivant`,
    "",
    `⚔️ JOUEURS`,
    `• ${P} debat @user  → débat télévisé`,
    `• ${P} scandale @user  → sortir des dossiers (risqué)`,
    `• ${P} alliance @user  → pacte politique`,
    `• ${P} soutien @user <montant>  → financer un allié`,
    "",
    `💰 ARGENT`,
    `• ${P} salaire  → ton salaire d'élu`,
    `• ${P} presence  → permanence quotidienne (série)`,
    `• ${P} corruption  → 💸 pot-de-vin (🔥 risque)`,
    `• ${P} objectifs  → 3 missions du jour`,
    `• ${P} boutique / acheter <objet> / utiliser <objet>`,
    `• ${P} repos  → récupérer de l'énergie`,
    "",
    `🌍 PRÉSIDENT SEULEMENT`,
    `• ${P} pays  → tableau de bord de la nation`,
    `• ${P} nommer <nom>  → nommer ton pays`,
    `• ${P} conseil  → conseil des ministres (impôts + crises)`,
    `• ${P} crise <1|2>  → répondre à une crise`,
    `• ${P} decret <type>  → signer un décret (liste : ${P} decret)`,
    `• ${P} impots <bas|moyen|haut>`,
    `• ${P} detourner <montant>  → 🤫 puiser dans le trésor`,
    `• ${P} reelection  → à la fin du mandat`,
    `• ${P} demission  → quitter le pouvoir`
  ].join("\n");
}

async function cmdHelp(c) { return reply(c, renderHelp()); }

async function cmdStat(c) {
  const tid = targetOf(c.event);
  const p = tid && tid !== c.uid ? await getP(c, tid) : c.me;
  const g = p.g, po = poste(g), next = POSTES[g.rank + 1];
  const lines = [
    `${po.emoji} ${await nm(c, p.uid)}`, L("═"),
    `🎖️ Poste : ${po.nom}${g.parti ? `  |  🏳️ Parti : ${g.parti}` : ""}`,
    `💰 Fortune : ${FM(wallet(p))}`,
    `📊 Popularité : ${bar(g.pop, 100)} ${g.pop}/100`,
    `🤝 Influence : ${fmt(g.inf)}   🎤 Charisme : ${g.charisme}`,
    `📢 Campagne : ${bar(g.camp, CAMPAGNE.max)} ${g.camp}/${CAMPAGNE.max}`,
    `🔥 Scandale : ${bar(g.heat, 100)} ${g.heat}/100`,
    `⚡ Énergie : ${Math.floor(g.energy)}/${ENERGY_MAX}`,
    `🗳️ Élections : ${g.stats.wins} gagnées / ${g.stats.losses} perdues  |  🎤 Débats : ${g.stats.debatWin}V-${g.stats.debatLoss}D`
  ];
  if (next) lines.push("", `➡️ Prochain poste : ${next.emoji} ${next.nom} (📊 ${next.pop}, 🤝 ${next.inf}, caution ${FM(next.fee)})`);
  if (isPres(g)) {
    const left = MANDAT - (Date.now() - g.pays.since);
    lines.push("", `🌍 ${g.pays.nom || "Ton pays"} : santé moyenne ${paysAvg(g.pays)}/100`, `⏱️ Mandat n°${g.term} : ${left > 0 ? `encore ${dur(left)}` : "TERMINÉ → « " + CMD + " reelection »"}`);
  }
  if (p === c.me) lines.push("", `💡 ${pick(TIPS)}`);
  return reply(c, lines.join("\n"));
}

async function cmdCarriere(c) {
  const g = c.me.g;
  const lines = [`🪜 CARRIÈRE POLITIQUE`, L("═")];
  POSTES.forEach((po, i) => {
    const mark = i < g.rank ? "✅" : i === g.rank ? "👉" : "🔒";
    lines.push(`${mark} ${po.emoji} ${po.nom}${i ? ` — 📊${po.pop} 🤝${po.inf} 💵${FM(po.fee)}` : ""}\n     Salaire : ${FM(po.pay[0])} – ${FM(po.pay[1])}`);
  });
  lines.push("", `🗳️ Gagne une élection avec un score ≥ ${WIN_SCORE} pour monter.`);
  return reply(c, lines.join("\n"));
}

async function cmdParti(c) {
  const g = c.me.g;
  const name = c.args.slice(1).join(" ").trim().slice(0, 30);
  if (!name) return reply(c, g.parti ? `🏳️ Ton parti : ${g.parti}` : `🏳️ Fonde ton parti : « ${CMD} parti <nom> » (coût ${FM($(100))})`);
  if (wallet(c.me) < $(100)) return reply(c, `💸 Il te faut ${FM($(100))} pour déposer les statuts.`);
  const first = !g.parti;
  addMoney(c.me, -$(100));
  g.parti = name;
  if (first) { g.inf += 5; addPop(g, 3); }
  return finish(c, `🏳️ Le parti « ${name} » est ${first ? "fondé ! +5 🤝 influence, +3 📊" : "renommé."}`);
}

async function cmdTop(c) {
  const all = await c.usersData.getAll();
  const rows = (all || []).filter((u) => u && u.data && u.data.president).map((u) => ({ id: String(u.userID), g: normalize(u.data.president), name: u.name }))
    .sort((a, b) => b.g.rank - a.g.rank || b.g.pop - a.g.pop || b.g.inf - a.g.inf).slice(0, 10);
  if (!rows.length) return reply(c, "📭 Aucun politicien pour l'instant.");
  const medal = ["🥇", "🥈", "🥉"];
  const lines = [`🏆 TOP POLITICIENS`, L("═")];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i], po = POSTES[r.g.rank];
    lines.push(`${medal[i] || `${i + 1}.`} ${r.name || (await nm(c, r.id))}\n    ${po.emoji} ${po.nom} | 📊 ${r.g.pop} | 🤝 ${fmt(r.g.inf)}${r.g.parti ? ` | 🏳️ ${r.g.parti}` : ""}`);
  }
  return reply(c, lines.join("\n"));
}

async function cmdSucces(c) {
  const g = c.me.g;
  const lines = [`🏆 SUCCÈS (${g.achievements.length}/${Object.keys(ACH).length})`, L("═")];
  for (const [id, a] of Object.entries(ACH)) lines.push(`${g.achievements.includes(id) ? "✅" : "⬜"} ${a.emoji} ${a.nom} — ${a.desc} (${FM(ACH_REWARD[id])})`);
  return reply(c, lines.join("\n"));
}

// ============================================================
//  📣 CAMPAGNE
// ============================================================
async function cmdMeeting(c) {
  const g = c.me.g;
  if (waitCd(c, "meeting", MEETING.cd, "Le prochain meeting se prépare")) return;
  if (tired(c, MEETING.energy)) return;
  const cost = MEETING.cost * (g.rank + 1);
  if (wallet(c.me) < cost) return reply(c, `💸 Louer le stade coûte ${FM(cost)}.`);
  addMoney(c.me, -cost);
  g.energy -= MEETING.energy; g.cd.meeting = Date.now(); g.stats.meeting++;
  const crowd = rand(200, 1000) * (g.rank + 1);
  let gain = rand(MEETING.pop[0], MEETING.pop[1]);
  let extra = "";
  const r = Math.random();
  if (r < 0.12) { gain = -2; extra = "\n😬 Un micro coupé, des sifflets… soirée ratée."; }
  else if (r < 0.25) { gain += 4; g.camp = Math.min(CAMPAGNE.max, g.camp + 5); extra = "\n🔥 La foule scande ton nom ! (+5 campagne)"; }
  const real = addPop(g, gain);
  if (Math.random() < 0.3) g.charisme++;
  bump(c.me, "meeting");
  return finish(c, `📣 MEETING — ${fmt(crowd)} personnes\n${L()}\n💵 Frais : -${FM(cost)}\n📊 Popularité : ${sign(real)} → ${g.pop}/100${extra}`);
}

async function cmdDiscours(c) {
  const g = c.me.g;
  const key = strip(c.args[1]);
  const th = THEMES[key];
  if (!th) return reply(c, `🎤 Choisis un thème :\n${Object.entries(THEMES).map(([k, t]) => `• ${t.emoji} ${CMD} discours ${k}`).join("\n")}`);
  if (waitCd(c, "discours", DISCOURS.cd, "Ta voix se repose")) return;
  if (tired(c, DISCOURS.energy)) return;
  g.energy -= DISCOURS.energy; g.cd.discours = Date.now(); g.stats.discours++;
  // Répéter le même thème lasse le public
  const repeat = g.lastTheme === key;
  g.lastTheme = key;
  let gain = rand(th.pop[0], th.pop[1]) + Math.floor(g.charisme / 10);
  if (repeat) gain = Math.max(0, gain - 3);
  // Parler corruption avec un gros scandale = hypocrisie
  let extra = repeat ? "\n🥱 Le public a déjà entendu ce discours…" : "";
  if (key === "corruption" && g.heat >= 40) { gain = -4; extra = "\n🤨 Le public rit : tu es toi-même dans un scandale !"; }
  if (key === "corruption" && g.heat < 10) addHeat(g, -5);
  const real = addPop(g, gain);
  bump(c.me, "discours");
  return finish(c, `🎤 Discours sur ${th.emoji} ${th.nom}\n📊 Popularité : ${sign(real)} → ${g.pop}/100${extra}`);
}

async function cmdPorte(c) {
  const g = c.me.g;
  if (waitCd(c, "porte", PORTE.cd, "Tes chaussures sont usées")) return;
  if (tired(c, PORTE.energy)) return;
  g.energy -= PORTE.energy; g.cd.porte = Date.now();
  const gain = rand(PORTE.camp[0], PORTE.camp[1]);
  g.camp = Math.min(CAMPAGNE.max, g.camp + gain);
  const doors = rand(20, 80);
  let extra = "";
  if (Math.random() < 0.15) { addPop(g, 2); extra = "\n👵 Une grand-mère t'a offert du bissap et parle de toi à tout le quartier (+2 📊)"; }
  bump(c.me, "porte");
  return finish(c, `🚪 Porte-à-porte : ${doors} portes frappées\n📢 Campagne : +${gain} → ${g.camp}/${CAMPAGNE.max}${extra}`);
}

async function cmdCampagne(c) {
  const g = c.me.g;
  const raw = strip(c.args[1]);
  const price = $(50) * (g.rank + 1);   // prix d'1 point de campagne
  if (!raw) return reply(c, `📢 Financer ta campagne : « ${CMD} campagne <montant> »\n💵 1 point = ${FM(price)} (à ton niveau)\n📢 Actuel : ${g.camp}/${CAMPAGNE.max}`);
  if (waitCd(c, "campagne", CAMPAGNE.cd, "L'équipe de campagne compte les billets")) return;
  const amount = raw === "all" || raw === "tout" ? wallet(c.me) : Math.floor(Number(raw));
  if (!amount || amount < price) return reply(c, `❌ Montant minimum : ${FM(price)}.`);
  if (amount > wallet(c.me)) return reply(c, `💸 Tu n'as que ${FM(wallet(c.me))}.`);
  const pts = Math.min(CAMPAGNE.max - g.camp, Math.floor(amount / price));
  if (pts <= 0) return reply(c, "📢 Ta campagne est déjà au maximum !");
  addMoney(c.me, -pts * price);
  g.camp += pts; g.cd.campagne = Date.now();
  return finish(c, `📢 Campagne financée : +${pts} points (-${FM(pts * price)})\n📢 Total : ${g.camp}/${CAMPAGNE.max}`);
}

async function cmdLobby(c) {
  const g = c.me.g;
  if (waitCd(c, "lobby", LOBBY.cd, "Les lobbys te rappelleront")) return;
  if (tired(c, LOBBY.energy)) return;
  g.energy -= LOBBY.energy; g.cd.lobby = Date.now();
  const lob = pick(["les commerçants", "les transporteurs", "les syndicats", "les chefs traditionnels", "les patrons du cacao", "les religieux", "la diaspora"]);
  const gain = rand(LOBBY.inf[0], LOBBY.inf[1]) + g.rank;
  g.inf += gain;
  let extra = "";
  if (Math.random() < 0.2) { const don = rand($(50), $(200)) * (g.rank + 1); addMoney(c.me, don); extra = `\n💵 Ils financent ta cause : +${FM(don)}`; }
  bump(c.me, "lobby");
  return finish(c, `🤝 Rencontre avec ${lob}\n🤝 Influence : +${gain} → ${fmt(g.inf)}${extra}`);
}

async function cmdSondage(c) {
  const g = c.me.g;
  if (isPres(g)) {
    const s = reelectionBase(g);
    return reply(c, `📊 SONDAGE RÉÉLECTION\n${L()}\nIntentions de vote : ~${clamp(s, 0, 100)} %  (besoin ${WIN_SCORE})\n🌍 Bilan du pays : ${paysAvg(g.pays)}/100\n${s >= WIN_SCORE ? "✅ Tu es favori." : "⚠️ Tu es en danger !"}`);
  }
  const next = POSTES[g.rank + 1];
  const s = electionBase(g);
  const precise = (g.inv.sondeur || 0) > 0;
  if (precise) { g.inv.sondeur--; addPop(g, 3); }
  const shown = precise ? `${s}` : `${clamp(s - rand(0, 8), 0, 100)} – ${clamp(s + rand(0, 8), 0, 100)}`;
  const req = [];
  if (g.pop < next.pop) req.push(`📊 popularité ${g.pop}/${next.pop}`);
  if (g.inf < next.inf) req.push(`🤝 influence ${g.inf}/${next.inf}`);
  if (wallet(c.me) < next.fee) req.push(`💵 caution ${FM(next.fee)}`);
  return finish(c, `📊 SONDAGE — ${next.emoji} ${next.nom}\n${L()}\nScore estimé : ${shown}  (besoin ${WIN_SCORE})\n${req.length ? `❌ Conditions manquantes :\n• ${req.join("\n• ")}` : "✅ Tu peux te présenter !"}\n\n💡 Le score monte avec 📊, 🤝, 📢 campagne et 🎤 ; le 🔥 scandale le fait chuter.`);
}

async function cmdElection(c) {
  const g = c.me.g;
  if (g.rank >= PRES) return reply(c, `🏛️ Tu es déjà Président ! Pense à la « ${CMD} reelection » en fin de mandat.`);
  const next = POSTES[g.rank + 1];
  if (waitCd(c, "election", ELECTION_CD, "Prochaine élection possible dans")) return;
  if (g.pop < next.pop || g.inf < next.inf) return reply(c, `🚫 Pour ${next.emoji} ${next.nom} il faut 📊 ${next.pop} et 🤝 ${next.inf}.\nToi : 📊 ${g.pop}, 🤝 ${g.inf}.`);
  if (wallet(c.me) < next.fee) return reply(c, `💸 La caution électorale coûte ${FM(next.fee)}.`);
  addMoney(c.me, -next.fee);
  g.cd.election = Date.now();
  const luck = rand(-12, 12);
  const score = clamp(electionBase(g) + luck, 0, 100);
  const adv = clamp(100 - score - rand(0, 10), 0, 100);
  const lines = [`🗳️ ÉLECTION — ${next.emoji} ${next.nom}`, L("═"), `🗳️ Dépouillement…`, `• Toi : ${score} %`, `• Adversaire : ${adv} %`, ""];
  if (score >= WIN_SCORE) {
    g.rank++; g.best = Math.max(g.best, g.rank); g.stats.wins++;
    g.camp = 0; g.inf += 10;
    lines.push(`🎉 VICTOIRE ! Tu deviens ${next.emoji} ${next.nom} !`, "+10 🤝 influence");
    if (g.rank === PRES) {
      g.pays = initCountry(); g.term = 1;
      lines.push("", `🏛️ Bienvenue au palais, Monsieur/Madame le Président !`, `🌍 Trésor public : ${FM(g.pays.treso)}`, `👉 « ${CMD} nommer <nom> » puis « ${CMD} pays »`);
    }
  } else {
    g.stats.losses++;
    g.camp = Math.floor(g.camp / 2);
    addPop(g, -3);
    lines.push(`😞 DÉFAITE… il te manquait ${WIN_SCORE - score} points.`, "📢 Ta campagne est divisée par 2, -3 📊", `💡 ${g.heat > 30 ? "Ton scandale t'a coûté cher." : "Plus de meetings et de porte-à-porte !"}`);
  }
  return finish(c, lines.join("\n"));
}

// ============================================================
//  ⚔️ ENTRE JOUEURS
// ============================================================
async function getTarget(c) {
  const tid = targetOf(c.event);
  if (!tid) { reply(c, "👉 Mentionne un joueur (@) ou réponds à son message."); return null; }
  if (tid === c.uid || tid === c.botID) { reply(c, "🙃 Choisis un autre joueur."); return null; }
  return getP(c, tid);
}

async function cmdDebat(c) {
  const g = c.me.g;
  if (waitCd(c, "debat", DEBAT.cd, "Le plateau télé n'est pas libre")) return;
  if (tired(c, DEBAT.energy)) return;
  const t = await getTarget(c); if (!t) return;
  g.energy -= DEBAT.energy; g.cd.debat = Date.now();
  const me = g.charisme * 2 + g.pop * 0.5 + g.rank * 3 - g.heat * 0.2 + rand(0, 30);
  const him = t.g.charisme * 2 + t.g.pop * 0.5 + t.g.rank * 3 - t.g.heat * 0.2 + rand(0, 30);
  const tn = await nm(c, t.uid);
  const punch = pick(["« Vous n'avez pas le monopole du cœur ! »", "« Les promesses n'engagent que ceux qui y croient. »", "« Le peuple a faim, et vous parlez de chiffres ? »", "« Vos bilans parlent pour vous… et ils sont vides. »"]);
  let text;
  if (me >= him) {
    const gp = addPop(g, rand(3, 7)); addPop(t.g, -rand(2, 5));
    g.charisme++; g.stats.debatWin++; t.g.stats.debatLoss++;
    bump(c.me, "debat");
    text = `🎤 DÉBAT TÉLÉVISÉ vs ${tn}\n${L()}\nTa phrase choc : ${punch}\n🏆 Tu remportes le débat ! (${sign(gp)} 📊, +1 🎤)\n${tn} perd des points dans les sondages.`;
  } else {
    addPop(g, -rand(2, 5)); addPop(t.g, rand(3, 6));
    t.g.charisme++; g.stats.debatLoss++; t.g.stats.debatWin++;
    text = `🎤 DÉBAT TÉLÉVISÉ vs ${tn}\n${L()}\n😳 Tu bafouilles devant les caméras…\n❌ ${tn} gagne le débat. Ta popularité baisse.`;
  }
  return finish(c, text, { others: [t] });
}

async function cmdScandale(c) {
  const g = c.me.g;
  if (waitCd(c, "scandale", SCANDALE.cd, "Tes informateurs se cachent")) return;
  const t = await getTarget(c); if (!t) return;
  if (wallet(c.me) < SCANDALE.cost) return reply(c, `💸 Payer les journalistes coûte ${FM(SCANDALE.cost)}.`);
  addMoney(c.me, -SCANDALE.cost); g.cd.scandale = Date.now();
  const tn = await nm(c, t.uid);
  if ((t.g.inv.garde || 0) > 0) {
    t.g.inv.garde--;
    addHeat(g, 10);
    return finish(c, `🕶️ Le garde du corps de ${tn} a intercepté ton espion !\n🔥 +10 scandale pour toi.`, { others: [t] });
  }
  const chance = SCANDALE.success + Math.min(0.3, t.g.heat / 200);   // un adversaire déjà sale est plus facile à salir
  if (Math.random() < chance) {
    const loss = rand(5, 12);
    addPop(t.g, -loss); addHeat(t.g, rand(10, 20));
    t.g.camp = Math.max(0, t.g.camp - 5);
    return finish(c, `📰 SCANDALE ! Les dossiers de ${tn} font la une.\n📉 ${tn} : -${loss} 📊, 🔥 scandale en hausse, -5 campagne.`, { others: [t] });
  }
  addHeat(g, rand(15, 25)); addPop(g, -4);
  return finish(c, `🤦 Les journalistes ont découvert que TU étais derrière les fausses rumeurs !\n🔥 Scandale +, -4 📊`, { others: [t] });
}

async function cmdAlliance(c) {
  const g = c.me.g;
  if (waitCd(c, "alliance", ALLIANCE.cd, "Ton prochain pacte")) return;
  const t = await getTarget(c); if (!t) return;
  g.cd.alliance = Date.now();
  const a = rand(ALLIANCE.inf[0], ALLIANCE.inf[1]), b = rand(ALLIANCE.inf[0], ALLIANCE.inf[1]);
  g.inf += a; t.g.inf += b;
  let extra = "";
  if (g.parti && t.g.parti && g.parti !== t.g.parti) { g.inf += 3; t.g.inf += 3; extra = `\n🏳️ Coalition « ${g.parti} » + « ${t.g.parti} » : +3 🤝 chacun !`; }
  bump(c.me, "alliance");
  return finish(c, `🤝 ALLIANCE signée avec ${await nm(c, t.uid)}\n• Toi : +${a} 🤝\n• Allié : +${b} 🤝${extra}`, { others: [t] });
}

async function cmdSoutien(c) {
  const t = await getTarget(c); if (!t) return;
  const amount = Math.floor(Number(c.args.find((x, i) => i > 0 && /^\d+$/.test(x))));
  if (!amount || amount <= 0) return reply(c, `💵 « ${CMD} soutien @user <montant> »`);
  if (amount > wallet(c.me)) return reply(c, `💸 Tu n'as que ${FM(wallet(c.me))}.`);
  addMoney(c.me, -amount); addMoney(t, amount);
  if (amount >= $(500)) c.me.g.inf += 2;
  return finish(c, `💵 Tu finances la campagne de ${await nm(c, t.uid)} : ${FM(amount)}${amount >= $(500) ? "\n🤝 +2 influence pour ta générosité" : ""}`, { others: [t] });
}

// ============================================================
//  💰 ARGENT
// ============================================================
async function cmdSalaire(c) {
  const g = c.me.g, po = poste(g);
  if (waitCd(c, "salaire", SALAIRE_CD, "Prochain salaire")) return;
  g.cd.salaire = Date.now();
  const pay = rand(po.pay[0], po.pay[1]);
  addMoney(c.me, pay);
  let extra = "";
  if ((g.inv.tele || 0) > 0) { addPop(g, 3); extra = "\n📺 Ta chaîne de télé chante tes louanges (+3 📊)"; }
  if (g.rank === 0 && Math.random() < 0.5) { g.inf += 2; extra += "\n🤝 Tu colles des affiches pour le parti : +2 influence"; }
  return finish(c, `💵 SALAIRE de ${po.emoji} ${po.nom} : +${FM(pay)}${extra}`);
}

async function cmdPresence(c) {
  const g = c.me.g;
  if (waitCd(c, "presence", PRESENCE.cd, "Prochaine permanence")) return;
  const last = g.cd.presence || 0;
  g.streak = Date.now() - last < 2 * DAY ? g.streak + 1 : 1;
  g.cd.presence = Date.now();
  const bonus = rand(PRESENCE.base[0], PRESENCE.base[1]) + PRESENCE.per_streak * Math.min(g.streak, PRESENCE.streak_max);
  addMoney(c.me, bonus); g.inf += 2; addPop(g, 1);
  bump(c.me, "present");
  return finish(c, `🗓️ Permanence tenue ! Série : ${g.streak} jour(s) 🔥\n💵 +${FM(bonus)}, +2 🤝, +1 📊`);
}

async function cmdCorruption(c) {
  const g = c.me.g;
  if (g.rank === 0) return reply(c, "🙅 Personne ne corrompt un simple militant. Fais-toi élire d'abord !");
  if (waitCd(c, "corruption", CORRUPTION.cd, "Le prochain « ami » passera dans")) return;
  g.cd.corruption = Date.now(); g.stats.corrupt++;
  // Enquête : plus le scandale est haut, plus le risque est grand
  if (Math.random() < 0.1 + g.heat / 150) {
    const fine = Math.floor(wallet(c.me) * 0.3);
    addMoney(c.me, -fine); addPop(g, -12); addHeat(g, 20);
    let fall = "";
    if (g.heat >= 80 && g.rank > 1) { g.rank--; if (g.rank < PRES) g.pays = null; fall = `\n⬇️ Destitué ! Tu redeviens ${poste(g).emoji} ${poste(g).nom}.`; }
    return finish(c, `🚨 ENQUÊTE ANTI-CORRUPTION !\n${L()}\nLa brigade financière débarque chez toi.\n💸 Amende : -${FM(fine)}\n📉 -12 📊, 🔥 +20${fall}`);
  }
  const gain = rand(CORRUPTION.gain[0], CORRUPTION.gain[1]) * (g.rank + 1);
  addMoney(c.me, gain); addHeat(g, rand(CORRUPTION.heat[0], CORRUPTION.heat[1]));
  return finish(c, `💸 Une enveloppe discrète… +${FM(gain)}\n🔥 Scandale : ${g.heat}/100\n⚠️ Plus le scandale monte, plus l'enquête est probable !`);
}

async function cmdRepos(c) {
  const g = c.me.g;
  if (waitCd(c, "repos", REPOS.cd, "Tu as déjà dormi")) return;
  g.cd.repos = Date.now();
  g.energy = Math.min(ENERGY_MAX, g.energy + REPOS.energy);
  return finish(c, `😴 Bonne nuit de sommeil : +${REPOS.energy} ⚡ (${Math.floor(g.energy)}/${ENERGY_MAX})`);
}

async function cmdObjectifs(c) {
  const g = c.me.g, q = ensureQuests(g);
  const lines = [`🎯 OBJECTIFS DU JOUR`, L("═")];
  for (const e of q.list) { const d = QUEST_POOL.find((x) => x.id === e.id); if (d) lines.push(`${e.done ? "✅" : "⬜"} ${d.text} (${e.got}/${d.need})`); }
  lines.push("", q.bonus ? "🎁 Coffre déjà ouvert aujourd'hui !" : "🎁 Termine tout pour ouvrir le coffre du jour.");
  await save(c.usersData, c.me);
  return reply(c, lines.join("\n"));
}

async function cmdBoutique(c) {
  const g = c.me.g;
  const lines = [`🛒 BOUTIQUE POLITIQUE`, L("═")];
  for (const [id, it] of Object.entries(ITEMS)) lines.push(`${it.emoji} ${it.nom} — ${FM(it.prix)}  (x${g.inv[id] || 0})\n   ${it.desc}\n   👉 ${CMD} acheter ${id}`);
  lines.push("", `💰 Ton argent : ${FM(wallet(c.me))}`);
  return reply(c, lines.join("\n"));
}

async function cmdAcheter(c) {
  const g = c.me.g, id = findItem(c.args[1]);
  if (!id) return cmdBoutique(c);
  const it = ITEMS[id];
  const qty = Math.max(1, Math.min(20, Math.floor(Number(c.args[2]) || 1)));
  if ((id === "conseiller" || id === "tele") && (g.inv[id] || 0) > 0) return reply(c, `✅ Tu as déjà ${it.emoji} ${it.nom}.`);
  const n = id === "conseiller" || id === "tele" ? 1 : qty;
  if (wallet(c.me) < it.prix * n) return reply(c, `💸 Il te faut ${FM(it.prix * n)}.`);
  addMoney(c.me, -it.prix * n);
  g.inv[id] = (g.inv[id] || 0) + n;
  return finish(c, `🛍️ Acheté : ${it.emoji} ${it.nom} x${n} (-${FM(it.prix * n)})`);
}

async function cmdUtiliser(c) {
  const g = c.me.g, id = findItem(c.args[1]);
  if (!id || !(g.inv[id] > 0)) return reply(c, `🎒 Tu n'as pas cet objet. Inventaire : ${Object.entries(g.inv).filter(([, n]) => n > 0).map(([k, n]) => `${ITEMS[k] ? ITEMS[k].emoji : ""}${k} x${n}`).join(", ") || "vide"}`);
  if (id === "cafe") { g.inv.cafe--; g.energy = Math.min(ENERGY_MAX, g.energy + 20); return finish(c, `☕ +20 ⚡ (${Math.floor(g.energy)}/${ENERGY_MAX})`); }
  if (id === "affiches") { g.inv.affiches--; g.camp = Math.min(CAMPAGNE.max, g.camp + 6); return finish(c, `🪧 Affiches collées dans toute la ville : 📢 ${g.camp}/${CAMPAGNE.max}`); }
  if (id === "avocat") { g.inv.avocat--; addHeat(g, -40); return finish(c, `⚖️ Ton avocat fait disparaître les dossiers. 🔥 ${g.heat}/100`); }
  return reply(c, `ℹ️ ${ITEMS[id].emoji} ${ITEMS[id].nom} agit automatiquement.`);
}

// ============================================================
//  🌍 PRÉSIDENCE
// ============================================================
function renderPays(g) {
  const p = g.pays, left = MANDAT - (Date.now() - p.since);
  const lines = [`🌍 ${p.nom ? `RÉPUBLIQUE DE ${p.nom.toUpperCase()}` : "TON PAYS"}`, L("═")];
  for (const [k, j] of Object.entries(JAUGES)) lines.push(`${j.emoji} ${j.nom.padEnd(10)} ${bar(p[k], 100, 12)} ${p[k]}`);
  lines.push(L(), `🏦 Trésor public : ${FM(p.treso)}`, `🧾 Impôts : ${IMPOTS[p.impots].nom}`, `📊 Ta popularité : ${g.pop}/100   🔥 ${g.heat}/100`,
    `⏱️ Mandat n°${g.term} : ${left > 0 ? dur(left) : "TERMINÉ"}`);
  if (p.stab < 25) lines.push("", "⚠️ L'armée gronde… risque de COUP D'ÉTAT !");
  if (p.crisis) lines.push("", `🚨 CRISE EN COURS : ${CRISES[p.crisis.i].t}\n👉 « ${CMD} crise 1 » ou « ${CMD} crise 2 »`);
  return lines.join("\n");
}

async function cmdPays(c) { if (needPres(c)) return; return reply(c, renderPays(c.me.g)); }

async function cmdNommer(c) {
  if (needPres(c)) return;
  const name = c.args.slice(1).join(" ").trim().slice(0, 25);
  if (!name) return reply(c, `✍️ « ${CMD} nommer <nom du pays> »`);
  c.me.g.pays.nom = name;
  return finish(c, `🇺🇳 Ton pays s'appelle désormais : ${name} !`);
}

async function cmdConseil(c) {
  if (needPres(c)) return;
  const g = c.me.g, p = g.pays;
  if (p.crisis) return reply(c, `🚨 Règle d'abord la crise : ${CRISES[p.crisis.i].t}\n1️⃣ ${CRISES[p.crisis.i].a.txt}\n2️⃣ ${CRISES[p.crisis.i].b.txt}`);
  if (waitCd(c, "conseil", CONSEIL_CD, "Prochain conseil des ministres")) return;
  g.cd.conseil = Date.now();
  const imp = IMPOTS[p.impots];
  const income = Math.floor((rand($(800), $(1400)) + p.eco * $(15)) * imp.income);
  p.treso += income;
  // Les jauges dérivent un peu vers le bas : il faut gouverner !
  for (const k of Object.keys(JAUGES)) jauge(p, k, -rand(0, 3));
  jauge(p, "stab", imp.stab);
  addPop(g, imp.pop + (paysAvg(p) >= 60 ? 1 : paysAvg(p) < 40 ? -2 : 0));
  const lines = [`🏛️ CONSEIL DES MINISTRES`, L("═"), `🧾 Recettes fiscales : +${FM(income)} → trésor ${FM(p.treso)}`];
  // Coup d'État
  if (p.stab < 20 && Math.random() < (20 - p.stab) / 25) {
    g.rank = 3; g.pays = null; g.stats.coups++; addPop(g, -15);
    lines.push("", "🪖💥 COUP D'ÉTAT ! L'armée prend le palais !", "Tu t'enfuis en exil… et redeviens 🎙️ Député.", "-15 📊");
    return finish(c, lines.join("\n"));
  }
  if (Math.random() < 0.6) {
    const i = rand(0, CRISES.length - 1);
    p.crisis = { i };
    const cr = CRISES[i];
    lines.push("", `🚨 ${cr.t}`, `1️⃣ ${cr.a.txt}`, `2️⃣ ${cr.b.txt}`, `👉 « ${CMD} crise 1 » ou « ${CMD} crise 2 »`);
  } else lines.push("", "😌 Calme plat dans le pays cette heure-ci.");
  bump(c.me, "conseil");
  return finish(c, lines.join("\n"));
}

async function cmdCrise(c) {
  if (needPres(c)) return;
  const g = c.me.g, p = g.pays;
  if (!p.crisis) return reply(c, `😌 Aucune crise en cours. « ${CMD} conseil » pour gouverner.`);
  const ch = strip(c.args[1]);
  const cr = CRISES[p.crisis.i];
  const opt = ch === "1" || ch === "a" ? cr.a : ch === "2" || ch === "b" ? cr.b : null;
  if (!opt) return reply(c, `🚨 ${cr.t}\n1️⃣ ${cr.a.txt}\n2️⃣ ${cr.b.txt}`);
  if (opt.treso && opt.treso < 0 && p.treso < -opt.treso) return reply(c, `🏦 Trésor insuffisant (${FM(p.treso)}, il faut ${FM(-opt.treso)}). Choisis l'autre option ou lève des impôts.`);
  const out = [`🧯 Décision : ${opt.txt}`, L()];
  if (opt.treso) { p.treso += opt.treso; out.push(`🏦 Trésor : ${opt.treso > 0 ? "+" : "-"}${FM(Math.abs(opt.treso))}`); }
  if (opt.money) { addMoney(c.me, opt.money); out.push(`💰 Ta poche : +${FM(opt.money)}`); }
  for (const [k, v] of Object.entries(opt.fx || {})) { jauge(p, k, v); out.push(`${JAUGES[k].emoji} ${JAUGES[k].nom} ${sign(v)}`); }
  if (opt.pop) out.push(`📊 Popularité ${sign(addPop(g, opt.pop))}`);
  if (opt.heat) { addHeat(g, opt.heat); out.push(`🔥 Scandale ${sign(opt.heat)}`); }
  p.crisis = null; g.stats.crises++;
  return finish(c, out.join("\n"));
}

async function cmdDecret(c) {
  if (needPres(c)) return;
  const g = c.me.g, p = g.pays, id = findDecret(c.args[1]);
  if (!id) {
    return reply(c, [`📜 DÉCRETS (payés par le trésor : ${FM(p.treso)})`, L("═"),
      ...Object.entries(DECRETS).map(([k, d]) => `${d.emoji} ${d.nom} — ${FM(d.cost)}\n   ${Object.entries(d.fx).map(([j, v]) => `${JAUGES[j].emoji}${sign(v)}`).join(" ")} 📊${sign(d.pop)}\n   👉 ${CMD} decret ${k}`)].join("\n"));
  }
  if (waitCd(c, "decret", DECRET_CD, "L'Assemblée examine ton dernier décret")) return;
  const d = DECRETS[id];
  if (p.treso < d.cost) return reply(c, `🏦 Trésor insuffisant : ${FM(p.treso)} / ${FM(d.cost)}.`);
  p.treso -= d.cost; g.cd.decret = Date.now(); g.stats.decrets++;
  const out = [`📜 DÉCRET SIGNÉ : ${d.emoji} ${d.nom}`, L(), `🏦 -${FM(d.cost)} (reste ${FM(p.treso)})`];
  for (const [k, v] of Object.entries(d.fx)) { jauge(p, k, v); out.push(`${JAUGES[k].emoji} ${JAUGES[k].nom} → ${p[k]}`); }
  out.push(`📊 Popularité ${sign(addPop(g, d.pop))}`);
  if (Math.random() < 0.1) { const bonus = rand(3, 6); jauge(p, "eco", bonus); out.push(`🌟 Effet surprise : les investisseurs applaudissent (📈 +${bonus})`); }
  bump(c.me, "decret");
  return finish(c, out.join("\n"));
}

async function cmdImpots(c) {
  if (needPres(c)) return;
  const p = c.me.g.pays, lvl = strip(c.args[1]);
  if (!IMPOTS[lvl]) return reply(c, `🧾 Impôts actuels : ${IMPOTS[p.impots].nom}\n• bas : moins de recettes, peuple content\n• moyen : équilibré\n• haut : trésor plein, peuple fâché\n👉 « ${CMD} impots <bas|moyen|haut> »`);
  p.impots = lvl;
  return finish(c, `🧾 Les impôts passent au niveau : ${IMPOTS[lvl].nom}.`);
}

async function cmdDetourner(c) {
  if (needPres(c)) return;
  const g = c.me.g, p = g.pays;
  if (waitCd(c, "detourner", DETOURNER.cd, "Les comptables te surveillent")) return;
  const max = Math.floor(p.treso * 0.25);
  const amount = Math.floor(Number(c.args[1]));
  if (!amount || amount <= 0) return reply(c, `🤫 « ${CMD} detourner <montant> » (max 25 % du trésor : ${FM(max)})`);
  if (amount > max) return reply(c, `🤫 Trop voyant ! Maximum : ${FM(max)}.`);
  g.cd.detourner = Date.now(); g.stats.corrupt++;
  p.treso -= amount; addMoney(c.me, amount);
  addHeat(g, rand(DETOURNER.heat[0], DETOURNER.heat[1]) + Math.floor(amount / Math.max(1, max) * 10));
  jauge(p, "stab", -3);
  let extra = "";
  if (Math.random() < g.heat / 200) { const l = rand(8, 15); addPop(g, -l); jauge(p, "stab", -8); extra = `\n📰 Fuite dans la presse ! -${l} 📊, ⚖️ -8`; }
  return finish(c, `🤫 ${FM(amount)} transférés sur un compte en Suisse…\n🔥 Scandale : ${g.heat}/100${extra}`);
}

async function cmdReelection(c) {
  if (needPres(c)) return;
  const g = c.me.g, p = g.pays;
  const left = MANDAT - (Date.now() - p.since);
  if (left > 0) return reply(c, `⏱️ Ton mandat se termine dans ${dur(left)}. Prépare ton bilan !`);
  const score = clamp(reelectionBase(g) + rand(-10, 10), 0, 100);
  const lines = [`🗳️ ÉLECTION PRÉSIDENTIELLE`, L("═"), `🌍 Bilan : ${paysAvg(p)}/100  |  📊 ${g.pop}`, `🗳️ Résultat : ${score} %`, ""];
  if (score >= WIN_SCORE) {
    g.term++; g.stats.reelu++; p.since = Date.now(); g.camp = 0;
    const prime = $(5000) * g.term;
    addMoney(c.me, prime); p.treso += $(5000);
    lines.push(`👑 RÉÉLU pour un mandat n°${g.term} !`, `💰 Prime d'investiture : +${FM(prime)}`, `🏦 Aide internationale : +${FM($(5000))}`);
  } else {
    g.rank = 4; g.pays = null; g.stats.losses++; addPop(g, -10);
    lines.push("😞 Le peuple a choisi l'alternance.", "Tu quittes le palais et redeviens 💼 Ministre (opposition)… À toi de reconquérir le pouvoir !");
  }
  return finish(c, lines.join("\n"));
}

async function cmdDemission(c) {
  if (needPres(c)) return;
  const g = c.me.g;
  if (strip(c.args[1]) !== "confirmer") return reply(c, `⚠️ Démissionner te fera redescendre Premier ministre.\n👉 « ${CMD} demission confirmer »`);
  g.rank = PRES - 1; g.pays = null; addHeat(g, -30);
  return finish(c, "🚪 Tu démissionnes avec dignité. Le peuple salue ton geste (🔥 -30).");
}

// ============================================================
//  🔀 ROUTES
// ============================================================
const ROUTES = {
  help: cmdHelp, aide: cmdHelp,
  stat: cmdStat, profil: cmdStat, fiche: cmdStat,
  carriere: cmdCarriere, postes: cmdCarriere,
  parti: cmdParti, top: cmdTop, classement: cmdTop, succes: cmdSucces,
  meeting: cmdMeeting, rassemblement: cmdMeeting,
  discours: cmdDiscours, porte: cmdPorte, porteaporte: cmdPorte,
  campagne: cmdCampagne, lobby: cmdLobby, sondage: cmdSondage,
  election: cmdElection, elections: cmdElection, voter: cmdElection,
  debat: cmdDebat, scandale: cmdScandale, alliance: cmdAlliance, soutien: cmdSoutien, don: cmdSoutien,
  salaire: cmdSalaire, presence: cmdPresence, permanence: cmdPresence,
  corruption: cmdCorruption, potdevin: cmdCorruption,
  repos: cmdRepos, dormir: cmdRepos,
  objectifs: cmdObjectifs, quetes: cmdObjectifs,
  boutique: cmdBoutique, shop: cmdBoutique, acheter: cmdAcheter, utiliser: cmdUtiliser,
  pays: cmdPays, nation: cmdPays, nommer: cmdNommer,
  conseil: cmdConseil, crise: cmdCrise, decret: cmdDecret, impots: cmdImpots,
  detourner: cmdDetourner, reelection: cmdReelection, demission: cmdDemission
};

module.exports = {
  config: {
    name: CMD,
    aliases: ["pres", "politique", "elu"],
    version: "1.0",
    author: "Camille Uchiha 🍓",
    countDown: 3,
    role: 0,
    description: { fr: "🏛️ Président : campagnes, élections, débats, scandales, et gouverne ton pays !" },
    category: "economy",
    guide: { fr: "Tapez 'president help' pour voir toutes les commandes." }
  },

  onStart: async function ({ message, event, args, api, usersData }) {
    const c = { message, event, args, api, usersData, uid: String(event.senderID), botID: String(api.getCurrentUserID()), names: new Map(), players: new Map() };
    c.me = await getP(c, c.uid);

    if (!c.me.g.welcomed) {
      c.me.g.welcomed = true;
      addMoney(c.me, STARTER_MONEY);
      await save(usersData, c.me);
      await message.reply(B(`🏛️ BIENVENUE EN POLITIQUE !\n${L("═")}\nTu débutes comme 📣 Militant avec ${FM(STARTER_MONEY)} de la part de ton oncle 🎁\n\n📣 Meetings, discours, porte-à-porte → 📊 popularité\n🤝 Lobbys et alliances → influence\n🗳️ Gagne les élections jusqu'au palais présidentiel\n🌍 Puis gouverne TON pays… sans finir renversé !\n\nTape « ${CMD} help » pour tout voir.`));
    }

    const sub = strip(args[0] || "stat");
    let handler = ROUTES[sub];
    if (!handler && Object.keys(event.mentions || {}).length) handler = cmdStat;
    if (!handler) return reply(c, `❓ Commande inconnue. Tapez '${CMD} help' pour voir la liste.`);

    try {
      return await handler(c);
    } catch (e) {
      console.error("[president]", e);
      return message.reply("❌ Une erreur est survenue. Réessaie dans un instant.");
    }
  }
};
