// The setup wizard of a first install (/setup, see src/onboarding.js): basics, services from
// the running containers, homepage's files, a security checklist, then it writes the config.
// The YAML stays the source: this page only sends what you chose, the server writes the files.
'use strict';

// the colour palettes of index.html (tests/frontend.test.mjs keeps the two the same)
const PALETTES = {
  slate: '#f8fafc #f1f5f9 #e2e8f0 #cbd5e1 #94a3b8 #64748b #475569 #334155 #1e293b #0f172a #020617',
  gray: '#f9fafb #f3f4f6 #e5e7eb #d1d5db #9ca3af #6b7280 #4b5563 #374151 #1f2937 #111827 #030712',
  zinc: '#fafafa #f4f4f5 #e4e4e7 #d4d4d8 #a1a1aa #71717a #52525b #3f3f46 #27272a #18181b #09090b',
  neutral: '#fafafa #f5f5f5 #e5e5e5 #d4d4d4 #a3a3a3 #737373 #525252 #404040 #262626 #171717 #0a0a0a',
  stone: '#fafaf9 #f5f5f4 #e7e5e4 #d6d3d1 #a8a29e #78716c #57534e #44403c #292524 #1c1917 #0c0a09',
  red: '#fef2f2 #fee2e2 #fecaca #fca5a5 #f87171 #ef4444 #dc2626 #b91c1c #991b1b #7f1d1d #450a0a',
  orange: '#fff7ed #ffedd5 #fed7aa #fdba74 #fb923c #f97316 #ea580c #c2410c #9a3412 #7c2d12 #431407',
  amber: '#fffbeb #fef3c7 #fde68a #fcd34d #fbbf24 #f59e0b #d97706 #b45309 #92400e #78350f #451a03',
  yellow: '#fefce8 #fef9c3 #fef08a #fde047 #facc15 #eab308 #ca8a04 #a16207 #854d0e #713f12 #422006',
  lime: '#f7fee7 #ecfccb #d9f99d #bef264 #a3e635 #84cc16 #65a30d #4d7c0f #3f6212 #365314 #1a2e05',
  green: '#f0fdf4 #dcfce7 #bbf7d0 #86efac #4ade80 #22c55e #16a34a #15803d #166534 #14532d #052e16',
  emerald: '#ecfdf5 #d1fae5 #a7f3d0 #6ee7b7 #34d399 #10b981 #059669 #047857 #065f46 #064e3b #022c22',
  teal: '#f0fdfa #ccfbf1 #99f6e4 #5eead4 #2dd4bf #14b8a6 #0d9488 #0f766e #115e59 #134e4a #042f2e',
  cyan: '#ecfeff #cffafe #a5f3fc #67e8f9 #22d3ee #06b6d4 #0891b2 #0e7490 #155e75 #164e63 #083344',
  sky: '#f0f9ff #e0f2fe #bae6fd #7dd3fc #38bdf8 #0ea5e9 #0284c7 #0369a1 #075985 #0c4a6e #082f49',
  blue: '#eff6ff #dbeafe #bfdbfe #93c5fd #60a5fa #3b82f6 #2563eb #1d4ed8 #1e40af #1e3a8a #172554',
  indigo: '#eef2ff #e0e7ff #c7d2fe #a5b4fc #818cf8 #6366f1 #4f46e5 #4338ca #3730a3 #312e81 #1e1b4b',
  violet: '#f5f3ff #ede9fe #ddd6fe #c4b5fd #a78bfa #8b5cf6 #7c3aed #6d28d9 #5b21b6 #4c1d95 #2e1065',
  purple: '#faf5ff #f3e8ff #e9d5ff #d8b4fe #c084fc #a855f7 #9333ea #7e22ce #6b21a8 #581c87 #3b0764',
  fuchsia: '#fdf4ff #fae8ff #f5d0fe #f0abfc #e879f9 #d946ef #c026d3 #a21caf #86198f #701a75 #4a044e',
  pink: '#fdf2f8 #fce7f3 #fbcfe8 #f9a8d4 #f472b6 #ec4899 #db2777 #be185d #9d174d #831843 #500724',
  rose: '#fff1f2 #ffe4e6 #fecdd3 #fda4af #fb7185 #f43f5e #e11d48 #be123c #9f1239 #881337 #4c0519',
};
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
// each language by its own name
const LANGUAGE_NAMES = {
  en: 'English', nl: 'Nederlands', fr: 'Français', de: 'Deutsch', es: 'Español', ca: 'Català', he: 'עברית', hr: 'Hrvatski',
  hu: 'Magyar', it: 'Italiano', 'nb-NO': 'Norsk bokmål', pt: 'Português', ru: 'Русский', sv: 'Svenska', vi: 'Tiếng Việt',
  'zh-Hans': '简体中文', 'zh-Hant': '繁體中文',
};

