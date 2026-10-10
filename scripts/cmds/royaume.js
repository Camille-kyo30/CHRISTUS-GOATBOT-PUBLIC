// ============================================================
//  royaume.js — 👑 ROYAUME : tout le jeu dans UNE seule commande
//  (même principe que mafia.js : une commande + des sous-commandes)
//
//  Tout le monde commence PAYSAN et monte jusqu'à ROI :
//    🌾 Paysan → 🏘️ Villageois → 🛡️ Chevalier → 🏰 Baron → 🦅 Comte → ⚜️ Duc → 👑 Roi
//
//  Le titre change TOUT (liens entre les systèmes) :
//   • Le labeur (royaume work) dépend du titre : gains et délais différents.
//   • Les nobles ont des VASSAUX qui leur versent un impôt à chaque labeur.
//   • Créer une entreprise demande d'être au moins Villageois ;
//     les revenus de l'entreprise grimpent avec le titre du patron.
//   • En duel, les nobles ont plus de points de vie.
//   • Au vol (rob), un titre supérieur augmente tes chances.
//   • Le bonus du daily grandit avec le titre.
//   • Se marier demande une 💍 Bague, monter sur le trône une 👑 Couronne (boutique).
//
//  Données : tout est rangé dans UN seul objet par joueur : data.game
//  L'argent utilise le portefeuille normal du bot (user.money).
//
//  Pour installer : mets ce fichier dans scripts/cmds/ et SUPPRIME les anciennes
//  commandes séparées (daily, work, pay, rob, top, bio, bank, shop, slots,
//  coinflip, marry, divorce, couple, ship, adopt, disown, family, duel,
//  company, profil) : tout est maintenant ici.
// ============================================================

"use strict";

// Police "gras" du bot (comme mafia.js). Si le fichier n'existe pas, on affiche du texte normal.
let fonts = null;
try { fonts = require("../../func/font.js"); } catch (e) { fonts = null; }
const B = (s) => { try { return fonts && typeof fonts.bold === "function" ? fonts.bold(s) : s; } catch (e) { return s; } };

const CMD = "royaume";
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// ─── ⚙️ RÉGLAGES (modifie ces valeurs pour équilibrer ton économie) ───
const REQ_TIMEOUT = 2 * MIN;     // une demande (mariage, duel…) expire après 2 minutes
const MAX_TX = 30;               // taille de l'historique des transactions

// Daily
const DAILY_MIN = 150, DAILY_MAX = 300;
const DAILY_STREAK_BONUS = 25, DAILY_STREAK_MAX = 14;
const DAILY_TITLE_BONUS = 0.10;  // +10 % par rang de titre

// Pay
const PAY_TAX = 0;               // taxe en % sur les transferts (0 = aucune)

// Rob (vol)
const ROB_CD = 30 * MIN;
const ROB_BASE = 0.45, ROB_PER_RANK = 0.04;     // 45 % de base, ±4 % par rang d'écart de titre
const ROB_MIN_CH = 0.15, ROB_MAX_CH = 0.70;
const ROB_STEAL_MIN = 0.10, ROB_STEAL_MAX = 0.30, ROB_CAP = 500;
const ROB_FINE = 100, ROB_VICTIM_MIN = 100;

// Banque
const BANK_RATE = 0.02;          // 2 % par jour
const BANK_MAX_DAYS = 7;         // jours d'intérêts cumulables
const BANK_CAP = 100000;         // seuls les 100 000 premiers $ rapportent

// Jeux
const SLOT_MIN = 10, SLOT_MAX = 5000, SLOT_PAIR = 1.5;
const COIN_MIN = 10, COIN_MAX = 10000;

// Famille / duel
const MAX_CHILDREN = 5;
const DUEL_HP = 100, DUEL_HP_PER_RANK = 8, DUEL_ROUNDS = 30, DUEL_LOG = 10;

// Entreprise
const CO_COST = 3000;            // prix de création
const CO_MAX_HOURS = 24;         // le coffre se remplit au maximum 24 h
const CO_BOOST = 0.10;           // +10 % de revenus par employé
const CO_SHARE = 0.20;           // 20 % du coffre partagé entre les employés
const CO_TITLE_BONUS = 0.05;     // +5 % par rang de titre du patron
const NAME_MIN = 3, NAME_MAX = 20;

// Royaume
const TAX_RATE = 0.10;           // impôt : 10 % du labeur d'un vassal va à son seigneur
const ANOBLIR_FEE = 0.20;        // frais de lettres de noblesse : 20 % du prix du titre
const REVOLT_COST = 100000, REVOLT_CD = DAY;
const DECREE_MAX = 120;
const BAD_LUCK = 0.08;           // 8 % de chances d'un labeur raté (gain /2)

// ─── Données du jeu ───────────────────────────────────────────

// Les titres, du plus bas au plus haut.
//  prix : coût de la promotion | vassauxReq : vassaux requis | vassauxMax : vassaux maximum
//  work : le labeur de la classe (cd en minutes, gain [min, max])
const TITLES = [
  { id: "paysan", emoji: "🌾", nom: "Paysan", prix: 0, vassauxReq: 0, vassauxMax: 0,
    work: { label: "Labourer les champs", cd: 30, gain: [40, 90],
      lines: ["Tu as labouré les champs sous le soleil.", "Tu as récolté du blé jusqu'au soir.", "Tu as nourri les bêtes et réparé la clôture."] } },
  { id: "villageois", emoji: "🏘️", nom: "Villageois", prix: 1500, vassauxReq: 0, vassauxMax: 0,
    work: { label: "Tenir un commerce", cd: 45, gain: [90, 170],
      lines: ["Ta boutique ne désemplit pas aujourd'hui.", "Tu as vendu tes marchandises au marché.", "Un voyageur t'a acheté tout ton stock !"] } },
  { id: "chevalier", emoji: "🛡️", nom: "Chevalier", prix: 8000, vassauxReq: 0, vassauxMax: 3,
    work: { label: "Administrer son fief", cd: 60, gain: [200, 320],
      lines: ["Tu as rendu la justice dans ton fief.", "Tu as escorté une caravane marchande.", "Tu as chassé des bandits de tes terres."] } },
  { id: "baron", emoji: "🏰", nom: "Baron", prix: 25000, vassauxReq: 1, vassauxMax: 6,
    work: { label: "Gérer sa baronnie", cd: 60, gain: [400, 600],
      lines: ["Tu as tenu conseil dans ton château.", "Tes terres ont produit une belle récolte.", "Tu as signé un traité avantageux."] } },
  { id: "comte", emoji: "🦅", nom: "Comte", prix: 80000, vassauxReq: 3, vassauxMax: 10,
    work: { label: "Gouverner son comté", cd: 60, gain: [700, 1000],
      lines: ["Tu as présidé le tribunal du comté.", "Les marchands de ton comté ont payé leurs taxes.", "Tu as fait bâtir un nouveau pont."] } },
  { id: "duc", emoji: "⚜️", nom: "Duc", prix: 200000, vassauxReq: 6, vassauxMax: 15,
    work: { label: "Diriger son duché", cd: 60, gain: [1100, 1600],
      lines: ["Tu as réuni tes vassaux en grand conseil.", "Ton duché prospère sous ton règne.", "Tu as reçu des ambassadeurs étrangers."] } },
  { id: "roi", emoji: "👑", nom: "Roi", prix: 1000000, vassauxReq: 10, vassauxMax: 25,
    work: { label: "Régner sur le royaume", cd: 60, gain: [2000, 3000],
      lines: ["Tu as tenu audience dans la salle du trône.", "Le trésor royal s'est bien rempli.", "Tu as signé un décret qui a fait trembler le royaume."] } }
];
const TBY = {};
TITLES.forEach((t, i) => { t.rank = i; TBY[t.id] = t; });

// Boutique : l'identifiant (clé) est ce qui est stocké dans l'inventaire
const ITEMS = {
  shield: { emoji: "🛡️", nom: "Bouclier", prix: 400, desc: "Bloque 1 vol (rob)", alias: ["shield", "bouclier"] },
  clover: { emoji: "🍀", nom: "Trèfle", prix: 300, desc: "Seconde chance au slots", alias: ["clover", "trefle"] },
  ring: { emoji: "💍", nom: "Bague", prix: 1000, desc: "Requise pour demander en mariage", alias: ["ring", "bague"] },
  crown: { emoji: "👑", nom: "Couronne", prix: 5000, desc: "Requise pour monter sur le trône", alias: ["crown", "couronne"] }
};

// Machine à sous : weight = fréquence, mult = gain pour 3 symboles identiques
const SYMBOLS = [
  { icon: "🍒", weight: 5, mult: 3 }, { icon: "🍋", weight: 5, mult: 3 },
  { icon: "🍇", weight: 4, mult: 5 }, { icon: "🔔", weight: 3, mult: 8 },
  { icon: "💎", weight: 2, mult: 15 }, { icon: "7️⃣", weight: 1, mult: 40 }
];
const SLOT_TOTAL = SYMBOLS.reduce((s, x) => s + x.weight, 0);

// Niveaux d'entreprise : revenu/h, coût pour passer au niveau suivant, employés max
const CO_LEVELS = {
  1: { income: 25, up: 6000, staff: 2 },
  2: { income: 55, up: 15000, staff: 4 },
  3: { income: 100, up: 40000, staff: 6 },
  4: { income: 160, up: 90000, staff: 8 },
  5: { income: 250, up: null, staff: 10 }
};
const CO_MAX_LEVEL = 5;

// Succès : test(p) reçoit le joueur chargé (p.g = données de jeu, p.user = utilisateur)
const ACH = {
  PREMIER_LABEUR: { emoji: "💼", nom: "Premier labeur", desc: "Travailler une première fois", test: (p) => p.g.stats.works >= 1 },
  SERIE_7: { emoji: "🔥", nom: "Série 7 jours", desc: "7 jours de daily d'affilée", test: (p) => p.g.streak >= 7 },
  BANQUIER: { emoji: "🏦", nom: "Banquier", desc: "100 000 $ en banque", test: (p) => p.g.bank >= 100000 },
  MILLIONNAIRE: { emoji: "💰", nom: "Millionnaire", desc: "1 000 000 $ de patrimoine", test: (p) => wallet(p) + p.g.bank >= 1000000 },
  MARIE: { emoji: "💍", nom: "Marié(e)", desc: "Se marier", test: (p) => !!p.g.spouse },
  PARENT: { emoji: "👶", nom: "Parent", desc: "Adopter un enfant", test: (p) => p.g.children.length >= 1 },
  GRANDE_FAMILLE: { emoji: "👨‍👩‍👧‍👦", nom: "Grande famille", desc: "Avoir 3 enfants", test: (p) => p.g.children.length >= 3 },
  PATRON: { emoji: "🏢", nom: "Patron", desc: "Créer une entreprise", test: (p) => !!p.g.company },
  EMPIRE: { emoji: "🏭", nom: "Empire", desc: "Entreprise niveau 5", test: (p) => !!p.g.company && p.g.company.level >= 5 },
  DUELLISTE: { emoji: "⚔️", nom: "Duelliste", desc: "10 duels gagnés", test: (p) => p.g.duel.w >= 10 },
  VOLEUR: { emoji: "🥷", nom: "Voleur", desc: "10 vols réussis", test: (p) => p.g.stats.robsOk >= 10 },
  JACKPOT: { emoji: "🎰", nom: "Jackpot", desc: "Gagner un jackpot au slots", test: (p) => p.g.stats.jackpots >= 1 },
  CHEVALIER: { emoji: "🛡️", nom: "Noble", desc: "Devenir chevalier", test: (p) => rankOf(p.g) >= 2 },
  COMTE: { emoji: "🦅", nom: "Haute noblesse", desc: "Devenir comte", test: (p) => rankOf(p.g) >= 4 },
  SUZERAIN: { emoji: "⚔️", nom: "Suzerain", desc: "Avoir 5 vassaux", test: (p) => p.g.vassals.length >= 5 },
  ROI: { emoji: "👑", nom: "Roi", desc: "Monter sur le trône", test: (p) => p.g.title === "roi" }
};

