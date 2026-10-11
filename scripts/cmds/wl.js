const { config } = global.GoatBot;

// Decor : Jujutsu Kaisen (version compacte)
const TOP = "╭━━ ⛩️ 呪術廻戦 ⛩️ ━━╮";
const MID = "┣━━━━━━━━━━━━━━┫";
const BOT = "╰━━━━━━ 🌀 ━━━━━━╯";

function box(text) {
	const lines = String(text).replace(/^\n+|\n+$/g, "").split("\n");
	return [
		TOP,
		"┃ 🟣 🛡️ WHITELIST",
		MID,
		...lines.map((l) => "┃ " + l),
		MID,
		"┃ 🎀 Éditeur : Camille Uchiha",
		BOT
	].join("\n");
}

module.exports = {
	config: {
		name: "wl",
		version: "1.1",
		author: "Christus x Aesther",
		editor: "Camille Uchiha",
		countDown: 5,
		role: 2,
		longDescription: {
			en: "Add, remove, edit whiteListIds",
			fr: "Ajoute, retire et modifie les whiteListIds"
		},
		category: "𝗔𝗗𝗠𝗜𝗡",
		guide: {
			en: '   {pn} [add | -a] <uid | @tag>: Add admin role for user'
				+ '\n   {pn} [remove | -r] <uid | @tag>: Remove admin role of user'
				+ '\n   {pn} [list | -l]: List all admins'
				+ '\n   {pn} [ on | off ]: enable and disable whiteList mode',
			fr: '   {pn} [add | -a] <uid | @tag> : ajoute un utilisateur à la whitelist'
				+ '\n   {pn} [remove | -r] <uid | @tag> : retire un utilisateur de la whitelist'
				+ '\n   {pn} [list | -l] : liste tous les utilisateurs de la whitelist'
				+ '\n   {pn} [on | off] : active ou désactive le mode whitelist'
		}
	},

	langs: {
		en: {
			added: "✅ | Added whiteList role for %1 users:\n%2",
			alreadyAdmin: "\n⚠ | %1 users already have whiteList role:\n%2",
			missingIdAdd: "⚠ | Please enter ID or tag user to add in whiteListIds",
			removed: "✅ | Removed whiteList role of %1 users:\n%2",
			notAdmin: "⚠ | %1 users don't have whiteListIds role:\n%2",
			missingIdRemove: "⚠ | Please enter ID or tag user to remove whiteListIds",
			listAdmin: "👑 | List of whiteListIds:\n%1",
			enable: "✅ Turned on",
			disable: "✅ Turned off"
		},
		fr: {
			added: "✅ | %1 utilisateur(s) ajouté(s) à la whitelist :\n%2",
			alreadyAdmin: "\n⚠ | %1 utilisateur(s) déjà dans la whitelist :\n%2",
			missingIdAdd: "⚠ | Entre l'ID ou tague l'utilisateur à ajouter à la whitelist",
			removed: "✅ | %1 utilisateur(s) retiré(s) de la whitelist :\n%2",
			notAdmin: "\n⚠ | %1 utilisateur(s) ne sont pas dans la whitelist :\n%2",
			missingIdRemove: "⚠ | Entre l'ID ou tague l'utilisateur à retirer de la whitelist",
			listAdmin: "👑 | Liste de la whitelist :\n%1",
			emptyList: "(la whitelist est vide)",
			enable: "✅ Mode whitelist activé",
			disable: "✅ Mode whitelist désactivé"
		}
	},

	onStart: async function ({ message, args, usersData, event, getLang, api }) {
		const { writeFileSync } = require("fs-extra");
		switch (args[0]) {
			case "add":
			case "-a": {
				if (args[1]) {
					let uids = [];
					if (Object.keys(event.mentions).length > 0)
						uids = Object.keys(event.mentions);
					else if (event.messageReply)
						uids.push(event.messageReply.senderID);
					else
						uids = args.filter(arg => !isNaN(arg));
					const notAdminIds = [];
					const adminIds = [];
					for (const uid of uids) {
						if (config.whiteListMode.whiteListIds.includes(uid))
							adminIds.push(uid);
						else
							notAdminIds.push(uid);
					}

					config.whiteListMode.whiteListIds.push(...notAdminIds);
					const getNames = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
					writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
					return message.reply(box(
						(notAdminIds.length > 0 ? getLang("added", notAdminIds.length, getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "")
						+ (adminIds.length > 0 ? getLang("alreadyAdmin", adminIds.length, adminIds.map(uid => `• ${uid}`).join("\n")) : "")
					));
				}
				else
					return message.reply(box(getLang("missingIdAdd")));
			}
			case "remove":
			case "-r": {
				if (args[1]) {
					let uids = [];
					if (Object.keys(event.mentions).length > 0)
						uids = Object.keys(event.mentions);
					else if (event.messageReply)
						uids.push(event.messageReply.senderID);
					else
						uids = args.filter(arg => !isNaN(arg));
					const notAdminIds = [];
					const adminIds = [];
					for (const uid of uids) {
						if (config.whiteListMode.whiteListIds.includes(uid))
							adminIds.push(uid);
						else
							notAdminIds.push(uid);
					}
					for (const uid of adminIds)
						config.whiteListMode.whiteListIds.splice(config.whiteListMode.whiteListIds.indexOf(uid), 1);
					const getNames = await Promise.all(adminIds.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
					writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
					return message.reply(box(
						(adminIds.length > 0 ? getLang("removed", adminIds.length, getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")) : "")
						+ (notAdminIds.length > 0 ? getLang("notAdmin", notAdminIds.length, notAdminIds.map(uid => `• ${uid}`).join("\n")) : "")
					));
				}
				else
					return message.reply(box(getLang("missingIdRemove")));
			}
			case "list":
			case "-l": {
				const getNames = await Promise.all(config.whiteListMode.whiteListIds.map(uid => usersData.getName(uid).then(name => ({ uid, name }))));
				const listText = getNames.length
					? getNames.map(({ uid, name }) => `• ${name} (${uid})`).join("\n")
					: getLang("emptyList");
				return message.reply(box(getLang("listAdmin", listText)));
			}
			case "on": {
				config.whiteListMode.enable = true;
				writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
				return message.reply(box(getLang("enable")));
			}
			case "off": {
				config.whiteListMode.enable = false;
				writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
				return message.reply(box(getLang("disable")));
			}
			default:
				return message.SyntaxError();
		}
		
	}
};