const I18N = {
  en: {
    heading: 'Set up your dashboard', intro: 'A few steps, and the dashboard writes its configuration for you. You can change everything later in its YAML files.',
    stepBasics: 'Basics', stepServices: 'Services', stepHomepage: 'From homepage', stepSecurity: 'Security', stepDone: 'Done',
    next: 'Next', back: 'Back', skipSetup: 'Skip the setup: start with an empty dashboard',
    codeTitle: 'Enter the setup code', codeText: 'You are not on the local network, so the setup asks for the code from the dashboard\'s log: docker logs dashboard', codeLabel: 'Setup code', codeSubmit: 'Continue', codeWrong: 'Wrong code', wait: 'Too many tries; wait {seconds} s',
    basicsText: 'How the page looks.', titleLabel: 'Title', languageLabel: 'Language', themeLabel: 'Theme', themeAuto: 'Follow the system', themeDark: 'Dark', themeLight: 'Light', colorLabel: 'Colour',
    servicesText: 'The running containers, with the widget that fits each one. Tick the ones you want on the page and fill in what a widget needs.', scanning: 'Looking for containers…',
    noDocker: 'No Docker found. Mount the Docker socket (or a socket proxy) to find containers, or add services by hand.', discovered: 'on the page already, through its labels', noWidget: 'no widget, a link only',
    addService: 'Add a service by hand', nameLabel: 'Name', groupLabel: 'Group', linkLabel: 'Link', widgetLabel: 'Widget', none: 'None', moreOptions: 'More options', test: 'Test', testing: 'Testing…', works: 'Works', remove: 'Remove', newService: 'New service',
    homepageText: 'Coming from homepage? Choose its configuration files (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). They are taken over as they are, in place of what the steps before would write.', chooseFiles: 'Choose files', check: 'Check',
    importSummary: '{services} services, {bookmarks} bookmarks, {header} header widgets', unknownWidgets: 'Widgets without a match: {list}', importUse: 'Use these files', importUsed: 'These files are used', importDrop: 'Do not use them', notHomepage: 'None of these is a homepage file: {list}',
    securityText: 'These are settings of the container (its environment in compose); the setup shows the lines to add.',
    secHosts: 'Allowed hosts', secHostsIp: 'You opened the dashboard by its IP address, which always works. Opened by a name, that name must be in DASHBOARD_ALLOWED_HOSTS.', secHostsOk: '{host} is allowed.', secHostsMissing: '{host} is not in DASHBOARD_ALLOWED_HOSTS: after the setup the page answers that name only once it is.',
    secPassword: 'Action password', secPasswordOn: 'Set: buttons that run something can ask for it.', secPasswordOff: 'Not set: anyone who can open the page can press every button. Make a hash of a password and add it.', passwordLabel: 'Password', makeHash: 'Make the hash',
    secDocker: 'Docker', secDockerSocket: 'The Docker socket is mounted: the dashboard and every widget can use the whole Docker API, also with :ro. A docker-socket-proxy with CONTAINERS=1 is safer.', secDockerProxy: 'Docker through {url}.', secDockerNone: 'No Docker: container status and discovery are off.',
    composeLines: 'Add to the dashboard\'s environment, then recreate the container:', nothingToAdd: 'Nothing to add.', copy: 'Copy', copied: 'Copied',
    doneText: 'The dashboard writes these files into its config folder:', write: 'Write the configuration', writing: 'Writing…', exists: 'Already there: {list}. Nothing was written.', failed: 'Could not write: {error}', fromHomepage: 'from homepage', services: '{count} services',
  },
  nl: {"heading":"Je dashboard instellen","intro":"Een paar stappen, en het dashboard schrijft zijn configuratie voor je. Alles is later aan te passen in de YAML-bestanden.","stepBasics":"Basis","stepServices":"Services","stepHomepage":"Van homepage","stepSecurity":"Beveiliging","stepDone":"Klaar","next":"Volgende","back":"Terug","skipSetup":"Instellen overslaan: begin met een leeg dashboard","codeTitle":"Voer de setupcode in","codeText":"Je zit niet op het lokale netwerk, dus vraagt de setup de code uit de log van het dashboard: docker logs dashboard","codeLabel":"Setupcode","codeSubmit":"Doorgaan","codeWrong":"Onjuiste code","wait":"Te veel pogingen; wacht {seconds} s","basicsText":"Hoe de pagina eruitziet.","titleLabel":"Titel","languageLabel":"Taal","themeLabel":"Thema","themeAuto":"Systeem volgen","themeDark":"Donker","themeLight":"Licht","colorLabel":"Kleur","servicesText":"De draaiende containers, met de widget die bij elk past. Vink aan wat je op de pagina wilt en vul in wat een widget nodig heeft.","scanning":"Containers zoeken…","noDocker":"Geen Docker gevonden. Koppel de Docker-socket (of een socket-proxy) om containers te vinden, of voeg services met de hand toe.","discovered":"staat al op de pagina, via zijn labels","noWidget":"geen widget, alleen een link","addService":"Service met de hand toevoegen","nameLabel":"Naam","groupLabel":"Groep","linkLabel":"Link","widgetLabel":"Widget","none":"Geen","moreOptions":"Meer opties","test":"Testen","testing":"Testen…","works":"Werkt","remove":"Verwijderen","newService":"Nieuwe service","homepageText":"Kom je van homepage? Kies de configuratiebestanden (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Ze worden overgenomen zoals ze zijn, in plaats van wat de vorige stappen zouden schrijven.","chooseFiles":"Bestanden kiezen","check":"Controleren","importSummary":"{services} services, {bookmarks} bladwijzers, {header} headerwidgets","unknownWidgets":"Widgets zonder match: {list}","importUse":"Deze bestanden gebruiken","importUsed":"Deze bestanden worden gebruikt","importDrop":"Niet gebruiken","notHomepage":"Geen van deze is een homepage-bestand: {list}","securityText":"Dit zijn instellingen van de container (de environment in compose); de setup toont de regels om toe te voegen.","secHosts":"Toegestane hosts","secHostsIp":"Je opende het dashboard via het IP-adres, en dat werkt altijd. Via een naam moet die naam in DASHBOARD_ALLOWED_HOSTS staan.","secHostsOk":"{host} is toegestaan.","secHostsMissing":"{host} staat niet in DASHBOARD_ALLOWED_HOSTS: na de setup antwoordt de pagina op die naam pas als hij erin staat.","secPassword":"Actiewachtwoord","secPasswordOn":"Ingesteld: knoppen die iets uitvoeren kunnen erom vragen.","secPasswordOff":"Niet ingesteld: iedereen die de pagina kan openen kan op elke knop drukken. Maak een hash van een wachtwoord en voeg die toe.","passwordLabel":"Wachtwoord","makeHash":"Hash maken","secDocker":"Docker","secDockerSocket":"De Docker-socket is gekoppeld: het dashboard en elke widget kunnen de hele Docker-API gebruiken, ook met :ro. Een docker-socket-proxy met CONTAINERS=1 is veiliger.","secDockerProxy":"Docker via {url}.","secDockerNone":"Geen Docker: containerstatus en discovery staan uit.","composeLines":"Voeg toe aan de environment van het dashboard en maak de container opnieuw aan:","nothingToAdd":"Niets toe te voegen.","copy":"Kopiëren","copied":"Gekopieerd","doneText":"Het dashboard schrijft deze bestanden in zijn configmap:","write":"Configuratie schrijven","writing":"Schrijven…","exists":"Bestaat al: {list}. Er is niets geschreven.","failed":"Schrijven mislukt: {error}","fromHomepage":"van homepage","services":"{count} services"},
  fr: {"heading":"Configurer votre tableau de bord","intro":"Quelques étapes, et le tableau de bord écrit sa configuration pour vous. Tout reste modifiable ensuite dans ses fichiers YAML.","stepBasics":"Bases","stepServices":"Services","stepHomepage":"Depuis homepage","stepSecurity":"Sécurité","stepDone":"Terminé","next":"Suivant","back":"Retour","skipSetup":"Passer la configuration : commencer avec un tableau de bord vide","codeTitle":"Saisissez le code de configuration","codeText":"Vous n’êtes pas sur le réseau local : la configuration demande le code du journal du tableau de bord : docker logs dashboard","codeLabel":"Code de configuration","codeSubmit":"Continuer","codeWrong":"Code incorrect","wait":"Trop d’essais ; attendez {seconds} s","basicsText":"L’apparence de la page.","titleLabel":"Titre","languageLabel":"Langue","themeLabel":"Thème","themeAuto":"Suivre le système","themeDark":"Sombre","themeLight":"Clair","colorLabel":"Couleur","servicesText":"Les conteneurs en cours d’exécution, avec le widget qui convient à chacun. Cochez ceux que vous voulez sur la page et remplissez ce dont un widget a besoin.","scanning":"Recherche des conteneurs…","noDocker":"Docker introuvable. Montez le socket Docker (ou un proxy de socket) pour trouver les conteneurs, ou ajoutez des services à la main.","discovered":"déjà sur la page, grâce à ses labels","noWidget":"pas de widget, un lien seulement","addService":"Ajouter un service à la main","nameLabel":"Nom","groupLabel":"Groupe","linkLabel":"Lien","widgetLabel":"Widget","none":"Aucun","moreOptions":"Plus d’options","test":"Tester","testing":"Test…","works":"Fonctionne","remove":"Retirer","newService":"Nouveau service","homepageText":"Vous venez de homepage ? Choisissez ses fichiers de configuration (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Ils sont repris tels quels, à la place de ce que les étapes précédentes écriraient.","chooseFiles":"Choisir des fichiers","check":"Vérifier","importSummary":"{services} services, {bookmarks} favoris, {header} widgets d’en-tête","unknownWidgets":"Widgets sans correspondance : {list}","importUse":"Utiliser ces fichiers","importUsed":"Ces fichiers sont utilisés","importDrop":"Ne pas les utiliser","notHomepage":"Aucun n’est un fichier de homepage : {list}","securityText":"Ce sont des réglages du conteneur (son environnement dans compose) ; la configuration indique les lignes à ajouter.","secHosts":"Hôtes autorisés","secHostsIp":"Vous avez ouvert le tableau de bord par son adresse IP, ce qui fonctionne toujours. Ouvert par un nom, ce nom doit figurer dans DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} est autorisé.","secHostsMissing":"{host} n’est pas dans DASHBOARD_ALLOWED_HOSTS : après la configuration, la page ne répond à ce nom qu’une fois ajouté.","secPassword":"Mot de passe des actions","secPasswordOn":"Défini : les boutons qui exécutent quelque chose peuvent le demander.","secPasswordOff":"Non défini : quiconque peut ouvrir la page peut appuyer sur chaque bouton. Créez le hachage d’un mot de passe et ajoutez-le.","passwordLabel":"Mot de passe","makeHash":"Créer le hachage","secDocker":"Docker","secDockerSocket":"Le socket Docker est monté : le tableau de bord et chaque widget peuvent utiliser toute l’API Docker, même avec :ro. Un docker-socket-proxy avec CONTAINERS=1 est plus sûr.","secDockerProxy":"Docker via {url}.","secDockerNone":"Pas de Docker : l’état des conteneurs et la découverte sont désactivés.","composeLines":"Ajoutez à l’environnement du tableau de bord, puis recréez le conteneur :","nothingToAdd":"Rien à ajouter.","copy":"Copier","copied":"Copié","doneText":"Le tableau de bord écrit ces fichiers dans son dossier de configuration :","write":"Écrire la configuration","writing":"Écriture…","exists":"Existe déjà : {list}. Rien n’a été écrit.","failed":"Écriture impossible : {error}","fromHomepage":"depuis homepage","services":"{count} services"},
  de: {"heading":"Dashboard einrichten","intro":"Ein paar Schritte, und das Dashboard schreibt seine Konfiguration für dich. Alles lässt sich später in den YAML-Dateien ändern.","stepBasics":"Grundlagen","stepServices":"Dienste","stepHomepage":"Von homepage","stepSecurity":"Sicherheit","stepDone":"Fertig","next":"Weiter","back":"Zurück","skipSetup":"Einrichtung überspringen: mit einem leeren Dashboard beginnen","codeTitle":"Einrichtungscode eingeben","codeText":"Du bist nicht im lokalen Netz, daher fragt die Einrichtung nach dem Code aus dem Log des Dashboards: docker logs dashboard","codeLabel":"Einrichtungscode","codeSubmit":"Weiter","codeWrong":"Falscher Code","wait":"Zu viele Versuche; warte {seconds} s","basicsText":"Wie die Seite aussieht.","titleLabel":"Titel","languageLabel":"Sprache","themeLabel":"Design","themeAuto":"System folgen","themeDark":"Dunkel","themeLight":"Hell","colorLabel":"Farbe","servicesText":"Die laufenden Container, jeweils mit dem passenden Widget. Hake an, was auf die Seite soll, und fülle aus, was ein Widget braucht.","scanning":"Container werden gesucht…","noDocker":"Kein Docker gefunden. Binde den Docker-Socket (oder einen Socket-Proxy) ein, um Container zu finden, oder füge Dienste von Hand hinzu.","discovered":"schon auf der Seite, über seine Labels","noWidget":"kein Widget, nur ein Link","addService":"Dienst von Hand hinzufügen","nameLabel":"Name","groupLabel":"Gruppe","linkLabel":"Link","widgetLabel":"Widget","none":"Keins","moreOptions":"Weitere Optionen","test":"Testen","testing":"Teste…","works":"Funktioniert","remove":"Entfernen","newService":"Neuer Dienst","homepageText":"Kommst du von homepage? Wähle dessen Konfigurationsdateien (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Sie werden übernommen, wie sie sind, statt dessen, was die vorigen Schritte schreiben würden.","chooseFiles":"Dateien wählen","check":"Prüfen","importSummary":"{services} Dienste, {bookmarks} Lesezeichen, {header} Header-Widgets","unknownWidgets":"Widgets ohne Treffer: {list}","importUse":"Diese Dateien verwenden","importUsed":"Diese Dateien werden verwendet","importDrop":"Nicht verwenden","notHomepage":"Keine davon ist eine homepage-Datei: {list}","securityText":"Das sind Einstellungen des Containers (seine Umgebung in compose); die Einrichtung zeigt die Zeilen zum Hinzufügen.","secHosts":"Erlaubte Hosts","secHostsIp":"Du hast das Dashboard über seine IP-Adresse geöffnet, das funktioniert immer. Über einen Namen geöffnet, muss dieser in DASHBOARD_ALLOWED_HOSTS stehen.","secHostsOk":"{host} ist erlaubt.","secHostsMissing":"{host} steht nicht in DASHBOARD_ALLOWED_HOSTS: nach der Einrichtung antwortet die Seite unter diesem Namen erst, wenn er dort steht.","secPassword":"Aktionspasswort","secPasswordOn":"Gesetzt: Schaltflächen, die etwas ausführen, können danach fragen.","secPasswordOff":"Nicht gesetzt: Wer die Seite öffnen kann, kann jede Schaltfläche drücken. Erzeuge den Hash eines Passworts und füge ihn hinzu.","passwordLabel":"Passwort","makeHash":"Hash erzeugen","secDocker":"Docker","secDockerSocket":"Der Docker-Socket ist eingebunden: Das Dashboard und jedes Widget können die ganze Docker-API nutzen, auch mit :ro. Ein docker-socket-proxy mit CONTAINERS=1 ist sicherer.","secDockerProxy":"Docker über {url}.","secDockerNone":"Kein Docker: Containerstatus und Erkennung sind aus.","composeLines":"Zur Umgebung des Dashboards hinzufügen, dann den Container neu erstellen:","nothingToAdd":"Nichts hinzuzufügen.","copy":"Kopieren","copied":"Kopiert","doneText":"Das Dashboard schreibt diese Dateien in seinen Konfigurationsordner:","write":"Konfiguration schreiben","writing":"Schreibe…","exists":"Schon vorhanden: {list}. Es wurde nichts geschrieben.","failed":"Schreiben fehlgeschlagen: {error}","fromHomepage":"von homepage","services":"{count} Dienste"},
  es: {"heading":"Configura tu panel","intro":"Unos pocos pasos, y el panel escribe su configuración por ti. Todo se puede cambiar después en sus archivos YAML.","stepBasics":"Básico","stepServices":"Servicios","stepHomepage":"Desde homepage","stepSecurity":"Seguridad","stepDone":"Listo","next":"Siguiente","back":"Atrás","skipSetup":"Omitir la configuración: empezar con un panel vacío","codeTitle":"Introduce el código de configuración","codeText":"No estás en la red local, así que la configuración pide el código del registro del panel: docker logs dashboard","codeLabel":"Código de configuración","codeSubmit":"Continuar","codeWrong":"Código incorrecto","wait":"Demasiados intentos; espera {seconds} s","basicsText":"Cómo se ve la página.","titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir al sistema","themeDark":"Oscuro","themeLight":"Claro","colorLabel":"Color","servicesText":"Los contenedores en ejecución, con el widget que encaja con cada uno. Marca los que quieras en la página y rellena lo que necesita cada widget.","scanning":"Buscando contenedores…","noDocker":"No se encontró Docker. Monta el socket de Docker (o un proxy de socket) para encontrar contenedores, o añade servicios a mano.","discovered":"ya está en la página, por sus etiquetas","noWidget":"sin widget, solo un enlace","addService":"Añadir un servicio a mano","nameLabel":"Nombre","groupLabel":"Grupo","linkLabel":"Enlace","widgetLabel":"Widget","none":"Ninguno","moreOptions":"Más opciones","test":"Probar","testing":"Probando…","works":"Funciona","remove":"Quitar","newService":"Servicio nuevo","homepageText":"¿Vienes de homepage? Elige sus archivos de configuración (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Se adoptan tal cual, en lugar de lo que escribirían los pasos anteriores.","chooseFiles":"Elegir archivos","check":"Comprobar","importSummary":"{services} servicios, {bookmarks} marcadores, {header} widgets de cabecera","unknownWidgets":"Widgets sin coincidencia: {list}","importUse":"Usar estos archivos","importUsed":"Se usan estos archivos","importDrop":"No usarlos","notHomepage":"Ninguno es un archivo de homepage: {list}","securityText":"Son ajustes del contenedor (su entorno en compose); la configuración muestra las líneas que añadir.","secHosts":"Hosts permitidos","secHostsIp":"Abriste el panel por su dirección IP, que siempre funciona. Si lo abres por un nombre, ese nombre debe estar en DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} está permitido.","secHostsMissing":"{host} no está en DASHBOARD_ALLOWED_HOSTS: tras la configuración, la página solo responde a ese nombre cuando esté.","secPassword":"Contraseña de acciones","secPasswordOn":"Configurada: los botones que ejecutan algo pueden pedirla.","secPasswordOff":"Sin configurar: cualquiera que pueda abrir la página puede pulsar cada botón. Crea el hash de una contraseña y añádelo.","passwordLabel":"Contraseña","makeHash":"Crear el hash","secDocker":"Docker","secDockerSocket":"El socket de Docker está montado: el panel y cada widget pueden usar toda la API de Docker, también con :ro. Un docker-socket-proxy con CONTAINERS=1 es más seguro.","secDockerProxy":"Docker a través de {url}.","secDockerNone":"Sin Docker: el estado de los contenedores y el descubrimiento están desactivados.","composeLines":"Añade al entorno del panel y vuelve a crear el contenedor:","nothingToAdd":"Nada que añadir.","copy":"Copiar","copied":"Copiado","doneText":"El panel escribe estos archivos en su carpeta de configuración:","write":"Escribir la configuración","writing":"Escribiendo…","exists":"Ya existe: {list}. No se escribió nada.","failed":"No se pudo escribir: {error}","fromHomepage":"desde homepage","services":"{count} servicios"},
  ca: {"heading":"Configura el tauler","intro":"Uns quants passos, i el tauler escriu la seva configuració per tu. Ho pots canviar tot després als fitxers YAML.","stepBasics":"Bàsic","stepServices":"Serveis","stepHomepage":"Des de homepage","stepSecurity":"Seguretat","stepDone":"Fet","next":"Següent","back":"Enrere","skipSetup":"Omet la configuració: comença amb un tauler buit","codeTitle":"Introdueix el codi de configuració","codeText":"No ets a la xarxa local, així que la configuració demana el codi del registre del tauler: docker logs dashboard","codeLabel":"Codi de configuració","codeSubmit":"Continua","codeWrong":"Codi incorrecte","wait":"Massa intents; espera {seconds} s","basicsText":"Com es veu la pàgina.","titleLabel":"Títol","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Segueix el sistema","themeDark":"Fosc","themeLight":"Clar","colorLabel":"Color","servicesText":"Els contenidors en marxa, amb el giny que encaixa amb cadascun. Marca els que vulguis a la pàgina i omple el que necessita cada giny.","scanning":"Cercant contenidors…","noDocker":"No s’ha trobat Docker. Munta el sòcol de Docker (o un proxy de sòcol) per trobar contenidors, o afegeix serveis a mà.","discovered":"ja és a la pàgina, per les seves etiquetes","noWidget":"sense giny, només un enllaç","addService":"Afegeix un servei a mà","nameLabel":"Nom","groupLabel":"Grup","linkLabel":"Enllaç","widgetLabel":"Giny","none":"Cap","moreOptions":"Més opcions","test":"Prova","testing":"Provant…","works":"Funciona","remove":"Treu","newService":"Servei nou","homepageText":"Vens de homepage? Tria els seus fitxers de configuració (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). S’adopten tal com són, en lloc del que escriurien els passos anteriors.","chooseFiles":"Tria fitxers","check":"Comprova","importSummary":"{services} serveis, {bookmarks} adreces d’interès, {header} ginys de capçalera","unknownWidgets":"Ginys sense coincidència: {list}","importUse":"Fes servir aquests fitxers","importUsed":"Es fan servir aquests fitxers","importDrop":"No els facis servir","notHomepage":"Cap és un fitxer de homepage: {list}","securityText":"Són paràmetres del contenidor (el seu entorn a compose); la configuració mostra les línies que cal afegir.","secHosts":"Amfitrions permesos","secHostsIp":"Has obert el tauler per la seva adreça IP, que sempre funciona. Si l’obres per un nom, aquest nom ha de ser a DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} està permès.","secHostsMissing":"{host} no és a DASHBOARD_ALLOWED_HOSTS: després de la configuració, la pàgina només respon a aquest nom quan hi sigui.","secPassword":"Contrasenya de les accions","secPasswordOn":"Definida: els botons que executen alguna cosa la poden demanar.","secPasswordOff":"No definida: qualsevol que pugui obrir la pàgina pot prémer tots els botons. Crea el hash d’una contrasenya i afegeix-lo.","passwordLabel":"Contrasenya","makeHash":"Crea el hash","secDocker":"Docker","secDockerSocket":"El sòcol de Docker està muntat: el tauler i cada giny poden fer servir tota l’API de Docker, també amb :ro. Un docker-socket-proxy amb CONTAINERS=1 és més segur.","secDockerProxy":"Docker a través de {url}.","secDockerNone":"Sense Docker: l’estat dels contenidors i el descobriment estan desactivats.","composeLines":"Afegeix a l’entorn del tauler i torna a crear el contenidor:","nothingToAdd":"Res a afegir.","copy":"Copia","copied":"Copiat","doneText":"El tauler escriu aquests fitxers a la seva carpeta de configuració:","write":"Escriu la configuració","writing":"Escrivint…","exists":"Ja existeix: {list}. No s’ha escrit res.","failed":"No s’ha pogut escriure: {error}","fromHomepage":"des de homepage","services":"{count} serveis"},
  he: {"heading":"הגדרת לוח המחוונים","intro":"כמה צעדים, ולוח המחוונים כותב את ההגדרות שלו בשבילך. אפשר לשנות הכול אחר כך בקובצי ה־YAML.","stepBasics":"בסיס","stepServices":"שירותים","stepHomepage":"מ־homepage","stepSecurity":"אבטחה","stepDone":"סיום","next":"הבא","back":"חזרה","skipSetup":"דילוג על ההגדרה: להתחיל עם לוח ריק","codeTitle":"נא להזין את קוד ההגדרה","codeText":"אינך ברשת המקומית, ולכן ההגדרה מבקשת את הקוד מיומן לוח המחוונים: docker logs dashboard","codeLabel":"קוד הגדרה","codeSubmit":"המשך","codeWrong":"קוד שגוי","wait":"יותר מדי ניסיונות; יש להמתין {seconds} שנ׳","basicsText":"איך הדף נראה.","titleLabel":"כותרת","languageLabel":"שפה","themeLabel":"ערכת נושא","themeAuto":"לפי המערכת","themeDark":"כהה","themeLight":"בהיר","colorLabel":"צבע","servicesText":"המכולות הפועלות, כל אחת עם הווידג׳ט שמתאים לה. יש לסמן את מה שרוצים בדף ולמלא את מה שווידג׳ט צריך.","scanning":"מחפש מכולות…","noDocker":"לא נמצא Docker. יש לחבר את שקע Docker (או פרוקסי לשקע) כדי למצוא מכולות, או להוסיף שירותים ידנית.","discovered":"כבר בדף, דרך התוויות שלו","noWidget":"אין ווידג׳ט, קישור בלבד","addService":"הוספת שירות ידנית","nameLabel":"שם","groupLabel":"קבוצה","linkLabel":"קישור","widgetLabel":"ווידג׳ט","none":"ללא","moreOptions":"אפשרויות נוספות","test":"בדיקה","testing":"בודק…","works":"עובד","remove":"הסרה","newService":"שירות חדש","homepageText":"מגיעים מ־homepage? יש לבחור את קובצי ההגדרות שלו (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). הם נלקחים כמו שהם, במקום מה שהצעדים הקודמים היו כותבים.","chooseFiles":"בחירת קבצים","check":"בדיקה","importSummary":"{services} שירותים, {bookmarks} סימניות, {header} ווידג׳טים בכותרת","unknownWidgets":"ווידג׳טים ללא התאמה: {list}","importUse":"להשתמש בקבצים האלה","importUsed":"נעשה שימוש בקבצים האלה","importDrop":"לא להשתמש בהם","notHomepage":"אף אחד מהם אינו קובץ של homepage: {list}","securityText":"אלה הגדרות של המכולה (הסביבה שלה ב־compose); ההגדרה מציגה את השורות להוספה.","secHosts":"מארחים מורשים","secHostsIp":"פתחת את לוח המחוונים לפי כתובת ה־IP שלו, וזה תמיד עובד. כשפותחים לפי שם, השם צריך להופיע ב־DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} מורשה.","secHostsMissing":"{host} אינו ב־DASHBOARD_ALLOWED_HOSTS: אחרי ההגדרה הדף עונה לשם הזה רק כשהוא שם.","secPassword":"סיסמת פעולות","secPasswordOn":"מוגדרת: כפתורים שמריצים משהו יכולים לבקש אותה.","secPasswordOff":"לא מוגדרת: כל מי שיכול לפתוח את הדף יכול ללחוץ על כל כפתור. יש ליצור hash של סיסמה ולהוסיף אותו.","passwordLabel":"סיסמה","makeHash":"יצירת ה־hash","secDocker":"Docker","secDockerSocket":"שקע Docker מחובר: לוח המחוונים וכל ווידג׳ט יכולים להשתמש בכל ה־API של Docker, גם עם :ro. docker-socket-proxy עם CONTAINERS=1 בטוח יותר.","secDockerProxy":"Docker דרך {url}.","secDockerNone":"אין Docker: מצב המכולות והגילוי כבויים.","composeLines":"יש להוסיף לסביבה של לוח המחוונים ואז ליצור מחדש את המכולה:","nothingToAdd":"אין מה להוסיף.","copy":"העתקה","copied":"הועתק","doneText":"לוח המחוונים כותב את הקבצים האלה לתיקיית ההגדרות שלו:","write":"כתיבת ההגדרות","writing":"כותב…","exists":"כבר קיים: {list}. לא נכתב דבר.","failed":"הכתיבה נכשלה: {error}","fromHomepage":"מ־homepage","services":"{count} שירותים"},
  hr: {"heading":"Postavi nadzornu ploču","intro":"Nekoliko koraka, i nadzorna ploča sama zapiše svoju konfiguraciju. Sve se kasnije može promijeniti u YAML datotekama.","stepBasics":"Osnove","stepServices":"Usluge","stepHomepage":"Iz homepagea","stepSecurity":"Sigurnost","stepDone":"Gotovo","next":"Dalje","back":"Natrag","skipSetup":"Preskoči postavljanje: počni s praznom pločom","codeTitle":"Unesi kod za postavljanje","codeText":"Nisi u lokalnoj mreži, pa postavljanje traži kod iz zapisnika nadzorne ploče: docker logs dashboard","codeLabel":"Kod za postavljanje","codeSubmit":"Nastavi","codeWrong":"Pogrešan kod","wait":"Previše pokušaja; pričekaj {seconds} s","basicsText":"Kako stranica izgleda.","titleLabel":"Naslov","languageLabel":"Jezik","themeLabel":"Tema","themeAuto":"Prati sustav","themeDark":"Tamna","themeLight":"Svijetla","colorLabel":"Boja","servicesText":"Pokrenuti spremnici, svaki s widgetom koji mu odgovara. Označi što želiš na stranici i ispuni što widget treba.","scanning":"Tražim spremnike…","noDocker":"Docker nije pronađen. Montiraj Docker socket (ili socket proxy) za pronalazak spremnika, ili dodaj usluge ručno.","discovered":"već je na stranici, preko svojih oznaka","noWidget":"bez widgeta, samo poveznica","addService":"Dodaj uslugu ručno","nameLabel":"Naziv","groupLabel":"Grupa","linkLabel":"Poveznica","widgetLabel":"Widget","none":"Nijedan","moreOptions":"Više opcija","test":"Testiraj","testing":"Testiram…","works":"Radi","remove":"Ukloni","newService":"Nova usluga","homepageText":"Dolaziš iz homepagea? Odaberi njegove konfiguracijske datoteke (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Preuzimaju se kakve jesu, umjesto onoga što bi zapisali prethodni koraci.","chooseFiles":"Odaberi datoteke","check":"Provjeri","importSummary":"{services} usluga, {bookmarks} oznaka, {header} widgeta zaglavlja","unknownWidgets":"Widgeti bez podudaranja: {list}","importUse":"Koristi ove datoteke","importUsed":"Koriste se ove datoteke","importDrop":"Ne koristi ih","notHomepage":"Nijedna nije datoteka homepagea: {list}","securityText":"Ovo su postavke spremnika (njegovo okruženje u composeu); postavljanje prikazuje retke za dodati.","secHosts":"Dopušteni hostovi","secHostsIp":"Ploču si otvorio preko IP adrese, što uvijek radi. Kad je otvoriš preko imena, to ime mora biti u DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} je dopušten.","secHostsMissing":"{host} nije u DASHBOARD_ALLOWED_HOSTS: nakon postavljanja stranica odgovara na to ime tek kad bude ondje.","secPassword":"Lozinka za radnje","secPasswordOn":"Postavljena: gumbi koji nešto pokreću mogu je tražiti.","secPasswordOff":"Nije postavljena: svatko tko može otvoriti stranicu može pritisnuti svaki gumb. Napravi hash lozinke i dodaj ga.","passwordLabel":"Lozinka","makeHash":"Napravi hash","secDocker":"Docker","secDockerSocket":"Docker socket je montiran: ploča i svaki widget mogu koristiti cijeli Docker API, i s :ro. docker-socket-proxy s CONTAINERS=1 je sigurniji.","secDockerProxy":"Docker preko {url}.","secDockerNone":"Nema Dockera: stanje spremnika i otkrivanje su isključeni.","composeLines":"Dodaj u okruženje ploče, pa ponovno stvori spremnik:","nothingToAdd":"Nema se što dodati.","copy":"Kopiraj","copied":"Kopirano","doneText":"Ploča zapisuje ove datoteke u svoju mapu konfiguracije:","write":"Zapiši konfiguraciju","writing":"Zapisujem…","exists":"Već postoji: {list}. Ništa nije zapisano.","failed":"Zapisivanje nije uspjelo: {error}","fromHomepage":"iz homepagea","services":"{count} usluga"},
  hu: {"heading":"Az irányítópult beállítása","intro":"Néhány lépés, és az irányítópult megírja helyetted a beállításait. Később mindent módosíthatsz a YAML-fájlokban.","stepBasics":"Alapok","stepServices":"Szolgáltatások","stepHomepage":"A homepage-ből","stepSecurity":"Biztonság","stepDone":"Kész","next":"Tovább","back":"Vissza","skipSetup":"Beállítás kihagyása: üres irányítópulttal kezdés","codeTitle":"Add meg a beállítási kódot","codeText":"Nem a helyi hálózaton vagy, ezért a beállítás az irányítópult naplójában lévő kódot kéri: docker logs dashboard","codeLabel":"Beállítási kód","codeSubmit":"Tovább","codeWrong":"Hibás kód","wait":"Túl sok próbálkozás; várj {seconds} mp-et","basicsText":"Hogyan néz ki az oldal.","titleLabel":"Cím","languageLabel":"Nyelv","themeLabel":"Téma","themeAuto":"Rendszer szerint","themeDark":"Sötét","themeLight":"Világos","colorLabel":"Szín","servicesText":"A futó konténerek, mindegyik a hozzá illő widgettel. Jelöld be, amit az oldalon szeretnél, és töltsd ki, amire egy widgetnek szüksége van.","scanning":"Konténerek keresése…","noDocker":"Nem található Docker. Csatold a Docker socketet (vagy egy socket proxyt) a konténerek kereséséhez, vagy adj hozzá szolgáltatásokat kézzel.","discovered":"már az oldalon van, a címkéi révén","noWidget":"nincs widget, csak egy link","addService":"Szolgáltatás kézi hozzáadása","nameLabel":"Név","groupLabel":"Csoport","linkLabel":"Link","widgetLabel":"Widget","none":"Nincs","moreOptions":"További beállítások","test":"Teszt","testing":"Tesztelés…","works":"Működik","remove":"Eltávolítás","newService":"Új szolgáltatás","homepageText":"A homepage-ről jössz? Válaszd ki a beállítófájljait (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Változatlanul átvesszük őket, annak helyére, amit az előző lépések írnának.","chooseFiles":"Fájlok kiválasztása","check":"Ellenőrzés","importSummary":"{services} szolgáltatás, {bookmarks} könyvjelző, {header} fejléc-widget","unknownWidgets":"Egyezés nélküli widgetek: {list}","importUse":"Ezek a fájlok legyenek","importUsed":"Ezeket a fájlokat használjuk","importDrop":"Ne használjuk őket","notHomepage":"Egyik sem homepage-fájl: {list}","securityText":"Ezek a konténer beállításai (a környezete a compose-ban); a beállítás megmutatja a hozzáadandó sorokat.","secHosts":"Engedélyezett hostok","secHostsIp":"Az IP-címével nyitottad meg az irányítópultot, ez mindig működik. Ha névvel nyitod meg, annak a névnek a DASHBOARD_ALLOWED_HOSTS-ban kell lennie.","secHostsOk":"{host} engedélyezett.","secHostsMissing":"{host} nincs a DASHBOARD_ALLOWED_HOSTS-ban: a beállítás után az oldal csak akkor válaszol erre a névre, ha ott lesz.","secPassword":"Műveleti jelszó","secPasswordOn":"Beállítva: a valamit futtató gombok kérhetik.","secPasswordOff":"Nincs beállítva: aki meg tudja nyitni az oldalt, minden gombot megnyomhat. Készíts hasht egy jelszóból, és add hozzá.","passwordLabel":"Jelszó","makeHash":"Hash készítése","secDocker":"Docker","secDockerSocket":"A Docker socket csatolva van: az irányítópult és minden widget a teljes Docker API-t használhatja, :ro-val is. Egy docker-socket-proxy CONTAINERS=1 beállítással biztonságosabb.","secDockerProxy":"Docker ezen keresztül: {url}.","secDockerNone":"Nincs Docker: a konténerállapot és a felderítés ki van kapcsolva.","composeLines":"Add hozzá az irányítópult környezetéhez, majd hozd létre újra a konténert:","nothingToAdd":"Nincs mit hozzáadni.","copy":"Másolás","copied":"Másolva","doneText":"Az irányítópult ezeket a fájlokat írja a beállítási mappájába:","write":"Beállítások írása","writing":"Írás…","exists":"Már létezik: {list}. Semmi sem lett írva.","failed":"Az írás nem sikerült: {error}","fromHomepage":"a homepage-ből","services":"{count} szolgáltatás"},
  it: {"heading":"Configura la tua dashboard","intro":"Pochi passi, e la dashboard scrive la sua configurazione per te. Potrai cambiare tutto dopo nei file YAML.","stepBasics":"Base","stepServices":"Servizi","stepHomepage":"Da homepage","stepSecurity":"Sicurezza","stepDone":"Fatto","next":"Avanti","back":"Indietro","skipSetup":"Salta la configurazione: inizia con una dashboard vuota","codeTitle":"Inserisci il codice di configurazione","codeText":"Non sei sulla rete locale, quindi la configurazione chiede il codice dal log della dashboard: docker logs dashboard","codeLabel":"Codice di configurazione","codeSubmit":"Continua","codeWrong":"Codice errato","wait":"Troppi tentativi; attendi {seconds} s","basicsText":"L’aspetto della pagina.","titleLabel":"Titolo","languageLabel":"Lingua","themeLabel":"Tema","themeAuto":"Segui il sistema","themeDark":"Scuro","themeLight":"Chiaro","colorLabel":"Colore","servicesText":"I container in esecuzione, ciascuno con il widget adatto. Spunta quelli che vuoi nella pagina e compila ciò che serve a un widget.","scanning":"Ricerca dei container…","noDocker":"Docker non trovato. Monta il socket di Docker (o un proxy del socket) per trovare i container, oppure aggiungi i servizi a mano.","discovered":"già nella pagina, tramite le sue etichette","noWidget":"nessun widget, solo un link","addService":"Aggiungi un servizio a mano","nameLabel":"Nome","groupLabel":"Gruppo","linkLabel":"Link","widgetLabel":"Widget","none":"Nessuno","moreOptions":"Altre opzioni","test":"Prova","testing":"Prova in corso…","works":"Funziona","remove":"Rimuovi","newService":"Nuovo servizio","homepageText":"Arrivi da homepage? Scegli i suoi file di configurazione (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Vengono ripresi così come sono, al posto di ciò che scriverebbero i passi precedenti.","chooseFiles":"Scegli file","check":"Controlla","importSummary":"{services} servizi, {bookmarks} segnalibri, {header} widget dell’intestazione","unknownWidgets":"Widget senza corrispondenza: {list}","importUse":"Usa questi file","importUsed":"Vengono usati questi file","importDrop":"Non usarli","notHomepage":"Nessuno è un file di homepage: {list}","securityText":"Sono impostazioni del container (il suo ambiente in compose); la configurazione mostra le righe da aggiungere.","secHosts":"Host consentiti","secHostsIp":"Hai aperto la dashboard dal suo indirizzo IP, che funziona sempre. Se la apri con un nome, quel nome deve essere in DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} è consentito.","secHostsMissing":"{host} non è in DASHBOARD_ALLOWED_HOSTS: dopo la configurazione la pagina risponde a quel nome solo quando ci sarà.","secPassword":"Password delle azioni","secPasswordOn":"Impostata: i pulsanti che eseguono qualcosa possono chiederla.","secPasswordOff":"Non impostata: chiunque possa aprire la pagina può premere ogni pulsante. Crea l’hash di una password e aggiungilo.","passwordLabel":"Password","makeHash":"Crea l’hash","secDocker":"Docker","secDockerSocket":"Il socket di Docker è montato: la dashboard e ogni widget possono usare tutta l’API di Docker, anche con :ro. Un docker-socket-proxy con CONTAINERS=1 è più sicuro.","secDockerProxy":"Docker tramite {url}.","secDockerNone":"Niente Docker: lo stato dei container e il rilevamento sono disattivati.","composeLines":"Aggiungi all’ambiente della dashboard, poi ricrea il container:","nothingToAdd":"Niente da aggiungere.","copy":"Copia","copied":"Copiato","doneText":"La dashboard scrive questi file nella sua cartella di configurazione:","write":"Scrivi la configurazione","writing":"Scrittura…","exists":"Esiste già: {list}. Non è stato scritto nulla.","failed":"Scrittura non riuscita: {error}","fromHomepage":"da homepage","services":"{count} servizi"},
  'nb-NO': {"heading":"Sett opp dashbordet","intro":"Noen få trinn, så skriver dashbordet konfigurasjonen for deg. Alt kan endres senere i YAML-filene.","stepBasics":"Grunnleggende","stepServices":"Tjenester","stepHomepage":"Fra homepage","stepSecurity":"Sikkerhet","stepDone":"Ferdig","next":"Neste","back":"Tilbake","skipSetup":"Hopp over oppsettet: start med et tomt dashbord","codeTitle":"Skriv inn oppsettkoden","codeText":"Du er ikke på det lokale nettet, så oppsettet ber om koden fra dashbordets logg: docker logs dashboard","codeLabel":"Oppsettkode","codeSubmit":"Fortsett","codeWrong":"Feil kode","wait":"For mange forsøk; vent {seconds} s","basicsText":"Hvordan siden ser ut.","titleLabel":"Tittel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Følg systemet","themeDark":"Mørkt","themeLight":"Lyst","colorLabel":"Farge","servicesText":"De kjørende containerne, hver med widgeten som passer. Kryss av det du vil ha på siden, og fyll inn det en widget trenger.","scanning":"Leter etter containere…","noDocker":"Fant ikke Docker. Monter Docker-socketen (eller en socket-proxy) for å finne containere, eller legg til tjenester for hånd.","discovered":"allerede på siden, via etikettene sine","noWidget":"ingen widget, bare en lenke","addService":"Legg til en tjeneste for hånd","nameLabel":"Navn","groupLabel":"Gruppe","linkLabel":"Lenke","widgetLabel":"Widget","none":"Ingen","moreOptions":"Flere valg","test":"Test","testing":"Tester…","works":"Virker","remove":"Fjern","newService":"Ny tjeneste","homepageText":"Kommer du fra homepage? Velg konfigurasjonsfilene (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). De tas over som de er, i stedet for det de forrige trinnene ville skrive.","chooseFiles":"Velg filer","check":"Kontroller","importSummary":"{services} tjenester, {bookmarks} bokmerker, {header} toppwidgeter","unknownWidgets":"Widgeter uten treff: {list}","importUse":"Bruk disse filene","importUsed":"Disse filene brukes","importDrop":"Ikke bruk dem","notHomepage":"Ingen av dem er en homepage-fil: {list}","securityText":"Dette er innstillinger for containeren (miljøet i compose); oppsettet viser linjene som skal legges til.","secHosts":"Tillatte verter","secHostsIp":"Du åpnet dashbordet via IP-adressen, og det virker alltid. Åpnet via et navn må navnet stå i DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} er tillatt.","secHostsMissing":"{host} står ikke i DASHBOARD_ALLOWED_HOSTS: etter oppsettet svarer siden på det navnet først når det står der.","secPassword":"Handlingspassord","secPasswordOn":"Satt: knapper som kjører noe kan be om det.","secPasswordOff":"Ikke satt: alle som kan åpne siden kan trykke på alle knapper. Lag en hash av et passord og legg den til.","passwordLabel":"Passord","makeHash":"Lag hashen","secDocker":"Docker","secDockerSocket":"Docker-socketen er montert: dashbordet og hver widget kan bruke hele Docker-API-et, også med :ro. En docker-socket-proxy med CONTAINERS=1 er tryggere.","secDockerProxy":"Docker via {url}.","secDockerNone":"Ingen Docker: containerstatus og oppdaging er av.","composeLines":"Legg til i dashbordets miljø, og opprett containeren på nytt:","nothingToAdd":"Ingenting å legge til.","copy":"Kopier","copied":"Kopiert","doneText":"Dashbordet skriver disse filene i konfigurasjonsmappen sin:","write":"Skriv konfigurasjonen","writing":"Skriver…","exists":"Finnes allerede: {list}. Ingenting ble skrevet.","failed":"Kunne ikke skrive: {error}","fromHomepage":"fra homepage","services":"{count} tjenester"},
  pt: {"heading":"Configure o seu painel","intro":"Alguns passos, e o painel escreve a configuração por si. Pode alterar tudo depois nos ficheiros YAML.","stepBasics":"Básico","stepServices":"Serviços","stepHomepage":"Do homepage","stepSecurity":"Segurança","stepDone":"Concluído","next":"Seguinte","back":"Voltar","skipSetup":"Saltar a configuração: começar com um painel vazio","codeTitle":"Introduza o código de configuração","codeText":"Não está na rede local, por isso a configuração pede o código do registo do painel: docker logs dashboard","codeLabel":"Código de configuração","codeSubmit":"Continuar","codeWrong":"Código errado","wait":"Demasiadas tentativas; aguarde {seconds} s","basicsText":"O aspeto da página.","titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir o sistema","themeDark":"Escuro","themeLight":"Claro","colorLabel":"Cor","servicesText":"Os contentores em execução, cada um com o widget que lhe corresponde. Marque os que quer na página e preencha o que um widget precisa.","scanning":"A procurar contentores…","noDocker":"Docker não encontrado. Monte o socket do Docker (ou um proxy do socket) para encontrar contentores, ou adicione serviços à mão.","discovered":"já está na página, pelas suas etiquetas","noWidget":"sem widget, só uma ligação","addService":"Adicionar um serviço à mão","nameLabel":"Nome","groupLabel":"Grupo","linkLabel":"Ligação","widgetLabel":"Widget","none":"Nenhum","moreOptions":"Mais opções","test":"Testar","testing":"A testar…","works":"Funciona","remove":"Remover","newService":"Novo serviço","homepageText":"Vem do homepage? Escolha os ficheiros de configuração dele (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). São adotados tal como estão, em vez do que os passos anteriores escreveriam.","chooseFiles":"Escolher ficheiros","check":"Verificar","importSummary":"{services} serviços, {bookmarks} marcadores, {header} widgets do cabeçalho","unknownWidgets":"Widgets sem correspondência: {list}","importUse":"Usar estes ficheiros","importUsed":"Estes ficheiros são usados","importDrop":"Não os usar","notHomepage":"Nenhum é um ficheiro do homepage: {list}","securityText":"São definições do contentor (o seu ambiente no compose); a configuração mostra as linhas a acrescentar.","secHosts":"Hosts permitidos","secHostsIp":"Abriu o painel pelo endereço IP, o que funciona sempre. Aberto por um nome, esse nome tem de estar em DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} é permitido.","secHostsMissing":"{host} não está em DASHBOARD_ALLOWED_HOSTS: após a configuração, a página só responde a esse nome quando lá estiver.","secPassword":"Palavra-passe das ações","secPasswordOn":"Definida: os botões que executam algo podem pedi-la.","secPasswordOff":"Não definida: quem puder abrir a página pode premir todos os botões. Crie o hash de uma palavra-passe e acrescente-o.","passwordLabel":"Palavra-passe","makeHash":"Criar o hash","secDocker":"Docker","secDockerSocket":"O socket do Docker está montado: o painel e cada widget podem usar toda a API do Docker, mesmo com :ro. Um docker-socket-proxy com CONTAINERS=1 é mais seguro.","secDockerProxy":"Docker através de {url}.","secDockerNone":"Sem Docker: o estado dos contentores e a descoberta estão desligados.","composeLines":"Acrescente ao ambiente do painel e volte a criar o contentor:","nothingToAdd":"Nada a acrescentar.","copy":"Copiar","copied":"Copiado","doneText":"O painel escreve estes ficheiros na sua pasta de configuração:","write":"Escrever a configuração","writing":"A escrever…","exists":"Já existe: {list}. Nada foi escrito.","failed":"Não foi possível escrever: {error}","fromHomepage":"do homepage","services":"{count} serviços"},
  ru: {"heading":"Настройка панели","intro":"Несколько шагов, и панель сама запишет свою конфигурацию. Всё можно изменить позже в её YAML-файлах.","stepBasics":"Основное","stepServices":"Сервисы","stepHomepage":"Из homepage","stepSecurity":"Безопасность","stepDone":"Готово","next":"Далее","back":"Назад","skipSetup":"Пропустить настройку: начать с пустой панели","codeTitle":"Введите код настройки","codeText":"Вы не в локальной сети, поэтому настройка просит код из журнала панели: docker logs dashboard","codeLabel":"Код настройки","codeSubmit":"Продолжить","codeWrong":"Неверный код","wait":"Слишком много попыток; подождите {seconds} с","basicsText":"Как выглядит страница.","titleLabel":"Заголовок","languageLabel":"Язык","themeLabel":"Тема","themeAuto":"Как в системе","themeDark":"Тёмная","themeLight":"Светлая","colorLabel":"Цвет","servicesText":"Запущенные контейнеры, каждый с подходящим виджетом. Отметьте нужные на странице и заполните то, что нужно виджету.","scanning":"Поиск контейнеров…","noDocker":"Docker не найден. Подключите сокет Docker (или прокси сокета), чтобы найти контейнеры, или добавьте сервисы вручную.","discovered":"уже на странице, по своим меткам","noWidget":"без виджета, только ссылка","addService":"Добавить сервис вручную","nameLabel":"Название","groupLabel":"Группа","linkLabel":"Ссылка","widgetLabel":"Виджет","none":"Нет","moreOptions":"Другие параметры","test":"Проверить","testing":"Проверка…","works":"Работает","remove":"Удалить","newService":"Новый сервис","homepageText":"Переходите с homepage? Выберите его файлы конфигурации (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Они берутся как есть вместо того, что записали бы предыдущие шаги.","chooseFiles":"Выбрать файлы","check":"Проверить","importSummary":"сервисов: {services}, закладок: {bookmarks}, виджетов в шапке: {header}","unknownWidgets":"Виджеты без соответствия: {list}","importUse":"Использовать эти файлы","importUsed":"Используются эти файлы","importDrop":"Не использовать","notHomepage":"Ни один не является файлом homepage: {list}","securityText":"Это настройки контейнера (его окружение в compose); настройка показывает строки, которые нужно добавить.","secHosts":"Разрешённые хосты","secHostsIp":"Вы открыли панель по IP-адресу, это работает всегда. При открытии по имени это имя должно быть в DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} разрешён.","secHostsMissing":"{host} нет в DASHBOARD_ALLOWED_HOSTS: после настройки страница ответит на это имя, только когда оно там будет.","secPassword":"Пароль действий","secPasswordOn":"Задан: кнопки, которые что-то запускают, могут его спрашивать.","secPasswordOff":"Не задан: любой, кто может открыть страницу, может нажать любую кнопку. Создайте хеш пароля и добавьте его.","passwordLabel":"Пароль","makeHash":"Создать хеш","secDocker":"Docker","secDockerSocket":"Сокет Docker подключён: панель и любой виджет могут использовать весь API Docker, даже с :ro. docker-socket-proxy с CONTAINERS=1 безопаснее.","secDockerProxy":"Docker через {url}.","secDockerNone":"Нет Docker: статус контейнеров и обнаружение выключены.","composeLines":"Добавьте в окружение панели и пересоздайте контейнер:","nothingToAdd":"Добавлять нечего.","copy":"Копировать","copied":"Скопировано","doneText":"Панель запишет эти файлы в свою папку конфигурации:","write":"Записать конфигурацию","writing":"Запись…","exists":"Уже существует: {list}. Ничего не записано.","failed":"Не удалось записать: {error}","fromHomepage":"из homepage","services":"сервисов: {count}"},
  sv: {"heading":"Ställ in din instrumentpanel","intro":"Några få steg, så skriver instrumentpanelen sin konfiguration åt dig. Allt kan ändras senare i YAML-filerna.","stepBasics":"Grunder","stepServices":"Tjänster","stepHomepage":"Från homepage","stepSecurity":"Säkerhet","stepDone":"Klart","next":"Nästa","back":"Tillbaka","skipSetup":"Hoppa över inställningen: börja med en tom instrumentpanel","codeTitle":"Ange inställningskoden","codeText":"Du är inte på det lokala nätverket, så inställningen ber om koden från instrumentpanelens logg: docker logs dashboard","codeLabel":"Inställningskod","codeSubmit":"Fortsätt","codeWrong":"Fel kod","wait":"För många försök; vänta {seconds} s","basicsText":"Hur sidan ser ut.","titleLabel":"Titel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Följ systemet","themeDark":"Mörkt","themeLight":"Ljust","colorLabel":"Färg","servicesText":"De körande containrarna, var och en med widgeten som passar. Markera de du vill ha på sidan och fyll i det en widget behöver.","scanning":"Letar efter containrar…","noDocker":"Hittade inget Docker. Montera Docker-socketen (eller en socket-proxy) för att hitta containrar, eller lägg till tjänster för hand.","discovered":"redan på sidan, via sina etiketter","noWidget":"ingen widget, bara en länk","addService":"Lägg till en tjänst för hand","nameLabel":"Namn","groupLabel":"Grupp","linkLabel":"Länk","widgetLabel":"Widget","none":"Ingen","moreOptions":"Fler alternativ","test":"Testa","testing":"Testar…","works":"Fungerar","remove":"Ta bort","newService":"Ny tjänst","homepageText":"Kommer du från homepage? Välj dess konfigurationsfiler (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). De tas över som de är, i stället för det de tidigare stegen skulle skriva.","chooseFiles":"Välj filer","check":"Kontrollera","importSummary":"{services} tjänster, {bookmarks} bokmärken, {header} sidhuvudwidgetar","unknownWidgets":"Widgetar utan träff: {list}","importUse":"Använd de här filerna","importUsed":"De här filerna används","importDrop":"Använd dem inte","notHomepage":"Ingen av dem är en homepage-fil: {list}","securityText":"Det här är inställningar för containern (dess miljö i compose); inställningen visar raderna att lägga till.","secHosts":"Tillåtna värdar","secHostsIp":"Du öppnade instrumentpanelen via dess IP-adress, vilket alltid fungerar. Öppnad via ett namn måste namnet finnas i DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} är tillåten.","secHostsMissing":"{host} finns inte i DASHBOARD_ALLOWED_HOSTS: efter inställningen svarar sidan på det namnet först när det finns där.","secPassword":"Lösenord för åtgärder","secPasswordOn":"Inställt: knappar som kör något kan be om det.","secPasswordOff":"Inte inställt: alla som kan öppna sidan kan trycka på varje knapp. Gör en hash av ett lösenord och lägg till den.","passwordLabel":"Lösenord","makeHash":"Gör hashen","secDocker":"Docker","secDockerSocket":"Docker-socketen är monterad: instrumentpanelen och varje widget kan använda hela Docker-API:et, även med :ro. En docker-socket-proxy med CONTAINERS=1 är säkrare.","secDockerProxy":"Docker via {url}.","secDockerNone":"Inget Docker: containerstatus och upptäckt är avstängda.","composeLines":"Lägg till i instrumentpanelens miljö och skapa sedan om containern:","nothingToAdd":"Inget att lägga till.","copy":"Kopiera","copied":"Kopierat","doneText":"Instrumentpanelen skriver de här filerna i sin konfigurationsmapp:","write":"Skriv konfigurationen","writing":"Skriver…","exists":"Finns redan: {list}. Inget skrevs.","failed":"Kunde inte skriva: {error}","fromHomepage":"från homepage","services":"{count} tjänster"},
  vi: {"heading":"Thiết lập bảng điều khiển","intro":"Vài bước, và bảng điều khiển tự ghi cấu hình cho bạn. Sau này bạn có thể đổi mọi thứ trong các tệp YAML.","stepBasics":"Cơ bản","stepServices":"Dịch vụ","stepHomepage":"Từ homepage","stepSecurity":"Bảo mật","stepDone":"Xong","next":"Tiếp","back":"Quay lại","skipSetup":"Bỏ qua thiết lập: bắt đầu với bảng trống","codeTitle":"Nhập mã thiết lập","codeText":"Bạn không ở trong mạng nội bộ, nên phần thiết lập cần mã trong nhật ký của bảng điều khiển: docker logs dashboard","codeLabel":"Mã thiết lập","codeSubmit":"Tiếp tục","codeWrong":"Sai mã","wait":"Quá nhiều lần thử; chờ {seconds} giây","basicsText":"Giao diện của trang.","titleLabel":"Tiêu đề","languageLabel":"Ngôn ngữ","themeLabel":"Chủ đề","themeAuto":"Theo hệ thống","themeDark":"Tối","themeLight":"Sáng","colorLabel":"Màu","servicesText":"Các container đang chạy, mỗi cái với widget phù hợp. Đánh dấu những cái bạn muốn trên trang và điền những gì widget cần.","scanning":"Đang tìm container…","noDocker":"Không tìm thấy Docker. Gắn socket Docker (hoặc một proxy socket) để tìm container, hoặc thêm dịch vụ thủ công.","discovered":"đã có trên trang, nhờ nhãn của nó","noWidget":"không có widget, chỉ một liên kết","addService":"Thêm dịch vụ thủ công","nameLabel":"Tên","groupLabel":"Nhóm","linkLabel":"Liên kết","widgetLabel":"Widget","none":"Không","moreOptions":"Tùy chọn khác","test":"Kiểm tra","testing":"Đang kiểm tra…","works":"Hoạt động","remove":"Xóa","newService":"Dịch vụ mới","homepageText":"Bạn chuyển từ homepage? Chọn các tệp cấu hình của nó (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Chúng được giữ nguyên, thay cho những gì các bước trước sẽ ghi.","chooseFiles":"Chọn tệp","check":"Kiểm tra","importSummary":"{services} dịch vụ, {bookmarks} dấu trang, {header} widget đầu trang","unknownWidgets":"Widget không khớp: {list}","importUse":"Dùng các tệp này","importUsed":"Đang dùng các tệp này","importDrop":"Không dùng","notHomepage":"Không tệp nào là tệp của homepage: {list}","securityText":"Đây là thiết lập của container (môi trường của nó trong compose); phần thiết lập hiển thị các dòng cần thêm.","secHosts":"Máy chủ được phép","secHostsIp":"Bạn mở bảng điều khiển bằng địa chỉ IP, cách này luôn hoạt động. Khi mở bằng tên, tên đó phải có trong DASHBOARD_ALLOWED_HOSTS.","secHostsOk":"{host} được phép.","secHostsMissing":"{host} không có trong DASHBOARD_ALLOWED_HOSTS: sau khi thiết lập, trang chỉ trả lời tên đó khi nó được thêm vào.","secPassword":"Mật khẩu thao tác","secPasswordOn":"Đã đặt: các nút chạy lệnh có thể hỏi nó.","secPasswordOff":"Chưa đặt: ai mở được trang đều bấm được mọi nút. Tạo hash của một mật khẩu và thêm vào.","passwordLabel":"Mật khẩu","makeHash":"Tạo hash","secDocker":"Docker","secDockerSocket":"Socket Docker đã được gắn: bảng điều khiển và mọi widget có thể dùng toàn bộ API Docker, kể cả với :ro. Một docker-socket-proxy với CONTAINERS=1 an toàn hơn.","secDockerProxy":"Docker qua {url}.","secDockerNone":"Không có Docker: trạng thái container và tự phát hiện bị tắt.","composeLines":"Thêm vào môi trường của bảng điều khiển, rồi tạo lại container:","nothingToAdd":"Không có gì để thêm.","copy":"Sao chép","copied":"Đã sao chép","doneText":"Bảng điều khiển ghi các tệp này vào thư mục cấu hình của nó:","write":"Ghi cấu hình","writing":"Đang ghi…","exists":"Đã có: {list}. Không có gì được ghi.","failed":"Không ghi được: {error}","fromHomepage":"từ homepage","services":"{count} dịch vụ"},
  'zh-Hans': {"heading":"设置你的仪表板","intro":"几个步骤，仪表板就会为你写好配置。之后可以在 YAML 文件中修改所有内容。","stepBasics":"基本","stepServices":"服务","stepHomepage":"从 homepage 迁移","stepSecurity":"安全","stepDone":"完成","next":"下一步","back":"返回","skipSetup":"跳过设置：从空的仪表板开始","codeTitle":"输入设置码","codeText":"你不在本地网络中，因此设置需要仪表板日志中的设置码：docker logs dashboard","codeLabel":"设置码","codeSubmit":"继续","codeWrong":"设置码错误","wait":"尝试次数过多；请等待 {seconds} 秒","basicsText":"页面的外观。","titleLabel":"标题","languageLabel":"语言","themeLabel":"主题","themeAuto":"跟随系统","themeDark":"深色","themeLight":"浅色","colorLabel":"颜色","servicesText":"正在运行的容器，每个都配有合适的小组件。勾选想放到页面上的，并填写小组件需要的内容。","scanning":"正在查找容器…","noDocker":"未找到 Docker。挂载 Docker 套接字（或套接字代理）以查找容器，或手动添加服务。","discovered":"已通过标签显示在页面上","noWidget":"无小组件，仅链接","addService":"手动添加服务","nameLabel":"名称","groupLabel":"分组","linkLabel":"链接","widgetLabel":"小组件","none":"无","moreOptions":"更多选项","test":"测试","testing":"测试中…","works":"可用","remove":"移除","newService":"新服务","homepageText":"从 homepage 迁移？选择它的配置文件（services.yaml、settings.yaml、bookmarks.yaml、widgets.yaml、docker.yaml）。它们会按原样使用，替代前面步骤要写的内容。","chooseFiles":"选择文件","check":"检查","importSummary":"{services} 个服务，{bookmarks} 个书签，{header} 个页头小组件","unknownWidgets":"没有匹配的小组件：{list}","importUse":"使用这些文件","importUsed":"正在使用这些文件","importDrop":"不使用","notHomepage":"这些都不是 homepage 文件：{list}","securityText":"这些是容器的设置（compose 中的环境变量）；设置页会显示要添加的行。","secHosts":"允许的主机","secHostsIp":"你通过 IP 地址打开了仪表板，这总是可用。通过名称打开时，该名称必须在 DASHBOARD_ALLOWED_HOSTS 中。","secHostsOk":"{host} 已允许。","secHostsMissing":"{host} 不在 DASHBOARD_ALLOWED_HOSTS 中：设置完成后，只有加入后页面才会响应这个名称。","secPassword":"操作密码","secPasswordOn":"已设置：执行操作的按钮可以要求输入密码。","secPasswordOff":"未设置：任何能打开页面的人都能按下所有按钮。为密码生成哈希并添加。","passwordLabel":"密码","makeHash":"生成哈希","secDocker":"Docker","secDockerSocket":"已挂载 Docker 套接字：仪表板和每个小组件都能使用完整的 Docker API，即使是 :ro。使用 CONTAINERS=1 的 docker-socket-proxy 更安全。","secDockerProxy":"通过 {url} 使用 Docker。","secDockerNone":"没有 Docker：容器状态和自动发现已关闭。","composeLines":"添加到仪表板的环境变量中，然后重新创建容器：","nothingToAdd":"无需添加。","copy":"复制","copied":"已复制","doneText":"仪表板会把这些文件写入它的配置文件夹：","write":"写入配置","writing":"正在写入…","exists":"已存在：{list}。未写入任何内容。","failed":"无法写入：{error}","fromHomepage":"来自 homepage","services":"{count} 个服务"},
  'zh-Hant': {"heading":"設定你的儀表板","intro":"幾個步驟，儀表板就會為你寫好設定。之後可以在 YAML 檔案中修改所有內容。","stepBasics":"基本","stepServices":"服務","stepHomepage":"從 homepage 移轉","stepSecurity":"安全","stepDone":"完成","next":"下一步","back":"返回","skipSetup":"略過設定：從空的儀表板開始","codeTitle":"輸入設定碼","codeText":"你不在區域網路中，因此設定需要儀表板記錄中的設定碼：docker logs dashboard","codeLabel":"設定碼","codeSubmit":"繼續","codeWrong":"設定碼錯誤","wait":"嘗試次數過多；請等待 {seconds} 秒","basicsText":"頁面的外觀。","titleLabel":"標題","languageLabel":"語言","themeLabel":"主題","themeAuto":"跟隨系統","themeDark":"深色","themeLight":"淺色","colorLabel":"顏色","servicesText":"正在執行的容器，每個都配有合適的小工具。勾選想放到頁面上的，並填寫小工具需要的內容。","scanning":"正在尋找容器…","noDocker":"找不到 Docker。掛載 Docker socket（或 socket 代理）以尋找容器，或手動新增服務。","discovered":"已透過標籤顯示在頁面上","noWidget":"無小工具，僅連結","addService":"手動新增服務","nameLabel":"名稱","groupLabel":"群組","linkLabel":"連結","widgetLabel":"小工具","none":"無","moreOptions":"更多選項","test":"測試","testing":"測試中…","works":"可用","remove":"移除","newService":"新服務","homepageText":"從 homepage 移轉？選擇它的設定檔（services.yaml、settings.yaml、bookmarks.yaml、widgets.yaml、docker.yaml）。它們會原樣使用，取代前面步驟要寫的內容。","chooseFiles":"選擇檔案","check":"檢查","importSummary":"{services} 個服務，{bookmarks} 個書籤，{header} 個頁首小工具","unknownWidgets":"沒有對應的小工具：{list}","importUse":"使用這些檔案","importUsed":"正在使用這些檔案","importDrop":"不使用","notHomepage":"這些都不是 homepage 檔案：{list}","securityText":"這些是容器的設定（compose 中的環境變數）；設定頁會顯示要新增的行。","secHosts":"允許的主機","secHostsIp":"你透過 IP 位址開啟了儀表板，這一定可用。透過名稱開啟時，該名稱必須在 DASHBOARD_ALLOWED_HOSTS 中。","secHostsOk":"{host} 已允許。","secHostsMissing":"{host} 不在 DASHBOARD_ALLOWED_HOSTS 中：設定完成後，加入後頁面才會回應這個名稱。","secPassword":"操作密碼","secPasswordOn":"已設定：執行動作的按鈕可以要求輸入密碼。","secPasswordOff":"未設定：任何能開啟頁面的人都能按下所有按鈕。為密碼產生雜湊並加入。","passwordLabel":"密碼","makeHash":"產生雜湊","secDocker":"Docker","secDockerSocket":"已掛載 Docker socket：儀表板和每個小工具都能使用完整的 Docker API，即使是 :ro。使用 CONTAINERS=1 的 docker-socket-proxy 較安全。","secDockerProxy":"透過 {url} 使用 Docker。","secDockerNone":"沒有 Docker：容器狀態和自動探索已關閉。","composeLines":"加入儀表板的環境變數中，然後重新建立容器：","nothingToAdd":"無需新增。","copy":"複製","copied":"已複製","doneText":"儀表板會把這些檔案寫入它的設定資料夾：","write":"寫入設定","writing":"正在寫入…","exists":"已存在：{list}。未寫入任何內容。","failed":"無法寫入：{error}","fromHomepage":"來自 homepage","services":"{count} 個服務"},
};

