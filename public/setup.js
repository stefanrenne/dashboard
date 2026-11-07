// The setup wizard of a first install (/setup, see src/onboarding.js): basics, services from
// the running containers, homepage's files, a security checklist, then it writes the config.
// The YAML stays the source: this page only sends what you chose, the server writes the files.
'use strict';


const I18N = {
  en: {"heading":"Set up your dashboard","intro":"A few steps, and the dashboard writes its configuration for you. You can change everything later in its YAML files.","stepBasics":"Basics","stepDocker":"Docker","stepServices":"Services","stepHomepage":"From homepage","dockerText":"Where the dashboard finds your containers: for the next step, for container status on the cards and for discovery by labels.","dockerChecking":"Asking Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} containers","dockerFailed":"{name} ({target}): {error}","dockerPermission":"The dashboard may not use this socket. Start the container as root (the default, not --user), so it can join the socket's group, or use a socket proxy.","dockerNone":"No Docker server. Mount the Docker socket into the container (and recreate it), or add the address of a docker-socket-proxy or Docker API below.","dockerAddress":"Socket or address","dockerName":"Name (optional)","dockerAdd":"Add and check","dockerAdded":"Added here (written to docker.yaml):","dockerAddressHint":"A socket path such as /var/run/docker.sock, or host:port of a socket proxy or Docker API (docker-proxy:2375, https://nas.lan:2376).","needName":"A name is needed.","needLink":"A link is needed, starting with http:// or https://.","needOption":"{name} is needed.","checking":"Checking the services…","servicesBlocked":"Some services are not ready: fix the ones marked in red, or untick them.","migrateHomepage":"Migrate from homepage","homepageReplaces":"homepage's services.yaml is used, in place of the services below.","scanFailed":"The scan failed: {error}","dockerServers":"{count} Docker servers","stepSecurity":"Security","stepDone":"Done","next":"Next","back":"Back","skipSetup":"Skip the setup: start with an empty dashboard","codeTitle":"Enter the setup code","codeText":"You are not on the local network, so the setup asks for the code from the dashboard's log: docker logs dashboard","codeLabel":"Setup code","codeSubmit":"Continue","codeWrong":"Wrong code","wait":"Too many tries; wait {seconds} s","basicsText":"How the page looks.","titleLabel":"Title","languageLabel":"Language","themeLabel":"Theme","themeAuto":"Follow the system","themeDark":"Dark","themeLight":"Light","colorLabel":"Colour","servicesText":"The running containers, with the widget that fits each one. Tick the ones you want on the page and fill in what a widget needs.","scanning":"Looking for containers…","noDocker":"No Docker found. Mount the Docker socket (or a socket proxy) to find containers, or add services by hand.","discovered":"on the page already, through its labels","noWidget":"no widget, a link only","addService":"Add a service by hand","nameLabel":"Name","groupLabel":"Group","linkLabel":"Link","widgetLabel":"Widget","none":"None","moreOptions":"More options","test":"Test","testing":"Testing…","works":"Works","remove":"Remove","newService":"New service","homepageText":"Coming from homepage? Choose its configuration files (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). They are taken over as they are, in place of what the steps before would write.","chooseFiles":"Choose files","check":"Check","importSummary":"{services} services, {bookmarks} bookmarks, {header} header widgets","unknownWidgets":"Widgets without a match: {list}","importUse":"Use these files","importUsed":"These files are used","importDrop":"Do not use them","notHomepage":"None of these is a homepage file: {list}","secHosts":"Allowed hosts","passwordLabel":"Password","doneText":"The dashboard writes these files into its config folder:","write":"Write the configuration","writing":"Writing…","exists":"Already there: {list}. Nothing was written.","failed":"Could not write: {error}","fromHomepage":"from homepage","services":"{count} services","secHostsHelp":"The names you open the dashboard by, separated by commas. IP addresses and localhost always work. Written to settings.yaml.","secAdmin":"Admin password","secAdminText":"Required. It guards the buttons that run something and, if you like, the whole page. Only its hash is written to settings.yaml.","passwordRepeat":"Repeat the password","passwordShort":"The admin password needs at least {count} characters.","passwordMismatch":"The two passwords are not the same.","secLogin":"Security level","loginPage":"Dashboard access","loginActions":"Only privileged actions","loginActionsText":"Anyone can open the dashboard, but changing the settings and running commands that need root, or are marked with confirm:, require authentication.","loginPageText":"The dashboard cannot be opened without authentication.","safer":"safer"},
  nl: {"heading":"Je dashboard instellen","intro":"Een paar stappen, en het dashboard schrijft zijn configuratie voor je. Alles is later aan te passen in de YAML-bestanden.","stepBasics":"Basis","stepServices":"Services","stepHomepage":"Van homepage","stepSecurity":"Beveiliging","stepDone":"Klaar","next":"Volgende","back":"Terug","skipSetup":"Instellen overslaan: begin met een leeg dashboard","codeTitle":"Voer de setupcode in","codeText":"Je zit niet op het lokale netwerk, dus vraagt de setup de code uit de log van het dashboard: docker logs dashboard","codeLabel":"Setupcode","codeSubmit":"Doorgaan","codeWrong":"Onjuiste code","wait":"Te veel pogingen; wacht {seconds} s","basicsText":"Hoe de pagina eruitziet.","titleLabel":"Titel","languageLabel":"Taal","themeLabel":"Thema","themeAuto":"Systeem volgen","themeDark":"Donker","themeLight":"Licht","colorLabel":"Kleur","servicesText":"De draaiende containers, met de widget die bij elk past. Vink aan wat je op de pagina wilt en vul in wat een widget nodig heeft.","scanning":"Containers zoeken…","noDocker":"Geen Docker gevonden. Koppel de Docker-socket (of een socket-proxy) om containers te vinden, of voeg services met de hand toe.","discovered":"staat al op de pagina, via zijn labels","noWidget":"geen widget, alleen een link","addService":"Service met de hand toevoegen","nameLabel":"Naam","groupLabel":"Groep","linkLabel":"Link","widgetLabel":"Widget","none":"Geen","moreOptions":"Meer opties","test":"Testen","testing":"Testen…","works":"Werkt","remove":"Verwijderen","newService":"Nieuwe service","homepageText":"Kom je van homepage? Kies de configuratiebestanden (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Ze worden overgenomen zoals ze zijn, in plaats van wat de vorige stappen zouden schrijven.","chooseFiles":"Bestanden kiezen","check":"Controleren","importSummary":"{services} services, {bookmarks} bladwijzers, {header} headerwidgets","unknownWidgets":"Widgets zonder match: {list}","importUse":"Deze bestanden gebruiken","importUsed":"Deze bestanden worden gebruikt","importDrop":"Niet gebruiken","notHomepage":"Geen van deze is een homepage-bestand: {list}","secHosts":"Toegestane hosts","passwordLabel":"Wachtwoord","doneText":"Het dashboard schrijft deze bestanden in zijn configmap:","write":"Configuratie schrijven","writing":"Schrijven…","exists":"Bestaat al: {list}. Er is niets geschreven.","failed":"Schrijven mislukt: {error}","fromHomepage":"van homepage","services":"{count} services","stepDocker":"Docker","dockerText":"Waar het dashboard je containers vindt: voor de volgende stap, voor de containerstatus op de kaarten en voor discovery via labels.","dockerChecking":"Docker vragen…","dockerOk":"{name} ({target}): Docker {version}, {count} containers","dockerFailed":"{name} ({target}): {error}","dockerPermission":"Het dashboard mag deze socket niet gebruiken. Start de container als root (de standaard, niet --user), zodat hij lid kan worden van de groep van de socket, of gebruik een socket-proxy.","dockerNone":"Geen Docker-server. Koppel de Docker-socket in de container (en maak hem opnieuw aan), of voeg hieronder het adres van een docker-socket-proxy of Docker-API toe.","dockerAddress":"Socket of adres","dockerName":"Naam (optioneel)","dockerAdd":"Toevoegen en controleren","dockerAdded":"Hier toegevoegd (komt in docker.yaml):","dockerAddressHint":"Een socketpad zoals /var/run/docker.sock, of host:poort van een socket-proxy of Docker-API (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Overstappen van homepage","homepageReplaces":"De services.yaml van homepage wordt gebruikt, in plaats van de services hieronder.","scanFailed":"Zoeken mislukt: {error}","dockerServers":"{count} Docker-servers","needName":"Een naam is nodig.","needLink":"Een link is nodig, beginnend met http:// of https://.","needOption":"{name} is nodig.","checking":"De services controleren…","servicesBlocked":"Niet alle services zijn klaar: herstel de rood gemarkeerde, of vink ze uit.","secHostsHelp":"De namen waarmee je het dashboard opent, gescheiden door komma's. IP-adressen en localhost werken altijd. Komt in settings.yaml.","secAdmin":"Admin wachtwoord","secAdminText":"Verplicht. Het beschermt de knoppen die iets uitvoeren en, als je wilt, de hele pagina. Alleen de hash komt in settings.yaml.","passwordRepeat":"Herhaal het wachtwoord","passwordShort":"Het admin wachtwoord moet minstens {count} tekens hebben.","passwordMismatch":"De twee wachtwoorden zijn niet gelijk.","secLogin":"Beveiligingsniveau","loginPage":"Toegang tot het dashboard","loginActions":"Alleen risicovolle acties","loginActionsText":"Iedereen kan het dashboard openen, maar voor het wijzigen van de instellingen en het uitvoeren van commando's die root nodig hebben, of gemarkeerd zijn met confirm:, is authenticatie nodig.","loginPageText":"Het dashboard is niet te openen zonder authenticatie.","safer":"veiliger"},
  fr: {"heading":"Configurer votre tableau de bord","intro":"Quelques étapes, et le tableau de bord écrit sa configuration pour vous. Tout reste modifiable ensuite dans ses fichiers YAML.","stepBasics":"Bases","stepServices":"Services","stepHomepage":"Depuis homepage","stepSecurity":"Sécurité","stepDone":"Terminé","next":"Suivant","back":"Retour","skipSetup":"Passer la configuration : commencer avec un tableau de bord vide","codeTitle":"Saisissez le code de configuration","codeText":"Vous n’êtes pas sur le réseau local : la configuration demande le code du journal du tableau de bord : docker logs dashboard","codeLabel":"Code de configuration","codeSubmit":"Continuer","codeWrong":"Code incorrect","wait":"Trop d’essais ; attendez {seconds} s","basicsText":"L’apparence de la page.","titleLabel":"Titre","languageLabel":"Langue","themeLabel":"Thème","themeAuto":"Suivre le système","themeDark":"Sombre","themeLight":"Clair","colorLabel":"Couleur","servicesText":"Les conteneurs en cours d’exécution, avec le widget qui convient à chacun. Cochez ceux que vous voulez sur la page et remplissez ce dont un widget a besoin.","scanning":"Recherche des conteneurs…","noDocker":"Docker introuvable. Montez le socket Docker (ou un proxy de socket) pour trouver les conteneurs, ou ajoutez des services à la main.","discovered":"déjà sur la page, grâce à ses labels","noWidget":"pas de widget, un lien seulement","addService":"Ajouter un service à la main","nameLabel":"Nom","groupLabel":"Groupe","linkLabel":"Lien","widgetLabel":"Widget","none":"Aucun","moreOptions":"Plus d’options","test":"Tester","testing":"Test…","works":"Fonctionne","remove":"Retirer","newService":"Nouveau service","homepageText":"Vous venez de homepage ? Choisissez ses fichiers de configuration (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Ils sont repris tels quels, à la place de ce que les étapes précédentes écriraient.","chooseFiles":"Choisir des fichiers","check":"Vérifier","importSummary":"{services} services, {bookmarks} favoris, {header} widgets d’en-tête","unknownWidgets":"Widgets sans correspondance : {list}","importUse":"Utiliser ces fichiers","importUsed":"Ces fichiers sont utilisés","importDrop":"Ne pas les utiliser","notHomepage":"Aucun n’est un fichier de homepage : {list}","secHosts":"Hôtes autorisés","passwordLabel":"Mot de passe","doneText":"Le tableau de bord écrit ces fichiers dans son dossier de configuration :","write":"Écrire la configuration","writing":"Écriture…","exists":"Existe déjà : {list}. Rien n’a été écrit.","failed":"Écriture impossible : {error}","fromHomepage":"depuis homepage","services":"{count} services","stepDocker":"Docker","dockerText":"Où le tableau de bord trouve vos conteneurs : pour l’étape suivante, pour l’état des conteneurs sur les cartes et pour la découverte par labels.","dockerChecking":"Interrogation de Docker…","dockerOk":"{name} ({target}) : Docker {version}, {count} conteneurs","dockerFailed":"{name} ({target}) : {error}","dockerPermission":"Le tableau de bord n’a pas le droit d’utiliser ce socket. Démarrez le conteneur en root (par défaut, sans --user) pour qu’il rejoigne le groupe du socket, ou utilisez un proxy de socket.","dockerNone":"Aucun serveur Docker. Montez le socket Docker dans le conteneur (et recréez-le), ou ajoutez ci-dessous l’adresse d’un docker-socket-proxy ou d’une API Docker.","dockerAddress":"Socket ou adresse","dockerName":"Nom (facultatif)","dockerAdd":"Ajouter et vérifier","dockerAdded":"Ajoutés ici (écrits dans docker.yaml) :","dockerAddressHint":"Un chemin de socket comme /var/run/docker.sock, ou hôte:port d’un proxy de socket ou d’une API Docker (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Migrer depuis homepage","homepageReplaces":"Le services.yaml de homepage est utilisé, à la place des services ci-dessous.","scanFailed":"La recherche a échoué : {error}","dockerServers":"{count} serveurs Docker","needName":"Un nom est nécessaire.","needLink":"Un lien est nécessaire, commençant par http:// ou https://.","needOption":"{name} est nécessaire.","checking":"Vérification des services…","servicesBlocked":"Certains services ne sont pas prêts : corrigez ceux marqués en rouge, ou décochez-les.","secHostsHelp":"Les noms par lesquels vous ouvrez le tableau de bord, séparés par des virgules. Les adresses IP et localhost fonctionnent toujours. Écrit dans settings.yaml.","secAdmin":"Mot de passe administrateur","secAdminText":"Obligatoire. Il protège les boutons qui exécutent quelque chose et, si vous le souhaitez, toute la page. Seul son hachage est écrit dans settings.yaml.","passwordRepeat":"Répétez le mot de passe","passwordShort":"Le mot de passe administrateur doit compter au moins {count} caractères.","passwordMismatch":"Les deux mots de passe ne sont pas identiques.","safer":"plus sûr"},
  de: {"heading":"Dashboard einrichten","intro":"Ein paar Schritte, und das Dashboard schreibt seine Konfiguration für dich. Alles lässt sich später in den YAML-Dateien ändern.","stepBasics":"Grundlagen","stepServices":"Dienste","stepHomepage":"Von homepage","stepSecurity":"Sicherheit","stepDone":"Fertig","next":"Weiter","back":"Zurück","skipSetup":"Einrichtung überspringen: mit einem leeren Dashboard beginnen","codeTitle":"Einrichtungscode eingeben","codeText":"Du bist nicht im lokalen Netz, daher fragt die Einrichtung nach dem Code aus dem Log des Dashboards: docker logs dashboard","codeLabel":"Einrichtungscode","codeSubmit":"Weiter","codeWrong":"Falscher Code","wait":"Zu viele Versuche; warte {seconds} s","basicsText":"Wie die Seite aussieht.","titleLabel":"Titel","languageLabel":"Sprache","themeLabel":"Design","themeAuto":"System folgen","themeDark":"Dunkel","themeLight":"Hell","colorLabel":"Farbe","servicesText":"Die laufenden Container, jeweils mit dem passenden Widget. Hake an, was auf die Seite soll, und fülle aus, was ein Widget braucht.","scanning":"Container werden gesucht…","noDocker":"Kein Docker gefunden. Binde den Docker-Socket (oder einen Socket-Proxy) ein, um Container zu finden, oder füge Dienste von Hand hinzu.","discovered":"schon auf der Seite, über seine Labels","noWidget":"kein Widget, nur ein Link","addService":"Dienst von Hand hinzufügen","nameLabel":"Name","groupLabel":"Gruppe","linkLabel":"Link","widgetLabel":"Widget","none":"Keins","moreOptions":"Weitere Optionen","test":"Testen","testing":"Teste…","works":"Funktioniert","remove":"Entfernen","newService":"Neuer Dienst","homepageText":"Kommst du von homepage? Wähle dessen Konfigurationsdateien (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Sie werden übernommen, wie sie sind, statt dessen, was die vorigen Schritte schreiben würden.","chooseFiles":"Dateien wählen","check":"Prüfen","importSummary":"{services} Dienste, {bookmarks} Lesezeichen, {header} Header-Widgets","unknownWidgets":"Widgets ohne Treffer: {list}","importUse":"Diese Dateien verwenden","importUsed":"Diese Dateien werden verwendet","importDrop":"Nicht verwenden","notHomepage":"Keine davon ist eine homepage-Datei: {list}","secHosts":"Erlaubte Hosts","passwordLabel":"Passwort","doneText":"Das Dashboard schreibt diese Dateien in seinen Konfigurationsordner:","write":"Konfiguration schreiben","writing":"Schreibe…","exists":"Schon vorhanden: {list}. Es wurde nichts geschrieben.","failed":"Schreiben fehlgeschlagen: {error}","fromHomepage":"von homepage","services":"{count} Dienste","stepDocker":"Docker","dockerText":"Wo das Dashboard deine Container findet: für den nächsten Schritt, für den Containerstatus auf den Karten und für die Erkennung über Labels.","dockerChecking":"Frage Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} Container","dockerFailed":"{name} ({target}): {error}","dockerPermission":"Das Dashboard darf diesen Socket nicht benutzen. Starte den Container als root (Standard, ohne --user), damit er der Gruppe des Sockets beitreten kann, oder nutze einen Socket-Proxy.","dockerNone":"Kein Docker-Server. Binde den Docker-Socket in den Container ein (und erstelle ihn neu), oder füge unten die Adresse eines docker-socket-proxy oder einer Docker-API hinzu.","dockerAddress":"Socket oder Adresse","dockerName":"Name (optional)","dockerAdd":"Hinzufügen und prüfen","dockerAdded":"Hier hinzugefügt (kommt in docker.yaml):","dockerAddressHint":"Ein Socket-Pfad wie /var/run/docker.sock, oder Host:Port eines Socket-Proxys oder einer Docker-API (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Von homepage umziehen","homepageReplaces":"Die services.yaml von homepage wird verwendet, statt der Dienste unten.","scanFailed":"Die Suche ist fehlgeschlagen: {error}","dockerServers":"{count} Docker-Server","needName":"Ein Name wird gebraucht.","needLink":"Ein Link wird gebraucht, beginnend mit http:// oder https://.","needOption":"{name} wird gebraucht.","checking":"Dienste werden geprüft…","servicesBlocked":"Nicht alle Dienste sind bereit: korrigiere die rot markierten oder hake sie ab.","secHostsHelp":"Die Namen, unter denen du das Dashboard öffnest, durch Kommas getrennt. IP-Adressen und localhost funktionieren immer. Kommt in settings.yaml.","secAdmin":"Admin-Passwort","secAdminText":"Erforderlich. Es schützt die Schaltflächen, die etwas ausführen, und auf Wunsch die ganze Seite. Nur sein Hash kommt in settings.yaml.","passwordRepeat":"Passwort wiederholen","passwordShort":"Das Admin-Passwort braucht mindestens {count} Zeichen.","passwordMismatch":"Die beiden Passwörter sind nicht gleich.","safer":"sicherer"},
  es: {"heading":"Configura tu panel","intro":"Unos pocos pasos, y el panel escribe su configuración por ti. Todo se puede cambiar después en sus archivos YAML.","stepBasics":"Básico","stepServices":"Servicios","stepHomepage":"Desde homepage","stepSecurity":"Seguridad","stepDone":"Listo","next":"Siguiente","back":"Atrás","skipSetup":"Omitir la configuración: empezar con un panel vacío","codeTitle":"Introduce el código de configuración","codeText":"No estás en la red local, así que la configuración pide el código del registro del panel: docker logs dashboard","codeLabel":"Código de configuración","codeSubmit":"Continuar","codeWrong":"Código incorrecto","wait":"Demasiados intentos; espera {seconds} s","basicsText":"Cómo se ve la página.","titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir al sistema","themeDark":"Oscuro","themeLight":"Claro","colorLabel":"Color","servicesText":"Los contenedores en ejecución, con el widget que encaja con cada uno. Marca los que quieras en la página y rellena lo que necesita cada widget.","scanning":"Buscando contenedores…","noDocker":"No se encontró Docker. Monta el socket de Docker (o un proxy de socket) para encontrar contenedores, o añade servicios a mano.","discovered":"ya está en la página, por sus etiquetas","noWidget":"sin widget, solo un enlace","addService":"Añadir un servicio a mano","nameLabel":"Nombre","groupLabel":"Grupo","linkLabel":"Enlace","widgetLabel":"Widget","none":"Ninguno","moreOptions":"Más opciones","test":"Probar","testing":"Probando…","works":"Funciona","remove":"Quitar","newService":"Servicio nuevo","homepageText":"¿Vienes de homepage? Elige sus archivos de configuración (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Se adoptan tal cual, en lugar de lo que escribirían los pasos anteriores.","chooseFiles":"Elegir archivos","check":"Comprobar","importSummary":"{services} servicios, {bookmarks} marcadores, {header} widgets de cabecera","unknownWidgets":"Widgets sin coincidencia: {list}","importUse":"Usar estos archivos","importUsed":"Se usan estos archivos","importDrop":"No usarlos","notHomepage":"Ninguno es un archivo de homepage: {list}","secHosts":"Hosts permitidos","passwordLabel":"Contraseña","doneText":"El panel escribe estos archivos en su carpeta de configuración:","write":"Escribir la configuración","writing":"Escribiendo…","exists":"Ya existe: {list}. No se escribió nada.","failed":"No se pudo escribir: {error}","fromHomepage":"desde homepage","services":"{count} servicios","stepDocker":"Docker","dockerText":"Dónde encuentra el panel tus contenedores: para el siguiente paso, para el estado de los contenedores en las tarjetas y para el descubrimiento por etiquetas.","dockerChecking":"Consultando a Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} contenedores","dockerFailed":"{name} ({target}): {error}","dockerPermission":"El panel no puede usar este socket. Inicia el contenedor como root (lo predeterminado, sin --user) para que se una al grupo del socket, o usa un proxy de socket.","dockerNone":"Ningún servidor Docker. Monta el socket de Docker en el contenedor (y vuelve a crearlo), o añade abajo la dirección de un docker-socket-proxy o una API de Docker.","dockerAddress":"Socket o dirección","dockerName":"Nombre (opcional)","dockerAdd":"Añadir y comprobar","dockerAdded":"Añadidos aquí (se escriben en docker.yaml):","dockerAddressHint":"Una ruta de socket como /var/run/docker.sock, o host:puerto de un proxy de socket o una API de Docker (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Migrar desde homepage","homepageReplaces":"Se usa el services.yaml de homepage, en lugar de los servicios de abajo.","scanFailed":"La búsqueda falló: {error}","dockerServers":"{count} servidores Docker","needName":"Hace falta un nombre.","needLink":"Hace falta un enlace que empiece por http:// o https://.","needOption":"Hace falta {name}.","checking":"Comprobando los servicios…","servicesBlocked":"Algunos servicios no están listos: corrige los marcados en rojo o desmárcalos.","secHostsHelp":"Los nombres con los que abres el panel, separados por comas. Las direcciones IP y localhost siempre funcionan. Se escribe en settings.yaml.","secAdmin":"Contraseña de administrador","secAdminText":"Obligatoria. Protege los botones que ejecutan algo y, si quieres, toda la página. Solo su hash se escribe en settings.yaml.","passwordRepeat":"Repite la contraseña","passwordShort":"La contraseña de administrador necesita al menos {count} caracteres.","passwordMismatch":"Las dos contraseñas no coinciden.","safer":"más seguro"},
  ca: {"heading":"Configura el tauler","intro":"Uns quants passos, i el tauler escriu la seva configuració per tu. Ho pots canviar tot després als fitxers YAML.","stepBasics":"Bàsic","stepServices":"Serveis","stepHomepage":"Des de homepage","stepSecurity":"Seguretat","stepDone":"Fet","next":"Següent","back":"Enrere","skipSetup":"Omet la configuració: comença amb un tauler buit","codeTitle":"Introdueix el codi de configuració","codeText":"No ets a la xarxa local, així que la configuració demana el codi del registre del tauler: docker logs dashboard","codeLabel":"Codi de configuració","codeSubmit":"Continua","codeWrong":"Codi incorrecte","wait":"Massa intents; espera {seconds} s","basicsText":"Com es veu la pàgina.","titleLabel":"Títol","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Segueix el sistema","themeDark":"Fosc","themeLight":"Clar","colorLabel":"Color","servicesText":"Els contenidors en marxa, amb el giny que encaixa amb cadascun. Marca els que vulguis a la pàgina i omple el que necessita cada giny.","scanning":"Cercant contenidors…","noDocker":"No s’ha trobat Docker. Munta el sòcol de Docker (o un proxy de sòcol) per trobar contenidors, o afegeix serveis a mà.","discovered":"ja és a la pàgina, per les seves etiquetes","noWidget":"sense giny, només un enllaç","addService":"Afegeix un servei a mà","nameLabel":"Nom","groupLabel":"Grup","linkLabel":"Enllaç","widgetLabel":"Giny","none":"Cap","moreOptions":"Més opcions","test":"Prova","testing":"Provant…","works":"Funciona","remove":"Treu","newService":"Servei nou","homepageText":"Vens de homepage? Tria els seus fitxers de configuració (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). S’adopten tal com són, en lloc del que escriurien els passos anteriors.","chooseFiles":"Tria fitxers","check":"Comprova","importSummary":"{services} serveis, {bookmarks} adreces d’interès, {header} ginys de capçalera","unknownWidgets":"Ginys sense coincidència: {list}","importUse":"Fes servir aquests fitxers","importUsed":"Es fan servir aquests fitxers","importDrop":"No els facis servir","notHomepage":"Cap és un fitxer de homepage: {list}","secHosts":"Amfitrions permesos","passwordLabel":"Contrasenya","doneText":"El tauler escriu aquests fitxers a la seva carpeta de configuració:","write":"Escriu la configuració","writing":"Escrivint…","exists":"Ja existeix: {list}. No s’ha escrit res.","failed":"No s’ha pogut escriure: {error}","fromHomepage":"des de homepage","services":"{count} serveis","stepDocker":"Docker","dockerText":"On troba el tauler els teus contenidors: per al pas següent, per a l’estat dels contenidors a les targetes i per al descobriment per etiquetes.","dockerChecking":"Consultant Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} contenidors","dockerFailed":"{name} ({target}): {error}","dockerPermission":"El tauler no pot fer servir aquest sòcol. Inicia el contenidor com a root (per defecte, sense --user) perquè s’uneixi al grup del sòcol, o fes servir un proxy de sòcol.","dockerNone":"Cap servidor Docker. Munta el sòcol de Docker al contenidor (i torna’l a crear), o afegeix a sota l’adreça d’un docker-socket-proxy o d’una API de Docker.","dockerAddress":"Sòcol o adreça","dockerName":"Nom (opcional)","dockerAdd":"Afegeix i comprova","dockerAdded":"Afegits aquí (s’escriuen a docker.yaml):","dockerAddressHint":"Un camí de sòcol com /var/run/docker.sock, o amfitrió:port d’un proxy de sòcol o d’una API de Docker (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Migra des de homepage","homepageReplaces":"Es fa servir el services.yaml de homepage, en lloc dels serveis de sota.","scanFailed":"La cerca ha fallat: {error}","dockerServers":"{count} servidors Docker","needName":"Cal un nom.","needLink":"Cal un enllaç que comenci per http:// o https://.","needOption":"Cal {name}.","checking":"Comprovant els serveis…","servicesBlocked":"Alguns serveis no estan a punt: corregeix els marcats en vermell o desmarca’ls.","secHostsHelp":"Els noms amb què obres el tauler, separats per comes. Les adreces IP i localhost sempre funcionen. S’escriu a settings.yaml.","secAdmin":"Contrasenya d’administrador","secAdminText":"Obligatòria. Protegeix els botons que executen alguna cosa i, si vols, tota la pàgina. Només se n’escriu el hash a settings.yaml.","passwordRepeat":"Repeteix la contrasenya","passwordShort":"La contrasenya d’administrador necessita com a mínim {count} caràcters.","passwordMismatch":"Les dues contrasenyes no coincideixen.","safer":"més segur"},
  he: {"heading":"הגדרת לוח המחוונים","intro":"כמה צעדים, ולוח המחוונים כותב את ההגדרות שלו בשבילך. אפשר לשנות הכול אחר כך בקובצי ה־YAML.","stepBasics":"בסיס","stepServices":"שירותים","stepHomepage":"מ־homepage","stepSecurity":"אבטחה","stepDone":"סיום","next":"הבא","back":"חזרה","skipSetup":"דילוג על ההגדרה: להתחיל עם לוח ריק","codeTitle":"נא להזין את קוד ההגדרה","codeText":"אינך ברשת המקומית, ולכן ההגדרה מבקשת את הקוד מיומן לוח המחוונים: docker logs dashboard","codeLabel":"קוד הגדרה","codeSubmit":"המשך","codeWrong":"קוד שגוי","wait":"יותר מדי ניסיונות; יש להמתין {seconds} שנ׳","basicsText":"איך הדף נראה.","titleLabel":"כותרת","languageLabel":"שפה","themeLabel":"ערכת נושא","themeAuto":"לפי המערכת","themeDark":"כהה","themeLight":"בהיר","colorLabel":"צבע","servicesText":"המכולות הפועלות, כל אחת עם הווידג׳ט שמתאים לה. יש לסמן את מה שרוצים בדף ולמלא את מה שווידג׳ט צריך.","scanning":"מחפש מכולות…","noDocker":"לא נמצא Docker. יש לחבר את שקע Docker (או פרוקסי לשקע) כדי למצוא מכולות, או להוסיף שירותים ידנית.","discovered":"כבר בדף, דרך התוויות שלו","noWidget":"אין ווידג׳ט, קישור בלבד","addService":"הוספת שירות ידנית","nameLabel":"שם","groupLabel":"קבוצה","linkLabel":"קישור","widgetLabel":"ווידג׳ט","none":"ללא","moreOptions":"אפשרויות נוספות","test":"בדיקה","testing":"בודק…","works":"עובד","remove":"הסרה","newService":"שירות חדש","homepageText":"מגיעים מ־homepage? יש לבחור את קובצי ההגדרות שלו (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). הם נלקחים כמו שהם, במקום מה שהצעדים הקודמים היו כותבים.","chooseFiles":"בחירת קבצים","check":"בדיקה","importSummary":"{services} שירותים, {bookmarks} סימניות, {header} ווידג׳טים בכותרת","unknownWidgets":"ווידג׳טים ללא התאמה: {list}","importUse":"להשתמש בקבצים האלה","importUsed":"נעשה שימוש בקבצים האלה","importDrop":"לא להשתמש בהם","notHomepage":"אף אחד מהם אינו קובץ של homepage: {list}","secHosts":"מארחים מורשים","passwordLabel":"סיסמה","doneText":"לוח המחוונים כותב את הקבצים האלה לתיקיית ההגדרות שלו:","write":"כתיבת ההגדרות","writing":"כותב…","exists":"כבר קיים: {list}. לא נכתב דבר.","failed":"הכתיבה נכשלה: {error}","fromHomepage":"מ־homepage","services":"{count} שירותים","stepDocker":"Docker","dockerText":"היכן לוח המחוונים מוצא את המכולות שלך: לצעד הבא, למצב המכולות בכרטיסים ולגילוי לפי תוויות.","dockerChecking":"שואל את Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} מכולות","dockerFailed":"{name} ({target}): {error}","dockerPermission":"ללוח המחוונים אין הרשאה להשתמש בשקע הזה. יש להפעיל את המכולה כ־root (ברירת המחדל, בלי --user) כדי שתצטרף לקבוצה של השקע, או להשתמש בפרוקסי לשקע.","dockerNone":"אין שרת Docker. יש לחבר את שקע Docker למכולה (וליצור אותה מחדש), או להוסיף למטה כתובת של docker-socket-proxy או של API של Docker.","dockerAddress":"שקע או כתובת","dockerName":"שם (לא חובה)","dockerAdd":"הוספה ובדיקה","dockerAdded":"נוספו כאן (נכתבים ל־docker.yaml):","dockerAddressHint":"נתיב שקע כמו /var/run/docker.sock, או host:port של פרוקסי לשקע או של API של Docker (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"מעבר מ־homepage","homepageReplaces":"נעשה שימוש ב־services.yaml של homepage, במקום השירותים שלמטה.","scanFailed":"החיפוש נכשל: {error}","dockerServers":"{count} שרתי Docker","needName":"נדרש שם.","needLink":"נדרש קישור שמתחיל ב־http:// או https://.","needOption":"נדרש {name}.","checking":"בודק את השירותים…","servicesBlocked":"חלק מהשירותים אינם מוכנים: יש לתקן את המסומנים באדום, או לבטל את סימונם.","secHostsHelp":"השמות שבהם פותחים את לוח המחוונים, מופרדים בפסיקים. כתובות IP ו־localhost תמיד עובדים. נכתב ל־settings.yaml.","secAdmin":"סיסמת מנהל","secAdminText":"חובה. היא מגינה על הכפתורים שמריצים משהו ואם רוצים גם על כל הדף. רק ה־hash שלה נכתב ל־settings.yaml.","passwordRepeat":"חזרה על הסיסמה","passwordShort":"סיסמת המנהל צריכה לפחות {count} תווים.","passwordMismatch":"שתי הסיסמאות אינן זהות.","safer":"בטוח יותר"},
  hr: {"heading":"Postavi nadzornu ploču","intro":"Nekoliko koraka, i nadzorna ploča sama zapiše svoju konfiguraciju. Sve se kasnije može promijeniti u YAML datotekama.","stepBasics":"Osnove","stepServices":"Usluge","stepHomepage":"Iz homepagea","stepSecurity":"Sigurnost","stepDone":"Gotovo","next":"Dalje","back":"Natrag","skipSetup":"Preskoči postavljanje: počni s praznom pločom","codeTitle":"Unesi kod za postavljanje","codeText":"Nisi u lokalnoj mreži, pa postavljanje traži kod iz zapisnika nadzorne ploče: docker logs dashboard","codeLabel":"Kod za postavljanje","codeSubmit":"Nastavi","codeWrong":"Pogrešan kod","wait":"Previše pokušaja; pričekaj {seconds} s","basicsText":"Kako stranica izgleda.","titleLabel":"Naslov","languageLabel":"Jezik","themeLabel":"Tema","themeAuto":"Prati sustav","themeDark":"Tamna","themeLight":"Svijetla","colorLabel":"Boja","servicesText":"Pokrenuti spremnici, svaki s widgetom koji mu odgovara. Označi što želiš na stranici i ispuni što widget treba.","scanning":"Tražim spremnike…","noDocker":"Docker nije pronađen. Montiraj Docker socket (ili socket proxy) za pronalazak spremnika, ili dodaj usluge ručno.","discovered":"već je na stranici, preko svojih oznaka","noWidget":"bez widgeta, samo poveznica","addService":"Dodaj uslugu ručno","nameLabel":"Naziv","groupLabel":"Grupa","linkLabel":"Poveznica","widgetLabel":"Widget","none":"Nijedan","moreOptions":"Više opcija","test":"Testiraj","testing":"Testiram…","works":"Radi","remove":"Ukloni","newService":"Nova usluga","homepageText":"Dolaziš iz homepagea? Odaberi njegove konfiguracijske datoteke (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Preuzimaju se kakve jesu, umjesto onoga što bi zapisali prethodni koraci.","chooseFiles":"Odaberi datoteke","check":"Provjeri","importSummary":"{services} usluga, {bookmarks} oznaka, {header} widgeta zaglavlja","unknownWidgets":"Widgeti bez podudaranja: {list}","importUse":"Koristi ove datoteke","importUsed":"Koriste se ove datoteke","importDrop":"Ne koristi ih","notHomepage":"Nijedna nije datoteka homepagea: {list}","secHosts":"Dopušteni hostovi","passwordLabel":"Lozinka","doneText":"Ploča zapisuje ove datoteke u svoju mapu konfiguracije:","write":"Zapiši konfiguraciju","writing":"Zapisujem…","exists":"Već postoji: {list}. Ništa nije zapisano.","failed":"Zapisivanje nije uspjelo: {error}","fromHomepage":"iz homepagea","services":"{count} usluga","stepDocker":"Docker","dockerText":"Gdje ploča pronalazi tvoje spremnike: za sljedeći korak, za stanje spremnika na karticama i za otkrivanje preko oznaka.","dockerChecking":"Pitam Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} spremnika","dockerFailed":"{name} ({target}): {error}","dockerPermission":"Ploča ne smije koristiti ovaj socket. Pokreni spremnik kao root (zadano, bez --user) kako bi se pridružio grupi socketa, ili koristi socket proxy.","dockerNone":"Nema Docker poslužitelja. Montiraj Docker socket u spremnik (i ponovno ga stvori), ili dolje dodaj adresu docker-socket-proxyja ili Docker API-ja.","dockerAddress":"Socket ili adresa","dockerName":"Naziv (neobavezno)","dockerAdd":"Dodaj i provjeri","dockerAdded":"Dodano ovdje (zapisuje se u docker.yaml):","dockerAddressHint":"Putanja socketa kao /var/run/docker.sock, ili host:port socket proxyja ili Docker API-ja (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Prijeđi s homepagea","homepageReplaces":"Koristi se services.yaml iz homepagea, umjesto usluga ispod.","scanFailed":"Pretraga nije uspjela: {error}","dockerServers":"{count} Docker poslužitelja","needName":"Potreban je naziv.","needLink":"Potrebna je poveznica koja počinje s http:// ili https://.","needOption":"Potrebno je {name}.","checking":"Provjeravam usluge…","servicesBlocked":"Neke usluge nisu spremne: ispravi one označene crveno ili ih odznači.","secHostsHelp":"Imena pod kojima otvaraš ploču, odvojena zarezima. IP adrese i localhost uvijek rade. Zapisuje se u settings.yaml.","secAdmin":"Administratorska lozinka","secAdminText":"Obavezna. Štiti gumbe koji nešto pokreću i, ako želiš, cijelu stranicu. U settings.yaml se zapisuje samo njezin hash.","passwordRepeat":"Ponovi lozinku","passwordShort":"Administratorska lozinka treba barem {count} znakova.","passwordMismatch":"Dvije lozinke nisu iste.","safer":"sigurnije"},
  hu: {"heading":"Az irányítópult beállítása","intro":"Néhány lépés, és az irányítópult megírja helyetted a beállításait. Később mindent módosíthatsz a YAML-fájlokban.","stepBasics":"Alapok","stepServices":"Szolgáltatások","stepHomepage":"A homepage-ből","stepSecurity":"Biztonság","stepDone":"Kész","next":"Tovább","back":"Vissza","skipSetup":"Beállítás kihagyása: üres irányítópulttal kezdés","codeTitle":"Add meg a beállítási kódot","codeText":"Nem a helyi hálózaton vagy, ezért a beállítás az irányítópult naplójában lévő kódot kéri: docker logs dashboard","codeLabel":"Beállítási kód","codeSubmit":"Tovább","codeWrong":"Hibás kód","wait":"Túl sok próbálkozás; várj {seconds} mp-et","basicsText":"Hogyan néz ki az oldal.","titleLabel":"Cím","languageLabel":"Nyelv","themeLabel":"Téma","themeAuto":"Rendszer szerint","themeDark":"Sötét","themeLight":"Világos","colorLabel":"Szín","servicesText":"A futó konténerek, mindegyik a hozzá illő widgettel. Jelöld be, amit az oldalon szeretnél, és töltsd ki, amire egy widgetnek szüksége van.","scanning":"Konténerek keresése…","noDocker":"Nem található Docker. Csatold a Docker socketet (vagy egy socket proxyt) a konténerek kereséséhez, vagy adj hozzá szolgáltatásokat kézzel.","discovered":"már az oldalon van, a címkéi révén","noWidget":"nincs widget, csak egy link","addService":"Szolgáltatás kézi hozzáadása","nameLabel":"Név","groupLabel":"Csoport","linkLabel":"Link","widgetLabel":"Widget","none":"Nincs","moreOptions":"További beállítások","test":"Teszt","testing":"Tesztelés…","works":"Működik","remove":"Eltávolítás","newService":"Új szolgáltatás","homepageText":"A homepage-ről jössz? Válaszd ki a beállítófájljait (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Változatlanul átvesszük őket, annak helyére, amit az előző lépések írnának.","chooseFiles":"Fájlok kiválasztása","check":"Ellenőrzés","importSummary":"{services} szolgáltatás, {bookmarks} könyvjelző, {header} fejléc-widget","unknownWidgets":"Egyezés nélküli widgetek: {list}","importUse":"Ezek a fájlok legyenek","importUsed":"Ezeket a fájlokat használjuk","importDrop":"Ne használjuk őket","notHomepage":"Egyik sem homepage-fájl: {list}","secHosts":"Engedélyezett hostok","passwordLabel":"Jelszó","doneText":"Az irányítópult ezeket a fájlokat írja a beállítási mappájába:","write":"Beállítások írása","writing":"Írás…","exists":"Már létezik: {list}. Semmi sem lett írva.","failed":"Az írás nem sikerült: {error}","fromHomepage":"a homepage-ből","services":"{count} szolgáltatás","stepDocker":"Docker","dockerText":"Hol találja az irányítópult a konténereidet: a következő lépéshez, a kártyák konténerállapotához és a címkék szerinti felderítéshez.","dockerChecking":"Docker lekérdezése…","dockerOk":"{name} ({target}): Docker {version}, {count} konténer","dockerFailed":"{name} ({target}): {error}","dockerPermission":"Az irányítópult nem használhatja ezt a socketet. Indítsd a konténert rootként (alapértelmezés, --user nélkül), hogy csatlakozhasson a socket csoportjához, vagy használj socket proxyt.","dockerNone":"Nincs Docker-szerver. Csatold a Docker socketet a konténerbe (és hozd létre újra), vagy add meg lent egy docker-socket-proxy vagy Docker API címét.","dockerAddress":"Socket vagy cím","dockerName":"Név (nem kötelező)","dockerAdd":"Hozzáadás és ellenőrzés","dockerAdded":"Itt hozzáadva (a docker.yaml-ba kerül):","dockerAddressHint":"Egy socket útvonala, például /var/run/docker.sock, vagy egy socket proxy vagy Docker API host:port címe (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Átállás a homepage-ről","homepageReplaces":"A homepage services.yaml fájlját használjuk a lenti szolgáltatások helyett.","scanFailed":"A keresés nem sikerült: {error}","dockerServers":"{count} Docker-szerver","needName":"Név szükséges.","needLink":"Link szükséges, http:// vagy https:// kezdettel.","needOption":"{name} szükséges.","checking":"A szolgáltatások ellenőrzése…","servicesBlocked":"Néhány szolgáltatás nincs kész: javítsd a pirossal jelölteket, vagy vedd ki a jelölésüket.","secHostsHelp":"A nevek, amelyekkel az irányítópultot megnyitod, vesszővel elválasztva. Az IP-címek és a localhost mindig működnek. A settings.yaml-ba kerül.","secAdmin":"Adminjelszó","secAdminText":"Kötelező. Védi a valamit futtató gombokat és, ha szeretnéd, az egész oldalt. Csak a hash-e kerül a settings.yaml-ba.","passwordRepeat":"Jelszó ismét","passwordShort":"Az adminjelszónak legalább {count} karakter kell.","passwordMismatch":"A két jelszó nem egyezik.","safer":"biztonságosabb"},
  it: {"heading":"Configura la tua dashboard","intro":"Pochi passi, e la dashboard scrive la sua configurazione per te. Potrai cambiare tutto dopo nei file YAML.","stepBasics":"Base","stepServices":"Servizi","stepHomepage":"Da homepage","stepSecurity":"Sicurezza","stepDone":"Fatto","next":"Avanti","back":"Indietro","skipSetup":"Salta la configurazione: inizia con una dashboard vuota","codeTitle":"Inserisci il codice di configurazione","codeText":"Non sei sulla rete locale, quindi la configurazione chiede il codice dal log della dashboard: docker logs dashboard","codeLabel":"Codice di configurazione","codeSubmit":"Continua","codeWrong":"Codice errato","wait":"Troppi tentativi; attendi {seconds} s","basicsText":"L’aspetto della pagina.","titleLabel":"Titolo","languageLabel":"Lingua","themeLabel":"Tema","themeAuto":"Segui il sistema","themeDark":"Scuro","themeLight":"Chiaro","colorLabel":"Colore","servicesText":"I container in esecuzione, ciascuno con il widget adatto. Spunta quelli che vuoi nella pagina e compila ciò che serve a un widget.","scanning":"Ricerca dei container…","noDocker":"Docker non trovato. Monta il socket di Docker (o un proxy del socket) per trovare i container, oppure aggiungi i servizi a mano.","discovered":"già nella pagina, tramite le sue etichette","noWidget":"nessun widget, solo un link","addService":"Aggiungi un servizio a mano","nameLabel":"Nome","groupLabel":"Gruppo","linkLabel":"Link","widgetLabel":"Widget","none":"Nessuno","moreOptions":"Altre opzioni","test":"Prova","testing":"Prova in corso…","works":"Funziona","remove":"Rimuovi","newService":"Nuovo servizio","homepageText":"Arrivi da homepage? Scegli i suoi file di configurazione (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Vengono ripresi così come sono, al posto di ciò che scriverebbero i passi precedenti.","chooseFiles":"Scegli file","check":"Controlla","importSummary":"{services} servizi, {bookmarks} segnalibri, {header} widget dell’intestazione","unknownWidgets":"Widget senza corrispondenza: {list}","importUse":"Usa questi file","importUsed":"Vengono usati questi file","importDrop":"Non usarli","notHomepage":"Nessuno è un file di homepage: {list}","secHosts":"Host consentiti","passwordLabel":"Password","doneText":"La dashboard scrive questi file nella sua cartella di configurazione:","write":"Scrivi la configurazione","writing":"Scrittura…","exists":"Esiste già: {list}. Non è stato scritto nulla.","failed":"Scrittura non riuscita: {error}","fromHomepage":"da homepage","services":"{count} servizi","stepDocker":"Docker","dockerText":"Dove la dashboard trova i tuoi container: per il passo successivo, per lo stato dei container sulle schede e per il rilevamento tramite etichette.","dockerChecking":"Interrogo Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} container","dockerFailed":"{name} ({target}): {error}","dockerPermission":"La dashboard non può usare questo socket. Avvia il container come root (predefinito, senza --user) così entra nel gruppo del socket, oppure usa un proxy del socket.","dockerNone":"Nessun server Docker. Monta il socket di Docker nel container (e ricrealo), oppure aggiungi qui sotto l’indirizzo di un docker-socket-proxy o di un’API Docker.","dockerAddress":"Socket o indirizzo","dockerName":"Nome (facoltativo)","dockerAdd":"Aggiungi e controlla","dockerAdded":"Aggiunti qui (scritti in docker.yaml):","dockerAddressHint":"Un percorso di socket come /var/run/docker.sock, o host:porta di un proxy del socket o di un’API Docker (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Passa da homepage","homepageReplaces":"Viene usato il services.yaml di homepage, al posto dei servizi qui sotto.","scanFailed":"La ricerca non è riuscita: {error}","dockerServers":"{count} server Docker","needName":"Serve un nome.","needLink":"Serve un link che inizi con http:// o https://.","needOption":"Serve {name}.","checking":"Controllo dei servizi…","servicesBlocked":"Alcuni servizi non sono pronti: correggi quelli segnati in rosso o togli la spunta.","secHostsHelp":"I nomi con cui apri la dashboard, separati da virgole. Gli indirizzi IP e localhost funzionano sempre. Scritto in settings.yaml.","secAdmin":"Password di amministratore","secAdminText":"Obbligatoria. Protegge i pulsanti che eseguono qualcosa e, se vuoi, tutta la pagina. In settings.yaml viene scritto solo il suo hash.","passwordRepeat":"Ripeti la password","passwordShort":"La password di amministratore richiede almeno {count} caratteri.","passwordMismatch":"Le due password non coincidono.","safer":"più sicuro"},
  'nb-NO': {"heading":"Sett opp dashbordet","intro":"Noen få trinn, så skriver dashbordet konfigurasjonen for deg. Alt kan endres senere i YAML-filene.","stepBasics":"Grunnleggende","stepServices":"Tjenester","stepHomepage":"Fra homepage","stepSecurity":"Sikkerhet","stepDone":"Ferdig","next":"Neste","back":"Tilbake","skipSetup":"Hopp over oppsettet: start med et tomt dashbord","codeTitle":"Skriv inn oppsettkoden","codeText":"Du er ikke på det lokale nettet, så oppsettet ber om koden fra dashbordets logg: docker logs dashboard","codeLabel":"Oppsettkode","codeSubmit":"Fortsett","codeWrong":"Feil kode","wait":"For mange forsøk; vent {seconds} s","basicsText":"Hvordan siden ser ut.","titleLabel":"Tittel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Følg systemet","themeDark":"Mørkt","themeLight":"Lyst","colorLabel":"Farge","servicesText":"De kjørende containerne, hver med widgeten som passer. Kryss av det du vil ha på siden, og fyll inn det en widget trenger.","scanning":"Leter etter containere…","noDocker":"Fant ikke Docker. Monter Docker-socketen (eller en socket-proxy) for å finne containere, eller legg til tjenester for hånd.","discovered":"allerede på siden, via etikettene sine","noWidget":"ingen widget, bare en lenke","addService":"Legg til en tjeneste for hånd","nameLabel":"Navn","groupLabel":"Gruppe","linkLabel":"Lenke","widgetLabel":"Widget","none":"Ingen","moreOptions":"Flere valg","test":"Test","testing":"Tester…","works":"Virker","remove":"Fjern","newService":"Ny tjeneste","homepageText":"Kommer du fra homepage? Velg konfigurasjonsfilene (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). De tas over som de er, i stedet for det de forrige trinnene ville skrive.","chooseFiles":"Velg filer","check":"Kontroller","importSummary":"{services} tjenester, {bookmarks} bokmerker, {header} toppwidgeter","unknownWidgets":"Widgeter uten treff: {list}","importUse":"Bruk disse filene","importUsed":"Disse filene brukes","importDrop":"Ikke bruk dem","notHomepage":"Ingen av dem er en homepage-fil: {list}","secHosts":"Tillatte verter","passwordLabel":"Passord","doneText":"Dashbordet skriver disse filene i konfigurasjonsmappen sin:","write":"Skriv konfigurasjonen","writing":"Skriver…","exists":"Finnes allerede: {list}. Ingenting ble skrevet.","failed":"Kunne ikke skrive: {error}","fromHomepage":"fra homepage","services":"{count} tjenester","stepDocker":"Docker","dockerText":"Hvor dashbordet finner containerne dine: for neste trinn, for containerstatus på kortene og for oppdaging via etiketter.","dockerChecking":"Spør Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} containere","dockerFailed":"{name} ({target}): {error}","dockerPermission":"Dashbordet får ikke bruke denne socketen. Start containeren som root (standard, uten --user), så den kan bli med i socketens gruppe, eller bruk en socket-proxy.","dockerNone":"Ingen Docker-server. Monter Docker-socketen i containeren (og opprett den på nytt), eller legg til adressen til en docker-socket-proxy eller et Docker-API nedenfor.","dockerAddress":"Socket eller adresse","dockerName":"Navn (valgfritt)","dockerAdd":"Legg til og kontroller","dockerAdded":"Lagt til her (skrives i docker.yaml):","dockerAddressHint":"En socket-sti som /var/run/docker.sock, eller vert:port til en socket-proxy eller et Docker-API (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Flytt fra homepage","homepageReplaces":"services.yaml fra homepage brukes, i stedet for tjenestene nedenfor.","scanFailed":"Søket mislyktes: {error}","dockerServers":"{count} Docker-servere","needName":"Et navn trengs.","needLink":"En lenke trengs, som starter med http:// eller https://.","needOption":"{name} trengs.","checking":"Kontrollerer tjenestene…","servicesBlocked":"Noen tjenester er ikke klare: rett de som er merket rødt, eller fjern krysset.","secHostsHelp":"Navnene du åpner dashbordet med, skilt med komma. IP-adresser og localhost virker alltid. Skrives i settings.yaml.","secAdmin":"Adminpassord","secAdminText":"Påkrevd. Det beskytter knappene som kjører noe og, om du vil, hele siden. Bare hashen skrives i settings.yaml.","passwordRepeat":"Gjenta passordet","passwordShort":"Adminpassordet må ha minst {count} tegn.","passwordMismatch":"De to passordene er ikke like.","safer":"tryggere"},
  pt: {"heading":"Configure o seu painel","intro":"Alguns passos, e o painel escreve a configuração por si. Pode alterar tudo depois nos ficheiros YAML.","stepBasics":"Básico","stepServices":"Serviços","stepHomepage":"Do homepage","stepSecurity":"Segurança","stepDone":"Concluído","next":"Seguinte","back":"Voltar","skipSetup":"Saltar a configuração: começar com um painel vazio","codeTitle":"Introduza o código de configuração","codeText":"Não está na rede local, por isso a configuração pede o código do registo do painel: docker logs dashboard","codeLabel":"Código de configuração","codeSubmit":"Continuar","codeWrong":"Código errado","wait":"Demasiadas tentativas; aguarde {seconds} s","basicsText":"O aspeto da página.","titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir o sistema","themeDark":"Escuro","themeLight":"Claro","colorLabel":"Cor","servicesText":"Os contentores em execução, cada um com o widget que lhe corresponde. Marque os que quer na página e preencha o que um widget precisa.","scanning":"A procurar contentores…","noDocker":"Docker não encontrado. Monte o socket do Docker (ou um proxy do socket) para encontrar contentores, ou adicione serviços à mão.","discovered":"já está na página, pelas suas etiquetas","noWidget":"sem widget, só uma ligação","addService":"Adicionar um serviço à mão","nameLabel":"Nome","groupLabel":"Grupo","linkLabel":"Ligação","widgetLabel":"Widget","none":"Nenhum","moreOptions":"Mais opções","test":"Testar","testing":"A testar…","works":"Funciona","remove":"Remover","newService":"Novo serviço","homepageText":"Vem do homepage? Escolha os ficheiros de configuração dele (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). São adotados tal como estão, em vez do que os passos anteriores escreveriam.","chooseFiles":"Escolher ficheiros","check":"Verificar","importSummary":"{services} serviços, {bookmarks} marcadores, {header} widgets do cabeçalho","unknownWidgets":"Widgets sem correspondência: {list}","importUse":"Usar estes ficheiros","importUsed":"Estes ficheiros são usados","importDrop":"Não os usar","notHomepage":"Nenhum é um ficheiro do homepage: {list}","secHosts":"Hosts permitidos","passwordLabel":"Palavra-passe","doneText":"O painel escreve estes ficheiros na sua pasta de configuração:","write":"Escrever a configuração","writing":"A escrever…","exists":"Já existe: {list}. Nada foi escrito.","failed":"Não foi possível escrever: {error}","fromHomepage":"do homepage","services":"{count} serviços","stepDocker":"Docker","dockerText":"Onde o painel encontra os seus contentores: para o passo seguinte, para o estado dos contentores nos cartões e para a descoberta por etiquetas.","dockerChecking":"A consultar o Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} contentores","dockerFailed":"{name} ({target}): {error}","dockerPermission":"O painel não pode usar este socket. Inicie o contentor como root (o predefinido, sem --user) para que se junte ao grupo do socket, ou use um proxy do socket.","dockerNone":"Nenhum servidor Docker. Monte o socket do Docker no contentor (e volte a criá-lo), ou acrescente abaixo o endereço de um docker-socket-proxy ou de uma API do Docker.","dockerAddress":"Socket ou endereço","dockerName":"Nome (opcional)","dockerAdd":"Acrescentar e verificar","dockerAdded":"Acrescentados aqui (escritos em docker.yaml):","dockerAddressHint":"Um caminho de socket como /var/run/docker.sock, ou host:porta de um proxy do socket ou de uma API do Docker (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Migrar do homepage","homepageReplaces":"É usado o services.yaml do homepage, em vez dos serviços abaixo.","scanFailed":"A procura falhou: {error}","dockerServers":"{count} servidores Docker","needName":"É preciso um nome.","needLink":"É preciso uma ligação que comece por http:// ou https://.","needOption":"É preciso {name}.","checking":"A verificar os serviços…","servicesBlocked":"Alguns serviços não estão prontos: corrija os marcados a vermelho ou desmarque-os.","secHostsHelp":"Os nomes com que abre o painel, separados por vírgulas. Os endereços IP e localhost funcionam sempre. Escrito em settings.yaml.","secAdmin":"Palavra-passe de administrador","secAdminText":"Obrigatória. Protege os botões que executam algo e, se quiser, a página inteira. Só o seu hash é escrito em settings.yaml.","passwordRepeat":"Repita a palavra-passe","passwordShort":"A palavra-passe de administrador precisa de pelo menos {count} caracteres.","passwordMismatch":"As duas palavras-passe não são iguais.","safer":"mais seguro"},
  ru: {"heading":"Настройка панели","intro":"Несколько шагов, и панель сама запишет свою конфигурацию. Всё можно изменить позже в её YAML-файлах.","stepBasics":"Основное","stepServices":"Сервисы","stepHomepage":"Из homepage","stepSecurity":"Безопасность","stepDone":"Готово","next":"Далее","back":"Назад","skipSetup":"Пропустить настройку: начать с пустой панели","codeTitle":"Введите код настройки","codeText":"Вы не в локальной сети, поэтому настройка просит код из журнала панели: docker logs dashboard","codeLabel":"Код настройки","codeSubmit":"Продолжить","codeWrong":"Неверный код","wait":"Слишком много попыток; подождите {seconds} с","basicsText":"Как выглядит страница.","titleLabel":"Заголовок","languageLabel":"Язык","themeLabel":"Тема","themeAuto":"Как в системе","themeDark":"Тёмная","themeLight":"Светлая","colorLabel":"Цвет","servicesText":"Запущенные контейнеры, каждый с подходящим виджетом. Отметьте нужные на странице и заполните то, что нужно виджету.","scanning":"Поиск контейнеров…","noDocker":"Docker не найден. Подключите сокет Docker (или прокси сокета), чтобы найти контейнеры, или добавьте сервисы вручную.","discovered":"уже на странице, по своим меткам","noWidget":"без виджета, только ссылка","addService":"Добавить сервис вручную","nameLabel":"Название","groupLabel":"Группа","linkLabel":"Ссылка","widgetLabel":"Виджет","none":"Нет","moreOptions":"Другие параметры","test":"Проверить","testing":"Проверка…","works":"Работает","remove":"Удалить","newService":"Новый сервис","homepageText":"Переходите с homepage? Выберите его файлы конфигурации (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Они берутся как есть вместо того, что записали бы предыдущие шаги.","chooseFiles":"Выбрать файлы","check":"Проверить","importSummary":"сервисов: {services}, закладок: {bookmarks}, виджетов в шапке: {header}","unknownWidgets":"Виджеты без соответствия: {list}","importUse":"Использовать эти файлы","importUsed":"Используются эти файлы","importDrop":"Не использовать","notHomepage":"Ни один не является файлом homepage: {list}","secHosts":"Разрешённые хосты","passwordLabel":"Пароль","doneText":"Панель запишет эти файлы в свою папку конфигурации:","write":"Записать конфигурацию","writing":"Запись…","exists":"Уже существует: {list}. Ничего не записано.","failed":"Не удалось записать: {error}","fromHomepage":"из homepage","services":"сервисов: {count}","stepDocker":"Docker","dockerText":"Где панель находит ваши контейнеры: для следующего шага, для статуса контейнеров на карточках и для обнаружения по меткам.","dockerChecking":"Запрос к Docker…","dockerOk":"{name} ({target}): Docker {version}, контейнеров: {count}","dockerFailed":"{name} ({target}): {error}","dockerPermission":"Панели нельзя использовать этот сокет. Запустите контейнер от root (по умолчанию, без --user), чтобы он вошёл в группу сокета, или используйте прокси сокета.","dockerNone":"Нет сервера Docker. Подключите сокет Docker в контейнер (и пересоздайте его) или добавьте ниже адрес docker-socket-proxy или Docker API.","dockerAddress":"Сокет или адрес","dockerName":"Имя (необязательно)","dockerAdd":"Добавить и проверить","dockerAdded":"Добавлено здесь (записывается в docker.yaml):","dockerAddressHint":"Путь к сокету, например /var/run/docker.sock, или host:port прокси сокета или Docker API (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Перейти с homepage","homepageReplaces":"Используется services.yaml из homepage вместо сервисов ниже.","scanFailed":"Поиск не удался: {error}","dockerServers":"серверов Docker: {count}","needName":"Нужно название.","needLink":"Нужна ссылка, начинающаяся с http:// или https://.","needOption":"Нужно указать {name}.","checking":"Проверка сервисов…","servicesBlocked":"Не все сервисы готовы: исправьте отмеченные красным или снимите с них отметку.","secHostsHelp":"Имена, по которым вы открываете панель, через запятую. IP-адреса и localhost работают всегда. Записывается в settings.yaml.","secAdmin":"Пароль администратора","secAdminText":"Обязателен. Он защищает кнопки, которые что-то запускают, и при желании всю страницу. В settings.yaml записывается только его хеш.","passwordRepeat":"Повторите пароль","passwordShort":"Пароль администратора должен быть не короче {count} символов.","passwordMismatch":"Пароли не совпадают.","safer":"безопаснее"},
  sv: {"heading":"Ställ in din instrumentpanel","intro":"Några få steg, så skriver instrumentpanelen sin konfiguration åt dig. Allt kan ändras senare i YAML-filerna.","stepBasics":"Grunder","stepServices":"Tjänster","stepHomepage":"Från homepage","stepSecurity":"Säkerhet","stepDone":"Klart","next":"Nästa","back":"Tillbaka","skipSetup":"Hoppa över inställningen: börja med en tom instrumentpanel","codeTitle":"Ange inställningskoden","codeText":"Du är inte på det lokala nätverket, så inställningen ber om koden från instrumentpanelens logg: docker logs dashboard","codeLabel":"Inställningskod","codeSubmit":"Fortsätt","codeWrong":"Fel kod","wait":"För många försök; vänta {seconds} s","basicsText":"Hur sidan ser ut.","titleLabel":"Titel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Följ systemet","themeDark":"Mörkt","themeLight":"Ljust","colorLabel":"Färg","servicesText":"De körande containrarna, var och en med widgeten som passar. Markera de du vill ha på sidan och fyll i det en widget behöver.","scanning":"Letar efter containrar…","noDocker":"Hittade inget Docker. Montera Docker-socketen (eller en socket-proxy) för att hitta containrar, eller lägg till tjänster för hand.","discovered":"redan på sidan, via sina etiketter","noWidget":"ingen widget, bara en länk","addService":"Lägg till en tjänst för hand","nameLabel":"Namn","groupLabel":"Grupp","linkLabel":"Länk","widgetLabel":"Widget","none":"Ingen","moreOptions":"Fler alternativ","test":"Testa","testing":"Testar…","works":"Fungerar","remove":"Ta bort","newService":"Ny tjänst","homepageText":"Kommer du från homepage? Välj dess konfigurationsfiler (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). De tas över som de är, i stället för det de tidigare stegen skulle skriva.","chooseFiles":"Välj filer","check":"Kontrollera","importSummary":"{services} tjänster, {bookmarks} bokmärken, {header} sidhuvudwidgetar","unknownWidgets":"Widgetar utan träff: {list}","importUse":"Använd de här filerna","importUsed":"De här filerna används","importDrop":"Använd dem inte","notHomepage":"Ingen av dem är en homepage-fil: {list}","secHosts":"Tillåtna värdar","passwordLabel":"Lösenord","doneText":"Instrumentpanelen skriver de här filerna i sin konfigurationsmapp:","write":"Skriv konfigurationen","writing":"Skriver…","exists":"Finns redan: {list}. Inget skrevs.","failed":"Kunde inte skriva: {error}","fromHomepage":"från homepage","services":"{count} tjänster","stepDocker":"Docker","dockerText":"Var instrumentpanelen hittar dina containrar: för nästa steg, för containerstatus på korten och för upptäckt via etiketter.","dockerChecking":"Frågar Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} containrar","dockerFailed":"{name} ({target}): {error}","dockerPermission":"Instrumentpanelen får inte använda den här socketen. Starta containern som root (standard, utan --user) så att den kan gå med i socketens grupp, eller använd en socket-proxy.","dockerNone":"Ingen Docker-server. Montera Docker-socketen i containern (och skapa om den), eller lägg till adressen till en docker-socket-proxy eller ett Docker-API nedan.","dockerAddress":"Socket eller adress","dockerName":"Namn (valfritt)","dockerAdd":"Lägg till och kontrollera","dockerAdded":"Tillagda här (skrivs i docker.yaml):","dockerAddressHint":"En socket-sökväg som /var/run/docker.sock, eller värd:port för en socket-proxy eller ett Docker-API (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Flytta från homepage","homepageReplaces":"services.yaml från homepage används, i stället för tjänsterna nedan.","scanFailed":"Sökningen misslyckades: {error}","dockerServers":"{count} Docker-servrar","needName":"Ett namn behövs.","needLink":"En länk behövs, som börjar med http:// eller https://.","needOption":"{name} behövs.","checking":"Kontrollerar tjänsterna…","servicesBlocked":"Några tjänster är inte klara: rätta de som är markerade i rött, eller avmarkera dem.","secHostsHelp":"Namnen du öppnar instrumentpanelen med, åtskilda med kommatecken. IP-adresser och localhost fungerar alltid. Skrivs i settings.yaml.","secAdmin":"Adminlösenord","secAdminText":"Krävs. Det skyddar knapparna som kör något och, om du vill, hela sidan. Bara dess hash skrivs i settings.yaml.","passwordRepeat":"Upprepa lösenordet","passwordShort":"Adminlösenordet behöver minst {count} tecken.","passwordMismatch":"De två lösenorden är inte lika.","safer":"säkrare"},
  vi: {"heading":"Thiết lập bảng điều khiển","intro":"Vài bước, và bảng điều khiển tự ghi cấu hình cho bạn. Sau này bạn có thể đổi mọi thứ trong các tệp YAML.","stepBasics":"Cơ bản","stepServices":"Dịch vụ","stepHomepage":"Từ homepage","stepSecurity":"Bảo mật","stepDone":"Xong","next":"Tiếp","back":"Quay lại","skipSetup":"Bỏ qua thiết lập: bắt đầu với bảng trống","codeTitle":"Nhập mã thiết lập","codeText":"Bạn không ở trong mạng nội bộ, nên phần thiết lập cần mã trong nhật ký của bảng điều khiển: docker logs dashboard","codeLabel":"Mã thiết lập","codeSubmit":"Tiếp tục","codeWrong":"Sai mã","wait":"Quá nhiều lần thử; chờ {seconds} giây","basicsText":"Giao diện của trang.","titleLabel":"Tiêu đề","languageLabel":"Ngôn ngữ","themeLabel":"Chủ đề","themeAuto":"Theo hệ thống","themeDark":"Tối","themeLight":"Sáng","colorLabel":"Màu","servicesText":"Các container đang chạy, mỗi cái với widget phù hợp. Đánh dấu những cái bạn muốn trên trang và điền những gì widget cần.","scanning":"Đang tìm container…","noDocker":"Không tìm thấy Docker. Gắn socket Docker (hoặc một proxy socket) để tìm container, hoặc thêm dịch vụ thủ công.","discovered":"đã có trên trang, nhờ nhãn của nó","noWidget":"không có widget, chỉ một liên kết","addService":"Thêm dịch vụ thủ công","nameLabel":"Tên","groupLabel":"Nhóm","linkLabel":"Liên kết","widgetLabel":"Widget","none":"Không","moreOptions":"Tùy chọn khác","test":"Kiểm tra","testing":"Đang kiểm tra…","works":"Hoạt động","remove":"Xóa","newService":"Dịch vụ mới","homepageText":"Bạn chuyển từ homepage? Chọn các tệp cấu hình của nó (services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml, docker.yaml). Chúng được giữ nguyên, thay cho những gì các bước trước sẽ ghi.","chooseFiles":"Chọn tệp","check":"Kiểm tra","importSummary":"{services} dịch vụ, {bookmarks} dấu trang, {header} widget đầu trang","unknownWidgets":"Widget không khớp: {list}","importUse":"Dùng các tệp này","importUsed":"Đang dùng các tệp này","importDrop":"Không dùng","notHomepage":"Không tệp nào là tệp của homepage: {list}","secHosts":"Máy chủ được phép","passwordLabel":"Mật khẩu","doneText":"Bảng điều khiển ghi các tệp này vào thư mục cấu hình của nó:","write":"Ghi cấu hình","writing":"Đang ghi…","exists":"Đã có: {list}. Không có gì được ghi.","failed":"Không ghi được: {error}","fromHomepage":"từ homepage","services":"{count} dịch vụ","stepDocker":"Docker","dockerText":"Nơi bảng điều khiển tìm các container của bạn: cho bước tiếp theo, cho trạng thái container trên thẻ và cho việc tự phát hiện qua nhãn.","dockerChecking":"Đang hỏi Docker…","dockerOk":"{name} ({target}): Docker {version}, {count} container","dockerFailed":"{name} ({target}): {error}","dockerPermission":"Bảng điều khiển không được dùng socket này. Chạy container bằng root (mặc định, không --user) để nó vào được nhóm của socket, hoặc dùng một proxy socket.","dockerNone":"Không có máy chủ Docker. Gắn socket Docker vào container (rồi tạo lại nó), hoặc thêm địa chỉ của một docker-socket-proxy hay API Docker bên dưới.","dockerAddress":"Socket hoặc địa chỉ","dockerName":"Tên (không bắt buộc)","dockerAdd":"Thêm và kiểm tra","dockerAdded":"Đã thêm ở đây (ghi vào docker.yaml):","dockerAddressHint":"Đường dẫn socket như /var/run/docker.sock, hoặc host:port của một proxy socket hay API Docker (docker-proxy:2375, https://nas.lan:2376).","migrateHomepage":"Chuyển từ homepage","homepageReplaces":"Dùng services.yaml của homepage, thay cho các dịch vụ bên dưới.","scanFailed":"Tìm kiếm thất bại: {error}","dockerServers":"{count} máy chủ Docker","needName":"Cần có tên.","needLink":"Cần có liên kết bắt đầu bằng http:// hoặc https://.","needOption":"Cần có {name}.","checking":"Đang kiểm tra các dịch vụ…","servicesBlocked":"Một số dịch vụ chưa sẵn sàng: sửa những cái được đánh dấu đỏ, hoặc bỏ chọn chúng.","secHostsHelp":"Các tên bạn dùng để mở bảng điều khiển, cách nhau bằng dấu phẩy. Địa chỉ IP và localhost luôn hoạt động. Được ghi vào settings.yaml.","secAdmin":"Mật khẩu quản trị","secAdminText":"Bắt buộc. Nó bảo vệ các nút chạy lệnh và, nếu muốn, cả trang. Chỉ hash của nó được ghi vào settings.yaml.","passwordRepeat":"Nhập lại mật khẩu","passwordShort":"Mật khẩu quản trị cần ít nhất {count} ký tự.","passwordMismatch":"Hai mật khẩu không giống nhau.","safer":"an toàn hơn"},
  'zh-Hans': {"heading":"设置你的仪表板","intro":"几个步骤，仪表板就会为你写好配置。之后可以在 YAML 文件中修改所有内容。","stepBasics":"基本","stepServices":"服务","stepHomepage":"从 homepage 迁移","stepSecurity":"安全","stepDone":"完成","next":"下一步","back":"返回","skipSetup":"跳过设置：从空的仪表板开始","codeTitle":"输入设置码","codeText":"你不在本地网络中，因此设置需要仪表板日志中的设置码：docker logs dashboard","codeLabel":"设置码","codeSubmit":"继续","codeWrong":"设置码错误","wait":"尝试次数过多；请等待 {seconds} 秒","basicsText":"页面的外观。","titleLabel":"标题","languageLabel":"语言","themeLabel":"主题","themeAuto":"跟随系统","themeDark":"深色","themeLight":"浅色","colorLabel":"颜色","servicesText":"正在运行的容器，每个都配有合适的小组件。勾选想放到页面上的，并填写小组件需要的内容。","scanning":"正在查找容器…","noDocker":"未找到 Docker。挂载 Docker 套接字（或套接字代理）以查找容器，或手动添加服务。","discovered":"已通过标签显示在页面上","noWidget":"无小组件，仅链接","addService":"手动添加服务","nameLabel":"名称","groupLabel":"分组","linkLabel":"链接","widgetLabel":"小组件","none":"无","moreOptions":"更多选项","test":"测试","testing":"测试中…","works":"可用","remove":"移除","newService":"新服务","homepageText":"从 homepage 迁移？选择它的配置文件（services.yaml、settings.yaml、bookmarks.yaml、widgets.yaml、docker.yaml）。它们会按原样使用，替代前面步骤要写的内容。","chooseFiles":"选择文件","check":"检查","importSummary":"{services} 个服务，{bookmarks} 个书签，{header} 个页头小组件","unknownWidgets":"没有匹配的小组件：{list}","importUse":"使用这些文件","importUsed":"正在使用这些文件","importDrop":"不使用","notHomepage":"这些都不是 homepage 文件：{list}","secHosts":"允许的主机","passwordLabel":"密码","doneText":"仪表板会把这些文件写入它的配置文件夹：","write":"写入配置","writing":"正在写入…","exists":"已存在：{list}。未写入任何内容。","failed":"无法写入：{error}","fromHomepage":"来自 homepage","services":"{count} 个服务","stepDocker":"Docker","dockerText":"仪表板在哪里找到你的容器：用于下一步、卡片上的容器状态，以及按标签自动发现。","dockerChecking":"正在询问 Docker…","dockerOk":"{name}（{target}）：Docker {version}，{count} 个容器","dockerFailed":"{name}（{target}）：{error}","dockerPermission":"仪表板无权使用这个套接字。以 root 启动容器（默认，不用 --user），让它加入套接字的用户组，或使用套接字代理。","dockerNone":"没有 Docker 服务器。把 Docker 套接字挂载到容器中（并重新创建容器），或在下方添加 docker-socket-proxy 或 Docker API 的地址。","dockerAddress":"套接字或地址","dockerName":"名称（可选）","dockerAdd":"添加并检查","dockerAdded":"在此添加（写入 docker.yaml）：","dockerAddressHint":"套接字路径如 /var/run/docker.sock，或套接字代理、Docker API 的 主机:端口（docker-proxy:2375、https://nas.lan:2376）。","migrateHomepage":"从 homepage 迁移","homepageReplaces":"将使用 homepage 的 services.yaml，替代下方的服务。","scanFailed":"查找失败：{error}","dockerServers":"{count} 个 Docker 服务器","needName":"需要名称。","needLink":"需要以 http:// 或 https:// 开头的链接。","needOption":"需要 {name}。","checking":"正在检查服务…","servicesBlocked":"有些服务尚未就绪：请修正标红的服务，或取消勾选。","secHostsHelp":"打开仪表板所用的名称，用逗号分隔。IP 地址和 localhost 总是可用。写入 settings.yaml。","secAdmin":"管理员密码","secAdminText":"必填。它保护执行操作的按钮，也可以保护整个页面。只有它的哈希会写入 settings.yaml。","passwordRepeat":"再次输入密码","passwordShort":"管理员密码至少需要 {count} 个字符。","passwordMismatch":"两次输入的密码不一致。","safer":"更安全"},
  'zh-Hant': {"heading":"設定你的儀表板","intro":"幾個步驟，儀表板就會為你寫好設定。之後可以在 YAML 檔案中修改所有內容。","stepBasics":"基本","stepServices":"服務","stepHomepage":"從 homepage 移轉","stepSecurity":"安全","stepDone":"完成","next":"下一步","back":"返回","skipSetup":"略過設定：從空的儀表板開始","codeTitle":"輸入設定碼","codeText":"你不在區域網路中，因此設定需要儀表板記錄中的設定碼：docker logs dashboard","codeLabel":"設定碼","codeSubmit":"繼續","codeWrong":"設定碼錯誤","wait":"嘗試次數過多；請等待 {seconds} 秒","basicsText":"頁面的外觀。","titleLabel":"標題","languageLabel":"語言","themeLabel":"主題","themeAuto":"跟隨系統","themeDark":"深色","themeLight":"淺色","colorLabel":"顏色","servicesText":"正在執行的容器，每個都配有合適的小工具。勾選想放到頁面上的，並填寫小工具需要的內容。","scanning":"正在尋找容器…","noDocker":"找不到 Docker。掛載 Docker socket（或 socket 代理）以尋找容器，或手動新增服務。","discovered":"已透過標籤顯示在頁面上","noWidget":"無小工具，僅連結","addService":"手動新增服務","nameLabel":"名稱","groupLabel":"群組","linkLabel":"連結","widgetLabel":"小工具","none":"無","moreOptions":"更多選項","test":"測試","testing":"測試中…","works":"可用","remove":"移除","newService":"新服務","homepageText":"從 homepage 移轉？選擇它的設定檔（services.yaml、settings.yaml、bookmarks.yaml、widgets.yaml、docker.yaml）。它們會原樣使用，取代前面步驟要寫的內容。","chooseFiles":"選擇檔案","check":"檢查","importSummary":"{services} 個服務，{bookmarks} 個書籤，{header} 個頁首小工具","unknownWidgets":"沒有對應的小工具：{list}","importUse":"使用這些檔案","importUsed":"正在使用這些檔案","importDrop":"不使用","notHomepage":"這些都不是 homepage 檔案：{list}","secHosts":"允許的主機","passwordLabel":"密碼","doneText":"儀表板會把這些檔案寫入它的設定資料夾：","write":"寫入設定","writing":"正在寫入…","exists":"已存在：{list}。未寫入任何內容。","failed":"無法寫入：{error}","fromHomepage":"來自 homepage","services":"{count} 個服務","stepDocker":"Docker","dockerText":"儀表板在哪裡找到你的容器：用於下一步、卡片上的容器狀態，以及依標籤自動探索。","dockerChecking":"正在詢問 Docker…","dockerOk":"{name}（{target}）：Docker {version}，{count} 個容器","dockerFailed":"{name}（{target}）：{error}","dockerPermission":"儀表板無權使用這個 socket。以 root 啟動容器（預設，不用 --user），讓它加入 socket 的群組，或使用 socket 代理。","dockerNone":"沒有 Docker 伺服器。把 Docker socket 掛載到容器中（並重新建立容器），或在下方新增 docker-socket-proxy 或 Docker API 的位址。","dockerAddress":"Socket 或位址","dockerName":"名稱（選填）","dockerAdd":"新增並檢查","dockerAdded":"在此新增（寫入 docker.yaml）：","dockerAddressHint":"Socket 路徑如 /var/run/docker.sock，或 socket 代理、Docker API 的 主機:埠（docker-proxy:2375、https://nas.lan:2376）。","migrateHomepage":"從 homepage 移轉","homepageReplaces":"將使用 homepage 的 services.yaml，取代下方的服務。","scanFailed":"尋找失敗：{error}","dockerServers":"{count} 個 Docker 伺服器","needName":"需要名稱。","needLink":"需要以 http:// 或 https:// 開頭的連結。","needOption":"需要 {name}。","checking":"正在檢查服務…","servicesBlocked":"有些服務尚未就緒：請修正標紅的服務，或取消勾選。","secHostsHelp":"開啟儀表板所用的名稱，以逗號分隔。IP 位址和 localhost 一定可用。寫入 settings.yaml。","secAdmin":"管理員密碼","secAdminText":"必填。它保護執行動作的按鈕，也可以保護整個頁面。只有它的雜湊會寫入 settings.yaml。","passwordRepeat":"再次輸入密碼","passwordShort":"管理員密碼至少需要 {count} 個字元。","passwordMismatch":"兩次輸入的密碼不一致。","safer":"較安全"},
};

let lang = 'en';
const t = translator(I18N, () => lang);


const state = {
  step: 0,
  settings: { title: 'Homelab', language: 'en', theme: 'auto', color: 'slate' },
  widgets: [],
  cards: null, // [{ on, name, group, href, container, server, image, discovered, type, options, result }]
  scanProblems: [],
  homepage: null, // { files: { name: text }, report, used }
  showHomepage: false,
  docker: [], // the Docker servers added in the wizard: [{ address, name }]
  dockerReport: null, // { socketMounted, servers: [{ name, target, ok, version, containers, error, permission }], errors }
  scanError: '',
  status: null,
  security: { password: '', repeat: '', login: false, hosts: '', hostsTouched: false },
  securityShown: false,
  skip: false, // Skip the setup: no services, straight to the security step
};
const STEPS = ['stepBasics', 'stepDocker', 'stepServices', 'stepSecurity', 'stepDone'];

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
function applyTheme() {
  applyPalette(state.settings.color);
  applyAppearance(state.settings.theme);
  applyLanguage(lang, I18N);
}

// ---------------------------------------------------------------- frame
/** Draws the step again; `newStep` moves the focus to its heading, otherwise the page stays where it is. */
function render(newStep = false) {
  const y = window.scrollY ?? 0;
  applyTheme();
  document.title = t('heading');
  document.getElementById('heading').textContent = t('heading');
  document.getElementById('intro').textContent = t('intro');
  const steps = document.getElementById('steps');
  steps.hidden = false;
  steps.replaceChildren(...STEPS.map((key, i) => el('li', { class: i < state.step ? 'done' : null, 'aria-current': i === state.step ? 'step' : null, text: `${i + 1}. ${t(key)}` })));
  const panel = document.getElementById('panel');
  panel.replaceChildren(...[renderBasics, renderDocker, renderServices, renderSecurity, renderDone][state.step]().flat().filter((n) => n !== null && n !== undefined && n !== false));
  if (newStep) panel.querySelector('h2')?.focus?.({ preventScroll: true });
  else window.scrollTo?.(0, y);
}

function go(step) {
  state.step = step;
  render(true);
  window.scrollTo?.(0, 0);
}

function actions(...extra) {
  const right = el('div', { class: 'right' });
  if (state.step > 0) right.append(el('button', { type: 'button', text: t('back'), onclick: () => go(state.step - 1) }));
  if (state.step < STEPS.length - 1) {
    const next = el('button', { type: 'button', class: 'primary', text: t('next'), onclick: async () => {
      // the services step only lets go when every ticked service is complete and answers
      if (state.step === 3) {
        state.securityShown = true;
        if (securityProblem()) return render();
      }
      if (state.step === 2) {
        next.disabled = true;
        const ready = await servicesReady();
        next.disabled = false;
        if (!ready) return;
      }
      go(state.step + 1);
    } });
    right.append(next);
  }
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
    actions(el('button', { type: 'button', class: 'link', text: t('skipSetup'), onclick: () => { state.skip = true; go(3); } })),
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
  state.scanned = false;
  state.scanError = '';
  render();
  try {
    const out = await api('containers', { docker: state.docker });
    state.scanProblems = out.problems ?? [];
    state.cards = out.containers.map((c) => {
      const widget = widgetById(c.widget);
      return {
        on: Boolean(widget) && !c.discovered, name: widget?.name ?? c.name, group: c.group, href: c.href ?? c.url ?? '', container: c.name, server: c.server,
        image: c.image, discovered: c.discovered, type: widget?.id ?? '', options: startOptions(widget, c.url), url: c.url,
      };
    });
    state.scanned = true;
  } catch (err) {
    state.scanned = true;
    state.scanError = err.message;
  }
  if (state.step === 2) render();
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
  const box = el('article', { class: `card${card.on ? ' on' : ''}${card.on && card.result && !card.result.ok ? ' invalid' : ''}`, id: `card-${i}` });
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

/** What a ticked service still misses: a name, a link, a required option; '' when complete. */
function cardProblem(card) {
  if (!card.name.trim()) return t('needName');
  if (!/^https?:\/\/\S+$/.test(card.href.trim())) return t('needLink');
  const widget = widgetById(card.type);
  for (const [name, def] of Object.entries(widget?.options ?? {})) {
    const v = card.options[name];
    if (def.required && (v === undefined || v === '' || (Array.isArray(v) && !v.length))) return t('needOption', { name });
  }
  return '';
}

/**
 * Before the next step: every ticked service complete, and every widget tested (again, unless it
 * worked). The ones that fail are marked, with their error, and the page goes to the first one.
 */
async function servicesReady() {
  const ticked = (state.cards ?? []).filter((c) => c.on);
  for (const c of ticked) {
    const problem = cardProblem(c);
    if (problem) c.result = { ok: false, text: problem };
    else if (!c.type) c.result = null; // a link only: complete is enough
  }
  state.blocked = false;
  state.checking = true;
  render();
  await Promise.all(ticked.filter((c) => c.type && !cardProblem(c) && !c.result?.ok).map((c) => testCard(c)));
  state.checking = false;
  const bad = ticked.findIndex((c) => !c.result?.ok && (c.type || cardProblem(c)));
  state.blocked = bad >= 0;
  render();
  if (state.blocked) document.getElementById(`card-${state.cards.indexOf(ticked[bad])}`)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  return !state.blocked;
}

async function testCard(card, result = null) {
  if (result) {
    result.className = 'result';
    result.textContent = t('testing');
  }
  try {
    const out = await api('test', { type: card.type, options: card.options });
    const text = out.ok ? `${t('works')}${out.blocks?.length ? `: ${out.blocks.map((b) => `${b.label} ${b.value ?? '–'}${b.unit ?? ''}`).join(', ')}` : ''}` : out.error;
    card.result = { ok: out.ok, text };
  } catch (err) {
    card.result = { ok: false, text: err.message };
  }
  if (result) render();
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
    state.scanError ? el('p', { class: 'error', text: t('scanFailed', { error: state.scanError }) }) : null,
    state.checking ? el('p', { class: 'muted', role: 'status', text: t('checking') }) : null,
    state.blocked ? el('p', { class: 'error', role: 'alert', text: t('servicesBlocked') }) : null,
    ...state.scanProblems.map((m) => el('p', { class: 'error', text: m })),
    state.homepage?.used && state.homepage.files['services.yaml'] ? el('p', { class: 'warn', text: t('homepageReplaces') }) : null,
    el('div', { class: 'cards' }, ...list.map(renderCard)),
    el('div', { class: 'row' },
      el('button', { type: 'button', text: t('addService'), onclick: () => { state.cards.push({ on: true, name: '', group: 'Services', href: '', type: '', options: {} }); render(); } }),
      el('button', { type: 'button', 'aria-expanded': String(state.showHomepage), text: t('migrateHomepage'), onclick: () => {
        state.showHomepage = !state.showHomepage;
        render();
        if (state.showHomepage) document.getElementById('homepage-section')?.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
      } })),
    state.showHomepage || state.homepage ? el('section', { class: 'item', id: 'homepage-section', 'aria-label': t('stepHomepage') }, ...homepageSection()) : null,
    actions(),
  ];
}

// ---------------------------------------------------------------- 2. Docker
async function checkDocker() {
  state.dockerReport = null;
  render();
  try {
    state.dockerReport = await api('docker', { docker: state.docker });
  } catch (err) {
    state.dockerReport = { socketMounted: false, servers: [], errors: [err.message] };
  }
  state.cards = null; // the services step scans again
  if (state.step === 1) render();
}

function renderDocker() {
  if (state.dockerReport === null && !state.dockerChecking) {
    state.dockerChecking = true;
    queueMicrotask(() => checkDocker().finally(() => { state.dockerChecking = false; }));
  }
  const r = state.dockerReport;
  const address = el('input', { type: 'text', id: 'docker-address', placeholder: '/var/run/docker.sock · docker-proxy:2375', spellcheck: 'false' });
  const name = el('input', { type: 'text', id: 'docker-name', placeholder: 'nas' });
  const servers = r?.servers ?? [];
  return [
    el('h2', { text: t('stepDocker'), tabindex: '-1' }),
    el('p', { class: 'muted', text: t('dockerText') }),
    !r ? el('p', { class: 'muted', text: t('dockerChecking') }) : null,
    r && !servers.length ? el('div', {}, el('p', { class: 'warn', text: t('dockerNone') }), el('pre', { text: 'volumes:\n  - /var/run/docker.sock:/var/run/docker.sock:ro\n# or, safer: a docker-socket-proxy (CONTAINERS=1, NETWORKS=1) and its address below' })) : null,
    servers.length ? el('ul', { class: 'plain' }, ...servers.map((s) => el('li', { class: s.ok ? 'ok' : 'error' },
      s.ok ? t('dockerOk', { name: s.name, target: s.target, version: s.version ?? '?', count: s.containers }) : t('dockerFailed', { name: s.name, target: s.target, error: s.error }),
      !s.ok && s.permission ? el('div', { class: 'muted', text: t('dockerPermission') }) : null))) : null,
    ...(r?.errors ?? []).map((m) => el('p', { class: 'error', text: m })),
    state.docker.length ? el('div', {}, el('span', { class: 'muted', text: t('dockerAdded') }), el('ul', { class: 'plain' }, ...state.docker.map((d, i) => el('li', {},
      el('code', { text: d.address }), d.name ? ` (${d.name}) ` : ' ',
      el('button', { type: 'button', class: 'link', text: t('remove'), onclick: () => { state.docker.splice(i, 1); checkDocker(); } }))))) : null,
    el('form', { class: 'row', onsubmit: (e) => {
      e.preventDefault();
      if (!address.value.trim()) return;
      state.docker = [...state.docker, { address: address.value.trim(), ...(name.value.trim() ? { name: name.value.trim() } : {}) }];
      checkDocker();
    } },
      el('label', { for: 'docker-address' }, t('dockerAddress'), address),
      el('label', { for: 'docker-name' }, t('dockerName'), name),
      el('button', { type: 'submit', text: t('dockerAdd') })),
    el('p', { class: 'muted', text: t('dockerAddressHint') }),
    el('button', { type: 'button', text: t('check'), onclick: () => checkDocker() }),
    actions(),
  ];
}

// ---------------------------------------------------------------- homepage (in the services step)
function homepageSection() {
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
    el('strong', { text: t('stepHomepage') }),
    el('p', { class: 'muted', text: t('homepageText') }),
    input,
    el('button', { type: 'button', text: t('chooseFiles'), onclick: () => input.click() }),
    report,
  ];
}

