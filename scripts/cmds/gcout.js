const axios = require("axios");

module.exports = {
  config: {
    name: "gcout",
    version: "1.1.0",
    author: "Camille Uchiha",
    countDown: 5,
    role: 2,
    description: {
      en: "Affiche la liste des groupes, envoie un message et quitte le groupe choisi."
    },
    category: "admin",
    guide: {
      en: "{pn}"
    }
  },

  onStart: async function ({ message, api, event }) {
    try {
      const threads = await api.getThreadList(50, null, ["INBOX"]);
      const groupList = threads.filter(thread => thread.isGroup && thread.threadID !== event.threadID);

      if (groupList.length === 0) {
        return message.reply("❌ | Désolé, je n'ai trouvé aucun autre groupe dans ma liste.");
      }

      let responseMsg = "╔════════════════════╗\n";
      responseMsg += "   🌟 LISTE DES GROUPES 🌟\n";
      responseMsg += "╚════════════════════╝\n\n";

      groupList.forEach((group, index) => {
        const num = (index + 1).toString().padStart(2, '0');
        responseMsg += `╭─── [ ${num} ] ───╼\n`;
        responseMsg += `│ 🏷️ Nom : ${group.name || "Sans nom"}\n`;
        responseMsg += `│ 🆔 ID : ${group.threadID}\n`;
        responseMsg += `╰──────────────╼\n\n`;
      });

      responseMsg += "━━━━━━━━━━━━━━━━━━━━\n";
      responseMsg += "👉 Répondez avec le [Numéro] pour que je quitte ce groupe.";

      return message.reply(responseMsg, (err, info) => {
        if (err) return console.error(err);
        global.GoatBot.onReply.set(info.messageID, {
          commandName: this.config.name,
          messageID: info.messageID,
          author: event.senderID,
          groupList
        });
      });
    } catch (error) {
      return message.reply("⚠️ Une erreur est survenue : " + error.message);
    }
  },

  onReply: async function ({ message, event, Reply, api }) {
    const { author, groupList } = Reply;
    if (event.senderID !== author) return;

    const input = parseInt(event.body);
    if (isNaN(input) || input <= 0 || input > groupList.length) {
      return message.reply("🚫 | Choix invalide. Veuillez entrer un numéro de la liste.");
    }

    const selectedGroup = groupList[input - 1];
    const targetID = selectedGroup.threadID;
    const groupName = selectedGroup.name || targetID;

    try {
      // 1. Message d'adieu
      await api.sendMessage("📢 [NOTIFICATION SYSTÈME]\n━━━━━━━━━━━━━━━━━━━━\nLe bot va quitter ce groupe sur ordre de mon administrateur.\nAu revoir ! 👋", targetID);

      // 2. Quitter le groupe
      await api.removeUserFromGroup(api.getCurrentUserID(), targetID);

      // 3. Confirmation stylée
      let successMsg = "✅ ACTION TERMINÉE ✅\n";
      successMsg += "━━━━━━━━━━━━━━━━━━━━\n";
      successMsg += `📦 Groupe : ${groupName}\n`;
      successMsg += `📡 État : Adieu envoyé & Groupe quitté.\n`;
      successMsg += "━━━━━━━━━━━━━━━━━━━━";

      return message.reply(successMsg);
    } catch (error) {
      return message.reply(`❌ Erreur lors de l'exécution sur le groupe "${groupName}" : ` + error.message);
    }
  }
};
