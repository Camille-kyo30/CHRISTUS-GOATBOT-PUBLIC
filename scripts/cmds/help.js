const { getPrefix } = global.utils;
const { commands, aliases } = global.GoatBot;

let fonts;
try {
  fonts = require('../../func/font.js');
} catch (error) {
  fonts = { bold: (t) => t, sansSerif: (t) => t, monospace: (t) => t, fancy: (t) => t };
}

// Decor : Jujutsu Kaisen
const TOP = "╭━━━━━━━━━ ⛩️ ━━━━━━━━━╮";
const MID = "┣━━━━━━━━━━━━━━━━━━━━━┫";
const BOT = "╰━━━━━━━━━ 🌀 ━━━━━━━━━╯";
const QUOTE = "« L énergie maudite ne ment jamais. »";

function header(title) {
  return [
    "✧･ﾟ: *✧･ﾟ:* 呪術廻戦 *:･ﾟ✧*:･ﾟ✧",
    TOP,
    "┃  🟣 " + fonts.bold("JUJUTSU KAISEN ━ MENU") + " 🔵",
    MID,
    "┃  " + fonts.bold(title),
    "┃  🌀 " + QUOTE,
    BOT,
    ""
  ].join("\n") + "\n";
}

function footer() {
  return [
    "",
    TOP,
    "┃  ✨ " + fonts.bold("Expansion de Domaine : Menu") + " ✨",
    "┃  🎀 " + fonts.bold("Éditeur : Camille Uchiha"),
    BOT,
    "✧･ﾟ: *✧･ﾟ:* 呪 *:･ﾟ✧*:･ﾟ✧"
  ].join("\n");
}

function toTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

