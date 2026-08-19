Cmd install mini.js // GoatBot V2 — commande "minibot"
// Placer ce fichier dans : scripts/cmds/minibot.js de ton GoatBot
// API branchée sur ton service Render : https://mini-api-cflv.onrender.com

const API_URL = process.env.MINIBOT_API_URL || "https://mini-api-cflv.onrender.com";
const API_KEY = process.env.MINIBOT_API_KEY || "";

// UID Facebook du créateur
const CREATOR_UID = process.env.BOT_CREATOR_UID || "61577875842514";
const CREATOR_NAME = "Camille Uchiha";

// Style d'affichage
const HEADER = "🎀 Mini Bot 🎀";
const DIVIDER = "━━━━━━━━━";

function style(text) {
  return `${HEADER}\n${DIVIDER}\n\n${String(text ?? "").trim()}`;
}

// Mémoire conversationnelle par thread (en RAM)
const memory = new Map();
const MAX_TURNS = 10;

function getHistory(threadID) {
  return memory.get(threadID) || [];
}

function pushHistory(threadID, userMsg, botMsg) {
  const hist = getHistory(threadID);
  hist.push({ role: "user", content: userMsg }, { role: "assistant", content: botMsg });
  memory.set(threadID, hist.slice(-MAX_TURNS * 2));
}

async function askMiniBot(message, history, uid) {
  const res = await fetch(`${API_URL}/api/v1/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    },
    body: JSON.stringify({ message, history, uid }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erreur API");
  return data.raw || data.reply;
}

module.exports = {
  config: {
    name: "minibot",
    aliases: ["mini", "ai", "bot"],
    version: "1.1",
    author: CREATOR_NAME,
    countDown: 3,
    role: 0,
    shortDescription: { fr: "Discuter avec Mini Bot" },
    longDescription: { fr: `IA conversationnelle Mini Bot, créée par ${CREATOR_NAME}.` },
    category: "ai",
    guide: { fr: "{pn} <ton message>\n{pn} clear — effacer la mémoire" },
  },

  onStart: async function ({ message, args, event }) {
    const input = args.join(" ").trim();
    const isCreator = String(event.senderID) === CREATOR_UID;

    if (!input) {
      return message.reply(
        style(
          isCreator
            ? `Bonjour Boss ${CREATOR_NAME} 👑\nÉcris ton message : minibot Salut !`
            : "💬 Écris ton message : minibot Salut !",
        ),
      );
    }
    if (input.toLowerCase() === "clear") {
      memory.delete(event.threadID);
      return message.reply(style("🧹 Mémoire effacée."));
    }

    try {
      const reply = await askMiniBot(input, getHistory(event.threadID), event.senderID);
      pushHistory(event.threadID, input, reply);
      return message.reply(style(reply));
    } catch (e) {
      return message.reply(style(`❌ ${e.message}`));
    }
  },

  // Répond quand l'utilisateur répond au message du bot
  onReply: async function ({ message, event, Reply }) {
    if (event.senderID !== Reply.author) return;
    try {
      const reply = await askMiniBot(event.body, getHistory(event.threadID), event.senderID);
      pushHistory(event.threadID, event.body, reply);
      return message.reply(style(reply));
    } catch (e) {
      return message.reply(style(`❌ ${e.message}`));
    }
  },
};
