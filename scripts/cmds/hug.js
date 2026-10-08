const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

// ⚙️ Image modèle
const TEMPLATE = "https://i.ibb.co/0VFwq4jM/51d590363cbb.jpg";

// ⚙️ Positions des visages en POURCENTAGE de l'image (0 à 1), donc indépendant de la taille.
// x, y = centre du visage | r = rayon (en fraction de la largeur)
// ⚠️ Valeurs provisoires : à ajuster selon l'image (voir README en bas de réponse)
const FACES = {
	sender: { x: 0.51, y: 0.28, r: 0.10 }, // le garçon (derrière) → celui qui fait le câlin
	target: { x: 0.25, y: 0.42, r: 0.085 } // la fille (devant) → celle qui le reçoit
};

module.exports = {
	config: {
		name: "hug",
		aliases: ["calin", "câlin"],
		version: "1.0",
		author: "Camille Uchiha 🍓",
		countDown: 10,
		role: 0,
		description: {
			fr: "Fais un câlin à quelqu'un avec une image personnalisée"
		},
		category: "fun",
		guide: {
			fr: "{pn} @mention | ou réponds au message de la personne"
		}
	},

	langs: {
		fr: {
			noTarget: "⚠️ Mentionne quelqu'un ou réponds à son message.",
			self: "🥺 Tu ne peux pas te faire un câlin à toi-même, laisse-moi t'en faire un !",
			text: "🤗 %1 a fait un gros câlin à %2 !",
			error: "❌ Erreur pendant la création de l'image."
		}
	},

	onStart: async function ({ event, message, usersData, getLang }) {
		const senderID = event.senderID;
		let targetID = Object.keys(event.mentions || {})[0];

		if (!targetID && event.messageReply)
			targetID = event.messageReply.senderID;

		if (!targetID)
			return message.reply(getLang("noTarget"));
		if (targetID === senderID)
			return message.reply(getLang("self"));

		const outPath = path.join(__dirname, "tmp", `hug_${senderID}_${targetID}_${Date.now()}.png`);

		try {
			await fs.ensureDir(path.dirname(outPath));

			const [senderName, targetName, senderAvatar, targetAvatar] = await Promise.all([
				usersData.getName(senderID),
				usersData.getName(targetID),
				usersData.getAvatarUrl(senderID),
				usersData.getAvatarUrl(targetID)
			]);

			const [bg, imgSender, imgTarget] = await Promise.all([
				loadImage(TEMPLATE),
				loadImage(senderAvatar),
				loadImage(targetAvatar)
			]);

			const W = bg.width;
			const H = bg.height;
			const canvas = createCanvas(W, H);
			const ctx = canvas.getContext("2d");
			ctx.drawImage(bg, 0, 0, W, H);

			const drawCircle = (img, face) => {
				const x = face.x * W;
				const y = face.y * H;
				const r = face.r * W;

				ctx.save();
				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.closePath();
				ctx.clip();
				ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
				ctx.restore();

				ctx.beginPath();
				ctx.arc(x, y, r, 0, Math.PI * 2);
				ctx.lineWidth = Math.max(2, W * 0.006);
				ctx.strokeStyle = "#ffffff";
				ctx.stroke();
			};

			drawCircle(imgSender, FACES.sender);
			drawCircle(imgTarget, FACES.target);

			await fs.writeFile(outPath, canvas.toBuffer("image/png"));

			await message.reply({
				body: getLang("text", senderName, targetName),
				mentions: [
					{ tag: senderName, id: senderID },
					{ tag: targetName, id: targetID }
				],
				attachment: fs.createReadStream(outPath)
			});
		} catch (err) {
			console.error("[hug]", err);
			message.reply(getLang("error"));
		} finally {
			fs.remove(outPath).catch(() 
  => {});
		}
	}
};