let lang = 'en';
const t = (key, vars = {}) => String((I18N[lang] ?? {})[key] ?? I18N.en[key] ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));

function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c !== null && c !== undefined && c !== false) node.append(c);
  return node;
}

const state = {
  step: 0,
  settings: { title: 'Homelab', language: 'en', theme: 'auto', color: 'slate' },
  widgets: [],
  cards: null, // [{ on, name, group, href, container, server, image, discovered, type, options, result }]
  scanProblems: [],
  homepage: null, // { files: { name: text }, report, used }
  status: null,
  hash: null,
};
const STEPS = ['stepBasics', 'stepServices', 'stepHomepage', 'stepSecurity', 'stepDone'];

async function api(path, body) {
  const init = body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'dashboard' }, body: JSON.stringify(body) };
  const res = await fetch(`api/onboarding/${path}`, init);
  const out = await res.json();
  if (out?.needsCode) {
    showCode();
    throw new Error('code needed');
  }
  return out;
}

// ---------------------------------------------------------------- theme
function systemLight() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;
}
function applyTheme() {
  const shades = (PALETTES[state.settings.color] ?? PALETTES.slate).split(' ');
  SHADES.forEach((s, i) => document.documentElement.style.setProperty(`--t${s}`, shades[i]));
  const theme = state.settings.theme === 'auto' ? (systemLight() ? 'light' : 'dark') : state.settings.theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

// ---------------------------------------------------------------- frame
function render() {
  applyTheme();
  document.title = t('heading');
  document.getElementById('heading').textContent = t('heading');
  document.getElementById('intro').textContent = t('intro');
  const steps = document.getElementById('steps');
  steps.hidden = false;
  steps.replaceChildren(...STEPS.map((key, i) => el('li', { class: i < state.step ? 'done' : null, 'aria-current': i === state.step ? 'step' : null, text: `${i + 1}. ${t(key)}` })));
  const panel = document.getElementById('panel');
  panel.replaceChildren(...[renderBasics, renderServices, renderHomepage, renderSecurity, renderDone][state.step]().flat().filter((n) => n !== null && n !== undefined && n !== false));
  panel.querySelector('h2')?.focus?.();
}

function go(step) {
  state.step = step;
  render();
  window.scrollTo?.(0, 0);
}

function actions(...extra) {
  const right = el('div', { class: 'right' });
  if (state.step > 0) right.append(el('button', { type: 'button', text: t('back'), onclick: () => go(state.step - 1) }));
  if (state.step < STEPS.length - 1) right.append(el('button', { type: 'button', class: 'primary', text: t('next'), onclick: () => go(state.step + 1) }));
  return el('div', { class: 'actions' }, ...extra, right);
}

// ---------------------------------------------------------------- the code
function showCode(message = '') {
  document.getElementById('steps').hidden = true;
  const input = el('input', { type: 'text', id: 'setup-code', autocomplete: 'one-time-code', autocapitalize: 'characters', spellcheck: 'false', required: true });
  const status = el('p', { class: 'error', role: 'alert', text: message });
  const form = el('form', {
    onsubmit: async (e) => {
      e.preventDefault();
      const res = await fetch('api/onboarding/code', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'dashboard' }, body: JSON.stringify({ code: input.value }) });
      const out = await res.json();
      if (out.ok) return start();
      status.textContent = out.retryAfter ? t('wait', { seconds: out.retryAfter }) : t('codeWrong');
    },
  }, el('label', { for: 'setup-code', text: t('codeLabel') }), input, el('div', { class: 'actions' }, el('div', { class: 'right' }, el('button', { type: 'submit', class: 'primary', text: t('codeSubmit') }))));
  document.getElementById('panel').replaceChildren(el('h2', { text: t('codeTitle'), tabindex: '-1' }), el('p', { text: t('codeText') }), status, form);
  document.getElementById('heading').textContent = t('heading');
  input.focus();
}

