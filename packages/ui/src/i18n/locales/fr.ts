/**
 * French translations.
 *
 * 与 ar.ts 同样的策略：先覆盖首屏与首次运行界面，其余键由 `createIntl`
 * 回退到 en-US，因此翻译可以逐块补齐而不会出现未翻译即报错的情况。
 */
const fr: Record<string, string> = {
  "welcome.title": "Bienvenue dans Idexal",
  "welcome.username": "Nom d’utilisateur",
  "welcome.password": "Mot de passe",
  "welcome.login": "Connexion",
  "welcome.loggingIn": "Connexion en cours...",
  "welcome.loginFailed": "Échec de la connexion",

  "login.title": "Bienvenue dans Idexal",
  "login.description": "Connectez votre compte pour commencer à utiliser Idexal",
  "login.oauth.activeProviderHint":
    "Fournisseur actif : {provider}. Une nouvelle connexion remplace l’identité actuelle.",
  "login.subscription.comingSoon": "Abonnements bientôt disponibles",
  "login.oauth.regionTag.zai": "Mondial",
  "login.oauth.regionTag.bigmodel": "Chine",
  "login.oauth.waiting": "En attente de l’authentification {provider}...",
  "login.oauth.loginFailure": "Échec de la connexion, veuillez réessayer",
  "login.oauth.cancel": "Annuler",
  "login.oauth.retry": "Réessayer la connexion",
  "login.expired.title": "Votre session a expiré",
  "login.expired.description": "Pour garder votre compte sécurisé, veuillez vous reconnecter.",
  "login.expired.action": "Se reconnecter",
  "login.expired.restart": "Confirmer et redémarrer",
  "login.useApiKey": "Utiliser une clé API",
  "login.apiKey.title": "Clé API",
  "login.apiKey.placeholder": "Saisissez la clé API",
  "login.apiKey.providerLabel": "Fournisseur de clé API",
  "login.apiKey.getApiKey": "Obtenir une clé API",
  "login.apiKey.cancel": "Annuler",
  "login.apiKey.continue": "Continuer",
  "login.apiKey.emptyError": "Saisissez une clé API.",
  "login.apiKey.providerMissingError":
    "Configuration de fournisseur intégrée introuvable pour {provider}. Réessayez plus tard.",
  "login.apiKey.saveError": "Échec de l’enregistrement de la clé API : {error}",
  "login.apiKey.skipError": "Échec de l’ignorance de la configuration de clé API : {error}",
  "login.skip": "Ignorer pour l’instant",

  "app.currentTheme": "Actuel : {theme}",
  "app.login": "Connecter",
  "app.logout": "Déconnecter",
  "app.selectFile": "Sélectionnez un fichier pour commencer",
  "app.workspace": "Espace de travail",

  "locale.switchLanguage": "Changer de langue",

  "onboarding.dialog.title": "Bienvenue dans Idexal",
  "onboarding.dialog.description": "Choisissez comment démarrer votre première session.",
  "onboarding.wizard.label": "Guide de migration",
  "onboarding.welcome.eyebrow": "Configuration au premier lancement",
  "onboarding.welcome.title": "Bienvenue dans Idexal",
  "onboarding.welcome.start": "Démarrer Idexal",
  "onboarding.welcome.migrate": "Guide de migration",
  "onboarding.welcome.helper":
    "Importez maintenant vos réglages d’outils existants, ou ignorez et reprenez plus tard depuis les réglages.",
  "onboarding.step.session": "Sessions",
  "onboarding.step.skillsImport": "Compétences",
  "onboarding.step.mcpImport": "Serveurs MCP",
  "onboarding.step.pluginsImport": "Extensions",
  "onboarding.step.commandsImport": "Commandes",
  "onboarding.step.agentsFile": "AGENTS.md",
  "onboarding.step.migration": "Migration",
  "onboarding.sessions.count": "{count} sessions",
  "onboarding.sessions.unlimited": "Illimité",
  "onboarding.sessions.chooseWorkspace": "Choisir l’espace de travail",
  "onboarding.agentsFile.sourceLabel": "Source",
  "onboarding.agentsFile.targetLabel": "Cible",
  "onboarding.agentsFile.loading": "Vérification...",
};

export default fr;
