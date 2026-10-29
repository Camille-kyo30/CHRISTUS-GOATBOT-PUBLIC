// ============================================================
//  sao.js — ⚔️ SWORD ART ONLINE : l'aventure d'Aincrad dans UNE commande
//  (même principe que mafia.js / royaume.js : une commande + des sous-commandes)
//  Auteur : Camille Uchiha 🍓      Version : 1.0
//
//  🏰 Aincrad : 100 étages. Explore chaque labyrinthe, bats les monstres générés par le BOT,
//     affronte le BOSS de l'étage (Last Attack Bonus !) et monte jusqu'au Palais de Rubis.
//  ⚔️ Les combats suivent la structure de « naruto-storm » (tour par tour) :
//        a = attaque • b = compétence d'épée • x = ultime • c = recharger SP
//        d = parade • p = potion • f = fuir      → tu RÉPONDS au message du bot.
//  ☠️ Death Game : si tes PV tombent à 0 tu perds des Cols et de l'expérience.
//  👑 L'ADMIN DU BOT est le DIEU SUPRÊME (Kayaba Akihiko / Heathcliff) :
//        ♾️ Objet Immortel (PV infinis, jamais vaincu), autorité sur tout le système.
//        Commandes réservées : « sao gm » (donner des Cols, niveaux, étages, soigner,
//        bannir du jeu, accorder la compétence unique Dual Blades, annonces, événements…).
//  💰 Les Cols = le MÊME portefeuille (user.money) que royaume, police et école.
//
//  Pour installer : mets ce fichier dans scripts/cmds/ (commande : sao).
// ============================================================

"use strict";

let fonts = null;
try { fonts = require("../../func/font.js"); } catch (e) { fonts = null; }
const B = (s) => { try { return fonts && typeof fonts.bold === "function" ? fonts.bold(s) : s; } catch (e) { return s; } };

const CMD = "sao";
const M = 100;                                   // échelle de l'argent (même que les autres jeux)
const $ = (n) => n * M;
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;

// ─── ⚙️ RÉGLAGES ───
const START_COL = $(500);                        // Cols de départ offerts
const MAX_LEVEL = 100;
const HUNT_CD = 2 * MIN;                         // délai entre deux chasses
const MOBS_COUNT = 3, MOB_TTL = 30 * MIN;
const MAP_PER_WIN = 8;                           // +8 % de carte du labyrinthe par monstre vaincu
const TURN_TTL = 3 * MIN;                        // temps pour répondre pendant un combat
const REGEN_PER_MIN = 0.01;                      // 1 % des PV max par minute
const INN = { cost: $(100) };                    // auberge : soins complets
const DEATH = { colLoss: 0.20, xpLoss: 0.30, rest: 5 * MIN };
const ARGO = { cost: $(250), cd: 3 * HOUR, bonus: 0.25, fights: 3 };   // info d'Argo
const FORGE = { base: $(300), maxUp: 10 };
const EVOLVE = { lingots: 3, base: $(1000) };
const DAILY = { cd: DAY, base: $(200) };         // solde quotidienne de la guilde
const DMG = { basic: [0.9, 1.1], skill: [1.5, 1.9], ult: [2.8, 3.6], skillSp: 20, ultSp: 75, ultFail: 0.25, chargeSp: 25, regenSp: 5, crit: 0.10 };

// ─── Données ──────────────────────────────────────────────────
// Les armes (classes). b = compétence d'épée (20 SP), x = ultime (75 SP)
const CLASSES = {
  epee: { emoji: "🗡️", nom: "Épée à une main", alias: ["epee", "sword", "kirito", "une-main"], b: "Horizontal Arc", x: "Vorpal Strike", atk: 1.0, hp: 1.0, legend: "Elucidator" },
  rapiere: { emoji: "🤺", nom: "Rapière", alias: ["rapiere", "rapier", "asuna"], b: "Linear", x: "Flashing Penetrator", atk: 1.05, hp: 0.95, legend: "Lambent Light" },
  deuxmains: { emoji: "⚔️", nom: "Épée à deux mains", alias: ["deuxmains", "claymore", "2mains", "grande-epee"], b: "Rage Spike", x: "Avalanche", atk: 1.15, hp: 1.0, legend: "Lame des Titans" },
  hache: { emoji: "🪓", nom: "Hache", alias: ["hache", "axe", "agil"], b: "Whirlwind", x: "Fendoir", atk: 1.1, hp: 1.1, legend: "Hache du Colosse" },
  lance: { emoji: "🔱", nom: "Lance", alias: ["lance", "spear"], b: "Pointe Perçante", x: "Charge Draconique", atk: 1.05, hp: 1.0, legend: "Lance du Dragon" },
  katana: { emoji: "🥷", nom: "Katana", alias: ["katana", "klein"], b: "Tsujikaze", x: "Iaï Éclair", atk: 1.08, hp: 0.95, legend: "Katana Céleste" },
  dagues: { emoji: "🔪", nom: "Dagues", alias: ["dagues", "dague", "dagger"], b: "Rapid Bite", x: "Shadow Stitch", atk: 0.95, hp: 0.9, legend: "Crocs de l'Ombre" },
  masse: { emoji: "🔨", nom: "Masse", alias: ["masse", "mace", "marteau"], b: "Heavy Impact", x: "Séisme", atk: 1.1, hp: 1.05, legend: "Marteau Sacré" }
};
// Compétences uniques (accordées par le DIEU du système)
const UNIQUE = {
  dual: { emoji: "⚔️⚔️", nom: "Deux Lames (Dual Blades)", b: "Double Circular", x: "Starburst Stream (16 coups)", atk: 1.35, hp: 1.1, ultMult: 4.6, ultFail: 0.12 },
  divine: { emoji: "✝️", nom: "Lame Divine (Holy Sword)", b: "Cross Block", x: "Objet Immortel", atk: 2.0, hp: 2.0, ultMult: 6, ultFail: 0 }
};
// Armes : paliers (nom, ATK) — le palier 5 est la légende de la classe
const TIERS = [
  { nom: "de Départ", atk: 6 }, { nom: "en Fer", atk: 20 }, { nom: "en Acier", atk: 40 },
  { nom: "en Mithril", atk: 70 }, { nom: "en Cristal", atk: 105 }, { nom: "LÉGENDAIRE", atk: 150 }
];
// Armures : paliers (nom, PV bonus, DEF)
const ARMORS = [
  { nom: "Tenue de Départ", hp: 0, def: 0 }, { nom: "Armure de Cuir", hp: 80, def: 6 }, { nom: "Cotte de Mailles", hp: 220, def: 16 },
  { nom: "Armure de Plaques", hp: 480, def: 32 }, { nom: "Manteau de Minuit", hp: 800, def: 52 }, { nom: "Uniforme des Chevaliers du Sang", hp: 1300, def: 80 }
];
const ARMOR_COST = [0, $(500), $(2500), $(9000), 0, 0];        // 4 et 5 : seulement par Last Attack
// Boutique
const ITEMS = {
  potion: { emoji: "🧪", nom: "Potion de soin", prix: $(80), desc: "Rend 40 % des PV (en combat : p)", alias: ["potion", "soin"] },
  elixir: { emoji: "💙", nom: "Élixir de SP", prix: $(120), desc: "+50 SP (en combat : e)", alias: ["elixir", "sp"] },
  cristal: { emoji: "🔷", nom: "Cristal de téléportation", prix: $(300), desc: "Fuite garantie (f) ou voyage instantané", alias: ["cristal", "teleport", "tp"] },
  sandwich: { emoji: "🥪", nom: "Sandwich d'Asuna", prix: $(200), desc: "+20 % de dégâts pendant 3 combats : sao utiliser sandwich", alias: ["sandwich", "repas", "ration"] },
  lingot: { emoji: "⛏️", nom: "Lingot", prix: $(400), desc: "Sert à la forge pour évoluer d'arme (3 requis)", alias: ["lingot", "lingots"] }
};
const findItem = (s) => { const q = strip(s); return Object.keys(ITEMS).find((id) => id === q || ITEMS[id].alias.includes(q)); };

// Les étages d'Aincrad
const TOWNS = { 1: "Ville du Commencement", 2: "Urbus", 3: "Zumfut", 4: "Rovia", 5: "Karluin", 22: "Coral", 35: "Mishe", 47: "Floria", 48: "Lindas", 50: "Algade", 55: "Granzam", 61: "Selmburg", 74: "Kamdet", 75: "Colinia", 100: "Palais de Rubis" };
const BOSSES = {
  1: { nom: "Illfang le Seigneur Kobold", emoji: "👺", la: { armor: 4, text: "🧥 Manteau de Minuit" } },
  2: { nom: "Baran le Général Taureau", emoji: "🐂" },
  3: { nom: "Nerius le Treant Maléfique", emoji: "🌳" },
  10: { nom: "Kagachi le Seigneur Samouraï", emoji: "👹" },
  25: { nom: "Les Géants Jumeaux", emoji: "🗿", la: { weapon: 4, text: "💎 Arme en Cristal" } },
  50: { nom: "Le Gardien d'Algade", emoji: "🛡️", la: { weapon: 5, text: "✨ ARME LÉGENDAIRE" } },
  74: { nom: "The Gleam Eyes", emoji: "👁️" },
  75: { nom: "The Skullreaper", emoji: "💀", la: { armor: 5, text: "🩸 Uniforme des Chevaliers du Sang" } },
  100: { nom: "Heathcliff (Kayaba Akihiko)", emoji: "✝️" }
};
const GENERIC_BOSS = ["Le Gardien", "Le Seigneur", "Le Colosse", "La Reine", "Le Dragon", "Le Chevalier Maudit"];
const bossOf = (f) => BOSSES[f] || { nom: `${GENERIC_BOSS[f % GENERIC_BOSS.length]} de l'étage ${f}`, emoji: "👹" };
const townOf = (f) => TOWNS[f] || `Ville de l'étage ${f}`;
// Monstres par tranche d'étages
const MOBS = [
  { to: 10, list: [["🐗", "Frenzy Boar"], ["🐺", "Dire Wolf"], ["🌱", "Little Nepent"], ["👺", "Ruin Kobold Trooper"], ["🦎", "Lizardman"]] },
  { to: 30, list: [["🦎", "Lizardman Wrestler"], ["🐝", "Windwasp"], ["🧟", "Ghoul"], ["🕷️", "Giant Spider"], ["🪨", "Stone Golem"]] },
  { to: 50, list: [["🌳", "Evil Treant"], ["💀", "Skeleton Reaper"], ["🐻", "Dire Bear"], ["🧙", "Dark Mage"], ["🦅", "Harpy"]] },
  { to: 75, list: [["😈", "Demonic Servant"], ["👻", "Lesser Wraith"], ["🛡️", "Armored Troll"], ["🐲", "Wyvern"], ["⚰️", "Undead Knight"]] },
  { to: 100, list: [["🐉", "Dragon Knight"], ["🧛", "Dark Elf"], ["👹", "Abyssal Lord"], ["🦂", "Giant Scorpion"], ["⚔️", "Fallen Paladin"]] }
];
const TITLES_BY_FLOOR = [[0, "Joueur"], [1, "Survivant"], [10, "Combattant de Première Ligne"], [25, "Vétéran"], [50, "Champion d'Aincrad"], [74, "Héros d'Aincrad"], [99, "Libérateur"], [100, "Vainqueur du Jeu"]];
const titleOf = (g) => { let t = TITLES_BY_FLOOR[0][1]; for (const [f, n] of TITLES_BY_FLOOR) if (g.cleared >= f) t = n; return t; };