// ---------------------------------------------------------------- 1. basics
function renderBasics() {
  const s = state.settings;
  const select = (id, value, entries, onchange) => el('select', { id, onchange: (e) => onchange(e.target.value) },
    ...entries.map(([v, label]) => el('option', { value: v, selected: v === value, text: label })));
  const swatches = el('div', { class: 'swatches', role: 'group', 'aria-label': t('colorLabel') }, ...Object.keys(PALETTES).map((name) => {
    const b = el('button', { type: 'button', class: 'swatch', title: name, 'aria-label': name, 'aria-pressed': String(name === s.color), onclick: () => { s.color = name; render(); } });
    b.style.background = PALETTES[name].split(' ')[5];
    return b;
  }));
  return [
    el('h2', { text: t('stepBasics'), tabindex: '-1' }),
    el('p', { class: 'muted', text: t('basicsText') }),
    el('div', { class: 'grid' },
      el('label', { for: 'title' }, t('titleLabel'), el('input', { type: 'text', id: 'title', value: s.title, maxlength: '100', oninput: (e) => { s.title = e.target.value; } })),
      el('label', { for: 'language' }, t('languageLabel'), select('language', s.language, Object.entries(LANGUAGE_NAMES), (v) => { s.language = v; lang = I18N[v] ? v : 'en'; render(); })),
      el('label', { for: 'theme' }, t('themeLabel'), select('theme', s.theme, [['auto', t('themeAuto')], ['dark', t('themeDark')], ['light', t('themeLight')]], (v) => { s.theme = v; render(); }))),
    el('div', {}, el('span', { class: 'muted', text: t('colorLabel') }), swatches),
    actions(el('button', { type: 'button', class: 'link', text: t('skipSetup'), onclick: () => finish(true) })),
  ];
}

