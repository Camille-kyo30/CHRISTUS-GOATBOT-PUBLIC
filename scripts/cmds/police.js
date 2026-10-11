// ============================================================
//  police.js — 👮🏽‍♂️ POLICE v2 : affaires, crimes et prison (contre le BOT)
//  (même base que royaume.js : UNE commande + des sous-commandes)
//
//  Plus de chasse entre joueurs : c'est le BOT qui génère les suspects et les cibles.
//
//  👮 POLICIER : le bot t'envoie des APPELS (suspects aléatoires). Interviens, mène des
//     enquêtes (5 indices = AFFAIRE MAJEURE), patrouille, monte en grade.
//  🥷 CRIMINEL : le bot te propose des CONTRATS (cibles aléatoires). Réussis des coups,
//     gagne de la réputation (Petit voyou → Parrain), évite la police du bot.
//  ⛓️ PRISON : travaux, évasion, caution (même un ami peut la payer).
//
//  Données : tout est rangé dans data.police de chaque joueur.
//  L'argent est le MÊME portefeuille que dans royaume et ecole (user.money).
//
//  Pour installer : mets ce fichier dans scripts/cmds/ (remplace l'ancien police.js).
// ============================================================

"use strict";

// Police "gras" du bot (comme royaume.js). Sans le fichier, on affiche du texte normal.
let fonts = null;
try { fonts = require("../../func/font.js"); } catch (e) { fonts = null; }
const B = (s) => { try { return fonts && typeof fonts.bold === "function" ? fonts.bold(s) : s; } catch (e) { return s; } };

const CMD = "police";

// 💰 ÉCHELLE DE L'ARGENT : tous les prix et gains du jeu sont multipliés par M.
// M = 100 → deux zéros de plus. Mets M = 1 pour revenir à l'ancienne économie.
const M = 100;
const $ = (n) => n * M;                 // un montant
const $r = (a, b) => [a * M, b * M];    // une fourchette [min, max]

const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// ─── ⚙️ RÉGLAGES (modifie ces valeurs pour équilibrer le jeu) ───
// Police
const JOIN_FEE = $(1500);              // frais de formation
const PATROL_CD = 10* MIN;           // délai entre deux patrouilles
const CASE_CD = 5 * MIN;              // délai entre deux interventions
const INVESTIGATE_CD = 15 * MIN;      // délai entre deux enquêtes
const CASES_COUNT = 3;                // appels disponibles en même temps
const CASE_TTL = 45 * MIN;            // un appel disparaît au bout de 45 min
const MAJOR_TTL = 2 * HOUR;           // une affaire majeure dure 2 h
const CLUES_NEEDED = 5;               // indices pour déclencher une affaire majeure
const WOUND_TIME = 10 * MIN;          // durée d'une blessure
const HEAL_COST = $(1200);             // soigner tout de suite
const DAILY_PAY = $r(1300, 1500);       // prime journalière du policier (× grade)
const DAILY_STREAK = $(4000);           // bonus par jour de série

// Criminel
const CONTRACTS_COUNT = 3;            // contrats disponibles en même temps
const CONTRACT_TTL = 45 * MIN;
const CRIME_CD = 8 * MIN;             // délai entre deux coups
const LAYLOW = { cd: HOUR, cost: $(150), cut: 2 };     // se planquer : -2 étoiles
const BRIBE = { cost: $(300), chance: 0.60 };          // pot-de-vin : prix par étoile
const WANTED_DECAY = 30 * MIN;        // la recherche baisse d'une étoile toutes les 30 min
const WANTED_MAX = 5;
const RAID_CHANCE = 0.20;             // descente de police si tu es très recherché (3 étoiles ou +)

// Prison
const BAIL_PER_MIN = $(20);           // caution : prix par minute restante
const ESCAPE_CD = 20 * MIN, ESCAPE_BASE = 0.20, ESCAPE_FAIL_MIN = 10, ESCAPE_FINE = $(100);
const WORK_CD = 5 * MIN, WORK_CUT = 3, WORK_PAY = $(1400);   // travaux en prison
const MAX_RECORD = 10;
const QUEST_COUNT = 3;                // objectifs par jour

// ─── Données du jeu ───────────────────────────────────────────

// Les grades. need = points requis (1 patrouille = 1 point, 1 arrestation = 3 points)
const GRADES = [
  { emoji: "🔰", nom: "Recrue", need: 0, salary: $r(60, 120) },
  { emoji: "🚓", nom: "Agent", need: 8, salary: $r(12000, 22000) },
  { emoji: "👮", nom: "Brigadier", need: 25, salary: $r(22000, 38000) },
  { emoji: "🎖️", nom: "Lieutenant", need: 60, salary: $r(38000, 60000) },
  { emoji: "⭐", nom: "Commissaire", need: 140, salary: $r(60000, 95000) },
  { emoji: "🏛️", nom: "Préfet", need: 300, salary: $r(100000, 150000) }
];

// Réputation criminelle (points de réputation)
const UNDERWORLD = [
  { need: 0, nom: "Petit voyou", emoji: "🧑‍🎤" },
  { need: 20, nom: "Voyou", emoji: "🥷" },
  { need: 60, nom: "Malfrat", emoji: "😎" },
  { need: 140, nom: "Gangster", emoji: "🕶️" },
  { need: 300, nom: "Parrain", emoji: "😈" }
];

// Les affaires du bot (policier) : d = danger de 1 à 5
const CASE_TYPES = [
  { d: 1, emoji: "👛", nom: "Vol à l'arraché" }, { d: 1, emoji: "🛵", nom: "Vol de moto" },
  { d: 2, emoji: "🏠", nom: "Cambriolage" }, { d: 2, emoji: "💳", nom: "Fraude bancaire" },
  { d: 3, emoji: "💵", nom: "Trafic de faux billets" }, { d: 3, emoji: "💎", nom: "Braquage de bijouterie" },
  { d: 4, emoji: "📦", nom: "Trafic de drogue" }, { d: 4, emoji: "🚨", nom: "Enlèvement" },
  { d: 5, emoji: "🔫", nom: "Gang armé" }, { d: 5, emoji: "💣", nom: "Prise d'otages" }
];
const FIRST = ["Kouassi", "Yao", "Konan", "Koffi", "Séry", "Adama", "Moussa", "Ibrahim", "Serge", "Franck", "Désiré", "Aboubacar", "Jean-Marc", "Bakary"];
const NICK = ["Le Boucher", "La Vipère", "Gros Bras", "L'Ombre", "Zéro Pitié", "Le Fantôme", "Tonton Dollar", "La Panthère", "Le Renard", "Dos Rond", "Cobra", "Le Chacal"];
const LAST = ["Koné", "Traoré", "Diabaté", "Ouattara", "Bamba", "N'Guessan", "Soro", "Coulibaly", "Fofana", "Kouadio", "Touré", "Yapi"];
const suspectName = () => `${pick(FIRST)} « ${pick(NICK)} » ${pick(LAST)}`;

// Les cibles du bot (criminel) : d = difficulté de 1 à 5
const TARGETS = [
  { d: 1, emoji: "🛒", nom: "Étal de marché" }, { d: 1, emoji: "🏪", nom: "Boutique de quartier" },
  { d: 2, emoji: "🏠", nom: "Villa d'un commerçant" }, { d: 2, emoji: "☕", nom: "Cybercafé" },
  { d: 3, emoji: "💎", nom: "Bijouterie du Plateau" }, { d: 3, emoji: "🚚", nom: "Camion de cacao" },
  { d: 4, emoji: "⚓", nom: "Entrepôt du port d'Abidjan" }, { d: 4, emoji: "🚐", nom: "Convoi de fonds" },
  { d: 5, emoji: "🏦", nom: "Banque de Cocody" }, { d: 5, emoji: "🎰", nom: "Casino de luxe" }
];
const CRIME_VERBS = ["Dévaliser", "Piller", "Cambrioler", "Braquer", "Arnaquer", "Dépouiller"];

// Prime du policier / butin du criminel / prison selon le niveau de difficulté (index = d)
const PRIME_BY_D = [null, $r(8000, 15000), $r(15000, 30000), $r(30000, 60000), $r(60000, 110000), $r(120000, 220000)];
const LOOT_BY_D = [null, $r(6000, 18000), $r(20000, 50000), $r(50000, 110000), $r(110000, 240000), $r(250000, 500000)];
const JAIL_BY_D = [0, 5, 10, 18, 30, 45];          // minutes de prison si tu es arrêté
const FINE_BY_D = [0, $(800), $(1500), $(3000), $(6000), $(12000)];
const CRIME_BASE = [0, 0.78, 0.66, 0.55, 0.44, 0.33];   // chances de réussite d'un coup

