const axios = require("axios");
const { Octokit } = require("@octokit/rest");

module.exports.config = {
  name: "agent",
  version: "1.0",
  hasPermssion: 2,
  credits: "Camille Uchiha 🍓",
  description: "AI agent that manages your GitHub repos (issues, commits, files) in natural language",
  commandCategory: "Owner",
  usages: "[natural language instruction, specify the repo]",
  cooldowns: 5,
  usePrefix: false,
};

const MINI_BOT_API_URL = process.env.MINI_BOT_API_URL || "https://mini-api-r6rw.onrender.com";
const MINI_BOT_API_KEY = process.env.MINI_BOT_API_KEY || "";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "";
const MAX_STEPS = 6;

const MSG = {
  noMessage:
    "🍓 Please specify your request and the repo!\nExample: github in my repo Camille-kyo30/telegram-bot, list open issues",
  noToken: "⚠️ GITHUB_TOKEN is not set in the environment variables.",
};

const SYSTEM_PROMPT = `You are an AI agent able to manage GitHub repositories for your creator.
ALWAYS reply in strict JSON, with no text around it, using one of the following forms (only one action per reply):

{"action": "get_repo_info", "params": {"owner": "...", "repo": "..."}}
{"action": "list_issues_prs", "params": {"owner": "...", "repo": "...", "state": "open|closed|all", "per_page": 10}}
{"action": "create_issue", "params": {"owner": "...", "repo": "...", "title": "...", "body": "..."}}
{"action": "list_commits", "params": {"owner": "...", "repo": "...", "per_page": 10, "path": "optional"}}
{"action": "get_file", "params": {"owner": "...", "repo": "...", "path": "...", "branch": "optional"}}
{"action": "edit_file", "params": {"owner": "...", "repo": "...", "path": "...", "content": "FULL content of the file after modification", "commitMessage": "...", "branch": "optional"}}
{"action": "final", "message": "final answer, clear and concise, for the user"}

Strict rules:
- Only one action per reply, never more than one, never any text outside the JSON.
- Always use get_file before edit_file on an existing file, to know its current content before modifying it.
- The "content" field of edit_file must be the ENTIRE content of the file after modification, never a partial excerpt or a diff.
- If the owner/repo isn't clearly specified by the user, return a "final" action to ask for it rather than guessing.
- Never confirm an action as done before receiving its actual result.
- As soon as you have enough information to answer the request, return "final".`;

function authHeaders() {
  return {
    "Content-Type": "application/json",
    ...(MINI_BOT_API_KEY ? { "x-api-key": MINI_BOT_API_KEY } : {}),
  };
}

function cleanJSON(raw) {
  return raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "");
}

async function executeAction(octokit, action, params) {
  switch (action) {
    case "get_repo_info": {
      const { data } = await octokit.repos.get({ owner: params.owner, repo: params.repo });
      return {
        name: data.full_name,
        description: data.description,
        stars: data.stargazers_count,
        forks: data.forks_count,
        openIssues: data.open_issues_count,
        defaultBranch: data.default_branch,
        private: data.private,
      };
    }

    case "list_issues_prs": {
      const { data } = await octokit.issues.listForRepo({
        owner: params.owner,
        repo: params.repo,
        state: params.state || "open",
        per_page: params.per_page || 10,
      });
      return data.map((it) => ({
        number: it.number,
        title: it.title,
        isPR: Boolean(it.pull_request),
        state: it.state,
        url: it.html_url,
      }));
    }

    case "create_issue": {
      const { data } = await octokit.issues.create({
        owner: params.owner,
        repo: params.repo,
        title: params.title,
        body: params.body || "",
      });
      return { number: data.number, url: data.html_url };
    }

    case "list_commits": {
      const { data } = await octokit.repos.listCommits({
        owner: params.owner,
        repo: params.repo,
        per_page: params.per_page || 10,
        path: params.path,
      });
      return data.map((c) => ({
        sha: c.sha.slice(0, 7),
        message: c.commit.message.split("\n")[0],
        author: c.commit.author?.name,
        date: c.commit.author?.date,
      }));
    }

    case "get_file": {
      const { data } = await octokit.repos.getContent({
        owner: params.owner,
        repo: params.repo,
        path: params.path,
        ref: params.branch,
      });

      if (Array.isArray(data)) {
        return { type: "dir", entries: data.map((e) => e.name) };
      }

      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return { path: data.path, sha: data.sha, content: content.slice(0, 6000) };
    }

    case "edit_file": {
      let sha;
      try {
        const { data: existing } = await octokit.repos.getContent({
          owner: params.owner,
          repo: params.repo,
          path: params.path,
          ref: params.branch,
        });
        sha = Array.isArray(existing) ? undefined : existing.sha;
      } catch {
        sha = undefined; // file doesn't exist yet -> create it
      }

      const { data } = await octokit.repos.createOrUpdateFileContents({
        owner: params.owner,
        repo: params.repo,
        path: params.path,
        message: params.commitMessage || `Update ${params.path} via github.js`,
        content: Buffer.from(params.content ?? "", "utf-8").toString("base64"),
        branch: params.branch,
        sha,
      });
      return { commitSha: data.commit.sha.slice(0, 7), url: data.content.html_url };
    }

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

async function runAgent({ api, event }, userMessage) {
  const { threadID, messageID } = event;

  if (!GITHUB_TOKEN) {
    return api.sendMessage(MSG.noToken, threadID, messageID);
  }

  api.sendTypingIndicator(threadID);
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  const history = [];
  let message = userMessage;
  let steps = 0;

  try {
    while (steps < MAX_STEPS) {
      steps += 1;

      const res = await axios.post(
        `${MINI_BOT_API_URL}/api/v1/agent`,
        { systemPrompt: SYSTEM_PROMPT, message, history },
        { headers: authHeaders(), timeout: 30000 }
      );

      const raw = res.data?.raw || "";
      history.push({ role: "user", content: message });
      history.push({ role: "assistant", content: raw });

      let parsed;
      try {
        parsed = JSON.parse(cleanJSON(raw));
      } catch {
        return api.sendMessage(`🍓 GitHub Agent 🍓\n━━━━━━━━━\n\n${raw}`, threadID, messageID);
      }

      if (parsed.action === "final") {
        return api.sendMessage(
          `🍓 GitHub Agent 🍓\n━━━━━━━━━\n\n${parsed.message || "Done."}`,
          threadID,
          messageID
        );
      }

      try {
        const result = await executeAction(octokit, parsed.action, parsed.params || {});
        message = `Result of ${parsed.action}: ${JSON.stringify(result).slice(0, 4000)}`;
      } catch (actionErr) {
        message = `Error while running ${parsed.action}: ${actionErr.message}`;
      }
    }

    return api.sendMessage(
      "🍓 GitHub Agent 🍓\n━━━━━━━━━\n\n⚠️ Too many steps needed, stopping here to avoid an infinite loop.",
      threadID,
      messageID
    );
  } catch (err) {
    const errMsg = err?.response?.data?.error || err.message || "Unknown error";
    return api.sendMessage(`⚠️ An error occurred with GitHub Agent:\n${errMsg}`, threadID, messageID);
  }
}

module.exports.onStart = async function ({ api, event, args }) {
  const message = args.join(" ").trim();
  if (!message) {
    return api.sendMessage(MSG.noMessage, event.threadID, event.messageID);
  }
  return runAgent({ api, event }, message);
};
        