// ---------------------------------------------------------------- 2. services
const widgetById = (id) => state.widgets.find((w) => w.id === id);

/** The options a widget starts with: its defaults, and the URL the scan found. */
function startOptions(widget, url) {
  const out = {};
  for (const [name, def] of Object.entries(widget?.options ?? {})) if (def.default !== undefined) out[name] = def.default;
  if (widget?.options?.url && url) out.url = url;
  return out;
}

async function scan() {
  state.cards = [];
  render();
  try {
    const out = await api('containers');
    state.scanProblems = out.problems ?? [];
    state.cards = out.containers.map((c) => {
      const widget = widgetById(c.widget);
      return {
        on: Boolean(widget) && !c.discovered, name: widget?.name ?? c.name, group: c.group, href: c.href ?? '', container: c.name, server: c.server,
        image: c.image, discovered: c.discovered, type: widget?.id ?? '', options: startOptions(widget, c.url), url: c.url,
      };
    });
    state.scanned = true;
  } catch {
    state.scanned = true;
  }
  if (state.step === 1) render();
}

/** An input for one widget option, by its type in widget.yaml. */
function optionField(card, name, def) {
  const id = `opt-${state.cards.indexOf(card)}-${name}`;
  const value = card.options[name];
  const set = (v) => { if (v === '' || v === undefined) delete card.options[name]; else card.options[name] = v; card.result = null; };
  let input;
  if (def.type === 'boolean') {
    input = el('input', { type: 'checkbox', id, checked: value === true, onchange: (e) => set(e.target.checked) });
    return el('label', { class: 'check', for: id }, input, name);
  }
  if (def.type === 'enum') {
    input = el('select', { id, onchange: (e) => set(e.target.value) }, el('option', { value: '', text: '' }), ...(def.values ?? []).map((v) => el('option', { value: String(v), selected: String(v) === String(value ?? ''), text: String(v) })));
  } else if (def.type === 'number') {
    input = el('input', { type: 'number', id, value: value ?? '', oninput: (e) => set(e.target.value === '' ? '' : Number(e.target.value)) });
  } else if (def.type === 'list') {
    input = el('input', { type: 'text', id, value: Array.isArray(value) ? value.join(', ') : '', oninput: (e) => set(e.target.value.trim() ? e.target.value.split(',').map((x) => x.trim()).filter(Boolean) : '') });
  } else {
    input = el('input', { type: def.secret ? 'password' : def.type === 'url' ? 'url' : 'text', id, value: value ?? '', autocomplete: def.secret ? 'off' : null, oninput: (e) => set(e.target.value) });
  }
  return el('label', { for: id }, `${name}${def.required ? ' *' : ''}`, input);
}

