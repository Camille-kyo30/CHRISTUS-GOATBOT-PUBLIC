// ============================================================
//  ecole.js — 🎓 ÉCOLE : de la primaire jusqu'au métier de tes rêves
//  (même base que royaume.js et police.js : UNE commande + des sous-commandes)
//
//  Le parcours : 🎒 Primaire (CEPE) → 🏫 Collège (BEPC) → 🎓 Lycée (BAC)
//                → 🏛️ Licence → 📘 Master → 🔬 Doctorat → 💼 MÉTIER
//
//  La vie d'élève :
//   • Va en cours, fais tes devoirs, révise, passe les examens (note sur 20 !)
//   • Gère ton ⚡ énergie et ton 😊 moral (cantine, sport, sommeil)
//   • Chaque nouvelle classe demande des frais d'inscription : il faut de l'argent
//     (petits boulots, bourse d'excellence si tu as de bonnes notes)
//   • Triche, sèche les cours, entraide-toi avec des camarades...
//   • Plus ton diplôme est élevé, meilleur est ton métier (et ton salaire).
//
//  NOUVEAUTÉS v2 :
//   • 🧭 Filières à l'université (Santé, Droit, Informatique...) : elles décident des métiers
//   • 🗓️ Présence quotidienne avec série (assiduité récompensée)
//   • 🎯 3 objectifs par jour + coffre bonus
//   • 🛒 Boutique de fournitures (cahier, calculatrice, ordinateur, snack)
//   • 🎲 Événements au travail (prime, client VIP, contrôle surprise)
//
//  Données : tout est rangé dans data.ecole de chaque joueur.
//  L'argent utilise le portefeuille normal du bot (user.money) :
//  c'est le MÊME argent que dans royaume et police.
//
//  Pour installer : mets ce fichier dans scripts/cmds/ (à côté de royaume.js).
// ============================================================

"use strict";

// Police "gras" du bot (comme royaume.js). Sans le fichier, on affiche du texte normal.
let fonts = null;
try { fonts = require("../../func/font.js"); } catch (e) { fonts = null; }
const B = (s) => { try { return fonts && typeof fonts.bold === "function" ? fonts.bold(s) : s; } catch (e) { return s; } };

const CMD = "ecole";

// 💰 ÉCHELLE DE L'ARGENT : tous les prix et gains du jeu sont multipliés par M.
// M = 100 → deux zéros de plus. Mets M = 1 pour revenir à l'ancienne économie.
const M = 100;
const $ = (n) => n * M;                 // un montant
const $r = (a, b) => [a * M, b * M];    // une fourchette [min, max]
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// ─── ⚙️ RÉGLAGES (modifie ces valeurs pour équilibrer le jeu) ───
const STARTER_MONEY = $(300);           // argent de rentrée offert la première fois
const ENERGY_MAX = 100;
const ENERGY_REGEN = 2 * MIN;        // +1 énergie toutes les 2 minutes
const CLASS_GOAL = 100;              // points de progression pour finir une classe
const PASS_MARK = 10;                // note minimale à l'examen (sur 20)
const FAIL_KEEP = 40;                // après un échec, tu gardes 40 points (redoublement)
const PREP_MAX = 30;                 // maximum de points de révision accumulés

// Actions : énergie dépensée et délai
const COURS = { energy: 15, cd: 10 * MIN, gain: [10, 18] };
const DEVOIRS = { energy: 8, cd: 10 * MIN, gain: [6, 10] };
const REVISER = { energy: 20, cd: 20 * MIN, gain: [8, 12] };
const SPORT = { energy: 10, cd: 30 * MIN, mood: 12 };
const CANTINE = { price: $(50), energy: 25, mood: 5, cd: 15 * MIN };
const DORMIR = { energy: 40, mood: 10, cd: HOUR };
const SECHE = { cd: 30 * MIN, caught: 0.40, mood: 20, punish: 15 };
const ENTRAIDE = { energy: 10, cd: 30 * MIN, gain: 8, mood: 5 };
const CHEAT = { bonus: 4, caught: 0.35, ban: 3 * HOUR };   // tricher à l'examen
const EXAM_CD = 30 * MIN;            // délai entre deux examens (après un échec)
const BOURSE = { cd: DAY, min: 12, per_point: $(100) };       // bourse : (moyenne - 10) × 100 $
const WORK = { energy: 15, cd: 45 * MIN };
const INTERVIEW_CD = 30 * MIN;       // délai entre deux entretiens d'embauche
const EVENT_CHANCE = 0.15;           // événement aléatoire après un cours
const PRESENCE = { cd: DAY, base: $r(40, 80), per_streak: $(10), streak_max: 10, energy: 10, mood: 5 }; // présence quotidienne
const QUEST_COUNT = 3;               // objectifs par jour
const WORK_EVENT = 0.15;             // événement aléatoire pendant un service
const LAPTOP_BONUS = 1.15;           // l'ordinateur augmente la progression de 15 %
const NOTEBOOK_BONUS = 6;            // un cahier : +6 de progression
const CALC_BONUS = 1.5;              // une calculatrice : +1,5 point à l'examen

// ─── Données du jeu ───────────────────────────────────────────

// Le cursus : classes, diplôme, frais d'inscription par classe, prime du diplôme
const CURSUS = [
  { id: "primaire", emoji: "🎒", nom: "Primaire", classes: ["CE2", "CM1", "CM2"], diplome: "CEPE", fee: $(30), prime: $(100) },
  { id: "college", emoji: "🏫", nom: "Collège", classes: ["6e", "5e", "4e", "3e"], diplome: "BEPC", fee: $(100), prime: $(300) },
  { id: "lycee", emoji: "🎓", nom: "Lycée", classes: ["2nde", "1ère", "Terminale"], diplome: "BAC", fee: $(250), prime: $(800) },
  { id: "licence", emoji: "🏛️", nom: "Licence", classes: ["L1", "L2", "L3"], diplome: "Licence", fee: $(600), prime: $(2000) },
  { id: "master", emoji: "📘", nom: "Master", classes: ["M1", "M2"], diplome: "Master", fee: $(1200), prime: $(4000) },
  { id: "doctorat", emoji: "🔬", nom: "Doctorat", classes: ["D1", "D2", "D3"], diplome: "Doctorat", fee: $(2500), prime: $(8000) }
];

// Les métiers : lvl = nombre de diplômes requis (0 = aucun, 1 = CEPE... 6 = Doctorat), pay = salaire par service
const JOBS = {
  vendeur: { emoji: "🛒", nom: "Vendeur ambulant", lvl: 0, pay: $r(40, 90), alias: ["vendeur", "vendeuse", "vente"] },
  laveur: { emoji: "🚗", nom: "Laveur de voitures", lvl: 0, pay: $r(50, 100), alias: ["laveur", "lavage"] },
  menuisier: { emoji: "🪚", nom: "Apprenti menuisier", lvl: 1, pay: $r(70, 130), alias: ["menuisier", "menuiserie"] },
  couturier: { emoji: "🧵", nom: "Couturier(ère)", lvl: 2, pay: $r(100, 180), alias: ["couturier", "couturiere", "couture"] },
  mecanicien: { emoji: "🔧", nom: "Mécanicien", lvl: 2, pay: $r(110, 190), alias: ["mecanicien", "mecano"] },
  infirmier: { emoji: "💉", nom: "Infirmier(ère)", lvl: 3, pay: $r(170, 280), alias: ["infirmier", "infirmiere"] },
  instituteur: { emoji: "📚", nom: "Instituteur(trice)", lvl: 3, pay: $r(150, 250), alias: ["instituteur", "institutrice", "maitre"] },
  comptable: { emoji: "🧮", nom: "Comptable", lvl: 3, pay: $r(160, 270), alias: ["comptable", "comptabilite"] },
  professeur: { emoji: "🧑‍🏫", nom: "Professeur", lvl: 4, pay: $r(260, 420), alias: ["professeur", "prof"] },
  journaliste: { emoji: "📰", nom: "Journaliste", lvl: 4, pay: $r(240, 400), alias: ["journaliste", "presse"] },
  developpeur: { emoji: "💻", nom: "Développeur", lvl: 4, pay: $r(300, 480), alias: ["developpeur", "dev", "programmeur"] },
  ingenieur: { emoji: "🏗️", nom: "Ingénieur", lvl: 5, pay: $r(480, 760), alias: ["ingenieur", "ingenierie"] },
  avocat: { emoji: "⚖️", nom: "Avocat(e)", lvl: 5, pay: $r(520, 820), alias: ["avocat", "avocate"] },
  banquier: { emoji: "🏦", nom: "Cadre bancaire", lvl: 5, pay: $r(500, 800), alias: ["banquier", "banque", "cadre"] },
  medecin: { emoji: "🩺", nom: "Médecin", lvl: 6, pay: $r(900, 1400), alias: ["medecin", "docteur", "doc"] },
  chercheur: { emoji: "🔭", nom: "Chercheur(se)", lvl: 6, pay: $r(850, 1300), alias: ["chercheur", "chercheuse", "recherche"] },
  ministre: { emoji: "🏛️", nom: "Ministre", lvl: 6, pay: $r(1000, 1600), alias: ["ministre", "politique"] }
};