// ---------------------------------------------------------------- 4. security
/** What the security step still misses: a password long enough (the server's minimum), typed twice the same. */
function securityProblem() {
  const min = state.status.minPassword;
  if (state.security.password.length < min) return t('passwordShort', { count: min });
  if (state.security.password !== state.security.repeat) return t('passwordMismatch');
  return '';
}

function renderSecurity() {
  if (!state.status) {
    api('status').then((s) => {
      state.status = s;
      // the name the wizard was opened by, when it is a name, as the first allowed host
      if (!state.security.hostsTouched && !s.isAddress) state.security.hosts = s.host;
      if (state.step === 3) render();
    }).catch((err) => {
      state.status = { error: err.message };
      if (state.step === 3) render();
    });
    return [el('h2', { text: t('stepSecurity'), tabindex: '-1' }), el('p', { class: 'muted', text: '…' })];
  }
  const s = state.status;
  if (s.error) return [el('h2', { text: t('stepSecurity'), tabindex: '-1' }), el('p', { class: 'error', role: 'alert', text: s.error })];
  const sec = state.security;
  const problem = state.securityShown ? securityProblem() : '';
  const field = (id, value, oninput, attrs = {}) => el('input', { id, value, oninput: (e) => { oninput(e.target.value); }, ...attrs });
  // a choice: its title in bold (with a badge), the explanation below it a little smaller
  const choice = (value, title, text, badge = null) => el('label', { class: 'choice', for: `login-${value}` },
    el('input', { type: 'radio', name: 'login', id: `login-${value}`, value, checked: sec.login === (value === 'page'), onchange: () => { sec.login = value === 'page'; } }),
    el('span', {}, el('strong', { text: title }), badge ? el('span', { class: 'badge', text: badge }) : null, el('br'), el('span', { class: 'hint', text })));
  return [
    el('h2', { text: t('stepSecurity'), tabindex: '-1' }),
    el('div', { class: 'item' },
      el('strong', { text: t('secAdmin') }),
      el('p', { class: 'muted', text: t('secAdminText') }),
      el('div', { class: 'grid' },
        el('label', { for: 'admin-password' }, t('passwordLabel'), field('admin-password', sec.password, (v) => { sec.password = v; }, { type: 'password', autocomplete: 'new-password', minlength: String(s.minPassword), required: true })),
        el('label', { for: 'admin-repeat' }, t('passwordRepeat'), field('admin-repeat', sec.repeat, (v) => { sec.repeat = v; }, { type: 'password', autocomplete: 'new-password', required: true }))),
      problem ? el('p', { class: 'error', role: 'alert', text: problem }) : null),
    el('div', { class: 'item' },
      el('strong', { text: t('secLogin') }),
      el('div', { class: 'grid', role: 'radiogroup', 'aria-label': t('secLogin') },
        choice('actions', t('loginActions'), t('loginActionsText')),
        choice('page', t('loginPage'), t('loginPageText'), t('safer')))),
    el('div', { class: 'item' },
      el('strong', { text: t('secHosts') }),
      el('p', { class: 'muted', text: t('secHostsHelp') }),
      el('label', { for: 'allowed-hosts', class: 'sr-only', text: t('secHosts') }),
      field('allowed-hosts', sec.hosts, (v) => { sec.hosts = v; sec.hostsTouched = true; }, { type: 'text', placeholder: 'dash.lan, dash.example.com', spellcheck: 'false', style: 'width:100%' })),
    actions(),
  ];
}

