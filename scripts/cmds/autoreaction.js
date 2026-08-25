const fs = require("fs-extra");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "cache", "autoreaction_config.json");

// Base de données par défaut contenant l'ensemble des catégories 1 à 6
const defaultRules = {
  rules: [
    // 1. Les Salutations
    { keyword: "bonjour", emoji: "👋" },
    { keyword: "salut", emoji: "👋" },
    { keyword: "slt", emoji: "👋" },
    { keyword: "cc", emoji: "👋" },
    { keyword: "hey", emoji: "👀" },
    { keyword: "wesh", emoji: "👋" },
    { keyword: "bonsoir", emoji: "👋" },
    { keyword: "yo", emoji: "👋" },
    { keyword: "coucou", emoji: "❤️" },

    // 2. Les Insultes et Clashes
    { keyword: "fdp", emoji: "💀" },
    { keyword: "con", emoji: "🤫" },
    { keyword: "merde", emoji: "🚫" },
    { keyword: "tg", emoji: "🤫" },
    { keyword: "ta gueule", emoji: "🤫" },
    { keyword: "pute", emoji: "🚫" },
    { keyword: "salaud", emoji: "🖕" },
    { keyword: "imbécile", emoji: "🤫" },
    { keyword: "clochard", emoji: "💀" },

    // 3. Les Rires et l'Humour
    { keyword: "mdr", emoji: "😂" },
    { keyword: "ptdr", emoji: "🤣" },
    { keyword: "xptdr", emoji: "🤣" },
    { keyword: "haha", emoji: "😂" },
    { keyword: "jure", emoji: "😭" },
    { keyword: "mdrr", emoji: "😂" },
    { keyword: "lmao", emoji: "🤣" },
    { keyword: "lol", emoji: "😂" },
    { keyword: "😂", emoji: "🤣" },

    // 4. Le Bot lui-même
    { keyword: "bot", emoji: "🤖" },
    { keyword: "mini bot", emoji: "🤖" },
    { keyword: "robot", emoji: "💻" },
    { keyword: "l'ia", emoji: "🤖" },
    { keyword: "connecté", emoji: "🔥" },
    { keyword: "bug", emoji: "💻" },
    { keyword: "camille", emoji: "👑" },

    // 5. Les Expressions de Choc ou Surprise
    { keyword: "quoi", emoji: "🧐" },
    { keyword: "waw", emoji: "😲" },
    { keyword: "incroyable", emoji: "🤯" },
    { keyword: "omg", emoji: "😱" },
    { keyword: "wtf", emoji: "🧐" },
    { keyword: "punaise", emoji: "😲" },
    { keyword: "choqué", emoji: "🤯" },
    { keyword: "wlh", emoji: "😱" },

    // 6. L'Amour et l'Amitié
    { keyword: "je t'aime", emoji: "❤️" },
    { keyword: "jetaime", emoji: "❤️" },
    { keyword: "je t'adore", emoji: "🥰" },
    { keyword: "mon sang", emoji: "💍" },
    { keyword: "frérot", emoji: "👑" },
    { keyword: "bg", emoji: "😏" },
    { keyword: "belle", emoji: "😏" },
    { keyword: "coeur", emoji: "❤️" }
  ]
};

// Initialisation et injection automatique des mots-clés par défaut
if (!fs.existsSync(CONFIG_PATH)) {
  fs.ensureDirSync(path.dirname(CONFIG_PATH));
  fs.writeJsonSync(CONFIG_PATH, defaultRules);
}

function getConfig() { return fs.readJsonSync(CONFIG_PATH); }
function saveConfig(data) { fs.writeJsonSync(CONFIG_PATH, data); }