// Rang dans un métier : selon le nombre de services effectués
const RANKS = [
  { nom: "Stagiaire", at: 0, mult: 1.0 },
  { nom: "Confirmé", at: 15, mult: 1.3 },
  { nom: "Senior", at: 40, mult: 1.7 },
  { nom: "Directeur", at: 100, mult: 2.3 }
];

// Filières universitaires (à choisir avant la Licence). Elles décident des métiers de haut niveau.
const FILS = {
  sciences: { emoji: "🔬", nom: "Sciences & Technologies", alias: ["sciences", "science", "techno", "technologie"] },
  sante: { emoji: "🩺", nom: "Santé", alias: ["sante", "medecine", "medical"] },
  droit: { emoji: "⚖️", nom: "Droit & Politique", alias: ["droit", "politique", "juridique"] },
  lettres: { emoji: "📖", nom: "Lettres & Médias", alias: ["lettres", "lettre", "medias", "litterature"] },
  eco: { emoji: "📈", nom: "Économie & Gestion", alias: ["eco", "economie", "gestion", "commerce"] },
  info: { emoji: "💻", nom: "Informatique", alias: ["info", "informatique", "code"] }
};
// Filières acceptées pour les métiers de niveau Licence et plus (si absent : toutes)
const JOB_FILS = {
  developpeur: ["info", "sciences"], journaliste: ["lettres", "droit"],
  ingenieur: ["sciences", "info"], avocat: ["droit"], banquier: ["eco"],
  medecin: ["sante"], chercheur: ["sciences", "sante", "info"], ministre: ["droit", "eco", "lettres"]
};
const findFil = (s) => { const q = strip(s); return Object.keys(FILS).find((id) => id === q || FILS[id].alias.includes(q)); };

// Fournitures scolaires
const ITEMS = {
  cahier: { emoji: "📓", nom: "Cahier", prix: $(60), desc: `+${NOTEBOOK_BONUS} de progression au prochain cours ou devoir (1 usage)`, alias: ["cahier", "cahiers"] },
  calculatrice: { emoji: "🧮", nom: "Calculatrice", prix: $(250), desc: `+${CALC_BONUS} point à ton prochain examen (1 usage)`, alias: ["calculatrice", "calculette"] },
  snack: { emoji: "🍫", nom: "Snack", prix: $(30), desc: "+10 énergie tout de suite : ecole utiliser snack", alias: ["snack", "gouter", "chocolat"] },
  ordinateur: { emoji: "💻", nom: "Ordinateur", prix: $(1500), desc: "+15 % de progression à vie (1 seul)", alias: ["ordinateur", "ordi", "pc"] }
};
const findItem = (s) => { const q = strip(s); return Object.keys(ITEMS).find((id) => id === q || ITEMS[id].alias.includes(q)); };

// Objectifs du jour : key = action comptée, need = combien, reward = gain en $ (× niveau d'études)
const QUEST_POOL = [
  { id: "cours", text: "Aller en cours 2 fois", key: "cours", need: 2, reward: $r(60, 100) },
  { id: "devoirs", text: "Faire tes devoirs", key: "devoirs", need: 1, reward: $r(40, 70) },
  { id: "reviser", text: "Réviser une fois", key: "reviser", need: 1, reward: $r(50, 90) },
  { id: "entraide", text: "Travailler avec un camarade (entraide)", key: "entraide", need: 1, reward: $r(70, 110) },
  { id: "cantine", text: "Manger à la cantine", key: "cantine", need: 1, reward: $r(30, 60) },
  { id: "sport", text: "Faire du sport", key: "sport", need: 1, reward: $r(30, 60) },
  { id: "present", text: "Signer le cahier de présence", key: "present", need: 1, reward: $r(40, 70) },
  { id: "work", text: "Faire un service de travail", key: "work", need: 1, reward: $r(80, 140), cond: (g) => !!g.job }
];

const WORK_LINES = [
  "Une belle journée de travail !", "Ton chef est content de toi.", "Tu as rempli tous tes objectifs.",
  "Un client très satisfait t'a félicité.", "Une journée chargée, mais bien payée."
];

// Événements aléatoires après un cours
const TIPS = [
  "Révise avant l'examen : « ecole reviser » ajoute des points à ta note.",
  "Pas d'argent pour l'inscription ? Fais un petit boulot : « ecole metiers ».",
  "Une moyenne de 12 ou plus donne droit à la bourse : « ecole bourse ».",
  "Tricher à l'examen est risqué : 35 % de chances d'être exclu !",
  "Un camarade peut t'aider : « ecole entraide @user ».",
  `La cantine redonne de l'énergie pour seulement ${$(50)} $.`,
  "Plus ton diplôme est élevé, meilleur est ton salaire.",
  "Dors régulièrement : un élève fatigué ne progresse pas."
];