// ---------------------------------------------------------------- 5. done
function payload() {
  const { skip } = state;
  const cards = skip ? [] : (state.cards ?? []).filter((c) => c.on && c.name.trim());
  return {
    settings: { ...state.settings, title: state.settings.title.trim() || 'Homelab' },
    docker: skip ? [] : state.docker,
    services: cards.map((c) => ({
      group: c.group, name: c.name, href: c.href || c.options?.url || undefined, container: c.container, server: c.server,
      icon: c.type ? `${c.type}.png` : undefined,
      widget: c.type ? { type: c.type, ...c.options } : undefined,
    })),
    homepage: !skip && state.homepage?.used ? state.homepage.files : undefined,
    security: {
      adminPassword: state.security.password,
      allowedHosts: state.security.hosts.split(/[\s,]+/).map((h) => h.trim()).filter(Boolean),
      login: state.security.login,
    },
  };
}

async function finish(status = null) {
  if (status) status.textContent = t('writing');
  let out;
  try {
    out = await api('finish', payload());
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
  const p = payload();
  const fromHomepage = Object.keys(p.homepage ?? {});
  const files = ['settings.yaml', 'services.yaml', 'widgets.yaml', 'bookmarks.yaml', 'docker.yaml', 'kubernetes.yaml'];
  const status = el('p', { role: 'status', class: 'muted' });
  return [
    el('h2', { text: t('stepDone'), tabindex: '-1' }),
    el('p', { text: t('doneText') }),
    el('ul', { class: 'plain' }, ...[...new Set([...files, ...fromHomepage])].map((f) => el('li', {},
      el('code', { text: f }),
      fromHomepage.includes(f) ? ` (${t('fromHomepage')})` : f === 'services.yaml' ? ` (${t('services', { count: p.services.length })})` : f === 'docker.yaml' && p.docker.length ? ` (${t('dockerServers', { count: p.docker.length })})` : null))),
    status,
    el('div', { class: 'actions' },
      el('button', { type: 'button', text: t('back'), onclick: () => go(state.step - 1) }),
      el('div', { class: 'right' }, el('button', { type: 'button', class: 'primary', text: t('write'), onclick: () => finish(status) }))),
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

window.HD_SETUP = { I18N, state };
init();