module.exports = {
  config: {
    name: "autoreaction",
    aliases: ["autoreact", "reactrule"],
    version: "2.1.0",
    author: "Camille Uchiha",
    countDown: 3,
    role: 0,
    shortDescription: "Auto-réactions textuelles + Miroir universel de TOUS les émojis",
    longDescription: "Réagit aux mots-clés du JSON et renvoie instantanément le même émoji si l'utilisateur en utilise un.",
    category: "fun",
    guide: { fr: "{p}{n} add [mot] [emoji] | {p}{n} remove [mot] | {p}{n} list | {p}{n} stop | {p}{n} on" }
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const config = getConfig();

    if (!global.autoreact_status) global.autoreact_status = new Map();

    if (!args || args.length === 0) {
      const isOff = global.autoreact_status.get(threadID) === "off";
      const currentStatus = isOff ? "🛑 DÉSACTIVÉ" : "✅ ACTIVÉ";

      return message.reply(
        `⚙️━━━『 𝗔𝗨𝗧𝗢-𝗥𝗘𝗔𝗖𝗧𝗜𝗢𝗡 𝘃𝟮 』━━━⚙️\n\n` +
        `📊 Statut actuel : ${currentStatus}\n` +
        `📚 Mots-clés enregistrés : ${config.rules.length}\n` +
        `✨ Miroir universel émojis : Actif\n\n` +
        `🔧 ─── Commandes ─── 🔧\n` +
        `👉 {p}autoreaction add [mot] [emoji]\n` +
        `👉 {p}autoreaction remove [mot]\n` +
        `👉 {p}autoreaction list\n\n` +
        `👑 ─── Zone Admin ─── 👑\n` +
        `👉 {p}autoreaction stop\n` +
        `👉 {p}autoreaction on`
      );
    }

    const action = args[0].toLowerCase();

    if (action === "stop" || action === "off") {
      global.autoreact_status.set(threadID, "off");
      return message.reply(
        `🛑━━━『 𝗔𝗨𝗧𝗢-𝗥𝗘𝗔𝗖𝗧𝗜𝗢𝗡 』━━━🛑\n\n` +
        `❌ Module désactivé dans ce groupe.\n` +
        `💤 Plus aucune réaction automatique ni miroir d'émojis ne sera envoyée.\n\n` +
        `↩️ Tape {p}autoreaction on pour tout réactiver.`
      );
    }

    if (action === "on" || action === "start") {
      global.autoreact_status.set(threadID, "on");
      return message.reply(
        `✅━━━『 𝗔𝗨𝗧𝗢-𝗥𝗘𝗔𝗖𝗧𝗜𝗢𝗡 』━━━✅\n\n` +
        `🔥 Module réactivé avec succès !\n` +
        `🪞 Miroir universel d'émojis : ON\n` +
        `📚 ${config.rules.length} mots-clés surveillés\n\n` +
        `Le bot va maintenant réagir automatiquement dans ce groupe.`
      );
    }

    if (action === "add") {
      const keyword = args[1]?.toLowerCase();
      const emoji = args[2];

      if (!keyword || !emoji) {
        return message.reply(
          `⚠️ Syntaxe incorrecte.\n💡 Exemple : {p}autoreaction add bonjour ❤️`
        );
      }

      const exists = config.rules.find(r => r.keyword === keyword);
      if (exists) { exists.emoji = emoji; } else { config.rules.push({ keyword, emoji }); }

      saveConfig(config);
      return message.reply(
        `✅ Règle enregistrée !\n📝 "${keyword}" ➡️ ${emoji}`
      );
    }

    if (action === "remove") {
      const keyword = args[1]?.toLowerCase();
      if (!keyword) return message.reply("⚠️ Précise le mot-clé à supprimer.");

      const initialLength = config.rules.length;
      config.rules = config.rules.filter(r => r.keyword !== keyword);

      if (config.rules.length === initialLength) {
        return message.reply(`❌ Aucun mot-clé correspondant à "${keyword}" trouvé.`);
      }

      saveConfig(config);
      return message.reply(`🗑️ La règle pour "${keyword}" a été supprimée avec succès.`);
    }

    if (action === "list") {
      if (config.rules.length === 0) return message.reply("ℹ️ Aucun mot-clé configuré.");
      const listText = config.rules.map((r, i) => `${i + 1}. [ ${r.keyword} ] ➡️ ${r.emoji}`).join("\n");
      return message.reply(
        `📋━━『 𝗠𝗢𝗧𝗦-𝗖𝗟𝗘𝗦 𝗔𝗖𝗧𝗜𝗙𝗦 』━━📋\n\n${listText}\n\n` +
        `✨ Le bot fait aussi automatiquement miroir sur TOUS les émojis du monde !`
      );
    }

    return message.reply("❌ Sous-commande inconnue. Tape {p}autoreaction pour voir le menu.");
  },

  onChat: async function ({ api, event }) {
    const { threadID, messageID, body } = event;

    if (!body) return;

    if (global.autoreact_status && global.autoreact_status.get(threadID) === "off") return;

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F191}-\u{1F251}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/u;

    const match = body.match(emojiRegex);
    if (match) {
      const detectedEmoji = match[0];
      return api.setMessageReaction(detectedEmoji, messageID, (err) => {
        if (err) console.error("Erreur Miroir Émoji:", err);
      }, true);
    }

    const config = getConfig();
    const textReceived = body.toLowerCase();

    for (const rule of config.rules) {
      if (textReceived.includes(rule.keyword)) {
        api.setMessageReaction(rule.emoji, messageID, (err) => {
          if (err) console.error("Erreur Auto-Reaction Mots-Clés:", err);
        }, true);
        break;
      }
    }
  }
};
