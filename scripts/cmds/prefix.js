const fs = require("fs-extra");
const path = require("path");

const FRAME = "✦━━━━━━━━━━━━━━━━━━✦";
const QUOTE = "« Pas de panique, je suis le plus fort. »";

// Construit un message encadre style Gojo
function box(lines, closing) {
  return [
    FRAME,
    "🕶️ 𝗚𝗢𝗝𝗢 𝗦𝗔𝗧𝗢𝗥𝗨 🤍",
    FRAME,
    "",
    ...lines,
    "",
    "🌌 " + QUOTE,
    "",
    FRAME,
    closing || "✨ Expansion de Domaine : Préfixe ✨",
    "➜ Éditeur : Camille Uchiha 🎀",
    FRAME
  ].join("\n");
}

module.exports = {
  config: {
    name: "prefix",
    aliases: [],
    version: "1.5",
    author: "Christus",
    editor: "Camille Uchiha",
    countDown: 10,
    role: 0,
    description: {
      fr: "Change le préfixe du bot dans ce chat ou globalement"
    },
    category: "system",
    guide: {
      fr: "👋 Besoin d aide avec les préfixes ? Voici ce que je peux faire :\n" +
          "╰‣ Tape : {pn} <nouveauPréfixe>\n" +
          "   ↪ Définit un nouveau préfixe pour ce chat uniquement\n" +
          "   ↪ Exemple : {pn} $\n" +
          "╰‣ Tape : {pn} <nouveauPréfixe> -g\n" +
          "   ↪ Définit un nouveau préfixe global (admin uniquement)\n" +
          "   ↪ Exemple : {pn} ! -g\n" +
          "╰‣ Tape : {pn} reset\n" +
          "   ↪ Remet le préfixe par défaut de la config\n" +
          "╰‣ Tape : {pn} refresh\n" +
          "   ↪ Actualise le cache du préfixe pour ce chat\n" +
          "╰‣ Tape simplement : prefix\n" +
          "   ↪ Affiche les infos du préfixe actuel\n" +
          "🤖 Je suis 🎀MINI BOT🎀🫴, prêt à aider !"
    }
  },

  onStart: async function ({ message, role, args, commandName, event, threadsData, usersData }) {
    const globalPrefix = global.GoatBot.config.prefix;
    const userName = await usersData.getName(event.senderID) || "toi";

    if (!args[0]) {
      const threadPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;
      return message.reply({
        body: box([
          `👋 Salut ${userName}, tu cherchais mon préfixe ?`,
          `╭‣ 🌐 Global : ${globalPrefix}`,
          `╰‣ 💬 Ce chat : ${threadPrefix}`,
          "🤖 Je suis 🎀MINI BOT🎀🫴",
          `📂 Essaie "${threadPrefix}help" pour voir toutes les commandes.`
        ]),
        mentions: [{ id: event.senderID, tag: userName }]
      });
    }

    if (args[0] === "reset") {
      await threadsData.set(event.threadID, null, "data.prefix");
      return message.reply({
        body: box([
          `✅ ${userName}, le préfixe du chat a été réinitialisé !`,
          `╭‣ 🌐 Global : ${globalPrefix}`,
          `╰‣ 💬 Ce chat : ${globalPrefix}`,
          "🤖 Je suis 🎀MINI BOT🎀🫴",
          `📂 Essaie "${globalPrefix}help" pour voir toutes les commandes.`
        ]),
        mentions: [{ id: event.senderID, tag: userName }]
      });
    }

    if (args[0] === "refresh") {
      try {
        const threadID = event.threadID;
        if (threadsData.cache && threadsData.cache[threadID]) {
          delete threadsData.cache[threadID].data?.prefix;
        }
        const refreshedPrefix = await threadsData.get(threadID, "data.prefix") || globalPrefix;
        return message.reply({
          body: box([
            `🔄 ${userName}, le cache du préfixe a été actualisé !`,
            `╭‣ 🌐 Global : ${globalPrefix}`,
            `╰‣ 💬 Ce chat : ${refreshedPrefix}`,
            "🤖 Je suis 🎀MINI BOT🎀🫴",
            `📂 Essaie "${refreshedPrefix}help" pour voir toutes les commandes.`
          ]),
          mentions: [{ id: event.senderID, tag: userName }]
        });
      } catch (error) {
        return message.reply({
          body: box([`❌ ${userName}, impossible d actualiser le préfixe !`]),
          mentions: [{ id: event.senderID, tag: userName }]
        });
      }
    }

    const newPrefix = args[0];
    const setGlobal = args[1] === "-g";

    if (setGlobal && role < 2) {
      return message.reply({
        body: box([`⛔ ${userName}, les droits admin sont requis pour un changement global !`]),
        mentions: [{ id: event.senderID, tag: userName }]
      });
    }

    const currentPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;
    const confirmMessage = box(setGlobal
      ? [
        `⚙️ ${userName}, confirmer le changement du préfixe global ?`,
        `╭‣ Actuel : ${globalPrefix}`,
        `╰‣ Nouveau : ${newPrefix}`,
        "🤖 Réagis pour confirmer !"
      ]
      : [
        `⚙️ ${userName}, confirmer le changement du préfixe du chat ?`,
        `╭‣ Actuel : ${currentPrefix}`,
        `╰‣ Nouveau : ${newPrefix}`,
        "🤖 Réagis pour confirmer !"
      ]);

    return message.reply(confirmMessage, (err, info) => {
      if (err) return;
      global.GoatBot.onReaction.set(info.messageID, {
        author: event.senderID,
        newPrefix,
        setGlobal,
        commandName
      });
    });
  },

  onReaction: async function ({ message, event, Reaction, threadsData, usersData }) {
    const { author, newPrefix, setGlobal } = Reaction;
    if (event.userID !== author) return;
    const userName = await usersData.getName(event.userID) || "toi";

    if (setGlobal) {
      try {
        global.GoatBot.config.prefix = newPrefix;
        const configPath = global.client.dirConfig || path.join(process.cwd(), "config.json");
        fs.writeFileSync(configPath, JSON.stringify(global.GoatBot.config, null, 2));
        return message.reply({
          body: box([`✅ ${userName}, le préfixe global est maintenant : ${newPrefix}`]),
          mentions: [{ id: event.userID, tag: userName }]
        });
      } catch (error) {
        return message.reply(box(["❌ Échec de la sauvegarde du préfixe global."]));
      }
    }

    try {
      await threadsData.set(event.threadID, newPrefix, "data.prefix");
      return message.reply({
        body: box([`✅ ${userName}, le préfixe du chat est maintenant : ${newPrefix}`]),
        mentions: [{ id: event.userID, tag: userName }]
      });
    } catch (error) {
      return message.reply(box(["❌ Erreur de base de données lors de la sauvegarde du préfixe du chat."]));
    }
  },

  onChat: async function ({ event, message, threadsData, usersData }) {
    const triggerText = event.body?.toLowerCase().trim();
    if (!triggerText) return;
    const isTrigger = triggerText === "prefix" || triggerText === "ňč" || triggerText === "nøøbcore";
    if (!isTrigger) return;

    const userName = await usersData.getName(event.senderID) || "toi";
    const globalPrefix = global.GoatBot.config.prefix;
    const threadPrefix = await threadsData.get(event.threadID, "data.prefix") || globalPrefix;

    return message.reply({
      body: box([
        `👋 Salut ${userName}, tu cherchais mon préfixe ?`,
        `╭‣ 🌐 Global : ${globalPrefix}`,
        `╰‣ 💬 Ce chat : ${threadPrefix}`,
        "🤖 Je suis 🎀MINI BOT🎀🫴",
        `📂 Essaie "${threadPrefix}help" pour voir toutes les commandes.`
      ]),
      mentions: [{ id: event.senderID, tag: userName }]
    });
  }
};