const YES = ["oui", "yes", "y", "o", "ok", "d'accord", "daccord", "accepte", "j'accepte", "jaccepte"];
const NO = ["non", "no", "n", "nope", "refuse", "je refuse"];

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (n) => String(Math.floor(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const FM = (n) => `${fmt(n)} $`;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = (arr) => arr[rand(0, arr.length - 1)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const L = (ch = "─", n = 40) => ch.repeat(n);
const day = (ts) => new Date(ts || Date.now()).toLocaleDateString("fr-FR");
const vas = (n) => (n > 1 ? "vassaux" : "vassal");
const num = (s) => (/^\d{1,12}$/.test(s || "") ? parseInt(s) : NaN);
const lastNum = (args) => { const n = args.filter((a) => /^\d{1,12}$/.test(a)); return n.length ? parseInt(n[n.length - 1]) : NaN; };
// Minuscules sans accents : "Révolte" -> "revolte"
const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
// Barre de progression ████░░░░
const bar = (v, max, w = 20) => { const f = Math.floor(clamp(v / (max || 1), 0, 1) * w); return "█".repeat(f) + "░".repeat(w - f); };
// Durée lisible : "2h 5m" / "3m 10s" / "40s"
function dur(ms) {
  const h = Math.floor(ms / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}
// Nombre stable à partir d'un texte (pour ship : même duo = même résultat)
function hash(str) { let h = 0; for (const ch of str) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }

// ─── Joueur : chargement / sauvegarde ─────────────────────────

function initGame() {
  return {
    xp: 0,
    title: "paysan",
    lord: null,                 // id du seigneur
    vassals: [],                // ids des vassaux
    spouse: null,               // { id, since }
    parent: null,               // id du parent
    children: [],               // [{ id, since }]
    bio: "",
    bank: 0, bankAt: 0,
    inv: {},                    // { shield: 1, ring: 2, ... }
    company: null,              // { name, level, since, last, vault, staff: [ids] }
    job: null,                  // { owner: id } si employé
    duel: { w: 0, l: 0 },
    stats: { works: 0, robsOk: 0, robsFail: 0, jackpots: 0 },
    streak: 0,
    cd: {},                     // cooldowns : work, daily, rob, revolt
    decree: null,               // { text, date } (roi)
    achievements: [],
    tx: []                      // historique
  };
}

// Complète les données manquantes (anciens joueurs, nouvelles fonctions…)
function normalize(raw) {
  const d = initGame();
  const g = Object.assign(initGame(), raw || {});
  g.duel = Object.assign(d.duel, (raw && raw.duel) || {});
  g.stats = Object.assign(d.stats, (raw && raw.stats) || {});
  g.cd = Object.assign({}, (raw && raw.cd) || {});
  g.inv = Object.assign({}, (raw && raw.inv) || {});
  for (const k of ["vassals", "children", "achievements", "tx"]) if (!Array.isArray(g[k])) g[k] = [];
  if (!TBY[g.title]) g.title = "paysan";
  g.bank = Number(g.bank) || 0;
  g.xp = Number(g.xp) || 0;
  if (g.company && g.company.name) {
    g.company.staff = Array.isArray(g.company.staff) ? g.company.staff : [];
    g.company.level = CO_LEVELS[g.company.level] ? g.company.level : 1;
    g.company.vault = Number(g.company.vault) || 0;
  } else g.company = null;
  return g;
}

const rankOf = (g) => TBY[g.title].rank;
const wallet = (p) => Number(p.user.money) || 0;
function addMoney(p, n) { p.user.money = Math.max(0, wallet(p) + n); }
function addTx(g, type, montant, desc) {
  g.tx.push({ type, montant, desc, date: Date.now() });
  if (g.tx.length > MAX_TX) g.tx = g.tx.slice(-MAX_TX);
}
const levelOf = (xp) => Math.floor(Math.sqrt((xp || 0) / 40)) + 1;
const xpFor = (lvl) => 40 * (lvl - 1) * (lvl - 1);
const gainXp = (g, n) => { g.xp += n; };
// Temps restant d'un cooldown (texte) ou null s'il est prêt
const cdLeft = (g, key, ms) => { const d = ms - (Date.now() - (g.cd[key] || 0)); return d > 0 ? dur(d) : null; };

// Intérêts de la banque, versés automatiquement à chaque chargement du joueur
function applyInterest(g) {
  const now = Date.now();
  if (g.bank <= 0) { g.bank = 0; g.bankAt = now; return 0; }
  const last = g.bankAt || now;
  const raw = Math.floor((now - last) / DAY);
  if (raw <= 0) return 0;
  const days = Math.min(raw, BANK_MAX_DAYS);
  const interest = Math.floor(Math.min(g.bank, BANK_CAP) * (Math.pow(1 + BANK_RATE, days) - 1));
  g.bank += interest;
  g.bankAt = raw > BANK_MAX_DAYS ? now : last + days * DAY;
  return interest;
}

// Charge un joueur : p = { uid, user, g, interest }
async function load(usersData, uid) {
  let user = await usersData.get(uid);
  if (!user) user = { money: 0, exp: 0, data: {} };
  if (!user.data) user.data = {};
  user.data.game = normalize(user.data.game);
  const p = { uid: String(uid), user, g: user.data.game, interest: 0 };
  p.interest = applyInterest(p.g);
  return p;
}
async function save(usersData, p) {
  await usersData.set(p.uid, { money: wallet(p), data: p.user.data });
}

// Nom d'un joueur (mis en cache pendant la commande)
async function nm(c, id) {
  id = String(id);
  if (!c.names.has(id)) {
    let n = null;
    try { n = await c.usersData.getName(id); } catch (e) { /* on prend le nom par défaut */ }
    c.names.set(id, n || `Utilisateur ${id.slice(-4)}`);
  }
  return c.names.get(id);
}

// Qui est la cible ? mention > réponse à un message > (option) un UID tapé
function targetOf(event, args) {
  let id = Object.keys(event.mentions || {})[0];
  if (!id && event.messageReply) id = event.messageReply.senderID;
  if (!id && args) { const n = args.find((a) => /^\d{8,}$/.test(a)); if (n) id = n; }
  return id ? String(id) : null;
}

// Vérifie les succès d'un joueur et retourne les nouveaux
function checkAch(p) {
  const fresh = [];
  for (const [id, a] of Object.entries(ACH)) {
    if (!p.g.achievements.includes(id) && a.test(p)) { p.g.achievements.push(id); fresh.push(id); }
  }
  return fresh;
}

// ─── Réponses ─────────────────────────────────────────────────
// reply : message simple (en gras comme mafia.js)
const reply = (c, text) => c.message.reply(B(text));

// finish : enregistre les joueurs modifiés, annonce les succès, puis envoie le message.
//  - c.me = joueur principal | others = autres joueurs modifiés | mentions = mentions Messenger
//  (avec des mentions, le texte reste normal : le gras casserait la détection du nom)
async function finish(c, text, { mentions, others = [] } = {}) {
  let out = text;
  const mine = checkAch(c.me);
  if (mine.length) out += `\n\n🏆 Succès : ${mine.map((a) => ACH[a].emoji + " " + ACH[a].nom).join(", ")}`;
  for (const o of others) {
    const f = checkAch(o);
    if (f.length) out += `\n🏆 ${await nm(c, o.uid)} : ${f.map((a) => ACH[a].emoji + " " + ACH[a].nom).join(", ")}`;
  }
  await save(c.usersData, c.me);
  for (const o of others) await save(c.usersData, o);
  return mentions ? c.message.reply({ body: out, mentions }) : c.message.reply(B(out));
}

// Envoie une demande à quelqu'un (mariage, duel…) et mémorise la suite pour onReply
async function ask(c, { type, targetID, body, extra }) {
  const myName = await nm(c, c.uid), tName = await nm(c, targetID);
  return c.message.reply({
    body: `${body(tName, myName)}\n\nRéponds à ce message par « oui » ou « non » (2 min).`,
    mentions: [{ tag: tName, id: targetID }, { tag: myName, id: c.uid }]
  }, (err, info) => {
    if (err) return;
    global.GoatBot.onReply.set(info.messageID, Object.assign({
      commandName: CMD, messageID: info.messageID, author: c.uid, type,
      fromID: c.uid, targetID, fromName: myName, targetName: tName,
      expires: Date.now() + REQ_TIMEOUT
    }, extra || {}));
  });
}

// ─── Roi ──────────────────────────────────────────────────────
let kingCache = { at: 0, id: null };
async function findKing(usersData, force) {
  if (!force && Date.now() - kingCache.at < 20000) return kingCache.id;
  const all = await usersData.getAll();
  const k = all.find((u) => u.data && u.data.game && u.data.game.title === "roi");
  kingCache = { at: Date.now(), id: k ? String(k.userID) : null };
  return kingCache.id;
}
const clearKing = () => { kingCache = { at: 0, id: null }; };

// Vérifie que "candidate" n'est pas un ancêtre de "personId" (évite les familles circulaires)
async function isAncestor(c, candidate, personId) {
  let cur = personId;
  for (let i = 0; i < 8; i++) {
    const p = await load(c.usersData, cur);
    if (!p.g.parent) return false;
    if (p.g.parent === candidate) return true;
    cur = p.g.parent;
  }
  return false;
}

// ============================================================
//  👤 PROFIL
// ============================================================

function renderHelp() {
  return `
👑  R O Y A U M E  -  G U I D E
${L("═", 44)}

👤  PROFIL
  royaume stat [@user]   - Fiche complète d'un joueur
  royaume bio <texte>    - Ta bio (reset pour l'effacer)
  royaume rang           - Niveau et titres
  royaume succes         - Succès débloqués
  royaume top [argent|xp|duel|titre|entreprise]
  royaume history        - Tes dernières transactions

💰  ÉCONOMIE
  royaume daily          - Récompense quotidienne
  royaume work           - Labeur selon ton titre
  royaume pay @user <mt> - Envoyer de l'argent
  royaume rob @user      - Tenter un vol
  royaume bank [deposit|withdraw] <mt|all>
  royaume shop [buy <objet> [qté]|inv]
  royaume slots <mise>   - Machine à sous
  royaume coinflip <pile|face> <mise>

💞  SOCIAL
  royaume marry @user    - Mariage (💍 bague requise)
  royaume divorce        - Divorcer
  royaume couple [@user] - Voir un couple
  royaume ship @a [@b]   - Compatibilité
  royaume adopt @user    - Adopter un enfant
  royaume disown [@enfant] - Renier / quitter son parent
  royaume family [@user] - Arbre familial
  royaume duel @user [mise]

🏢  ENTREPRISE
  royaume entreprise create <nom> | info | collect | upgrade
  royaume entreprise hire @user | fire @user | leave | disband confirm

👑  NOBLESSE
  royaume titre [@user]  - Détails de ton titre
  royaume promotion      - Acheter le titre supérieur
  royaume serment @seigneur - Devenir vassal
  royaume quitter        - Quitter ton seigneur
  royaume chasser @vassal
  royaume anoblir @user  - Offrir un titre (nobles)
  royaume revolte        - Renverser le roi (ducs)
  royaume decret <texte> - Décret royal (roi)

${L("═", 44)}
💡  ASTUCE : le TITRE améliore ton labeur, ton daily, tes duels et ton
entreprise. Mets ton argent en banque pour le protéger des voleurs !
`.trim();
}
const cmdHelp = (c) => reply(c, renderHelp());

// Fiche complète (comme le dashboard de mafia.js)
async function cmdStat(c) {
  const tid = targetOf(c.event, c.args.slice(1)) || c.uid;
  const isSelf = tid === c.uid;
  const p = isSelf ? c.me : await load(c.usersData, tid);
  const g = p.g, t = TBY[g.title];
  const name = await nm(c, tid);
  const lvl = levelOf(g.xp), cur = xpFor(lvl), next = xpFor(lvl + 1);
  const w = wallet(p);

  // Situation amoureuse, familiale et professionnelle
  const spouse = g.spouse ? `💍 Marié(e) avec ${await nm(c, g.spouse.id)} (depuis le ${day(g.spouse.since)})` : "💍 Célibataire";
  const famille = `👨‍👧‍👦 Parent : ${g.parent ? await nm(c, g.parent) : "aucun"}  •  Enfants : ${g.children.length}`;
  let work = "🏢 Aucune entreprise ni emploi";
  if (g.company) work = `🏢 Patron de « ${g.company.name} » (Niv.${g.company.level}, ${g.company.staff.length} employé(s))`;
  else if (g.job) {
    const o = await load(c.usersData, g.job.owner);
    work = `💼 Employé(e) chez « ${o.g.company ? o.g.company.name : "?"} » (patron : ${await nm(c, g.job.owner)})`;
  }
  const lord = `🏛️ Seigneur : ${g.lord ? await nm(c, g.lord) : "aucun"}` + (t.vassauxMax ? `  •  ⚔️ Vassaux : ${g.vassals.length}/${t.vassauxMax}` : "");

  let txt = `👑  R O Y A U M E  👑\n${L("═", 44)}\n`;
  txt += `▸ ${t.emoji} ${t.nom}  |  Niv.${lvl}\n👤 ${name}\n`;
  if (g.bio) txt += `📝 « ${g.bio} »\n`;
  txt += `${L("─", 44)}\n`;
  txt += `💵  PORTEFEUILLE   ${FM(w)}\n🏦  BANQUE         ${FM(g.bank)}\n💎  PATRIMOINE     ${FM(w + g.bank)}\n\n`;
  txt += `⭐  XP  ${bar(g.xp - cur, next - cur, 20)}  ${fmt(g.xp - cur)}/${fmt(next - cur)}\n`;
  txt += `${L("─", 44)}\n${spouse}\n${famille}\n${work}\n${lord}\n`;

  if (isSelf) {
    txt += `${L("─", 44)}\n⏳  COOLDOWNS\n`;
    txt += `  💼 Labeur   ${cdLeft(g, "work", t.work.cd * MIN) || "✅ PRÊT"}\n`;
    txt += `  🎁 Daily    ${cdLeft(g, "daily", DAY) || "✅ PRÊT"}\n`;
    txt += `  🥷 Vol      ${cdLeft(g, "rob", ROB_CD) || "✅ PRÊT"}\n`;
  }
  txt += `${L("─", 44)}\n📊  STATS\n`;
  txt += `  Labeurs : ${g.stats.works}  •  Duels : ${g.duel.w}V / ${g.duel.l}D\n`;
  txt += `  Vols : ${g.stats.robsOk} réussis / ${g.stats.robsFail} ratés  •  Série : ${g.streak}j\n`;
  txt += `  Succès : ${g.achievements.length}/${Object.keys(ACH).length}`;
  const inv = Object.keys(g.inv).filter((k) => ITEMS[k] && g.inv[k] > 0);
  if (inv.length) txt += `\n  🎒 ${inv.map((k) => `${ITEMS[k].emoji}x${g.inv[k]}`).join(" ")}`;
  return reply(c, txt);
}

async function cmdBio(c) {
  const g = c.me.g, MAX = 60;
  const text = c.args.slice(1).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return reply(c, g.bio ? `📝 Ta bio : « ${g.bio} »` : "📭 Tu n'as pas encore de bio. Écris : royaume bio <ton texte>");
  if (strip(text) === "reset") { g.bio = ""; await save(c.usersData, c.me); return reply(c, "🗑️ Ta bio a été supprimée."); }
  if (text.length > MAX) return reply(c, `⚠️ Bio trop longue (${text.length} caractères, maximum ${MAX}).`);
  g.bio = text;
  await save(c.usersData, c.me);
  return reply(c, `✅ Bio mise à jour : « ${text} »`);
}

async function cmdRank(c) {
  const g = c.me.g, t = TBY[g.title], lvl = levelOf(g.xp);
  let txt = `${t.emoji} RANG : ${t.nom}\n${L("═", 40)}\n`;
  txt += `⭐ Niveau ${lvl} — XP : ${fmt(g.xp)} (encore ${fmt(xpFor(lvl + 1) - g.xp)} pour le niveau ${lvl + 1})\n`;
  txt += `⚔️ Vassaux : ${g.vassals.length}\n\n`;
  const nt = TITLES[t.rank + 1];
  if (nt) {
    txt += `${L("─", 40)}\n⬆️ Prochain titre : ${nt.emoji} ${nt.nom}\n   Prix : ${FM(nt.prix)}`;
    if (nt.vassauxReq) txt += `  •  ${nt.vassauxReq} ${vas(nt.vassauxReq)} requis`;
    if (nt.id === "roi") txt += `  •  👑 Couronne requise`;
    txt += "\n";
  } else txt += "👑 Tu as atteint le titre MAXIMUM !\n";
  txt += `\n${L("─", 40)}\n📜 TOUS LES TITRES :\n`;
  for (const x of TITLES) txt += `${x.id === t.id ? "▶️ " : "   "}${x.emoji} ${x.nom} — ${FM(x.prix)}${x.vassauxMax ? ` — jusqu'à ${x.vassauxMax} vassaux` : ""}\n`;
  return reply(c, txt);
}

async function cmdAch(c) {
  const g = c.me.g, ids = Object.keys(ACH);
  let txt = `🏆 SUCCÈS\n${L("═", 40)}\nProgression : ${g.achievements.length}/${ids.length}\n\n`;
  const got = g.achievements.filter((a) => ACH[a]);
  txt += got.length ? "🎖️ DÉBLOQUÉS :\n" + got.map((a) => `• ${ACH[a].emoji} ${ACH[a].nom}`).join("\n") + "\n\n" : "🎯 Aucun succès pour le moment.\n\n";
  const left = ids.filter((a) => !g.achievements.includes(a));
  if (left.length) txt += "🎯 PROCHAINS OBJECTIFS :\n" + left.slice(0, 6).map((a) => `• ${ACH[a].emoji} ${ACH[a].nom} : ${ACH[a].desc}`).join("\n");
  return reply(c, txt);
}

async function cmdHistory(c) {
  const txs = c.me.g.tx.slice(-15).reverse();
  if (!txs.length) return reply(c, "📋 Aucune transaction.");
  const icons = { work: "💼", daily: "🎁", pay: "💸", rob: "🥷", bank: "🏦", shop: "🛒", slots: "🎰", coin: "🪙", duel: "⚔️", company: "🏢", titre: "👑", impot: "🏛️", revolte: "🔥" };
  let txt = `📋 HISTORIQUE (15 dernières)\n${L("═", 40)}\n\n`;
  for (const t of txs) txt += `${icons[t.type] || "💼"} ${t.desc}\n   ${t.montant >= 0 ? "+" : ""}${FM(t.montant)} (${day(t.date)})\n\n`;
  return reply(c, txt);
}

// Classements : argent | xp | duel | titre | entreprise
async function cmdTop(c, forced) {
  const keys = { argent: "money", riche: "money", money: "money", xp: "xp", niveau: "xp", duel: "duel", duels: "duel", titre: "title", noblesse: "title", royaume: "title", entreprise: "company", company: "company" };
  const key = keys[strip(forced || c.args[1] || "argent")] || "money";
  const all = await c.usersData.getAll();

  const rows = all.map((u) => {
    const g = normalize(u.data && u.data.game);
    const m = Number(u.money) || 0;
    const row = { id: String(u.userID), name: u.name || `Utilisateur ${String(u.userID).slice(-4)}`, g };
    if (key === "money") { row.val = m + g.bank; row.line = `${FM(m + g.bank)}`; }
    else if (key === "xp") { row.val = g.xp; row.line = `Niv.${levelOf(g.xp)} (${fmt(g.xp)} XP)`; }
    else if (key === "duel") { row.val = g.duel.w; row.line = `${g.duel.w} victoire(s) / ${g.duel.l} défaite(s)`; }
    else if (key === "title") { row.val = rankOf(g) * 1000 + g.vassals.length; row.line = `${TBY[g.title].emoji} ${TBY[g.title].nom} — ${g.vassals.length} vassal(aux)`; row.skip = rankOf(g) < 1; }
    else {
      const co = g.company;
      row.skip = !co;
      if (co) { const inc = coIncome(g); row.val = co.level * 1e6 + inc; row.line = `« ${co.name} » Niv.${co.level} — ${FM(inc)}/h • ${co.staff.length} employé(s)`; }
    }
    return row;
  }).filter((r) => !r.skip && r.val > 0).sort((a, b) => b.val - a.val);

  const titles = { money: "💰 LES PLUS RICHES", xp: "⭐ LES PLUS EXPÉRIMENTÉS", duel: "⚔️ LES MEILLEURS DUELLISTES", title: "👑 LES PUISSANTS DU ROYAUME", company: "🏢 LES MEILLEURES ENTREPRISES" };
  let txt = `${titles[key]}\n${L("═", 44)}\n`;

  if (key === "title") {
    const cnt = {}; TITLES.forEach((t) => { cnt[t.id] = 0; });
    all.forEach((u) => { cnt[normalize(u.data && u.data.game).title]++; });
    txt += `🌾 ${cnt.paysan} paysans • 🏘️ ${cnt.villageois} villageois • 🛡️ ${all.length - cnt.paysan - cnt.villageois} nobles\n\n`;
  }
  if (!rows.length) return reply(c, txt + "📊 Personne n'est encore classé ici.");

  const medals = ["🥇", "🥈", "🥉"];
  rows.slice(0, 10).forEach((r, i) => { txt += `${medals[i] || `#${i + 1}`} ${r.name}\n   ${r.line}\n`; });
  const mine = rows.findIndex((r) => r.id === c.uid);
  if (mine >= 10) txt += `\n📍 Ta position : #${mine + 1} — ${rows[mine].line}`;
  return reply(c, txt);
}

// ============================================================
//  💰 ÉCONOMIE
// ============================================================

async function cmdDaily(c) {
  const me = c.me, g = me.g;
  const left = cdLeft(g, "daily", DAY);
  if (left) return reply(c, `⏳ Daily disponible dans ${left}.`);

  // Série : conservée si on revient dans les 48 h, sinon elle repart à 1
  const last = g.cd.daily || 0;
  const broken = last && Date.now() - last > 2 * DAY && g.streak > 1;
  g.streak = last && Date.now() - last <= 2 * DAY ? g.streak + 1 : 1;

  const base = rand(DAILY_MIN, DAILY_MAX);
  const streakB = Math.min(g.streak - 1, DAILY_STREAK_MAX) * DAILY_STREAK_BONUS;
  const titleB = Math.floor((base + streakB) * DAILY_TITLE_BONUS * rankOf(g));
  const reward = base + streakB + titleB;

  addMoney(me, reward);
  g.cd.daily = Date.now();
  gainXp(g, 15);
  addTx(g, "daily", reward, `Daily (série ${g.streak}j)`);

  let txt = `🎁 RÉCOMPENSE QUOTIDIENNE\n${L("─", 40)}\n💰 Gain : +${FM(reward)}\n`;
  txt += `   (base ${fmt(base)} + série ${fmt(streakB)} + titre ${fmt(titleB)})\n🔥 Série : ${g.streak} jour(s)\n💵 Portefeuille : ${FM(wallet(me))}`;
  if (broken) txt += "\n💔 Ta série précédente avait été brisée.";
  return finish(c, txt);
}

// Labeur : dépend du titre. Les vassaux versent un impôt à leur seigneur.
async function cmdWork(c) {
  const me = c.me, g = me.g, t = TBY[g.title];
  const left = cdLeft(g, "work", t.work.cd * MIN);
  if (left) return reply(c, `⏳ Tu es fatigué ! Reviens dans ${left}.`);

  // Le serment est-il toujours valable ? (le seigneur doit encore avoir un rang supérieur)
  const others = [];
  let lord = null;
  if (g.lord) {
    lord = await load(c.usersData, g.lord);
    if (!(lord.g.vassals.includes(me.uid) && rankOf(lord.g) > rankOf(g))) {
      lord.g.vassals = lord.g.vassals.filter((id) => id !== me.uid);
      g.lord = null;
      others.push(lord);
      lord = null;
    }
  }

  let gain = rand(t.work.gain[0], t.work.gain[1]);
  let note = "";
  if (Math.random() < BAD_LUCK) { gain = Math.floor(gain / 2); note = "\n😕 Mauvaise journée : gain divisé par deux."; }

  // Impôt du seigneur
  let tax = 0;
  if (lord) {
    tax = Math.floor(gain * TAX_RATE);
    addMoney(lord, tax);
    addTx(lord.g, "impot", tax, `Impôt de ${await nm(c, me.uid)}`);
    others.push(lord);
  }
  const net = gain - tax;

  addMoney(me, net);
  g.cd.work = Date.now();
  g.stats.works++;
  gainXp(g, 10 + 3 * rankOf(g));
  addTx(g, "work", net, t.work.label);

  let txt = `${t.emoji} ${pick(t.work.lines)}\n${L("─", 40)}\n💰 Gain : +${FM(net)}\n💵 Portefeuille : ${FM(wallet(me))}${note}`;
  if (tax) txt += `\n🏛️ Impôt : ${FM(tax)} versés à ${await nm(c, g.lord)}`;
  return finish(c, txt, { others });
}

async function cmdPay(c) {
  const me = c.me, tid = targetOf(c.event);
  if (!tid) return reply(c, "⚠️ Mentionne la personne ou réponds à son message. Exemple : royaume pay @user 500");
  if (tid === c.uid) return reply(c, "😏 Tu ne peux pas te payer toi-même.");
  if (tid === c.botID) return reply(c, "🤖 Je n'ai pas besoin d'argent, merci !");
  const amount = lastNum(c.args.slice(1));
  if (isNaN(amount) || amount < 1) return reply(c, "⚠️ Indique un montant valide. Exemple : royaume pay @user 500");
  if (wallet(me) < amount) return reply(c, `💸 Tu n'as pas assez d'argent. Solde : ${FM(wallet(me))}`);

  const tp = await load(c.usersData, tid);
  const taxAmt = Math.floor(amount * PAY_TAX / 100), got = amount - taxAmt;
  addMoney(me, -amount);
  addMoney(tp, got);
  const [a, b] = [await nm(c, c.uid), await nm(c, tid)];
  addTx(me.g, "pay", -amount, `Envoi à ${b}`);
  addTx(tp.g, "pay", got, `Reçu de ${a}`);

  let txt = `✅ ${a} a envoyé ${FM(amount)} à ${b}.`;
  if (taxAmt) txt += `\n🏛️ Taxe : ${FM(taxAmt)} (le destinataire reçoit ${FM(got)})`;
  txt += `\n💵 Ton solde : ${FM(wallet(me))}`;
  return finish(c, txt, { others: [tp], mentions: [{ tag: a, id: c.uid }, { tag: b, id: tid }] });
}

async function cmdRob(c) {
  const me = c.me, g = me.g, tid = targetOf(c.event);
  if (!tid) return reply(c, "⚠️ Mentionne ta victime ou réponds à son message.");
  if (tid === c.uid) return reply(c, "😏 Tu ne peux pas te voler toi-même.");
  if (tid === c.botID) return reply(c, "🤖 Mon coffre est impossible à ouvrir !");
  const left = cdLeft(g, "rob", ROB_CD);
  if (left) return reply(c, `⏳ La police te cherche encore. Reviens dans ${left}.`);

  const vp = await load(c.usersData, tid);
  if (wallet(me) < ROB_FINE) return reply(c, `💸 Il te faut au moins ${FM(ROB_FINE)} pour tenter un vol (amende possible).`);
  if (wallet(vp) < ROB_VICTIM_MIN) return reply(c, `😅 Cette personne n'a pas assez d'argent dans son portefeuille (minimum ${FM(ROB_VICTIM_MIN)}). L'argent en banque est protégé !`);

  const [a, b] = [await nm(c, c.uid), await nm(c, tid)];
  const mentions = [{ tag: a, id: c.uid }, { tag: b, id: tid }];
  g.cd.rob = Date.now();

  // 🛡️ Bouclier de la victime : le vol est bloqué (le bouclier est détruit)
  if ((vp.g.inv.shield || 0) > 0) {
    vp.g.inv.shield--;
    return finish(c, `🛡️ Le bouclier de ${b} a bloqué le vol de ${a} ! (le bouclier est détruit)`, { others: [vp], mentions });
  }

  // Chances : 45 % de base, ±4 % par rang de titre d'écart (voleur - victime)
  const chance = clamp(ROB_BASE + ROB_PER_RANK * (rankOf(g) - rankOf(vp.g)), ROB_MIN_CH, ROB_MAX_CH);

  if (Math.random() < chance) {
    const pct = ROB_STEAL_MIN + Math.random() * (ROB_STEAL_MAX - ROB_STEAL_MIN);
    const loot = clamp(Math.floor(wallet(vp) * pct), 1, ROB_CAP);
    addMoney(vp, -loot); addMoney(me, loot);
    g.stats.robsOk++;
    gainXp(g, 12);
    addTx(g, "rob", loot, `Vol sur ${b}`);
    addTx(vp.g, "rob", -loot, `Volé par ${a}`);
    return finish(c, `🥷 Vol réussi ! ${a} a volé ${FM(loot)} à ${b} !\n🎲 Chances : ${Math.round(chance * 100)} %`, { others: [vp], mentions });
  }

  addMoney(me, -ROB_FINE); addMoney(vp, ROB_FINE);
  g.stats.robsFail++;
  addTx(g, "rob", -ROB_FINE, `Amende (vol raté sur ${b})`);
  return finish(c, `🚔 Raté ! ${a} s'est fait attraper par ${b} et paie une amende de ${FM(ROB_FINE)}.\n🎲 Chances : ${Math.round(chance * 100)} %`, { others: [vp], mentions });
}

// Banque : "royaume bank" | "bank deposit 500" | "depot 500" | "retrait all"
async function cmdBank(c, forced) {
  const me = c.me, g = me.g;
  const sub = forced || strip(c.args[1]);
  const amtArg = strip(forced ? c.args[1] : c.args[2]);
  const isDep = ["deposit", "depot", "d", "deposer"].includes(sub);
  const isWit = ["withdraw", "retrait", "retirer", "w", "r"].includes(sub);

  if (!isDep && !isWit) {
    let txt = `🏦 TA BANQUE\n${L("═", 40)}\n💵 Portefeuille : ${FM(wallet(me))}\n🏛️ Compte : ${FM(g.bank)}`;
    if (me.interest) txt += `\n✨ Intérêts reçus : +${FM(me.interest)}`;
    txt += `\n\n📈 Intérêts : ${BANK_RATE * 100} % par jour (sur les ${fmt(BANK_CAP)} premiers $)\n🛡️ L'argent en banque ne peut pas être volé.`;
    if (me.interest) await save(c.usersData, me);
    return reply(c, txt);
  }

  const source = isDep ? wallet(me) : g.bank;
  let amount;
  if (["all", "tout", "max"].includes(amtArg)) amount = source;
  else amount = num(amtArg);
  if (isNaN(amount) || amount <= 0) return reply(c, "⚠️ Indique un montant ou « all ». Exemple : royaume bank deposit 500");
  if (amount > source) return reply(c, isDep ? `💸 Pas assez dans ton portefeuille (${FM(wallet(me))}).` : `💸 Pas assez en banque (${FM(g.bank)}).`);

  if (isDep) { addMoney(me, -amount); g.bank += amount; addTx(g, "bank", -amount, "Dépôt en banque"); }
  else { addMoney(me, amount); g.bank -= amount; addTx(g, "bank", amount, "Retrait de la banque"); }
  return finish(c, `✅ ${FM(amount)} ${isDep ? "déposés en banque" : "retirés de la banque"}.\n💵 Portefeuille : ${FM(wallet(me))}\n🏛️ Compte : ${FM(g.bank)}`);
}

const findItem = (s) => { const q = strip(s); return Object.keys(ITEMS).find((id) => ITEMS[id].alias.includes(q)); };

// Boutique : "shop" | "shop buy bague 2" | "buy bague" | "inv"
async function cmdShop(c, forced) {
  const me = c.me, g = me.g;
  const sub = forced || strip(c.args[1]);
  const off = forced ? 1 : 2; // position de l'objet dans les arguments

  if (["inv", "inventaire", "sac", "inventory"].includes(sub)) {
    const owned = Object.keys(g.inv).filter((k) => ITEMS[k] && g.inv[k] > 0);
    if (!owned.length) return reply(c, "🎒 Ton inventaire est vide. Tape « royaume shop » pour voir la boutique.");
    return reply(c, `🎒 TON INVENTAIRE\n${L("═", 40)}\n` + owned.map((k) => `${ITEMS[k].emoji} ${ITEMS[k].nom} x${g.inv[k]}`).join("\n"));
  }

  if (["buy", "acheter", "achat"].includes(sub)) {
    const id = findItem(c.args[off]);
    if (!id) return reply(c, "❓ Objet introuvable. Tape « royaume shop » pour voir la liste.");
    const qty = c.args[off + 1] ? parseInt(c.args[off + 1]) : 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return reply(c, "⚠️ Quantité invalide (entre 1 et 99).");
    const it = ITEMS[id], total = it.prix * qty;
    if (wallet(me) < total) return reply(c, `💸 Il te faut ${FM(total)} (tu as ${FM(wallet(me))}).`);
    addMoney(me, -total);
    g.inv[id] = (g.inv[id] || 0) + qty;
    addTx(g, "shop", -total, `Achat : ${it.nom} x${qty}`);
    return finish(c, `✅ Achat : ${it.emoji} ${it.nom} x${qty} pour ${FM(total)}.\n💵 Portefeuille : ${FM(wallet(me))}`);
  }

  let txt = `🛒 BOUTIQUE\n${L("═", 40)}\n`;
  for (const it of Object.values(ITEMS)) txt += `${it.emoji} ${it.nom} — ${FM(it.prix)}\n   ↳ ${it.desc}\n`;
  txt += `\nAcheter : royaume shop buy <objet> [quantité]\nExemple : royaume shop buy bague`;
  return reply(c, txt);
}

function playSlots() {
  const spin = () => { let r = Math.random() * SLOT_TOTAL; for (const s of SYMBOLS) { r -= s.weight; if (r < 0) return s; } return SYMBOLS[0]; };
  const [a, b, d] = [spin(), spin(), spin()];
  let mult = 0;
  if (a.icon === b.icon && b.icon === d.icon) mult = a.mult;
  else if (a.icon === b.icon || a.icon === d.icon || b.icon === d.icon) mult = SLOT_PAIR;
  return { icons: [a.icon, b.icon, d.icon], mult };
}

async function cmdSlots(c) {
  const me = c.me, g = me.g, bet = num(c.args[1]);
  if (isNaN(bet)) return reply(c, "⚠️ Indique ta mise. Exemple : royaume slots 100");
  if (bet < SLOT_MIN || bet > SLOT_MAX) return reply(c, `⚠️ La mise doit être entre ${FM(SLOT_MIN)} et ${FM(SLOT_MAX)}.`);
  if (wallet(me) < bet) return reply(c, `💸 Tu n'as pas assez d'argent (${FM(wallet(me))}).`);

  let res = playSlots(), txt = "";
  // 🍀 Le trèfle donne une seconde chance, seulement si on a perdu
  if (res.mult === 0 && (g.inv.clover || 0) > 0) {
    g.inv.clover--;
    txt += `🎰 [ ${res.icons.join(" | ")} ]\n🍀 Ton trèfle est utilisé : seconde chance !\n\n`;
    res = playSlots();
  }
  const payout = Math.floor(bet * res.mult);
  addMoney(me, payout - bet);
  addTx(g, "slots", payout - bet, "Machine à sous");

  txt += `🎰 [ ${res.icons.join(" | ")} ]\n`;
  if (res.mult >= 3) { g.stats.jackpots++; txt += `🎉 JACKPOT ! Tu gagnes ${FM(payout - bet)} (x${res.mult}) !`; }
  else if (res.mult > 0) txt += `✨ Une paire ! Tu gagnes ${FM(payout - bet)}.`;
  else txt += `💀 Perdu... -${FM(bet)}.`;
  txt += `\n💵 Portefeuille : ${FM(wallet(me))}`;
  return finish(c, txt);
}

async function cmdCoin(c) {
  const me = c.me;
  const sides = { pile: "pile", p: "pile", heads: "pile", h: "pile", face: "face", f: "face", tails: "face", t: "face" };
  const side = sides[strip(c.args[1])], bet = lastNum(c.args.slice(2));
  if (!side || isNaN(bet)) return reply(c, "⚠️ Utilisation : royaume coinflip <pile|face> <mise>\nExemple : royaume coinflip pile 200");
  if (bet < COIN_MIN || bet > COIN_MAX) return reply(c, `⚠️ La mise doit être entre ${FM(COIN_MIN)} et ${FM(COIN_MAX)}.`);
  if (wallet(me) < bet) return reply(c, `💸 Tu n'as pas assez d'argent (${FM(wallet(me))}).`);

  const result = Math.random() < 0.5 ? "pile" : "face", won = result === side;
  addMoney(me, won ? bet : -bet);
  addTx(me.g, "coin", won ? bet : -bet, `Pile ou face (${result})`);
  const shown = result[0].toUpperCase() + result.slice(1);
  return finish(c, `🪙 ${shown} ! Tu avais choisi ${side}.\n${won ? `🎉 Gagné : +${FM(bet)}` : `💀 Perdu : -${FM(bet)}`}\n💵 Portefeuille : ${FM(wallet(me))}`);
}

// ============================================================
//  💞 SOCIAL : mariage, famille, duel
// ============================================================

async function cmdMarry(c) {
  const me = c.me, g = me.g, tid = targetOf(c.event);
  if (!tid) return reply(c, "⚠️ Mentionne la personne ou réponds à son message.");
  if (tid === c.uid) return reply(c, "😏 Tu ne peux pas t'épouser toi-même.");
  if (tid === c.botID) return reply(c, "🤖 Désolé, je suis déjà pris par mon code.");
  if (g.spouse) return reply(c, `💍 Tu es déjà marié(e) avec ${await nm(c, g.spouse.id)}. Fais d'abord « royaume divorce ».`);
  if (!(g.inv.ring > 0)) return reply(c, "💍 Il te faut une Bague pour demander quelqu'un en mariage : royaume shop buy bague");
  if (g.parent === tid || g.children.some((ch) => ch.id === tid)) return reply(c, "🚫 Pas de mariage dans la famille !");

  const tp = await load(c.usersData, tid);
  if (tp.g.spouse) return reply(c, `💔 ${await nm(c, tid)} est déjà marié(e).`);

  return ask(c, { type: "marry", targetID: tid, body: (t, m) => `💍 ${t}, ${m} te demande en mariage !` });
}

async function cmdDivorce(c) {
  const me = c.me, g = me.g;
  if (!g.spouse) return reply(c, "😅 Tu n'es marié(e) avec personne.");
  const pid = g.spouse.id, pp = await load(c.usersData, pid);
  const [a, b] = [await nm(c, c.uid), await nm(c, pid)];
  g.spouse = null;
  if (pp.g.spouse && pp.g.spouse.id === c.uid) pp.g.spouse = null;
  return finish(c, `💔 ${a} a divorcé de ${b}. C'est terminé entre eux.`, { others: [pp], mentions: [{ tag: a, id: c.uid }, { tag: b, id: pid }] });
}

async function cmdCouple(c) {
  const tid = targetOf(c.event) || c.uid;
  const p = tid === c.uid ? c.me : await load(c.usersData, tid);
  const name = await nm(c, tid);
  if (!p.g.spouse) return reply(c, `😅 ${name} n'est marié(e) avec personne. Utilise « royaume marry » pour demander quelqu'un en mariage.`);
  const sp = p.g.spouse, days = Math.floor((Date.now() - sp.since) / DAY);
  return reply(c, `💑 COUPLE\n${L("═", 40)}\n💖 ${name} ❤ ${await nm(c, sp.id)}\n📅 Mariés depuis le ${day(sp.since)}\n🕰️ ${days} jour${days > 1 ? "s" : ""} ensemble`);
}

async function cmdShip(c) {
  const ms = Object.keys(c.event.mentions || {});
  let a, b;
  if (ms.length >= 2) [a, b] = ms;
  else if (ms.length === 1) { a = c.uid; b = ms[0]; }
  else if (c.event.messageReply) { a = c.uid; b = c.event.messageReply.senderID; }
  else return reply(c, "⚠️ Mentionne une ou deux personnes, ou réponds à un message.");
  if (a === b) return reply(c, "😏 Il faut deux personnes différentes.");

  const pct = hash([a, b].sort().join("-")) % 101;
  const verdict = pct >= 90 ? "💞 Âmes sœurs, mariez-vous vite !" : pct >= 75 ? "😍 Un super couple en vue !" : pct >= 55 ? "😊 Ça peut le faire, tentez votre chance." : pct >= 35 ? "😅 Possible, mais il faudra des efforts." : pct >= 15 ? "😬 Restez plutôt bons amis." : "💀 Ne vous approchez même pas.";
  return reply(c, `💘 ${await nm(c, a)} ❤ ${await nm(c, b)}\n${L("─", 40)}\n${bar(pct, 100, 24)}  ${pct}%\n${verdict}`);
}

async function cmdAdopt(c) {
  const me = c.me, g = me.g, tid = targetOf(c.event);
  if (!tid) return reply(c, "⚠️ Mentionne la personne ou réponds à son message.");
  if (tid === c.uid) return reply(c, "😏 Tu ne peux pas t'adopter toi-même.");
  if (tid === c.botID) return reply(c, "🤖 Je suis un robot, pas un enfant !");
  if (g.children.length >= MAX_CHILDREN) return reply(c, `👨‍👧‍👦 Tu as déjà ${MAX_CHILDREN} enfants, c'est le maximum.`);
  if (g.spouse && g.spouse.id === tid) return reply(c, "💍 Tu ne peux pas adopter ton/ta partenaire !");

  const tp = await load(c.usersData, tid);
  if (tp.g.parent) return reply(c, `👶 ${await nm(c, tid)} a déjà un parent (${await nm(c, tp.g.parent)}).`);
  if (await isAncestor(c, tid, c.uid)) return reply(c, "🙃 Cette personne est ton ancêtre, tu ne peux pas l'adopter.");

  return ask(c, { type: "adopt", targetID: tid, body: (t, m) => `👨‍👧 ${t}, ${m} voudrait t'adopter !` });
}

async function cmdDisown(c) {
  const me = c.me, g = me.g, tid = targetOf(c.event);
  const myName = await nm(c, c.uid);

  // Avec une cible : on renie un enfant
  if (tid) {
    if (!g.children.some((ch) => ch.id === tid)) return reply(c, `⚠️ ${await nm(c, tid)} n'est pas ton enfant.`);
    const cp = await load(c.usersData, tid), cName = await nm(c, tid);
    g.children = g.children.filter((ch) => ch.id !== tid);
    if (cp.g.parent === c.uid) cp.g.parent = null;
    return finish(c, `💔 ${myName} a renié ${cName}. Le lien familial est rompu.`, { others: [cp], mentions: [{ tag: myName, id: c.uid }, { tag: cName, id: tid }] });
  }

  // Sans cible : on quitte son parent
  if (!g.parent) return reply(c, "😅 Tu n'as pas de parent à quitter. Pour renier un enfant : royaume disown @enfant");
  const pid = g.parent, pp = await load(c.usersData, pid), pName = await nm(c, pid);
  g.parent = null;
  pp.g.children = pp.g.children.filter((ch) => ch.id !== c.uid);
  return finish(c, `👋 ${myName} a quitté la famille de ${pName}.`, { others: [pp], mentions: [{ tag: myName, id: c.uid }, { tag: pName, id: pid }] });
}

async function cmdFamily(c) {
  const tid = targetOf(c.event) || c.uid;
  const p = tid === c.uid ? c.me : await load(c.usersData, tid), g = p.g;
  let txt = `👨‍👩‍👧‍👦 FAMILLE DE ${(await nm(c, tid)).toUpperCase()}\n${L("═", 40)}\n`;
  txt += g.spouse ? `💍 Partenaire : ${await nm(c, g.spouse.id)} (depuis le ${day(g.spouse.since)})\n` : "💍 Partenaire : aucun\n";
  txt += `👤 Parent : ${g.parent ? await nm(c, g.parent) : "aucun"}\n`;
  if (g.children.length) {
    txt += `👶 Enfants (${g.children.length}) :\n`;
    for (const ch of g.children) txt += `   • ${await nm(c, ch.id)} (depuis le ${day(ch.since)})\n`;
  } else txt += "👶 Enfants : aucun\n";
  return reply(c, txt.trim());
}

// Duel : les nobles ont plus de points de vie (+8 PV par rang de titre)
function simulate(names, hp0) {
  const hp = [hp0[0], hp0[1]], log = [];
  let turn = Math.random() < 0.5 ? 0 : 1;
  for (let r = 0; r < DUEL_ROUNDS && hp[0] > 0 && hp[1] > 0; r++) {
    const def = 1 - turn;
    if (Math.random() < 0.1) log.push(`💨 ${names[turn]} rate son attaque !`);
    else {
      let dmg = rand(8, 22);
      const crit = Math.random() < 0.15;
      if (crit) dmg *= 2;
      hp[def] = Math.max(0, hp[def] - dmg);
      log.push(`${crit ? "💥 CRITIQUE" : "⚔️"} ${names[turn]} frappe ${names[def]} (-${dmg}) → ${hp[def]} PV`);
    }
    turn = def;
  }
  return { winner: hp[0] === hp[1] ? rand(0, 1) : hp[0] > hp[1] ? 0 : 1, log };
}

async function cmdDuel(c) {
  const me = c.me, tid = targetOf(c.event);
  if (!tid) return reply(c, "⚠️ Mentionne ton adversaire ou réponds à son message.");
  if (tid === c.uid) return reply(c, "😏 Tu ne peux pas te battre contre toi-même.");
  if (tid === c.botID) return reply(c, "🤖 Je ne me bats pas, je suis l'arbitre.");
  const bet = isNaN(lastNum(c.args.slice(1))) ? 0 : lastNum(c.args.slice(1));

  const tp = await load(c.usersData, tid);
  if (wallet(me) < bet) return reply(c, `💸 Tu n'as pas assez d'argent pour cette mise (${FM(bet)}).`);
  if (wallet(tp) < bet) return reply(c, `💸 ${await nm(c, tid)} n'a pas assez d'argent pour cette mise (${FM(bet)}).`);

  return ask(c, { type: "duel", targetID: tid, extra: { bet },
    body: (t, m) => `⚔️ ${t}, ${m} te défie en duel !${bet ? `\n💰 Mise : ${FM(bet)} chacun` : ""}` });
}

// ============================================================
//  🏢 ENTREPRISE
// ============================================================

// Revenu par heure = revenu du niveau × (1 + 10 % par employé) × (1 + 5 % par rang de titre du patron)
const coIncome = (g) => CO_LEVELS[g.company.level].income * (1 + CO_BOOST * g.company.staff.length) * (1 + CO_TITLE_BONUS * rankOf(g));
const coCap = (g) => coIncome(g) * CO_MAX_HOURS;

// "Règle" le coffre : ajoute ce qui a été gagné depuis la dernière fois.
// À appeler AVANT de modifier le revenu (embauche, amélioration…), sinon le nouveau
// revenu s'appliquerait aussi au passé.
function coSettle(g) {
  const co = g.company, now = Date.now();
  const hours = Math.min((now - (co.last || now)) / HOUR, CO_MAX_HOURS);
  co.vault = Math.min(co.vault + hours * coIncome(g), coCap(g));
  co.last = now;
}

const CO_HELP = `🏢 ENTREPRISES\n${L("═", 40)}\n• entreprise create <nom> — créer (${fmt(CO_COST)} $, titre Villageois minimum)\n• entreprise info [@user] — voir une entreprise\n• entreprise collect — récupérer le coffre\n• entreprise upgrade — améliorer\n• entreprise hire @user — embaucher\n• entreprise fire @user — licencier\n• entreprise leave — démissionner\n• entreprise disband confirm — dissoudre\n• entreprise top — classement`;

const CO_ACTIONS = {
  async create(c) {
    const me = c.me, g = me.g;
    const name = c.args.slice(2).join(" ").replace(/\s+/g, " ").trim();
    if (name.length < NAME_MIN || name.length > NAME_MAX || !/^[\p{L}\p{N} '&._-]+$/u.test(name))
      return reply(c, `⚠️ Le nom doit faire entre ${NAME_MIN} et ${NAME_MAX} caractères (lettres, chiffres, espaces, ' & . _ -).`);
    if (g.company) return reply(c, "⚠️ Tu possèdes déjà une entreprise.");
    if (g.job) return reply(c, "⚠️ Tu travailles pour quelqu'un : fais d'abord « royaume entreprise leave ».");
    if (rankOf(g) < 1) return reply(c, "🌾 Les paysans ne peuvent pas posséder d'entreprise. Deviens Villageois avec « royaume promotion ».");
    if (wallet(me) < CO_COST) return reply(c, `💸 Il te faut ${FM(CO_COST)} (tu as ${FM(wallet(me))}).`);

    // Le nom doit être unique sur tout le bot
    const all = await c.usersData.getAll();
    if (all.some((u) => u.data && u.data.game && u.data.game.company && String(u.data.game.company.name).toLowerCase() === name.toLowerCase()))
      return reply(c, `⚠️ Le nom « ${name} » est déjà pris.`);

    addMoney(me, -CO_COST);
    g.company = { name, level: 1, since: Date.now(), last: Date.now(), vault: 0, staff: [] };
    gainXp(g, 30);
    addTx(g, "company", -CO_COST, `Création : ${name}`);
    return finish(c, `🎉 Entreprise « ${name} » créée !\n📈 Revenu : ${FM(coIncome(g))}/h (le coffre se remplit tout seul, max ${CO_MAX_HOURS} h)\n💵 Solde : ${FM(wallet(me))}\n\nUtilise « royaume entreprise collect » pour récupérer l'argent.`);
  },

  async info(c) {
    const tid = targetOf(c.event) || c.uid, isSelf = tid === c.uid;
    const p = isSelf ? c.me : await load(c.usersData, tid), g = p.g, name = await nm(c, tid);

    if (g.company) {
      coSettle(g);
      const co = g.company, lv = CO_LEVELS[co.level];
      let txt = `🏢 ${co.name} (Niveau ${co.level})\n${L("═", 40)}\n👑 Patron : ${name}\n👥 Employés : ${co.staff.length}/${lv.staff}\n`;
      txt += `📈 Revenu : ${FM(coIncome(g))}/h (+${Math.round(CO_BOOST * co.staff.length * 100)} % employés, +${Math.round(CO_TITLE_BONUS * rankOf(g) * 100)} % titre)`;
      if (isSelf) {
        txt += `\n📦 Coffre : ${FM(co.vault)} / ${FM(coCap(g))}`;
        txt += `\n` + (lv.up ? `⬆️ Niveau ${co.level + 1} : ${FM(lv.up)}` : "🌟 Niveau maximum !");
        await save(c.usersData, c.me); // on enregistre le règlement du coffre
      }
      if (co.staff.length) txt += `\n\n👥 Équipe :\n` + (await Promise.all(co.staff.map(async (id) => `   • ${await nm(c, id)}`))).join("\n");
      return reply(c, txt);
    }
    if (g.job) {
      const o = await load(c.usersData, g.job.owner);
      return reply(c, `💼 ${name} travaille chez « ${o.g.company ? o.g.company.name : "?"} » (patron : ${await nm(c, g.job.owner)}).`);
    }
    return reply(c, `🏢 ${name} n'a pas d'entreprise ni d'emploi.`);
  },

  async collect(c) {
    const me = c.me, g = me.g;
    if (!g.company) return reply(c, "⚠️ Tu n'as pas d'entreprise. Crée-en une : royaume entreprise create <nom>");
    coSettle(g);
    const co = g.company, total = Math.floor(co.vault);
    if (total < 1) return reply(c, "📭 Le coffre est vide pour l'instant. Reviens plus tard !");

    // 20 % du coffre partagé entre les employés (seulement ceux qui travaillent bien chez nous)
    const others = [];
    const valid = [];
    for (const id of co.staff) {
      const ep = await load(c.usersData, id);
      if (ep.g.job && ep.g.job.owner === c.uid) valid.push(ep);
    }
    co.staff = valid.map((e) => e.uid); // on retire ceux qui ne sont plus employés
    const each = valid.length ? Math.floor(total * CO_SHARE / valid.length) : 0;
    for (const ep of valid) { addMoney(ep, each); addTx(ep.g, "company", each, `Salaire chez « ${co.name} »`); others.push(ep); }

    const gain = total - each * valid.length;
    co.vault = 0;
    addMoney(me, gain);
    gainXp(g, 10);
    addTx(g, "company", gain, `Coffre de « ${co.name} »`);
    let txt = `💰 Coffre de « ${co.name} » récupéré : +${FM(gain)}\n💵 Solde : ${FM(wallet(me))}`;
    if (each) txt += `\n👥 Salaires : ${valid.length} employé(s) ont reçu ${FM(each)} chacun.`;
    return finish(c, txt, { others });
  },

  async upgrade(c) {
    const me = c.me, g = me.g;
    if (!g.company) return reply(c, "⚠️ Tu n'as pas d'entreprise.");
    if (g.company.level >= CO_MAX_LEVEL) return reply(c, "🌟 Ton entreprise est au niveau maximum !");
    const cost = CO_LEVELS[g.company.level].up;
    if (wallet(me) < cost) return reply(c, `💸 Il te faut ${FM(cost)} (tu as ${FM(wallet(me))}).`);
    coSettle(g);                    // on règle avec l'ancien revenu…
    addMoney(me, -cost);
    g.company.level++;              // …puis on monte de niveau
    gainXp(g, 40);
    addTx(g, "company", -cost, `Amélioration : niveau ${g.company.level}`);
    return finish(c, `⬆️ « ${g.company.name} » passe au niveau ${g.company.level} !\n📈 Revenu : ${FM(coIncome(g))}/h • 👥 Employés max : ${CO_LEVELS[g.company.level].staff}\n💵 Solde : ${FM(wallet(me))}`);
  },

  async hire(c) {
    const g = c.me.g, tid = targetOf(c.event);
    if (!g.company) return reply(c, "⚠️ Tu n'as pas d'entreprise.");
    if (!tid) return reply(c, "⚠️ Mentionne la personne ou réponds à son message.");
    if (tid === c.uid) return reply(c, "😏 Tu ne peux pas t'embaucher toi-même.");
    if (tid === c.botID) return reply(c, "🤖 Je suis déjà très occupé, merci.");
    if (g.company.staff.length >= CO_LEVELS[g.company.level].staff) return reply(c, `👥 Ton entreprise est complète (${CO_LEVELS[g.company.level].staff} employés max). Améliore-la avec « royaume entreprise upgrade ».`);
    const tp = await load(c.usersData, tid);
    if (tp.g.company || tp.g.job) return reply(c, `⚠️ ${await nm(c, tid)} a déjà une entreprise ou un emploi.`);
    const co = g.company.name;
    return ask(c, { type: "hire", targetID: tid, body: (t, m) => `💼 ${t}, ${m} te propose un poste chez « ${co} » !\nTu recevras une part des revenus à chaque collecte.` });
  },

  async fire(c) {
    const me = c.me, g = me.g, tid = targetOf(c.event);
    if (!g.company) return reply(c, "⚠️ Tu n'as pas d'entreprise.");
    if (!tid) return reply(c, "⚠️ Mentionne la personne ou réponds à son message.");
    if (!g.company.staff.includes(tid)) return reply(c, "⚠️ Cette personne ne travaille pas pour toi.");
    coSettle(g);                    // règlement avant de changer le nombre d'employés
    g.company.staff = g.company.staff.filter((id) => id !== tid);
    const ep = await load(c.usersData, tid);
    if (ep.g.job && ep.g.job.owner === c.uid) ep.g.job = null;
    const [a, b] = [await nm(c, c.uid), await nm(c, tid)];
    return finish(c, `🔥 ${a} a licencié ${b} de « ${g.company.name} ».`, { others: [ep], mentions: [{ tag: a, id: c.uid }, { tag: b, id: tid }] });
  },

  async leave(c) {
    const me = c.me, g = me.g;
    if (!g.job) return reply(c, "⚠️ Tu n'es employé(e) nulle part.");
    const op = await load(c.usersData, g.job.owner), others = [];
    if (op.g.company) { coSettle(op.g); op.g.company.staff = op.g.company.staff.filter((id) => id !== c.uid); others.push(op); }
    const coName = op.g.company ? op.g.company.name : "l'entreprise";
    g.job = null;
    return finish(c, `👋 Tu as quitté « ${coName} ».`, { others });
  },

  async disband(c) {
    const me = c.me, g = me.g;
    if (!g.company) return reply(c, "⚠️ Tu n'as pas d'entreprise.");
    if (strip(c.args[2]) !== "confirm") return reply(c, `⚠️ Tu vas dissoudre « ${g.company.name} » (le coffre sera perdu, les employés libérés).\nPour confirmer : royaume entreprise disband confirm`);
    const others = [];
    for (const id of g.company.staff) {
      const ep = await load(c.usersData, id);
      if (ep.g.job && ep.g.job.owner === c.uid) ep.g.job = null;
      others.push(ep);
    }
    const name = g.company.name;
    g.company = null;
    return finish(c, `💥 L'entreprise « ${name} » a été dissoute.`, { others });
  },

  top: (c) => cmdTop(c, "entreprise")
};

async function cmdCompany(c) {
  const map = { create: "create", creer: "create", info: "info", voir: "info", collect: "collect", collecter: "collect", recolter: "collect",
    upgrade: "upgrade", ameliorer: "upgrade", hire: "hire", embaucher: "hire", fire: "fire", licencier: "fire",
    leave: "leave", demission: "leave", demissionner: "leave", disband: "disband", dissoudre: "disband", top: "top", classement: "top" };
  const act = CO_ACTIONS[map[strip(c.args[1])]];
  return act ? act(c) : reply(c, CO_HELP);
}

// ============================================================
//  👑 NOBLESSE
// ============================================================

// Détails du titre : seigneur, vassaux, labeur, prochaine promotion, roi et décret
async function cmdTitle(c) {
  const tid = targetOf(c.event) || c.uid, isSelf = tid === c.uid;
  const p = isSelf ? c.me : await load(c.usersData, tid), g = p.g, t = TBY[g.title];

  let txt = `${t.emoji} ${t.nom} ${await nm(c, tid)}\n${L("═", 40)}\n`;
  txt += `🏛️ Seigneur : ${g.lord ? await nm(c, g.lord) : "aucun"}\n`;
  if (t.vassauxMax) txt += `⚔️ Vassaux : ${g.vassals.length}/${t.vassauxMax}\n`;
  txt += `💼 Labeur : ${t.work.label} (toutes les ${t.work.cd} min, ${fmt(t.work.gain[0])} à ${fmt(t.work.gain[1])} $)\n`;
  if (g.vassals.length) txt += `\n⚔️ Vassaux :\n` + (await Promise.all(g.vassals.map(async (id) => `   • ${await nm(c, id)}`))).join("\n") + "\n";

  if (isSelf) {
    const nt = TITLES[t.rank + 1];
    txt += "\n" + (nt ? `⬆️ Prochain titre : ${nt.emoji} ${nt.nom} — ${FM(nt.prix)}${nt.vassauxReq ? ` (+ ${nt.vassauxReq} ${vas(nt.vassauxReq)})` : ""}${nt.id === "roi" ? " (+ 👑 Couronne)" : ""}` : "🌟 Tu as atteint le plus haut titre !") + "\n";
  }
  const kid = await findKing(c.usersData, true);
  if (kid) {
    const k = await load(c.usersData, kid);
    txt += `\n👑 Roi actuel : ${await nm(c, kid)}`;
    if (k.g.decree) txt += `\n📜 Décret : « ${k.g.decree.text} » (${day(k.g.decree.date)})`;
  } else txt += "\n👑 Le trône est vacant ! Un duc peut le réclamer avec « royaume promotion ».";
  return reply(c, txt.trim());
}

async function cmdPromo(c) {
  const me = c.me, g = me.g, t = TBY[g.title], nt = TITLES[t.rank + 1];
  if (!nt) return reply(c, "🌟 Tu as atteint le plus haut titre !");

  if (nt.id === "roi") {
    const kid = await findKing(c.usersData, true);
    if (kid) return reply(c, `👑 Le trône est occupé par ${await nm(c, kid)}. Tente « royaume revolte » (ducs seulement).`);
    if (!(g.inv.crown > 0)) return reply(c, "👑 Il te faut une Couronne pour monter sur le trône : royaume shop buy couronne");
  }
  if (g.vassals.length < nt.vassauxReq) return reply(c, `⚔️ Pour devenir ${nt.nom}, il te faut ${nt.vassauxReq} ${vas(nt.vassauxReq)} (tu en as ${g.vassals.length}).`);
  if (wallet(me) < nt.prix) return reply(c, `💸 Il te faut ${FM(nt.prix)} (tu as ${FM(wallet(me))}).`);

  addMoney(me, -nt.prix);
  if (nt.id === "roi") { g.inv.crown--; clearKing(); }
  g.title = nt.id;
  gainXp(g, 50 * nt.rank);
  addTx(g, "titre", -nt.prix, `Promotion : ${nt.nom}`);

  // Si mon seigneur n'est plus au-dessus de moi, le serment est rompu
  const others = [];
  let free = "";
  if (g.lord) {
    const lp = await load(c.usersData, g.lord);
    if (rankOf(lp.g) <= nt.rank) {
      lp.g.vassals = lp.g.vassals.filter((id) => id !== c.uid);
      g.lord = null;
      others.push(lp);
      free = "\n🕊️ Tu n'es plus sous les ordres de ton ancien seigneur.";
    }
  }
  const name = await nm(c, c.uid);
  return finish(c, `🎉 ${nt.emoji} ${name} devient ${nt.nom} !\n💵 Solde : ${FM(wallet(me))}${free}`, { others, mentions: [{ tag: name, id: c.uid }] });
}

async function cmdOath(c) {
  const me = c.me, g = me.g, lid = targetOf(c.event);
  if (!lid) return reply(c, "⚠️ Mentionne ton futur seigneur ou réponds à son message.");
  if (lid === c.uid) return reply(c, "😏 Tu ne peux pas te prêter serment à toi-même.");
  if (lid === c.botID) return reply(c, "🤖 Je suis un simple chroniqueur.");
  if (g.lord) return reply(c, `⚠️ Tu es déjà vassal de ${await nm(c, g.lord)}. Utilise « royaume quitter » d'abord.`);

  const lp = await load(c.usersData, lid), lt = TBY[lp.g.title];
  if (lt.rank <= rankOf(g)) return reply(c, `⚠️ ${await nm(c, lid)} n'a pas un titre supérieur au tien.`);
  if (lp.g.vassals.length >= lt.vassauxMax) return reply(c, `⚠️ ${await nm(c, lid)} a déjà le maximum de vassaux.`);

  const tname = TBY[g.title].nom;
  return ask(c, { type: "oath", targetID: lid, body: (t, m) => `🤝 ${t}, ${m} (${tname}) souhaite te prêter serment de fidélité.\n💰 Il te versera ${Math.round(TAX_RATE * 100)} % de ses gains.` });
}

async function cmdLeaveLord(c) {
  const me = c.me, g = me.g;
  if (!g.lord) return reply(c, "⚠️ Tu n'as pas de seigneur.");
  const lp = await load(c.usersData, g.lord), lname = await nm(c, g.lord);
  lp.g.vassals = lp.g.vassals.filter((id) => id !== c.uid);
  g.lord = null;
  return finish(c, `👋 Tu as quitté le service de ${lname}.`, { others: [lp] });
}

async function cmdExpel(c) {
  const me = c.me, g = me.g, vid = targetOf(c.event);
  if (!vid) return reply(c, "⚠️ Mentionne ton vassal ou réponds à son message.");
  if (!g.vassals.includes(vid)) return reply(c, "⚠️ Cette personne n'est pas ton vassal.");
  const vp = await load(c.usersData, vid);
  g.vassals = g.vassals.filter((id) => id !== vid);
  if (vp.g.lord === c.uid) vp.g.lord = null;
  const [a, b] = [await nm(c, c.uid), await nm(c, vid)];
  return finish(c, `🚪 ${a} a renvoyé son vassal ${b}.`, { others: [vp], mentions: [{ tag: a, id: c.uid }, { tag: b, id: vid }] });
}

// Lettres de noblesse : un noble offre le titre supérieur à quelqu'un (sans dépasser son propre titre)
async function cmdKnight(c) {
  const me = c.me, g = me.g, tid = targetOf(c.event);
  if (!tid) return reply(c, "⚠️ Mentionne la personne ou réponds à son message.");
  if (tid === c.uid) return reply(c, "😏 Tu ne peux pas t'anoblir toi-même.");
  if (tid === c.botID) return reply(c, "🤖 Je suis un simple chroniqueur.");
  if (rankOf(g) < TBY.chevalier.rank) return reply(c, "⚠️ Seuls les nobles (chevalier et plus) peuvent accorder des titres.");

  const tp = await load(c.usersData, tid), tName = await nm(c, tid);
  const newRank = rankOf(tp.g) + 1, nt = TITLES[newRank];
  if (!nt || newRank >= rankOf(g)) return reply(c, `⚠️ Tu ne peux pas élever ${tName} : son nouveau titre devrait rester inférieur au tien.`);

  const fee = Math.floor(nt.prix * ANOBLIR_FEE);
  if (wallet(me) < fee) return reply(c, `💸 Il te faut ${FM(fee)} (tu as ${FM(wallet(me))}).`);
  addMoney(me, -fee);
  addTx(g, "titre", -fee, `Lettres de noblesse pour ${tName}`);
  tp.g.title = nt.id;

  // Si son seigneur n'est plus au-dessus de lui, le serment est rompu
  const others = [tp];
  if (tp.g.lord) {
    const lp = await load(c.usersData, tp.g.lord);
    if (rankOf(lp.g) <= newRank) {
      lp.g.vassals = lp.g.vassals.filter((id) => id !== tid);
      tp.g.lord = null;
      if (lp.uid !== c.uid) others.push(lp); else g.vassals = g.vassals.filter((id) => id !== tid);
    }
  }
  const a = await nm(c, c.uid);
  return finish(c, `📜 ${a} accorde des lettres de noblesse à ${tName} : ${nt.emoji} ${nt.nom} !\n💸 Frais payés : ${FM(fee)}`, { others, mentions: [{ tag: a, id: c.uid }, { tag: tName, id: tid }] });
}

async function cmdRevolt(c) {
  const me = c.me, g = me.g;
  if (g.title !== "duc") return reply(c, "⚠️ Seuls les ducs peuvent tenter de renverser le roi.");
  const kid = await findKing(c.usersData, true);
  if (!kid) return reply(c, "👑 Il n'y a pas de roi : réclame le trône avec « royaume promotion ».");
  const left = cdLeft(g, "revolt", REVOLT_CD);
  if (left) return reply(c, `⏳ Reviens dans ${left}.`);
  if (wallet(me) < REVOLT_COST) return reply(c, `💸 Il te faut ${FM(REVOLT_COST)} (tu as ${FM(wallet(me))}).`);

  // Chances : 25 % + 3 % par vassal d'avance sur le roi (entre 10 % et 60 %)
  const kp = await load(c.usersData, kid);
  const chance = clamp(0.25 + 0.03 * (g.vassals.length - kp.g.vassals.length), 0.10, 0.60);
  const [a, b] = [await nm(c, c.uid), await nm(c, kid)];
  const mentions = [{ tag: a, id: c.uid }, { tag: b, id: kid }];

  g.cd.revolt = Date.now();
  addMoney(me, -REVOLT_COST);
  addTx(g, "revolte", -REVOLT_COST, "Financement d'une révolte");

  if (Math.random() >= chance)
    return finish(c, `⚔️ La révolte de ${a} contre ${b} a échoué ! Tu perds ${FM(REVOLT_COST)}.\n🎲 Chances : ${Math.round(chance * 100)} %`, { mentions });

  // Succès : le duc devient roi, l'ancien roi devient duc
  const others = [kp];
  g.title = "roi";
  gainXp(g, 300);
  if (g.lord) {
    const lp = await load(c.usersData, g.lord);
    lp.g.vassals = lp.g.vassals.filter((id) => id !== c.uid);
    g.lord = null;
    others.push(lp);
  }
  kp.g.title = "duc";
  kp.g.decree = null;               // le décret de l'ancien roi est annulé
  clearKing();
  return finish(c, `🔥 RÉVOLUTION ! ${a} renverse ${b} et devient ROI ! 👑\n${b} est rétrogradé au rang de duc.`, { others, mentions });
}

async function cmdDecree(c) {
  const g = c.me.g;
  if (g.title !== "roi") return reply(c, "⚠️ Seul le roi peut publier un décret.");
  const text = c.args.slice(1).join(" ").replace(/\s+/g, " ").trim();
  if (!text) return reply(c, "⚠️ Écris ton décret. Exemple : royaume decret Les impôts sont suspendus !");
  if (text.length > DECREE_MAX) return reply(c, `⚠️ Ton décret est trop long (maximum ${DECREE_MAX} caractères).`);
  g.decree = { text, date: Date.now() };
  return finish(c, `📜 Décret royal publié : « ${text} »`);
}

// ============================================================
//  🔁 RÉPONSES AUX DEMANDES (oui / non)
// ============================================================
// Chaque fonction reçoit c (contexte) et R (la demande mémorisée par ask()).
// On recharge les joueurs à ce moment : la situation a pu changer pendant l'attente.

const REPLIES = {
  async marry(c, R) {
    const a = await load(c.usersData, R.fromID), b = await load(c.usersData, R.targetID);
    if (a.g.spouse || b.g.spouse) return reply(c, "⚠️ L'un de vous n'est plus célibataire, la demande est annulée.");
    if (!(a.g.inv.ring > 0)) return reply(c, "⚠️ La bague a disparu, la demande est annulée.");
    a.g.inv.ring--;
    const since = Date.now();
    a.g.spouse = { id: b.uid, since }; b.g.spouse = { id: a.uid, since };
    gainXp(a.g, 20); gainXp(b.g, 20);
    c.me = a;
    return finish(c, `💖 Félicitations ! ${R.fromName} et ${R.targetName} sont maintenant mariés ! 💍`, { others: [b], mentions: [{ tag: R.fromName, id: R.fromID }, { tag: R.targetName, id: R.targetID }] });
  },

  async adopt(c, R) {
    const a = await load(c.usersData, R.fromID), b = await load(c.usersData, R.targetID);
    if (a.g.children.length >= MAX_CHILDREN || b.g.parent) return reply(c, "⚠️ La situation a changé, la demande est annulée.");
    const since = Date.now();
    a.g.children.push({ id: b.uid, since });
    b.g.parent = a.uid;
    c.me = a;
    return finish(c, `🎉 ${R.fromName} a adopté ${R.targetName} ! Bienvenue dans la famille 👨‍👧`, { others: [b], mentions: [{ tag: R.fromName, id: R.fromID }, { tag: R.targetName, id: R.targetID }] });
  },

  async hire(c, R) {
    const a = await load(c.usersData, R.fromID), b = await load(c.usersData, R.targetID);
    if (!a.g.company || a.g.company.staff.length >= CO_LEVELS[a.g.company.level].staff || b.g.company || b.g.job)
      return reply(c, "⚠️ La situation a changé, l'offre est annulée.");
    coSettle(a.g);                  // règlement AVANT d'ajouter l'employé (le revenu va augmenter)
    a.g.company.staff.push(b.uid);
    b.g.job = { owner: a.uid };
    c.me = a;
    return finish(c, `🎉 ${R.targetName} est embauché(e) chez « ${a.g.company.name} » par ${R.fromName} !`, { others: [b], mentions: [{ tag: R.targetName, id: R.targetID }, { tag: R.fromName, id: R.fromID }] });
  },

  async oath(c, R) {
    const v = await load(c.usersData, R.fromID), l = await load(c.usersData, R.targetID);   // vassal, seigneur
    if (v.g.lord || rankOf(l.g) <= rankOf(v.g) || l.g.vassals.length >= TBY[l.g.title].vassauxMax)
      return reply(c, "⚠️ La situation a changé, la demande est annulée.");
    v.g.lord = l.uid;
    l.g.vassals.push(v.uid);
    c.me = v;
    return finish(c, `🤝 ${R.fromName} est maintenant le vassal de ${R.targetName} !`, { others: [l], mentions: [{ tag: R.fromName, id: R.fromID }, { tag: R.targetName, id: R.targetID }] });
  },

  async duel(c, R) {
    const a = await load(c.usersData, R.fromID), b = await load(c.usersData, R.targetID), bet = R.bet || 0;
    if (wallet(a) < bet || wallet(b) < bet) return reply(c, "💸 L'un de vous n'a plus assez d'argent pour la mise, duel annulé.");

    const players = [a, b], names = [R.fromName, R.targetName];
    const hp0 = players.map((p) => DUEL_HP + DUEL_HP_PER_RANK * rankOf(p.g));
    const { winner, log } = simulate(names, hp0);
    const w = players[winner], l = players[1 - winner];

    w.g.duel.w++; l.g.duel.l++;
    addMoney(w, bet); addMoney(l, -bet);
    gainXp(w.g, 25); gainXp(l.g, 8);
    if (bet) { addTx(w.g, "duel", bet, `Duel gagné contre ${names[1 - winner]}`); addTx(l.g, "duel", -bet, `Duel perdu contre ${names[winner]}`); }

    const shown = log.length > DUEL_LOG ? ["…", ...log.slice(-DUEL_LOG)] : log;
    let txt = `⚔️ DUEL : ${names[0]} (${hp0[0]} PV) VS ${names[1]} (${hp0[1]} PV)\n${L("─", 40)}\n${shown.join("\n")}\n\n`;
    txt += `🏆 ${names[winner]} remporte le duel contre ${names[1 - winner]} !`;
    if (bet) txt += `\n💰 +${FM(bet)} gagnés !`;
    txt += `\n📊 Bilan de ${names[winner]} : ${w.g.duel.w} V / ${w.g.duel.l} D`;
    c.me = a;
    return finish(c, txt, { others: [b] });
  }
};

// ============================================================
//  🚦 ROUTES : quelle sous-commande appelle quelle fonction
// ============================================================
const ROUTES = {
  // Profil
  help: cmdHelp, aide: cmdHelp,
  stat: cmdStat, status: cmdStat, profil: cmdStat, profile: cmdStat, dashboard: cmdStat, fiche: cmdStat,
  bio: cmdBio,
  rank: cmdRank, rang: cmdRank, niveau: cmdRank,
  succes: cmdAch, achievements: cmdAch,
  history: cmdHistory, historique: cmdHistory,
  top: (c) => cmdTop(c), classement: (c) => cmdTop(c), leaderboard: (c) => cmdTop(c),
  // Économie
  daily: cmdDaily, quotidien: cmdDaily,
  work: cmdWork, travail: cmdWork, travailler: cmdWork, labeur: cmdWork,
  pay: cmdPay, donner: cmdPay, give: cmdPay,
  rob: cmdRob, voler: cmdRob,
  bank: (c) => cmdBank(c), banque: (c) => cmdBank(c),
  deposit: (c) => cmdBank(c, "deposit"), depot: (c) => cmdBank(c, "deposit"),
  withdraw: (c) => cmdBank(c, "withdraw"), retrait: (c) => cmdBank(c, "withdraw"), retirer: (c) => cmdBank(c, "withdraw"),
  shop: (c) => cmdShop(c), boutique: (c) => cmdShop(c),
  buy: (c) => cmdShop(c, "buy"), acheter: (c) => cmdShop(c, "buy"),
  inv: (c) => cmdShop(c, "inv"), inventaire: (c) => cmdShop(c, "inv"), sac: (c) => cmdShop(c, "inv"),
  slots: cmdSlots, slot: cmdSlots, casino: cmdSlots,
  coinflip: cmdCoin, pf: cmdCoin, flip: cmdCoin, pileouface: cmdCoin,
  // Social
  marry: cmdMarry, mariage: cmdMarry, epouser: cmdMarry,
  divorce: cmdDivorce, divorcer: cmdDivorce,
  couple: cmdCouple, ship: cmdShip,
  adopt: cmdAdopt, adopter: cmdAdopt,
  disown: cmdDisown, renier: cmdDisown,
  family: cmdFamily, famille: cmdFamily,
  duel: cmdDuel, combat: cmdDuel, fight: cmdDuel,
  // Entreprise
  entreprise: cmdCompany, company: cmdCompany, boite: cmdCompany, societe: cmdCompany,
  demission: (c) => CO_ACTIONS.leave(c),
  // Noblesse
  titre: cmdTitle, titres: cmdTitle, noblesse: cmdTitle,
  promotion: cmdPromo, promo: cmdPromo,
  serment: cmdOath, jurer: cmdOath, vassal: cmdOath,
  quitter: cmdLeaveLord,
  chasser: cmdExpel, renvoyer: cmdExpel,
  anoblir: cmdKnight, ennoblir: cmdKnight,
  revolte: cmdRevolt, renverser: cmdRevolt,
  decret: cmdDecree
};

// ─── Export ───────────────────────────────────────────────────
module.exports = {
  config: {
    name: CMD,
    aliases: ["jeu", "rpg", "game"],
    version: "2.0",
    author: "Camille Uchiha 🍓",
    countDown: 3,
    role: 0,
    description: { fr: "👑 Le jeu complet : économie, mariage, famille, entreprises et noblesse (paysan → roi)." },
    category: "economy",
    guide: { fr: "Tapez 'royaume help' pour voir toutes les commandes." }
  },

  onStart: async function ({ message, event, args, api, usersData }) {
    const c = { message, event, args, api, usersData, uid: String(event.senderID), botID: String(api.getCurrentUserID()), names: new Map() };
    c.me = await load(usersData, c.uid);

    // Sans argument : ta fiche. Avec une mention seule : la fiche de la personne.
    const sub = strip(args[0] || "stat");
    let handler = ROUTES[sub];
    if (!handler && Object.keys(event.mentions || {}).length) handler = cmdStat;
    if (!handler) return reply(c, "❓ Commande inconnue. Tapez 'royaume help' pour voir la liste.");

    try {
      return await handler(c);
    } catch (e) {
      console.error("[royaume]", e);
      return message.reply("❌ Une erreur est survenue. Réessaie dans un instant.");
    }
  },

  // Réponse « oui / non » à une demande (mariage, adoption, duel, embauche, serment)
  onReply: async function ({ event, Reply, message, usersData, api }) {
    const c = { message, event, args: [], api, usersData, uid: String(event.senderID), botID: String(api.getCurrentUserID()), names: new Map() };

    // Seule la personne ciblée peut répondre
    if (String(event.senderID) !== String(Reply.targetID))
      return message.reply({ body: `⚠️ Seul(e) ${Reply.targetName} peut répondre à cette demande.`, mentions: [{ tag: Reply.targetName, id: Reply.targetID }] });

    if (Date.now() > Reply.expires) {
      global.GoatBot.onReply.delete(Reply.messageID);
      return message.reply("⌛ La demande a expiré.");
    }

    const ans = strip(event.body);
    if (NO.includes(ans)) {
      global.GoatBot.onReply.delete(Reply.messageID);
      return message.reply({ body: `💔 ${Reply.targetName} a refusé la demande de ${Reply.fromName}.`, mentions: [{ tag: Reply.targetName, id: Reply.targetID }, { tag: Reply.fromName, id: Reply.fromID }] });
    }
    if (!YES.includes(ans)) return message.reply("❓ Réponds par « oui » ou « non ».");

    global.GoatBot.onReply.delete(Reply.messageID);   // évite qu'on réponde deux fois
    const fn = REPLIES[Reply.type];
    if (!fn) return;
    try {
      return await fn(c, Reply);
    } catch (e) {
      console.error("[royaume:reply]", e);
      return message.reply("❌ Une erreur est survenue. Réessaie dans un instant.");
    }
  }
};