function renderCard(card) {
  const i = state.cards.indexOf(card);
  const widget = widgetById(card.type);
  const box = el('article', { class: `card${card.on ? ' on' : ''}` });
  const header = el('header', {},
    el('label', { class: 'check', for: `on-${i}` }, el('input', { type: 'checkbox', id: `on-${i}`, checked: card.on, onchange: (e) => { card.on = e.target.checked; render(); } }), card.name || t('newService')),
    card.image ? el('span', { class: 'image', text: card.image }) : null,
    card.discovered ? el('span', { class: 'muted', text: t('discovered') }) : !widget ? el('span', { class: 'muted', text: t('noWidget') }) : null);
  box.append(header);
  if (!card.on) return box;
  const result = el('span', { class: `result ${card.result?.ok ? 'ok' : card.result ? 'error' : ''}`, role: 'status', text: card.result?.text ?? '' });
  const opts = Object.entries(widget?.options ?? {});
  const body = el('div', { class: 'body' },
    el('div', { class: 'grid' },
      el('label', { for: `name-${i}` }, t('nameLabel'), el('input', { type: 'text', id: `name-${i}`, value: card.name, oninput: (e) => { card.name = e.target.value; } })),
      el('label', { for: `group-${i}` }, t('groupLabel'), el('input', { type: 'text', id: `group-${i}`, value: card.group, oninput: (e) => { card.group = e.target.value; } })),
      el('label', { for: `href-${i}` }, t('linkLabel'), el('input', { type: 'url', id: `href-${i}`, value: card.href, placeholder: 'http://', oninput: (e) => { card.href = e.target.value; } })),
      el('label', { for: `type-${i}` }, t('widgetLabel'), el('select', { id: `type-${i}`, onchange: (e) => { card.type = e.target.value; card.options = startOptions(widgetById(card.type), card.url); card.result = null; render(); } },
        el('option', { value: '', text: t('none') }), ...state.widgets.map((w) => el('option', { value: w.id, selected: w.id === card.type, text: w.name }))))),
    widget ? el('div', { class: 'grid' }, ...opts.filter(([, d]) => d.required).map(([n, d]) => optionField(card, n, d))) : null,
    widget && opts.some(([, d]) => !d.required) ? el('details', {}, el('summary', { text: t('moreOptions') }), el('div', { class: 'grid' }, ...opts.filter(([, d]) => !d.required).map(([n, d]) => optionField(card, n, d)))) : null,
    el('div', { class: 'row' },
      widget ? el('button', { type: 'button', text: t('test'), onclick: () => testCard(card, result) }) : null, result,
      card.image ? null : el('button', { type: 'button', class: 'link', text: t('remove'), onclick: () => { state.cards.splice(i, 1); render(); } })));
  box.append(body);
  return box;
}

