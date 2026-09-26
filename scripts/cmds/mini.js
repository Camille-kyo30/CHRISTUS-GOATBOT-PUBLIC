const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");

module.exports.config = {
  name: "mini",
  version: "1.8",
  hasPermssion: 0,
  credits: "Camille Uchiha 🍓",
  description: "Chat with Mini Bot (AI) — text, voice and image analysis",
  commandCategory: "AI",
  usages: "[message] | vocal [message] | (reply on a photo)",
  cooldowns: 3,
  usePrefix: false,
};

module.exports.langs = {
  en: {
    noMessage: "🎀 Write a message after the command!\nExample: mini Hi, how are you?",
    error: "⚠️ An error occurred with Mini Bot:\n%1",
    quotaError: "⏳ Too many requests right now, try again in a moment.",
    quotaReached: "🚫 Daily quota reached (%1/%2). Try again tomorrow!",
  },
};

const conversationHistory = new Map();
const quotaTracker = new Map();
const nameCache = new Map();

const MINI_BOT_API_URL = process.env.MINI_BOT_API_URL || "https://mini-api-r6rw.onrender.com";
const MINI_BOT_API_KEY = process.env.MINI_BOT_API_KEY || "";
const DAILY_QUOTA_LIMIT = Number(process.env.DAILY_QUOTA_LIMIT || 200);

/** Converts normal text to Unicode bold (Mathematical Sans-Serif Bold) */
function toBoldUnicode(str) {
  return String(str ?? "").replace(/[A-Za-z0-9]/g, (ch) => {
    const code = ch.codePointAt(0);
    if (code >= 65 && code <= 90) return String.fromCodePoint(0x1d5d4 + (code - 65)); // A-Z
    if (code >= 97 && code <= 122) return String.fromCodePoint(0x1d5ee + (code - 97)); // a-z
    if (code >= 48 && code <= 57) return String.fromCodePoint(0x1d7ec + (code - 48)); // 0-9
    return ch;
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getQuota(uid) {
  const today = todayStr();
  const entry = quotaTracker.get(uid);
  if (!entry || entry.date !== today) {
    const fresh = { count: 0, date: today };
    quotaTracker.set(uid, fresh);
    return fresh;
  }
  return entry;
}

function checkQuota(uid) {
  const quota = getQuota(uid);
  if (quota.count >= DAILY_QUOTA_LIMIT) return null;
  return quota;
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    ...(MINI_BOT_API_KEY ? { "x-api-key": MINI_BOT_API_KEY } : {}),
  };
}

/** Fetches (and caches) the user's first name so the AI can address them by name */
async function resolveName(api, uid) {
  if (nameCache.has(uid)) return nameCache.get(uid);
  try {
    const info = await api.getUserInfo(uid);
    const name = info?.[uid]?.name || "";
    nameCache.set(uid, name);
    return name;
  } catch {
    return "";
  }
}

/** Looks for a photo only on the direct message or the quoted (reply) message */
function findPhotoUrl(event, Reply) {
  const sources = [
    event?.attachments,
    event?.messageReply?.attachments,
    Reply?.attachments,
    Reply?.messageReply?.attachments,
  ];

  for (const list of sources) {
    if (Array.isArray(list)) {
      const photo = list.find((a) => a?.type === "photo");
      if (photo?.url) return photo.url;
    }
  }

  return null;
}

async function askMini({ api, event, getLang }, uid) {
  const { threadID, messageID } = event;
  const message = event.__miniMessage;

  if (!message) {
    return api.sendMessage(getLang("noMessage"), threadID, messageID);
  }

  const quota = checkQuota(uid);
  if (!quota) {
    const q = getQuota(uid);
    return api.sendMessage(getLang("quotaReached", q.count, DAILY_QUOTA_LIMIT), threadID, messageID);
  }

  api.sendTypingIndicator(threadID);
  const name = await resolveName(api, uid);

  const history = conversationHistory.get(uid) || [];

  try {
    const res = await axios.post(
      `${MINI_BOT_API_URL}/api/v1/chat`,
      { message, history, uid, name },
      { headers: authHeaders(), timeout: 30000 }
    );

    const raw = res.data?.raw || "";
    if (!raw) {
      return api.sendMessage(getLang("error", "Empty response received."), threadID, messageID);
    }

    quota.count += 1;
    quotaTracker.set(uid, quota);

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: raw });
    conversationHistory.set(uid, history.slice(-20));

    const styledText = toBoldUnicode(raw);

    const sent = await api.sendMessage(
      `🎀 Mini Bot 🎀\n━━━━━━━━━\n\n${styledText}\n\n📊 Quota: ${quota.count}/${DAILY_QUOTA_LIMIT}`,
      threadID,
      messageID
    );

    global.GoatBot.onReply.set(sent.messageID, { commandName: "mini", author: event.senderID });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 429) return api.sendMessage(getLang("quotaError"), threadID, messageID);
    const errMsg = err?.response?.data?.error || err.message || "Unknown error";
    return api.sendMessage(getLang("error", errMsg), threadID, messageID);
  }
}