// Matériel
const ITEMS = {
  menottes: { emoji: "🔗", nom: "Menottes", prix: $(300), desc: "Policier : +10 % d'arrestation (1 usage)", alias: ["menottes", "menotte"] },
  taser: { emoji: "⚡", nom: "Taser", prix: $(500), desc: "Policier : +15 % contre les suspects dangereux (3+) (1 usage)", alias: ["taser"] },
  gilet: { emoji: "🦺", nom: "Gilet pare-balles", prix: $(700), desc: "Policier : bloque 1 blessure (1 usage)", alias: ["gilet", "pare-balles"] },
  radio: { emoji: "📻", nom: "Radio", prix: $(250), desc: "Policier : +20 % de chances de trouver un indice (1 usage)", alias: ["radio"] },
  gants: { emoji: "🧤", nom: "Gants", prix: $(250), desc: "Criminel : +8 % de réussite au prochain coup (1 usage)", alias: ["gants", "gant"] },
  crochet: { emoji: "🗝️", nom: "Crochet", prix: $(400), desc: "Criminel : +10 % de réussite au prochain coup (1 usage)", alias: ["crochet", "crochets"] },
  cagoule: { emoji: "🎭", nom: "Cagoule", prix: $(350), desc: "Criminel : 1 étoile de recherche en moins sur ton prochain coup (1 usage)", alias: ["cagoule", "masque"] },
  papiers: { emoji: "🪪", nom: "Faux papiers", prix: $(700), desc: "Efface ta recherche : « police utiliser papiers » (1 usage)", alias: ["papiers", "faux-papiers", "fauxpapiers"] },
  lime: { emoji: "🪚", nom: "Lime", prix: $(400), desc: "+25 % de chances de t'évader (1 usage)", alias: ["lime", "scie"] }
};

// Objectifs du jour
const QUEST_COP = [
  { id: "patrol", text: "Faire une patrouille", key: "patrol", need: 1, reward: $r(800, 1400) },
  { id: "case", text: "Intervenir sur 2 appels", key: "case", need: 2, reward: $r(12000, 2000) },
  { id: "invest", text: "Mener une enquête", key: "invest", need: 1, reward: $r(800, 1400) },
  { id: "prime", text: "Toucher ta prime du jour", key: "prime", need: 1, reward: $r(600, 1000) }
];
const QUEST_CRIM = [
  { id: "crime", text: "Réussir un coup", key: "crimeok", need: 1, reward: $r(1000, 1800) },
  { id: "crime2", text: "Tenter 2 coups", key: "crime", need: 2, reward: $r(1200, 2000) },
  { id: "contrats", text: "Consulter tes contrats", key: "contracts", need: 1, reward: $r(4000, 8000) },
  { id: "laylow", text: "Te planquer ou corrompre un flic", key: "laylow", need: 1, reward: $r(8000, 14000) }
];

const TIPS = [
  "Policier : les appels disparaissent au bout de 45 min, interviens vite !",
  "5 indices d'enquête déclenchent une AFFAIRE MAJEURE très bien payée.",
  "Un gilet pare-balles évite la blessure quand un suspect résiste.",
  "Criminel : les gros coups rapportent beaucoup mais augmentent ta recherche.",
  "Ta recherche baisse toute seule : 1 étoile toutes les 30 minutes.",
  "Se planquer ou corrompre un flic réduit ta recherche.",
  "Un ami peut payer ta caution : police caution @toi.",
  "Les gants et le crochet augmentent tes chances de réussir un coup."
];