async function testCard(card, result) {
  result.className = 'result';
  result.textContent = t('testing');
  try {
    const out = await api('test', { type: card.type, options: card.options });
    const text = out.ok ? `${t('works')}${out.blocks?.length ? `: ${out.blocks.map((b) => `${b.label} ${b.value ?? '–'}${b.unit ?? ''}`).join(', ')}` : ''}` : out.error;
    card.result = { ok: out.ok, text };
  } catch (err) {
    card.result = { ok: false, text: err.message };
  }
  result.className = `result ${card.result.ok ? 'ok' : 'error'}`;
  result.textContent = card.result.text;
}

function renderServices() {
  if (state.cards === null) queueMicrotask(scan);
  const list = state.cards ?? [];
  const noDocker = state.scanned && !list.some((c) => c.image);
  return [
    el('h2', { text: t('stepServices'), tabindex: '-1' }),
    el('p', { class: 'muted', text: t('servicesText') }),
    !state.scanned ? el('p', { class: 'muted', text: t('scanning') }) : null,
    noDocker ? el('p', { class: 'warn', text: t('noDocker') }) : null,
    ...state.scanProblems.map((m) => el('p', { class: 'error', text: m })),
    el('div', { class: 'cards' }, ...list.map(renderCard)),
    el('button', { type: 'button', text: t('addService'), onclick: () => { state.cards.push({ on: true, name: '', group: 'Services', href: '', type: '', options: {} }); render(); } }),
    actions(),
  ];
}