module.exports = {
  config: {
    name: "help",
    aliases: [],
    version: "5.0.0",
    author: "Christus",
    editor: "Camille Uchiha",
    countDown: 5,
    role: 0,
    description: {
      fr: "🧰 Affiche la liste des commandes disponibles et leurs détails"
    },
    category: "info",
    guide: {
      fr: "{pn} : menu principal\n{pn} <commande> : infos sur une commande\n{pn} basics : commandes de base\n{pn} search <mot> : rechercher une commande"
    }
  },

  onStart: async function ({ message, args, event, role }) {
    const prefix = getPrefix(event.threadID);
    const arg = args[0]?.toLowerCase();

    const allCommands = [];
    const seen = new Set();

    for (const [name, cmd] of commands) {
      if (cmd.config.role > role) continue;
      if (!seen.has(name)) {
        seen.add(name);
        allCommands.push(cmd);
      }
    }

    allCommands.sort((a, b) => a.config.name.localeCompare(b.config.name));

    if (!arg) {
      const categorized = {};

      for (const cmd of allCommands) {
        const cat = cmd.config.category || "other";
        if (!categorized[cat]) categorized[cat] = [];
        categorized[cat].push(cmd.config.name);
      }

      const sortedCats = Object.keys(categorized).sort();

      let msg = header("🔍 Techniques disponibles (" + allCommands.length + ")");

      for (const cat of sortedCats) {
        msg += `╭─── 【 ${fonts.bold(toTitleCase(cat))} 】 ✦ ${categorized[cat].length}\n`;

        const cmds = categorized[cat].sort();

        for (let i = 0; i < cmds.length; i += 3) {
          const line = cmds
            .slice(i, i + 3)
            .map(c => `◈ ${fonts.sansSerif(c)}`)
            .join("  ");
          msg += `│ ${line}\n`;
        }

        msg += "╰──────────────────\n\n";
      }

      msg += `${fonts.bold("🔮 Détails d une technique :")} ${prefix}help <commande>\n`;
      msg += `${fonts.bold("🔮 Techniques de base :")} ${prefix}help basics\n`;
      msg += `${fonts.bold("🔮 Recherche :")} ${prefix}help search <mot>`;
      msg += footer();

      return message.reply(msg);
    }

    if (arg === "basics") {
      const basicCmdList = [
        "register", "items", "gift", "bal", "bank", "active", "streak",
        "vault", "bag", "rank", "ratings", "report", "trade", "uid",
        "pet", "rosashop", "garden", "arena", "mtls"
      ];

      const validCommands = [];

      for (const cmdName of basicCmdList) {
        const cmd = commands.get(cmdName);
        if (cmd && cmd.config.role <= role) {
          validCommands.push(cmd);
        }
      }

      if (validCommands.length === 0) {
        return message.reply(fonts.bold("❌ Aucune commande de base disponible pour ton rôle."));
      }

      let msg = header("✅ Techniques de base");
      msg += "╭─── 【 Essentiel 】\n";

      for (const cmd of validCommands) {
        const cfg = cmd.config;
        const desc = cfg.description?.fr || "Aucune description";
        msg += `│ ◈ ${prefix}${cfg.name} ${fonts.bold("➜")} ${desc}\n`;
      }

      msg += "╰──────────────────\n\n";
      msg += `${fonts.bold("🔮 Explore encore plus de techniques !")}\n`;
      msg += `${fonts.bold("🔮 Voir tout :")} ${prefix}help`;
      msg += footer();

      return message.reply(msg);
    }

    if (arg === "search" || arg === "find") {
      const searchStr = args[1];
      if (!searchStr) {
        return message.reply(
          `🔎 Recherche une commande en ajoutant un mot-clé.\n\n${fonts.bold("EXEMPLE :")} ${prefix}help search shop`
        );
      }

      const results = [];
      const searchLower = searchStr.toLowerCase();

      for (const [name, cmd] of commands) {
        if (cmd.config.role > role) continue;
        const cfg = cmd.config;
        const searchableText = `${cfg.name} ${cfg.category || ""} ${(cfg.aliases || []).join(" ")} ${cfg.description?.fr || ""}`.toLowerCase();
        if (searchableText.includes(searchLower)) {
          results.push(cmd);
        }
      }

      if (results.length === 0) {
        return message.reply(header("🔎 Résultats (0)") + "❓ Aucun résultat." + footer());
      }

      const topResults = results.slice(0, 5);
      let msg = header(`🔎 Résultats de recherche (${topResults.length})`);
      msg += "╭─── 【 Trouvé 】\n";

      for (const cmd of topResults) {
        const cfg = cmd.config;
        const aliasesList = cfg.aliases && cfg.aliases.length > 0 ? `  (alias : ${cfg.aliases.join(", ")})` : "";
        msg += `│ ◈ ${prefix}${fonts.bold(cfg.name)}${aliasesList}\n`;
        msg += `│    ${fonts.bold("➜")} ${cfg.description?.fr || "Aucune description"}\n`;
      }

      msg += "╰──────────────────\n";
      msg += footer();

      return message.reply(msg);
    }

    const cmdName = args[0];
    let cmd = commands.get(cmdName);
    if (!cmd) {
      const alias = aliases.get(cmdName);
      if (alias) cmd = commands.get(alias);
    }

    if (!cmd) {
      return message.reply(fonts.bold(`❌ La commande "${cmdName}" n existe pas`));
    }

    const cfg = cmd.config;

    let usage = cfg.guide?.fr || "Aucun guide disponible";
    usage = usage.replace(/{p}/g, prefix).replace(/{n}/g, cfg.name).replace(/{pn}/g, prefix + cfg.name);

    const roleText = cfg.role == 0 ? "Tous les utilisateurs" : cfg.role == 1 ? "Admins du groupe" : cfg.role == 2 ? "Admin du bot" : "Inconnu";

    const detail = `✧･ﾟ: *✧･ﾟ:* 呪術廻戦 *:･ﾟ✧*:･ﾟ✧
${TOP}
┃  🟣 ${fonts.bold("TECHNIQUE ━ " + toTitleCase(cfg.name))} 🔵
${MID}
┃ ◈ Nom : ${fonts.sansSerif(cfg.name)}
┃ ◈ Auteur : ${cfg.author || "Inconnu"}
┃ ◈ Éditeur : ${cfg.editor || "Camille Uchiha"}
┃ ◈ Description : ${cfg.description?.fr || "Aucune"}
┃ ◈ Utilisation : ${fonts.monospace(usage)}
┃ ◈ Catégorie : ${cfg.category || "other"}
┃ ◈ Délai : ${cfg.countDown || 1}s
┃ ◈ Rôle : ${roleText}
┃ ◈ Alias : ${cfg.aliases?.length ? cfg.aliases.join(", ") : "Aucun"}
${MID}
┃  🌀 ${QUOTE}
${BOT}`;

    return message.reply(detail);
  }
};