// Succès : test(p) reçoit le joueur chargé
const ACH = {
  PREMIERE_ARRESTATION: { emoji: "🚔", nom: "Première arrestation", desc: "Arrêter un suspect", test: (p) => p.g.arrests >= 1 },
  ARRESTATIONS_10: { emoji: "🏅", nom: "Flic modèle", desc: "10 arrestations", test: (p) => p.g.arrests >= 10 },
  AFFAIRE_MAJEURE: { emoji: "🕵️", nom: "Grand enquêteur", desc: "Résoudre une affaire majeure", test: (p) => p.g.majors >= 1 },
  COMMISSAIRE: { emoji: "⭐", nom: "Commissaire", desc: "Devenir commissaire", test: (p) => isCop(p.g) && p.g.grade >= 4 },
  PREMIER_COUP: { emoji: "🥷", nom: "Premier coup", desc: "Réussir un crime", test: (p) => p.g.crimes.ok >= 1 },
  GANGSTER: { emoji: "🕶️", nom: "Gangster", desc: "Atteindre le rang Gangster", test: (p) => p.g.rep >= 140 },
  PARRAIN: { emoji: "😈", nom: "Parrain", desc: "Atteindre le rang Parrain", test: (p) => p.g.rep >= 300 },
  GROS_COUP: { emoji: "🏦", nom: "Gros coup", desc: "Réussir un coup de difficulté 5", test: (p) => p.g.bigHeist >= 1 },
  EVADE: { emoji: "🏃", nom: "Évadé", desc: "S'évader de prison", test: (p) => p.g.escapes >= 1 },
  ORGANISE: { emoji: "🎯", nom: "Organisé", desc: "Terminer 15 objectifs du jour", test: (p) => p.g.stats.quests >= 15 }
};
const ACH_REWARD = { PREMIERE_ARRESTATION: $(200), ARRESTATIONS_10: $(1500), AFFAIRE_MAJEURE: $(2000), COMMISSAIRE: $(4000), PREMIER_COUP: $(200), GANGSTER: $(3000), PARRAIN: $(8000), GROS_COUP: $(2500), EVADE: $(1000), ORGANISE: $(1000) };

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (n) => String(Math.floor(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const FM = (n) => `${fmt(n)} $`;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const L = (ch = "─", n = 40) => ch.repeat(n);
const day = (ts) => new Date(ts || Date.now()).toLocaleDateString("fr-FR");
const num = (s) => (/^\d{1,12}$/.test(s || "") ? parseInt(s) : NaN);
const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const bar = (v, max, w = 20) => { const f = Math.floor(clamp(v / (max || 1), 0, 1) * w); return "█".repeat(f) + "░".repeat(w - f); };
function dur(ms) {
  const h = Math.floor(ms / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}
const stars = (n) => (n > 0 ? "⭐".repeat(n) + "☆".repeat(Math.max(0, WANTED_MAX - n)) : "aucune");
const dangerTxt = (d) => "🔥".repeat(d) + "▫️".repeat(5 - d);
const range = (r) => `${FM(r[0])} à ${FM(r[1])}`;

// ─── Joueur : chargement / sauvegarde ─────────────────────────
function initPolice() {
  return {
    role: "citoyen",           // "citoyen" ou "police"
    grade: 0,                  // index dans GRADES (policiers)
    patrols: 0, arrests: 0, majors: 0, primes: 0, injuries: 0, clues: 0,
    cases: [],                 // appels du bot : [{ name, crime, emoji, d, reward, exp, major }]
    wounded: 0,                // timestamp de fin de blessure
    crimes: { ok: 0, fail: 0, fled: 0 }, stolen: 0, escapes: 0, bigHeist: 0,
    rep: 0,                    // réputation criminelle
    contracts: [],             // contrats du bot : [{ cible, emoji, d, loot, exp }]
    wanted: 0, wantedAt: 0,    // étoiles de recherche
    jail: null,                // { until, reason }
    jailTotal: 0,              // minutes de prison cumulées
    streak: 0,                 // série de primes journalières
    quest: null,               // { d, list: [{ id, got, done }], bonus }
    stats: { quests: 0 },
    achievements: [],
    inv: {}, cd: {},
    record: []                 // casier : [{ date, text }]
  };
}

function normalize(raw) {
  const d = initPolice();
  const g = Object.assign(initPolice(), raw || {});
  g.crimes = Object.assign(d.crimes, (raw && raw.crimes) || {});
  g.stats = Object.assign(d.stats, (raw && raw.stats) || {});
  g.cd = Object.assign({}, (raw && raw.cd) || {});
  g.inv = Object.assign({}, (raw && raw.inv) || {});
  for (const k of ["record", "cases", "contracts", "achievements"]) if (!Array.isArray(g[k])) g[k] = [];
  if (g.quest && !Array.isArray(g.quest.list)) g.quest = null;
  if (g.role !== "police") g.role = "citoyen";
  g.grade = clamp(Math.floor(Number(g.grade) || 0), 0, GRADES.length - 1);
  g.wanted = clamp(Math.floor(Number(g.wanted) || 0), 0, WANTED_MAX);
  g.rep = Math.max(0, Number(g.rep) || 0);
  g.clues = clamp(Math.floor(Number(g.clues) || 0), 0, CLUES_NEEDED);
  return g;
}

const wallet = (p) => Number(p.user.money) || 0;
function addMoney(p, n) { p.user.money = Math.max(0, wallet(p) + n); }
const points = (g) => g.patrols + 3 * g.arrests;
const cdLeft = (g, key, ms) => { const d = ms - (Date.now() - (g.cd[key] || 0)); return d > 0 ? dur(d) : null; };
const jailMs = (g) => (g.jail ? Math.max(0, g.jail.until - Date.now()) : 0);
const woundMs = (g) => Math.max(0, (g.wounded || 0) - Date.now());
const isCop = (g) => g.role === "police";
const repIdx = (g) => { let r = 0; UNDERWORLD.forEach((u, i) => { if (g.rep >= u.need) r = i; }); return r; };
function note(g, text) { g.record.push({ date: Date.now(), text }); if (g.record.length > 30) g.record = g.record.slice(-30); }

// Applique le temps qui passe : la recherche baisse, la peine se termine
function tick(p) {
  const g = p.g, now = Date.now();
  if (g.wanted > 0 && g.wantedAt) {
    const dec = Math.floor((now - g.wantedAt) / WANTED_DECAY);
    if (dec > 0) { g.wanted = Math.max(0, g.wanted - dec); g.wantedAt = g.wanted > 0 ? g.wantedAt + dec * WANTED_DECAY : 0; }
  } else if (g.wanted <= 0) g.wantedAt = 0;
  if (g.jail && g.jail.until <= now) { g.jail = null; p.notes.push("🔓 Tu as purgé ta peine : te voilà libre !"); }
}

async function load(usersData, uid) {
  let user = await usersData.get(uid);
  if (!user) user = { money: 0, exp: 0, data: {} };
  if (!user.data) user.data = {};
  user.data.police = normalize(user.data.police);
  const p = { uid: String(uid), user, g: user.data.police, notes: [] };
  tick(p);
  return p;
}
async function save(usersData, p) {
  await usersData.set(p.uid, { money: wallet(p), data: p.user.data });
}

async function getP(c, uid) {
  uid = String(uid);
  if (!c.players.has(uid)) c.players.set(uid, await load(c.usersData, uid));
  return c.players.get(uid);
}

async function nm(c, id) {
  id = String(id);
  if (!c.names.has(id)) {
    let n = null;
    try { n = await c.usersData.getName(id); } catch (e) { /* nom par défaut */ }
    c.names.set(id, n || `Utilisateur ${id.slice(-4)}`);
  }
  return c.names.get(id);
}

function targetOf(event) {
  let id = Object.keys(event.mentions || {})[0];
  if (!id && event.messageReply) id = event.messageReply.senderID;
  return id ? String(id) : null;
}

// ─── Génération du BOT : appels (policier) et contrats (criminel) ───
function maxDanger(g) { return isCop(g) ? Math.min(5, 2 + Math.floor(g.grade / 1.5)) : Math.min(5, 2 + repIdx(g)); }

function genCase(g) {
  const d = rand(1, maxDanger(g));
  const t = pick(CASE_TYPES.filter((x) => x.d === d || x.d === d - 1 || (d === 1 && x.d === 1)));
  const dd = clamp(t.d === d ? d : d, 1, 5);
  const mult = 1 + 0.25 * g.grade;
  return { name: suspectName(), crime: t.nom, emoji: t.emoji, d: dd, reward: Math.floor(rand(PRIME_BY_D[dd][0], PRIME_BY_D[dd][1]) * mult), exp: Date.now() + CASE_TTL, major: false };
}
// Garde les appels valides et complète jusqu'à CASES_COUNT
function ensureCases(g) {
  const now = Date.now();
  g.cases = g.cases.filter((x) => x.exp > now);
  while (g.cases.filter((x) => !x.major).length < CASES_COUNT) g.cases.push(genCase(g));
  g.cases.sort((a, b) => (b.major ? 1 : 0) - (a.major ? 1 : 0) || a.d - b.d);
  return g.cases;
}

function genContract(g) {
  const d = rand(1, maxDanger(g));
  const t = pick(TARGETS.filter((x) => x.d === d));
  return { cible: t.nom, emoji: t.emoji, verb: pick(CRIME_VERBS), d, loot: rand(LOOT_BY_D[d][0], LOOT_BY_D[d][1]), exp: Date.now() + CONTRACT_TTL };
}
function ensureContracts(g) {
  const now = Date.now();
  g.contracts = g.contracts.filter((x) => x.exp > now);
  while (g.contracts.length < CONTRACTS_COUNT) g.contracts.push(genContract(g));
  g.contracts.sort((a, b) => a.d - b.d);
  return g.contracts;
}

// ─── Objectifs du jour ────────────────────────────────────────
const todayNum = () => Math.floor(Date.now() / DAY);
function ensureQuests(g) {
  if (g.quest && g.quest.d === todayNum()) return g.quest;
  const pool = (isCop(g) ? QUEST_COP : QUEST_CRIM).slice();
  const chosen = [];
  while (chosen.length < QUEST_COUNT && pool.length) chosen.push(pool.splice(rand(0, pool.length - 1), 1)[0]);
  g.quest = { d: todayNum(), list: chosen.map((q) => ({ id: q.id, got: 0, done: false })), bonus: false };
  return g.quest;
}
const questDef = (id) => [...QUEST_COP, ...QUEST_CRIM].find((q) => q.id === id);
function bump(p, key, n = 1) {
  const g = p.g, quest = ensureQuests(g), mult = 1 + 0.25 * (isCop(g) ? g.grade : repIdx(g));
  for (const e of quest.list) {
    const q = questDef(e.id);
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
    p.notes.push(`🎁 Tous les objectifs du jour sont terminés ! Coffre : +${FM(gold)}`);
  }
}

// Succès : les nouveaux succès rapportent une récompense
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

// Promotion automatique selon les points
function checkPromo(p) {
  const g = p.g;
  if (!isCop(g)) return;
  let best = g.grade;
  GRADES.forEach((gr, i) => { if (points(g) >= gr.need && i > best) best = i; });
  if (best <= g.grade) return;
  g.grade = best;
  const bonus = $(200) * best;
  addMoney(p, bonus);
  p.notes.push(`🎖️ PROMOTION : tu deviens ${GRADES[best].emoji} ${GRADES[best].nom} ! Bonus : +${FM(bonus)}`);
}

// ─── Réponses ─────────────────────────────────────────────────
const reply = (c, text) => c.message.reply(B(text));

// finish : promotions, succès, sauvegarde, puis envoi du message.
async function finish(c, text, { mentions, others = [] } = {}) {
  const players = [c.me];
  for (const o of others) if (!players.includes(o)) players.push(o);
  let out = text;
  for (const p of players) {
    checkPromo(p);
    const ach = checkAch(p);
    if (ach.length) p.notes.push(`🏆 Succès : ${ach.join(", ")}`);
    if (!p.notes.length) continue;
    const who = p === c.me ? "" : `${await nm(c, p.uid)} → `;
    out += `\n\n${p.notes.map((n) => who + n).join("\n")}`;
    p.notes = [];
  }
  for (const p of players) await save(c.usersData, p);
  return mentions ? c.message.reply({ body: out, mentions }) : c.message.reply(B(out));
}

// ─── Prison et recherche ──────────────────────────────────────
function addWanted(g, n) {
  g.wanted = clamp(g.wanted + n, 0, WANTED_MAX);
  g.wantedAt = Date.now();
}
function sendToJail(p, minutes, reason) {
  const g = p.g;
  g.jail = { until: Date.now() + minutes * MIN, reason };
  g.jailTotal += minutes;
  g.wanted = 0; g.wantedAt = 0;
  note(g, `⛓️ ${reason} (${minutes} min)`);
}
function blockedByJail(c) {
  const left = jailMs(c.me.g);
  if (!left) return false;
  reply(c, `⛓️ Tu es en prison encore ${dur(left)} !\n👉 Options : police travaux • police evasion • police caution`);
  return true;
}

// ============================================================
//  👤 PROFIL
// ============================================================

function renderHelp() {
  return `
👮🏽‍♂️  P O L I C E  v2
${L("═", 44)}
Le BOT génère les suspects et les cibles !

👤  PROFIL
  police stat [@user]    - Ta fiche
  police casier [@user]  - Casier judiciaire
  police succes          - Succès
  police objectifs       - 3 objectifs du jour (+ coffre)
  police top [criminel|policier|reputation]

👮  POLICIER
  police join            - S'engager (${FM(JOIN_FEE)})
  police appels          - Les appels du bot (suspects)
  police intervenir <n>  - Arrêter le suspect n°
  police enquete         - Chercher des indices (5 = affaire majeure)
  police patrouille      - Salaire + incidents
  police prime           - Prime journalière (série)
  police soigner         - Se faire soigner (blessure)
  police quit            - Démissionner

🥷  CRIMINEL
  police contrats        - Les cibles proposées par le bot
  police crime <n>       - Réaliser le contrat n°
  police planque         - Se cacher (-2 étoiles)
  police corrompre       - Graisser la patte d'un flic
  police evasion         - T'évader de prison
  police travaux         - Réduire ta peine
  police caution [@user] - Payer une caution

🛒  MATÉRIEL
  police shop            - Boutique
  police shop buy <objet> [qté]
  police inv / utiliser papiers

${L("═", 44)}
💡  L'argent est le même que dans « royaume » et « ecole » !
`.trim();
}
const cmdHelp = (c) => reply(c, renderHelp());

async function cmdStat(c) {
  const tid = targetOf(c.event) || c.uid, isSelf = tid === c.uid;
  const p = isSelf ? c.me : await getP(c, tid), g = p.g;
  const name = await nm(c, tid);

  let status;
  if (isCop(g)) status = `${GRADES[g.grade].emoji} ${GRADES[g.grade].nom}`;
  else status = `${UNDERWORLD[repIdx(g)].emoji} ${UNDERWORLD[repIdx(g)].nom}`;

  let txt = `👮🏽‍♂️  P O L I C E\n${L("═", 44)}\n👤 ${name}\n▸ Statut : ${status}\n💵 Portefeuille : ${FM(wallet(p))}\n${L("─", 44)}\n`;
  if (g.wanted) txt += `🚨 Recherche : ${stars(g.wanted)}\n`;
  if (g.jail) txt += `⛓️ EN PRISON : encore ${dur(jailMs(g))} — ${g.jail.reason}\n`;
  if (woundMs(g)) txt += `🩹 Blessé : encore ${dur(woundMs(g))}\n`;

  if (isCop(g)) {
    const next = GRADES[g.grade + 1];
    txt += `🎖️ Points : ${points(g)}${next ? `  ${bar(points(g) - GRADES[g.grade].need, next.need - GRADES[g.grade].need, 14)}  → ${next.emoji} ${next.nom} (${next.need})` : "  (grade maximum !)"}\n`;
    txt += `🚓 Patrouilles : ${g.patrols}  •  🚔 Arrestations : ${g.arrests}  •  🕵️ Affaires majeures : ${g.majors}\n`;
    txt += `🔎 Indices : ${g.clues}/${CLUES_NEEDED}  ${bar(g.clues, CLUES_NEEDED, 10)}  •  💰 Primes : ${FM(g.primes)}  •  🩹 Blessures : ${g.injuries}\n`;
  } else {
    const nu = UNDERWORLD[repIdx(g) + 1];
    txt += `😎 Réputation : ${g.rep}${nu ? `  ${bar(g.rep - UNDERWORLD[repIdx(g)].need, nu.need - UNDERWORLD[repIdx(g)].need, 14)}  → ${nu.emoji} ${nu.nom} (${nu.need})` : "  (rang maximum !)"}\n`;
    txt += `🥷 Coups : ${g.crimes.ok} réussis / ${g.crimes.fail} ratés / ${g.crimes.fled} fuites  •  💰 Butin total : ${FM(g.stolen)}\n`;
  }
  txt += `⛓️ Prison cumulée : ${g.jailTotal} min  •  🏃 Évasions : ${g.escapes}\n`;

  if (isSelf) {
    const todo = [];
    if (jailMs(g)) todo.push("⛓️ travaux / évasion / caution");
    else if (isCop(g)) {
      if (!woundMs(g)) {
        if (!cdLeft(g, "patrol", PATROL_CD)) todo.push("🚓 patrouille");
        if (ensureCases(g).length && !cdLeft(g, "case", CASE_CD)) todo.push(`🚨 ${g.cases.length} appel(s)`);
        if (!cdLeft(g, "invest", INVESTIGATE_CD)) todo.push("🔎 enquête");
      } else todo.push("🩹 soigner");
      if (!cdLeft(g, "prime", DAY)) todo.push("💰 prime");
    } else {
      if (!cdLeft(g, "crime", CRIME_CD)) todo.push(`🥷 ${ensureContracts(g).length} contrat(s)`);
    }
    const open = ensureQuests(g).list.filter((e) => !e.done).length;
    if (open) todo.push(`🎯 ${open} objectif(s)`);
    txt += `${L("─", 44)}\n🎯 DISPONIBLE : ${todo.length ? todo.join(" • ") : "rien pour l'instant"}\n`;
  }
  const inv = Object.keys(g.inv).filter((k) => ITEMS[k] && g.inv[k] > 0);
  if (inv.length) txt += `🎒 ${inv.map((k) => `${ITEMS[k].emoji}x${g.inv[k]}`).join(" ")}\n`;
  if (isSelf) txt += `\n💡 ${pick(TIPS)}`;
  if (isSelf && c.me.notes.length) { txt += `\n\n${c.me.notes.join("\n")}`; c.me.notes = []; }
  if (isSelf) await save(c.usersData, c.me);
  return reply(c, txt.trim());
}

async function cmdRecord(c) {
  const tid = targetOf(c.event) || c.uid;
  const p = tid === c.uid ? c.me : await getP(c, tid), g = p.g;
  const name = await nm(c, tid);
  const rows = g.record.slice(-MAX_RECORD).reverse();
  if (!rows.length) return reply(c, `📂 Le casier de ${name} est vierge. Un citoyen modèle !`);
  let txt = `📂 CASIER DE ${name.toUpperCase()}\n${L("═", 40)}\n`;
  for (const r of rows) txt += `• ${r.text}\n   ${day(r.date)}\n`;
  return reply(c, txt.trim());
}

async function cmdAch(c) {
  const g = c.me.g, ids = Object.keys(ACH);
  let txt = `🏆 SUCCÈS\n${L("═", 40)}\nProgression : ${g.achievements.length}/${ids.length}\n\n`;
  const got = g.achievements.filter((a) => ACH[a]);
  txt += got.length ? "🎖️ DÉBLOQUÉS :\n" + got.map((a) => `• ${ACH[a].emoji} ${ACH[a].nom}`).join("\n") + "\n\n" : "🎯 Aucun succès pour le moment.\n\n";
  const left = ids.filter((a) => !g.achievements.includes(a));
  if (left.length) txt += "🎯 PROCHAINS OBJECTIFS :\n" + left.slice(0, 6).map((a) => `• ${ACH[a].emoji} ${ACH[a].nom} : ${ACH[a].desc} (+${FM(ACH_REWARD[a])})`).join("\n");
  return reply(c, txt.trim());
}

async function cmdQuests(c) {
  const g = c.me.g, quest = ensureQuests(g);
  const doneN = quest.list.filter((e) => e.done).length;
  let txt = `🎯 OBJECTIFS DU JOUR\n${L("═", 40)}\n`;
  for (const e of quest.list) {
    const q = questDef(e.id);
    if (q) txt += `${e.done ? "✅" : "🔸"} ${q.text}  [${e.got}/${q.need}]\n`;
  }
  txt += `\n🎁 Coffre bonus : ${quest.bonus ? "déjà récupéré !" : `termine les ${quest.list.length} objectifs (${doneN}/${quest.list.length})`}`;
  txt += `\n🔄 Nouveaux objectifs dans ${dur((todayNum() + 1) * DAY - Date.now())}`;
  await save(c.usersData, c.me);
  return reply(c, txt);
}

async function cmdTop(c) {
  const keys = { criminel: "crime", criminels: "crime", crime: "crime", voleur: "crime", policier: "cop", policiers: "cop", police: "cop", flic: "cop", reputation: "rep", rep: "rep", gangster: "rep" };
  const key = keys[strip(c.args[1] || "policier")] || "cop";
  const all = await c.usersData.getAll();
  const rows = all.map((u) => {
    const g = normalize(u.data && u.data.police);
    const row = { id: String(u.userID), name: u.name || `Utilisateur ${String(u.userID).slice(-4)}` };
    if (key === "crime") { row.val = g.stolen; row.line = `${FM(g.stolen)} volés • ${g.crimes.ok} coups réussis`; }
    else if (key === "rep") { row.val = g.rep; row.line = `${UNDERWORLD[repIdx(g)].emoji} ${UNDERWORLD[repIdx(g)].nom} • ${g.rep} pts`; }
    else { row.val = isCop(g) ? points(g) + 1 : 0; row.line = `${GRADES[g.grade].emoji} ${GRADES[g.grade].nom} • ${g.arrests} arrestation(s) • ${g.majors} affaire(s) majeure(s)`; }
    return row;
  }).filter((r) => r.val > 0).sort((a, b) => b.val - a.val);

  const titles = { crime: "🥷 LES PLUS GRANDS VOLEURS", cop: "👮 LES MEILLEURS POLICIERS", rep: "😈 LES PLUS RESPECTÉS DU MILIEU" };
  let txt = `${titles[key]}\n${L("═", 44)}\n`;
  if (!rows.length) return reply(c, txt + "📊 Personne n'est encore classé ici.");
  const medals = ["🥇", "🥈", "🥉"];
  rows.slice(0, 10).forEach((r, i) => { txt += `${medals[i] || `#${i + 1}`} ${r.name}\n   ${r.line}\n`; });
  const mine = rows.findIndex((r) => r.id === c.uid);
  if (mine >= 10) txt += `\n📍 Ta position : #${mine + 1} — ${rows[mine].line}`;
  return reply(c, txt);
}

// ============================================================
//  👮 POLICIER : appels, interventions, enquêtes
// ============================================================

function copOnly(c) {
  if (isCop(c.me.g)) return false;
  reply(c, `🧑 Réservé aux policiers. Engage-toi : police join (${FM(JOIN_FEE)})`);
  return true;
}
function woundedBlock(c) {
  const w = woundMs(c.me.g);
  if (!w) return false;
  reply(c, `🩹 Tu es blessé encore ${dur(w)}.\n👉 Soigne-toi tout de suite : police soigner (${FM(HEAL_COST)})`);
  return true;
}

async function cmdJoin(c) {
  const me = c.me, g = me.g;
  if (isCop(g)) return reply(c, `👮 Tu es déjà ${GRADES[g.grade].nom}.`);
  if (blockedByJail(c)) return;
  if (g.wanted > 0) return reply(c, "🚨 La police ne recrute pas les personnes recherchées ! Attends que ta recherche baisse.");
  if (wallet(me) < JOIN_FEE) return reply(c, `💸 La formation coûte ${FM(JOIN_FEE)} (tu as ${FM(wallet(me))}).`);
  addMoney(me, -JOIN_FEE);
  g.role = "police"; g.grade = 0; g.cases = []; g.quest = null;
  note(g, "👮 Entrée dans la police");
  return finish(c, `👮🏽‍♂️ BIENVENUE DANS LA POLICE !\n${L("─", 40)}\nTu es maintenant ${GRADES[0].emoji} ${GRADES[0].nom} (formation payée : ${FM(JOIN_FEE)}).\n\n🚨 Les appels du bot : police appels\n🔎 Enquêter : police enquete\n🚓 Patrouiller : police patrouille`);
}

async function cmdQuit(c) {
  const g = c.me.g;
  if (!isCop(g)) return reply(c, "🧑 Tu n'es pas policier.");
  g.role = "citoyen"; g.grade = 0; g.cases = []; g.quest = null;
  note(g, "👋 Démission de la police");
  return finish(c, "👋 Tu as rendu ton badge. Tu es de nouveau un simple citoyen.");
}

// Les appels envoyés par le bot
async function cmdCalls(c) {
  const me = c.me, g = me.g;
  if (copOnly(c)) return;
  const list = ensureCases(g);
  let txt = `🚨 APPELS RADIO\n${L("═", 40)}\n`;
  list.forEach((x, i) => {
    txt += `${i + 1}. ${x.major ? "🕵️ AFFAIRE MAJEURE — " : ""}${x.emoji} ${x.crime}\n   👤 ${x.name}\n   ${dangerTxt(x.d)} • 💰 Prime ${FM(x.reward)} • ⏳ ${dur(x.exp - Date.now())}\n`;
  });
  const left = cdLeft(g, "case", CASE_CD);
  txt += `\n${woundMs(g) ? "🩹 Tu es blessé : police soigner\n" : ""}${left ? `⏳ Prochaine intervention dans ${left}\n` : ""}👉 Intervenir : police intervenir <n°>\nExemple : police intervenir 1`;
  await save(c.usersData, me);
  return reply(c, txt);
}

// Intervention : arrêter un suspect généré par le bot
async function cmdIntervene(c) {
  const me = c.me, g = me.g;
  if (copOnly(c)) return;
  if (woundedBlock(c)) return;
  const list = ensureCases(g);
  const n = num(c.args[1]);
  if (isNaN(n) || n < 1 || n > list.length) return reply(c, "⚠️ Choisis un appel : police intervenir <n°>\nVoir la liste : police appels");
  const left = cdLeft(g, "case", CASE_CD);
  if (left) return reply(c, `⏳ Ton équipe se prépare. Reviens dans ${left}.`);

  const cs = list[n - 1];
  g.cases.splice(g.cases.indexOf(cs), 1);
  g.cd.case = Date.now();
  bump(me, "case");

  // Chances d'arrestation : danger du suspect, grade, matériel
  let chance = 0.80 - 0.11 * cs.d + 0.05 * g.grade - (cs.major ? 0.05 : 0), gear = "";
  if (g.inv.menottes > 0) { g.inv.menottes--; chance += 0.10; gear += " 🔗"; }
  if (cs.d >= 3 && g.inv.taser > 0) { g.inv.taser--; chance += 0.15; gear += " ⚡"; }
  chance = clamp(chance, 0.12, 0.92);

  const head = `🚔 INTERVENTION : ${cs.emoji} ${cs.crime}\n${L("─", 40)}\n👤 Suspect : ${cs.name}  ${dangerTxt(cs.d)}\n`;
  if (Math.random() < chance) {
    addMoney(me, cs.reward);
    g.arrests++; g.primes += cs.reward;
    if (cs.major) { g.majors++; g.arrests += 2; }
    note(g, `🚔 ${cs.major ? "Affaire majeure : " : ""}arrestation de ${cs.name} (+${FM(cs.reward)})`);
    return finish(c, `${head}\n✅ ARRESTATION RÉUSSIE ! ${pick(["Tu l'as plaqué au sol et menotté.", "Il n'a pas eu le temps de réagir.", "Une belle opération, bien menée."])}\n💰 Prime : +${FM(cs.reward)}\n🎲 Chances : ${Math.round(chance * 100)} %${gear ? `  •  Matériel :${gear}` : ""}`);
  }
  // Échec : le suspect s'échappe ou blesse le policier
  if (Math.random() < 0.5) return finish(c, `${head}\n💨 Le suspect s'est enfui dans la foule !\n🎲 Chances : ${Math.round(chance * 100)} %${gear ? `  •  Matériel :${gear}` : ""}`);
  if (g.inv.gilet > 0) { g.inv.gilet--; return finish(c, `${head}\n💥 Le suspect a tiré, mais ton 🦺 gilet a absorbé le choc (détruit) ! Il s'enfuit.\n🎲 Chances : ${Math.round(chance * 100)} %`); }
  g.wounded = Date.now() + WOUND_TIME; g.injuries++;
  return finish(c, `${head}\n🩸 Le suspect t'a blessé avant de s'enfuir !\n🩹 Blessé pendant ${dur(WOUND_TIME)} (ou : police soigner, ${FM(HEAL_COST)})\n🎲 Chances : ${Math.round(chance * 100)} %`);
}

async function cmdHeal(c) {
  const me = c.me, g = me.g;
  if (!woundMs(g)) return reply(c, "💪 Tu n'es pas blessé.");
  if (wallet(me) < HEAL_COST) return reply(c, `💸 Les soins coûtent ${FM(HEAL_COST)} (tu as ${FM(wallet(me))}).`);
  addMoney(me, -HEAL_COST);
  g.wounded = 0;
  return finish(c, `🏥 Tu es soigné et prêt à reprendre le service ! (-${FM(HEAL_COST)})`);
}

// Enquête : 5 indices = une affaire majeure
async function cmdInvestigate(c) {
  const me = c.me, g = me.g;
  if (copOnly(c)) return;
  if (woundedBlock(c)) return;
  const left = cdLeft(g, "invest", INVESTIGATE_CD);
  if (left) return reply(c, `⏳ Ton enquête avance doucement. Reviens dans ${left}.`);
  g.cd.invest = Date.now();
  bump(me, "invest");
  let chance = 0.65;
  if (g.inv.radio > 0) { g.inv.radio--; chance += 0.20; }
  if (Math.random() >= chance) return finish(c, `🔎 ENQUÊTE\n${L("─", 40)}\n${pick(["Les témoins n'ont rien vu.", "La piste s'est refroidie.", "Un informateur n'est pas venu au rendez-vous."])}\n🔎 Indices : ${g.clues}/${CLUES_NEEDED}`);
  g.clues++;
  let txt = `🔎 ENQUÊTE\n${L("─", 40)}\n${pick(["Un témoin a repéré une moto rouge près du marché.", "Les caméras ont filmé un suspect.", "Un indic t'a soufflé une adresse.", "Une empreinte a été relevée sur place.", "Un appel anonyme t'a donné un nom."])}\n🔎 Indices : ${g.clues}/${CLUES_NEEDED}  ${bar(g.clues, CLUES_NEEDED, 10)}`;
  if (g.clues >= CLUES_NEEDED) {
    g.clues = 0;
    const d = 5, mult = 1 + 0.25 * g.grade;
    g.cases.push({ name: suspectName(), crime: pick(["Réseau de trafic international", "Braquage du siècle", "Bande armée du port"]), emoji: "🕵️", d, major: true, reward: Math.floor(rand(PRIME_BY_D[5][0], PRIME_BY_D[5][1]) * mult * 4), exp: Date.now() + MAJOR_TTL });
    txt += `\n\n🕵️ AFFAIRE MAJEURE DÉBLOQUÉE ! Tes indices mènent à un gros bonnet.\n👉 Va voir tes appels : police appels`;
  }
  return finish(c, txt);
}

async function cmdPatrol(c) {
  const me = c.me, g = me.g;
  if (copOnly(c)) return;
  if (blockedByJail(c) || woundedBlock(c)) return;
  const left = cdLeft(g, "patrol", PATROL_CD);
  if (left) return reply(c, `⏳ Ta patrouille est terminée. Reviens dans ${left}.`);
  g.cd.patrol = Date.now();

  const gr = GRADES[g.grade];
  const salary = rand(gr.salary[0], gr.salary[1]);
  addMoney(me, salary);
  g.patrols++;
  bump(me, "patrol");
  let txt = `🚓 PATROUILLE\n${L("─", 40)}\n${pick(["La ville est calme, ronde sans incident.", "Tu as sécurisé un carrefour très fréquenté.", "Tu as aidé une vieille dame à traverser la rue.", "Tu as contrôlé quelques véhicules suspects."])}\n💰 Salaire : +${FM(salary)}`;

  if (Math.random() < 0.35) {
    const bonus = Math.floor(rand($(30), $(120)) * (1 + 0.3 * g.grade));
    addMoney(me, bonus);
    txt += `\n🚨 Incident : ${pick(["tu as arrêté un petit voleur à l'étalage", "tu as dispersé une bagarre devant un bar", "tu as retrouvé un enfant perdu"])} (+${FM(bonus)})`;
  }
  if (Math.random() < 0.25 && g.clues < CLUES_NEEDED) { g.clues++; txt += `\n🔎 Un passant te donne un renseignement : indice ${g.clues}/${CLUES_NEEDED}`; }
  if (Math.random() < 0.40) {
    const before = g.cases.length;
    g.cases = g.cases.filter((x) => x.exp > Date.now());
    g.cases.push(genCase(g));
    txt += `\n📻 Appel radio : un nouveau suspect est signalé ! (police appels)`;
    if (before >= 0) ensureCases(g);
  }
  const next = GRADES[g.grade + 1];
  if (next) txt += `\n🎖️ Points : ${points(g)}/${next.need} pour devenir ${next.emoji} ${next.nom}`;
  return finish(c, txt);
}

// Prime journalière : plus la série est longue, plus elle est grosse
async function cmdDailyPay(c) {
  const me = c.me, g = me.g;
  if (copOnly(c)) return;
  const left = cdLeft(g, "prime", DAY);
  if (left) return reply(c, `⏳ Prime déjà touchée. Reviens dans ${left}.`);
  const last = g.cd.prime || 0;
  const broken = last && Date.now() - last > 2 * DAY && g.streak > 1;
  g.streak = last && Date.now() - last <= 2 * DAY ? g.streak + 1 : 1;
  g.cd.prime = Date.now();
  const base = Math.floor(rand(DAILY_PAY[0], DAILY_PAY[1]) * (1 + 0.4 * g.grade));
  const bonus = Math.min(g.streak - 1, 10) * DAILY_STREAK;
  addMoney(me, base + bonus);
  bump(me, "prime");
  return finish(c, `💰 PRIME JOURNALIÈRE\n${L("─", 40)}\n${GRADES[g.grade].emoji} ${GRADES[g.grade].nom} : +${FM(base)}\n🔥 Série : ${g.streak} jour(s) (+${FM(bonus)})${broken ? "\n💔 Ta série précédente avait été brisée." : ""}`);
}

// ============================================================
//  🥷 CRIMINEL : contrats, coups, planque, corruption
// ============================================================

function crimOnly(c) {
  if (!isCop(c.me.g)) return false;
  reply(c, "👮 Tu es policier ! Démissionne d'abord (police quit) si tu veux passer du côté obscur.");
  return true;
}

async function cmdContracts(c) {
  const me = c.me, g = me.g;
  if (crimOnly(c)) return;
  if (blockedByJail(c)) return;
  const list = ensureContracts(g);
  bump(me, "contracts");
  let txt = `🥷 CONTRATS DU MILIEU\n${L("═", 40)}\n${UNDERWORLD[repIdx(g)].emoji} ${UNDERWORLD[repIdx(g)].nom} • 😎 Réputation ${g.rep} • 🚨 ${stars(g.wanted)}\n\n`;
  list.forEach((x, i) => {
    txt += `${i + 1}. ${x.emoji} ${x.verb} : ${x.cible}\n   ${dangerTxt(x.d)} • 💰 Butin ~${FM(x.loot)} • ⚠️ ${Math.round((1 - crimeChance(g, x.d).chance) * 100)} % de risque • ⏳ ${dur(x.exp - Date.now())}\n`;
  });
  const left = cdLeft(g, "crime", CRIME_CD);
  txt += `\n${left ? `⏳ Prochain coup dans ${left}\n` : ""}👉 Passer à l'action : police crime <n°>\nExemple : police crime 1\n💡 Plus ta réputation monte, plus les cibles sont grosses.`;
  await save(c.usersData, me);
  return reply(c, txt);
}

// Chances de réussite d'un coup (sans consommer le matériel)
function crimeChance(g, d) {
  let chance = CRIME_BASE[d] - g.wanted * 0.03 + 0.01 * repIdx(g), gear = [];
  if (g.inv.gants > 0) { chance += 0.08; gear.push("🧤"); }
  if (g.inv.crochet > 0) { chance += 0.10; gear.push("🗝️"); }
  return { chance: clamp(chance, 0.10, 0.90), gear };
}

async function cmdCrime(c) {
  const me = c.me, g = me.g;
  if (crimOnly(c)) return;
  if (blockedByJail(c)) return;
  const list = ensureContracts(g);
  const n = num(c.args[1]);
  if (isNaN(n) || n < 1 || n > list.length) return reply(c, "⚠️ Choisis un contrat : police crime <n°>\nVoir la liste : police contrats");
  const left = cdLeft(g, "crime", CRIME_CD);
  if (left) return reply(c, `⏳ Les flics te surveillent. Reviens dans ${left}.`);

  const ct = list[n - 1];
  g.contracts.splice(g.contracts.indexOf(ct), 1);
  g.cd.crime = Date.now();
  bump(me, "crime");
  const head = `${ct.emoji} ${ct.verb.toUpperCase()} : ${ct.cible}\n${L("─", 40)}\n`;

  // 🚨 Descente de la police du bot si tu es très recherché
  if (g.wanted >= 3 && Math.random() < RAID_CHANCE) {
    if (Math.random() < 0.5) {
      const minutes = JAIL_BY_D[ct.d] + g.wanted * 2;
      g.crimes.fail++;
      sendToJail(me, minutes, "Arrêté lors d'une descente de police");
      return finish(c, `${head}🚨 DESCENTE DE POLICE ! Les flics t'attendaient devant la cible.\n⛓️ Prison : ${minutes} min`);
    }
    g.crimes.fled++; addWanted(g, 1);
    return finish(c, `${head}🚨 Descente de police ! Tu as réussi à fuir par les toits, mais le coup est annulé.\n🚨 Recherche : ${stars(g.wanted)}`);
  }

  const { chance, gear } = crimeChance(g, ct.d);
  let used = "";
  if (g.inv.gants > 0) { g.inv.gants--; used += " 🧤"; }
  if (g.inv.crochet > 0) { g.inv.crochet--; used += " 🗝️"; }
  let heat = Math.ceil(ct.d / 2);
  if (g.inv.cagoule > 0) { g.inv.cagoule--; heat = Math.max(1, heat - 1); used += " 🎭"; }
  const info = `🎲 Chances : ${Math.round(chance * 100)} %${used ? `  •  Matériel :${used}` : ""}`;

  if (Math.random() < chance) {
    const loot = ct.loot;
    addMoney(me, loot);
    g.crimes.ok++; g.stolen += loot; g.rep += ct.d * 2;
    if (ct.d >= 5) g.bigHeist++;
    addWanted(g, heat);
    note(g, `${ct.emoji} ${ct.cible} : succès (+${FM(loot)})`);
    bump(me, "crimeok");
    return finish(c, `${head}✅ COUP RÉUSSI !\n${pick(["Personne n'a rien vu, bien joué.", "Tu es reparti avant l'arrivée des flics.", "Un travail propre et sans bavure."])}\n💰 Butin : +${FM(loot)}\n😎 Réputation : +${ct.d * 2} → ${g.rep}\n🚨 Recherche : ${stars(g.wanted)}\n💵 Portefeuille : ${FM(wallet(me))}\n${info}`);
  }
  // Échec : arrêté ou fuite
  if (Math.random() < 0.5) {
    const minutes = JAIL_BY_D[ct.d] + g.wanted * 2, fine = Math.min(wallet(me), FINE_BY_D[ct.d]);
    addMoney(me, -fine);
    g.crimes.fail++;
    sendToJail(me, minutes, `${ct.cible} : coup raté`);
    return finish(c, `${head}🚨 COUP RATÉ : la police t'a attrapé en flagrant délit !\n⛓️ Prison : ${minutes} min\n💸 Amende : -${FM(fine)}\n${info}\n\n💡 Travaille (police travaux), évade-toi (police evasion) ou demande une caution à un ami.`);
  }
  g.crimes.fled++; addWanted(g, 1);
  return finish(c, `${head}💨 Le coup a mal tourné, mais tu as réussi à t'enfuir les mains vides.\n🚨 Recherche : ${stars(g.wanted)}\n${info}`);
}

async function cmdLayLow(c) {
  const me = c.me, g = me.g;
  if (crimOnly(c)) return;
  if (blockedByJail(c)) return;
  if (g.wanted < 1) return reply(c, "🕊️ Tu n'es pas recherché : pas besoin de te cacher.");
  const left = cdLeft(g, "laylow", LAYLOW.cd);
  if (left) return reply(c, `⏳ Tu as déjà changé de planque. Reviens dans ${left}.`);
  if (wallet(me) < LAYLOW.cost) return reply(c, `💸 Une planque coûte ${FM(LAYLOW.cost)}.`);
  addMoney(me, -LAYLOW.cost);
  g.cd.laylow = Date.now();
  g.wanted = Math.max(0, g.wanted - LAYLOW.cut);
  if (g.wanted) g.wantedAt = Date.now(); else g.wantedAt = 0;
  bump(me, "laylow");
  return finish(c, `🏚️ PLANQUE\n${L("─", 40)}\nTu te fais oublier chez un cousin à Yopougon.\n🚨 Recherche : ${stars(g.wanted)}  •  💸 -${FM(LAYLOW.cost)}`);
}

async function cmdBribe(c) {
  const me = c.me, g = me.g;
  if (crimOnly(c)) return;
  if (blockedByJail(c)) return;
  if (g.wanted < 1) return reply(c, "🕊️ Tu n'es pas recherché.");
  const cost = BRIBE.cost * g.wanted;
  if (wallet(me) < cost) return reply(c, `💸 Un pot-de-vin pour ${g.wanted} étoile(s) coûte ${FM(cost)} (tu as ${FM(wallet(me))}).`);
  addMoney(me, -cost);
  bump(me, "laylow");
  if (Math.random() < BRIBE.chance) {
    g.wanted = 0; g.wantedAt = 0;
    return finish(c, `💵 CORRUPTION RÉUSSIE\n${L("─", 40)}\nL'inspecteur a perdu ton dossier... contre une enveloppe de ${FM(cost)}.\n🚨 Recherche : effacée !`);
  }
  addWanted(g, 1);
  return finish(c, `🚨 CORRUPTION RATÉE\n${L("─", 40)}\nL'inspecteur a pris l'argent (${FM(cost)}) mais t'a quand même dans le collimateur.\n🚨 Recherche : ${stars(g.wanted)}`);
}

// ============================================================
//  ⛓️ PRISON
// ============================================================

async function cmdPrison(c) {
  const tid = targetOf(c.event) || c.uid;
  const p = tid === c.uid ? c.me : await getP(c, tid), name = await nm(c, tid);
  const left = jailMs(p.g);
  if (!left) return reply(c, `🔓 ${name} n'est pas en prison.`);
  return reply(c, `⛓️ ${name} est en prison encore ${dur(left)}.\n📄 Motif : ${p.g.jail.reason}\n💸 Caution : ${FM(Math.ceil(left / MIN) * BAIL_PER_MIN)}`);
}

async function cmdPrisonWork(c) {
  const me = c.me, g = me.g;
  if (!jailMs(g)) return reply(c, "🔓 Tu n'es pas en prison.");
  const left = cdLeft(g, "work", WORK_CD);
  if (left) return reply(c, `⏳ Le gardien te laisse souffler. Reviens dans ${left}.`);
  g.cd.work = Date.now();
  g.jail.until -= WORK_CUT * MIN;
  addMoney(me, WORK_PAY);
  const rest = jailMs(g);
  tick(me);
  return finish(c, `🧱 Tu as travaillé à la buanderie de la prison.\n⏱️ Peine réduite de ${WORK_CUT} min  •  💰 +${FM(WORK_PAY)}\n${rest ? `⛓️ Il te reste ${dur(rest)}.` : ""}`);
}

async function cmdEscape(c) {
  const me = c.me, g = me.g;
  if (!jailMs(g)) return reply(c, "🔓 Tu n'es pas en prison.");
  const left = cdLeft(g, "escape", ESCAPE_CD);
  if (left) return reply(c, `⏳ Les gardiens te surveillent de près. Reviens dans ${left}.`);
  g.cd.escape = Date.now();

  let chance = ESCAPE_BASE, lime = "";
  if (g.inv.lime > 0) { g.inv.lime--; chance += 0.25; lime = "\n🪚 Tu as utilisé ta lime."; }

  if (Math.random() < chance) {
    g.jail = null; g.escapes++;
    addWanted(g, 3);
    note(g, "🏃 Évasion réussie");
    return finish(c, `🏃 ÉVASION RÉUSSIE !\n${L("─", 40)}\nTu as escaladé le mur pendant la relève des gardes !\n🚨 Recherche : ${stars(g.wanted)} (tu es en cavale)${lime}`);
  }
  const fine = Math.min(wallet(me), ESCAPE_FINE);
  addMoney(me, -fine);
  g.jail.until += ESCAPE_FAIL_MIN * MIN; g.jailTotal += ESCAPE_FAIL_MIN;
  return finish(c, `🚨 ÉVASION RATÉE !\n${L("─", 40)}\nLes gardiens t'ont rattrapé.\n⏱️ +${ESCAPE_FAIL_MIN} min de prison  •  💸 -${FM(fine)}${lime}`);
}

// Caution : pour soi-même ou pour un ami
async function cmdBail(c) {
  const me = c.me, tid = targetOf(c.event) || c.uid;
  const p = tid === c.uid ? me : await getP(c, tid);
  const [a, b] = [await nm(c, c.uid), await nm(c, tid)];
  const left = jailMs(p.g);
  if (!left) return reply(c, tid === c.uid ? "🔓 Tu n'es pas en prison." : `🔓 ${b} n'est pas en prison.`);
  const cost = Math.ceil(left / MIN) * BAIL_PER_MIN;
  if (wallet(me) < cost) return reply(c, `💸 La caution coûte ${FM(cost)} (tu as ${FM(wallet(me))}).`);
  addMoney(me, -cost);
  p.g.jail = null;
  note(p.g, `🔓 Libéré sous caution (${FM(cost)})`);
  const text = tid === c.uid ? `🔓 Tu as payé ta caution de ${FM(cost)} : te voilà libre !` : `🔓 ${a} a payé la caution de ${b} (${FM(cost)}) : ${b} est libre !`;
  return finish(c, text, { others: tid === c.uid ? [] : [p], mentions: tid === c.uid ? undefined : [{ tag: a, id: c.uid }, { tag: b, id: tid }] });
}

// ============================================================
//  🛒 BOUTIQUE
// ============================================================
const findItem = (s) => { const q = strip(s); return Object.keys(ITEMS).find((id) => id === q || ITEMS[id].alias.includes(q)); };

async function cmdShop(c, forced) {
  const me = c.me, g = me.g;
  const sub = forced || strip(c.args[1]);
  const off = forced ? 1 : 2;

  if (["inv", "inventaire", "sac"].includes(sub)) {
    const owned = Object.keys(g.inv).filter((k) => ITEMS[k] && g.inv[k] > 0);
    if (!owned.length) return reply(c, "🎒 Ton sac est vide. Tape « police shop » pour voir le matériel.");
    return reply(c, `🎒 TON SAC\n${L("═", 40)}\n` + owned.map((k) => `${ITEMS[k].emoji} ${ITEMS[k].nom} x${g.inv[k]}`).join("\n"));
  }

  if (["buy", "acheter", "achat"].includes(sub)) {
    const id = findItem(c.args[off]);
    if (!id) return reply(c, "❓ Objet introuvable. Tape « police shop » pour voir la liste.");
    const qty = c.args[off + 1] ? parseInt(c.args[off + 1]) : 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return reply(c, "⚠️ Quantité invalide (entre 1 et 20).");
    const it = ITEMS[id], total = it.prix * qty;
    if (wallet(me) < total) return reply(c, `💸 Il te faut ${FM(total)} (tu as ${FM(wallet(me))}).`);
    addMoney(me, -total);
    g.inv[id] = (g.inv[id] || 0) + qty;
    return finish(c, `✅ Achat : ${it.emoji} ${it.nom} x${qty} pour ${FM(total)}.\n💵 Portefeuille : ${FM(wallet(me))}`);
  }

  let txt = `🛒 MATÉRIEL\n${L("═", 40)}\n`;
  for (const it of Object.values(ITEMS)) txt += `${it.emoji} ${it.nom} — ${FM(it.prix)}\n   ↳ ${it.desc}\n`;
  txt += `\nAcheter : police shop buy <objet> [quantité]\nExemple : police shop buy gants`;
  return reply(c, txt);
}

// Utiliser un objet : les faux papiers (les autres s'utilisent tout seuls)
async function cmdUse(c) {
  const me = c.me, g = me.g;
  const id = findItem(c.args[1]);
  if (id !== "papiers") return reply(c, "⚠️ Utilisation : police utiliser papiers\n(les autres objets s'utilisent tout seuls au bon moment)");
  if (!(g.inv.papiers > 0)) return reply(c, "🪪 Tu n'as pas de faux papiers. Achète-en : police shop buy papiers");
  if (g.wanted < 1) return reply(c, "🕊️ Tu n'es pas recherché, garde tes faux papiers.");
  g.inv.papiers--;
  g.wanted = 0; g.wantedAt = 0;
  return finish(c, "🪪 Tu as changé d'identité : ta recherche est effacée !");
}

// ============================================================
//  🚦 ROUTES
// ============================================================
const ROUTES = {
  help: cmdHelp, aide: cmdHelp,
  stat: cmdStat, status: cmdStat, profil: cmdStat, fiche: cmdStat,
  casier: cmdRecord, record: cmdRecord,
  succes: cmdAch, achievements: cmdAch,
  objectifs: cmdQuests, objectif: cmdQuests, quetes: cmdQuests, quete: cmdQuests, missions: cmdQuests,
  top: cmdTop, classement: cmdTop,
  join: cmdJoin, engager: cmdJoin, rejoindre: cmdJoin,
  quit: cmdQuit, demissionner: cmdQuit, demission: cmdQuit,
  appels: cmdCalls, appel: cmdCalls, calls: cmdCalls, radio: cmdCalls,
  intervenir: cmdIntervene, arreter: cmdIntervene, arrest: cmdIntervene, intervention: cmdIntervene,
  enquete: cmdInvestigate, enqueter: cmdInvestigate, investigate: cmdInvestigate,
  patrouille: cmdPatrol, patrouiller: cmdPatrol, patrol: cmdPatrol,
  prime: cmdDailyPay, solde: cmdDailyPay, paie: cmdDailyPay,
  soigner: cmdHeal, soins: cmdHeal, hopital: cmdHeal,
  contrats: cmdContracts, contrat: cmdContracts, cibles: cmdContracts, jobs: cmdContracts,
  crime: cmdCrime, crimes: cmdCrime, coup: cmdCrime, voler: cmdCrime,
  planque: cmdLayLow, cacher: cmdLayLow, laylow: cmdLayLow,
  corrompre: cmdBribe, pot: cmdBribe, bribe: cmdBribe,
  prison: cmdPrison, taule: cmdPrison,
  travaux: cmdPrisonWork, travail: cmdPrisonWork,
  evasion: cmdEscape, evader: cmdEscape, escape: cmdEscape,
  caution: cmdBail, bail: cmdBail,
  shop: (c) => cmdShop(c), boutique: (c) => cmdShop(c),
  buy: (c) => cmdShop(c, "buy"), acheter: (c) => cmdShop(c, "buy"),
  inv: (c) => cmdShop(c, "inv"), inventaire: (c) => cmdShop(c, "inv"), sac: (c) => cmdShop(c, "inv"),
  utiliser: cmdUse, use: cmdUse
};

// ─── Export ───────────────────────────────────────────────────
module.exports = {
  config: {
    name: CMD,
    aliases: ["flic", "pol", "law"],
    version: "2.0",
    author: "Camille Uchiha 🍓",
    countDown: 3,
    role: 0,
    description: { fr: "👮🏽‍♂️ Police : le bot te donne des suspects à arrêter ou des cibles à cambrioler. Enquêtes, grades, réputation, prison." },
    category: "economy",
    guide: { fr: "Tapez 'police help' pour voir toutes les commandes." }
  },

  onStart: async function ({ message, event, args, api, usersData }) {
    const c = { message, event, args, api, usersData, uid: String(event.senderID), botID: String(api.getCurrentUserID()), names: new Map(), players: new Map() };
    c.me = await getP(c, c.uid);

    // Sans argument : ta fiche. Avec une mention seule : la fiche de la personne.
    const sub = strip(args[0] || "stat");
    let handler = ROUTES[sub];
    if (!handler && Object.keys(event.mentions || {}).length) handler = cmdStat;
    if (!handler) return reply(c, "❓ Commande inconnue. Tapez 'police help' pour voir la liste.");

    try {
      return await handler(c);
    } catch (e) {
      console.error("[police]", e);
      return message.reply("❌ Une erreur est survenue. Réessaie dans un instant.");
    }
  }
};
