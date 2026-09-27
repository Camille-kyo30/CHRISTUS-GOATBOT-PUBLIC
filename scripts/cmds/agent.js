// scripts/cmds/agent.js
// Commande owner-only : agent conversationnel CAMILLE.
// L utilisateur discute librement (n importe quelle question), et CAMILLE
// utilise les outils GitHub via Octokit seulement quand une action reelle
// sur un depot est necessaire. La conversation continue via onReply, sans
// format de commande impose.

const axios = require("axios");
const { Octokit } = require("@octokit/rest");

const AGENT_ENDPOINT = "https://mini-api-r6rw.onrender.com/api/v1/agent";
const MAX_TOOL_CALLS_PER_TURN = 6;
const MAX_MESSAGES_STORED = 30;

const BANNER = [
  "🤖 GITHUB AGENT — CAMILLE",
  "",
  "Un agent intelligent concu pour simplifier la gestion et le developpement de projets GitHub. 🚀",
  "Parle-moi librement : question generale, exploration d un depot, correction de bug, creation de fichier...",
  "",
  "👑 Createur : Camille",
  "💻 Powered by Camille-Dev"
].join("\n");

// Conversations en memoire, par thread. Se reinitialise si le bot redemarre.
const sessions = new Map();

function getSession(threadID) {
  if (!sessions.has(threadID)) sessions.set(threadID, []);
  return sessions.get(threadID);
}

function pushTrimmed(threadID, entry) {
  const messages = getSession(threadID);
  messages.push(entry);
  if (messages.length > MAX_MESSAGES_STORED) messages.splice(0, messages.length - MAX_MESSAGES_STORED);
}

function getOctokit() {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

async function getShaIfExists(octokit, owner, repo, path) {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    return Array.isArray(data) ? null : data.sha;
  } catch (e) {
    return null;
  }
}

const TOOL_EXECUTORS = {
  async get_repo_info({ owner, repo }) {
    const octokit = getOctokit();
    const { data } = await octokit.repos.get({ owner, repo });
    return {
      description: data.description,
      language: data.language,
      default_branch: data.default_branch,
      stars: data.stargazers_count,
      updated_at: data.updated_at
    };
  },

  async list_directory({ owner, repo, path }) {
    const octokit = getOctokit();
    const { data } = await octokit.repos.getContent({ owner, repo, path: path || "" });
    if (!Array.isArray(data)) return { type: "file", name: data.name };
    return data.map((item) => ({ name: item.name, type: item.type, path: item.path }));
  },

  async get_file({ owner, repo, path }) {
    const octokit = getOctokit();
    const { data } = await octokit.repos.getContent({ owner, repo, path });
    if (Array.isArray(data)) throw new Error("Le chemin fourni est un dossier, pas un fichier");
    const content = Buffer.from(data.content, data.encoding).toString("utf8");
    return { path, content: content.slice(0, 6000), truncated: content.length > 6000 };
  },

  async search_code({ owner, repo, query }) {
    const octokit = getOctokit();
    const { data } = await octokit.search.code({ q: `${query} repo:${owner}/${repo}` });
    return { total: data.total_count, matches: data.items.slice(0, 10).map((i) => ({ path: i.path, url: i.html_url })) };
  },

  async create_file({ owner, repo, path, content, message }) {
    const octokit = getOctokit();
    const existingSha = await getShaIfExists(octokit, owner, repo, path);
    if (existingSha) throw new Error("Le fichier existe deja, utilise edit_file a la place");
    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path, message,
      content: Buffer.from(content, "utf8").toString("base64")
    });
    return { created: path };
  },

  async edit_file({ owner, repo, path, content, message }) {
    const octokit = getOctokit();
    const sha = await getShaIfExists(octokit, owner, repo, path);
    if (!sha) throw new Error("Fichier introuvable, utilise create_file a la place");
    await octokit.repos.createOrUpdateFileContents({
      owner, repo, path, message,
      content: Buffer.from(content, "utf8").toString("base64"),
      sha
    });
    return { edited: path };
  },

  async list_issues_prs({ owner, repo, state }) {
    const octokit = getOctokit();
    const { data } = await octokit.issues.listForRepo({ owner, repo, state: state || "open" });
    return data.slice(0, 15).map((i) => ({ number: i.number, title: i.title, is_pr: Boolean(i.pull_request), state: i.state }));
  },

  async create_issue({ owner, repo, title, body }) {
    const octokit = getOctokit();
    const { data } = await octokit.issues.create({ owner, repo, title, body });
    return { number: data.number, url: data.html_url };
  },

  async list_commits({ owner, repo, path, limit }) {
    const octokit = getOctokit();
    const { data } = await octokit.repos.listCommits({ owner, repo, path: path || undefined, per_page: limit || 10 });
    return data.map((c) => ({ sha: c.sha.slice(0, 7), message: c.commit.message, author: c.commit.author.name }));
  }
};

