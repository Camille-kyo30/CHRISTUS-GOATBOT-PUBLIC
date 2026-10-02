const { getTime, drive } = global.utils;

const GOJO_GIF = "https://i.ibb.co/2Yfw6dpw/218f0e0a9849.gif";

module.exports = {
	config: {
		name: "leave",
		version: "1.5",
		author: "NTKhang",
		editor: "Camille Uchiha",
		category: "events"
	},

	langs: {
		vi: {
			session1: "sáng",
			session2: "trưa",
			session3: "chiều",
			session4: "tối",
			leaveType1: "tự rời",
			leaveType2: "bị kick",
			defaultLeaveMessage: "{userName} đã {type} khỏi nhóm"
		},
		en: {
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			leaveType1: "left",
			leaveType2: "was kicked from",
			defaultLeaveMessage: "{userName} {type} the group"
		},
		fr: {
			session1: "matin",
			session2: "midi",
			session3: "après-midi",
			session4: "soir",
			leaveType1: "quitté le groupe",
			leaveType2: "été expulsé du groupe",
			defaultLeaveMessage: [
				"✦━━━━━━━━━━━━━━━━━━✦",
				"🕶️ 𝗚𝗢𝗝𝗢 𝗦𝗔𝗧𝗢𝗥𝗨 🤍",
				"✦━━━━━━━━━━━━━━━━━━✦",
				"",
				"👋 {userName} a {type}",
				"",
				"🌌 Même l infini ne retient personne...",
				"« Pas de panique, je suis le plus fort. »",
				"",
				"✦━━━━━━━━━━━━━━━━━━✦",
				"🤞 Expansion de Domaine : Adieu 🤞",
				"✦━━━━━━━━━━━━━━━━━━✦"
			].join("\n")
		}
	},

	onStart: async ({ threadsData, message, event, api, usersData, getLang }) => {
		if (event.logMessageType == "log:unsubscribe")
			return async function () {
				const { threadID } = event;
				const threadData = await threadsData.get(threadID);
				if (!threadData.settings.sendLeaveMessage)
					return;
				const { leftParticipantFbId } = event.logMessageData;
				if (leftParticipantFbId == api.getCurrentUserID())
					return;
				const hours = getTime("HH");

				const threadName = threadData.threadName;
				const userName = await usersData.getName(leftParticipantFbId);

				// {userName}   : name of the user who left the group
				// {type}       : type of the message (leave)
				// {boxName}    : name of the box
				// {threadName} : name of the box
				// {time}       : time
				// {session}    : session

				let { leaveMessage = getLang("defaultLeaveMessage") } = threadData.data;
				const form = {
					mentions: leaveMessage.match(/\{userNameTag\}/g) ? [{
						tag: userName,
						id: leftParticipantFbId
					}] : null
				};

				leaveMessage = leaveMessage
					.replace(/\{userName\}|\{userNameTag\}/g, userName)
					.replace(/\{type\}/g, leftParticipantFbId == event.author ? getLang("leaveType1") : getLang("leaveType2"))
					.replace(/\{threadName\}|\{boxName\}/g, threadName)
					.replace(/\{time\}/g, hours)
					.replace(/\{session\}/g, hours <= 10 ?
						getLang("session1") :
						hours <= 12 ?
							getLang("session2") :
							hours <= 18 ?
								getLang("session3") :
								getLang("session4")
					);

				form.body = leaveMessage;

				if (leaveMessage.includes("{userNameTag}")) {
					form.mentions = [{
						id: leftParticipantFbId,
						tag: userName
					}];
				}

				if (threadData.data.leaveAttachment) {
					const files = threadData.data.leaveAttachment;
					const attachments = files.reduce((acc, file) => {
						acc.push(drive.getFile(file, "stream"));
						return acc;
					}, []);
					form.attachment = (await Promise.allSettled(attachments))
						.filter(({ status }) => status == "fulfilled")
						.map(({ value }) => value);
				}
				else {
					try {
						form.attachment = await global.utils.getStreamFromURL(GOJO_GIF);
					}
					catch (err) {
						console.log("leave: GIF Gojo indisponible", err.message);
					}
				}
				message.send(form);

													 };
	}
};