// ---------------------------------------------------------------- 3. homepage
function renderHomepage() {
  const h = state.homepage;
  const report = el('div', { role: 'status' });
  const input = el('input', { type: 'file', id: 'homepage-files', multiple: true, accept: '.yaml,.yml', class: 'sr-only', onchange: async (e) => {
    const files = {};
    const other = [];
    for (const f of e.target.files) {
      const name = f.name.replace(/\.yml$/, '.yaml');
      if (['services.yaml', 'settings.yaml', 'bookmarks.yaml', 'widgets.yaml', 'docker.yaml'].includes(name)) files[name] = await f.text();
      else other.push(f.name);
    }
    if (!Object.keys(files).length) {
      state.homepage = { error: t('notHomepage', { list: other.join(', ') }) };
      return render();
    }
    state.homepage = { files, report: await api('homepage', { files }), used: false };
    render();
  } });
  if (h?.error) report.append(el('p', { class: 'error', text: h.error }));
  if (h?.report) {
    const r = h.report;
    if (!r.ok) report.append(el('p', { class: 'error', text: r.error }));
    else {
      const unknown = [...new Set(r.services.flatMap((s) => s.unknown))];
      report.append(
        el('p', { text: `${r.files.join(', ')}: ${t('importSummary', { services: r.services.length, bookmarks: r.bookmarks, header: r.header })}` }),
        unknown.length ? el('p', { class: 'warn', text: t('unknownWidgets', { list: unknown.join(', ') }) }) : null,
        r.errors.length || r.warnings.length ? el('ul', { class: 'plain' }, ...r.errors.map((m) => el('li', { class: 'error', text: m })), ...r.warnings.map((m) => el('li', { class: 'warn', text: m }))) : null,
        h.used ? el('p', { class: 'ok', text: t('importUsed') }) : null,
        el('button', { type: 'button', class: h.used ? null : 'primary', text: h.used ? t('importDrop') : t('importUse'), onclick: () => { h.used = !h.used; render(); } }));
    }
  }
  return [
    el('h2', { text: t('stepHomepage'), tabindex: '-1' }),
    el('p', { class: 'muted', text: t('homepageText') }),
    input,
    el('button', { type: 'button', text: t('chooseFiles'), onclick: () => input.click() }),
    report,
    actions(),
  ];
}

// ---------------------------------------------------------------- 4. security
const isIpHost = (h) => /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || /^\[[0-9a-f:.]+\]$/.test(h) || h === 'localhost';

function composeLines() {
  const s = state.status;
  const lines = [];
  if (s && !isIpHost(s.host) && !s.hostListed) {
    const list = Array.isArray(s.allowedHosts) ? [...s.allowedHosts, s.host] : [s.host];
    lines.push(`DASHBOARD_ALLOWED_HOSTS: ${list.join(',')}`);
  }
  if (state.hash) lines.push(`DASHBOARD_ACTION_PASSWORD: "${state.hash}"`);
  return lines;
}

function renderSecurity() {
  if (!state.status) {
    api('status').then((s) => { state.status = s; if (state.step === 3) render(); }).catch(() => {});
    return [el('h2', { text: t('stepSecurity'), tabindex: '-1' }), el('p', { class: 'muted', text: '…' })];
  }
  const s = state.status;
  const pw = el('input', { type: 'password', id: 'action-password', autocomplete: 'new-password' });
  const lines = composeLines();
  const block = el('pre', { text: lines.length ? `environment:\n${lines.map((l) => `  ${l}`).join('\n')}` : t('nothingToAdd') });
  const copy = el('button', { type: 'button', text: t('copy'), onclick: async () => {
    try { await navigator.clipboard.writeText(lines.join('\n')); copy.textContent = t('copied'); } catch { /* not allowed here: select it by hand */ }
  } });
  const docker = s.docker.length === 0 ? t('secDockerNone') : s.docker.some((d) => d.socket) ? t('secDockerSocket') : t('secDockerProxy', { url: s.docker.map((d) => d.url).join(', ') });
  return [
    el('h2', { text: t('stepSecurity'), tabindex: '-1' }),
    el('p', { class: 'muted', text: t('securityText') }),
    el('div', { class: 'item' }, el('strong', { text: t('secHosts') }),
      el('p', { class: isIpHost(s.host) || s.hostListed ? 'ok' : 'warn', text: isIpHost(s.host) ? t('secHostsIp') : s.hostListed ? t('secHostsOk', { host: s.host }) : t('secHostsMissing', { host: s.host }) })),
    el('div', { class: 'item' }, el('strong', { text: t('secPassword') }),
      el('p', { class: s.actionPassword || state.hash ? 'ok' : 'warn', text: s.actionPassword ? t('secPasswordOn') : t('secPasswordOff') }),
      s.actionPassword ? null : el('form', { class: 'row', onsubmit: async (e) => {
        e.preventDefault();
        if (!pw.value) return;
        const out = await api('hash', { password: pw.value });
        if (out.ok) { state.hash = out.hash; render(); }
      } }, el('label', { for: 'action-password' }, t('passwordLabel'), pw), el('button', { type: 'submit', text: t('makeHash') }))),
    el('div', { class: 'item' }, el('strong', { text: t('secDocker') }), el('p', { class: s.docker.some((d) => d.socket) ? 'warn' : 'muted', text: docker })),
    el('div', { class: 'item' }, el('strong', { text: t('composeLines') }), block, lines.length ? copy : null),
    actions(),
  ];
}

// ---------------------------------------------------------------- 5. done
function payload(skip) {
  const cards = skip ? [] : (state.cards ?? []).filter((c) => c.on && c.name.trim());
  return {
    settings: { ...state.settings, title: state.settings.title.trim() || 'Homelab' },
    services: cards.map((c) => ({
      group: c.group, name: c.name, href: c.href || undefined, container: c.container, server: c.server,
      icon: c.type ? `${c.type}.png` : undefined,
      widget: c.type ? { type: c.type, ...c.options } : undefined,
    })),
    homepage: !skip && state.homepage?.used ? state.homepage.files : undefined,
  };
}

async function finish(skip = false, status = null) {
  if (status) status.textContent = t('writing');
  let out;
  try {
    out = await api('finish', payload(skip));
  } catch (err) {
    out = { ok: false, error: err.message };
  }
  if (out.ok) {
    window.location.href = './';
    return;
  }
  const text = out.exists ? t('exists', { list: out.exists.join(', ') }) : t('failed', { error: out.error });
  if (status) status.textContent = text;
  else window.alert(text);
}

function renderDone() {
  const p = payload(false);
  const fromHomepage = Object.keys(p.homepage ?? {});
  const files = ['settings.yaml', 'services.yaml', 'widgets.yaml', 'bookmarks.yaml', 'docker.yaml', 'kubernetes.yaml'];
  const status = el('p', { role: 'status', class: 'muted' });
  return [
    el('h2', { text: t('stepDone'), tabindex: '-1' }),
    el('p', { text: t('doneText') }),
    el('ul', { class: 'plain' }, ...[...new Set([...files, ...fromHomepage])].map((f) => el('li', {},
      el('code', { text: f }),
      fromHomepage.includes(f) ? ` (${t('fromHomepage')})` : f === 'services.yaml' ? ` (${t('services', { count: p.services.length })})` : null))),
    status,
    el('div', { class: 'actions' },
      el('button', { type: 'button', text: t('back'), onclick: () => go(state.step - 1) }),
      el('div', { class: 'right' }, el('button', { type: 'button', class: 'primary', text: t('write'), onclick: () => finish(false, status) }))),
  ];
}

// ---------------------------------------------------------------- start
async function start() {
  try {
    state.widgets = (await api('widgets')).widgets ?? [];
  } catch {
    return; // the code is asked
  }
  render();
}

async function init() {
  const browser = (navigator.language || 'en').toLowerCase();
  const guess = Object.keys(LANGUAGE_NAMES).find((l) => l.toLowerCase() === browser) ?? Object.keys(LANGUAGE_NAMES).find((l) => browser.startsWith(l.toLowerCase().split('-')[0]));
  if (guess) state.settings.language = guess;
  lang = I18N[state.settings.language] ? state.settings.language : 'en';
  applyTheme();
  const s = await (await fetch('api/onboarding/state')).json();
  if (!s.active) {
    window.location.href = './';
    return;
  }
  if (!s.allowed) return showCode();
  start();
}

window.HD_SETUP = { I18N, PALETTES, state };
init();
