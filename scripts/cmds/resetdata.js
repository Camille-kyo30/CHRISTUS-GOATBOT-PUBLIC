const fs = require("fs-extra");
const path = require("path");

let fonts;
try {
  fonts = require('../../func/font.js');
} catch (e) {
  fonts = { bold: (t) => t, monospace: (t) => t, sansSerif: (t) => t };
}

const ADMIN_UIDS = ["61593963982581"];
const CONFIRM_WORD = "CONFIRMER";
const CONFIRM_TIMEOUT = 30000;
const BACKUP_DIR = path.join(__dirname, "tmp");

function emptyBank() {
  return {
    balance: 0, savings: 0, vault: 0, loan: 0, loanDate: null,
    creditScore: 750, bankLevel: 1, multiplier: 1.0, premium: false,
    streak: 0, lastDaily: null, lastWork: null, lastRob: null,
    lastInterest: Date.now(), lotteryTickets: 0, achievements: [],
    reputation: 0, skills: { gambling: 0, trading: 0, business: 0, investing: 0 },
    stocks: {}, crypto: {}, bonds: {}, realEstate: [], businesses: [],
    vehicles: [], luxury: [], insurance: {}, transactions: []
  };
}

function emptyEmpire() {
  return {
    argentSale:        0,
    argentPropre:      0,
    totalGagne:        0,
    totalBlanchit:     0,
    rang:              "RAT",
    xp:                0,
    niveau:            1,
    reputation:        0,
    territoires:       ["BANLIEUE"],
    structuresActives: [],
    inventaire:        {},
    capaciteMax:       50,
    allies:            [],
    missionEnCours:    null,
    lastMission:       null,
    missionsCompletes: 0,
    lastGuerre:        null,
    guerresGagnees:    0,
    guerresPerdues:    0,
    lastBlanchiment:   null,
    blanchimentEnCours:null,
    lastCollecte:      null,
    lastAttentat:      null,
    lastDaily:         null,
    lastMarche:        null,
    transactions:      [],
    achievements:      [],
    evenementActif:    null,
    evenementExpire:   null,
    alerte:            0,
    prison:            null,
    vault:             0,
    loan:              0,
  };
}

const fmt = (n) => (Number(n) || 0).toLocaleString();

function getScope(cmd) {
  return {
    bank: cmd === "bank" || cmd === "all",
    empire: cmd === "empire" || cmd === "all",
    full: cmd === "full"
  };
}

function scopeLabel(scope) {
  if (scope.full) return "TOUTES LES DONNÉES (data, money, exp)";
  if (scope.bank && scope.empire) return "BANK + EMPIRE";
  return scope.bank ? "BANK" : "EMPIRE";
}

function snapshot(user, scope) {
  const data = user.data || {};
  if (scope.full) return { money: user.money || 0, exp: user.exp || 0, data };
  const snap = { data: {} };
  if (scope.bank) snap.data.bank = data.bank;
  if (scope.empire) snap.data.empire = data.empire;
  return snap;
}

function applyReset(user, scope) {
  if (!user.data || typeof user.data !== "object") user.data = {};
  if (scope.full) {
    user.data = {};
    user.money = 0;
    user.exp = 0;
    return;
  }
  if (scope.bank) user.data.bank = emptyBank();
  if (scope.empire) user.data.empire = emptyEmpire();
}

async function writeBackup(entries, scope) {
  await fs.ensureDir(BACKUP_DIR);
  const file = path.join(BACKUP_DIR, `resetdata_backup_${Date.now()}.json`);
  await fs.writeJson(file, {
    createdAt: new Date().toISOString(),
    scope: scopeLabel(scope),
    count: Object.keys(entries).length,
    users: entries
  });
  return file;
}

async function massReset(usersData, scope) {
  const allUsers = await usersData.getAll();
  const targets = allUsers.filter(u => u && (u.userID || u.id));

  const entries = {};
  for (const u of targets) {
    entries[String(u.userID || u.id)] = { name: u.name || null, ...snapshot(u, scope) };
  }

  const backupFile = await writeBackup(entries, scope);

  let done = 0;
  const failed = [];
  for (const u of targets) {
    const uid = String(u.userID || u.id);
    const copy = { ...u, data: { ...(u.data || {}) } };
    applyReset(copy, scope);
    try {
      await usersData.set(uid, copy);
      done++;
    } catch (err) {
      failed.push(uid);
    }
  }

  return { total: targets.length, done, failed, backupFile };
}