// Fait tourner un tour de conversation : envoie l historique a CAMILLE,
// execute les outils qu elle demande a la chaine, et renvoie a l utilisateur
// des qu un vrai message texte est produit.
async function runTurn(threadID, message, messageIDReceived) {
  for (let i = 0; i < MAX_TOOL_CALLS_PER_TURN; i++) {
    const { data: decision } = await axios.post(AGENT_ENDPOINT, { messages: getSession(threadID) });

    if (decision.type === "message") {
      pushTrimmed(threadID, { role: "assistant", content: decision.content });
      return message.reply(decision.content, messageIDReceived, (err, info) => {
        registerContinuation(threadID, info.messageID);
      });
    }

    // tool_call : execution reelle cote GoatBot, puis on redonne la main au modele
    pushTrimmed(threadID, {
      role: "assistant",
      content: null,
      tool_calls: [{ id: decision.callId, type: "function", function: { name: decision.action, arguments: JSON.stringify(decision.params || {}) } }]
    });

    const executor = TOOL_EXECUTORS[decision.action];
    let result;
    if (!executor) {
      result = { error: `Outil inconnu : ${decision.action}` };
    } else {
      try {
        result = await executor(decision.params || {});
      } catch (toolErr) {
        result = { error: toolErr.message };
      }
    }

    pushTrimmed(threadID, { role: "tool", tool_call_id: decision.callId, content: JSON.stringify(result) });
  }

  const fallback = "J ai enchaine plusieurs actions sans conclure clairement, tu peux reformuler ou preciser ta demande.";
  return message.reply(fallback, messageIDReceived, (err, info) => {
    registerContinuation(threadID, info.messageID);
  });
}

function registerContinuation(threadID, messageID) {
  global.GoatBot.onReply.set(messageID, {
    commandName: "agent",
    threadID,
    messageID
  });
}

module.exports = {
  config: {
    name: "agent",
    version: "3.0",
    author: "Camille Uchiha 🍓",
    role: 2,
    category: "owner",
    description: { fr: "Discute librement avec CAMILLE, l agent GitHub", en: "Chat freely with CAMILLE, the GitHub agent" },
    guide: { fr: "{prefix}agent <ta question ou demande, en langage libre>", en: "{prefix}agent <your question or request, in free-form language>" }
  },

  onStart: async function ({ args, message, event }) {
    const userText = args.join(" ").trim();
    const threadID = event.threadID;

    if (!sessions.has(threadID)) sessions.set(threadID, []);

    if (!userText) {
      return message.reply(BANNER, (err, info) => registerContinuation(threadID, info.messageID));
    }

    pushTrimmed(threadID, { role: "user", content: userText });

    try {
      await runTurn(threadID, message);
    } catch (err) {
      message.reply(`❌ Erreur CAMILLE : ${err.message}`);
    }
  },

  onReply: async function ({ event, message, Reply }) {
    const threadID = event.threadID;
    const userText = (event.body || "").trim();
    if (!userText) return;

    pushTrimmed(threadID, { role: "user", content: userText });

    try {
      await runTurn(threadID, message);
    } catch (err) {
      message.reply(`❌ Erreur CAMILLE : ${err.message}`);
    }
  }
};
