module.exports = {
	// Tu peux personnaliser la langue ici ou directement dans les fichiers de commandes
	autoUpdateThreadInfo: {},
	checkwarn: {
		text: {
			warn: "Le membre %1 a déjà été averti 3 fois et a été banni du groupe\n- Nom : %1\n- Uid : %2\n- Pour le débannir, utilise la commande \"%3warn unban <uid>\" (avec uid l'uid de la personne que tu veux débannir)",
			needPermission: "Le bot a besoin des droits d'administrateur pour expulser les membres bannis"
		}
	},
	leave: {
		text: {
			session1: "matin",
			session2: "midi",
			session3: "après-midi",
			session4: "soir",
			leaveType1: "a quitté le groupe",
			leaveType2: "a été expulsé du groupe"
		}
	},
	logsbot: {
		text: {
			title: "====== Logs du bot ======",
			added: "\n✅\nÉvénement : le bot a été ajouté à un nouveau groupe\n- Ajouté par : %1",
			kicked: "\n❌\nÉvénement : le bot a été expulsé\n- Expulsé par : %1",
			footer: "\n- ID utilisateur : %1\n- Groupe : %2\n- ID du groupe : %3\n- Heure : %4"
		}
	},
	onEvent: {},
	welcome: {
		text: {
			session1: "matin",
			session2: "midi",
			session3: "après-midi",
			session4: "soir",
			welcomeMessage: "Merci de m'avoir invité dans le groupe !\nPréfixe du bot : %1\nPour voir la liste des commandes, tape : %1help",
			multiple1: "toi",
			multiple2: "vous"
		}
	}
};