// ─── Helpers ──────────────────────────────────────────────────
const fmt = (n) => String(Math.floor(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const FM = (n) => `${fmt(n)} Cols`;
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rf = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[rand(0, arr.length - 1)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const L = (ch = "─", n = 40) => ch.repeat(n);
const num = (s) => (/^\d{1,12}$/.test(s || "") ? parseInt(s) : NaN);
const strip = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();
const bar = (v, max, w = 10) => { const f = Math.floor(clamp(v / (max || 1), 0, 1) * w); return "█".repeat(f) + "░".repeat(w - f); };
function dur(ms) {
  const h = Math.floor(ms / HOUR), m = Math.floor((ms % HOUR) / MIN), s = Math.floor((ms % MIN) / 1000);
  return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
}
const hpColor = (r) => (r >= 0.85 ? "💚" : r >= 0.55 ? "💛" : r >= 0.25 ? "🧡" : r > 0 ? "❤️" : "💔");
const xpNeed = (lv) => 100 + 45 * lv;

// ─── Joueur ───────────────────────────────────────────────────
function initSao() {
  return {
    created: false, cls: null, unique: null,       // arme choisie, compétence unique éventuelle
    lv: 1, xp: 0, hp: null, sp: 100, hpAt: Date.now(),
    floor: 1, cleared: 0, map: 0,                  // étage actuel, étages terminés, % de carte
    weapon: { tier: 0, up: 0 }, armor: 0,
    inv: {}, kills: 0, bosses: 0, deaths: 0, laCount: 0, fled: 0,
    cd: {}, mobs: [], buff: 0, argo: 0, dead: 0, banned: false, title: null,
    duelW: 0, duelL: 0, spouse: null, guild: null, guildInfo: null, invite: null,
    world: null                                    // (admin) événement mondial { text, until, xp, col }
  };
}
function normalize(raw) {
  const g = Object.assign(initSao(), raw || {});
  g.weapon = Object.assign({ tier: 0, up: 0 }, (raw && raw.weapon) || {});
  g.weapon.tier = clamp(Math.floor(Number(g.weapon.tier) || 0), 0, TIERS.length - 1);
  g.weapon.up = clamp(Math.floor(Number(g.weapon.up) || 0), 0, FORGE.maxUp);
  g.armor = clamp(Math.floor(Number(g.armor) || 0), 0, ARMORS.length - 1);
  g.lv = clamp(Math.floor(Number(g.lv) || 1), 1, MAX_LEVEL);
  g.floor = clamp(Math.floor(Number(g.floor) || 1), 1, 100);
  g.cleared = clamp(Math.floor(Number(g.cleared) || 0), 0, 100);
  g.map = clamp(Math.floor(Number(g.map) || 0), 0, 100);
  g.inv = Object.assign({}, g.inv || {});
  g.cd = Object.assign({}, g.cd || {});
  if (!Array.isArray(g.mobs)) g.mobs = [];
  if (g.cls && !CLASSES[g.cls]) g.cls = null;
  if (g.unique && !UNIQUE[g.unique]) g.unique = null;
  return g;
}
const wallet = (p) => Number(p.user.money) || 0;
function addMoney(p, n) { p.user.money = Math.max(0, wallet(p) + n); }
const cdLeft = (g, key, ms) => { const d = ms - (Date.now() - (g.cd[key] || 0)); return d > 0 ? dur(d) : null; };

// Statistiques (dépendent du niveau, de l'arme et de l'armure)
function klass(g) { return g.unique ? UNIQUE[g.unique] : CLASSES[g.cls]; }
function stats(g) {
  const k = klass(g) || CLASSES.epee, base = CLASSES[g.cls] || CLASSES.epee;
  const atkBase = (18 + 3.5 * g.lv + TIERS[g.weapon.tier].atk + g.weapon.up * (3 + g.weapon.tier * 1.5));
  const maxHp = Math.floor((300 + 45 * g.lv + ARMORS[g.armor].hp) * (k.hp || 1));
  return { atk: Math.floor(atkBase * (k.atk || base.atk)), maxHp, def: ARMORS[g.armor].def + Math.floor(g.lv / 2) };
}
const weaponName = (g) => {
  const c = CLASSES[g.cls] || CLASSES.epee;
  return g.weapon.tier === 5 ? `${c.legend}${g.weapon.up ? ` +${g.weapon.up}` : ""}` : `${c.nom} ${TIERS[g.weapon.tier].nom}${g.weapon.up ? ` +${g.weapon.up}` : ""}`;
};

// Régénération : 1 % des PV par minute (et sortie d'évanouissement)
function tick(p) {
  const g = p.g, now = Date.now(), st = stats(g);
  if (g.hp === null || g.hp === undefined) g.hp = st.maxHp;
  const gain = Math.floor(((now - (g.hpAt || now)) / MIN) * REGEN_PER_MIN * st.maxHp);
  if (gain > 0) { g.hp = Math.min(st.maxHp, g.hp + gain); g.hpAt = now; }
  g.hp = Math.min(g.hp, st.maxHp);
  if (g.hp >= st.maxHp) g.hpAt = now;
  g.sp = clamp(Number(g.sp) || 0, 0, 100);
}

async function load(usersData, uid) {
  let user = await usersData.get(uid);
  if (!user) user = { money: 0, exp: 0, data: {} };
  if (!user.data) user.data = {};
  user.data.sao = normalize(user.data.sao);
  const p = { uid: String(uid), user, g: user.data.sao, notes: [] };
  tick(p);
  return p;
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
    try { n = await c.usersData.getName(id); } catch (e) { /* nom par défaut */ }
    c.names.set(id, n || `Joueur ${id.slice(-4)}`);
  }
  return c.names.get(id);
}
function targetOf(event, args) {
  let id = Object.keys(event.mentions || {})[0];
  if (!id && event.messageReply) id = event.messageReply.senderID;
  if (!id && args) { const n = args.find((a) => /^\d{8,}$/.test(a)); if (n) id = n; }
  return id ? String(id) : null;
}

// 👑 LE DIEU SUPRÊME : l'admin du bot (rôle 2+) ou un UID listé dans adminBot
function isGod(uid, role) {
  if (Number(role) >= 2) return true;
  try { const a = (global.GoatBot && global.GoatBot.config && global.GoatBot.config.adminBot) || []; return a.map(String).includes(String(uid)); } catch (e) { return false; }
}
const GOD = { nom: "Kayaba Akihiko", titre: "✝️ DIEU SUPRÊME D'AINCRAD", obj: "♾️ Objet Immortel : PV infinis, invincible, autorité sur tout le système" };

// Événement mondial lancé par le Dieu (stocké chez l'admin qui l'a lancé)
let WORLD = null;       // { text, until, xp, col } gardé en mémoire + sauvegardé chez le dieu
const worldOn = () => (WORLD && WORLD.until > Date.now() ? WORLD : null);

// ─── Réponses ─────────────────────────────────────────────────
const reply = (c, text) => c.message.reply(B(text));
async function finish(c, text, { mentions, others = [] } = {}) {
  const players = [c.me];
  for (const o of others) if (!players.includes(o)) players.push(o);
  let out = text;
  for (const p of players) {
    if (!p.notes.length) continue;
    out += `\n\n${p.notes.join("\n")}`;
    p.notes = [];
  }
  for (const p of players) await save(c.usersData, p);
  return mentions ? c.message.reply({ body: out, mentions }) : c.message.reply(B(out));
}
function needChar(c) {
  const g = c.me.g;
  if (c.god) return false;
  if (g.banned) { reply(c, "☠️ Ton compte a été supprimé du jeu par le système. (Seul le Dieu peut te ressusciter : « sao gm revive »)"); return true; }
  if (!g.created) { reply(c, `🎮 Tu n'es pas encore connecté à Aincrad !\n👉 sao creer <arme>\nArmes : ${Object.keys(CLASSES).join(", ")}`); return true; }
  return false;
}
function notDead(c) {
  const left = (c.me.g.dead || 0) - Date.now();
  if (left > 0 && !c.god) { reply(c, `😵 Tu es inconscient après ta défaite… Réveil dans ${dur(left)}.\n👉 sao auberge (soin immédiat)`); return true; }
  return false;
}

// ─── XP et niveaux ────────────────────────────────────────────
function gainXp(p, n) {
  const g = p.g, w = worldOn();
  if (w && w.xp > 1) n = Math.floor(n * w.xp);
  if (g.spouse) n = Math.floor(n * 1.1);
  g.xp += n;
  let up = 0;
  while (g.lv < MAX_LEVEL && g.xp >= xpNeed(g.lv)) { g.xp -= xpNeed(g.lv); g.lv++; up++; }
  if (g.lv >= MAX_LEVEL) g.xp = Math.min(g.xp, xpNeed(g.lv) - 1);
  if (up) {
    const st = stats(g);
    g.hp = st.maxHp; g.sp = 100;
    const bonus = $(100) * g.lv;
    addMoney(p, bonus);
    p.notes.push(`🆙 NIVEAU ${g.lv} ! PV et SP restaurés  •  Bonus : +${FM(bonus)}`);
  }
}

// ============================================================
//  ⚔️ MOTEUR DE COMBAT (structure naruto-storm : on répond avec a / b / x / c / d …)
// ============================================================

function makeMob(g, kind, floor, lvlHint) {
  const band = MOBS.find((b) => floor <= b.to) || MOBS[MOBS.length - 1];
  const lvl = clamp(lvlHint || (floor + rand(0, 2)), 1, 110);
  if (kind === "boss") {
    const b = bossOf(floor);
    return { kind, emoji: b.emoji, nom: b.nom, lvl: lvl + 3, max: Math.floor((80 + 55 * (lvl + 3)) * 6), atk: Math.floor((12 + 6 * (lvl + 3)) * 1.35), boss: true, floor };
  }
  const [emoji, nom] = pick(band.list);
  return { kind, emoji, nom, lvl, max: 80 + 55 * lvl, atk: 12 + 6 * lvl, boss: false, floor };
}
function ensureMobs(g) {
  const now = Date.now();
  g.mobs = g.mobs.filter((m) => m.exp > now && m.floor === g.floor);
  while (g.mobs.length < MOBS_COUNT) {
    const m = makeMob(g, "mob", g.floor, clamp(g.floor + rand(-1, 3), 1, 110));
    m.exp = now + MOB_TTL; g.mobs.push(m);
  }
  g.mobs.sort((a, b) => a.lvl - b.lvl);
  return g.mobs;
}
const mobReward = (m) => ({ xp: 20 + 12 * m.lvl, col: Math.floor($(15) * (1 + 0.12 * m.lvl) * rf(0.8, 1.3)) });

const fightText = (S, log) => {
  const p = S.p, m = S.m;
  const lines = [`⚔️ ${m.boss ? "COMBAT DE BOSS" : "COMBAT"} — ${m.emoji} ${m.nom} (Niv.${m.lvl})`, L("━", 30)];
  if (log) lines.push(log, L("━", 30));
  lines.push(`${hpColor(S.hp / S.maxHp)} ${S.name}  ${Math.max(0, Math.ceil(S.hp))}/${S.maxHp}\n   ${bar(S.hp, S.maxHp, 12)}  💙 SP ${Math.floor(S.sp)}/100${S.buff ? "  🥪+20 %" : ""}`);
  lines.push(`${m.boss && S.phase ? "🔥" : "👹"} ${m.nom}  ${Math.max(0, Math.ceil(m.hp))}/${m.max}\n   ${bar(m.hp, m.max, 12)}`);
  lines.push(L("━", 30));
  lines.push(`✍️ Réponds à CE message :\n» a attaque • b ${S.k.b} (−${DMG.skillSp} SP)\n» x ${S.k.x} (−${DMG.ultSp} SP)\n» c recharger SP • d parer • p potion • e élixir${m.boss ? "" : " • f fuir"}`);
  return lines.join("\n");
};

// Démarre un combat et attend les réponses du joueur
async function startFight(c, m, kind) {
  const me = c.me, g = me.g, st = stats(g), k = klass(g) || CLASSES.epee;
  const S = {
    uid: c.uid, name: await nm(c, c.uid), k, m: Object.assign({}, m, { hp: m.max }), kind, floor: m.floor || g.floor,
    atk: st.atk, def: st.def, maxHp: st.maxHp, hp: g.hp, sp: g.sp, turn: 0, defending: false, lastC: false, buff: g.buff > 0, phase: 0,
    mult: { ult: k.ultMult || DMG.ult[1], fail: k.ultFail !== undefined ? k.ultFail : DMG.ultFail }
  };
  if (S.buff) g.buff--;
  if (g.argo > 0) { S.argo = true; g.argo--; }
  await save(c.usersData, me);
  return sendFight(c, S, S.argo ? "📜 Les infos d'Argo : tu connais la faiblesse du monstre (+25 % de dégâts) !" : "Le combat commence !");
}
function sendFight(c, S, log) {
  return c.message.reply(B(fightText(S, log)), (err, info) => {
    if (err || !info) return;
    global.GoatBot.onReply.set(info.messageID, { commandName: CMD, messageID: info.messageID, author: S.uid, type: "fight", S, expires: Date.now() + TURN_TTL });
  });
}

// Un tour : action du joueur, puis riposte du monstre
async function fightTurn(c, Reply) {
  const S = Reply.S, m = S.m, me = c.me, g = me.g;
  const a = strip(c.event.body)[0] || "";
  const flee = a === "f";
  if (!"abxcdpef".includes(a)) return reply(c, `❌ Commande invalide.\n» a attaque • b ${S.k.b} • x ${S.k.x}\n» c recharger • d parer • p potion • e élixir • f fuir`);
  if (a === "c" && S.lastC) return reply(c, "❌ Tu ne peux pas te recharger deux fois de suite !");
  if (a === "p" && !(g.inv.potion > 0)) return reply(c, "🧪 Tu n'as plus de potion de soin. (sao boutique)");
  if (a === "e" && !(g.inv.elixir > 0)) return reply(c, "💙 Tu n'as plus d'élixir de SP. (sao boutique)");
  if (flee && m.boss) return reply(c, "🚫 On ne fuit pas un combat de boss !");
  global.GoatBot.onReply.delete(Reply.messageID);

  S.turn++;
  let log = "", dmg = 0, tookTurn = true;
  const mult = (S.buff ? 1.2 : 1) * (S.argo ? 1.25 : 1);
  const crit = Math.random() < DMG.crit;
  const hit = (lo, hi) => Math.floor(S.atk * rf(lo, hi) * mult * (crit ? 1.5 : 1));

  if (a === "a") { dmg = hit(...DMG.basic); log = `🗡️ ${S.name} attaque ${crit ? "💥 (CRITIQUE) " : ""}: -${dmg} PV pour ${m.nom}`; S.lastC = false; }
  else if (a === "b") {
    if (S.sp < DMG.skillSp) { log = `❌ SP insuffisants pour « ${S.k.b} » (il faut ${DMG.skillSp}).`; tookTurn = false; }
    else { S.sp -= DMG.skillSp; dmg = hit(...DMG.skill); log = `✨ ${S.name} enchaîne « ${S.k.b} » ${crit ? "💥 " : ""}: -${dmg} PV !`; S.lastC = false; }
  } else if (a === "x") {
    if (S.sp < DMG.ultSp) { log = `❌ SP insuffisants pour « ${S.k.x} » (il faut ${DMG.ultSp}).`; tookTurn = false; }
    else {
      S.sp -= DMG.ultSp; S.lastC = false;
      if (Math.random() < S.mult.fail) { log = `⚡ « ${S.k.x} » est interrompu ! Délai de recharge…`; }
      else { dmg = Math.floor(S.atk * rf(DMG.ult[0], S.mult.ult) * mult * (crit ? 1.5 : 1)); log = `🌟 ${S.name} déchaîne « ${S.k.x} » ${crit ? "💥 " : ""}: -${dmg} PV !!`; }
    }
  } else if (a === "c") { S.sp = Math.min(100, S.sp + DMG.chargeSp); S.lastC = true; log = `🔋 ${S.name} reprend son souffle (+${DMG.chargeSp} SP).`; }
  else if (a === "d") { S.defending = true; S.lastC = false; log = `🛡️ ${S.name} se met en garde (parade) !`; }
  else if (a === "p") { g.inv.potion--; const h = Math.floor(S.maxHp * 0.4); S.hp = Math.min(S.maxHp, S.hp + h); S.lastC = false; log = `🧪 Potion : +${h} PV.`; }
  else if (a === "e") { g.inv.elixir--; S.sp = Math.min(100, S.sp + 50); S.lastC = false; log = `💙 Élixir : +50 SP.`; }
  else if (flee) {
    const crystal = g.inv.cristal > 0;
    if (crystal || Math.random() < 0.6) {
      if (crystal) g.inv.cristal--;
      g.hp = Math.max(1, Math.ceil(S.hp)); g.sp = S.sp; g.fled++;
      await save(c.usersData, me);
      return reply(c, `💨 ${crystal ? "🔷 Cristal de téléportation activé : " : ""}tu t'enfuis du combat !\n❤️ PV : ${Math.ceil(S.hp)}/${S.maxHp}`);
    }
    log = "💨 Fuite ratée ! Le monstre te bloque la route.";
  }
  if (!tookTurn) { return sendFight(c, S, log); }

  m.hp -= dmg;
  // Le boss s'énerve
  if (m.boss) {
    const r = m.hp / m.max;
    const ph = r < 0.25 ? 2 : r < 0.5 ? 1 : 0;
    if (ph > S.phase) { S.phase = ph; log += `\n🔥 ${m.nom} entre dans une PHASE ${ph + 1} : il devient plus dangereux !`; }
  }

  // Victoire ?
  if (m.hp <= 0) return endFight(c, S, true, log);

  // Riposte
  S.sp = Math.min(100, S.sp + DMG.regenSp);
  let enemy = m.atk * rf(0.85, 1.15) * (1 + 0.3 * S.phase);
  let special = false;
  if (m.boss && S.turn % 4 === 0) { enemy *= 2; special = true; }
  else if (!m.boss && Math.random() < 0.15) { enemy *= 1.6; special = true; }
  let taken = Math.max(1, Math.floor(enemy - S.def * 0.5));
  if (S.defending) {
    taken = Math.floor(taken * 0.35);
    if (Math.random() < 0.3) { const ctr = Math.floor(S.atk * 0.5); m.hp -= ctr; log += `\n⚔️ Parade parfaite ! Contre-attaque : -${ctr} PV.`; }
    S.defending = false;
  }
  if (m.hp <= 0) return endFight(c, S, true, log);
  S.hp -= taken;
  log += `\n${special ? "💢 " : "👹 "}${m.nom} ${special ? (m.boss ? "lance son ATTAQUE SPÉCIALE" : "frappe violemment") : "attaque"} : -${taken} PV pour toi`;
  if (S.hp <= 0) return endFight(c, S, false, log);
  return sendFight(c, S, log);
}

async function endFight(c, S, won, log) {
  const me = c.me, g = me.g, m = S.m;
  g.sp = S.sp;
  if (!won) {
    g.deaths++;
    const loss = Math.floor(wallet(me) * DEATH.colLoss), xpLoss = Math.floor(g.xp * DEATH.xpLoss);
    addMoney(me, -loss); g.xp -= xpLoss;
    g.hp = Math.floor(stats(g).maxHp * 0.3); g.hpAt = Date.now();
    g.dead = Date.now() + DEATH.rest; g.map = Math.max(0, g.map - 20);
    return finish(c, `${log}\n\n☠️ GAME OVER… ${S.name} s'effondre. (Dans Aincrad, la mort est une vraie mort… mais ici tu te réveilles à ${townOf(g.floor)}.)\n💸 -${FM(loss)}  •  ⭐ -${xpLoss} XP  •  🗺️ Carte -20 %\n😵 Inconscient pendant ${dur(DEATH.rest)}.`);
  }
  g.hp = Math.max(1, Math.ceil(S.hp)); g.hpAt = Date.now();
  const w = worldOn();
  let txt = `${log}\n\n🏆 VICTOIRE contre ${m.emoji} ${m.nom} !\n`;
  g.kills++;
  if (!m.boss) {
    const r = mobReward(m), col = Math.floor(r.col * (w && w.col > 1 ? w.col : 1));
    addMoney(me, col); gainXp(me, r.xp);
    g.map = Math.min(100, g.map + MAP_PER_WIN);
    txt += `💰 +${FM(col)}  •  ⭐ +${Math.floor(r.xp * (w && w.xp > 1 ? w.xp : 1))} XP  •  🗺️ Carte ${g.map} %`;
    if (Math.random() < 0.10) { g.inv.lingot = (g.inv.lingot || 0) + 1; txt += `\n⛏️ Drop : un Lingot !`; }
    if (Math.random() < 0.12) { g.inv.potion = (g.inv.potion || 0) + 1; txt += `\n🧪 Drop : une Potion de soin !`; }
    if (g.map >= 100) txt += `\n\n🚪 Tu as cartographié tout le labyrinthe : la SALLE DU BOSS est ouverte !\n👉 sao boss`;
  } else {
    const f = m.floor, col = Math.floor($(1500) * (1 + f / 10) * (w && w.col > 1 ? w.col : 1)), xp = 400 + 60 * f;
    addMoney(me, col); gainXp(me, xp);
    g.bosses++; g.laCount++;
    if (f > g.cleared) g.cleared = f;
    g.inv.lingot = (g.inv.lingot || 0) + 2;
    txt += `🎯 LAST ATTACK BONUS ! C'est toi qui as porté le coup final !\n💰 +${FM(col)}  •  ⭐ +${xp} XP  •  ⛏️ +2 Lingots`;
    const la = (BOSSES[f] && BOSSES[f].la) || null;
    if (la) {
      if (la.armor && g.armor < la.armor) { g.armor = la.armor; txt += `\n🎁 BONUS LA : ${la.text} !`; }
      else if (la.weapon && g.weapon.tier < la.weapon) { g.weapon.tier = la.weapon; g.weapon.up = 0; txt += `\n🎁 BONUS LA : ${la.text} !`; }
      else txt += `\n🎁 Bonus LA : tu avais déjà mieux, +3 Lingots`, g.inv.lingot += 3;
    } else if (Math.random() < 0.5) { g.inv.cristal = (g.inv.cristal || 0) + 1; txt += `\n🎁 Bonus LA : 🔷 Cristal de téléportation`; }
    if (f < 100) {
      g.floor = f + 1; g.map = 0; g.mobs = [];
      txt += `\n\n🌟 ÉTAGE ${f} TERMINÉ ! L'escalier vers l'étage ${f + 1} (${townOf(f + 1)}) s'ouvre devant toi.`;
    }
  }
  return finish(c, txt);
}

// ============================================================
//  👤 PROFIL
// ============================================================

function renderHelp(god) {
  return `
⚔️  S W O R D   A R T   O N L I N E
${L("═", 42)}
Link Start ! 100 étages à conquérir.
Le BOT génère les monstres et les boss.

🎮  DÉBUTER
  sao creer <arme>       - Te connecter à Aincrad
  sao stat [@user]       - Ta fiche de joueur
  sao competences        - Tes compétences d'épée
  sao top [niveau|etage|boss|kills]

🏰  AVENTURE
  sao chasse [n°]        - Monstres du labyrinthe (combat)
  sao carte              - Progression de l'étage
  sao boss               - Boss de l'étage (carte à 100 %)
  sao etage [n]          - Voir / rejoindre un étage débloqué
  sao argo               - L'informatrice : +25 % de dégâts (3 combats)

🤺  JOUEUR CONTRE JOUEUR (comme naruto-storm)
  sao duel @user [mise]  - Duel au tour par tour (a/b/x/c/d/f)
  sao clan ...           - Guilde : creer, inviter, accepter, depot, info
  sao epouser @user      - Mariage (+10 % d'XP)  •  sao divorce

🛒  VILLE
  sao boutique           - Potions, cristaux, sandwich…
  sao acheter <objet> [qté]
  sao armurerie          - Acheter une armure
  sao forge              - Lisbeth : améliorer / faire évoluer ton arme
  sao auberge            - Soins complets
  sao utiliser <objet>   - Sandwich, potion, élixir
  sao sac                - Ton inventaire
  sao solde              - Solde quotidienne de la guilde

⚔️  COMBAT (réponds au message du bot)
  a attaque • b compétence • x ultime • c recharger
  d parer • p potion • e élixir • f fuir

${L("═", 42)}
💡 Les Cols = ton argent (même portefeuille que royaume, police et école).
${god ? `\n👑 DIEU : « sao gm » pour le menu système.` : ""}`.trim();
}

async function cmdStat(c) {
  const tid = targetOf(c.event, c.args.slice(1)) || c.uid, isSelf = tid === c.uid;
  const p = isSelf ? c.me : await getP(c, tid), g = p.g, name = await nm(c, tid);
  const godT = isSelf ? c.god : false;
  if (godT) {
    return reply(c, `👑  ${GOD.titre}\n${L("═", 42)}\n👤 ${name} — « ${GOD.nom} »\n${GOD.obj}\n\n❤️ PV : ♾️ ∞   💙 SP : ♾️ ∞\n⚔️ Arme : ✝️ Lame Divine (Holy Sword)\n🏰 Étage : 100 — Palais de Rubis (tu en es le maître)\n🛡️ Statut : Objet Immortel — aucun monstre ne peut te blesser\n\n« Ce monde est ma création. » — Utilise « sao gm » pour contrôler le système.`);
  }
  if (!g.created) return reply(c, `${isSelf ? "Tu n'es" : name + " n'est"} pas connecté(e) à Aincrad.\n👉 sao creer <arme>`);
  const st = stats(g), k = klass(g), c0 = CLASSES[g.cls];
  let txt = `⚔️  F I C H E   D E   J O U E U R\n${L("═", 42)}\n👤 ${name} — ${titleOf(g)}\n`;
  txt += `${k.emoji} ${g.unique ? UNIQUE[g.unique].nom : c0.nom} • 🗡️ ${weaponName(g)}\n🛡️ ${ARMORS[g.armor].nom}\n${L("─", 42)}\n`;
  txt += `⭐ Niveau ${g.lv}  ${bar(g.xp, xpNeed(g.lv), 12)} ${fmt(g.xp)}/${fmt(xpNeed(g.lv))}\n`;
  txt += `${hpColor(g.hp / st.maxHp)} PV ${Math.ceil(g.hp)}/${st.maxHp}  ${bar(g.hp, st.maxHp, 10)}   💙 SP ${Math.floor(g.sp)}/100\n`;
  txt += `⚔️ Attaque ${st.atk}  •  🛡️ Défense ${st.def}\n${L("─", 42)}\n`;
  txt += `🏰 Étage ${g.floor} (${townOf(g.floor)})  •  🗺️ Carte ${g.map} %  •  ✅ Étages finis : ${g.cleared}\n`;
  txt += `👹 Monstres : ${g.kills}  •  💀 Boss : ${g.bosses}  •  ☠️ Défaites : ${g.deaths}\n💰 ${FM(wallet(p))}\n`;
  if ((g.dead || 0) > Date.now()) txt += `😵 Inconscient encore ${dur(g.dead - Date.now())}\n`;
  if (g.buff > 0) txt += `🥪 Sandwich actif : ${g.buff} combat(s)\n`;
  if (g.argo > 0) txt += `📜 Info d'Argo : ${g.argo} combat(s)\n`;
  const w = worldOn(); if (w) txt += `🌍 ÉVÉNEMENT : ${w.text} (${dur(w.until - Date.now())})\n`;
  if (isSelf) await save(c.usersData, c.me);
  return reply(c, txt);
}

async function cmdSkills(c) {
  if (needChar(c)) return;
  const g = c.me.g;
  if (c.god) return reply(c, `✝️ COMPÉTENCES DU DIEU\n${L("═", 40)}\n• ${UNIQUE.divine.b}\n• ${UNIQUE.divine.x} — personne ne peut te vaincre\n• Autorité du système : « sao gm »`);
  const k = klass(g), c0 = CLASSES[g.cls];
  let txt = `✨ COMPÉTENCES D'ÉPÉE\n${L("═", 40)}\n${k.emoji} ${g.unique ? UNIQUE[g.unique].nom : c0.nom}\n`;
  txt += `• b — ${k.b}  (−${DMG.skillSp} SP, ×1,5 à ×1,9)\n• x — ${k.x}  (−${DMG.ultSp} SP, ×2,8 à ×${(k.ultMult || DMG.ult[1]).toFixed(1)}, ${Math.round((k.ultFail !== undefined ? k.ultFail : DMG.ultFail) * 100)} % d'échec)\n`;
  txt += `• c — Recharger (+${DMG.chargeSp} SP)  • d — Parade (−65 % dégâts, parfois contre-attaque)\n`;
  if (!g.unique) txt += `\n🌟 COMPÉTENCE UNIQUE : seul le Dieu du système peut t'accorder les « Deux Lames » (Dual Blades).`;
  return reply(c, txt);
}

async function cmdCreate(c) {
  const g = c.me.g;
  if (c.god) return reply(c, "✝️ Tu es le Dieu : tu n'as pas besoin de personnage. Utilise « sao gm ».");
  if (g.banned) return needChar(c);
  if (g.created) return reply(c, `🎮 Tu es déjà connecté(e) : ${klass(g).emoji} ${CLASSES[g.cls].nom}. (sao stat)`);
  const id = Object.keys(CLASSES).find((k) => k === strip(c.args[1]) || CLASSES[k].alias.includes(strip(c.args[1])));
  if (!id) {
    let txt = `🎮 LINK START !\n${L("═", 40)}\nChoisis ton arme (définitive) :\n`;
    for (const k of Object.keys(CLASSES)) txt += `${CLASSES[k].emoji} ${CLASSES[k].nom} (${k})\n   ↳ ${CLASSES[k].b} / ${CLASSES[k].x}\n`;
    return reply(c, txt + `\n👉 sao creer <arme>\nExemple : sao creer epee`);
  }
  g.created = true; g.cls = id; g.hp = null; g.sp = 100;
  addMoney(c.me, START_COL);
  tick(c.me);
  return finish(c, `🌐 LINK START !\n${L("═", 40)}\nBienvenue à ${townOf(1)}, étage 1 d'Aincrad.\n${CLASSES[id].emoji} Arme : ${CLASSES[id].nom} (${CLASSES[id].b} / ${CLASSES[id].x})\n💰 Tu reçois ${FM(START_COL)} pour bien démarrer.\n\n⚠️ Les 10 000 joueurs sont piégés : si tes PV tombent à 0, c'est le Game Over…\n👉 sao chasse (combats)  •  sao boutique  •  sao help`);
}

// ============================================================
//  🏰 AVENTURE
// ============================================================

async function cmdHunt(c) {
  const me = c.me, g = me.g;
  if (needChar(c)) return;
  if (c.god) {
    // Le Dieu efface les monstres d'un geste
    return reply(c, `✝️ AUTORITÉ DU SYSTÈME\n${L("─", 40)}\nD'un geste, tu supprimes ${pick(["une meute de Frenzy Boars", "un Ruin Kobold Trooper", "une horde de Lizardmen", "un Wraith"])} du labyrinthe.\n« Tu es immortel : aucun monstre ne peut te toucher. »`);
  }
  if (notDead(c)) return;
  const list = ensureMobs(g), n = num(c.args[1]);
  if (isNaN(n) || n < 1 || n > list.length) {
    let txt = `🏰 LABYRINTHE — Étage ${g.floor} (${townOf(g.floor)})\n${L("═", 40)}\n❤️ ${Math.ceil(g.hp)}/${stats(g).maxHp}  •  🗺️ Carte ${g.map} %\n\n`;
    list.forEach((m, i) => { const r = mobReward(m); txt += `${i + 1}. ${m.emoji} ${m.nom} (Niv.${m.lvl})  ${m.lvl > g.lv + 3 ? "☠️ dangereux" : m.lvl > g.lv ? "⚠️" : "✅"}\n   ❤️ ${m.max} • ⚔️ ${m.atk} • 💰 ~${FM(r.col)} • ⭐ ~${r.xp} XP • ⏳ ${dur(m.exp - Date.now())}\n`; });
    const left = cdLeft(g, "hunt", HUNT_CD);
    txt += `\n${left ? `⏳ Tu reprends ton souffle : ${left}\n` : ""}👉 Combattre : sao chasse <n°>\n${g.map >= 100 ? "🚪 La salle du boss est ouverte : sao boss" : ""}`;
    await save(c.usersData, me);
    return reply(c, txt.trim());
  }
  const left = cdLeft(g, "hunt", HUNT_CD);
  if (left) return reply(c, `⏳ Reprends ton souffle. Prochain combat dans ${left}.`);
  if (g.hp < stats(g).maxHp * 0.15) return reply(c, `🩸 Tu es trop faible pour combattre (${Math.ceil(g.hp)} PV).\n👉 sao auberge ou sao utiliser potion`);
  const m = list[n - 1];
  g.mobs.splice(g.mobs.indexOf(m), 1);
  g.cd.hunt = Date.now();
  return startFight(c, m, "mob");
}

async function cmdMap(c) {
  if (needChar(c)) return;
  const g = c.me.g;
  if (c.god) return reply(c, "✝️ Tu connais déjà chaque recoin d'Aincrad : tu l'as créé.");
  const b = bossOf(g.floor);
  return reply(c, `🗺️ CARTE — Étage ${g.floor} (${townOf(g.floor)})\n${L("═", 40)}\n${bar(g.map, 100, 20)} ${g.map} %\n${g.map >= 100 ? `🚪 Salle du boss ouverte : ${b.emoji} ${b.nom}\n👉 sao boss` : `Bats des monstres : +${MAP_PER_WIN} % par victoire.\n👹 Boss de l'étage : ${b.emoji} ${b.nom}`}\n✅ Étages terminés : ${g.cleared}/100`);
}

async function cmdBoss(c) {
  const me = c.me, g = me.g;
  if (needChar(c)) return;
  if (c.god) return reply(c, `✝️ Tu es le boss final. Les joueurs qui atteignent l'étage 100 t'affrontent… sans aucune chance : « sao gm clear @joueur » pour leur accorder la victoire.`);
  if (notDead(c)) return;
  const f = g.floor, b = bossOf(f);
  if (g.map < 100) return reply(c, `🚪 La salle du boss est fermée : carte à ${g.map} %. Chasse des monstres (sao chasse).`);
  if (f === 100) {
    return reply(c, `✝️ PALAIS DE RUBIS\n${L("═", 40)}\nHeathcliff — Kayaba Akihiko — se tient devant toi, bouclier levé.\n\n« Félicitations d'avoir atteint ce palais. Mais ce monde est le mien. »\n♾️ OBJET IMMORTEL : ses PV ne descendent jamais.\n\n💡 Il ne peut être vaincu que si le DIEU du système lève l'immunité (« sao gm clear @toi »).`);
  }
  const recommended = f;
  if (g.lv < Math.max(1, recommended - 3)) return reply(c, `⚠️ Niveau trop bas : il faut au moins le niveau ${Math.max(1, recommended - 3)} pour affronter ${b.emoji} ${b.nom} (toi : ${g.lv}).`);
  if (g.hp < stats(g).maxHp * 0.6) return reply(c, `🩸 Soigne-toi d'abord : il faut au moins 60 % de PV pour entrer dans la salle du boss (toi : ${Math.floor((g.hp / stats(g).maxHp) * 100)} %).\n👉 sao auberge`);
  const left = cdLeft(g, "boss", 5 * MIN);
  if (left) return reply(c, `⏳ La porte du boss se rouvre dans ${left}.`);
  g.cd.boss = Date.now();
  const m = makeMob(g, "boss", f);
  return startFight(c, m, "boss");
}

async function cmdFloor(c) {
  if (needChar(c)) return;
  const g = c.me.g;
  if (c.god) return reply(c, "✝️ Tu peux être n'importe où : tu es partout.");
  const n = num(c.args[1]);
  if (isNaN(n)) return reply(c, `🏰 ÉTAGES\n${L("═", 40)}\n📍 Étage actuel : ${g.floor} — ${townOf(g.floor)}\n✅ Terminés : ${g.cleared}\n🔓 Accessibles : 1 à ${Math.min(100, g.cleared + 1)}\n\n👉 sao etage <n> pour rejoindre un étage (cristal de téléportation 🔷 requis pour redescendre)`);
  if (n < 1 || n > Math.min(100, g.cleared + 1)) return reply(c, `🔒 Tu ne peux accéder qu'aux étages 1 à ${Math.min(100, g.cleared + 1)}.`);
  if (n === g.floor) return reply(c, "📍 Tu es déjà sur cet étage.");
  if (n < g.floor) {
    if (!(g.inv.cristal > 0)) return reply(c, "🔷 Il faut un Cristal de téléportation pour redescendre (sao acheter cristal).");
    g.inv.cristal--;
  }
  g.floor = n; g.map = n <= g.cleared ? 100 : 0; g.mobs = [];
  return finish(c, `🌀 Téléportation vers l'étage ${n} — ${townOf(n)} !${n <= g.cleared ? "\n(Labyrinthe déjà exploré : tu peux farmer des monstres.)" : ""}`);
}

async function cmdArgo(c) {
  const me = c.me, g = me.g;
  if (needChar(c)) return;
  if (c.god) return reply(c, "✝️ Argo n'a rien à t'apprendre : tu connais tout… Elle vend tes secrets à d'autres.");
  const left = cdLeft(g, "argo", ARGO.cd);
  if (left) return reply(c, `🐭 Argo n'a pas de nouvelle info. Reviens dans ${left}.`);
  if (wallet(me) < ARGO.cost) return reply(c, `💸 Les infos d'Argo coûtent ${FM(ARGO.cost)} (tu as ${FM(wallet(me))}).`);
  addMoney(me, -ARGO.cost);
  g.cd.argo = Date.now(); g.argo = ARGO.fights;
  return finish(c, `🐭 ARGO LE RAT\n${L("─", 40)}\n« Les infos, ça se paie, mon grand… » 😼\nElle te vend les points faibles des monstres de l'étage ${g.floor} (-${FM(ARGO.cost)}).\n📜 +${Math.round(ARGO.bonus * 100)} % de dégâts pendant ${ARGO.fights} combats.`);
}

// ============================================================
//  🛒 VILLE
// ============================================================

async function cmdShop(c, forced) {
  if (needChar(c)) return;
  const me = c.me, g = me.g;
  const sub = forced || strip(c.args[1]), off = forced ? 1 : 2;
  if (["acheter", "buy"].includes(sub)) {
    const id = findItem(c.args[off]);
    if (!id) return reply(c, "❓ Objet inconnu. Tape « sao boutique ».");
    const qty = c.args[off + 1] ? parseInt(c.args[off + 1]) : 1;
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) return reply(c, "⚠️ Quantité invalide (1 à 50).");
    const total = ITEMS[id].prix * qty;
    if (wallet(me) < total) return reply(c, `💸 Il te faut ${FM(total)} (tu as ${FM(wallet(me))}).`);
    addMoney(me, -total); g.inv[id] = (g.inv[id] || 0) + qty;
    return finish(c, `✅ Achat : ${ITEMS[id].emoji} ${ITEMS[id].nom} x${qty} (-${FM(total)})`);
  }
  let txt = `🛒 BOUTIQUE DE ${townOf(g.floor).toUpperCase()}\n${L("═", 40)}\n💰 ${FM(wallet(me))}\n\n`;
  for (const id of Object.keys(ITEMS)) txt += `${ITEMS[id].emoji} ${ITEMS[id].nom} — ${FM(ITEMS[id].prix)}\n   ↳ ${ITEMS[id].desc}\n`;
  return reply(c, txt + `\n👉 sao acheter <objet> [quantité]\n🎒 sao sac`);
}
async function cmdBag(c) {
  if (needChar(c)) return;
  const g = c.me.g, own = Object.keys(g.inv).filter((k) => ITEMS[k] && g.inv[k] > 0);
  return reply(c, `🎒 INVENTAIRE\n${L("═", 40)}\n${own.length ? own.map((k) => `${ITEMS[k].emoji} ${ITEMS[k].nom} x${g.inv[k]}`).join("\n") : "Vide. (sao boutique)"}\n\n💰 ${FM(wallet(c.me))}`);
}
async function cmdUse(c) {
  if (needChar(c)) return;
  const me = c.me, g = me.g, id = findItem(c.args[1]);
  if (!id || !["potion", "elixir", "sandwich"].includes(id)) return reply(c, "⚠️ sao utiliser <potion|elixir|sandwich>");
  if (!(g.inv[id] > 0)) return reply(c, `🎒 Tu n'as pas de ${ITEMS[id].nom}.`);
  const st = stats(g);
  if (id === "potion") { if (g.hp >= st.maxHp) return reply(c, "💚 Tes PV sont déjà au maximum."); g.inv.potion--; const h = Math.floor(st.maxHp * 0.4); g.hp = Math.min(st.maxHp, g.hp + h); return finish(c, `🧪 +${h} PV  (${Math.ceil(g.hp)}/${st.maxHp})`); }
  if (id === "elixir") { g.inv.elixir--; g.sp = Math.min(100, g.sp + 50); return finish(c, `💙 +50 SP  (${g.sp}/100)`); }
  g.inv.sandwich--; g.buff = 3;
  return finish(c, `🥪 Sandwich d'Asuna : délicieux ! +20 % de dégâts pendant 3 combats.`);
}
async function cmdInn(c) {
  if (needChar(c)) return;
  const me = c.me, g = me.g, st = stats(g);
  if (g.hp >= st.maxHp && !(g.dead > Date.now())) return reply(c, "💚 Tu es en pleine forme !");
  if (wallet(me) < INN.cost) return reply(c, `💸 La chambre coûte ${FM(INN.cost)}.`);
  addMoney(me, -INN.cost); g.hp = st.maxHp; g.sp = 100; g.dead = 0; g.hpAt = Date.now();
  return finish(c, `🛏️ AUBERGE\n${L("─", 40)}\nUne bonne nuit à ${townOf(g.floor)} : PV et SP au maximum !\n💸 -${FM(INN.cost)}`);
}
async function cmdArmorShop(c) {
  if (needChar(c)) return;
  const me = c.me, g = me.g, sub = strip(c.args[1]);
  if (["acheter", "buy"].includes(sub)) {
    const next = g.armor + 1;
    if (next > 3) return reply(c, "🛡️ Les armures supérieures ne se trouvent que sur les boss (Last Attack Bonus) !");
    if (wallet(me) < ARMOR_COST[next]) return reply(c, `💸 ${ARMORS[next].nom} coûte ${FM(ARMOR_COST[next])}.`);
    addMoney(me, -ARMOR_COST[next]); g.armor = next; g.hp = null; tick(me);
    return finish(c, `🛡️ Tu portes maintenant : ${ARMORS[next].nom} (+${ARMORS[next].hp} PV, +${ARMORS[next].def} DEF)  (-${FM(ARMOR_COST[next])})`);
  }
  const nx = g.armor + 1;
  return reply(c, `🛡️ ARMURERIE\n${L("═", 40)}\nTa tenue : ${ARMORS[g.armor].nom} (+${ARMORS[g.armor].hp} PV, +${ARMORS[g.armor].def} DEF)\n${nx <= 3 ? `\nProchaine : ${ARMORS[nx].nom} — ${FM(ARMOR_COST[nx])}\n   +${ARMORS[nx].hp} PV • +${ARMORS[nx].def} DEF\n👉 sao armurerie acheter` : "\n🏅 Les armures suivantes sont des trophées de boss :\n   🧥 Manteau de Minuit (étage 1)  •  🩸 Uniforme des Chevaliers du Sang (étage 75)"}`);
}
// Lisbeth : améliorer (+1) ou faire évoluer l'arme avec des lingots
async function cmdForge(c) {
  if (needChar(c)) return;
  const me = c.me, g = me.g, sub = strip(c.args[1]), w = g.weapon;
  if (["ameliorer", "upgrade", "up"].includes(sub)) {
    if (w.up >= FORGE.maxUp) return reply(c, `⭐ Ton arme est déjà au maximum (+${FORGE.maxUp}). Fais-la évoluer : sao forge evoluer`);
    const cost = FORGE.base * (w.up + 1) * (w.tier + 1), chance = clamp(0.95 - 0.07 * w.up, 0.35, 0.95);
    if (wallet(me) < cost) return reply(c, `💸 Lisbeth demande ${FM(cost)} (tu as ${FM(wallet(me))}).`);
    addMoney(me, -cost);
    if (Math.random() < chance) { w.up++; return finish(c, `🔨 FORGE DE LISBETH\n${L("─", 40)}\n✅ « Voilà du beau travail ! » Ton arme passe à ${weaponName(g)}.\n💸 -${FM(cost)}  •  🎲 ${Math.round(chance * 100)} %`); }
    return finish(c, `🔨 FORGE DE LISBETH\n${L("─", 40)}\n❌ L'amélioration échoue… « Zut ! Je recommence gratuitement la prochaine fois ! » (l'arme n'est pas perdue)\n💸 -${FM(cost)}  •  🎲 ${Math.round(chance * 100)} %`);
  }
  if (["evoluer", "evolue", "evolve"].includes(sub)) {
    if (w.tier >= 3) return reply(c, w.tier >= 5 ? "✨ Ton arme est déjà légendaire !" : "💎 Les armes supérieures (Cristal, Légendaire) se gagnent sur les boss (Last Attack Bonus).");
    const cost = EVOLVE.base * (w.tier + 1) * (w.tier + 1);
    if ((g.inv.lingot || 0) < EVOLVE.lingots) return reply(c, `⛏️ Il faut ${EVOLVE.lingots} lingots (tu en as ${g.inv.lingot || 0}). Ils tombent des monstres et des boss.`);
    if (wallet(me) < cost) return reply(c, `💸 L'évolution coûte ${FM(cost)}.`);
    addMoney(me, -cost); g.inv.lingot -= EVOLVE.lingots; w.tier++; w.up = 0;
    return finish(c, `🔨 FORGE DE LISBETH\n${L("─", 40)}\n🌟 Ton arme évolue : ${weaponName(g)} !\n💸 -${FM(cost)}  •  ⛏️ -${EVOLVE.lingots} lingots`);
  }
  const cost = FORGE.base * (w.up + 1) * (w.tier + 1);
  return reply(c, `🔨 FORGE DE LISBETH\n${L("═", 40)}\n🗡️ ${weaponName(g)}  (⚔️ ${stats(g).atk} ATK)\n⛏️ Lingots : ${g.inv.lingot || 0}\n\n• sao forge ameliorer — +1 (${w.up < FORGE.maxUp ? `${FM(cost)}, ${Math.round(clamp(0.95 - 0.07 * w.up, 0.35, 0.95) * 100)} % de réussite` : "max"})\n• sao forge evoluer — palier suivant (${EVOLVE.lingots} lingots + ${FM(EVOLVE.base * (w.tier + 1) * (w.tier + 1))})\n💡 Armes en Cristal et Légendaires : trophées de boss !`);
}
async function cmdDaily(c) {
  if (needChar(c)) return;
  const me = c.me, g = me.g;
  const left = cdLeft(g, "daily", DAILY.cd);
  if (left) return reply(c, `⏳ La solde de la guilde arrive dans ${left}.`);
  g.cd.daily = Date.now();
  const gain = Math.floor(DAILY.base * (1 + 0.1 * g.lv) * (1 + g.cleared / 20));
  addMoney(me, gain);
  return finish(c, `🏛️ SOLDE DE LA GUILDE\n${L("─", 40)}\nLes Chevaliers du Sang te versent ta solde de joueur de première ligne.\n💰 +${FM(gain)}`);
}

async function cmdTop(c) {
  const keys = { niveau: "lv", level: "lv", xp: "lv", etage: "cleared", etages: "cleared", boss: "bosses", kills: "kills", monstres: "kills" };
  const key = keys[strip(c.args[1] || "niveau")] || "lv";
  const all = await c.usersData.getAll();
  const rows = all.map((u) => { const g = normalize(u.data && u.data.sao); return { id: String(u.userID), name: u.name || `Joueur ${String(u.userID).slice(-4)}`, g }; })
    .filter((r) => r.g.created && !r.g.banned)
    .map((r) => ({ ...r, val: key === "lv" ? r.g.lv * 1e6 + r.g.xp : r.g[key] })).filter((r) => r.val > 0).sort((a, b) => b.val - a.val);
  const titles = { lv: "⭐ LES PLUS FORTS", cleared: "🏰 LES PLUS HAUTS ÉTAGES", bosses: "💀 LES TUEURS DE BOSS", kills: "👹 LES CHASSEURS" };
  let txt = `${titles[key]}\n${L("═", 42)}\n👑 Au sommet : le Dieu Kayaba Akihiko\n\n`;
  if (!rows.length) return reply(c, txt + "📊 Personne n'est encore connecté à Aincrad.");
  rows.slice(0, 10).forEach((r, i) => { txt += `${["🥇", "🥈", "🥉"][i] || `#${i + 1}`} ${r.name} — ${key === "lv" ? `Niv.${r.g.lv}` : key === "cleared" ? `étage ${r.g.cleared}` : r.val}  (${CLASSES[r.g.cls] ? CLASSES[r.g.cls].emoji : ""} étage ${r.g.floor})\n`; });
  return reply(c, txt);
}

// ============================================================
//  👑 MENU DU DIEU SUPRÊME  (« sao gm … » : réservé à l'admin du bot)
// ============================================================

async function cmdGM(c) {
  if (!c.god) return reply(c, "🚫 Seul le DIEU du système (l'admin du bot) peut utiliser ce menu.\n« Qui oses-tu défier, simple joueur ? » — Kayaba Akihiko");
  const sub = strip(c.args[1]), tid = targetOf(c.event, c.args.slice(2));
  const target = tid && tid !== c.uid ? await getP(c, tid) : null;
  const needT = () => { reply(c, "⚠️ Mentionne un joueur (ou réponds à son message)."); return true; };
  const tn = target ? await nm(c, tid) : "";
  const last = c.args[c.args.length - 1], amount = num(last);

  if (!sub || sub === "menu" || sub === "help") {
    return reply(c, `👑 MENU DU DIEU SUPRÊME\n${L("═", 42)}\n${GOD.obj}\n\n💰 sao gm col @user <montant>      — donner des Cols\n💸 sao gm retirer @user <montant>  — retirer des Cols\n⭐ sao gm niveau @user <1-100>     — fixer le niveau\n🏰 sao gm etage @user <0-100>      — débloquer jusqu'à l'étage\n💊 sao gm soigner @user            — PV et SP au max\n⚔️ sao gm unique @user dual        — accorder les Deux Lames\n🎁 sao gm item @user <objet> [n]    — donner un objet\n✝️ sao gm clear @user              — GAME CLEAR (victoire finale)\n☠️ sao gm bannir @user             — supprimer du jeu (Game Over définitif)\n🔄 sao gm revive @user             — ressusciter un joueur banni\n♻️ sao gm reset @user              — effacer sa progression\n📢 sao gm annonce <texte>          — annonce système\n🌍 sao gm evenement <xp|col> <×2|×3> <minutes> <texte>\n🔎 sao gm info @user               — voir sa fiche complète`);
  }
  if (sub === "annonce") {
    const text = c.args.slice(2).join(" ");
    if (!text) return reply(c, "⚠️ sao gm annonce <texte>");
    return c.message.reply(B(`📢 [SYSTÈME CARDINAL] Annonce officielle\n${L("═", 40)}\n${text}\n\n— ${GOD.nom}, Dieu d'Aincrad`));
  }
  if (sub === "evenement") {
    const kind = strip(c.args[2]), mult = parseFloat(String(c.args[3] || "").replace(/^x|^×/i, "")), mins = num(c.args[4]);
    const text = c.args.slice(5).join(" ") || "Faveur du Dieu";
    if (!["xp", "col"].includes(kind) || !(mult > 1 && mult <= 10) || isNaN(mins) || mins < 1 || mins > 24 * 60) return reply(c, "⚠️ sao gm evenement <xp|col> <2-10> <minutes> <texte>\nExemple : sao gm evenement xp 2 60 Nuit des étoiles filantes !");
    WORLD = { text, until: Date.now() + mins * MIN, xp: kind === "xp" ? mult : 1, col: kind === "col" ? mult : 1 };
    c.me.g.world = WORLD;
    await save(c.usersData, c.me);
    return c.message.reply(B(`🌍 ÉVÉNEMENT MONDIAL !\n${L("═", 40)}\n${text}\n✨ ${kind === "xp" ? "XP" : "Cols"} ×${mult} pendant ${mins} minute(s) pour TOUS les joueurs d'Aincrad !\n\n— ${GOD.nom}`));
  }
  if (!["col", "retirer", "niveau", "etage", "soigner", "unique", "item", "clear", "bannir", "revive", "reset", "info"].includes(sub)) return reply(c, "❓ Commande inconnue. « sao gm menu »");
  if (!target) return needT();
  const g = target.g;
  if (sub === "info") { return reply(c, `🔎 ${tn}\n${L("─", 40)}\nCréé : ${g.created ? "oui" : "non"} • Banni : ${g.banned ? "OUI" : "non"}\nNiv.${g.lv} (${g.xp} XP) • Étage ${g.floor} • Terminés ${g.cleared} • Carte ${g.map} %\nArme : ${g.cls ? weaponName(g) : "—"} • Unique : ${g.unique || "—"}\nArmure : ${ARMORS[g.armor].nom}\nMonstres ${g.kills} • Boss ${g.bosses} • Défaites ${g.deaths}\n💰 ${FM(wallet(target))}`); }
  if (sub === "col" || sub === "retirer") {
    if (isNaN(amount) || amount < 1) return reply(c, `⚠️ sao gm ${sub} @user <montant>`);
    addMoney(target, sub === "col" ? amount : -amount); await save(c.usersData, target);
    return reply(c, `${sub === "col" ? "💰" : "💸"} Le Dieu ${sub === "col" ? "offre" : "retire"} ${FM(amount)} ${sub === "col" ? "à" : "à"} ${tn}.\n💵 Nouveau solde : ${FM(wallet(target))}`);
  }
  if (sub === "niveau") {
    if (isNaN(amount) || amount < 1 || amount > MAX_LEVEL) return reply(c, `⚠️ Niveau entre 1 et ${MAX_LEVEL}.`);
    g.lv = amount; g.xp = 0; g.hp = null; tick(target); await save(c.usersData, target);
    return reply(c, `⭐ ${tn} est maintenant niveau ${amount} (volonté du Dieu).`);
  }
  if (sub === "etage") {
    if (isNaN(amount) || amount > 100) return reply(c, "⚠️ Étage entre 0 et 100.");
    g.cleared = amount; g.floor = Math.min(100, amount + 1); g.map = 0; g.mobs = []; await save(c.usersData, target);
    return reply(c, `🏰 ${tn} a désormais terminé ${amount} étage(s) et se trouve à l'étage ${g.floor}.`);
  }
  if (sub === "soigner") { g.hp = null; g.sp = 100; g.dead = 0; tick(target); await save(c.usersData, target); return reply(c, `💊 ${tn} est entièrement soigné(e) par la main du Dieu.`); }
  if (sub === "unique") {
    const which = strip(c.args.find((a, i) => i >= 2 && ["dual", "dualblades", "deuxlames", "lames"].includes(strip(a))) || "");
    if (!which) return reply(c, "⚠️ sao gm unique @user dual");
    if (!g.created) return reply(c, "⚠️ Ce joueur n'est pas connecté à Aincrad.");
    g.unique = "dual"; g.hp = null; tick(target); await save(c.usersData, target);
    return reply(c, `⚔️⚔️ « Il est le seul à avoir la réaction nécessaire… »\n${tn} reçoit la compétence unique DEUX LAMES (Dual Blades) !\n✨ ${UNIQUE.dual.b} / ${UNIQUE.dual.x}`);
  }
  if (sub === "item") {
    const id = c.args.slice(2).map(findItem).find(Boolean);
    const qty = c.args.slice(2).map(num).find((n) => !isNaN(n) && n < 1000000) || 1;
    if (!id) return reply(c, `⚠️ sao gm item @user <${Object.keys(ITEMS).join("|")}> [n]`);
    g.inv[id] = (g.inv[id] || 0) + qty; await save(c.usersData, target);
    return reply(c, `🎁 ${tn} reçoit ${ITEMS[id].emoji} ${ITEMS[id].nom} x${qty}.`);
  }
  if (sub === "clear") {
    if (!g.created) return reply(c, "⚠️ Ce joueur n'est pas connecté à Aincrad.");
    g.cleared = 100; g.floor = 100; g.bosses = Math.max(g.bosses, 1); g.title = "Vainqueur du Jeu";
    const prize = $(100000); addMoney(target, prize); await save(c.usersData, target);
    return c.message.reply(B(`✝️ GAME CLEAR !\n${L("═", 40)}\n« Félicitations. Tu as vaincu mon avatar, Heathcliff. »\n🏆 ${tn} est le VAINQUEUR D'AINCRAD : Titre « Vainqueur du Jeu »\n💰 Récompense : +${FM(prize)}\n\n— ${GOD.nom}`));
  }
  if (sub === "bannir") {
    g.banned = true; await save(c.usersData, target);
    return reply(c, `☠️ ${tn} est supprimé(e) d'Aincrad par le Dieu : GAME OVER définitif.\n(« sao gm revive » pour le/la ressusciter)`);
  }
  if (sub === "revive") { g.banned = false; g.hp = null; g.dead = 0; tick(target); await save(c.usersData, target); return reply(c, `🔄 ${tn} est ressuscité(e) par le Dieu.`); }
  if (sub === "reset") { target.user.data.sao = initSao(); await save(c.usersData, target); return reply(c, `♻️ La progression de ${tn} a été effacée.`); }
}

// ============================================================
//  🚦 ROUTES
// ============================================================
// ============================================================
//  🤺 DUELS JOUEUR CONTRE JOUEUR (structure naruto-storm : tour par tour, on RÉPOND au message)
//  Aucun PV perdu pour de vrai : le duel est en mode « Total Loss » virtuel (les PV sont rendus).
//  Seule la mise (en Cols) change de main. Le DIEU est immortel : impossible de le battre.
// ============================================================
const DUEL = { askTtl: 5 * MIN, maxBet: 1000000, xp: 40, dmgDef: 0.6 };
const YES = ["oui", "o", "ok", "yes", "y", "accepte", "accepter", "go", "dacc"];
const NO = ["non", "n", "no", "refuse", "refuser", "nope"];

const mentionOf = async (c, id) => ({ tag: `@${await nm(c, id)}`, id: String(id) });

async function cmdDuel(c) {
  if (needChar(c) || notDead(c)) return;
  const tid = targetOf(c.event, c.args.slice(1));
  if (!tid || tid === c.uid) return reply(c, "⚔️ Duel : sao duel @joueur [mise en Cols]\nExemple : sao duel @Kirito 5000");
  const betArg = c.args.slice(1).find((a) => /^\d{1,9}$/.test(a) && a !== tid);
  const bet = betArg ? parseInt(betArg) : 0;
  if (bet > DUEL.maxBet) return reply(c, `⚠️ Mise maximale : ${FM(DUEL.maxBet)}.`);
  const other = await getP(c, tid), tGod = isGod(tid, 0);
  if (!other.g.created && !tGod) return reply(c, "🎮 Ce joueur n'est pas encore connecté à Aincrad.");
  if (other.g.banned) return reply(c, "☠️ Ce joueur a été supprimé du jeu.");
  if (bet > 0 && !c.god && wallet(c.me) < bet) return reply(c, `💸 Tu n'as pas assez de Cols pour miser ${FM(bet)}.`);
  if (bet > 0 && !tGod && wallet(other) < bet) return reply(c, `💸 ${await nm(c, tid)} n'a pas assez de Cols pour cette mise.`);
  const n1 = await nm(c, c.uid), n2 = await nm(c, tid);
  const body = B(`🤺 DEMANDE DE DUEL\n${L("━", 30)}\n${n1} (Niv.${c.me.g.lv}) défie ${n2} (Niv.${other.g.lv}) !\n💰 Mise : ${bet ? FM(bet) : "aucune (pour l'honneur)"}\n\n@${n2}, réponds à CE message :\n» oui = accepter • non = refuser\n(Expire dans ${dur(DUEL.askTtl)})`);
  return c.message.reply({ body, mentions: [{ tag: `@${n2}`, id: tid }] }, (err, info) => {
    if (err || !info) return;
    global.GoatBot.onReply.set(info.messageID, { commandName: CMD, messageID: info.messageID, author: tid, type: "duelAsk", p1: c.uid, p2: tid, bet, god1: !!c.god, expires: Date.now() + DUEL.askTtl });
  });
}

function duelFighter(p, name, god) {
  const st = stats(p.g), k = klass(p.g) || CLASSES.epee;
  return { uid: p.uid, name, k, atk: st.atk, def: st.def, maxHp: st.maxHp, hp: st.maxHp, sp: 100, god, lastC: false, defending: false, lv: p.g.lv };
}
function duelText(D, log) {
  const a = D[D.turn], f = (x) => `${hpColor(x.hp / x.maxHp)} ${x.name}${x.god ? " 👑" : ""} (Niv.${x.lv})  ${x.god ? "♾️" : `${Math.max(0, Math.ceil(x.hp))}/${x.maxHp}`}\n   ${bar(x.god ? x.maxHp : x.hp, x.maxHp, 12)}  💙 SP ${Math.floor(x.sp)}/100`;
  const lines = [`🤺 DUEL — Tour ${D.round}${D.bet ? `  •  💰 ${FM(D.bet)}` : ""}`, L("━", 30)];
  if (log) lines.push(log, L("━", 30));
  lines.push(f(D.p1), f(D.p2), L("━", 30), `🎯 @${a.name}, c'est à toi !\n» a attaque • b ${a.k.b} (−${DMG.skillSp} SP)\n» x ${a.k.x} (−${DMG.ultSp} SP)\n» c recharger • d parer • f forfait`);
  return lines.join("\n");
}
function sendDuel(c, D, log) {
  const a = D[D.turn];
  return c.message.reply({ body: B(duelText(D, log)), mentions: [{ tag: `@${a.name}`, id: a.uid }] }, (err, info) => {
    if (err || !info) return;
    global.GoatBot.onReply.set(info.messageID, { commandName: CMD, messageID: info.messageID, author: a.uid, type: "duel", D, expires: Date.now() + TURN_TTL });
  });
}

async function duelAsk(c, Reply) {
  const a = strip(c.event.body).split(/\s+/)[0];
  if (c.uid !== Reply.p2) return reply(c, "⚔️ Ce défi ne s'adresse pas à toi.");
  global.GoatBot.onReply.delete(Reply.messageID);
  if (NO.includes(a)) return reply(c, "🏳️ Duel refusé. Le défi est annulé.");
  if (!YES.includes(a)) { global.GoatBot.onReply.set(Reply.messageID, Reply); return reply(c, "❓ Réponds « oui » pour accepter ou « non » pour refuser."); }
  if (Date.now() > Reply.expires) return reply(c, "⌛ Le défi a expiré.");
  const p1 = await getP(c, Reply.p1), p2 = c.me;
  if (Reply.bet > 0) {
    if (!Reply.god1 && wallet(p1) < Reply.bet) return reply(c, "💸 Le challenger n'a plus assez de Cols. Duel annulé.");
    if (!c.god && wallet(p2) < Reply.bet) return reply(c, "💸 Tu n'as pas assez de Cols pour cette mise. Duel annulé.");
  }
  const D = { p1: duelFighter(p1, await nm(c, Reply.p1), Reply.god1), p2: duelFighter(p2, await nm(c, c.uid), !!c.god), turn: "p1", bet: Reply.bet, round: 1 };
  if (D.p2.sp && D.p2.atk > D.p1.atk * 1.3) { /* le plus fort commence moins souvent */ }
  if (D.p2.atk + D.p2.maxHp / 10 < D.p1.atk + D.p1.maxHp / 10 && Math.random() < 0.5) D.turn = "p2";
  return sendDuel(c, D, "⚔️ « Duel ! » — Que le meilleur épéiste gagne !");
}

async function duelTurn(c, Reply) {
  const D = Reply.D;
  if (c.uid !== D.p1.uid && c.uid !== D.p2.uid) return reply(c, "⚔️ Ce duel n'est pas le tien !");
  if (c.uid !== D[D.turn].uid) return reply(c, "⏳ Ce n'est pas ton tour !");
  const a = strip(c.event.body)[0] || "";
  const word = strip(c.event.body);
  const forfeit = word === "f" || word.startsWith("forfait") || word === "fin";
  if (!forfeit && !"abxcd".includes(a)) return reply(c, `❌ Commande invalide.\n» a attaque • b ${D[D.turn].k.b} • x ${D[D.turn].k.x}\n» c recharger • d parer • f forfait`);
  const me = D[D.turn], foe = D[D.turn === "p1" ? "p2" : "p1"];
  if (a === "c" && me.lastC && !forfeit) return reply(c, "❌ Tu ne peux pas te recharger deux fois de suite !");
  global.GoatBot.onReply.delete(Reply.messageID);
  if (forfeit) return endDuel(c, D, foe, me, `🏳️ ${me.name} abandonne le duel !`);

  let log = "", dmg = 0, again = false;
  const crit = Math.random() < DMG.crit;
  const hit = (lo, hi) => Math.floor(me.atk * rf(lo, hi) * (crit ? 1.5 : 1));
  if (a === "a") { dmg = hit(...DMG.basic); me.lastC = false; log = `🗡️ ${me.name} attaque ${crit ? "💥 (CRITIQUE) " : ""}!`; }
  else if (a === "b") {
    if (me.sp < DMG.skillSp) { again = true; log = `❌ SP insuffisants pour « ${me.k.b} » (il faut ${DMG.skillSp}).`; }
    else { me.sp -= DMG.skillSp; me.lastC = false; dmg = hit(...DMG.skill); log = `✨ ${me.name} enchaîne « ${me.k.b} » ${crit ? "💥 " : ""}!`; }
  } else if (a === "x") {
    if (me.sp < DMG.ultSp) { again = true; log = `❌ SP insuffisants pour « ${me.k.x} » (il faut ${DMG.ultSp}).`; }
    else {
      me.sp -= DMG.ultSp; me.lastC = false;
      const fail = me.k.ultFail !== undefined ? me.k.ultFail : DMG.ultFail;
      if (Math.random() < fail) log = `⚡ « ${me.k.x} » est interrompu !`;
      else { dmg = Math.floor(me.atk * rf(DMG.ult[0], me.k.ultMult || DMG.ult[1]) * (crit ? 1.5 : 1)); log = `🌟 ${me.name} déchaîne « ${me.k.x} » ${crit ? "💥 " : ""}!!`; }
    }
  } else if (a === "c") { me.sp = Math.min(100, me.sp + DMG.chargeSp); me.lastC = true; log = `🔋 ${me.name} reprend son souffle (+${DMG.chargeSp} SP).`; }
  else if (a === "d") { me.defending = true; me.lastC = false; log = `🛡️ ${me.name} se met en garde (−40 % de dégâts au prochain coup) !`; }
  if (again) return sendDuel(c, D, log);

  if (dmg > 0) {
    if (me.god) dmg = Math.ceil(foe.maxHp / 3) + 1;                       // le Dieu frappe comme un dieu
    dmg = Math.max(1, dmg - Math.floor(foe.def * 0.4));
    if (foe.god) { log += `\n♾️ ${foe.name} est protégé par l'OBJET IMMORTEL : aucun dégât !`; dmg = 0; }
    else {
      if (foe.defending) { dmg = Math.floor(dmg * DUEL.dmgDef); foe.defending = false; log += `\n🛡️ Parade ! Dégâts réduits.`; }
      foe.hp -= dmg; log += `\n💢 -${dmg} PV pour ${foe.name}`;
    }
  } else if (foe.defending && (a === "a" || a === "b" || a === "x")) foe.defending = false;

  if (foe.hp <= 0) return endDuel(c, D, me, foe, log);
  me.sp = Math.min(100, me.sp + DMG.regenSp);
  D.turn = D.turn === "p1" ? "p2" : "p1";
  if (D.turn === "p1") D.round++;
  return sendDuel(c, D, log);
}

async function endDuel(c, D, win, lose, log) {
  const w = await getP(c, win.uid), l = await getP(c, lose.uid);
  let txt = `${log}\n\n🏆 ${win.name} remporte le duel contre ${lose.name} !`;
  w.g.duelW = (w.g.duelW || 0) + 1; l.g.duelL = (l.g.duelL || 0) + 1;
  if (D.bet > 0) {
    const pay = win.god ? 0 : Math.min(D.bet, wallet(l));
    const loss = lose.god ? 0 : pay;
    if (loss > 0 || lose.god) { addMoney(l, -loss); addMoney(w, win.god ? 0 : loss); }
    txt += `\n💰 Mise : ${win.god ? "le Dieu ne ramasse rien" : lose.god ? "un dieu ne paie pas" : `${FM(loss)} transférés à ${win.name}`}`;
  }
  if (!win.god) { gainXp(w, DUEL.xp + 6 * lose.lv); txt += `\n⭐ +${DUEL.xp + 6 * lose.lv} XP pour ${win.name}`; }
  txt += `\n(Aucune mort réelle : les PV sont rendus.)`;
  return finish(c, txt, { mentions: [await mentionOf(c, win.uid), await mentionOf(c, lose.uid)], others: [w, l].filter((p) => p !== c.me) });
}

// ============================================================
//  🏰 GUILDES (clans) : un chef, jusqu'à 10 membres, une caisse commune
// ============================================================
const CLAN = { cost: $(5000), max: 10 };
async function clanOf(c, g) { if (!g.guild) return null; const lead = await getP(c, g.guild); return lead.g.guildInfo ? lead : null; }
async function cmdClan(c) {
  if (needChar(c)) return;
  const me = c.me, g = me.g, sub = strip(c.args[1] || "info");
  if (sub === "creer" || sub === "create") {
    if (g.guild) return reply(c, "🏰 Tu appartiens déjà à une guilde.");
    const name = c.args.slice(2).join(" ").trim();
    if (name.length < 3 || name.length > 20) return reply(c, "⚠️ sao clan creer <nom> (3 à 20 caractères)");
    if (!c.god && wallet(me) < CLAN.cost) return reply(c, `💸 Créer une guilde coûte ${FM(CLAN.cost)}.`);
    if (!c.god) addMoney(me, -CLAN.cost);
    g.guild = c.uid; g.guildInfo = { name, members: [c.uid], bank: 0 };
    return finish(c, `🏰 Guilde « ${name} » fondée !\n👑 Chef : ${await nm(c, c.uid)}\n👉 sao clan inviter @joueur`);
  }
  const lead = await clanOf(c, g);
  if (sub === "accepter" || sub === "accept") {
    if (!g.invite) return reply(c, "📭 Aucune invitation en attente.");
    if (g.guild) return reply(c, "🏰 Quitte d'abord ta guilde actuelle.");
    const chef = await getP(c, g.invite);
    if (!chef.g.guildInfo || chef.g.guildInfo.members.length >= CLAN.max) { g.invite = null; return finish(c, "❌ Cette guilde n'existe plus ou est pleine."); }
    chef.g.guildInfo.members.push(c.uid); g.guild = chef.uid; g.invite = null;
    return finish(c, `🎉 Bienvenue dans la guilde « ${chef.g.guildInfo.name} » !`, { others: [chef] });
  }
  if (!lead) return reply(c, "🏰 Tu n'as pas de guilde.\n👉 sao clan creer <nom>  •  sao clan accepter");
  const info = lead.g.guildInfo, isLead = lead.uid === c.uid;
  if (sub === "info") {
    const rows = [];
    for (const id of info.members) { const p = await getP(c, id); rows.push(`${id === lead.uid ? "👑" : "•"} ${await nm(c, id)} — Niv.${p.g.lv} • étage ${p.g.cleared}`); }
    return reply(c, `🏰 GUILDE « ${info.name} »\n${L("═", 36)}\n${rows.join("\n")}\n\n👥 ${info.members.length}/${CLAN.max}  •  🏦 Caisse : ${FM(info.bank)}`);
  }
  if (sub === "inviter") {
    if (!isLead) return reply(c, "🚫 Seul le chef peut inviter.");
    const tid = targetOf(c.event, c.args.slice(2));
    if (!tid || tid === c.uid) return reply(c, "⚠️ Mentionne un joueur.");
    if (info.members.length >= CLAN.max) return reply(c, "❌ La guilde est pleine.");
    const t = await getP(c, tid);
    if (!t.g.created) return reply(c, "🎮 Ce joueur n'est pas connecté à Aincrad.");
    if (t.g.guild) return reply(c, "🏰 Ce joueur a déjà une guilde.");
    t.g.invite = lead.uid;
    return finish(c, `📨 ${await nm(c, tid)} est invité dans « ${info.name} ».\n👉 Il doit taper : sao clan accepter`, { others: [t] });
  }
  if (sub === "depot") {
    const n = num(c.args[2]);
    if (isNaN(n) || n <= 0) return reply(c, "⚠️ sao clan depot <montant>");
    if (!c.god && n > wallet(me)) return reply(c, "💸 Pas assez de Cols.");
    if (!c.god) addMoney(me, -n);
    info.bank += n;
    return finish(c, `🏦 +${FM(n)} dans la caisse de « ${info.name} » (total ${FM(info.bank)}).`, { others: lead === me ? [] : [lead] });
  }
  if (sub === "retrait") {
    if (!isLead) return reply(c, "🚫 Seul le chef peut retirer.");
    const n = num(c.args[2]);
    if (isNaN(n) || n <= 0 || n > info.bank) return reply(c, `⚠️ sao clan retrait <montant> (caisse : ${FM(info.bank)})`);
    info.bank -= n; addMoney(me, n);
    return finish(c, `💰 Tu retires ${FM(n)} de la caisse.`);
  }
  if (sub === "quitter") {
    if (isLead) return reply(c, "👑 Le chef ne peut pas partir : « sao clan dissoudre ».");
    info.members = info.members.filter((x) => x !== c.uid); g.guild = null;
    return finish(c, "🚪 Tu quittes la guilde.", { others: [lead] });
  }
  if (sub === "dissoudre") {
    if (!isLead) return reply(c, "🚫 Seul le chef peut dissoudre.");
    const others = [];
    for (const id of info.members) if (id !== c.uid) { const p = await getP(c, id); p.g.guild = null; others.push(p); }
    addMoney(me, info.bank); const b = info.bank; g.guild = null; g.guildInfo = null;
    return finish(c, `💥 La guilde est dissoute. Caisse (${FM(b)}) rendue au chef.`, { others });
  }
  return reply(c, "🏰 sao clan : creer <nom> • info • inviter @u • accepter • depot <n> • retrait <n> • quitter • dissoudre");
}

// ============================================================
//  💍 MARIAGE (Kirito & Asuna) : +10 % d'XP pour les deux époux
// ============================================================
async function cmdMarry(c) {
  if (needChar(c)) return;
  const g = c.me.g;
  if (g.spouse) return reply(c, `💍 Tu es déjà marié(e) à ${await nm(c, g.spouse)}. (sao divorce)`);
  const tid = targetOf(c.event, c.args.slice(1));
  if (!tid || tid === c.uid) return reply(c, "💍 sao epouser @joueur");
  const t = await getP(c, tid);
  if (!t.g.created) return reply(c, "🎮 Ce joueur n'est pas connecté à Aincrad.");
  if (t.g.spouse) return reply(c, "💔 Ce joueur est déjà marié.");
  const n2 = await nm(c, tid);
  const body = B(`💍 DEMANDE EN MARIAGE\n${L("━", 30)}\n${await nm(c, c.uid)} demande ${n2} en mariage dans la petite maison du lac (étage 22) !\n\n@${n2}, réponds « oui » ou « non » à ce message.`);
  return c.message.reply({ body, mentions: [{ tag: `@${n2}`, id: tid }] }, (err, info) => {
    if (err || !info) return;
    global.GoatBot.onReply.set(info.messageID, { commandName: CMD, messageID: info.messageID, author: tid, type: "marryAsk", p1: c.uid, p2: tid, expires: Date.now() + DUEL.askTtl });
  });
}
async function marryAsk(c, Reply) {
  const a = strip(c.event.body).split(/\s+/)[0];
  if (c.uid !== Reply.p2) return reply(c, "💍 Cette demande ne s'adresse pas à toi.");
  if (Date.now() > Reply.expires) { global.GoatBot.onReply.delete(Reply.messageID); return reply(c, "⌛ La demande a expiré."); }
  if (NO.includes(a)) { global.GoatBot.onReply.delete(Reply.messageID); return reply(c, "💔 Demande refusée."); }
  if (!YES.includes(a)) return reply(c, "❓ Réponds « oui » ou « non ».");
  global.GoatBot.onReply.delete(Reply.messageID);
  const p1 = await getP(c, Reply.p1), p2 = c.me;
  if (p1.g.spouse || p2.g.spouse) return reply(c, "💔 L'un de vous est déjà marié.");
  p1.g.spouse = p2.uid; p2.g.spouse = p1.uid;
  return finish(c, `💞 ${await nm(c, p1.uid)} et ${await nm(c, p2.uid)} sont mariés !\n⭐ +10 % d'XP pour les deux époux.`, { others: [p1] });
}
async function cmdDivorce(c) {
  if (needChar(c)) return;
  const g = c.me.g;
  if (!g.spouse) return reply(c, "💍 Tu n'es pas marié(e).");
  const s = await getP(c, g.spouse), sn = await nm(c, g.spouse);
  s.g.spouse = null; g.spouse = null;
  return finish(c, `💔 Tu divorces de ${sn}.`, { others: [s] });
}

const ROUTES = {
  help: (c) => reply(c, renderHelp(c.god)), aide: (c) => reply(c, renderHelp(c.god)),
  creer: cmdCreate, create: cmdCreate, start: cmdCreate, linkstart: cmdCreate, connexion: cmdCreate,
  stat: cmdStat, status: cmdStat, profil: cmdStat, fiche: cmdStat,
  competences: cmdSkills, skills: cmdSkills, skill: cmdSkills,
  chasse: cmdHunt, chasser: cmdHunt, combat: cmdHunt, hunt: cmdHunt, labyrinthe: cmdHunt, monstres: cmdHunt,
  carte: cmdMap, map: cmdMap,
  boss: cmdBoss,
  etage: cmdFloor, etages: cmdFloor, floor: cmdFloor,
  argo: cmdArgo, info: cmdArgo,
  boutique: (c) => cmdShop(c), shop: (c) => cmdShop(c), acheter: (c) => cmdShop(c, "acheter"), buy: (c) => cmdShop(c, "acheter"),
  sac: cmdBag, inv: cmdBag, inventaire: cmdBag,
  utiliser: cmdUse, use: cmdUse,
  auberge: cmdInn, inn: cmdInn, dormir: cmdInn, soigner: cmdInn,
  armurerie: cmdArmorShop, armure: cmdArmorShop,
  forge: cmdForge, lisbeth: cmdForge, forgeron: cmdForge,
  solde: cmdDaily, guilde: cmdDaily, daily: cmdDaily,
  top: cmdTop, classement: cmdTop,
  duel: cmdDuel, defi: cmdDuel, pvp: cmdDuel,
  clan: cmdClan, guild: cmdClan,
  epouser: cmdMarry, marier: cmdMarry, mariage: cmdMarry, divorce: cmdDivorce,
  gm: cmdGM, dieu: cmdGM, god: cmdGM, admin: cmdGM, systeme: cmdGM
};

// ─── Export ───────────────────────────────────────────────────
module.exports = {
  config: {
    name: CMD,
    aliases: ["aincrad", "sword", "kirito"],
    version: "2.0",
    author: "Camille Uchiha 🍓",
    countDown: 2,
    role: 0,
    description: { fr: "⚔️ Sword Art Online : conquiers les 100 étages d'Aincrad, combats au tour par tour. L'admin est le Dieu suprême." },
    category: "game",
    guide: { fr: "Tapez 'sao help' pour voir toutes les commandes." }
  },

  onStart: async function ({ message, event, args, api, usersData, role }) {
    const c = { message, event, args, api, usersData, uid: String(event.senderID), botID: String(api.getCurrentUserID()), names: new Map(), players: new Map() };
    c.god = isGod(c.uid, role);
    c.me = await getP(c, c.uid);
    // Le dieu mémorise l'événement mondial en cours (si le bot a redémarré)
    if (!WORLD) { try { const all = await usersData.getAll(); for (const u of all) { const w = u.data && u.data.sao && u.data.sao.world; if (w && w.until > Date.now()) { WORLD = w; break; } } } catch (e) { /* ignore */ } }
    const sub = strip(args[0] || "stat");
    let handler = ROUTES[sub];
    if (!handler && Object.keys(event.mentions || {}).length) handler = cmdStat;
    if (!handler) return reply(c, "❓ Commande inconnue. Tapez 'sao help' pour voir la liste.");
    try {
      return await handler(c);
    } catch (e) {
      console.error("[sao]", e);
      return message.reply("❌ Une erreur est survenue. Réessaie dans un instant.");
    }
  },

  // Les réponses aux combats (a / b / x / c / d / p / e / f)
  onReply: async function ({ event, Reply, message, usersData, api, role }) {
    const c = { message, event, args: [], api, usersData, uid: String(event.senderID), botID: String(api.getCurrentUserID()), names: new Map(), players: new Map() };
    if (Date.now() > Reply.expires && Reply.type !== "duelAsk" && Reply.type !== "marryAsk") { global.GoatBot.onReply.delete(Reply.messageID); return message.reply(B("⌛ Trop tard : le combat est terminé. (Relance : sao chasse / sao duel)")); }
    if (Reply.type === "fight" && String(event.senderID) !== String(Reply.author)) return message.reply(B("⚔️ Ce combat n'est pas le tien !"));
    try {
      c.god = isGod(c.uid, role);
      c.me = await getP(c, c.uid);
      if (Reply.type === "fight") return await fightTurn(c, Reply);
      if (Reply.type === "duel") return await duelTurn(c, Reply);
      if (Reply.type === "duelAsk") return await duelAsk(c, Reply);
      if (Reply.type === "marryAsk") return await marryAsk(c, Reply);
      return;
    } catch (e) {
      console.error("[sao:reply]", e);
      return message.reply("❌ Une erreur est survenue. Réessaie dans un instant.");
    }
  }
};