async function askMiniVoice({ api, event, getLang }, uid) {
  const { threadID, messageID } = event;
  const message = event.__miniMessage;

  if (!message) {
    return api.sendMessage(getLang("noMessage"), threadID, messageID);
  }

  const quota = checkQuota(uid);
  if (!quota) {
    const q = getQuota(uid);
    return api.sendMessage(getLang("quotaReached", q.count, DAILY_QUOTA_LIMIT), threadID, messageID);
  }

  api.sendTypingIndicator(threadID);
  const name = await resolveName(api, uid);

  const history = conversationHistory.get(uid) || [];
  let filePath;

  try {
    const res = await axios.post(
      `${MINI_BOT_API_URL}/api/v1/chat/voice`,
      { message, history, uid, name },
      { headers: authHeaders(), timeout: 45000 }
    );

    const raw = res.data?.raw || "";
    const audioBase64 = res.data?.audio || "";

    if (!raw || !audioBase64) {
      return api.sendMessage(getLang("error", "Empty voice response received."), threadID, messageID);
    }

    quota.count += 1;
    quotaTracker.set(uid, quota);

    history.push({ role: "user", content: message });
    history.push({ role: "assistant", content: raw });
    conversationHistory.set(uid, history.slice(-20));

    filePath = path.join(os.tmpdir(), `mini_${uid}_${Date.now()}.mp3`);
    fs.writeFileSync(filePath, Buffer.from(audioBase64, "base64"));

    const styledText = toBoldUnicode(raw);

    const sent = await api.sendMessage(
      {
        body: `🎀 Mini Bot 🎀\n━━━━━━━━━\n\n${styledText}\n\n📊 Quota: ${quota.count}/${DAILY_QUOTA_LIMIT}`,
        attachment: fs.createReadStream(filePath),
      },
      threadID,
      messageID
    );

    global.GoatBot.onReply.set(sent.messageID, { commandName: "mini", author: event.senderID });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 429) return api.sendMessage(getLang("quotaError"), threadID, messageID);
    const errMsg = err?.response?.data?.error || err.message || "Unknown error";
    return api.sendMessage(getLang("error", errMsg), threadID, messageID);
  } finally {
    if (filePath) fs.unlink(filePath, () => {});
  }
}

async function askMiniImage({ api, event, getLang }, uid) {
  const { threadID, messageID } = event;
  const message = event.__miniMessage;
  const imageUrl = event.__miniImageUrl;

  const quota = checkQuota(uid);
  if (!quota) {
    const q = getQuota(uid);
    return api.sendMessage(getLang("quotaReached", q.count, DAILY_QUOTA_LIMIT), threadID, messageID);
  }

  api.sendTypingIndicator(threadID);
  const name = await resolveName(api, uid);

  try {
    const res = await axios.post(
      `${MINI_BOT_API_URL}/api/v1/chat/image`,
      { message, imageUrl, uid, name },
      { headers: authHeaders(), timeout: 30000 }
    );

    const raw = res.data?.raw || "";
    if (!raw) {
      return api.sendMessage(getLang("error", "Empty response received."), threadID, messageID);
    }

    quota.count += 1;
    quotaTracker.set(uid, quota);

    const styledText = toBoldUnicode(raw);

    const sent = await api.sendMessage(
      `🎀 Mini Bot 🎀\n━━━━━━━━━\n\n${styledText}\n\n📊 Quota: ${quota.count}/${DAILY_QUOTA_LIMIT}`,
      threadID,
      messageID
    );

    global.GoatBot.onReply.set(sent.messageID, { commandName: "mini", author: event.senderID });
  } catch (err) {
    const status = err?.response?.status;
    if (status === 429) return api.sendMessage(getLang("quotaError"), threadID, messageID);
    const errMsg = err?.response?.data?.error || err.message || "Unknown error";
    return api.sendMessage(getLang("error", errMsg), threadID, messageID);
  }
}

module.exports.onStart = async function ({ api, event, args, getLang }) {
  const uid = event.senderID;
  const photoUrl = findPhotoUrl(event, null);

  if (photoUrl) {
    event.__miniMessage = args.join(" ").trim() || "Describe this image in detail.";
    event.__miniImageUrl = photoUrl;
    return askMiniImage({ api, event, getLang }, uid);
  }

  const first = (args[0] || "").toLowerCase();
  if (first === "vocal") {
    event.__miniMessage = args.slice(1).join(" ").trim();
    return askMiniVoice({ api, event, getLang }, uid);
  }

  event.__miniMessage = args.join(" ").trim();
  return askMini({ api, event, getLang }, uid);
};

module.exports.onReply = async function ({ api, event, Reply, getLang }) {
  if (Reply.author && Reply.author !== event.senderID) return;

  const uid = event.senderID;
  const photoUrl = findPhotoUrl(event, Reply);

  if (photoUrl) {
    event.__miniMessage = event.body?.trim() || "Describe this image in detail.";
    event.__miniImageUrl = photoUrl;
    return askMiniImage({ api, event, getLang }, uid);
  }

  const voiceMatch = event.body?.trim().match(/^vocal\s+(.+)/i);
  if (voiceMatch) {
    event.__miniMessage = voiceMatch[1].trim();
    return askMiniVoice({ api, event, getLang }, uid);
  }

  event.__miniMessage = event.body?.trim();
  return askMini({ api, event, getLang }, uid);
};

/** Only triggers if the message starts with "mini" — no automatic analysis of every photo */
module.exports.onChat = async function ({ api, event, getLang }) {
  const body = event.body?.trim() || "";
  const uid = event.senderID;

  if (!body) return;

  const miniMatch = body.match(/^mini(?:\s+(.*))?$/i);
  if (!miniMatch) return;

  const rest = (miniMatch[1] || "").trim();
  const photoUrl = findPhotoUrl(event, null);

  if (photoUrl) {
    event.__miniMessage = rest || "Describe this image in detail.";
    event.__miniImageUrl = photoUrl;
    return askMiniImage({ api, event, getLang }, uid);
  }

  const voiceMatch = rest.match(/^vocal\s+(.+)/i);
  if (voiceMatch) {
    event.__miniMessage = voiceMatch[1].trim();
    return askMiniVoice({ api, event, getLang }, uid);
  }

  if (!rest) return;

  event.__miniMessage = rest;
  return askMini({ api, event, getLang }, uid);
};