// Succès : test(p) reçoit le joueur chargé
const ACH = {
  PREMIER_COURS: { emoji: "✏️", nom: "Premier cours", desc: "Aller en cours", test: (p) => p.g.stats.cours >= 1 },
  CEPE: { emoji: "🎒", nom: "CEPE", desc: "Obtenir le CEPE", test: (p) => p.g.diplomas.includes("CEPE") },
  BEPC: { emoji: "🏫", nom: "BEPC", desc: "Obtenir le BEPC", test: (p) => p.g.diplomas.includes("BEPC") },
  BAC: { emoji: "🎓", nom: "Bachelier", desc: "Obtenir le BAC", test: (p) => p.g.diplomas.includes("BAC") },
  LICENCE: { emoji: "🏛️", nom: "Licencié", desc: "Obtenir la Licence", test: (p) => p.g.diplomas.includes("Licence") },
  MASTER: { emoji: "📘", nom: "Master", desc: "Obtenir le Master", test: (p) => p.g.diplomas.includes("Master") },
  DOCTEUR: { emoji: "🔬", nom: "Docteur", desc: "Obtenir le Doctorat", test: (p) => p.g.diplomas.includes("Doctorat") },
  MAJOR: { emoji: "🥇", nom: "Major", desc: "Avoir 18/20 ou plus à un examen", test: (p) => p.g.stats.best >= 18 },
  TRAVAILLEUR: { emoji: "💪", nom: "Travailleur", desc: "50 services de travail", test: (p) => p.g.stats.shifts >= 50 },
  DIRECTEUR: { emoji: "🏢", nom: "Directeur", desc: "Devenir directeur dans un métier", test: (p) => !!p.g.job && p.g.job.shifts >= 100 },
  SOLIDAIRE: { emoji: "🤝", nom: "Solidaire", desc: "10 séances d'entraide", test: (p) => p.g.stats.entraide >= 10 },
  ASSIDU: { emoji: "🗓️", nom: "Élève assidu", desc: "Série de 7 jours de présence", test: (p) => p.g.streak >= 7 },
  OBJECTIFS: { emoji: "🎯", nom: "Organisé", desc: "Terminer 15 objectifs du jour", test: (p) => p.g.stats.quests >= 15 },
  EQUIPE: { emoji: "💻", nom: "Équipé", desc: "Acheter un ordinateur", test: (p) => (p.g.inv.ordinateur || 0) > 0 }
};
const ACH_REWARD = { PREMIER_COURS: 50, CEPE: 100, BEPC: 200, BAC: 500, LICENCE: 1000, MASTER: 2000, DOCTEUR: 5000, MAJOR: 500, TRAVAILLEUR: 1000, DIRECTEUR: 3000, SOLIDAIRE: 600, ASSIDU: 700, OBJECTIFS: 1000, EQUIPE: 300 };
for (const k of Object.keys(ACH_REWARD)) ACH_REWARD[k] *= M;

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (n) => String(Math.floor(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const FM = (n) => `${fmt(n)} $`;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const L = (ch = "─", n = 40) => ch.repeat(n);
const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const bar = (v, max, w = 20) => { const f = Math.floor(clamp(v / (max || 1), 0, 1) * w); return "█".repeat(f) + "░".repeat(w - f); };
function dur(ms) {
  const h = Math.floor(ms / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// ─── Joueur : chargement / sauvegarde ─────────────────────────
function initEcole() {
  return {
    stage: 0,                  // index dans CURSUS (6 = tout terminé)
    cls: 0,                    // index de la classe dans le niveau
    progress: 0,               // progression dans la classe (0 à 100)
    enrolled: true,            // inscrit (frais payés) ?
    energy: ENERGY_MAX, energyAt: Date.now(),
    mood: 70,                  // moral (0 à 100)
    savoir: 10,                // niveau de connaissance (grandit à chaque classe réussie)
    prep: 0,                   // points de révision pour le prochain examen
    grades: [],                // dernières notes /20
    diplomas: [],              // ["CEPE", "BEPC", ...]
    redouble: 0, cheats: 0,
    job: null,                 // { id, shifts }
    stats: { cours: 0, devoirs: 0, exams: 0, passed: 0, shifts: 0, seche: 0, entraide: 0, best: 0, quests: 0 },
    achievements: [],
    fil: null,                 // filière universitaire (sciences, sante, droit...)
    streak: 0,                 // série de jours de présence
    quest: null,               // { d: jour, list: [{ id, got, done }], bonus: bool }
    inv: {},                   // fournitures
    welcomed: false,
    cd: {}
  };
}

function normalize(raw) {
  const d = initEcole();
  const g = Object.assign(initEcole(), raw || {});
  g.stats = Object.assign(d.stats, (raw && raw.stats) || {});
  g.cd = Object.assign({}, (raw && raw.cd) || {});
  for (const k of ["grades", "diplomas", "achievements"]) if (!Array.isArray(g[k])) g[k] = [];
  g.stage = clamp(Math.floor(Number(g.stage) || 0), 0, CURSUS.length);
  g.energy = clamp(Number(g.energy) || 0, 0, ENERGY_MAX);
  g.mood = clamp(Number.isFinite(Number(g.mood)) ? Number(g.mood) : 70, 0, 100);
  g.progress = clamp(Number(g.progress) || 0, 0, CLASS_GOAL);
  if (g.job && !JOBS[g.job.id]) g.job = null;
  g.inv = Object.assign({}, g.inv || {});
  if (g.fil && !FILS[g.fil]) g.fil = null;
  if (g.quest && !Array.isArray(g.quest.list)) g.quest = null;
  g.streak = Math.max(0, Math.floor(Number(g.streak) || 0));
  return g;
}

const wallet = (p) => Number(p.user.money) || 0;
function addMoney(p, n) { p.user.money = Math.max(0, wallet(p) + n); }
const cdLeft = (g, key, ms) => { const d = ms - (Date.now() - (g.cd[key] || 0)); return d > 0 ? dur(d) : null; };
const done = (g) => g.stage >= CURSUS.length;                       // cursus terminé
const stageOf = (g) => CURSUS[g.stage];
const classOf = (g) => (done(g) ? "—" : stageOf(g).classes[g.cls]);
const eduLevel = (g) => g.diplomas.length;                           // nombre de diplômes
const avg = (g) => { const n = g.grades.slice(-10); return n.length ? n.reduce((s, x) => s + x, 0) / n.length : null; };
const avgTxt = (g) => { const a = avg(g); return a === null ? "—" : `${a.toFixed(1)}/20`; };
const rankOf = (job) => { let r = RANKS[0]; for (const x of RANKS) if (job.shifts >= x.at) r = x; return r; };

// Le temps qui passe : l'énergie remonte toute seule
function tick(g) {
  const now = Date.now();
  const gain = Math.floor((now - (g.energyAt || now)) / ENERGY_REGEN);
  if (gain > 0) { g.energy = Math.min(ENERGY_MAX, g.energy + gain); g.energyAt = g.energy >= ENERGY_MAX ? now : g.energyAt + gain * ENERGY_REGEN; }
  if (g.energy >= ENERGY_MAX) g.energyAt = now;
}

// ─── Objectifs du jour ────────────────────────────────────────
const todayNum = () => Math.floor(Date.now() / DAY);

function ensureQuests(g) {
  if (g.quest && g.quest.d === todayNum()) return g.quest;
  const pool = QUEST_POOL.filter((q) => !q.cond || q.cond(g));
  const chosen = [];
  while (chosen.length < QUEST_COUNT && pool.length) chosen.push(pool.splice(rand(0, pool.length - 1), 1)[0]);
  g.quest = { d: todayNum(), list: chosen.map((q) => ({ id: q.id, got: 0, done: false })), bonus: false };
  return g.quest;
}

// Fait avancer les objectifs liés à une action. Récompense automatique + coffre bonus.
function bump(p, key, n = 1) {
  const g = p.g, quest = ensureQuests(g), mult = 1 + 0.15 * eduLevel(g);
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
    const gold = Math.floor(rand($(150), $(300)) * mult);
    addMoney(p, gold);
    g.inv.snack = (g.inv.snack || 0) + 1;
    addMood(g, 10);
    p.notes.push(`🎁 Tous les objectifs du jour sont terminés ! Coffre : +${FM(gold)} + 🍫 Snack + 😊 +10`);
  }
}

// Bonus de progression : cahier (1 usage) et ordinateur (permanent)
function progBonus(g, gain) {
  let x = gain, tag = "";
  if ((g.inv.cahier || 0) > 0) { g.inv.cahier--; x += NOTEBOOK_BONUS; tag += ` 📓+${NOTEBOOK_BONUS}`; }
  if ((g.inv.ordinateur || 0) > 0) { x = Math.round(x * LAPTOP_BONUS); tag += " 💻+15%"; }
  return { x, tag };
}

async function load(usersData, uid) {
  let user = await usersData.get(uid);
  if (!user) user = { money: 0, exp: 0, data: {} };
  if (!user.data) user.data = {};
  user.data.ecole = normalize(user.data.ecole);
  tick(user.data.ecole);
  return { uid: String(uid), user, g: user.data.ecole, notes: [] };
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

// ─── Réponses ─────────────────────────────────────────────────
const reply = (c, text) => c.message.reply(B(text));

async function finish(c, text, { mentions, others = [] } = {}) {
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
  return mentions ? c.message.reply({ body: out, mentions }) : c.message.reply(B(out));
}

// Dépense de l'énergie (retourne false si pas assez)
function tired(c, need) {
  if (c.me.g.energy >= need) return false;
  reply(c, `😴 Tu es trop fatigué (⚡ ${Math.floor(c.me.g.energy)}/${ENERGY_MAX}, il faut ${need}).\n👉 Mange à la cantine (ecole cantine), dors (ecole dormir) ou attends un peu.`);
  return true;
}
// Moral : multiplicateur de progression (de x0.8 à x1.2)
const moodMult = (g) => 0.8 + (g.mood / 100) * 0.4;
const addMood = (g, n) => { g.mood = clamp(g.mood + n, 0, 100); };

// ============================================================
//  👤 PROFIL
// ============================================================

function renderHelp() {
  return `
🎓  É C O L E  -  G U I D E
${L("═", 44)}

👤  PROFIL
  ecole stat [@user]     - Ta fiche d'élève
  ecole bulletin         - Notes et moyenne
  ecole diplomes         - Tes diplômes et succès
  ecole top [eleve|moyenne|metier]

📚  VIE SCOLAIRE
  ecole cours            - Aller en cours (progression)
  ecole devoirs          - Faire ses devoirs
  ecole reviser          - Réviser pour l'examen
  ecole examen [tricher] - Passer l'examen de fin de classe
  ecole inscription      - Payer l'inscription de la classe
  ecole entraide @user   - Travailler avec un camarade
  ecole bourse           - Bourse d'excellence (moyenne ≥ 12)
  ecole present          - Signer la présence (série = plus de $)
  ecole objectifs        - Tes 3 objectifs du jour (+ coffre)
  ecole filiere <nom>    - Choisir sa filière (dès le Lycée)

⚡  ÉNERGIE ET MORAL
  ecole cantine          - Un repas (${FM(CANTINE.price)})
  ecole dormir           - Récupérer
  ecole sport            - Se défouler
  ecole seche            - Sécher les cours (risqué !)

🛒  FOURNITURES
  ecole boutique         - Cahier, calculatrice, ordinateur...
  ecole acheter <objet> [qté]
  ecole sac / utiliser snack

💼  MÉTIERS
  ecole metiers          - Les métiers selon ton diplôme
  ecole candidater <métier> - Passer un entretien
  ecole travailler       - Faire un service (salaire)
  ecole demissionner     - Quitter ton métier

${L("═", 44)}
💡  L'argent est le même que dans « royaume » et « police » !
`.trim();
}
const cmdHelp = (c) => reply(c, renderHelp());

async function cmdStat(c) {
  const tid = targetOf(c.event) || c.uid, isSelf = tid === c.uid;
  const p = isSelf ? c.me : await getP(c, tid), g = p.g;
  const name = await nm(c, tid);

  let txt = `🎓  É C O L E\n${L("═", 44)}\n👤 ${name}\n`;
  if (done(g)) txt += `▸ 🎓 Cursus terminé : tu es DOCTEUR !\n`;
  else {
    const s = stageOf(g);
    txt += `▸ ${s.emoji} ${s.nom} — ${classOf(g)}${g.enrolled ? "" : "  (⚠️ non inscrit)"}\n`;
    txt += `📈 Classe : ${bar(g.progress, CLASS_GOAL, 18)}  ${Math.floor(g.progress)}/${CLASS_GOAL}\n`;
  }
  txt += `${L("─", 44)}\n⚡ Énergie  ${bar(g.energy, ENERGY_MAX, 14)}  ${Math.floor(g.energy)}/${ENERGY_MAX}\n😊 Moral    ${bar(g.mood, 100, 14)}  ${g.mood}/100\n`;
  txt += `📊 Moyenne : ${avgTxt(g)}  •  🧠 Savoir : ${g.savoir}  •  📝 Révisions : ${g.prep}/${PREP_MAX}\n`;
  txt += `💵 Portefeuille : ${FM(wallet(p))}  •  🗓️ Présence : ${g.streak} jour(s) d'affilée\n${L("─", 44)}\n`;
  if (g.fil) txt += `🧭 Filière : ${FILS[g.fil].emoji} ${FILS[g.fil].nom}\n`;
  txt += `🏅 Diplômes : ${g.diplomas.length ? g.diplomas.join(", ") : "aucun"}\n`;
  if (g.job) { const j = JOBS[g.job.id], r = rankOf(g.job); txt += `💼 Métier : ${j.emoji} ${j.nom} (${r.nom}, ${g.job.shifts} services)\n`; }
  else txt += `💼 Métier : aucun\n`;
  txt += `📚 Cours : ${g.stats.cours}  •  Devoirs : ${g.stats.devoirs}  •  Examens : ${g.stats.passed}/${g.stats.exams} réussis  •  Redoublements : ${g.redouble}\n`;

  if (isSelf) {
    const todo = [];
    if (!done(g) && g.enrolled && g.progress < CLASS_GOAL && !cdLeft(g, "cours", COURS.cd)) todo.push("📚 cours");
    if (!done(g) && !g.enrolled) todo.push(`🧾 inscription (${FM(stageOf(g).fee)})`);
    if (!done(g) && g.progress >= CLASS_GOAL) todo.push("📝 EXAMEN !");
    if (g.job && !cdLeft(g, "work", WORK.cd)) todo.push("💼 travail");
    if (!cdLeft(g, "bourse", BOURSE.cd) && (avg(g) || 0) >= BOURSE.min) todo.push("🎁 bourse");
    if (!cdLeft(g, "present", PRESENCE.cd)) todo.push("🗓️ présence");
    const open = ensureQuests(g).list.filter((e) => !e.done).length;
    if (open) todo.push(`🎯 ${open} objectif(s)`);
    if (g.stage >= 2 && !g.fil && g.stage < CURSUS.length) todo.push("🧭 filière");
    txt += `${L("─", 44)}\n🎯 DISPONIBLE : ${todo.length ? todo.join(" • ") : "rien pour l'instant"}\n`;
    txt += `\n💡 ${pick(TIPS)}`;
    await save(c.usersData, c.me);
  }
  return reply(c, txt.trim());
}

async function cmdReport(c) {
  const g = c.me.g;
  if (!g.grades.length) return reply(c, "📋 Ton bulletin est vide : passe d'abord un examen (ecole examen).");
  let txt = `📋 BULLETIN SCOLAIRE\n${L("═", 40)}\n📊 Moyenne (10 dernières notes) : ${avgTxt(g)}\n\n`;
  const last = g.grades.slice(-10).reverse();
  txt += last.map((n, i) => `${i === 0 ? "▶️" : "  "} ${n >= PASS_MARK ? "✅" : "❌"} ${n}/20  ${bar(n, 20, 10)}`).join("\n");
  const a = avg(g);
  txt += `\n\n🗣️ Appréciation : ${a >= 16 ? "Excellent travail, félicitations !" : a >= 14 ? "Très bon trimestre." : a >= 12 ? "Bon travail, continue ainsi." : a >= 10 ? "Passable. Peut mieux faire." : "Insuffisant. Il faut travailler davantage !"}`;
  return reply(c, txt);
}

async function cmdDiplomas(c) {
  const g = c.me.g;
  let txt = `🏅 DIPLÔMES ET SUCCÈS\n${L("═", 40)}\n`;
  txt += CURSUS.map((s) => `${g.diplomas.includes(s.diplome) ? "✅" : "🔒"} ${s.emoji} ${s.diplome} (${s.nom}) — prime ${FM(s.prime)}`).join("\n");
  const ids = Object.keys(ACH);
  txt += `\n\n🏆 Succès : ${g.achievements.length}/${ids.length}\n`;
  const got = g.achievements.filter((a) => ACH[a]).map((a) => `• ${ACH[a].emoji} ${ACH[a].nom}`);
  if (got.length) txt += got.join("\n") + "\n";
  const left = ids.filter((a) => !g.achievements.includes(a)).slice(0, 5).map((a) => `• ${ACH[a].emoji} ${ACH[a].nom} : ${ACH[a].desc}`);
  if (left.length) txt += `\n🎯 PROCHAINS OBJECTIFS :\n${left.join("\n")}`;
  return reply(c, txt.trim());
}

async function cmdTop(c) {
  const keys = { eleve: "eleve", eleves: "eleve", niveau: "eleve", moyenne: "avg", notes: "avg", metier: "job", metiers: "job", travail: "job" };
  const key = keys[strip(c.args[1] || "eleve")] || "eleve";
  const all = await c.usersData.getAll();
  const rows = all.map((u) => {
    const g = normalize(u.data && u.data.ecole);
    const row = { id: String(u.userID), name: u.name || `Utilisateur ${String(u.userID).slice(-4)}`, val: 0, line: "" };
    if (key === "eleve") {
      row.val = g.diplomas.length * 1000 + (done(g) ? 0 : g.cls * 100 + g.progress) + (g.diplomas.length || g.stats.cours ? 1 : 0);
      row.line = `${done(g) ? "🔬 Docteur" : `${stageOf(g).emoji} ${stageOf(g).nom} ${classOf(g)}`} • ${g.diplomas.length} diplôme(s)`;
    } else if (key === "avg") {
      const a = avg(g); row.val = a === null || g.grades.length < 3 ? 0 : a; row.line = `📊 ${avgTxt(g)} (${g.grades.length} note(s))`;
    } else if (g.job) {
      const j = JOBS[g.job.id]; row.val = g.job.shifts + 1; row.line = `${j.emoji} ${j.nom} (${rankOf(g.job).nom}) • ${g.job.shifts} services`;
    }
    return row;
  }).filter((r) => r.val > 0).sort((a, b) => b.val - a.val);

  const titles = { eleve: "🎓 LES MEILLEURS ÉLÈVES", avg: "📊 LES MEILLEURES MOYENNES", job: "💼 LES PLUS ACTIFS AU TRAVAIL" };
  let txt = `${titles[key]}\n${L("═", 44)}\n`;
  if (!rows.length) return reply(c, txt + "📊 Personne n'est encore classé ici.");
  const medals = ["🥇", "🥈", "🥉"];
  rows.slice(0, 10).forEach((r, i) => { txt += `${medals[i] || `#${i + 1}`} ${r.name}\n   ${r.line}\n`; });
  const mine = rows.findIndex((r) => r.id === c.uid);
  if (mine >= 10) txt += `\n📍 Ta position : #${mine + 1} — ${rows[mine].line}`;
  return reply(c, txt);
}

// ============================================================
//  📚 VIE SCOLAIRE
// ============================================================

// Vérifie que le joueur peut étudier (inscrit, cursus pas terminé, classe pas finie)
function cannotStudy(c) {
  const g = c.me.g;
  if (done(g)) { reply(c, "🎓 Tu as terminé tout ton cursus ! Place au travail : ecole metiers"); return true; }
  if (!g.enrolled) { reply(c, `🧾 Tu n'es pas inscrit en ${classOf(g)}. Paye les frais : ecole inscription (${FM(stageOf(g).fee)})`); return true; }
  if (g.progress >= CLASS_GOAL) { reply(c, `📝 Tu as fini le programme de ${classOf(g)} ! Passe l'examen : ecole examen`); return true; }
  return false;
}

async function cmdClass(c) {
  const me = c.me, g = me.g;
  if (cannotStudy(c)) return;
  const left = cdLeft(g, "cours", COURS.cd);
  if (left) return reply(c, `⏳ La cloche n'a pas encore sonné. Prochain cours dans ${left}.`);
  if (tired(c, COURS.energy)) return;

  g.cd.cours = Date.now();
  g.energy -= COURS.energy;
  g.stats.cours++;
  const pb = progBonus(g, Math.round(rand(COURS.gain[0], COURS.gain[1]) * moodMult(g)));
  const gain = pb.x;
  let txt = `📚 COURS DE ${classOf(g)}\n${L("─", 40)}\n${pick(["Le professeur a expliqué un chapitre difficile.", "Tu as bien suivi la leçon de maths.", "Cours d'histoire passionnant aujourd'hui.", "Tu as pris de bonnes notes en sciences.", "Dictée, grammaire, conjugaison : tout y est passé."])}\n`;
  let extra = gain;

  // Événement aléatoire
  if (Math.random() < EVENT_CHANCE) {
    const roll = rand(1, 5);
    if (roll === 1) { extra += 6; txt += `\n📝 Interrogation surprise : tu as assuré ! (+6 progression)`; }
    else if (roll === 2) { g.energy = Math.min(ENERGY_MAX, g.energy + 10); txt += `\n🎉 Le professeur est absent : récréation prolongée ! (+10 ⚡)`; }
    else if (roll === 3) { addMood(g, -15); txt += `\n🥊 Une bagarre dans la cour t'a gâché la journée. (-15 😊)`; }
    else if (roll === 4) { extra += 5; txt += `\n🤝 Un camarade t'a prêté ses notes. (+5 progression)`; }
    else { const x = rand($(20), $(80)); addMoney(me, x); txt += `\n🪙 Tu as trouvé une pièce dans la cour : +${FM(x)}`; }
  }
  g.progress = Math.min(CLASS_GOAL, g.progress + extra);
  txt += `\n📈 Progression : ${Math.floor(g.progress)}/${CLASS_GOAL} (+${gain}${pb.tag})  •  ⚡ ${Math.floor(g.energy)}/${ENERGY_MAX}`;
  bump(me, "cours");
  if (g.progress >= CLASS_GOAL) txt += `\n\n📝 Le programme est terminé ! Tape « ecole examen » quand tu es prêt.`;
  return finish(c, txt);
}

async function cmdHomework(c) {
  const me = c.me, g = me.g;
  if (cannotStudy(c)) return;
  const left = cdLeft(g, "devoirs", DEVOIRS.cd);
  if (left) return reply(c, `⏳ Tes devoirs sont déjà faits. Reviens dans ${left}.`);
  if (tired(c, DEVOIRS.energy)) return;
  g.cd.devoirs = Date.now();
  g.energy -= DEVOIRS.energy;
  g.stats.devoirs++;
  const pb = progBonus(g, Math.round(rand(DEVOIRS.gain[0], DEVOIRS.gain[1]) * moodMult(g)));
  const gain = pb.x;
  g.progress = Math.min(CLASS_GOAL, g.progress + gain);
  bump(me, "devoirs");
  return finish(c, `✏️ DEVOIRS\n${L("─", 40)}\nTu as terminé tes exercices à la maison.\n📈 Progression : ${Math.floor(g.progress)}/${CLASS_GOAL} (+${gain}${pb.tag})  •  ⚡ ${Math.floor(g.energy)}/${ENERGY_MAX}`);
}

async function cmdRevise(c) {
  const me = c.me, g = me.g;
  if (done(g)) return reply(c, "🎓 Tu as terminé ton cursus, plus d'examen à passer !");
  const left = cdLeft(g, "reviser", REVISER.cd);
  if (left) return reply(c, `⏳ Ta tête fume ! Reviens dans ${left}.`);
  if (g.prep >= PREP_MAX) return reply(c, "📝 Tu es déjà au maximum de tes révisions. Va passer l'examen !");
  if (tired(c, REVISER.energy)) return;
  g.cd.reviser = Date.now();
  g.energy -= REVISER.energy;
  const gain = Math.min(PREP_MAX - g.prep, rand(REVISER.gain[0], REVISER.gain[1]));
  g.prep += gain;
  bump(me, "reviser");
  return finish(c, `📖 RÉVISIONS\n${L("─", 40)}\nTu as passé la soirée sur tes fiches.\n📝 Révisions : ${g.prep}/${PREP_MAX} (+${gain})  •  ⚡ ${Math.floor(g.energy)}/${ENERGY_MAX}\n💡 Elles seront utilisées à ton prochain examen.`);
}

// Examen : note sur 20. ≥ 10 = réussi. « ecole examen tricher » = +4 points mais risque d'exclusion.
async function cmdExam(c) {
  const me = c.me, g = me.g;
  if (done(g)) return reply(c, "🎓 Tu as déjà tous tes diplômes !");
  if (!g.enrolled) return reply(c, `🧾 Tu n'es pas inscrit en ${classOf(g)}. Paye les frais : ecole inscription (${FM(stageOf(g).fee)})`);
  if (g.progress < CLASS_GOAL) return reply(c, `📚 Tu n'es pas prêt : programme à ${Math.floor(g.progress)}/${CLASS_GOAL}. Va en cours (ecole cours) !`);
  const left = cdLeft(g, "exam", g.cd.examBan || EXAM_CD);
  if (left) return reply(c, `⏳ ${g.cd.examBan ? "Tu es exclu des examens" : "Le prochain examen n'est pas encore ouvert"} : reviens dans ${left}.`);

  const cheat = ["tricher", "triche", "cheat"].includes(strip(c.args[1]));
  g.cd.exam = Date.now(); g.cd.examBan = 0;
  g.stats.exams++;
  const s = stageOf(g), last = g.cls === s.classes.length - 1;

  // Pris en train de tricher
  if (cheat && Math.random() < CHEAT.caught) {
    g.cheats++; g.cd.examBan = CHEAT.ban; g.grades.push(0); g.prep = 0;
    addMood(g, -25);
    return finish(c, `🚨 TRICHERIE DÉCOUVERTE !\n${L("─", 40)}\nLe surveillant a trouvé ton antisèche : note 0/20 et exclusion des examens pendant ${dur(CHEAT.ban)}.\n😊 Moral : ${g.mood}/100`);
  }

  // La note : savoir + révisions + moral + hasard (+ triche)
  let calc = "";
  if ((g.inv.calculatrice || 0) > 0) { g.inv.calculatrice--; calc = ` 🧮+${CALC_BONUS}`; }
  const raw = (calc ? CALC_BONUS : 0) + 7 + g.savoir * 0.12 + g.prep * 0.2 + (g.mood - 50) / 25 + rand(-3, 3) + (cheat ? CHEAT.bonus : 0) + Math.min(g.redouble, 3) * 0.5;
  const note = clamp(Math.round(raw), 0, 20);
  g.grades.push(note); if (g.grades.length > 30) g.grades = g.grades.slice(-30);
  g.stats.best = Math.max(g.stats.best, note);
  g.prep = 0;
  let txt = `📝 EXAMEN DE ${classOf(g)}${cheat ? " (avec antisèche 😏)" : ""}\n${L("─", 40)}\n🎯 Note : ${note}/20  ${bar(note, 20, 12)}${calc}\n`;

  // Échec : redoublement
  if (note < PASS_MARK) {
    g.progress = FAIL_KEEP; g.redouble++;
    addMood(g, -15);
    return finish(c, txt + `\n❌ Raté ! Tu redoubles ${classOf(g)}.\n📈 Tu gardes ${FAIL_KEEP}/${CLASS_GOAL} de progression.\n💡 Révise davantage et mange bien avant l'examen !`);
  }

  // Réussite
  g.stats.passed++;
  g.savoir += 2;
  addMood(g, 15);
  txt += `\n✅ Réussi ! ${note >= 16 ? "Mention très bien 🥇" : note >= 14 ? "Mention bien 🥈" : note >= 12 ? "Mention assez bien 🥉" : "Admis(e) !"}`;
  if (!last) {
    g.cls++; g.progress = 0; g.enrolled = false;
    txt += `\n🎒 Tu passes en ${classOf(g)} !\n🧾 Inscription requise : ${FM(s.fee)} (ecole inscription)`;
    return finish(c, txt);
  }

  // Dernière classe : diplôme !
  g.diplomas.push(s.diplome);
  addMoney(me, s.prime);
  g.stage++; g.cls = 0; g.progress = 0; g.enrolled = false;
  txt += `\n\n🎉 DIPLÔME OBTENU : ${s.emoji} ${s.diplome} !\n💰 Prime : +${FM(s.prime)}`;
  if (done(g)) txt += `\n🔬 Tu as terminé TOUT le cursus : bravo Docteur !\n💼 De nouveaux métiers t'attendent : ecole metiers`;
  else txt += `\n➡️ Prochaine étape : ${stageOf(g).emoji} ${stageOf(g).nom} (${classOf(g)}) — inscription ${FM(stageOf(g).fee)}\n💼 Nouveaux métiers disponibles : ecole metiers${g.stage === 3 && !g.fil ? "\n🧭 Avant la Licence, choisis ta FILIÈRE : ecole filiere" : ""}`;
  return finish(c, txt);
}

async function cmdEnroll(c) {
  const me = c.me, g = me.g;
  if (done(g)) return reply(c, "🎓 Tu as terminé ton cursus, plus d'inscription à payer.");
  if (g.enrolled) return reply(c, `✅ Tu es déjà inscrit en ${classOf(g)}.`);
  const s = stageOf(g);
  if (g.stage >= 3 && !g.fil) return reply(c, "🧭 Choisis d'abord ta filière universitaire : ecole filiere");
  if (wallet(me) < s.fee) return reply(c, `💸 Les frais d'inscription sont de ${FM(s.fee)} (tu as ${FM(wallet(me))}).\n👉 Fais un petit boulot : ecole metiers`);
  addMoney(me, -s.fee);
  g.enrolled = true;
  return finish(c, `🧾 INSCRIPTION VALIDÉE\n${L("─", 40)}\n${s.emoji} ${s.nom} — ${classOf(g)} (${FM(s.fee)} payés)\n💵 Portefeuille : ${FM(wallet(me))}\n📚 Bonne rentrée ! Tape « ecole cours ».`);
}

async function cmdHelpMate(c) {
  const me = c.me, g = me.g, tid = targetOf(c.event);
  if (!tid) return reply(c, "⚠️ Mentionne le camarade avec qui travailler ou réponds à son message.");
  if (tid === c.uid) return reply(c, "😏 Tu ne peux pas travailler en groupe tout seul.");
  if (tid === c.botID) return reply(c, "🤖 Je suis le surveillant, pas un camarade !");
  const tp = await getP(c, tid), tg = tp.g, [a, b] = [await nm(c, c.uid), await nm(c, tid)];
  const left = cdLeft(g, "entraide", ENTRAIDE.cd);
  if (left) return reply(c, `⏳ Vous avez déjà beaucoup travaillé. Reviens dans ${left}.`);
  if (tired(c, ENTRAIDE.energy)) return;
  g.cd.entraide = Date.now();
  g.energy -= ENTRAIDE.energy;
  g.stats.entraide++;
  bump(me, "entraide");
  for (const x of [g, tg]) {
    if (!done(x) && x.enrolled) x.progress = Math.min(CLASS_GOAL, x.progress + ENTRAIDE.gain);
    addMood(x, ENTRAIDE.mood);
  }
  return finish(c, `🤝 ENTRAIDE\n${L("─", 40)}\n${a} et ${b} ont révisé ensemble à la bibliothèque !\n📈 +${ENTRAIDE.gain} de progression chacun (si inscrit)  •  😊 +${ENTRAIDE.mood}`, { others: [tp], mentions: [{ tag: a, id: c.uid }, { tag: b, id: tid }] });
}

async function cmdScholarship(c) {
  const me = c.me, g = me.g;
  const left = cdLeft(g, "bourse", BOURSE.cd);
  if (left) return reply(c, `⏳ La bourse est versée une fois par jour. Reviens dans ${left}.`);
  const a = avg(g);
  if (a === null || g.grades.length < 2) return reply(c, "📋 Il te faut au moins 2 notes pour demander une bourse. Passe des examens !");
  if (a < BOURSE.min) return reply(c, `📉 Ta moyenne (${avgTxt(g)}) est trop basse : il faut ${BOURSE.min}/20 minimum.`);
  const x = Math.floor((a - 10) * BOURSE.per_point);
  g.cd.bourse = Date.now();
  addMoney(me, x);
  return finish(c, `🎁 BOURSE D'EXCELLENCE\n${L("─", 40)}\n📊 Moyenne : ${avgTxt(g)}\n💰 Bourse : +${FM(x)}\n💵 Portefeuille : ${FM(wallet(me))}`);
}

// ============================================================
//  ⚡ ÉNERGIE ET MORAL
// ============================================================

async function cmdCanteen(c) {
  const me = c.me, g = me.g;
  const left = cdLeft(g, "cantine", CANTINE.cd);
  if (left) return reply(c, `⏳ Tu n'as plus faim. Reviens dans ${left}.`);
  if (g.energy >= ENERGY_MAX) return reply(c, "😋 Tu es déjà en pleine forme !");
  if (wallet(me) < CANTINE.price) return reply(c, `💸 Le repas coûte ${FM(CANTINE.price)}.`);
  addMoney(me, -CANTINE.price);
  g.cd.cantine = Date.now();
  g.energy = Math.min(ENERGY_MAX, g.energy + CANTINE.energy);
  addMood(g, CANTINE.mood);
  bump(me, "cantine");
  return finish(c, `🍽️ CANTINE\n${L("─", 40)}\n${pick(["Attiéké-poisson, un régal !", "Riz sauce graine, bien copieux.", "Alloco et poulet braisé, quel festin !"])}\n⚡ +${CANTINE.energy} → ${Math.floor(g.energy)}/${ENERGY_MAX}  •  😊 +${CANTINE.mood}  •  💸 -${FM(CANTINE.price)}`);
}

async function cmdSleep(c) {
  const g = c.me.g;
  const left = cdLeft(g, "dormir", DORMIR.cd);
  if (left) return reply(c, `⏳ Tu viens de te reposer. Reviens dans ${left}.`);
  if (g.energy >= ENERGY_MAX) return reply(c, "😋 Tu es déjà en pleine forme !");
  g.cd.dormir = Date.now();
  g.energy = Math.min(ENERGY_MAX, g.energy + DORMIR.energy);
  addMood(g, DORMIR.mood);
  return finish(c, `😴 SOMMEIL\n${L("─", 40)}\nUne bonne sieste réparatrice.\n⚡ +${DORMIR.energy} → ${Math.floor(g.energy)}/${ENERGY_MAX}  •  😊 +${DORMIR.mood}`);
}

async function cmdSport(c) {
  const g = c.me.g;
  const left = cdLeft(g, "sport", SPORT.cd);
  if (left) return reply(c, `⏳ Tu es encore essoufflé. Reviens dans ${left}.`);
  if (tired(c, SPORT.energy)) return;
  g.cd.sport = Date.now();
  g.energy -= SPORT.energy;
  addMood(g, SPORT.mood);
  bump(c.me, "sport");
  return finish(c, `⚽ SPORT\n${L("─", 40)}\n${pick(["Match de foot dans la cour !", "Course autour du terrain.", "Partie de basket avec les copains."])}\n😊 Moral : +${SPORT.mood} → ${g.mood}/100  •  ⚡ ${Math.floor(g.energy)}/${ENERGY_MAX}`);
}

async function cmdSkip(c) {
  const g = c.me.g;
  if (done(g)) return reply(c, "🎓 Tu n'as plus de cours à sécher !");
  const left = cdLeft(g, "seche", SECHE.cd);
  if (left) return reply(c, `⏳ Tu as déjà séché récemment. Reviens dans ${left}.`);
  g.cd.seche = Date.now();
  g.stats.seche++;
  if (Math.random() < SECHE.caught) {
    addMood(g, -SECHE.punish);
    g.progress = Math.max(0, g.progress - 5);
    return finish(c, `🚨 ATTRAPÉ !\n${L("─", 40)}\nLe surveillant t'a surpris en train de sécher : retenue le samedi.\n😊 Moral : -${SECHE.punish}  •  📈 Progression : -5`);
  }
  addMood(g, SECHE.mood);
  g.energy = Math.min(ENERGY_MAX, g.energy + 5);
  return finish(c, `😎 TU AS SÉCHÉ !\n${L("─", 40)}\nPersonne ne t'a vu partir. Journée glandouille au maquis !\n😊 Moral : +${SECHE.mood} → ${g.mood}/100`);
}

// ============================================================
//  💼 MÉTIERS
// ============================================================
const findJob = (s) => { const q = strip(s); return Object.keys(JOBS).find((id) => JOBS[id].alias.includes(q) || id === q); };

async function cmdJobs(c) {
  const g = c.me.g, lvl = eduLevel(g);
  let txt = `💼 MÉTIERS\n${L("═", 40)}\nDiplômes : ${g.diplomas.length ? g.diplomas.join(", ") : "aucun"} (niveau ${lvl})\n`;
  const names = ["Sans diplôme", "CEPE", "BEPC", "BAC", "Licence", "Master", "Doctorat"];
  for (let l = 0; l <= 6; l++) {
    const ids = Object.keys(JOBS).filter((id) => JOBS[id].lvl === l);
    if (!ids.length) continue;
    txt += `\n${lvl >= l ? "✅" : "🔒"} ${names[l]}\n` + ids.map((id) => `   ${JOBS[id].emoji} ${JOBS[id].nom} (${JOBS[id].alias[0]}) — ${FM(JOBS[id].pay[0])} à ${FM(JOBS[id].pay[1])}${JOB_FILS[id] ? ` • ${JOB_FILS[id].map((f) => FILS[f].emoji).join("")}` : ""}`).join("\n");
  }
  txt += `\n\n🧭 Filière : ${g.fil ? `${FILS[g.fil].emoji} ${FILS[g.fil].nom}` : "aucune"} (les emojis après un métier = filières acceptées dès la Licence)`;
  if (g.job) txt += `\n▶️ Ton métier : ${JOBS[g.job.id].emoji} ${JOBS[g.job.id].nom} (${rankOf(g.job).nom})`;
  txt += `\n\nEntretien : ecole candidater <métier>\nExemple : ecole candidater infirmier\n⭐ Rangs : Stagiaire → Confirmé (15 services) → Senior (40) → Directeur (100)`;
  return reply(c, txt);
}

async function cmdApply(c) {
  const me = c.me, g = me.g;
  const id = findJob(c.args[1]);
  if (!id) return reply(c, "❓ Métier introuvable. Tape « ecole metiers » pour voir la liste.");
  const j = JOBS[id], lvl = eduLevel(g);
  if (g.job && g.job.id === id) return reply(c, `💼 Tu fais déjà ce métier (${rankOf(g.job).nom}).`);
  if (lvl < j.lvl) return reply(c, `🔒 ${j.emoji} ${j.nom} demande ${j.lvl} diplôme(s) : tu en as ${lvl}.`);
  const okFils = JOB_FILS[id];
  if (okFils && j.lvl >= 4 && !okFils.includes(g.fil)) return reply(c, `🧭 ${j.emoji} ${j.nom} demande une de ces filières : ${okFils.map((f) => `${FILS[f].emoji} ${FILS[f].nom}`).join(", ")}.\nTa filière : ${g.fil ? `${FILS[g.fil].emoji} ${FILS[g.fil].nom}` : "aucune"}.`);
  const left = cdLeft(g, "interview", INTERVIEW_CD);
  if (left) return reply(c, `⏳ Le recruteur te rappellera. Prochain entretien dans ${left}.`);
  g.cd.interview = Date.now();

  const a = avg(g);
  const chance = clamp(0.55 + 0.06 * (lvl - j.lvl) + ((a === null ? 10 : a) - 10) * 0.02, 0.30, 0.95);
  if (Math.random() >= chance) return finish(c, `📋 ENTRETIEN D'EMBAUCHE\n${L("─", 40)}\n❌ Le recruteur a choisi un autre candidat pour « ${j.nom} ».\n🎲 Chances : ${Math.round(chance * 100)} %  (de bonnes notes aident !)`);
  const had = g.job ? JOBS[g.job.id].nom : null;
  g.job = { id, shifts: 0 };
  return finish(c, `🎉 EMBAUCHÉ !\n${L("─", 40)}\n${j.emoji} Tu es maintenant ${j.nom} (Stagiaire).${had ? `\n(Tu quittes ton ancien poste : ${had})` : ""}\n💰 Salaire : ${FM(j.pay[0])} à ${FM(j.pay[1])} par service\n👉 Travaille avec « ecole travailler »\n🎲 Chances : ${Math.round(chance * 100)} %`);
}

async function cmdWork(c) {
  const me = c.me, g = me.g;
  if (!g.job) return reply(c, "💼 Tu n'as pas de métier. Choisis-en un : ecole metiers");
  const left = cdLeft(g, "work", WORK.cd);
  if (left) return reply(c, `⏳ Tu as besoin de souffler. Prochain service dans ${left}.`);
  if (tired(c, WORK.energy)) return;
  const j = JOBS[g.job.id], r = rankOf(g.job);
  g.cd.work = Date.now();
  g.energy -= WORK.energy;
  const pay = Math.floor(rand(j.pay[0], j.pay[1]) * r.mult);
  addMoney(me, pay);
  g.job.shifts++; g.stats.shifts++;
  addMood(g, -3);
  const nr = rankOf(g.job);
  bump(me, "work");
  let ev = "";
  if (Math.random() < WORK_EVENT) {
    const roll = rand(1, 3);
    if (roll === 1) { const x = Math.floor(rand($(100), $(300)) * r.mult); addMoney(me, x); ev = `\n\n💎 ÉVÉNEMENT : ton chef te donne une prime exceptionnelle ! +${FM(x)}`; }
    else if (roll === 2) { const x = Math.floor(rand($(50), $(150)) * r.mult); addMoney(me, x); addMood(g, 8); ev = `\n\n🤩 ÉVÉNEMENT : un client VIP t'a laissé un gros pourboire ! +${FM(x)} et 😊 +8`; }
    else { const x = Math.min(wallet(me), rand($(40), $(120))); addMoney(me, -x); addMood(g, -8); ev = `\n\n🕵️ ÉVÉNEMENT : contrôle surprise, tu paies une amende de ${FM(x)}. (-8 😊)`; }
  }
  let txt = `${j.emoji} SERVICE : ${j.nom.toUpperCase()}\n${L("─", 40)}\n${pick(WORK_LINES)}\n💰 Salaire : +${FM(pay)}  (${r.nom} ×${r.mult})\n💵 Portefeuille : ${FM(wallet(me))}  •  ⚡ ${Math.floor(g.energy)}/${ENERGY_MAX}`;
  if (nr.nom !== r.nom) txt += `\n\n⭐ PROMOTION : tu deviens ${nr.nom} (salaire ×${nr.mult}) !`;
  return finish(c, txt + ev);
}

async function cmdQuit(c) {
  const g = c.me.g;
  if (!g.job) return reply(c, "💼 Tu n'as pas de métier.");
  const n = JOBS[g.job.id].nom;
  g.job = null;
  return finish(c, `👋 Tu as démissionné de ton poste de ${n}. Ton ancienneté est perdue.`);
}

// ============================================================
//  🗓️ PRÉSENCE, 🎯 OBJECTIFS, 🧭 FILIÈRE, 🛒 FOURNITURES
// ============================================================

// Présence quotidienne : plus la série est longue, plus la récompense grandit
async function cmdPresence(c) {
  const me = c.me, g = me.g;
  const left = cdLeft(g, "present", PRESENCE.cd);
  if (left) return reply(c, `⏳ Tu as déjà signé le cahier aujourd'hui. Reviens dans ${left}.`);
  const last = g.cd.present || 0;
  const broken = last && Date.now() - last > 2 * DAY && g.streak > 1;
  g.streak = last && Date.now() - last <= 2 * DAY ? g.streak + 1 : 1;
  g.cd.present = Date.now();
  const bonus = Math.min(g.streak - 1, PRESENCE.streak_max) * PRESENCE.per_streak;
  const reward = rand(PRESENCE.base[0], PRESENCE.base[1]) + bonus;
  addMoney(me, reward);
  g.energy = Math.min(ENERGY_MAX, g.energy + PRESENCE.energy);
  addMood(g, PRESENCE.mood);
  bump(me, "present");
  let txt = `🗓️ PRÉSENCE\n${L("─", 40)}\n✅ Tu as signé le cahier de présence.\n🔥 Série : ${g.streak} jour(s)\n💰 Prime d'assiduité : +${FM(reward)} (série +${FM(bonus)})\n⚡ +${PRESENCE.energy}  •  😊 +${PRESENCE.mood}`;
  if (broken) txt += "\n💔 Ta série précédente avait été brisée.";
  return finish(c, txt);
}

async function cmdQuests(c) {
  const g = c.me.g, quest = ensureQuests(g);
  const doneN = quest.list.filter((e) => e.done).length;
  let txt = `🎯 OBJECTIFS DU JOUR\n${L("═", 40)}\n`;
  for (const e of quest.list) {
    const q = QUEST_POOL.find((x) => x.id === e.id);
    if (q) txt += `${e.done ? "✅" : "🔸"} ${q.text}  [${e.got}/${q.need}]\n`;
  }
  txt += `\n🎁 Coffre bonus : ${quest.bonus ? "déjà récupéré !" : `termine les ${quest.list.length} objectifs (${doneN}/${quest.list.length})`}`;
  txt += `\n🔄 Nouveaux objectifs dans ${dur((todayNum() + 1) * DAY - Date.now())}\n💡 Les récompenses grandissent avec ton niveau d'études.`;
  await save(c.usersData, c.me);
  return reply(c, txt);
}

// Filière : à choisir (une seule fois) à partir du Lycée, obligatoire avant la Licence
async function cmdFiliere(c) {
  const me = c.me, g = me.g;
  const f = c.args[1] ? findFil(c.args[1]) : null;
  if (!f) {
    let txt = `🧭 FILIÈRES UNIVERSITAIRES\n${L("═", 40)}\n`;
    txt += Object.entries(FILS).map(([id, x]) => `${x.emoji} ${x.nom} (${id})`).join("\n");
    txt += `\n\n👉 Choisis : ecole filiere <nom>\nExemple : ecole filiere sante\n\n🩺 Santé → Médecin  •  ⚖️ Droit → Avocat, Ministre\n💻 Info → Développeur  •  🔬 Sciences → Ingénieur, Chercheur\n📈 Éco → Cadre bancaire  •  📖 Lettres → Journaliste`;
    txt += `\n\nTa filière : ${g.fil ? `${FILS[g.fil].emoji} ${FILS[g.fil].nom}` : "aucune"}`;
    return reply(c, txt);
  }
  if (g.fil) return reply(c, `🧭 Tu as déjà choisi ta filière : ${FILS[g.fil].emoji} ${FILS[g.fil].nom}. Elle est définitive !`);
  if (g.stage < 2) return reply(c, "🎒 Tu pourras choisir ta filière à partir du Lycée.");
  g.fil = f;
  return finish(c, `🧭 FILIÈRE CHOISIE : ${FILS[f].emoji} ${FILS[f].nom}\n${L("─", 40)}\nC'est définitif ! Elle décidera de tes métiers après la Licence.\n💼 Voir les métiers : ecole metiers`);
}

async function cmdShop(c, forced) {
  const me = c.me, g = me.g;
  const sub = forced || strip(c.args[1]);
  const off = forced ? 1 : 2;

  if (["inv", "inventaire", "sac"].includes(sub)) {
    const owned = Object.keys(g.inv).filter((k) => ITEMS[k] && g.inv[k] > 0);
    if (!owned.length) return reply(c, "🎒 Ton cartable est vide. Tape « ecole boutique » pour voir les fournitures.");
    return reply(c, `🎒 TON CARTABLE\n${L("═", 40)}\n` + owned.map((k) => `${ITEMS[k].emoji} ${ITEMS[k].nom} x${g.inv[k]}`).join("\n"));
  }

  if (["buy", "acheter", "achat"].includes(sub)) {
    const id = findItem(c.args[off]);
    if (!id) return reply(c, "❓ Objet introuvable. Tape « ecole boutique » pour voir la liste.");
    const qty = c.args[off + 1] ? parseInt(c.args[off + 1]) : 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return reply(c, "⚠️ Quantité invalide (entre 1 et 20).");
    if (id === "ordinateur" && (qty > 1 || (g.inv.ordinateur || 0) > 0)) return reply(c, "💻 Un seul ordinateur suffit, tu l'as déjà !");
    const it = ITEMS[id], total = it.prix * qty;
    if (wallet(me) < total) return reply(c, `💸 Il te faut ${FM(total)} (tu as ${FM(wallet(me))}).`);
    addMoney(me, -total);
    g.inv[id] = (g.inv[id] || 0) + qty;
    return finish(c, `✅ Achat : ${it.emoji} ${it.nom} x${qty} pour ${FM(total)}.\n💵 Portefeuille : ${FM(wallet(me))}`);
  }

  let txt = `🛒 BOUTIQUE SCOLAIRE\n${L("═", 40)}\n`;
  for (const it of Object.values(ITEMS)) txt += `${it.emoji} ${it.nom} — ${FM(it.prix)}\n   ↳ ${it.desc}\n`;
  txt += `\nAcheter : ecole acheter <objet> [quantité]\nExemple : ecole acheter cahier 2`;
  return reply(c, txt);
}

async function cmdUse(c) {
  const g = c.me.g;
  const id = findItem(c.args[1]);
  if (id !== "snack") return reply(c, "⚠️ Utilisation : ecole utiliser snack\n(cahier et calculatrice s'utilisent tout seuls, l'ordinateur aussi)");
  if (!(g.inv.snack > 0)) return reply(c, "🍫 Tu n'as pas de snack. Achète-en : ecole acheter snack");
  if (g.energy >= ENERGY_MAX) return reply(c, "😋 Tu es déjà en pleine forme !");
  g.inv.snack--;
  g.energy = Math.min(ENERGY_MAX, g.energy + 10);
  return finish(c, `🍫 Miam ! ⚡ +10 → ${Math.floor(g.energy)}/${ENERGY_MAX}`);
}

// ============================================================
//  🚦 ROUTES
// ============================================================
const ROUTES = {
  help: cmdHelp, aide: cmdHelp,
  stat: cmdStat, status: cmdStat, profil: cmdStat, fiche: cmdStat, eleve: cmdStat,
  bulletin: cmdReport, notes: cmdReport,
  diplomes: cmdDiplomas, diplome: cmdDiplomas, succes: cmdDiplomas,
  top: cmdTop, classement: cmdTop,
  cours: cmdClass, classe: cmdClass, class: cmdClass, etudier: cmdClass,
  devoirs: cmdHomework, devoir: cmdHomework, homework: cmdHomework,
  reviser: cmdRevise, revision: cmdRevise, revisions: cmdRevise,
  examen: cmdExam, exam: cmdExam, composition: cmdExam,
  inscription: cmdEnroll, inscrire: cmdEnroll, rentree: cmdEnroll,
  entraide: cmdHelpMate, groupe: cmdHelpMate,
  bourse: cmdScholarship,
  present: cmdPresence, presence: cmdPresence, appel: cmdPresence, pointer: cmdPresence,
  objectifs: cmdQuests, objectif: cmdQuests, quetes: cmdQuests, quete: cmdQuests, missions: cmdQuests,
  filiere: cmdFiliere, filieres: cmdFiliere, orientation: cmdFiliere,
  boutique: (c) => cmdShop(c), shop: (c) => cmdShop(c),
  acheter: (c) => cmdShop(c, "buy"), buy: (c) => cmdShop(c, "buy"),
  sac: (c) => cmdShop(c, "inv"), cartable: (c) => cmdShop(c, "inv"), inv: (c) => cmdShop(c, "inv"),
  utiliser: cmdUse, use: cmdUse,
  cantine: cmdCanteen, manger: cmdCanteen,
  dormir: cmdSleep, sieste: cmdSleep, repos: cmdSleep,
  sport: cmdSport, foot: cmdSport,
  seche: cmdSkip, secher: cmdSkip, buissonniere: cmdSkip,
  metiers: cmdJobs, metier: cmdJobs, jobs: cmdJobs, carriere: cmdJobs,
  candidater: cmdApply, postuler: cmdApply, entretien: cmdApply,
  travailler: cmdWork, travail: cmdWork, work: cmdWork, boulot: cmdWork, service: cmdWork,
  demissionner: cmdQuit, demission: cmdQuit, quitter: cmdQuit
};

// ─── Export ───────────────────────────────────────────────────
module.exports = {
  config: {
    name: CMD,
    aliases: ["school", "classe", "eleve"],
    version: "2.0",
    author: "Camille Uchiha 🍓",
    countDown: 3,
    role: 0,
    description: { fr: "🎓 École : du CEPE au Doctorat, examens, énergie, bourses et métiers." },
    category: "economy",
    guide: { fr: "Tapez 'ecole help' pour voir toutes les commandes." }
  },

  onStart: async function ({ message, event, args, api, usersData }) {
    const c = { message, event, args, api, usersData, uid: String(event.senderID), botID: String(api.getCurrentUserID()), names: new Map(), players: new Map() };
    c.me = await getP(c, c.uid);

    // 🎁 Première rentrée : argent de poche offert
    if (!c.me.g.welcomed) {
      c.me.g.welcomed = true;
      addMoney(c.me, STARTER_MONEY);
      await save(usersData, c.me);
      await message.reply(B(`🎒 BIENVENUE À L'ÉCOLE !\n${L("═", 40)}\nTu commences en ${CURSUS[0].emoji} ${CURSUS[0].nom} (${CURSUS[0].classes[0]}) avec ${FM(STARTER_MONEY)} d'argent de rentrée 🎁\n\n📚 Va en cours, fais tes devoirs, révise et réussis tes examens.\n🧾 Chaque nouvelle classe coûte des frais d'inscription : gère ton argent !\n🎓 CEPE → BEPC → BAC → Licence → Master → Doctorat → 💼 MÉTIER\n\nTape « ecole help » pour tout voir.`));
    }

    // Sans argument : ta fiche. Avec une mention seule : la fiche de la personne.
    const sub = strip(args[0] || "stat");
    let handler = ROUTES[sub];
    if (!handler && Object.keys(event.mentions || {}).length) handler = cmdStat;
    if (!handler) return reply(c, "❓ Commande inconnue. Tapez 'ecole help' pour voir la liste.");

    try {
      return await handler(c);
    } catch (e) {
      console.error("[ecole]", e);
      return message.reply("❌ Une erreur est survenue. Réessaie dans un instant.");
    }
  }
};
