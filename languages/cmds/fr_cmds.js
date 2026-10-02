module.exports = {
	// Tu peux personnaliser la langue ici ou directement dans les fichiers de commandes
	onlyadminbox: {
		description: "active/désactive le mode où seuls les admins du groupe peuvent utiliser le bot",
		guide: "   {pn} [on | off]",
		text: {
			turnedOn: "Mode activé : seuls les admins du groupe peuvent utiliser le bot",
			turnedOff: "Mode désactivé : seuls les admins du groupe peuvent utiliser le bot",
			syntaxError: "Erreur de syntaxe, utilise seulement {pn} on ou {pn} off"
		}
	},
	adduser: {
		description: "Ajoute un utilisateur à ton groupe",
		guide: "   {pn} [lien du profil | uid]",
		text: {
			alreadyInGroup: "Déjà dans le groupe",
			successAdd: "- %1 membres ajoutés au groupe avec succès",
			failedAdd: "- Échec de l'ajout de %1 membres au groupe",
			approve: "- %1 membres ajoutés à la liste d'approbation",
			invalidLink: "Veuillez entrer un lien facebook valide",
			cannotGetUid: "Impossible de récupérer l'uid de cet utilisateur",
			linkNotExist: "L'url de ce profil n'existe pas",
			cannotAddUser: "Le bot est bloqué ou cet utilisateur interdit aux inconnus de l'ajouter à un groupe"
		}
	},
	admin: {
		description: "Ajoute, retire ou modifie le rôle d'admin",
		guide: "   {pn} [add | -a] <uid> : Ajoute le rôle d'admin à un utilisateur\n\t  {pn} [remove | -r] <uid> : Retire le rôle d'admin d'un utilisateur\n\t  {pn} [list | -l] : Liste tous les admins",
		text: {
			added: "✅ | Rôle d'admin ajouté pour %1 utilisateurs :\n%2",
			alreadyAdmin: "\n⚠️ | %1 utilisateurs ont déjà le rôle d'admin :\n%2",
			missingIdAdd: "⚠️ | Veuillez entrer l'ID ou taguer l'utilisateur pour lui ajouter le rôle d'admin",
			removed: "✅ | Rôle d'admin retiré pour %1 utilisateurs :\n%2",
			notAdmin: "⚠️ | %1 utilisateurs n'ont pas le rôle d'admin :\n%2",
			missingIdRemove: "⚠️ | Veuillez entrer l'ID ou taguer l'utilisateur pour lui retirer le rôle d'admin",
			listAdmin: "👑 | Liste des admins :\n%1"
		}
	},
	adminonly: {
		description: "active/désactive le mode où seuls les admins peuvent utiliser le bot",
		guide: "{pn} [on | off]",
		text: {
			turnedOn: "Mode activé : seuls les admins peuvent utiliser le bot",
			turnedOff: "Mode désactivé : seuls les admins peuvent utiliser le bot",
			syntaxError: "Erreur de syntaxe, utilise seulement {pn} on ou {pn} off"
		}
	},
	all: {
		description: "Tague tous les membres de ton groupe",
		guide: "{pn} [contenu | vide]"
	},
	anime: {
		description: "image d'anime aléatoire",
		guide: "{pn} <endpoint>\n   Liste des endpoints : neko, kitsune, hug, pat, waifu, cry, kiss, slap, smug, punch",
		text: {
			loading: "Préparation de l'image, veuillez patienter...",
			error: "Une erreur est survenue, réessaie plus tard"
		}
	},
	antichangeinfobox: {
		description: "Active/désactive l'anti-modification des infos du groupe",
		guide: "   {pn} avt [on | off] : empêche de changer l'avatar du groupe\n   {pn} name [on | off] : empêche de changer le nom du groupe\n   {pn} theme [on | off] : empêche de changer le thème du groupe\n   {pn} emoji [on | off] : empêche de changer l'emoji du groupe",
		text: {
			antiChangeAvatarOn: "Anti-changement d'avatar du groupe activé",
			antiChangeAvatarOff: "Anti-changement d'avatar du groupe désactivé",
			missingAvt: "Tu n'as pas défini d'avatar pour le groupe",
			antiChangeNameOn: "Anti-changement de nom du groupe activé",
			antiChangeNameOff: "Anti-changement de nom du groupe désactivé",
			antiChangeThemeOn: "Anti-changement de thème du groupe activé",
			antiChangeThemeOff: "Anti-changement de thème du groupe désactivé",
			antiChangeEmojiOn: "Anti-changement d'emoji du groupe activé",
			antiChangeEmojiOff: "Anti-changement d'emoji du groupe désactivé",
			antiChangeAvatarAlreadyOn: "Ton groupe a déjà l'anti-changement d'avatar activé",
			antiChangeNameAlreadyOn: "Ton groupe a déjà l'anti-changement de nom activé",
			antiChangeThemeAlreadyOn: "Ton groupe a déjà l'anti-changement de thème activé",
			antiChangeEmojiAlreadyOn: "Ton groupe a déjà l'anti-changement d'emoji activé"
		}
	},
	appstore: {
		description: "Recherche une application sur l'appstore",
		text: {
			missingKeyword: "Tu n'as entré aucun mot-clé",
			noResult: "Aucun résultat trouvé pour le mot-clé %1"
		}
	},
	autosetname: {
		description: "Change automatiquement le surnom des nouveaux membres",
		guide: "   {pn} set <surnom> : configure le changement automatique de surnom, avec quelques raccourcis :\n   + {userName} : nom du nouveau membre\n   + {userID} : id du membre\n   Exemple :\n    {pn} set {userName} 🚀\n\n   {pn} [on | off] : active/désactive cette fonctionnalité\n\n   {pn} [view | info] : affiche la configuration actuelle",
		text: {
			missingConfig: "Veuillez entrer la configuration requise",
			configSuccess: "La configuration a été enregistrée avec succès",
			currentConfig: "La configuration autoSetName actuelle de ton groupe est :\n%1",
			notSetConfig: "Ton groupe n'a pas configuré autoSetName",
			syntaxError: "Erreur de syntaxe, seuls \"{pn} on\" ou \"{pn} off\" peuvent être utilisés",
			turnOnSuccess: "La fonctionnalité autoSetName a été activée",
			turnOffSuccess: "La fonctionnalité autoSetName a été désactivée",
			error: "Une erreur est survenue lors de l'utilisation de autoSetName, essaie de désactiver le lien d'invitation du groupe puis réessaie plus tard"
		}
	},
	avatar: {
		description: "crée un avatar d'anime avec signature",
		guide: "{p}{n} <id ou nom du personnage> | <texte d'arrière-plan> | <signature> | <nom de couleur ou couleur hex de l'arrière-plan>\n{p}{n} help : voir comment utiliser cette commande",
		text: {
			initImage: "Préparation de l'image, veuillez patienter...",
			invalidCharacter: "Il n'y a actuellement que %1 personnages dans le système, veuillez entrer un id de personnage inférieur à",
			notFoundCharacter: "Aucun personnage nommé %1 n'a été trouvé dans la liste des personnages",
			errorGetCharacter: "Une erreur est survenue lors de la récupération des données du personnage :\n%1: %2",
			success: "✅ Ton avatar\nPersonnage : %1\nID : %2\nTexte d'arrière-plan : %3\nSignature : %4\nCouleur : %5",
			defaultColor: "par défaut",
			error: "Une erreur est survenue\n%1: %2"
		}
	},
	badwords: {
		description: "Active/désactive/ajoute/retire l'avertissement de mots interdits : si un membre enfreint, il est averti, la deuxième fois il est expulsé du groupe",
		guide: "   {pn} add <mots> : ajoute des mots interdits (tu peux en ajouter plusieurs séparés par des virgules \",\" ou des barres verticales \"|\")\n   {pn} delete <mots> : supprime des mots interdits (tu peux en supprimer plusieurs séparés par des virgules \",\" ou des barres verticales \"|\")\n   {pn} list <hide | laisser vide> : affiche la liste (ajoute \"hide\" pour masquer les mots interdits)\n   {pn} unwarn [<userID> | <@tag>] : retire 1 avertissement à 1 membre\n   {pn} on : active l'avertissement\n   {pn} off : désactive l'avertissement",
		text: {
			onText: "activé",
			offText: "désactivé",
			onlyAdmin: "⚠️ | Seuls les admins peuvent ajouter des mots interdits à la liste",
			missingWords: "⚠️ | Tu n'as pas entré les mots interdits",
			addedSuccess: "✅ | %1 mots interdits ajoutés à la liste",
			alreadyExist: "❌ | %1 mots interdits existent déjà dans la liste : %2",
			tooShort: "⚠️ | %1 mots interdits ne peuvent pas être ajoutés à la liste car ils font moins de 2 caractères : %2",
			onlyAdmin2: "⚠️ | Seuls les admins peuvent supprimer des mots interdits de la liste",
			missingWords2: "⚠️ | Tu n'as pas entré les mots à supprimer",
			deletedSuccess: "✅ | %1 mots interdits supprimés de la liste",
			notExist: "❌ | %1 mots interdits n'existent pas dans la liste : %2",
			emptyList: "⚠️ | La liste des mots interdits de ton groupe est actuellement vide",
			badWordsList: "📑 | La liste des mots interdits de ton groupe : %1",
			onlyAdmin3: "⚠️ | Seuls les admins peuvent modifier cette fonctionnalité (%1)",
			turnedOnOrOff: "✅ | L'avertissement des mots interdits est maintenant %1",
			onlyAdmin4: "⚠️ | Seuls les admins peuvent retirer un avertissement de mots interdits",
			missingTarget: "⚠️ | Tu n'as pas entré d'ID utilisateur ni tagué d'utilisateur",
			notWarned: "⚠️ | L'utilisateur %1 n'a pas été averti pour des mots interdits",
			removedWarn: "✅ | 1 avertissement de mots interdits retiré à l'utilisateur %1 | %2",
			warned: "⚠️ | Le mot interdit \"%1\" a été détecté dans ton message, si tu continues à enfreindre la règle tu seras expulsé du groupe.",
			warned2: "⚠️ | Le mot interdit \"%1\" a été détecté dans ton message, tu as enfreint la règle 2 fois et tu vas être expulsé du groupe.",
			needAdmin: "Le bot a besoin des droits d'admin pour expulser les membres qui enfreignent la règle",
			unwarned: "✅ | Avertissement de mots interdits retiré à l'utilisateur %1 | %2"
		}
	},
	balance: {
		description: "voir ton argent ou celui de la personne taguée",
		guide: "   {pn} : voir ton argent\n   {pn} <@tag> : voir l'argent de la personne taguée",
		text: {
			money: "Tu as %1$",
			moneyOf: "%1 a %2$"
		}
	},
	batslap: {
		description: "Image Batslap",
		text: {
			noTag: "Tu dois taguer la personne que tu veux gifler"
		}
	},
	busy: {
		description: "active le mode ne pas déranger, le bot préviendra quand tu es tagué",
		guide: "   {pn} [vide | <raison>] : active le mode ne pas déranger\n   {pn} off : désactive le mode ne pas déranger",
		text: {
			turnedOff: "✅ | Le mode ne pas déranger a été désactivé",
			turnedOn: "✅ | Le mode ne pas déranger a été activé",
			turnedOnWithReason: "✅ | Le mode ne pas déranger a été activé avec la raison : %1",
			alreadyOn: "L'utilisateur %1 est actuellement occupé",
			alreadyOnWithReason: "L'utilisateur %1 est actuellement occupé, raison : %2"
		}
	},
	callad: {
		description: "envoie un rapport, un retour, un bug,... à l'admin du bot",
		guide: "   {pn} <message>",
		text: {
			missingMessage: "Veuillez entrer le message que tu veux envoyer à l'admin",
			sendByGroup: "\n- Envoyé depuis le groupe : %1\n- ID du groupe : %2",
			sendByUser: "\n- Envoyé par un utilisateur",
			content: "\n\nContenu :\n─────────────────\n%1\n─────────────────\nRéponds à ce message pour écrire à l'utilisateur",
			success: "Ton message a été envoyé à l'admin avec succès !",
			reply: "📍 Réponse de l'admin %1 :\n─────────────────\n%2\n─────────────────\nRéponds à ce message pour continuer à écrire à l'admin",
			replySuccess: "Ta réponse a été envoyée à l'admin avec succès !",
			feedback: "📝 Retour de l'utilisateur %1 :\n- ID utilisateur : %2%3\n\nContenu :\n─────────────────\n%4\n─────────────────\nRéponds à ce message pour écrire à l'utilisateur",
			replyUserSuccess: "Ta réponse a été envoyée à l'utilisateur avec succès !"
		}
	},
	cmd: {
		description: "Gère tes fichiers de commandes",
		guide: "{pn} load <nom du fichier de commande>\n{pn} loadAll\n{pn} install <url> <nom du fichier de commande> : Télécharge et installe un fichier de commande depuis une url, l'url est le chemin du fichier (raw)",
		text: {
			missingFileName: "⚠️ | Veuillez entrer le nom de la commande que tu veux recharger",
			loaded: "✅ | Commande \"%1\" chargée avec succès",
			loadedError: "❌ | Échec du chargement de la commande \"%1\" avec l'erreur\n%2: %3",
			loadedSuccess: "✅ | Commande \"%1\" chargée avec succès",
			loadedFail: "❌ | Échec du chargement de la commande \"%1\"\n%2",
			missingCommandNameUnload: "⚠️ | Veuillez entrer le nom de la commande que tu veux décharger",
			unloaded: "✅ | Commande \"%1\" déchargée avec succès",
			unloadedError: "❌ | Échec du déchargement de la commande \"%1\" avec l'erreur\n%2: %3",
			missingUrlCodeOrFileName: "⚠️ | Veuillez entrer l'url ou le code et le nom du fichier de commande que tu veux installer",
			missingUrlOrCode: "⚠️ | Veuillez entrer l'url ou le code du fichier de commande que tu veux installer",
			missingFileNameInstall: "⚠️ | Veuillez entrer le nom du fichier pour enregistrer la commande (avec l'extension .js)",
			invalidUrlOrCode: "⚠️ | Impossible de récupérer le code de la commande",
			alreadExist: "⚠️ | Le fichier de commande existe déjà, es-tu sûr de vouloir écraser l'ancien fichier ?\nRéagis à ce message pour continuer",
			installed: "✅ | Commande \"%1\" installée avec succès, le fichier est enregistré dans %2",
			installedError: "❌ | Échec de l'installation de la commande \"%1\" avec l'erreur\n%2: %3",
			missingFile: "⚠️ | Fichier de commande \"%1\" introuvable",
			invalidFileName: "⚠️ | Nom de fichier de commande invalide",
			unloadedFile: "✅ | Commande \"%1\" déchargée"
		}
	},
	count: {
		description: "Voir le nombre de messages de tous les membres ou de toi-même (depuis l'arrivée du bot dans le groupe)",
		guide: "   {pn} : voir ton nombre de messages\n   {pn} @tag : voir le nombre de messages des personnes taguées\n   {pn} all : voir le nombre de messages de tous les membres",
		text: {
			count: "Nombre de messages des membres :",
			endMessage: "Ceux qui n'ont pas de nom dans la liste n'ont envoyé aucun message.",
			page: "Page [%1/%2]",
			reply: "Réponds à ce message avec le numéro de page pour en voir plus",
			result: "%1 est classé %2 avec %3 messages",
			yourResult: "Tu es classé %1 et tu as envoyé %2 messages dans ce groupe",
			invalidPage: "Numéro de page invalide"
		}
	},
	customrankcard: {
		description: "Crée ta propre carte de rang",
		guide: {
			body: "   {pn} [maincolor | subcolor | linecolor | progresscolor | alphasubcolor | textcolor | namecolor | expcolor | rankcolor | levelcolor | reset] <valeur>"
				+ "\n   Où : "
				+ "\n  + maincolor | background <valeur> : arrière-plan principal de la carte de rang"
				+ "\n  + subcolor <valeur> : arrière-plan secondaire"
				+ "\n  + linecolor <valeur> : couleur de la ligne entre l'arrière-plan principal et secondaire"
				+ "\n  + expbarcolor <valeur> : couleur de la barre d'exp"
				+ "\n  + progresscolor <valeur> : couleur de la barre d'exp actuelle"
				+ "\n  + alphasubcolor <valeur> : opacité de l'arrière-plan secondaire (de 0 -> 1)"
				+ "\n  + textcolor <valeur> : couleur du texte (couleur hex ou rgba)"
				+ "\n  + namecolor <valeur> : couleur du nom"
				+ "\n  + expcolor <valeur> : couleur de l'exp"
				+ "\n  + rankcolor <valeur> : couleur du rang"
				+ "\n  + levelcolor <valeur> : couleur du niveau"
				+ "\n    • <valeur> peut être une couleur hex, rgb, rgba, un dégradé (chaque couleur est séparée par un espace) ou une url d'image"
				+ "\n    • Si tu veux utiliser un dégradé, entre plusieurs couleurs séparées par un espace"
				+ "\n   {pn} reset : remet tout par défaut"
				+ "\n   Exemple :"
				+ "\n    {pn} maincolor #fff000"
				+ "\n    {pn} subcolor rgba(255,136,86,0.4)"
				+ "\n    {pn} reset",
			attachment: {
				[`${process.cwd()}/scripts/cmds/assets/guide/customrankcard_1.jpg`]: "https://i.ibb.co/BZ2Qgs1/image.png",
				[`${process.cwd()}/scripts/cmds/assets/guide/customrankcard_2.png`]: "https://i.ibb.co/wy1ZHHL/image.png"
			}
		},
		text: {
			invalidImage: "Url d'image invalide, choisis une url menant à une image (jpg, jpeg, png, gif), tu peux téléverser l'image sur https://imgbb.com/ et choisir \"obtenir le lien direct\" pour récupérer l'url",
			invalidAttachment: "Pièce jointe invalide, choisis un fichier image",
			invalidColor: "Code couleur invalide, choisis un code couleur hex (6 chiffres) ou rgba",
			notSupportImage: "L'url d'image n'est pas prise en charge avec l'option \"%1\"",
			success: "Tes modifications ont été enregistrées, voici un aperçu",
			reseted: "Tous les paramètres ont été remis par défaut",
			invalidAlpha: "Veuillez choisir un nombre de 0 -> 1"
		}
	},
	dhbc: {
		description: "joue au jeu « attrape le mot »",
		guide: "{pn}",
		text: {
			reply: "Réponds à ce message avec la réponse\n%1",
			isSong: "C'est le nom d'une chanson du chanteur %1",
			notPlayer: "⚠️ Tu n'es pas le joueur de cette question",
			correct: "🎉 Félicitations, tu as répondu correctement et tu as reçu %1$",
			wrong: "⚠️ Tu as répondu de façon incorrecte"
		}
	},
	emojimix: {
		description: "Mélange 2 emojis ensemble",
		guide: "   {pn} <emoji1> <emoji2>\n   Exemple :  {pn} 🤣 🥰"
	},
	eval: {
		description: "Teste du code rapidement",
		guide: "{pn} <code à tester>",
		text: {
			error: "❌ Une erreur est survenue :"
		}
	},
	event: {
		description: "Gère tes fichiers de commandes d'événements",
		guide: "{pn} load <nom du fichier de commande>\n{pn} loadAll\n{pn} install <url> <nom du fichier de commande> : Télécharge et charge une commande d'événement, l'url est le chemin du fichier de commande (raw)",
		text: {
			missingFileName: "⚠️ | Veuillez entrer le nom de la commande que tu veux recharger",
			loaded: "✅ | Commande d'événement \"%1\" chargée avec succès",
			loadedError: "❌ | Échec du chargement de la commande d'événement \"%1\" avec l'erreur\n%2: %3",
			loadedSuccess: "✅ | Commande d'événement \"%1\" chargée avec succès",
			loadedFail: "❌ | Échec du chargement de la commande d'événement \"%1\"\n%2",
			missingCommandNameUnload: "⚠️ | Veuillez entrer le nom de la commande que tu veux décharger",
			unloaded: "✅ | Commande d'événement \"%1\" déchargée avec succès",
			unloadedError: "❌ | Échec du déchargement de la commande d'événement \"%1\" avec l'erreur\n%2: %3",
			missingUrlCodeOrFileName: "⚠️ | Veuillez entrer l'url ou le code et le nom du fichier de commande que tu veux installer",
			missingUrlOrCode: "⚠️ | Veuillez entrer l'url ou le code du fichier de commande que tu veux installer",
			missingFileNameInstall: "⚠️ | Veuillez entrer le nom du fichier pour enregistrer la commande (avec l'extension .js)",
			invalidUrlOrCode: "⚠️ | Impossible de récupérer le code de la commande",
			alreadExist: "⚠️ | Le fichier de commande existe déjà, es-tu sûr de vouloir écraser l'ancien fichier ?\nRéagis à ce message pour continuer",
			installed: "✅ | Commande d'événement \"%1\" installée avec succès, le fichier est enregistré dans %2",
			installedError: "❌ | Échec de l'installation de la commande d'événement \"%1\" avec l'erreur\n%2: %3",
			missingFile: "⚠️ | Fichier \"%1\" introuvable",
			invalidFileName: "⚠️ | Nom de fichier invalide",
			unloadedFile: "✅ | Commande \"%1\" déchargée"
		}
	},
	filteruser: {
		description: "filtre les membres du groupe par nombre de messages ou comptes verrouillés",
		guide: "   {pn} [<nombre de messages> | die]",
		text: {
			needAdmin: "⚠️ | Veuillez ajouter le bot comme admin du groupe pour utiliser cette commande",
			confirm: "⚠️ | Es-tu sûr de vouloir supprimer les membres du groupe ayant moins de %1 messages ?\nRéagis à ce message pour confirmer",
			kickByBlock: "✅ | %1 membres ayant un compte verrouillé ont été supprimés avec succès",
			kickByMsg: "✅ | %1 membres ayant moins de %2 messages ont été supprimés avec succès",
			kickError: "❌ | Une erreur est survenue, impossible d'expulser %1 membres :\n%2",
			noBlock: "✅ | Il n'y a aucun membre avec un compte verrouillé",
			noMsg: "✅ | Il n'y a aucun membre avec moins de %1 messages"
		}
	},
	getfbstate: {
		description: "Récupère le fbstate actuel",
		guide: "{pn}",
		text: {
			success: "Le fbstate t'a été envoyé, vérifie les messages privés du bot"
		}
	},
	grouptag: {
		description: "Tague les membres par groupe",
		guide: "   {pn} add <nomDuGroupeTag> <@tags> : ajoute un nouveau groupe de tag ou ajoute des membres à un groupe de tag\n   Exemple :\n    {pn} TEAM1 @tag1 @tag2\n\n   {pn} del <nomDuGroupeTag> <@tags> : retire des membres d'un groupe de tag\n   Exemple :\n    {pn} del TEAM1 @tag1 @tag2\n\n   {pn} remove <nomDuGroupeTag> : supprime un groupe de tag\n   Exemple :\n    {pn} remove TEAM1\n\n   {pn} rename <nomDuGroupeTag> | <nouveauNomDuGroupeTag> : renomme un groupe de tag\n\n   {pn} [list | all] : voir la liste des groupes de tag de ton groupe\n\n   {pn} info <nomDuGroupeTag> : voir les infos d'un groupe de tag",
		text: {
			noGroupTagName: "Veuillez entrer le nom du groupe de tag",
			noMention: "Tu n'as tagué aucun membre à ajouter au groupe de tag",
			addedSuccess: "Membres ajoutés :\n%1\nau groupe de tag \"%2\"",
			addedSuccess2: "Groupe de tag \"%1\" ajouté avec les membres :\n%2",
			existedInGroupTag: "Les membres :\n%1\nexistent déjà dans le groupe de tag \"%2\"",
			notExistedInGroupTag: "Les membres :\n%1\nn'existent pas dans le groupe de tag \"%2\"",
			noExistedGroupTag: "Le groupe de tag \"%1\" n'existe pas dans ton groupe",
			noExistedGroupTag2: "Ton groupe n'a ajouté aucun groupe de tag",
			noMentionDel: "Veuillez taguer les membres à retirer du groupe de tag \"%1\"",
			deletedSuccess: "Membres supprimés :\n%1\ndu groupe de tag \"%2\"",
			deletedSuccess2: "Groupe de tag \"%1\" supprimé",
			tagged: "Tag du groupe \"%1\" :\n%2",
			noGroupTagName2: "Veuillez entrer l'ancien nom et le nouveau nom du groupe de tag, séparés par \"|\"",
			renamedSuccess: "Groupe de tag \"%1\" renommé en \"%2\"",
			infoGroupTag: "📑 | Nom du groupe : \"%1\"\n👥 | Nombre de membres : %2\n👨‍👩‍👧‍👦 | Liste des membres :\n %3"
		}
	},
	help: {
		description: "Voir l'utilisation des commandes",
		guide: "{pn} [vide | <numéro de page> | <nom de la commande>]",
		text: {
			help: "╭─────────────⭓\n%1\n├─────⭔\n│ Page [ %2/%3 ]\n│ Actuellement, le bot a %4 commandes utilisables\n│ » Tape %5help <page> pour voir la liste des commandes\n│ » Tape %5help <commande> pour voir les détails d'utilisation de cette commande\n├────────⭔\n│ %6\n╰─────────────⭓",
			help2: "%1├───────⭔\n│ » Actuellement, le bot a %2 commandes utilisables\n│ » Tape %3help <nom de la commande> pour voir les détails d'utilisation de cette commande\n│ %4\n╰─────────────⭓",
			commandNotFound: "La commande \"%1\" n'existe pas",
			getInfoCommand: "╭── NOM ────⭓\n│ %1\n├── INFOS\n│ Description : %2\n│ Autres noms : %3\n│ Autres noms dans ton groupe : %4\n│ Version : %5\n│ Rôle : %6\n│ Délai entre commandes : %7s\n│ Auteur : %8\n├── Utilisation\n%9\n├── Notes\n│ Le contenu entre <XXXXX> peut être modifié\n│ Le contenu entre [a|b|c] signifie a ou b ou c\n╰──────⭔",
			doNotHave: "Aucun",
			roleText0: "0 (Tous les utilisateurs)",
			roleText1: "1 (Administrateurs du groupe)",
			roleText2: "2 (Admin du bot)",
			roleText0setRole: "0 (rôle défini, tous les utilisateurs)",
			roleText1setRole: "1 (rôle défini, administrateurs du groupe)",
			pageNotFound: "La page %1 n'existe pas"
		}
	},
	kick: {
		description: "Expulse un membre du groupe",
		guide: "{pn} @tags : expulse les membres taggués"
	},
	loadconfig: {
		description: "Recharge la configuration du bot"
	},
	moon: {
		description: "voir l'image de la lune la nuit de ton choix (jj/mm/aaaa)",
		guide: "  {pn} <jour/mois/année>\n   {pn} <jour/mois/année> <légende>",
		text: {
			invalidDateFormat: "Veuillez entrer une date valide au format JJ/MM/AAAA",
			error: "Une erreur est survenue lors de la récupération de l'image de la lune du %1",
			invalidDate: "%1 n'est pas une date valide",
			caption: "- Image de la lune du %1"
		}
	},
	notification: {
		description: "Envoie une notification de l'admin à tous les groupes",
		guide: "{pn} <message>",
		text: {
			missingMessage: "Veuillez entrer le message que tu veux envoyer à tous les groupes",
			notification: "Notification de l'admin du bot à tous les groupes (ne réponds pas à ce message)",
			sendingNotification: "Début de l'envoi de la notification de l'admin du bot à %1 groupes",
			sentNotification: "✅ Notification envoyée à %1 groupes avec succès",
			errorSendingNotification: "Une erreur est survenue lors de l'envoi à %1 groupes :\n %2"
		}
	},
	prefix: {
		description: "Change le préfixe du bot dans ton groupe ou dans tout le système du bot (admin du bot uniquement)",
		guide: "   {pn} <nouveau préfixe> : change le préfixe dans ton groupe\n   Exemple :\n    {pn} #\n\n   {pn} <nouveau préfixe> -g : change le préfixe dans tout le système du bot (admin du bot uniquement)\n   Exemple :\n    {pn} # -g\n\n   {pn} reset : remet le préfixe de ton groupe par défaut",
		text: {
			reset: "Ton préfixe a été remis par défaut : %1",
			onlyAdmin: "Seul l'admin peut changer le préfixe du système du bot",
			confirmGlobal: "Réagis à ce message pour confirmer le changement du préfixe du système du bot",
			confirmThisThread: "Réagis à ce message pour confirmer le changement du préfixe dans ton groupe",
			successGlobal: "Préfixe du système du bot changé en : %1",
			successThisThread: "Préfixe de ton groupe changé en : %1",
			myPrefix: "🌐 Préfixe du système : %1\n🛸 Préfixe de ton groupe : %2"
		}
	},
	rank: {
		description: "Voir ton niveau ou celui de la personne taguée. Tu peux taguer plusieurs personnes"
	},
	rankup: {
		description: "Active/désactive la notification de passage de niveau",
		guide: "{pn} [on | off]",
		text: {
			syntaxError: "Erreur de syntaxe, utilise seulement {pn} on ou {pn} off",
			turnedOn: "Notification de passage de niveau activée",
			turnedOff: "Notification de passage de niveau désactivée",
			notiMessage: "🎉🎉 Félicitations, tu as atteint le niveau %1"
		}
	},
	refresh: {
		description: "actualise les informations du groupe ou de l'utilisateur",
		guide: "   {pn} [thread | group] : actualise les informations de ton groupe\n   {pn} group <threadID> : actualise les informations d'un groupe par ID\n\n   {pn} user : actualise tes informations d'utilisateur\n   {pn} user [<userID> | @tag] : actualise les informations d'un utilisateur par ID",
		text: {
			refreshMyThreadSuccess: "✅ | Informations de ton groupe actualisées avec succès !",
			refreshThreadTargetSuccess: "✅ | Informations du groupe %1 actualisées avec succès !"
		}
	},
	rules: {
		description: "Crée/voir/ajoute/modifie/déplace/supprime les règles de ton groupe",
		guide: "   {pn} [add | -a] <règle à ajouter> : ajoute une règle au groupe.\n   {pn} : voir les règles du groupe.\n   {pn} [edit | -e] <n> <contenu après modification> : modifie la règle numéro n.\n   {pn} [move | -m] <n1> <n2> : échange la position des règles numéro <n1> et <n2>.\n   {pn} [delete | -d] <n> : supprime la règle numéro n.\n   {pn} [remove | -r] : supprime toutes les règles du groupe.\n\n   Exemple :\n    {pn} add pas de spam\n    {pn} move 1 3\n    {pn} -e 1 pas de spam de messages dans le groupe\n    {pn} -r"
	},
	sendnoti: {
		description: "Crée et envoie une notification aux groupes que tu gères",
		guide: "   {pn} create <nomDuGroupe> : crée un nouveau groupe de notification nommé <nomDuGroupe>\n   Exemple :\n    {pn} create TEAM1\n\n   {pn} add <nomDuGroupe> : ajoute le groupe actuel au groupe de notification <nomDuGroupe> (tu dois être admin de ce groupe)\n   Exemple :\n    {pn} add TEAM1\n\n   {pn} delete : retire le groupe actuel du groupe de notification <nomDuGroupe> (tu dois être le créateur de ce groupe)\n   Exemple :\n    {pn} delete TEAM1\n\n   {pn} send <nomDuGroupe> | <message> : envoie une notification à tous les groupes du groupe de notification <nomDuGroupe> (tu dois être admin de ces groupes)\n   Exemple :\n    {pn} send TEAM1 | Bonjour\n\n   {pn} remove <nomDuGroupe> : supprime le groupe de notification <nomDuGroupe> (tu dois en être le créateur)\n   Exemple :\n    {pn} remove TEAM1",
		text: {
			missingGroupName: "Veuillez entrer le nom du groupNoti",
			groupNameExists: "Tu as déjà créé un groupe de notification nommé %1, veuillez choisir un autre nom",
			createdGroup: "Groupe de notification créé avec succès :\n- Nom : %1\n- ID : %2",
			missingGroupNameToAdd: "Veuillez entrer le nom du groupNoti auquel tu veux ajouter ce groupe",
			groupNameNotExists: "Tu n'as créé/géré aucun groupe de notification nommé : %1",
			notAdmin: "Tu n'es pas admin de ce groupe",
			added: "Groupe actuel ajouté au groupe de notification : %1",
			missingGroupNameToDelete: "Veuillez entrer le nom du groupNoti dont tu veux retirer ce groupe",
			notInGroup: "Le groupe actuel n'est pas dans le groupe de notification %1",
			deleted: "Groupe actuel retiré du groupe de notification : %1",
			failed: "Échec de l'envoi de la notification à %1 groupes :\n%2",
			missingGroupNameToRemove: "Veuillez entrer le nom du groupNoti que tu veux supprimer",
			removed: "Groupe de notification supprimé : %1",
			missingGroupNameToSend: "Veuillez entrer le nom du groupNoti auquel tu veux envoyer un message",
			groupIsEmpty: "Le groupe de notification \"%1\" est vide",
			sending: "Envoi de la notification à %1 groupes",
			success: "Notification envoyée à %1 groupes du groupe de notification \"%2\" avec succès",
			notAdminOfGroup: "Tu n'es pas admin de ce groupe",
			missingGroupNameToView: "Veuillez entrer le nom du groupNoti dont tu veux voir les infos",
			groupInfo: "- Nom du groupe : %1\n - ID : %2\n - Créé le : %3\n%4 ",
			groupInfoHasGroup: "- Contient les groupes : \n%1",
			noGroup: "Tu n'as créé/géré aucun groupe de notification"
		}
	},
	setalias: {
		description: "Ajoute un alias pour n'importe quelle commande dans ton groupe",
		guide: "  Cette commande sert à ajouter/retirer un alias pour n'importe quelle commande dans ton groupe\n   {pn} add <alias> <commande> : ajoute un alias pour la commande dans ton groupe\n   {pn} add <alias> <commande> -g : ajoute un alias pour la commande dans tout le système (admin du bot uniquement)\nExemple :\n    {pn} add ctrk customrankcard\n\n   {pn} [remove | rm] <alias> <commande> : retire un alias pour la commande dans ton groupe\n   {pn} [remove | rm] <alias> <commande> -g : retire un alias pour la commande dans tout le système (admin du bot uniquement)\nExemple :\n    {pn} rm ctrk customrankcard\n\n   {pn} list : liste tous les alias des commandes dans ton groupe\n   {pn} list -g : liste tous les alias des commandes dans tout le système"
	},
	setavt: {
		description: "Change l'avatar du bot",
		text: {
			cannotGetImage: "❌ | Une erreur est survenue lors de la requête de l'url de l'image",
			invalidImageFormat: "❌ | Format d'image invalide",
			changedAvatar: "✅ | Avatar du bot changé avec succès"
		}
	},
	setlang: {
		description: "Définit la langue par défaut du bot pour le groupe actuel ou tous les groupes",
		guide: "   {pn} <code langue ISO 639-1>\n   Exemple :    {pn} en    {pn} vi    {pn} ja",
		text: {
			setLangForAll: "Langue par défaut définie pour tous les groupes : %1",
			setLangForCurrent: "Langue par défaut définie pour le groupe actuel : %1",
			noPermission: "Seul l'admin du bot peut utiliser cette commande"
		}
	},
	setleave: {
		description: "Modifie le contenu/active/désactive le message d'au revoir quand un membre quitte ton groupe",
		guide: {
			body: "   {pn} on : active le message d'au revoir\n   {pn} off : désactive le message d'au revoir\n   {pn} text [<contenu> | reset] : modifie le texte ou le remet par défaut, raccourcis disponibles :\n  + {userName} : nom du membre qui quitte le groupe\n  + {userNameTag} : nom du membre qui quitte le groupe (tag)\n  + {boxName} : nom du groupe\n  + {type} : parti/expulsé par un admin\n  + {session} : moment de la journée\n\n   Exemple :\n    {pn} text {userName} a {type} le groupe, à bientôt 🤧\n\n   Réponds ou envoie un message avec un fichier et le contenu {pn} file : pour ajouter une pièce jointe au message d'au revoir (image, vidéo, audio)\n\nExemple :\n   {pn} file reset : supprime le fichier",
			attachment: {
				[`${process.cwd()}/scripts/cmds/assets/guide/setleave/setleave_en_1.png`]: "https://i.ibb.co/2FKJHJr/guide1.png"
			}
		},
		text: {
			missingContent: "Veuillez entrer le contenu",
			edited: "Contenu du message d'au revoir de ton groupe modifié en :\n%1",
			reseted: "Contenu du message d'au revoir réinitialisé",
			noFile: "Aucune pièce jointe du message d'au revoir à réinitialiser",
			resetedFile: "Pièce jointe du message d'au revoir réinitialisée avec succès",
			missingFile: "Veuillez répondre à ce message avec un fichier image/vidéo/audio",
			addedFile: "%1 pièce(s) jointe(s) ajoutée(s) à ton message d'au revoir"
		}
	},
	setname: {
		description: "Change le surnom de tous les membres du groupe ou des membres taggués selon un format",
		guide: {
			body: "   {pn} <surnom> : change ton propre surnom\n   {pn} @tags <surnom> : change le surnom des membres taggués\n   {pn} all <surnom> : change le surnom de tous les membres du groupe\n\nAvec les raccourcis disponibles :\n   + {userName} : nom du membre\n   + {userID} : ID du membre\n\n   Exemple : (voir l'image)",
			attachment: {
				[`${process.cwd()}/scripts/cmds/assets/guide/setname_1.png`]: "https://i.ibb.co/gFh23zb/guide1.png",
				[`${process.cwd()}/scripts/cmds/assets/guide/setname_2.png`]: "https://i.ibb.co/BNWHKgj/guide2.png"
			}
		},
		text: {
			error: "Une erreur est survenue, essaie de désactiver le lien d'invitation du groupe puis réessaie plus tard"
		}
	},
	setrole: {
		description: "Modifie le rôle d'une commande (commandes avec un rôle < 2)",
		guide: "   {pn} <nomDeLaCommande> <nouveau rôle> : définit un nouveau rôle pour la commande\n   Avec :\n   + <nomDeLaCommande> : nom de la commande\n   + <nouveau rôle> : nouveau rôle de la commande avec :\n   + <nouveau rôle> = 0 : la commande peut être utilisée par tous les membres du groupe\n   + <nouveau rôle> = 1 : la commande peut être utilisée uniquement par les admins\n   + <nouveau rôle> = default : remet le rôle de la commande par défaut\n   Exemple :\n    {pn} rank 1 : (la commande rank ne peut être utilisée que par les admins)\n    {pn} rank 0 : (la commande rank peut être utilisée par tous les membres du groupe)\n    {pn} rank default : remet par défaut\n—————\n   {pn} [viewrole|view|show] : voir le rôle des commandes modifiées",
		text: {
			noEditedCommand: "✅ Ton groupe n'a aucune commande modifiée",
			editedCommand: "⚠️ Ton groupe a des commandes modifiées :\n",
			noPermission: "❗ Seul l'admin peut utiliser cette commande",
			commandNotFound: "Commande \"%1\" introuvable",
			noChangeRole: "❗ Impossible de changer le rôle de la commande \"%1\"",
			resetRole: "Rôle de la commande \"%1\" remis par défaut",
			changedRole: "Rôle de la commande \"%1\" changé en %2"
		}
	},
	setwelcome: {
		description: "Modifie le contenu du message de bienvenue quand un nouveau membre rejoint ton groupe",
		guide: {
			body: "   {pn} text [<contenu> | reset] : modifie le texte ou le remet par défaut, avec quelques raccourcis :\n  + {userName} : nom du nouveau membre\n  + {userNameTag} : nom du nouveau membre (tag)\n  + {boxName} :  nom du groupe\n  + {multiple} : toi || vous\n  + {session} :  moment de la journée\n\n   Exemple :\n    {pn} text Bonjour {userName}, bienvenue dans {boxName}, passe une bonne journée {multiple}\n\n   Réponds ou envoie un message avec un fichier et le contenu {pn} file : pour ajouter des pièces jointes au message de bienvenue (image, vidéo, audio)\n\n   Exemple :\n    {pn} file reset : supprime les pièces jointes",
			attachment: {
				[`${process.cwd()}/scripts/cmds/assets/guide/setwelcome/setwelcome_en_1.png`]: "https://i.ibb.co/vsCz0ks/setwelcome-en-1.png"
			}
		},
		text: {
			missingContent: "Veuillez entrer le contenu du message de bienvenue",
			edited: "Contenu du message de bienvenue de ton groupe modifié en : %1",
			reseted: "Contenu du message de bienvenue réinitialisé",
			noFile: "Aucune pièce jointe à supprimer",
			resetedFile: "Pièces jointes réinitialisées avec succès",
			missingFile: "Veuillez répondre à ce message avec un fichier image/vidéo/audio",
			addedFile: "%1 pièce(s) jointe(s) ajoutée(s) au message de bienvenue de ton groupe"
		}
	},
	shortcut: {
		description: "Ajoute un raccourci pour ton message dans le groupe",
		text: {
			missingContent: "Veuillez entrer le contenu du message",
			shortcutExists: "Le raccourci \"%1\" existe déjà, réagis à ce message pour remplacer son contenu",
			shortcutExistsByOther: "Le raccourci %1 a été ajouté par un autre membre, essaie un autre mot-clé",
			added: "Raccourci ajouté %1 => %2",
			addedAttachment: " avec %1 pièce(s) jointe(s)",
			missingKey: "Veuillez entrer le mot-clé du raccourci que tu veux supprimer",
			notFound: "Aucun raccourci trouvé pour le mot-clé %1 dans ton groupe",
			onlyAdmin: "Seuls les administrateurs peuvent supprimer les raccourcis des autres",
			deleted: "Raccourci %1 supprimé",
			empty: "Ton groupe n'a ajouté aucun raccourci",
			message: "Message",
			attachment: "Pièce jointe",
			list: "La liste de tes raccourcis",
			onlyAdminRemoveAll: "Seuls les administrateurs peuvent supprimer tous les raccourcis du groupe",
			confirmRemoveAll: "Es-tu sûr de vouloir supprimer tous les raccourcis de ce groupe ? (réagis à ce message pour confirmer)",
			removedAll: "Tous les raccourcis de ton groupe ont été supprimés"
		}
	},
	simsimi: {
		description: "Discute avec simsimi",
		guide: "   {pn} [on | off] : active/désactive simsimi\n\n   {pn} <mot> : discute avec simsimi\n   Exemple :\n    {pn} salut",
		text: {
			turnedOn: "Simsimi activé avec succès !",
			turnedOff: "Simsimi désactivé avec succès !",
			chatting: "Discussion avec simsimi...",
			error: "Simsimi est occupé, réessaie plus tard"
		}
	},
	sorthelp: {
		description: "Trie la liste d'aide",
		guide: "{pn} [name | category]",
		text: {
			savedName: "Liste d'aide triée par nom enregistrée",
			savedCategory: "Liste d'aide triée par catégorie enregistrée"
		}
	},
	thread: {
		description: "Gère les groupes dans le système du bot",
		guide: "   {pn} [find | -f | search | -s] <nom à chercher> : cherche un groupe dans les données du bot par nom\n   {pn} [find | -f | search | -s] [-j | joined] <nom à chercher> : cherche un groupe dans les données du bot que le bot n'a pas quitté, par nom\n   {pn} [ban | -b] [<tid> | laisser vide] <raison> : bannit le groupe d'id <tid> ou le groupe actuel de l'utilisation du bot\n   Exemple :\n    {pn} ban 3950898668362484 spam bot\n    {pn} ban spam excessif\n    {pn} unban [<tid> | laisser vide] pour débannir le groupe d'id <tid> ou le groupe actuel",
		text: {
			noPermission: "Tu n'as pas la permission d'utiliser cette fonctionnalité",
			found: "🔎 %1 groupe(s) correspondant au mot-clé \"%2\" trouvé(s) dans les données du bot :\n%3",
			notFound: "❌ Aucun groupe correspondant au mot-clé : \"%1\" dans les données du bot",
			hasBanned: "Le groupe d'id [%1 | %2] a déjà été banni :\n» Raison : %3\n» Heure : %4",
			banned: "Groupe d'id [%1 | %2] banni de l'utilisation du bot.\n» Raison : %3\n» Heure : %4",
			notBanned: "Le groupe d'id [%1 | %2] n'est pas banni de l'utilisation du bot",
			unbanned: "Groupe d'id [%1 | %2] débanni de l'utilisation du bot",
			missingReason: "La raison du bannissement ne peut pas être vide",
			info: "» ID du groupe : %1\n» Nom : %2\n» Date de création des données : %3\n» Total de membres : %4\n» Garçons : %5 membres\n» Filles : %6 membres\n» Total de messages : %7%8"
		}
	},
	tid: {
		description: "Voir le threadID de ton groupe",
		guide: "{pn}"
	},
	tik: {
		description: "Télécharge une vidéo/un diaporama (images), un audio depuis un lien tiktok",
		guide: "   {pn} [video|-v|v] <url> : télécharge une vidéo/un diaporama (images) depuis un lien tiktok.\n   {pn} [audio|-a|a] <url> : télécharge un audio depuis un lien tiktok",
		text: {
			invalidUrl: "Veuillez entrer une url tiktok valide",
			downloadingVideo: "Téléchargement de la vidéo : %1...",
			downloadedSlide: "Diaporama téléchargé : %1\n%2",
			downloadedVideo: "Vidéo téléchargée : %1\nUrl de téléchargement : %2",
			downloadingAudio: "Téléchargement de l'audio : %1...",
			downloadedAudio: "Audio téléchargé : %1"
		}
	},
	trigger: {
		description: "Image Trigger",
		guide: "{pn} [@tag | vide]"
	},
	uid: {
		description: "Voir l'id facebook d'un utilisateur",
		guide: "   {pn} : voir ton id facebook\n   {pn} @tag : voir l'id facebook des personnes taguées\n   {pn} <lien du profil> : voir l'id facebook d'un lien de profil",
		text: {
			syntaxError: "Veuillez taguer la personne dont tu veux voir l'uid ou laisser vide pour voir ton propre uid"
		}
	},
	unsend: {
		description: "Supprime un message du bot",
		guide: "réponds au message que tu veux supprimer et appelle la commande {pn}",
		text: {
			syntaxError: "Veuillez répondre au message que tu veux supprimer"
		}
	},
	user: {
		description: "Gère les utilisateurs dans le système du bot",
		guide: "   {pn} [find | -f | search | -s] <nom à chercher> : cherche des utilisateurs dans les données du bot par nom\n\n   {pn} [ban | -b] [<uid> | @tag | réponse à un message] <raison> : bannit l'utilisateur d'id <uid>, l'utilisateur tagué ou l'auteur du message auquel tu réponds de l'utilisation du bot\n\n   {pn} unban [<uid> | @tag | réponse à un message] : débannit un utilisateur de l'utilisation du bot",
		text: {
			noUserFound: "❌ Aucun utilisateur dont le nom correspond au mot-clé : \"%1\" dans les données du bot",
			userFound: "🔎 %1 utilisateur(s) dont le nom correspond au mot-clé \"%2\" trouvé(s) dans les données du bot :\n%3",
			uidRequired: "L'uid de l'utilisateur à bannir ne peut pas être vide, veuillez entrer l'uid, taguer ou répondre au message d'1 utilisateur avec user ban <uid> <raison>",
			reasonRequired: "La raison du bannissement ne peut pas être vide, veuillez entrer l'uid, taguer ou répondre au message d'1 utilisateur avec user ban <uid> <raison>",
			userHasBanned: "L'utilisateur d'id [%1 | %2] a déjà été banni :\n» Raison : %3\n» Date : %4",
			userBanned: "L'utilisateur d'id [%1 | %2] a été banni :\n» Raison : %3\n» Date : %4",
			uidRequiredUnban: "L'uid de l'utilisateur à débannir ne peut pas être vide",
			userNotBanned: "L'utilisateur d'id [%1 | %2] n'est pas banni",
			userUnbanned: "L'utilisateur d'id [%1 | %2] a été débanni"
		}
	},
	videofb: {
		description: "Télécharge une vidéo/story depuis facebook (publique)",
		guide: "   {pn} <url de la vidéo/story> : télécharge une vidéo depuis facebook",
		text: {
			missingUrl: "Veuillez entrer l'url de la vidéo/story facebook (publique) que tu veux télécharger",
			error: "Une erreur est survenue lors du téléchargement de la vidéo",
			downloading: "Téléchargement de la vidéo pour toi",
			tooLarge: "Désolé, impossible de télécharger la vidéo car sa taille dépasse 83 Mo"
		}
	},
	warn: {
		description: "avertit un membre du groupe, à 3 avertissements il sera banni",
		guide: "   {pn} @tag <raison> : avertit un membre\n   {pn} list : voir la liste des membres avertis\n   {pn} listban : voir la liste des membres bannis\n   {pn} info [@tag | <uid> | laisser vide] : voir les infos d'avertissement du membre tagué, de l'uid ou de toi-même\n   {pn} unban <uid> : débannit un membre par uid\n   {pn} unwarn <uid> [<numéro d'avertissement> | laisser vide] : retire un avertissement à un membre par uid et numéro d'avertissement\n   {pn} warn reset : réinitialise toutes les données d'avertissement\n⚠️ Tu dois mettre le bot admin pour qu'il expulse automatiquement les membres bannis",
		text: {
			list: "Liste des membres qui ont été avertis :\n%1\n\nPour voir le détail des avertissements, utilise la commande \"%2warn info [@tag | <uid> | laisser vide]\" : pour voir les informations d'avertissement de la personne taguée, de l'uid ou de toi-même",
			listBan: "Liste des membres avertis 3 fois et bannis du groupe :\n%1",
			listEmpty: "Ton groupe n'a aucun membre averti",
			listBanEmpty: "Ton groupe n'a aucun membre banni du groupe",
			invalidUid: "Veuillez entrer un uid valide de la personne dont tu veux voir les informations",
			noData: "Aucune donnée",
			noPermission: "❌ Seuls les administrateurs du groupe peuvent débannir les membres bannis du groupe",
			invalidUid2: "⚠️ Veuillez entrer un uid valide de la personne que tu veux débannir",
			notBanned: "⚠️ L'utilisateur d'id %1 n'a pas été banni de ton groupe",
			unbanSuccess: "✅ Membre [%1 | %2] débanni avec succès, cette personne peut maintenant rejoindre ton groupe",
			noPermission2: "❌ Seuls les administrateurs du groupe peuvent retirer les avertissements des membres du groupe",
			invalidUid3: "⚠️ Veuillez entrer un uid ou taguer la personne dont tu veux retirer l'avertissement",
			noData2: "⚠️ L'utilisateur d'id %1 n'a aucune donnée d'avertissement",
			notEnoughWarn: "❌ L'utilisateur %1 n'a que %2 avertissements",
			unwarnSuccess: "✅ Avertissement %1 du membre [%2 | %3] retiré avec succès",
			noPermission3: "❌ Seuls les administrateurs du groupe peuvent réinitialiser les données d'avertissement",
			resetWarnSuccess: "✅ Données d'avertissement réinitialisées avec succès",
			noPermission4: "❌ Seuls les administrateurs du groupe peuvent avertir les membres du groupe",
			invalidUid4: "⚠️ Tu dois taguer ou répondre au message de la personne que tu veux avertir",
			warnSuccess: "⚠️ Membre %1 averti %2 fois\n- Uid : %3\n- Raison : %4\n- Date et heure : %5\nCe membre a été averti 3 fois et banni du groupe, pour le débannir utilise la commande \"%6warn unban <uid>\" (avec uid l'uid de la personne que tu veux débannir)",
			noPermission5: "⚠️ Le bot a besoin des droits d'administrateur pour expulser les membres bannis",
			warnSuccess2: "⚠️ Membre %1 averti %2 fois\n- Uid : %3\n- Raison : %4\n- Date et heure : %5\nSi cette personne enfreint les règles %6 fois de plus, elle sera bannie du groupe",
			hasBanned: "⚠️ Les membres suivants ont déjà été avertis 3 fois et bannis du groupe :\n%1",
			failedKick: "⚠️ Une erreur est survenue lors de l'expulsion des membres suivants :\n%1"
		}
	},
	weather: {
		description: "voir la météo actuelle et des 5 prochains jours",
		guide: "{pn} <lieu>",
		text: {
			syntaxError: "Veuillez entrer un lieu",
			notFound: "Lieu introuvable : %1",
			error: "Une erreur est survenue : %1",
			today: "Météo du jour :\n%1\n🌡 Température min - max %2°C - %3°C\n🌡 Ressenti %4°C - %5°C\n🌅 Lever du soleil %6\n🌄 Coucher du soleil %7\n🌃 Lever de la lune %8\n🏙️ Coucher de la lune %9\n🌞 Jour : %10\n🌙 Nuit : %11"
		}
	},
	ytb: {
		description: "Télécharge une vidéo, un audio ou voir les infos d'une vidéo sur YouTube",
		guide: "   {pn} [video|-v] [<nom de la vidéo>|<lien de la vidéo>] : télécharge une vidéo depuis youtube.\n   {pn} [audio|-a] [<nom de la vidéo>|<lien de la vidéo>] : télécharge un audio depuis youtube\n   {pn} [info|-i] [<nom de la vidéo>|<lien de la vidéo>] : voir les infos d'une vidéo youtube\n   Exemple :\n    {pn} -v Fallen Kingdom\n    {pn} -a Fallen Kingdom\n    {pn} -i Fallen Kingdom",
		text: {
			error: "Une erreur est survenue : %1",
			noResult: "Aucun résultat de recherche ne correspond au mot-clé %1",
			choose: "%1Réponds au message avec le numéro pour choisir ou avec n'importe quel contenu pour annuler",
			downloading: "Téléchargement de la vidéo %1",
			noVideo: "Désolé, aucune vidéo de moins de 83 Mo n'a été trouvée",
			downloadingAudio: "Téléchargement de l'audio %1",
			noAudio: "Désolé, aucun audio de moins de 26 Mo n'a été trouvé",
			info: "💠 Titre : %1\n🏪 Chaîne : %2\n👨‍👩‍👧‍👦 Abonnés : %3\n⏱ Durée de la vidéo : %4\n👀 Vues : %5\n👍 J'aime : %6\n🆙 Date de mise en ligne : %7\n🔠 ID : %8\n🔗 Lien : %9",
			listChapter: "\n📖 Liste des chapitres : %1\n"
		}
	}
};