module.exports = {
  config: {
    name: "resetdata",
    aliases: ["datareset", "wipedata"],
    version: "2.0",
    author: "Christus",
    countDown: 5,
    role: 0,
    description: {
      fr: "🔧 Réinitialise les données bank, empire ou toutes les données d'un utilisateur ou de tous les utilisateurs."
    },
    category: "admin",
    guide: {
      fr: `${fonts.sansSerif("✨ COMMANDE ADMIN ✨")}\n\n` +
          `${fonts.bold("{pn} bank [@user|uid]")} : reset bank d'un utilisateur\n` +
          `${fonts.bold("{pn} bank all")} : reset bank de TOUS les utilisateurs\n` +
          `${fonts.bold("{pn} empire [@user|uid]")} : reset empire d'un utilisateur\n` +
          `${fonts.bold("{pn} empire all")} : reset empire de TOUS les utilisateurs\n` +
          `${fonts.bold("{pn} all [@user|uid]")} : reset bank + empire d'un utilisateur\n` +
          `${fonts.bold("{pn} all all")} : reset bank + empire de TOUS les utilisateurs\n` +
          `${fonts.bold("{pn} full <@user|uid>")} : efface TOUTES les données d'un utilisateur (data, money, exp)\n` +
          `${fonts.bold("{pn} full all")} : efface TOUTES les données de TOUS les utilisateurs\n\n` +
          `ℹ️ Les resets globaux demandent une confirmation et créent une sauvegarde JSON avant d'effacer.\n\n` +
          `Exemples :\n` +
          `• ${fonts.monospace("{pn} bank @Christus")}\n` +
          `• ${fonts.monospace("{pn} empire all")}\n` +
          `• ${fonts.monospace("{pn} full all")}`
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    if (!ADMIN_UIDS.includes(String(event.senderID))) {
      return message.reply("⛔ Accès refusé : privilèges administrateur requis.");
    }

    const cmd    = args[0]?.toLowerCase();
    const target = args[1]?.toLowerCase();

    if (!cmd || !["bank", "empire", "all", "full"].includes(cmd)) {
      return message.reply(
        `❌ Usage :\n` +
        `• resetdata bank [@user|uid|all]\n` +
        `• resetdata empire [@user|uid|all]\n` +
        `• resetdata all [@user|uid|all]\n` +
        `• resetdata full <@user|uid|all>`
      );
    }

    const scope = getScope(cmd);

    if (target === "all") {
      let total;
      try {
        total = (await usersData.getAll()).length;
      } catch (err) {
        return message.reply(`❌ Impossible de lire la base de données :\n${err.message}`);
      }

      const confirmMsg = [
        "⚠️ RÉINITIALISATION GLOBALE",
        "",
        `🔄 Portée : ${scopeLabel(scope)}`,
        `👥 Utilisateurs concernés : ${total}`,
        "",
        "Cette action est irréversible (une sauvegarde JSON sera créée juste avant).",
        `✅ Réponds à ce message avec ${CONFIRM_WORD} dans les 30 secondes pour valider.`
      ].join("\n");

      const replyMsg = await message.reply(confirmMsg);

      global.GoatBot.onReply.set(replyMsg.messageID, {
        commandName: "resetdata",
        author: event.senderID,
        messageID: replyMsg.messageID,
        scope
      });

      setTimeout(() => {
        const data = global.GoatBot.onReply.get(replyMsg.messageID);
        if (data && data.author === event.senderID) {
          global.GoatBot.onReply.delete(replyMsg.messageID);
          message.unsend(replyMsg.messageID).catch(() => {});
          message.reply("⏰ Temps écoulé, réinitialisation annulée.");
        }
      }, CONFIRM_TIMEOUT);

      return;
    }

    let targetID = Object.keys(event.mentions || {})[0];
    if (!targetID) {
      const potentialUID = args.find(a => /^\d{10,}$/.test(a));
      if (potentialUID) targetID = potentialUID;
    }

    if (!targetID) {
      if (scope.full) {
        return message.reply("❌ Pour `full`, indique explicitement un utilisateur (@tag ou uid) ou `all`.");
      }
      targetID = event.senderID;
    }

    let userData;
    try {
      userData = await usersData.get(targetID);
      if (!userData) return message.reply("❌ Utilisateur introuvable dans la base de données.");
    } catch (err) {
      return message.reply(`❌ Erreur lors de la récupération : ${err.message}`);
    }

    if (!userData.data) userData.data = {};

    const beforeBank   = userData.data.bank;
    const beforeEmpire = userData.data.empire;
    const beforeData   = userData.data;
    const beforeMoney  = userData.money;
    const beforeExp    = userData.exp;
    const lines        = [];

    if (scope.full) {
      const keys = Object.keys(beforeData);
      lines.push(`🧹 Données complètes effacées`);
      lines.push(`   • Money : $${fmt(beforeMoney)} ➜ $0`);
      lines.push(`   • EXP   : ${fmt(beforeExp)} ➜ 0`);
      lines.push(`   • Clés data supprimées : ${keys.length}${keys.length ? ` (${keys.join(", ")})` : ""}`);
    }

    if (scope.bank) {
      if (beforeBank) {
        lines.push(`🏦 Bank réinitialisée`);
        lines.push(`   • Balance : $${fmt(beforeBank.balance)} ➜ $0`);
        lines.push(`   • Savings : $${fmt(beforeBank.savings)} ➜ $0`);
        lines.push(`   • Vault   : $${fmt(beforeBank.vault)} ➜ $0`);
        lines.push(`   • Prêt    : $${fmt(beforeBank.loan)} ➜ $0`);
        const assets = [
          Object.keys(beforeBank.stocks   || {}).length,
          Object.keys(beforeBank.crypto   || {}).length,
          Object.keys(beforeBank.bonds    || {}).length,
          (beforeBank.realEstate  || []).length,
          (beforeBank.businesses  || []).length,
          (beforeBank.vehicles    || []).length,
          (beforeBank.luxury      || []).length,
        ].reduce((a, b) => a + b, 0);
        if (assets > 0) lines.push(`   • Actifs (stocks/crypto/biens…) : ${assets} effacés`);
      } else {
        lines.push(`🏦 Bank : aucune donnée existante — données vierges créées.`);
      }
    }

    if (scope.empire) {
      if (beforeEmpire) {
        lines.push(`🏴‍☠️ Empire réinitialisé`);
        lines.push(`   • Argent sale  : $${fmt(beforeEmpire.argentSale)} ➜ $0`);
        lines.push(`   • Argent propre: $${fmt(beforeEmpire.argentPropre)} ➜ $0`);
        lines.push(`   • Rang         : ${beforeEmpire.rang || "RAT"} ➜ RAT`);
        lines.push(`   • XP           : ${beforeEmpire.xp || 0} ➜ 0`);
        lines.push(`   • Territoires  : ${(beforeEmpire.territoires || []).length} ➜ 1 (BANLIEUE)`);
        lines.push(`   • Structures   : ${(beforeEmpire.structuresActives || []).length} ➜ 0`);
        lines.push(`   • Alliés       : ${(beforeEmpire.allies || []).length} ➜ 0`);
      } else {
        lines.push(`🏴‍☠️ Empire : aucune donnée existante — données vierges créées.`);
      }
    }

    applyReset(userData, scope);

    try {
      await usersData.set(targetID, userData);
      const name = userData.name || targetID;
      return message.reply(
        `✅ Réinitialisation effectuée pour ${fonts.bold(name)} :\n\n` +
        lines.join("\n")
      );
    } catch (err) {
      return message.reply(`❌ Erreur lors de la sauvegarde : ${err.message}`);
    }
  },

  onReply: async function ({ message, event, Reply, usersData }) {
    if (Reply.author !== event.senderID) return;
    if (!ADMIN_UIDS.includes(String(event.senderID))) return;

    global.GoatBot.onReply.delete(Reply.messageID);
    message.unsend(Reply.messageID).catch(() => {});

    if ((event.body || "").trim().toUpperCase() !== CONFIRM_WORD) {
      return message.reply("❌ Réinitialisation annulée.");
    }

    await message.reply("⏳ Sauvegarde puis réinitialisation en cours...");

    let result;
    try {
      result = await massReset(usersData, Reply.scope);
    } catch (err) {
      return message.reply(`❌ Opération annulée, aucune donnée n'a été modifiée :\n${err.message}`);
    }

    const lines = [
      "✅ Réinitialisation terminée !",
      `🔄 ${scopeLabel(Reply.scope)} remis à zéro pour ${result.done}/${result.total} utilisateur(s).`,
      `💾 Sauvegarde : ${path.relative(process.cwd(), result.backupFile)}`
    ];
    if (result.failed.length) {
      lines.push(`⚠️ Échecs : ${result.failed.length} (ex : ${result.failed.slice(0, 5).join(", ")})`);
    }
    return message.reply(lines.join("\n"));
  }
};
