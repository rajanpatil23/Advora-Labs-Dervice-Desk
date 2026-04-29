import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Locale = "en" | "es" | "fr" | "de";

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
];

type Dict = Record<string, string>;

const messages: Record<Locale, Dict> = {
  en: {
    "nav.workspace": "Workspace",
    "nav.dashboard": "Dashboard",
    "nav.tickets": "Tickets",
    "nav.myQueue": "My queue",
    "nav.incidents": "Incidents",
    "nav.requests": "Requests",
    "nav.approvals": "Approvals",
    "nav.team": "Team",
    "nav.insights": "Insights",
    "nav.reports": "Reports",
    "nav.reportBuilder": "Report builder",
    "nav.csat": "CSAT",
    "nav.manage": "Manage",
    "nav.users": "Users",
    "nav.agents": "Agents",
    "nav.knowledge": "Knowledge base",
    "nav.sla": "SLA policies",
    "nav.automations": "Automations",
    "nav.fields": "Custom fields",
    "nav.savedViews": "Saved views",
    "nav.system": "System",
    "nav.settings": "Settings",
    "nav.branding": "Branding",
    "nav.integrations": "Integrations",
    "nav.security": "Security",
    "nav.billing": "Billing",
    "nav.notifications": "Notifications",
    "nav.logs": "Audit log",
    "nav.data": "Import / Export",
    "nav.platform": "Platform",
    "common.search": "Search…",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.close": "Close",
    "common.loading": "Loading…",
    "common.signOut": "Sign out",
    "common.profile": "Profile",
    "common.preferences": "Preferences",
    "common.language": "Language",
    "common.takeTour": "Take product tour",
    "topbar.notifications": "Notifications",
    "topbar.commandHint": "Press ⌘K to open command palette",
    "dashboard.greeting": "Good morning",
    "dashboard.subtitle": "Your team has {open} open tickets and {attention} need attention.",
    "dashboard.customize": "Customize",
    "dashboard.done": "Done",
    "dashboard.addWidget": "Add widget",
    "dashboard.reset": "Reset",
    "dashboard.openWorkspace": "Open agent workspace",
    "tickets.title": "Tickets",
    "tickets.new": "New ticket",
    "tickets.allStatuses": "All statuses",
    "tickets.empty": "No tickets match your filters.",
    "auth.signIn": "Sign in",
    "auth.signUp": "Create account",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.welcome": "Welcome back",
  },
  es: {
    "nav.workspace": "Espacio de trabajo",
    "nav.dashboard": "Panel",
    "nav.tickets": "Tickets",
    "nav.myQueue": "Mi cola",
    "nav.incidents": "Incidentes",
    "nav.requests": "Solicitudes",
    "nav.approvals": "Aprobaciones",
    "nav.team": "Equipo",
    "nav.insights": "Análisis",
    "nav.reports": "Informes",
    "nav.reportBuilder": "Constructor de informes",
    "nav.csat": "CSAT",
    "nav.manage": "Administrar",
    "nav.users": "Usuarios",
    "nav.agents": "Agentes",
    "nav.knowledge": "Base de conocimiento",
    "nav.sla": "Políticas SLA",
    "nav.automations": "Automatizaciones",
    "nav.fields": "Campos personalizados",
    "nav.savedViews": "Vistas guardadas",
    "nav.system": "Sistema",
    "nav.settings": "Ajustes",
    "nav.branding": "Marca",
    "nav.integrations": "Integraciones",
    "nav.security": "Seguridad",
    "nav.billing": "Facturación",
    "nav.notifications": "Notificaciones",
    "nav.logs": "Registro de auditoría",
    "nav.data": "Importar / Exportar",
    "nav.platform": "Plataforma",
    "common.search": "Buscar…",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.delete": "Eliminar",
    "common.edit": "Editar",
    "common.create": "Crear",
    "common.close": "Cerrar",
    "common.loading": "Cargando…",
    "common.signOut": "Cerrar sesión",
    "common.profile": "Perfil",
    "common.preferences": "Preferencias",
    "common.language": "Idioma",
    "common.takeTour": "Hacer tour del producto",
    "topbar.notifications": "Notificaciones",
    "topbar.commandHint": "Pulsa ⌘K para abrir la paleta de comandos",
    "dashboard.greeting": "Buenos días",
    "dashboard.subtitle": "Tu equipo tiene {open} tickets abiertos y {attention} necesitan atención.",
    "dashboard.customize": "Personalizar",
    "dashboard.done": "Listo",
    "dashboard.addWidget": "Añadir widget",
    "dashboard.reset": "Restablecer",
    "dashboard.openWorkspace": "Abrir espacio del agente",
    "tickets.title": "Tickets",
    "tickets.new": "Nuevo ticket",
    "tickets.allStatuses": "Todos los estados",
    "tickets.empty": "Ningún ticket coincide con tus filtros.",
    "auth.signIn": "Iniciar sesión",
    "auth.signUp": "Crear cuenta",
    "auth.email": "Correo electrónico",
    "auth.password": "Contraseña",
    "auth.welcome": "Bienvenido de nuevo",
  },
  fr: {
    "nav.workspace": "Espace de travail",
    "nav.dashboard": "Tableau de bord",
    "nav.tickets": "Tickets",
    "nav.myQueue": "Ma file",
    "nav.incidents": "Incidents",
    "nav.requests": "Demandes",
    "nav.approvals": "Approbations",
    "nav.team": "Équipe",
    "nav.insights": "Analyses",
    "nav.reports": "Rapports",
    "nav.reportBuilder": "Constructeur de rapports",
    "nav.csat": "CSAT",
    "nav.manage": "Gérer",
    "nav.users": "Utilisateurs",
    "nav.agents": "Agents",
    "nav.knowledge": "Base de connaissances",
    "nav.sla": "Politiques SLA",
    "nav.automations": "Automatisations",
    "nav.fields": "Champs personnalisés",
    "nav.savedViews": "Vues enregistrées",
    "nav.system": "Système",
    "nav.settings": "Paramètres",
    "nav.branding": "Marque",
    "nav.integrations": "Intégrations",
    "nav.security": "Sécurité",
    "nav.billing": "Facturation",
    "nav.notifications": "Notifications",
    "nav.logs": "Journal d'audit",
    "nav.data": "Importer / Exporter",
    "nav.platform": "Plateforme",
    "common.search": "Rechercher…",
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.create": "Créer",
    "common.close": "Fermer",
    "common.loading": "Chargement…",
    "common.signOut": "Déconnexion",
    "common.profile": "Profil",
    "common.preferences": "Préférences",
    "common.language": "Langue",
    "common.takeTour": "Visite du produit",
    "topbar.notifications": "Notifications",
    "topbar.commandHint": "Appuyez sur ⌘K pour la palette de commandes",
    "dashboard.greeting": "Bonjour",
    "dashboard.subtitle": "Votre équipe a {open} tickets ouverts et {attention} nécessitent une attention.",
    "dashboard.customize": "Personnaliser",
    "dashboard.done": "Terminé",
    "dashboard.addWidget": "Ajouter un widget",
    "dashboard.reset": "Réinitialiser",
    "dashboard.openWorkspace": "Ouvrir l'espace agent",
    "tickets.title": "Tickets",
    "tickets.new": "Nouveau ticket",
    "tickets.allStatuses": "Tous les statuts",
    "tickets.empty": "Aucun ticket ne correspond à vos filtres.",
    "auth.signIn": "Se connecter",
    "auth.signUp": "Créer un compte",
    "auth.email": "E-mail",
    "auth.password": "Mot de passe",
    "auth.welcome": "Bienvenue",
  },
  de: {
    "nav.workspace": "Arbeitsbereich",
    "nav.dashboard": "Dashboard",
    "nav.tickets": "Tickets",
    "nav.myQueue": "Meine Warteschlange",
    "nav.incidents": "Vorfälle",
    "nav.requests": "Anfragen",
    "nav.approvals": "Genehmigungen",
    "nav.team": "Team",
    "nav.insights": "Analysen",
    "nav.reports": "Berichte",
    "nav.reportBuilder": "Berichts-Builder",
    "nav.csat": "CSAT",
    "nav.manage": "Verwalten",
    "nav.users": "Benutzer",
    "nav.agents": "Agenten",
    "nav.knowledge": "Wissensdatenbank",
    "nav.sla": "SLA-Richtlinien",
    "nav.automations": "Automationen",
    "nav.fields": "Benutzerdefinierte Felder",
    "nav.savedViews": "Gespeicherte Ansichten",
    "nav.system": "System",
    "nav.settings": "Einstellungen",
    "nav.branding": "Branding",
    "nav.integrations": "Integrationen",
    "nav.security": "Sicherheit",
    "nav.billing": "Abrechnung",
    "nav.notifications": "Benachrichtigungen",
    "nav.logs": "Audit-Log",
    "nav.data": "Import / Export",
    "nav.platform": "Plattform",
    "common.search": "Suchen…",
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.delete": "Löschen",
    "common.edit": "Bearbeiten",
    "common.create": "Erstellen",
    "common.close": "Schließen",
    "common.loading": "Lädt…",
    "common.signOut": "Abmelden",
    "common.profile": "Profil",
    "common.preferences": "Einstellungen",
    "common.language": "Sprache",
    "common.takeTour": "Produkttour starten",
    "topbar.notifications": "Benachrichtigungen",
    "topbar.commandHint": "Drücken Sie ⌘K für die Befehlspalette",
    "dashboard.greeting": "Guten Morgen",
    "dashboard.subtitle": "Dein Team hat {open} offene Tickets und {attention} brauchen Aufmerksamkeit.",
    "dashboard.customize": "Anpassen",
    "dashboard.done": "Fertig",
    "dashboard.addWidget": "Widget hinzufügen",
    "dashboard.reset": "Zurücksetzen",
    "dashboard.openWorkspace": "Agenten-Arbeitsplatz öffnen",
    "tickets.title": "Tickets",
    "tickets.new": "Neues Ticket",
    "tickets.allStatuses": "Alle Status",
    "tickets.empty": "Keine Tickets entsprechen deinen Filtern.",
    "auth.signIn": "Anmelden",
    "auth.signUp": "Konto erstellen",
    "auth.email": "E-Mail",
    "auth.password": "Passwort",
    "auth.welcome": "Willkommen zurück",
  },
};

const STORAGE_KEY = "lovable.locale.v1";

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && messages[saved]) return saved;
  } catch {}
  const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "en";
  return (["en", "es", "fr", "de"] as Locale[]).includes(nav as Locale) ? (nav as Locale) : "en";
}

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectLocale());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {}
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<Ctx>(() => {
    const dict = messages[locale];
    const fallback = messages.en;
    return {
      locale,
      setLocale: setLocaleState,
      t: (key, vars) => {
        let s = dict[key] ?? fallback[key] ?? key;
        if (vars) for (const k in vars) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
        return s;
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export function useT() {
  return useI18n().t;
}
