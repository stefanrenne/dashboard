// The settings page (/settings, see src/settings/form.js and routes.js): settings.yaml's look,
// security, layout and widget packages, the config files as forms or as text, the admin password
// and passkeys. It opens with the admin password (a login counts); without one yet, setting one
// comes first.
'use strict';

// the texts; those the setup wizard has too are the same there
const I18N = {
  en: {"titleLabel":"Title","languageLabel":"Language","themeLabel":"Theme","themeAuto":"Follow the system","themeDark":"Dark","themeLight":"Light","colorLabel":"Colour","safer":"safer","secHosts":"Allowed hosts","secHostsHelp":"The names you open the dashboard by. IP addresses and localhost always work; * allows every name. Saved with Save, into settings.yaml.","secAdmin":"Admin password","passwordRepeat":"Repeat the password","passwordShort":"The admin password needs at least {count} characters.","passwordMismatch":"The two passwords are not the same.","wait":"Too many tries; wait {seconds} s","wrong":"Wrong password","heading":"Settings","back":"Dashboard","unlockTitle":"Open the settings","unlockText":"The settings need authentication.","unlock":"Open","wrongCurrent":"The current password is not right.","offline":"The dashboard does not answer.","setupFirst":"There is no admin password yet. Set one first: it guards the settings, the buttons that run something and, if you like, the whole page.","setupRemote":"There is no admin password yet. Set one from the local network, or put adminPassword in settings.yaml.","secAppearance":"Appearance","showTitle":"Show the title on the page","headerStyle":"Header widgets","headerBoxed":"In a box","headerClean":"Without a box","target":"Service links open","targetBlank":"In a new tab","targetSelf":"In this tab","targetTop":"In the whole window","statusStyle":"Status labels","statusText":"As text","statusDot":"As a dot","statusBasic":"UP or DOWN","secSecurity":"Security","loginRemember":"Stay logged in for","durationHelp":"Such as 15m, 12h or 7d; 0 asks every time.","currentPassword":"Current password","newPassword":"New password","changePassword":"Change the password","setPassword":"Set the password","passwordChanged":"The admin password is changed; every other login has ended.","secOther":"Other","hideVersion":"Hide the versions in the footer","disableUpdateCheck":"Do not check for a new release","disableIndexing":"Ask search engines not to index the page","save":"Save","saving":"Saving…","saved":"Saved.","failed":"Not saved: {error}","otherKeys":"Also in settings.yaml, kept as they are (edit them under Advanced): {list}","askWhen":"Security level","askActions":"Only privileged actions","askActionsText":"Anyone can open the dashboard, but changing the settings and running commands that need root, or are marked with confirm:, require authentication.","askPage":"Dashboard access","askPageText":"The dashboard cannot be opened without authentication.","askAgain":"Buttons ask again after","askAgainHelp":"Such as 15m, 12h or 7d; 0 asks for every button.","usePasskey":"Use a passkey","secPasskeys":"Passkeys","passkeysText":"A passkey (with your fingerprint, face or PIN) works wherever authentication is asked, on {host}. The admin password keeps working too.","passkeysHttps":"Passkeys work when the dashboard is opened over https, by its host name. A passkey belongs to the address it was added on.","passkeysNone":"No passkeys for {host} yet.","passkeyName":"Name","addPasskey":"Add a passkey","removePasskey":"Remove","passkeyAdded":"The passkey is added.","passkeyRemoved":"The passkey is removed.","passkeyMeta":"added {created}, last used {used}","passkeyNever":"never","passkeyFailed":"The passkey did not work: {error}","passkeyOld":"This browser cannot add a passkey here; try a newer one.","hostsNone":"No host names yet: only IP addresses and localhost open the dashboard.","hostName":"Host name","addHost":"Add","remove":"Remove","removeHost":"Remove {host}","navLabel":"Sections","navGeneral":"General","navServices":"Services","navHeader":"Header widgets","navBookmarks":"Bookmarks","navDocker":"Docker","navKubernetes":"Kubernetes","navProxmox":"Proxmox","navAdvanced":"Advanced","fileHelp":"The file as it is, with its comments. A save is checked first; the dashboard follows at once.","fileAdvanced":"settings.yaml as a file: also layout, plugins, providers and every other key.","fileChoose":"File","fileIncludedOption":"{file} (included from {from})","fileIncluded":"Included from {from} at {at}: saved in this file, the include stays as it is.","fileNew":"This file does not exist yet; Save creates it.","fileSecrets":"Values shown as __SECRET_…__ are hidden: leave them where they are or move them. A new secret is better in a {{DASHBOARD_VAR_…}} variable.","fileHistory":"Earlier versions","fileLoadVersion":"Load into the editor","fileLoaded":"The version of {time} is in the editor; Save puts it back.","fileUndo":"Undo changes","fileConflict":"The file was changed elsewhere since it was opened.","fileReload":"Reload the file","fileProblems":"Not saved: fix these first.","fileRemarks":"Remarks:","fileUnchanged":"No changes.","fileLoading":"Loading…","navSecurity":"Security","headerUnderlined":"With a line under it","headerBoxedWidgets":"A box per widget","cardStyle":"Cards","cardShadow":"With a shadow","cardHairline":"With a thin border","blockStyle":"Widget values","blockNormal":"Normal","blockRefined":"Heavier and larger","font":"Font","fontPlexData":"IBM Plex Mono for values","fontPlex":"IBM Plex for everything","iconStyle":"Material and Simple icons","iconGradient":"With a gradient","iconTheme":"In the theme colour","bookmarksStyle":"Bookmarks","bookmarksNames":"With their names","bookmarksIcons":"Icons only","secBackground":"Background","backgroundImage":"Image","backgroundImageHelp":"A URL or a file in config/images; empty: none.","backgroundBlur":"Blur","backgroundSaturate":"Saturation (0–200 %)","backgroundBrightness":"Brightness (0–200 %)","backgroundOpacity":"Opacity (0–100 %)","cardBlur":"Frosted cards","blurOff":"Off","percentHelp":"Empty: unchanged.","secLayout":"Layout","fullWidth":"Use the whole window width","maxGroupColumns":"Groups side by side","maxBookmarkGroupColumns":"Bookmark groups side by side","columnsHelp":"On wide screens; 1 to 8, empty: the default.","useEqualHeights":"Cards in a row equally high","disableCollapse":"Group titles do not fold","groupsInitiallyCollapsed":"Every group starts folded","showStats":"Container stats open from the start","secQuicklaunch":"Quick launch","quicklaunchHelp":"Start typing anywhere on the page to find a service, a bookmark or a web search.","qlProvider":"Web search","asSearchWidget":"As the search widget","qlUrl":"Search URL","qlUrlHelp":"For custom: the words go at the end, or where {q} is.","qlSuggestionUrl":"Suggestion URL","qlSuggestionUrlHelp":"For custom: an OpenSearch suggestion URL.","qlTarget":"Web search opens","asServiceLinks":"As service links","qlShowSearchSuggestions":"Suggestions from the search engine","on":"On","off":"Off","qlSearchDescriptions":"Also search the descriptions","qlHideInternetSearch":"No web search entry","qlHideVisitURL":"No entry to open a typed address","qlMobileButtonPosition":"Search button on phones","none":"None","posTopLeft":"Top left","posTopRight":"Top right","posBottomLeft":"Bottom left","posBottomRight":"Bottom right","secPage":"Page and app","description":"Description","descriptionHelp":"For link previews and search engines.","favicon":"Favicon","faviconHelp":"A URL, an icon name such as proxmox.svg, or a file in config/icons.","startUrl":"The installed app opens","startUrlHelp":"An address on the dashboard, such as /#media; empty: the page itself.","base":"Address behind a reverse proxy","baseHelp":"Only under a sub path, such as https://lab.example.com/dashboard/.","instanceName":"Instance name","instanceNameHelp":"For discovery labels meant for this dashboard only.","pwaIcons":"App icons","pwaIconsHelp":"Without icons, the favicon is the app icon.","pwaShortcuts":"App shortcuts","pwaShortcutsHelp":"The menu of the app icon on a long press.","colSrc":"Image","colSizes":"Sizes","colType":"Type","colPurpose":"Purpose","colName":"Name","colUrl":"Address","colDescription":"Description","addRow":"Add","removeRow":"Remove row {n}","noRows":"None yet.","pluginUpdateInterval":"Look for newer plugins every","pluginUpdateHelp":"Such as 1h or 1d; off: never.","discoveryInterval":"Look for Docker and Kubernetes services every","discoveryHelp":"Such as 30s or 5m.","logpath":"Log folder","logpathHelp":"Also log to <folder>/logs/dashboard.log; empty: only the container log.","navLayout":"Groups","layoutHelp":"How each group shows, and the order of the groups. Groups not in the layout follow in their own order.","layoutNone":"No groups yet.","kindServices":"Services","kindBookmarks":"Bookmarks","kindGone":"No such group any more","layoutRemove":"Remove it from the layout","moveUp":"Move {name} up","moveDown":"Move {name} down","groupSettings":"Settings","nestedGroups":"Nested groups","groupStyle":"Arrangement","styleDefault":"Default","styleRow":"Row: cards side by side","styleColumn":"Column: cards stacked","groupColumns":"Cards per row","groupColumnsHelp":"1 to 12; empty: the default.","groupTab":"Tab","groupTabHelp":"Groups with the same tab share it; empty: on every tab.","groupIcon":"Icon before the title","groupHeader":"Show the title","groupCollapsed":"Starts folded","groupEqual":"Cards equally high","groupIconsOnly":"Bookmarks as icons only","asPage":"As the page setting","navPlugins":"Widgets","pluginsHelp":"Widget packages from elsewhere: a git repository, an npm package or a folder in the config. Pin a tag or a version; #latest takes the newest release.","pluginsDefault":"Always installed: {source}","pluginsReplaced":"Replaced by your entry for the same repository.","pluginPinned":"Pinned to {version}","pluginNotPinned":"Not installed yet","pluginKind":"Kind","kindGit":"git repository","kindNpm":"npm package","kindPath":"Folder in the config","pluginValue":"Source","pluginValueHelpGit":"The URL, with #tag, #commit or #latest.","pluginValueHelpNpm":"name@version","pluginValueHelpPath":"Relative to the config folder.","pluginSubdir":"Subfolder","pluginOnly":"Only these widgets","pluginOnlyHelp":"Folder names, separated by commas; empty: all.","pluginAdd":"Add a widget package","pluginsNone":"No packages of your own.","pluginsInstalled":"Installed","pluginSync":"Install again","pluginUpdate":"Update to the newest","pluginSyncing":"Working… this can take a minute.","pluginSynced":"Done.","pluginMessages":"Messages:","pluginSaveHelp":"Saving installs what is new.","pluginNew":"New package","svcEditText":"Edit as text","svcEditForm":"Edit as a form","svcHelp":"Groups and their services, with their widgets.","svcGroupName":"Group name","svcAddService":"Add a service","svcAddGroup":"Add a group","svcAddNested":"Add a nested group","svcNewService":"New service","svcNewGroup":"New group","svcIncluded":"The services of this group are in {file}.","svcIncludedItem":"Included from {file}","svcOpenFile":"Open {file}","svcOther":"Not a group or a service; edit it as text.","svcMoveTo":"Move to","fHref":"Link","fIcon":"Icon","fSiteMonitor":"Status from a URL","fPing":"Status by ping","fContainer":"Status of a Docker container","fServer":"Docker server","svcMore":"More","fTarget":"The link opens","targetHidden":"In the background (a webhook)","fShowStats":"Container stats open","fWeight":"Order weight","fWeightHelp":"Lower comes first.","fFilter":"Hide while","fFilterHelp":"A filter such as container.status == \"exited\".","fConfirm":"Ask before running","confirmPassword":"The admin password","confirmAlways":"Always","confirmNone":"Never","fProxmoxNode":"Proxmox node","fProxmoxVMID":"Proxmox VM ID","fProxmoxType":"Proxmox type","fApp":"Kubernetes app","fNamespace":"Kubernetes namespace","fPodSelector":"Kubernetes pod selector","fExternal":"Outside the cluster (no pod status)","svcOtherKeys":"Also in the file: {list}.","svcDiscovered":"Found by discovery","svcDiscoveredHelp":"From Docker labels or Kubernetes annotations; change them there.","wHeading":"Widgets","wType":"Widget","wAdd":"Add a widget","wRest":"Also: {list} (edit them as text).","wHidden":"Hidden; type to replace it.","wTest":"Test","wTesting":"Testing…","wTestOk":"It answers: {blocks}","wTestOkEmpty":"It answers.","wUnknown":"Unknown widget type; its options are edited as text.","wNone":"No widgets.","wChoose":"Choose a widget","bAbbr":"Abbreviation","bIncluded":"The bookmarks of this group are in {file}.","bAdd":"Add a bookmark","bNew":"New bookmark","srvAdd":"Add a server","dHelp":"A socket, or a host and port. Safer than the socket: a docker-socket-proxy.","dSocket":"Socket","dHost":"Host","dPort":"Port","dProtocol":"Protocol","dCa":"CA file (TLS)","dCert":"Client certificate (TLS)","dKey":"Client key (TLS)","dDiscover":"Add its containers with dashboard labels","dSwarm":"Swarm services","dTest":"Test the connection","dTestOk":"Docker {version}, {count} containers","pHelp":"Proxmox nodes, for proxmoxNode: on a service.","pToken":"Token ID","pSecret":"Token secret","pInsecure":"Accept a self-signed certificate","pFlat":"homepage's single entry for every node; add more nodes as text.","kHelp":"Services from Ingresses, IngressRoutes and HTTPRoutes with getdashboard.dev/* annotations.","kMode":"Discovery","kCluster":"Inside the cluster (service account)","kDefault":"With a kubeconfig","kKubeconfig":"Kubeconfig file","kContext":"Context","kIngress":"Ingresses","kTraefik":"Traefik IngressRoutes","kGateway":"Gateway API HTTPRoutes","fileCustomJs":"custom.js runs on the dashboard in the browser of everyone who opens it, with the page's rights. Only put code here that you wrote or trust.","fileCustomCss":"Your own CSS on top of the page's; it applies at the next load.","importHeading":"Import from homepage","importHelp":"homepage's services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml and docker.yaml: checked first, then they replace these files. Your admin password, login and allowed hosts stay; the previous versions are kept.","importChoose":"homepage's files","importNone":"None of homepage's files.","importSummary":"{files}: {services} services, {bookmarks} bookmarks, {header} header widgets.","importReplaces":"Replaces {files}.","importDo":"Import","importDone":"Imported: {files}.","fileDownload":"Download","fileDownloadHelp":"The text in the editor; hidden values stay hidden.","kTestOk":"Kubernetes {version}; discovery finds {count} services","pTestOk":"Proxmox VE {version}","testSaved":"Tests what is saved."},
  nl: {"titleLabel":"Titel","languageLabel":"Taal","themeLabel":"Thema","themeAuto":"Systeem volgen","themeDark":"Donker","themeLight":"Licht","colorLabel":"Kleur","safer":"veiliger","secHosts":"Toegestane hosts","secHostsHelp":"De namen waarmee je het dashboard opent. IP-adressen en localhost werken altijd; * staat elke naam toe. Opgeslagen met Opslaan, in settings.yaml.","secAdmin":"Admin wachtwoord","passwordRepeat":"Herhaal het wachtwoord","passwordShort":"Het admin wachtwoord moet minstens {count} tekens hebben.","passwordMismatch":"De twee wachtwoorden zijn niet gelijk.","wait":"Te veel pogingen; wacht {seconds} s","wrong":"Onjuist wachtwoord","heading":"Instellingen","back":"Dashboard","unlockTitle":"Instellingen openen","unlockText":"De instellingen vragen om authenticatie.","unlock":"Openen","wrongCurrent":"Het huidige wachtwoord klopt niet.","offline":"Het dashboard antwoordt niet.","setupFirst":"Er is nog geen admin wachtwoord. Stel dat eerst in: het beschermt de instellingen, de knoppen die iets uitvoeren en, als je wilt, de hele pagina.","setupRemote":"Er is nog geen admin wachtwoord. Stel er een in vanaf het lokale netwerk, of zet adminPassword in settings.yaml.","secAppearance":"Uiterlijk","showTitle":"De titel op de pagina tonen","headerStyle":"Headerwidgets","headerBoxed":"In een kader","headerClean":"Zonder kader","target":"Links van services openen","targetBlank":"In een nieuw tabblad","targetSelf":"In dit tabblad","targetTop":"In het hele venster","statusStyle":"Statuslabels","statusText":"Als tekst","statusDot":"Als een stip","statusBasic":"UP of DOWN","secSecurity":"Beveiliging","loginRemember":"Ingelogd blijven voor","durationHelp":"Zoals 15m, 12h of 7d; 0 vraagt het elke keer.","currentPassword":"Huidig wachtwoord","newPassword":"Nieuw wachtwoord","changePassword":"Wachtwoord wijzigen","setPassword":"Wachtwoord instellen","passwordChanged":"Het admin wachtwoord is gewijzigd; elke andere login is beëindigd.","secOther":"Overig","hideVersion":"De versies in de footer verbergen","disableUpdateCheck":"Niet zoeken naar een nieuwe release","disableIndexing":"Zoekmachines vragen de pagina niet te indexeren","save":"Opslaan","saving":"Opslaan…","saved":"Opgeslagen.","failed":"Niet opgeslagen: {error}","otherKeys":"Ook in settings.yaml, blijven zoals ze zijn (pas ze aan onder Geavanceerd): {list}","askWhen":"Beveiligingsniveau","askActions":"Alleen risicovolle acties","askActionsText":"Iedereen kan het dashboard openen, maar voor het wijzigen van de instellingen en het uitvoeren van commando's die root nodig hebben, of gemarkeerd zijn met confirm:, is authenticatie nodig.","askPage":"Toegang tot het dashboard","askPageText":"Het dashboard is niet te openen zonder authenticatie.","askAgain":"Knoppen vragen opnieuw na","askAgainHelp":"Zoals 15m, 12h of 7d; 0 vraagt bij elke knop.","usePasskey":"Passkey gebruiken","secPasskeys":"Passkeys","passkeysText":"Een passkey (met je vingerafdruk, gezicht of pincode) werkt overal waar om authenticatie wordt gevraagd, op {host}. Het admin wachtwoord blijft ook werken.","passkeysHttps":"Passkeys werken als het dashboard via https wordt geopend, op zijn hostnaam. Een passkey hoort bij het adres waarop hij is toegevoegd.","passkeysNone":"Nog geen passkeys voor {host}.","passkeyName":"Naam","addPasskey":"Passkey toevoegen","removePasskey":"Verwijderen","passkeyAdded":"De passkey is toegevoegd.","passkeyRemoved":"De passkey is verwijderd.","passkeyMeta":"toegevoegd {created}, laatst gebruikt {used}","passkeyNever":"nooit","passkeyFailed":"De passkey werkte niet: {error}","passkeyOld":"Deze browser kan hier geen passkey toevoegen; probeer een nieuwere.","hostsNone":"Nog geen hostnamen: alleen IP-adressen en localhost openen het dashboard.","hostName":"Hostnaam","addHost":"Toevoegen","remove":"Verwijderen","removeHost":"{host} verwijderen","navLabel":"Onderdelen","navGeneral":"Algemeen","navServices":"Services","navHeader":"Kopwidgets","navBookmarks":"Bladwijzers","navDocker":"Docker","navKubernetes":"Kubernetes","navProxmox":"Proxmox","navAdvanced":"Geavanceerd","fileHelp":"Het bestand zoals het is, met het commentaar. Opslaan controleert het eerst; het dashboard volgt meteen.","fileAdvanced":"settings.yaml als bestand: ook layout, plugins, providers en elke andere sleutel.","fileChoose":"Bestand","fileIncludedOption":"{file} (ingevoegd vanuit {from})","fileIncluded":"Ingevoegd vanuit {from} bij {at}: opgeslagen in dit bestand, de include blijft zoals hij is.","fileNew":"Dit bestand bestaat nog niet; Opslaan maakt het aan.","fileSecrets":"Waarden als __SECRET_…__ zijn verborgen: laat ze staan of verplaats ze. Een nieuw geheim staat beter in een {{DASHBOARD_VAR_…}}-variabele.","fileHistory":"Eerdere versies","fileLoadVersion":"In de editor laden","fileLoaded":"De versie van {time} staat in de editor; Opslaan zet hem terug.","fileUndo":"Wijzigingen ongedaan maken","fileConflict":"Het bestand is elders gewijzigd sinds het werd geopend.","fileReload":"Bestand opnieuw laden","fileProblems":"Niet opgeslagen: los dit eerst op.","fileRemarks":"Opmerkingen:","fileUnchanged":"Geen wijzigingen.","fileLoading":"Laden…","navSecurity":"Beveiliging","headerUnderlined":"Met een lijn eronder","headerBoxedWidgets":"Een kader per widget","cardStyle":"Kaarten","cardShadow":"Met schaduw","cardHairline":"Met een dunne rand","blockStyle":"Widgetwaarden","blockNormal":"Normaal","blockRefined":"Zwaarder en groter","font":"Lettertype","fontPlexData":"IBM Plex Mono voor waarden","fontPlex":"IBM Plex voor alles","iconStyle":"Material- en Simple-iconen","iconGradient":"Met een verloop","iconTheme":"In de themakleur","bookmarksStyle":"Bladwijzers","bookmarksNames":"Met hun namen","bookmarksIcons":"Alleen iconen","secBackground":"Achtergrond","backgroundImage":"Afbeelding","backgroundImageHelp":"Een URL of een bestand in config/images; leeg: geen.","backgroundBlur":"Vervaging","backgroundSaturate":"Verzadiging (0–200 %)","backgroundBrightness":"Helderheid (0–200 %)","backgroundOpacity":"Dekking (0–100 %)","cardBlur":"Matglazen kaarten","blurOff":"Uit","percentHelp":"Leeg: ongewijzigd.","secLayout":"Indeling","fullWidth":"De hele vensterbreedte gebruiken","maxGroupColumns":"Groepen naast elkaar","maxBookmarkGroupColumns":"Bladwijzergroepen naast elkaar","columnsHelp":"Op brede schermen; 1 tot 8, leeg: de standaard.","useEqualHeights":"Kaarten in een rij even hoog","disableCollapse":"Groepstitels klappen niet in","groupsInitiallyCollapsed":"Elke groep begint ingeklapt","showStats":"Containerstatistieken meteen open","secQuicklaunch":"Snel starten","quicklaunchHelp":"Begin ergens op de pagina te typen om een service, een bladwijzer of een webzoekopdracht te vinden.","qlProvider":"Zoeken op het web","asSearchWidget":"Zoals de zoekwidget","qlUrl":"Zoek-URL","qlUrlHelp":"Voor custom: de zoekwoorden komen achteraan, of waar {q} staat.","qlSuggestionUrl":"Suggestie-URL","qlSuggestionUrlHelp":"Voor custom: een OpenSearch-suggestie-URL.","qlTarget":"Zoeken op het web opent","asServiceLinks":"Zoals servicelinks","qlShowSearchSuggestions":"Suggesties van de zoekmachine","on":"Aan","off":"Uit","qlSearchDescriptions":"Ook in de beschrijvingen zoeken","qlHideInternetSearch":"Geen regel om op het web te zoeken","qlHideVisitURL":"Geen regel om een getypt adres te openen","qlMobileButtonPosition":"Zoekknop op telefoons","none":"Geen","posTopLeft":"Linksboven","posTopRight":"Rechtsboven","posBottomLeft":"Linksonder","posBottomRight":"Rechtsonder","secPage":"Pagina en app","description":"Beschrijving","descriptionHelp":"Voor linkvoorbeelden en zoekmachines.","favicon":"Favicon","faviconHelp":"Een URL, een iconnaam zoals proxmox.svg, of een bestand in config/icons.","startUrl":"De geïnstalleerde app opent","startUrlHelp":"Een adres op het dashboard, zoals /#media; leeg: de pagina zelf.","base":"Adres achter een reverse proxy","baseHelp":"Alleen onder een subpad, zoals https://lab.example.com/dashboard/.","instanceName":"Naam van deze installatie","instanceNameHelp":"Voor discovery-labels die alleen voor dit dashboard bedoeld zijn.","pwaIcons":"App-iconen","pwaIconsHelp":"Zonder iconen is de favicon het app-icoon.","pwaShortcuts":"App-snelkoppelingen","pwaShortcutsHelp":"Het menu als je lang op het app-icoon drukt.","colSrc":"Afbeelding","colSizes":"Formaten","colType":"Type","colPurpose":"Doel","colName":"Naam","colUrl":"Adres","colDescription":"Beschrijving","addRow":"Toevoegen","removeRow":"Rij {n} verwijderen","noRows":"Nog geen.","pluginUpdateInterval":"Naar nieuwere plugins kijken elke","pluginUpdateHelp":"Zoals 1h of 1d; off: nooit.","discoveryInterval":"Docker- en Kubernetes-services zoeken elke","discoveryHelp":"Zoals 30s of 5m.","logpath":"Logmap","logpathHelp":"Ook loggen naar <map>/logs/dashboard.log; leeg: alleen het containerlog.","navLayout":"Groepen","layoutHelp":"Hoe elke groep eruitziet, en de volgorde van de groepen. Groepen die niet in de layout staan, volgen in hun eigen volgorde.","layoutNone":"Nog geen groepen.","kindServices":"Services","kindBookmarks":"Bladwijzers","kindGone":"Deze groep bestaat niet meer","layoutRemove":"Uit de layout verwijderen","moveUp":"{name} omhoog","moveDown":"{name} omlaag","groupSettings":"Instellingen","nestedGroups":"Geneste groepen","groupStyle":"Schikking","styleDefault":"Standaard","styleRow":"Rij: kaarten naast elkaar","styleColumn":"Kolom: kaarten onder elkaar","groupColumns":"Kaarten per rij","groupColumnsHelp":"1 tot 12; leeg: de standaard.","groupTab":"Tabblad","groupTabHelp":"Groepen met hetzelfde tabblad delen het; leeg: op elk tabblad.","groupIcon":"Icoon voor de titel","groupHeader":"De titel tonen","groupCollapsed":"Begint ingeklapt","groupEqual":"Kaarten even hoog","groupIconsOnly":"Bladwijzers alleen als icoon","asPage":"Zoals de pagina-instelling","navPlugins":"Widgets","pluginsHelp":"Widgetpakketten van elders: een git-repository, een npm-pakket of een map in de config. Zet een tag of versie vast; #latest neemt de nieuwste release.","pluginsDefault":"Altijd geïnstalleerd: {source}","pluginsReplaced":"Vervangen door je eigen regel voor dezelfde repository.","pluginPinned":"Vastgezet op {version}","pluginNotPinned":"Nog niet geïnstalleerd","pluginKind":"Soort","kindGit":"git-repository","kindNpm":"npm-pakket","kindPath":"Map in de config","pluginValue":"Bron","pluginValueHelpGit":"De URL, met #tag, #commit of #latest.","pluginValueHelpNpm":"naam@versie","pluginValueHelpPath":"Ten opzichte van de configmap.","pluginSubdir":"Submap","pluginOnly":"Alleen deze widgets","pluginOnlyHelp":"Mapnamen, gescheiden door komma’s; leeg: alle.","pluginAdd":"Een widgetpakket toevoegen","pluginsNone":"Geen eigen pakketten.","pluginsInstalled":"Geïnstalleerd","pluginSync":"Opnieuw installeren","pluginUpdate":"Bijwerken naar de nieuwste","pluginSyncing":"Bezig… dit kan een minuut duren.","pluginSynced":"Klaar.","pluginMessages":"Meldingen:","pluginSaveHelp":"Opslaan installeert wat nieuw is.","pluginNew":"Nieuw pakket","svcEditText":"Als tekst bewerken","svcEditForm":"Als formulier bewerken","svcHelp":"Groepen en hun services, met hun widgets.","svcGroupName":"Groepsnaam","svcAddService":"Een service toevoegen","svcAddGroup":"Een groep toevoegen","svcAddNested":"Een geneste groep toevoegen","svcNewService":"Nieuwe service","svcNewGroup":"Nieuwe groep","svcIncluded":"De services van deze groep staan in {file}.","svcIncludedItem":"Ingevoegd uit {file}","svcOpenFile":"{file} openen","svcOther":"Geen groep of service; bewerk het als tekst.","svcMoveTo":"Verplaatsen naar","fHref":"Link","fIcon":"Icoon","fSiteMonitor":"Status via een URL","fPing":"Status via ping","fContainer":"Status van een Docker-container","fServer":"Docker-server","svcMore":"Meer","fTarget":"De link opent","targetHidden":"Op de achtergrond (een webhook)","fShowStats":"Containerstatistieken open","fWeight":"Volgordegewicht","fWeightHelp":"Lager komt eerst.","fFilter":"Verbergen zolang","fFilterHelp":"Een filter zoals container.status == \"exited\".","fConfirm":"Vragen voor het uitvoeren","confirmPassword":"Het adminwachtwoord","confirmAlways":"Altijd","confirmNone":"Nooit","fProxmoxNode":"Proxmox-node","fProxmoxVMID":"Proxmox-VM-ID","fProxmoxType":"Proxmox-type","fApp":"Kubernetes-app","fNamespace":"Kubernetes-namespace","fPodSelector":"Kubernetes-podselector","fExternal":"Buiten het cluster (geen podstatus)","svcOtherKeys":"Ook in het bestand: {list}.","svcDiscovered":"Gevonden door discovery","svcDiscoveredHelp":"Uit Docker-labels of Kubernetes-annotaties; pas ze daar aan.","wHeading":"Widgets","wType":"Widget","wAdd":"Een widget toevoegen","wRest":"Ook: {list} (bewerk ze als tekst).","wHidden":"Verborgen; typ om te vervangen.","wTest":"Testen","wTesting":"Testen…","wTestOk":"Het antwoordt: {blocks}","wTestOkEmpty":"Het antwoordt.","wUnknown":"Onbekend widgettype; de opties bewerk je als tekst.","wNone":"Geen widgets.","wChoose":"Kies een widget","bAbbr":"Afkorting","bIncluded":"De bladwijzers van deze groep staan in {file}.","bAdd":"Een bladwijzer toevoegen","bNew":"Nieuwe bladwijzer","srvAdd":"Een server toevoegen","dHelp":"Een socket, of een host en poort. Veiliger dan de socket: een docker-socket-proxy.","dSocket":"Socket","dHost":"Host","dPort":"Poort","dProtocol":"Protocol","dCa":"CA-bestand (TLS)","dCert":"Clientcertificaat (TLS)","dKey":"Clientsleutel (TLS)","dDiscover":"De containers met dashboard-labels toevoegen","dSwarm":"Swarm-services","dTest":"De verbinding testen","dTestOk":"Docker {version}, {count} containers","pHelp":"Proxmox-nodes, voor proxmoxNode: bij een service.","pToken":"Token-ID","pSecret":"Tokengeheim","pInsecure":"Een zelfondertekend certificaat accepteren","pFlat":"De enkele regel van homepage voor elke node; meer nodes voeg je als tekst toe.","kHelp":"Services uit Ingresses, IngressRoutes en HTTPRoutes met getdashboard.dev/*-annotaties.","kMode":"Discovery","kCluster":"In het cluster (serviceaccount)","kDefault":"Met een kubeconfig","kKubeconfig":"Kubeconfig-bestand","kContext":"Context","kIngress":"Ingresses","kTraefik":"Traefik IngressRoutes","kGateway":"Gateway API HTTPRoutes","fileCustomJs":"custom.js draait op het dashboard in de browser van iedereen die het opent, met de rechten van de pagina. Zet hier alleen code die je zelf schreef of vertrouwt.","fileCustomCss":"Je eigen CSS boven op die van de pagina; die geldt bij het volgende laden.","importHeading":"Importeren uit homepage","importHelp":"De services.yaml, settings.yaml, bookmarks.yaml, widgets.yaml en docker.yaml van homepage: eerst gecontroleerd, daarna vervangen ze deze bestanden. Je adminwachtwoord, login en toegestane hosts blijven; de vorige versies worden bewaard.","importChoose":"De bestanden van homepage","importNone":"Geen van de bestanden van homepage.","importSummary":"{files}: {services} services, {bookmarks} bladwijzers, {header} kopwidgets.","importReplaces":"Vervangt {files}.","importDo":"Importeren","importDone":"Geïmporteerd: {files}.","fileDownload":"Downloaden","fileDownloadHelp":"De tekst in de editor; verborgen waarden blijven verborgen.","kTestOk":"Kubernetes {version}; discovery vindt {count} services","pTestOk":"Proxmox VE {version}","testSaved":"Test wat opgeslagen is."},
  fr: {"titleLabel":"Titre","languageLabel":"Langue","themeLabel":"Thème","themeAuto":"Suivre le système","themeDark":"Sombre","themeLight":"Clair","colorLabel":"Couleur","safer":"plus sûr","secHosts":"Hôtes autorisés","secAdmin":"Mot de passe administrateur","passwordRepeat":"Répétez le mot de passe","passwordShort":"Le mot de passe administrateur doit compter au moins {count} caractères.","passwordMismatch":"Les deux mots de passe ne sont pas identiques.","wait":"Trop d’essais ; attendez {seconds} s","wrong":"Mot de passe incorrect","heading":"Réglages","back":"Tableau de bord","unlockTitle":"Ouvrir les réglages","unlock":"Ouvrir","wrongCurrent":"Le mot de passe actuel n’est pas le bon.","offline":"Le tableau de bord ne répond pas.","setupFirst":"Il n’y a pas encore de mot de passe administrateur. Définissez-en un d’abord : il protège les réglages, les boutons qui exécutent quelque chose et, si vous le souhaitez, toute la page.","setupRemote":"Il n’y a pas encore de mot de passe administrateur. Définissez-en un depuis le réseau local, ou mettez adminPassword dans settings.yaml.","secAppearance":"Apparence","showTitle":"Afficher le titre sur la page","headerStyle":"Widgets d’en-tête","headerBoxed":"Dans un cadre","headerClean":"Sans cadre","target":"Les liens des services s’ouvrent","targetBlank":"Dans un nouvel onglet","targetSelf":"Dans cet onglet","targetTop":"Dans toute la fenêtre","statusStyle":"Étiquettes d’état","statusText":"En texte","statusDot":"En point","statusBasic":"UP ou DOWN","secSecurity":"Sécurité","loginRemember":"Rester connecté pendant","durationHelp":"Comme 15m, 12h ou 7d ; 0 le demande à chaque fois.","currentPassword":"Mot de passe actuel","newPassword":"Nouveau mot de passe","changePassword":"Changer le mot de passe","setPassword":"Définir le mot de passe","passwordChanged":"Le mot de passe administrateur est changé ; toutes les autres connexions sont terminées.","secOther":"Autre","hideVersion":"Masquer les versions dans le pied de page","disableUpdateCheck":"Ne pas chercher de nouvelle version","disableIndexing":"Demander aux moteurs de recherche de ne pas indexer la page","save":"Enregistrer","saving":"Enregistrement…","saved":"Enregistré.","failed":"Non enregistré : {error}","otherKeys":"Aussi dans settings.yaml, gardés tels quels (modifiez-les dans le fichier) : {list}"},
  de: {"titleLabel":"Titel","languageLabel":"Sprache","themeLabel":"Design","themeAuto":"System folgen","themeDark":"Dunkel","themeLight":"Hell","colorLabel":"Farbe","safer":"sicherer","secHosts":"Erlaubte Hosts","secAdmin":"Admin-Passwort","passwordRepeat":"Passwort wiederholen","passwordShort":"Das Admin-Passwort braucht mindestens {count} Zeichen.","passwordMismatch":"Die beiden Passwörter sind nicht gleich.","wait":"Zu viele Versuche; warte {seconds} s","wrong":"Falsches Passwort","heading":"Einstellungen","back":"Dashboard","unlockTitle":"Einstellungen öffnen","unlock":"Öffnen","wrongCurrent":"Das aktuelle Passwort stimmt nicht.","offline":"Das Dashboard antwortet nicht.","setupFirst":"Es gibt noch kein Admin-Passwort. Lege zuerst eins fest: Es schützt die Einstellungen, die Schaltflächen, die etwas ausführen, und auf Wunsch die ganze Seite.","setupRemote":"Es gibt noch kein Admin-Passwort. Lege eins im lokalen Netz fest oder trage adminPassword in settings.yaml ein.","secAppearance":"Aussehen","showTitle":"Den Titel auf der Seite zeigen","headerStyle":"Header-Widgets","headerBoxed":"In einem Kasten","headerClean":"Ohne Kasten","target":"Links der Dienste öffnen","targetBlank":"In einem neuen Tab","targetSelf":"In diesem Tab","targetTop":"Im ganzen Fenster","statusStyle":"Status-Labels","statusText":"Als Text","statusDot":"Als Punkt","statusBasic":"UP oder DOWN","secSecurity":"Sicherheit","loginRemember":"Angemeldet bleiben für","durationHelp":"Etwa 15m, 12h oder 7d; 0 fragt jedes Mal.","currentPassword":"Aktuelles Passwort","newPassword":"Neues Passwort","changePassword":"Passwort ändern","setPassword":"Passwort festlegen","passwordChanged":"Das Admin-Passwort ist geändert; jede andere Anmeldung ist beendet.","secOther":"Sonstiges","hideVersion":"Die Versionen in der Fußzeile ausblenden","disableUpdateCheck":"Nicht nach einem neuen Release suchen","disableIndexing":"Suchmaschinen bitten, die Seite nicht zu indexieren","save":"Speichern","saving":"Speichere…","saved":"Gespeichert.","failed":"Nicht gespeichert: {error}","otherKeys":"Auch in settings.yaml, bleiben, wie sie sind (in der Datei ändern): {list}"},
  es: {"titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir al sistema","themeDark":"Oscuro","themeLight":"Claro","colorLabel":"Color","safer":"más seguro","secHosts":"Hosts permitidos","secAdmin":"Contraseña de administrador","passwordRepeat":"Repite la contraseña","passwordShort":"La contraseña de administrador necesita al menos {count} caracteres.","passwordMismatch":"Las dos contraseñas no coinciden.","wait":"Demasiados intentos; espera {seconds} s","wrong":"Contraseña incorrecta","heading":"Ajustes","back":"Panel","unlockTitle":"Abrir los ajustes","unlock":"Abrir","wrongCurrent":"La contraseña actual no es correcta.","offline":"El panel no responde.","setupFirst":"Aún no hay contraseña de administrador. Crea una primero: protege los ajustes, los botones que ejecutan algo y, si quieres, toda la página.","setupRemote":"Aún no hay contraseña de administrador. Crea una desde la red local, o pon adminPassword en settings.yaml.","secAppearance":"Apariencia","showTitle":"Mostrar el título en la página","headerStyle":"Widgets de cabecera","headerBoxed":"En un recuadro","headerClean":"Sin recuadro","target":"Los enlaces de servicios se abren","targetBlank":"En una pestaña nueva","targetSelf":"En esta pestaña","targetTop":"En toda la ventana","statusStyle":"Etiquetas de estado","statusText":"Como texto","statusDot":"Como un punto","statusBasic":"UP o DOWN","secSecurity":"Seguridad","loginRemember":"Mantener la sesión durante","durationHelp":"Como 15m, 12h o 7d; 0 la pide cada vez.","currentPassword":"Contraseña actual","newPassword":"Contraseña nueva","changePassword":"Cambiar la contraseña","setPassword":"Crear la contraseña","passwordChanged":"La contraseña de administrador ha cambiado; las demás sesiones han terminado.","secOther":"Otros","hideVersion":"Ocultar las versiones en el pie","disableUpdateCheck":"No buscar una versión nueva","disableIndexing":"Pedir a los buscadores que no indexen la página","save":"Guardar","saving":"Guardando…","saved":"Guardado.","failed":"No guardado: {error}","otherKeys":"También en settings.yaml, se quedan como están (edítalos en el archivo): {list}"},
  ca: {"titleLabel":"Títol","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Segueix el sistema","themeDark":"Fosc","themeLight":"Clar","colorLabel":"Color","safer":"més segur","secHosts":"Amfitrions permesos","secAdmin":"Contrasenya d’administrador","passwordRepeat":"Repeteix la contrasenya","passwordShort":"La contrasenya d’administrador necessita com a mínim {count} caràcters.","passwordMismatch":"Les dues contrasenyes no coincideixen.","wait":"Massa intents; espera {seconds} s","wrong":"Contrasenya incorrecta","heading":"Configuració","back":"Tauler","unlockTitle":"Obre la configuració","unlock":"Obre","wrongCurrent":"La contrasenya actual no és correcta.","offline":"El tauler no respon.","setupFirst":"Encara no hi ha contrasenya d’administrador. Crea’n una primer: protegeix la configuració, els botons que executen alguna cosa i, si vols, tota la pàgina.","setupRemote":"Encara no hi ha contrasenya d’administrador. Crea’n una des de la xarxa local, o posa adminPassword a settings.yaml.","secAppearance":"Aparença","showTitle":"Mostra el títol a la pàgina","headerStyle":"Ginys de capçalera","headerBoxed":"En un requadre","headerClean":"Sense requadre","target":"Els enllaços dels serveis s’obren","targetBlank":"En una pestanya nova","targetSelf":"En aquesta pestanya","targetTop":"A tota la finestra","statusStyle":"Etiquetes d’estat","statusText":"Com a text","statusDot":"Com un punt","statusBasic":"UP o DOWN","secSecurity":"Seguretat","loginRemember":"Mantén la sessió durant","durationHelp":"Com 15m, 12h o 7d; 0 la demana cada vegada.","currentPassword":"Contrasenya actual","newPassword":"Contrasenya nova","changePassword":"Canvia la contrasenya","setPassword":"Crea la contrasenya","passwordChanged":"La contrasenya d’administrador ha canviat; les altres sessions han acabat.","secOther":"Altres","hideVersion":"Amaga les versions al peu","disableUpdateCheck":"No cerquis una versió nova","disableIndexing":"Demana als cercadors que no indexin la pàgina","save":"Desa","saving":"Desant…","saved":"Desat.","failed":"No s’ha desat: {error}","otherKeys":"També a settings.yaml, es mantenen tal com són (edita’ls al fitxer): {list}"},
  he: {"titleLabel":"כותרת","languageLabel":"שפה","themeLabel":"ערכת נושא","themeAuto":"לפי המערכת","themeDark":"כהה","themeLight":"בהיר","colorLabel":"צבע","safer":"בטוח יותר","secHosts":"מארחים מורשים","secAdmin":"סיסמת מנהל","passwordRepeat":"חזרה על הסיסמה","passwordShort":"סיסמת המנהל צריכה לפחות {count} תווים.","passwordMismatch":"שתי הסיסמאות אינן זהות.","wait":"יותר מדי ניסיונות; יש להמתין {seconds} שנ׳","wrong":"סיסמה שגויה","heading":"הגדרות","back":"לוח המחוונים","unlockTitle":"פתיחת ההגדרות","unlock":"פתיחה","wrongCurrent":"הסיסמה הנוכחית אינה נכונה.","offline":"לוח המחוונים אינו עונה.","setupFirst":"עדיין אין סיסמת מנהל. יש להגדיר אחת קודם: היא מגינה על ההגדרות, על הכפתורים שמריצים משהו ואם רוצים גם על כל הדף.","setupRemote":"עדיין אין סיסמת מנהל. יש להגדיר אחת מהרשת המקומית, או להוסיף adminPassword ל־settings.yaml.","secAppearance":"מראה","showTitle":"הצגת הכותרת בדף","headerStyle":"ווידג׳טים בכותרת","headerBoxed":"בתוך מסגרת","headerClean":"בלי מסגרת","target":"קישורי שירותים נפתחים","targetBlank":"בכרטיסייה חדשה","targetSelf":"בכרטיסייה הזו","targetTop":"בכל החלון","statusStyle":"תוויות מצב","statusText":"כטקסט","statusDot":"כנקודה","statusBasic":"UP או DOWN","secSecurity":"אבטחה","loginRemember":"להישאר מחובר למשך","durationHelp":"למשל 15m, 12h או 7d; 0 שואל בכל פעם.","currentPassword":"סיסמה נוכחית","newPassword":"סיסמה חדשה","changePassword":"שינוי הסיסמה","setPassword":"הגדרת הסיסמה","passwordChanged":"סיסמת המנהל שונתה; כל שאר הכניסות הסתיימו.","secOther":"אחר","hideVersion":"הסתרת הגרסאות בכותרת התחתונה","disableUpdateCheck":"לא לבדוק אם יש גרסה חדשה","disableIndexing":"לבקש ממנועי חיפוש לא לאנדקס את הדף","save":"שמירה","saving":"שומר…","saved":"נשמר.","failed":"לא נשמר: {error}","otherKeys":"גם ב־settings.yaml, נשארים כמו שהם (יש לערוך בקובץ): {list}"},
  hr: {"titleLabel":"Naslov","languageLabel":"Jezik","themeLabel":"Tema","themeAuto":"Prati sustav","themeDark":"Tamna","themeLight":"Svijetla","colorLabel":"Boja","safer":"sigurnije","secHosts":"Dopušteni hostovi","secAdmin":"Administratorska lozinka","passwordRepeat":"Ponovi lozinku","passwordShort":"Administratorska lozinka treba barem {count} znakova.","passwordMismatch":"Dvije lozinke nisu iste.","wait":"Previše pokušaja; pričekaj {seconds} s","wrong":"Pogrešna lozinka","heading":"Postavke","back":"Ploča","unlockTitle":"Otvori postavke","unlock":"Otvori","wrongCurrent":"Trenutna lozinka nije točna.","offline":"Ploča ne odgovara.","setupFirst":"Još nema administratorske lozinke. Najprije je postavi: štiti postavke, gumbe koji nešto pokreću i, ako želiš, cijelu stranicu.","setupRemote":"Još nema administratorske lozinke. Postavi je iz lokalne mreže ili upiši adminPassword u settings.yaml.","secAppearance":"Izgled","showTitle":"Prikaži naslov na stranici","headerStyle":"Widgeti zaglavlja","headerBoxed":"U okviru","headerClean":"Bez okvira","target":"Poveznice usluga otvaraju se","targetBlank":"U novoj kartici","targetSelf":"U ovoj kartici","targetTop":"U cijelom prozoru","statusStyle":"Oznake stanja","statusText":"Kao tekst","statusDot":"Kao točka","statusBasic":"UP ili DOWN","secSecurity":"Sigurnost","loginRemember":"Ostani prijavljen","durationHelp":"Npr. 15m, 12h ili 7d; 0 pita svaki put.","currentPassword":"Trenutna lozinka","newPassword":"Nova lozinka","changePassword":"Promijeni lozinku","setPassword":"Postavi lozinku","passwordChanged":"Administratorska lozinka je promijenjena; sve druge prijave su završene.","secOther":"Ostalo","hideVersion":"Sakrij verzije u podnožju","disableUpdateCheck":"Ne traži novo izdanje","disableIndexing":"Zamoli tražilice da ne indeksiraju stranicu","save":"Spremi","saving":"Spremam…","saved":"Spremljeno.","failed":"Nije spremljeno: {error}","otherKeys":"I u settings.yaml, ostaju kakvi jesu (uredi ih u datoteci): {list}"},
  hu: {"titleLabel":"Cím","languageLabel":"Nyelv","themeLabel":"Téma","themeAuto":"Rendszer szerint","themeDark":"Sötét","themeLight":"Világos","colorLabel":"Szín","safer":"biztonságosabb","secHosts":"Engedélyezett hostok","secAdmin":"Adminjelszó","passwordRepeat":"Jelszó ismét","passwordShort":"Az adminjelszónak legalább {count} karakter kell.","passwordMismatch":"A két jelszó nem egyezik.","wait":"Túl sok próbálkozás; várj {seconds} mp-et","wrong":"Hibás jelszó","heading":"Beállítások","back":"Irányítópult","unlockTitle":"Beállítások megnyitása","unlock":"Megnyitás","wrongCurrent":"A jelenlegi jelszó nem jó.","offline":"Az irányítópult nem válaszol.","setupFirst":"Még nincs adminjelszó. Előbb állíts be egyet: védi a beállításokat, a valamit futtató gombokat és, ha szeretnéd, az egész oldalt.","setupRemote":"Még nincs adminjelszó. Állíts be egyet a helyi hálózatról, vagy írd az adminPassword-öt a settings.yaml-ba.","secAppearance":"Megjelenés","showTitle":"A cím megjelenítése az oldalon","headerStyle":"Fejléc-widgetek","headerBoxed":"Keretben","headerClean":"Keret nélkül","target":"A szolgáltatások linkjei megnyílnak","targetBlank":"Új lapon","targetSelf":"Ezen a lapon","targetTop":"Az egész ablakban","statusStyle":"Állapotcímkék","statusText":"Szövegként","statusDot":"Pontként","statusBasic":"UP vagy DOWN","secSecurity":"Biztonság","loginRemember":"Bejelentkezve maradás","durationHelp":"Például 15m, 12h vagy 7d; 0 mindig kéri.","currentPassword":"Jelenlegi jelszó","newPassword":"Új jelszó","changePassword":"Jelszó módosítása","setPassword":"Jelszó beállítása","passwordChanged":"Az adminjelszó megváltozott; minden más bejelentkezés véget ért.","secOther":"Egyéb","hideVersion":"A verziók elrejtése a láblécben","disableUpdateCheck":"Ne keressen új kiadást","disableIndexing":"Kérje a keresőket, hogy ne indexeljék az oldalt","save":"Mentés","saving":"Mentés…","saved":"Mentve.","failed":"Nincs mentve: {error}","otherKeys":"A settings.yaml-ban ezek is vannak, változatlanul maradnak (a fájlban szerkeszd): {list}"},
  it: {"titleLabel":"Titolo","languageLabel":"Lingua","themeLabel":"Tema","themeAuto":"Segui il sistema","themeDark":"Scuro","themeLight":"Chiaro","colorLabel":"Colore","safer":"più sicuro","secHosts":"Host consentiti","secAdmin":"Password di amministratore","passwordRepeat":"Ripeti la password","passwordShort":"La password di amministratore richiede almeno {count} caratteri.","passwordMismatch":"Le due password non coincidono.","wait":"Troppi tentativi; attendi {seconds} s","wrong":"Password errata","heading":"Impostazioni","back":"Dashboard","unlockTitle":"Apri le impostazioni","unlock":"Apri","wrongCurrent":"La password attuale non è giusta.","offline":"La dashboard non risponde.","setupFirst":"Non c’è ancora una password di amministratore. Impostane una prima: protegge le impostazioni, i pulsanti che eseguono qualcosa e, se vuoi, tutta la pagina.","setupRemote":"Non c’è ancora una password di amministratore. Impostane una dalla rete locale, o metti adminPassword in settings.yaml.","secAppearance":"Aspetto","showTitle":"Mostra il titolo nella pagina","headerStyle":"Widget dell’intestazione","headerBoxed":"In un riquadro","headerClean":"Senza riquadro","target":"I link dei servizi si aprono","targetBlank":"In una nuova scheda","targetSelf":"In questa scheda","targetTop":"In tutta la finestra","statusStyle":"Etichette di stato","statusText":"Come testo","statusDot":"Come un punto","statusBasic":"UP o DOWN","secSecurity":"Sicurezza","loginRemember":"Resta connesso per","durationHelp":"Ad esempio 15m, 12h o 7d; 0 la chiede ogni volta.","currentPassword":"Password attuale","newPassword":"Nuova password","changePassword":"Cambia la password","setPassword":"Imposta la password","passwordChanged":"La password di amministratore è cambiata; tutti gli altri accessi sono terminati.","secOther":"Altro","hideVersion":"Nascondi le versioni nel piè di pagina","disableUpdateCheck":"Non cercare una nuova versione","disableIndexing":"Chiedi ai motori di ricerca di non indicizzare la pagina","save":"Salva","saving":"Salvataggio…","saved":"Salvato.","failed":"Non salvato: {error}","otherKeys":"Anche in settings.yaml, restano come sono (modificali nel file): {list}"},
  'nb-NO': {"titleLabel":"Tittel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Følg systemet","themeDark":"Mørkt","themeLight":"Lyst","colorLabel":"Farge","safer":"tryggere","secHosts":"Tillatte verter","secAdmin":"Adminpassord","passwordRepeat":"Gjenta passordet","passwordShort":"Adminpassordet må ha minst {count} tegn.","passwordMismatch":"De to passordene er ikke like.","wait":"For mange forsøk; vent {seconds} s","wrong":"Feil passord","heading":"Innstillinger","back":"Dashbord","unlockTitle":"Åpne innstillingene","unlock":"Åpne","wrongCurrent":"Det nåværende passordet stemmer ikke.","offline":"Dashbordet svarer ikke.","setupFirst":"Det finnes ikke noe adminpassord ennå. Sett et først: det beskytter innstillingene, knappene som kjører noe og, om du vil, hele siden.","setupRemote":"Det finnes ikke noe adminpassord ennå. Sett et fra det lokale nettet, eller legg adminPassword i settings.yaml.","secAppearance":"Utseende","showTitle":"Vis tittelen på siden","headerStyle":"Toppwidgeter","headerBoxed":"I en boks","headerClean":"Uten boks","target":"Lenker til tjenester åpnes","targetBlank":"I en ny fane","targetSelf":"I denne fanen","targetTop":"I hele vinduet","statusStyle":"Statusetiketter","statusText":"Som tekst","statusDot":"Som en prikk","statusBasic":"UP eller DOWN","secSecurity":"Sikkerhet","loginRemember":"Forbli innlogget i","durationHelp":"For eksempel 15m, 12h eller 7d; 0 spør hver gang.","currentPassword":"Nåværende passord","newPassword":"Nytt passord","changePassword":"Endre passordet","setPassword":"Sett passordet","passwordChanged":"Adminpassordet er endret; alle andre innlogginger er avsluttet.","secOther":"Annet","hideVersion":"Skjul versjonene i bunnteksten","disableUpdateCheck":"Ikke se etter en ny utgivelse","disableIndexing":"Be søkemotorer om ikke å indeksere siden","save":"Lagre","saving":"Lagrer…","saved":"Lagret.","failed":"Ikke lagret: {error}","otherKeys":"Også i settings.yaml, beholdes som de er (rediger dem i filen): {list}"},
  pt: {"titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir o sistema","themeDark":"Escuro","themeLight":"Claro","colorLabel":"Cor","safer":"mais seguro","secHosts":"Hosts permitidos","secAdmin":"Palavra-passe de administrador","passwordRepeat":"Repita a palavra-passe","passwordShort":"A palavra-passe de administrador precisa de pelo menos {count} caracteres.","passwordMismatch":"As duas palavras-passe não são iguais.","wait":"Demasiadas tentativas; aguarde {seconds} s","wrong":"Palavra-passe incorreta","heading":"Definições","back":"Painel","unlockTitle":"Abrir as definições","unlock":"Abrir","wrongCurrent":"A palavra-passe atual não está certa.","offline":"O painel não responde.","setupFirst":"Ainda não há palavra-passe de administrador. Defina uma primeiro: protege as definições, os botões que executam algo e, se quiser, a página inteira.","setupRemote":"Ainda não há palavra-passe de administrador. Defina uma a partir da rede local, ou ponha adminPassword em settings.yaml.","secAppearance":"Aspeto","showTitle":"Mostrar o título na página","headerStyle":"Widgets do cabeçalho","headerBoxed":"Numa caixa","headerClean":"Sem caixa","target":"As ligações dos serviços abrem","targetBlank":"Num novo separador","targetSelf":"Neste separador","targetTop":"Na janela inteira","statusStyle":"Etiquetas de estado","statusText":"Como texto","statusDot":"Como um ponto","statusBasic":"UP ou DOWN","secSecurity":"Segurança","loginRemember":"Manter a sessão durante","durationHelp":"Como 15m, 12h ou 7d; 0 pede sempre.","currentPassword":"Palavra-passe atual","newPassword":"Nova palavra-passe","changePassword":"Mudar a palavra-passe","setPassword":"Definir a palavra-passe","passwordChanged":"A palavra-passe de administrador foi mudada; todas as outras sessões terminaram.","secOther":"Outros","hideVersion":"Ocultar as versões no rodapé","disableUpdateCheck":"Não procurar uma nova versão","disableIndexing":"Pedir aos motores de busca que não indexem a página","save":"Guardar","saving":"A guardar…","saved":"Guardado.","failed":"Não guardado: {error}","otherKeys":"Também em settings.yaml, ficam como estão (edite-os no ficheiro): {list}"},
  ru: {"titleLabel":"Заголовок","languageLabel":"Язык","themeLabel":"Тема","themeAuto":"Как в системе","themeDark":"Тёмная","themeLight":"Светлая","colorLabel":"Цвет","safer":"безопаснее","secHosts":"Разрешённые хосты","secAdmin":"Пароль администратора","passwordRepeat":"Повторите пароль","passwordShort":"Пароль администратора должен быть не короче {count} символов.","passwordMismatch":"Пароли не совпадают.","wait":"Слишком много попыток; подождите {seconds} с","wrong":"Неверный пароль","heading":"Настройки","back":"Панель","unlockTitle":"Открыть настройки","unlock":"Открыть","wrongCurrent":"Текущий пароль неверен.","offline":"Панель не отвечает.","setupFirst":"Пароля администратора ещё нет. Сначала задайте его: он защищает настройки, кнопки, которые что-то запускают, и при желании всю страницу.","setupRemote":"Пароля администратора ещё нет. Задайте его из локальной сети или впишите adminPassword в settings.yaml.","secAppearance":"Внешний вид","showTitle":"Показывать заголовок на странице","headerStyle":"Виджеты в шапке","headerBoxed":"В рамке","headerClean":"Без рамки","target":"Ссылки сервисов открываются","targetBlank":"В новой вкладке","targetSelf":"В этой вкладке","targetTop":"Во всём окне","statusStyle":"Метки статуса","statusText":"Текстом","statusDot":"Точкой","statusBasic":"UP или DOWN","secSecurity":"Безопасность","loginRemember":"Оставаться в системе","durationHelp":"Например 15m, 12h или 7d; 0 спрашивает каждый раз.","currentPassword":"Текущий пароль","newPassword":"Новый пароль","changePassword":"Сменить пароль","setPassword":"Задать пароль","passwordChanged":"Пароль администратора изменён; все остальные входы завершены.","secOther":"Прочее","hideVersion":"Скрыть версии в подвале","disableUpdateCheck":"Не проверять новый релиз","disableIndexing":"Просить поисковики не индексировать страницу","save":"Сохранить","saving":"Сохранение…","saved":"Сохранено.","failed":"Не сохранено: {error}","otherKeys":"Также в settings.yaml, остаются как есть (правьте их в файле): {list}"},
  sv: {"titleLabel":"Titel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Följ systemet","themeDark":"Mörkt","themeLight":"Ljust","colorLabel":"Färg","safer":"säkrare","secHosts":"Tillåtna värdar","secAdmin":"Adminlösenord","passwordRepeat":"Upprepa lösenordet","passwordShort":"Adminlösenordet behöver minst {count} tecken.","passwordMismatch":"De två lösenorden är inte lika.","wait":"För många försök; vänta {seconds} s","wrong":"Fel lösenord","heading":"Inställningar","back":"Instrumentpanel","unlockTitle":"Öppna inställningarna","unlock":"Öppna","wrongCurrent":"Det nuvarande lösenordet stämmer inte.","offline":"Instrumentpanelen svarar inte.","setupFirst":"Det finns inget adminlösenord ännu. Ställ in ett först: det skyddar inställningarna, knapparna som kör något och, om du vill, hela sidan.","setupRemote":"Det finns inget adminlösenord ännu. Ställ in ett från det lokala nätverket, eller lägg adminPassword i settings.yaml.","secAppearance":"Utseende","showTitle":"Visa titeln på sidan","headerStyle":"Sidhuvudwidgetar","headerBoxed":"I en ruta","headerClean":"Utan ruta","target":"Länkar till tjänster öppnas","targetBlank":"I en ny flik","targetSelf":"I den här fliken","targetTop":"I hela fönstret","statusStyle":"Statusetiketter","statusText":"Som text","statusDot":"Som en prick","statusBasic":"UP eller DOWN","secSecurity":"Säkerhet","loginRemember":"Förbli inloggad i","durationHelp":"Till exempel 15m, 12h eller 7d; 0 frågar varje gång.","currentPassword":"Nuvarande lösenord","newPassword":"Nytt lösenord","changePassword":"Byt lösenord","setPassword":"Ställ in lösenordet","passwordChanged":"Adminlösenordet är bytt; alla andra inloggningar har avslutats.","secOther":"Övrigt","hideVersion":"Dölj versionerna i sidfoten","disableUpdateCheck":"Sök inte efter en ny version","disableIndexing":"Be sökmotorer att inte indexera sidan","save":"Spara","saving":"Sparar…","saved":"Sparat.","failed":"Inte sparat: {error}","otherKeys":"Finns också i settings.yaml, behålls som de är (redigera dem i filen): {list}"},
  vi: {"titleLabel":"Tiêu đề","languageLabel":"Ngôn ngữ","themeLabel":"Chủ đề","themeAuto":"Theo hệ thống","themeDark":"Tối","themeLight":"Sáng","colorLabel":"Màu","safer":"an toàn hơn","secHosts":"Máy chủ được phép","secAdmin":"Mật khẩu quản trị","passwordRepeat":"Nhập lại mật khẩu","passwordShort":"Mật khẩu quản trị cần ít nhất {count} ký tự.","passwordMismatch":"Hai mật khẩu không giống nhau.","wait":"Quá nhiều lần thử; chờ {seconds} giây","wrong":"Sai mật khẩu","heading":"Cài đặt","back":"Bảng điều khiển","unlockTitle":"Mở cài đặt","unlock":"Mở","wrongCurrent":"Mật khẩu hiện tại không đúng.","offline":"Bảng điều khiển không phản hồi.","setupFirst":"Chưa có mật khẩu quản trị. Hãy đặt một mật khẩu trước: nó bảo vệ phần cài đặt, các nút chạy lệnh và, nếu muốn, cả trang.","setupRemote":"Chưa có mật khẩu quản trị. Hãy đặt từ mạng nội bộ, hoặc thêm adminPassword vào settings.yaml.","secAppearance":"Giao diện","showTitle":"Hiện tiêu đề trên trang","headerStyle":"Widget đầu trang","headerBoxed":"Trong khung","headerClean":"Không khung","target":"Liên kết dịch vụ mở","targetBlank":"Trong thẻ mới","targetSelf":"Trong thẻ này","targetTop":"Trong cả cửa sổ","statusStyle":"Nhãn trạng thái","statusText":"Dạng chữ","statusDot":"Dạng chấm","statusBasic":"UP hoặc DOWN","secSecurity":"Bảo mật","loginRemember":"Giữ đăng nhập trong","durationHelp":"Ví dụ 15m, 12h hoặc 7d; 0 hỏi mỗi lần.","currentPassword":"Mật khẩu hiện tại","newPassword":"Mật khẩu mới","changePassword":"Đổi mật khẩu","setPassword":"Đặt mật khẩu","passwordChanged":"Đã đổi mật khẩu quản trị; mọi phiên đăng nhập khác đã kết thúc.","secOther":"Khác","hideVersion":"Ẩn phiên bản ở chân trang","disableUpdateCheck":"Không kiểm tra bản phát hành mới","disableIndexing":"Yêu cầu công cụ tìm kiếm không lập chỉ mục trang","save":"Lưu","saving":"Đang lưu…","saved":"Đã lưu.","failed":"Chưa lưu: {error}","otherKeys":"Cũng có trong settings.yaml, giữ nguyên (sửa trong tệp): {list}"},
  'zh-Hans': {"titleLabel":"标题","languageLabel":"语言","themeLabel":"主题","themeAuto":"跟随系统","themeDark":"深色","themeLight":"浅色","colorLabel":"颜色","safer":"更安全","secHosts":"允许的主机","secAdmin":"管理员密码","passwordRepeat":"再次输入密码","passwordShort":"管理员密码至少需要 {count} 个字符。","passwordMismatch":"两次输入的密码不一致。","wait":"尝试次数过多；请等待 {seconds} 秒","wrong":"密码错误","heading":"设置","back":"仪表板","unlockTitle":"打开设置","unlock":"打开","wrongCurrent":"当前密码不正确。","offline":"仪表板没有响应。","setupFirst":"还没有管理员密码。请先设置：它保护设置、执行操作的按钮，也可以保护整个页面。","setupRemote":"还没有管理员密码。请从本地网络设置，或在 settings.yaml 中写入 adminPassword。","secAppearance":"外观","showTitle":"在页面上显示标题","headerStyle":"页头小组件","headerBoxed":"带边框","headerClean":"无边框","target":"服务链接打开于","targetBlank":"新标签页","targetSelf":"当前标签页","targetTop":"整个窗口","statusStyle":"状态标签","statusText":"文字","statusDot":"圆点","statusBasic":"UP 或 DOWN","secSecurity":"安全","loginRemember":"保持登录","durationHelp":"如 15m、12h 或 7d；0 表示每次都询问。","currentPassword":"当前密码","newPassword":"新密码","changePassword":"修改密码","setPassword":"设置密码","passwordChanged":"管理员密码已修改；其他所有登录都已结束。","secOther":"其他","hideVersion":"在页脚隐藏版本","disableUpdateCheck":"不检查新版本","disableIndexing":"要求搜索引擎不要索引此页面","save":"保存","saving":"正在保存…","saved":"已保存。","failed":"未保存：{error}","otherKeys":"settings.yaml 中还有以下项，保持不变（请在文件中编辑）：{list}"},
  'zh-Hant': {"titleLabel":"標題","languageLabel":"語言","themeLabel":"主題","themeAuto":"跟隨系統","themeDark":"深色","themeLight":"淺色","colorLabel":"顏色","safer":"較安全","secHosts":"允許的主機","secAdmin":"管理員密碼","passwordRepeat":"再次輸入密碼","passwordShort":"管理員密碼至少需要 {count} 個字元。","passwordMismatch":"兩次輸入的密碼不一致。","wait":"嘗試次數過多；請等待 {seconds} 秒","wrong":"密碼錯誤","heading":"設定","back":"儀表板","unlockTitle":"開啟設定","unlock":"開啟","wrongCurrent":"目前的密碼不正確。","offline":"儀表板沒有回應。","setupFirst":"還沒有管理員密碼。請先設定：它保護設定、執行動作的按鈕，也可以保護整個頁面。","setupRemote":"還沒有管理員密碼。請從區域網路設定，或在 settings.yaml 中寫入 adminPassword。","secAppearance":"外觀","showTitle":"在頁面上顯示標題","headerStyle":"頁首小工具","headerBoxed":"有外框","headerClean":"無外框","target":"服務連結開啟於","targetBlank":"新分頁","targetSelf":"目前分頁","targetTop":"整個視窗","statusStyle":"狀態標籤","statusText":"文字","statusDot":"圓點","statusBasic":"UP 或 DOWN","secSecurity":"安全","loginRemember":"保持登入","durationHelp":"如 15m、12h 或 7d；0 表示每次都詢問。","currentPassword":"目前密碼","newPassword":"新密碼","changePassword":"變更密碼","setPassword":"設定密碼","passwordChanged":"管理員密碼已變更；其他所有登入都已結束。","secOther":"其他","hideVersion":"在頁尾隱藏版本","disableUpdateCheck":"不檢查新版本","disableIndexing":"要求搜尋引擎不要索引此頁面","save":"儲存","saving":"正在儲存…","saved":"已儲存。","failed":"未儲存：{error}","otherKeys":"settings.yaml 中還有以下項目，保持不變（請在檔案中編輯）：{list}"},
};
const copy = (value) => JSON.parse(JSON.stringify(value));

let lang = 'en';
const t = translator(I18N, () => lang);

const state = { section: 'general', files: null, file: {}, chosen: {}, mode: {}, forms: {}, data: null, values: null, status: '', statusClass: 'muted', pw: { current: '', next: '', repeat: '', message: '', ok: false }, pk: { name: '', message: '', ok: false, busy: false } };

async function api(path, body, headers = {}) {
  const url = `api/settings${path}`;
  if (body === undefined && !Object.keys(headers).length) return (await fetch(url)).json();
  return postJson(url, body ?? {}, headers);
}

function applyTheme(v) {
  lang = applyLanguage(v.language, I18N);
  applyPalette(v.color);
  applyAppearance(v.theme);
  document.title = t('heading');
  document.getElementById('heading').textContent = t('heading');
  document.getElementById('back').textContent = `← ${t('back')}`;
}

function show(...nodes) {
  const y = window.scrollY ?? 0;
  document.getElementById('panel').replaceChildren(...nodes.flat().filter(Boolean));
  window.scrollTo?.(0, y);
}

function askPassword(message = '') {
  const input = el('input', { type: 'password', id: 'admin-password', autocomplete: 'current-password', required: true });
  const passkey = el('button', { type: 'button', id: 'unlock-passkey', text: t('usePasskey'), hidden: true, onclick: async () => {
    passkey.disabled = true;
    try {
      const token = await passkeyToken();
      if (token) {
        const out = await api('/unlock', {}, { 'x-dashboard-passkey': token });
        if (out.ok) return load();
      }
      passkey.disabled = false;
    } catch (err) {
      askPassword(err.retryAfter ? t('wait', { seconds: err.retryAfter }) : t('passkeyFailed', { error: err.message }));
    }
  } });
  const form = el('form', { class: 'panel', onsubmit: async (e) => {
    e.preventDefault();
    if (!input.value) return;
    const out = await api('/unlock', {}, { 'x-dashboard-password': input.value });
    if (out.ok) return load();
    askPassword(out.retryAfter ? t('wait', { seconds: out.retryAfter }) : t('wrong'));
  } },
  el('h2', { text: t('unlockTitle') }),
  el('p', { class: 'muted', text: t('unlockText') }),
  message ? el('p', { class: 'error', role: 'alert', text: message }) : null,
  el('input', { type: 'text', name: 'username', autocomplete: 'username', value: 'dashboard', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' }),
  el('label', { for: 'admin-password', text: t('secAdmin') }), input,
  el('div', { class: 'actions' }, el('div', { class: 'right' }, passkey, el('button', { type: 'submit', class: 'primary', text: t('unlock') }))));
  show(form);
  input.focus();
  passkeyAvailable().then((ok) => {
    passkey.hidden = !ok;
    // asked at once; not again after a refusal (a message), so a failing passkey never loops
    if (ok && !message) passkey.click();
  });
}

async function load() {
  let out;
  try {
    out = await api('');
  } catch {
    return show(el('p', { class: 'error', text: t('offline') }));
  }
  if (out.needsLogin) {
    window.location.href = 'login';
    return;
  }
  if (out.needsPassword) return askPassword(out.retryAfter ? t('wait', { seconds: out.retryAfter }) : '');
  if (out.needsSetup) return show(el('section', { class: 'panel' }, el('p', { class: 'warn', text: t('setupRemote') })));
  takeAnswer(out);
  render();
}

/** The settings answer as the page edits it. */
function takeAnswer(out) {
  state.data = out;
  state.values = copy(out.values);
  state.layoutGroups = copy(out.layout?.groups ?? []);
  state.pluginEntries = copy(out.plugins?.entries ?? []);
  applyTheme(state.values);
}

/** After a write: every form and file is read again. */
async function reread() {
  state.files = null;
  state.forms = {};
  const fresh = await api('').catch(() => null);
  if (fresh?.ok) takeAnswer(fresh);
}

// ---------------------------------------------------------------- the form
function field(id, label, input, help = '') {
  return el('label', { for: id }, label, input, help ? el('span', { class: 'hint', text: help }) : null);
}
function select(key, entries) {
  return el('select', { id: key, onchange: (e) => { state.values[key] = e.target.value; if (['language', 'theme'].includes(key)) applyTheme(state.values); if (['language', 'theme', 'qlProvider'].includes(key)) render(); } },
    ...entries.map(([v, label]) => el('option', { value: v, selected: v === state.values[key], text: label })));
}
function check(key, label) {
  return el('label', { class: 'check', for: key }, el('input', { type: 'checkbox', id: key, checked: state.values[key], onchange: (e) => { state.values[key] = e.target.checked; } }), label);
}
function text(key, attrs = {}) {
  return el('input', { type: 'text', id: key, value: state.values[key], oninput: (e) => { state.values[key] = e.target.value; }, ...attrs });
}

// the text of a choice, where a value is not its own name
const VALUE_TEXT = {
  auto: 'themeAuto', dark: 'themeDark', light: 'themeLight',
  boxed: 'headerBoxed', clean: 'headerClean', underlined: 'headerUnderlined', boxedWidgets: 'headerBoxedWidgets',
  _blank: 'targetBlank', _self: 'targetSelf', _top: 'targetTop', 'hidden-iframe': 'targetHidden',
  dot: 'statusDot', basic: 'statusBasic', hairline: 'cardHairline', refined: 'blockRefined',
  plexData: 'fontPlexData', plex: 'fontPlex', gradient: 'iconGradient', theme: 'iconTheme', icons: 'bookmarksIcons',
  'top-left': 'posTopLeft', 'top-right': 'posTopRight', 'bottom-left': 'posBottomLeft', 'bottom-right': 'posBottomRight',
  password: 'confirmPassword', always: 'confirmAlways', none: 'confirmNone', true: 'on', false: 'off',
  row: 'styleRow', column: 'styleColumn',
};
/** A select's entries for `values` (the server's list); `empty` is the text of '' (the default). */
const options = (values, empty) => values.map((v) => [v, v === '' ? empty : VALUE_TEXT[v] ? t(VALUE_TEXT[v]) : v]);
/** The entries of a settings.yaml field (FIELDS on the server). */
const choices = (key, empty) => options(state.data.form[key].values, empty);

function number(key) {
  const { min, max } = state.data.form[key];
  return el('input', { type: 'number', id: key, min: String(min), max: String(max), step: '1', inputmode: 'numeric', value: state.values[key], oninput: (e) => { state.values[key] = e.target.value; } });
}

/** A list of maps (FIELDS `keys`), a row per entry; a column's text is col<Key>. */
function listField(key, legend, help) {
  const columns = state.data.form[key].keys.map((k) => [k, `col${k[0].toUpperCase()}${k.slice(1)}`]);
  const rows = state.values[key];
  const blank = () => Object.fromEntries(columns.map(([k]) => [k, '']));
  return el('fieldset', { class: 'ask' },
    el('legend', { text: legend }),
    el('p', { class: 'muted', text: help }),
    rows.length ? null : el('p', { class: 'muted', text: t('noRows') }),
    ...rows.map((row, i) => el('div', { class: 'row' },
      ...columns.map(([k, label]) => field(`${key}-${i}-${k}`, t(label), el('input', { type: 'text', id: `${key}-${i}-${k}`, value: row[k] ?? '', spellcheck: 'false', autocapitalize: 'off',
        oninput: (e) => { row[k] = e.target.value; } }))),
      el('button', { type: 'button', text: t('remove'), 'aria-label': t('removeRow', { n: i + 1 }), onclick: () => { state.values[key] = rows.filter((_, j) => j !== i); render(); } }))),
    el('div', { class: 'row' }, el('button', { type: 'button', text: t('addRow'), onclick: () => { state.values[key] = [...rows, blank()]; render(); document.getElementById(`${key}-${rows.length}-${columns[0][0]}`)?.focus(); } })));
}

const saveBar = () => statusBar(state, save);

function render() {
  if (state.data.noPassword) return show(passwordSection());
  const section = SECTIONS.find((x) => x.id === state.section);
  if (section.form && state.mode[section.file] === 'text') return show(nav(), modeToggle(section.file), fileSection(section));
  return show(nav(), section.view(section));
}

function generalSection() {
  const v = state.values;
  const d = state.data;
  const swatches = el('div', { class: 'swatches', role: 'group', 'aria-label': t('colorLabel') }, ...Object.keys(PALETTES).map((name) => {
    const b = el('button', { type: 'button', class: 'swatch', title: name, 'aria-label': name, 'aria-pressed': String(name === v.color), onclick: () => { v.color = name; applyTheme(v); render(); } });
    b.style.background = PALETTES[name].split(' ')[5];
    return b;
  }));
  const ql = v.qlProvider === 'custom';
  return [
    el('section', { class: 'panel' },
      el('h2', { text: t('secAppearance') }),
      el('div', { class: 'grid' },
        field('title', t('titleLabel'), text('title', { maxlength: String(state.data.form.title.max) })),
        field('language', t('languageLabel'), select('language', Object.entries(LANGUAGE_NAMES))),
        field('theme', t('themeLabel'), select('theme', choices('theme')))),
      el('div', {}, el('span', { class: 'muted', text: t('colorLabel') }), swatches),
      el('div', { class: 'grid' },
        field('headerStyle', t('headerStyle'), select('headerStyle', choices('headerStyle'))),
        field('target', t('target'), select('target', choices('target'))),
        field('statusStyle', t('statusStyle'), select('statusStyle', choices('statusStyle', t('statusText')))),
        field('cardStyle', t('cardStyle'), select('cardStyle', choices('cardStyle', t('cardShadow')))),
        field('blockStyle', t('blockStyle'), select('blockStyle', choices('blockStyle', t('blockNormal')))),
        field('font', t('font'), select('font', choices('font', 'Manrope'))),
        field('iconStyle', t('iconStyle'), select('iconStyle', choices('iconStyle'))),
        field('bookmarksStyle', t('bookmarksStyle'), select('bookmarksStyle', choices('bookmarksStyle', t('bookmarksNames'))))),
      check('showTitle', t('showTitle'))),
    el('section', { class: 'panel' },
      el('h2', { text: t('secBackground') }),
      el('div', { class: 'grid' },
        field('backgroundImage', t('backgroundImage'), text('backgroundImage', { spellcheck: 'false', placeholder: 'https://example.com/wallpaper.jpg', onchange: () => render() }), t('backgroundImageHelp')),
        field('cardBlur', t('cardBlur'), select('cardBlur', choices('cardBlur', t('blurOff'))))),
      v.backgroundImage ? el('div', { class: 'grid' },
        field('backgroundBlur', t('backgroundBlur'), select('backgroundBlur', choices('backgroundBlur', t('blurOff')))),
        field('backgroundSaturate', t('backgroundSaturate'), number('backgroundSaturate'), t('percentHelp')),
        field('backgroundBrightness', t('backgroundBrightness'), number('backgroundBrightness'), t('percentHelp')),
        field('backgroundOpacity', t('backgroundOpacity'), number('backgroundOpacity'), t('percentHelp'))) : null),
    el('section', { class: 'panel' },
      el('h2', { text: t('secLayout') }),
      el('div', { class: 'grid' },
        field('maxGroupColumns', t('maxGroupColumns'), number('maxGroupColumns'), t('columnsHelp')),
        field('maxBookmarkGroupColumns', t('maxBookmarkGroupColumns'), number('maxBookmarkGroupColumns'), t('columnsHelp'))),
      check('fullWidth', t('fullWidth')),
      check('useEqualHeights', t('useEqualHeights')),
      check('disableCollapse', t('disableCollapse')),
      check('groupsInitiallyCollapsed', t('groupsInitiallyCollapsed')),
      check('showStats', t('showStats'))),
    el('section', { class: 'panel' },
      el('h2', { text: t('secQuicklaunch') }),
      el('p', { class: 'muted', text: t('quicklaunchHelp') }),
      el('div', { class: 'grid' },
        field('qlProvider', t('qlProvider'), select('qlProvider', choices('qlProvider', t('asSearchWidget')))),
        field('qlTarget', t('qlTarget'), select('qlTarget', choices('qlTarget', t('asServiceLinks')))),
        field('qlShowSearchSuggestions', t('qlShowSearchSuggestions'), select('qlShowSearchSuggestions', choices('qlShowSearchSuggestions', t('asSearchWidget')))),
        field('qlMobileButtonPosition', t('qlMobileButtonPosition'), select('qlMobileButtonPosition', choices('qlMobileButtonPosition', t('none'))))),
      ql || v.qlUrl || v.qlSuggestionUrl ? el('div', { class: 'grid' },
        field('qlUrl', t('qlUrl'), text('qlUrl', { spellcheck: 'false', placeholder: 'https://search.lan/?q=' }), t('qlUrlHelp')),
        field('qlSuggestionUrl', t('qlSuggestionUrl'), text('qlSuggestionUrl', { spellcheck: 'false' }), t('qlSuggestionUrlHelp'))) : null,
      check('qlSearchDescriptions', t('qlSearchDescriptions')),
      check('qlHideInternetSearch', t('qlHideInternetSearch')),
      check('qlHideVisitURL', t('qlHideVisitURL'))),
    el('section', { class: 'panel' },
      el('h2', { text: t('secPage') }),
      el('div', { class: 'grid' },
        field('description', t('description'), text('description', { maxlength: String(state.data.form.description.max) }), t('descriptionHelp')),
        field('favicon', t('favicon'), iconInput('favicon', v.favicon, (x) => { v.favicon = x; }, 'proxmox.svg'), t('faviconHelp')),
        field('startUrl', t('startUrl'), text('startUrl', { spellcheck: 'false', placeholder: '/' }), t('startUrlHelp')),
        field('base', t('base'), text('base', { spellcheck: 'false', type: 'url' }), t('baseHelp')),
        field('instanceName', t('instanceName'), text('instanceName', { spellcheck: 'false' }), t('instanceNameHelp'))),
      listField('pwaIcons', t('pwaIcons'), t('pwaIconsHelp')),
      listField('pwaShortcuts', t('pwaShortcuts'), t('pwaShortcutsHelp'))),
    el('section', { class: 'panel' },
      el('h2', { text: t('secOther') }),
      el('div', { class: 'grid' },
        field('pluginUpdateInterval', t('pluginUpdateInterval'), text('pluginUpdateInterval', { spellcheck: 'false' }), t('pluginUpdateHelp')),
        field('discoveryInterval', t('discoveryInterval'), text('discoveryInterval', { spellcheck: 'false' }), t('discoveryHelp')),
        field('logpath', t('logpath'), text('logpath', { spellcheck: 'false', placeholder: '/config' }), t('logpathHelp'))),
      check('hideVersion', t('hideVersion')),
      check('disableUpdateCheck', t('disableUpdateCheck')),
      check('disableIndexing', t('disableIndexing')),
      d.other.length ? el('p', { class: 'muted', text: t('otherKeys', { list: d.other.join(', ') }) }) : null),
    saveBar(),
  ];
}

function securityPanel() {
  const v = state.values;
  const choice = (on, title, hint, badge = null) => el('label', { class: 'choice', for: `login-${on ? 'page' : 'actions'}` },
    el('input', { type: 'radio', name: 'login', id: `login-${on ? 'page' : 'actions'}`, checked: v.login === on, onchange: () => { v.login = on; render(); } }),
    el('span', {}, el('strong', { text: title }), badge ? el('span', { class: 'badge', text: badge }) : null, el('br'), el('span', { class: 'hint', text: hint })));
  return el('section', { class: 'panel' },
    el('h2', { text: t('secSecurity') }),
    el('fieldset', { class: 'ask' },
      el('legend', { text: t('askWhen') }),
      el('div', { class: 'grid' },
        choice(false, t('askActions'), t('askActionsText')),
        choice(true, t('askPage'), t('askPageText'), t('safer'))),
      el('div', { class: 'grid' },
        v.login ? field('loginRemember', t('loginRemember'), text('loginRemember', { spellcheck: 'false' }), t('durationHelp')) : null,
        field('actionsRemember', t('askAgain'), text('actionsRemember', { spellcheck: 'false' }), t('askAgainHelp')))),
    el('hr'),
    hostsSection());
}

async function save() {
  state.status = t('saving');
  state.statusClass = 'muted';
  render();
  let out;
  try {
    out = await api('', { values: state.values });
  } catch (err) {
    out = { ok: false, error: err.message };
  }
  if (out.ok) {
    state.data = out;
    state.values = copy(out.values);
    state.status = t('saved');
    state.statusClass = 'ok';
  } else {
    if (out.needsPassword) return askPassword();
    state.status = t('failed', { error: out.error });
    state.statusClass = 'error';
  }
  applyTheme(state.values);
  render();
}

// ---------------------------------------------------------------- lists of entries
// an entry's own number, for the ids of its fields (an entry keeps it when the list is reordered)
let uid = 0;
const keyOf = new WeakMap();
const kid = (o) => { if (!keyOf.has(o)) keyOf.set(o, ++uid); return keyOf.get(o); };

function orderButtons(list, i, name, id, { remove = true } = {}) {
  const move = (by) => {
    const j = i + by;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    render();
    // the same button keeps the focus; at the top or bottom, the other one
    const key = kid(list[j]);
    const same = document.getElementById(`${by < 0 ? 'up' : 'down'}-${key}`);
    (same?.disabled ? document.getElementById(`${by < 0 ? 'down' : 'up'}-${key}`) : same)?.focus();
  };
  return el('span', { class: 'order' },
    el('button', { type: 'button', id: `up-${id}`, text: '↑', 'aria-label': t('moveUp', { name }), disabled: i === 0, onclick: () => move(-1) }),
    el('button', { type: 'button', id: `down-${id}`, text: '↓', 'aria-label': t('moveDown', { name }), disabled: i === list.length - 1, onclick: () => move(1) }),
    remove ? el('button', { type: 'button', text: t('remove'), 'aria-label': t('removeHost', { host: name }), onclick: () => { list.splice(i, 1); render(); } }) : null);
}

// ---------------------------------------------------------------- the groups (settings.yaml layout)
function groupFields(g, id, { nested = false, kind = 'services' } = {}) {
  const sel = (key, label, entries) => field(`${id}-${key}`, label, el('select', { id: `${id}-${key}`, onchange: (e) => { g[key] = e.target.value; } },
    ...entries.map(([v, text]) => el('option', { value: v, selected: v === g[key], text }))));
  const txt = (key, label, help, attrs = {}) => field(`${id}-${key}`, label, el('input', { type: 'text', id: `${id}-${key}`, value: g[key], spellcheck: 'false', autocapitalize: 'off', oninput: (e) => { g[key] = e.target.value; }, ...attrs }), help);
  const tri = (key, label) => sel(key, label, [['', t('asPage')], ['true', t('on')], ['false', t('off')]]);
  return [
    el('div', { class: 'grid' },
      kind === 'services' ? sel('style', t('groupStyle'), options(['', ...state.data.schema.groupStyles], t('styleDefault'))) : null,
      kind === 'services' ? field(`${id}-columns`, t('groupColumns'), el('input', { type: 'number', id: `${id}-columns`, min: '1', max: String(state.data.schema.maxColumnsInGroup), step: '1', inputmode: 'numeric', value: g.columns, oninput: (e) => { g.columns = e.target.value; } }), t('groupColumnsHelp')) : null,
      nested ? null : txt('tab', t('groupTab'), t('groupTabHelp')),
      field(`${id}-icon`, t('groupIcon'), iconInput(`${id}-icon`, g.icon, (v) => { g.icon = v; }, 'mdi-server')),
      tri('initiallyCollapsed', t('groupCollapsed')),
      kind === 'services' ? tri('useEqualHeights', t('groupEqual')) : tri('iconsOnly', t('groupIconsOnly'))),
    el('label', { class: 'check', for: `${id}-header` }, el('input', { type: 'checkbox', id: `${id}-header`, checked: g.header, onchange: (e) => { g.header = e.target.checked; } }), t('groupHeader')),
  ];
}

function layoutSection() {
  const groups = state.layoutGroups;
  const kindText = (g) => (g.kind === 'services' ? t('kindServices') : g.kind === 'bookmarks' ? t('kindBookmarks') : t('kindGone'));
  return [
    el('section', { class: 'panel' },
      el('h2', { text: t('navLayout') }),
      el('p', { class: 'muted', text: t('layoutHelp') }),
      groups.length ? el('div', { class: 'cards' }, ...groups.map((g, i) => el('div', { class: `card${g.kind ? '' : ' invalid'}` },
        el('header', {},
          el('strong', { text: g.name }),
          el('span', { class: g.kind ? 'muted' : 'error', text: kindText(g) }),
          orderButtons(groups, i, g.name, kid(g), { remove: false })),
        g.kind
          ? el('details', { open: g.open || null, ontoggle: (e) => { g.open = e.target.open; } },
            el('summary', { text: t('groupSettings') }),
            el('div', { class: 'body' }, ...groupFields(g, `lg-${i}`, { kind: g.kind }),
              g.nested.length ? el('fieldset', { class: 'ask' }, el('legend', { text: t('nestedGroups') }),
                ...g.nested.map((n, j) => el('div', { class: 'item' }, el('strong', { text: n.name }), ...groupFields(n, `lg-${i}-${j}`, { nested: true })))) : null))
          : el('label', { class: 'check', for: `lg-${i}-remove` }, el('input', { type: 'checkbox', id: `lg-${i}-remove`, checked: g.remove, onchange: (e) => { g.remove = e.target.checked; } }), t('layoutRemove'))))) : el('p', { class: 'muted', text: t('layoutNone') })),
    el('div', { class: 'saved' },
      el('span', { class: state.statusClass, role: 'status', text: state.status }),
      el('button', { type: 'button', class: 'primary', text: t('save'), onclick: saveLayout })),
  ];
}

async function saveLayout() {
  state.status = t('saving');
  state.statusClass = 'muted';
  render();
  const out = await api('/layout', { groups: state.layoutGroups }).catch((err) => ({ ok: false, error: err.message }));
  if (out.needsPassword) return askPassword();
  if (out.ok) {
    const open = new Set(state.layoutGroups.filter((g) => g.open).map((g) => g.name));
    state.data = out;
    state.layoutGroups = copy(out.layout?.groups ?? []).map((g) => ({ ...g, open: open.has(g.name) }));
    state.status = t('saved');
    state.statusClass = 'ok';
  } else {
    state.status = t('failed', { error: out.error });
    state.statusClass = 'error';
  }
  render();
}

// ---------------------------------------------------------------- the widget packages (settings.yaml plugins)
const pinText = (pin) => (pin ? t('pluginPinned', { version: pin.tag ?? pin.version ?? String(pin.commit ?? '').slice(0, 7) }) : t('pluginNotPinned'));

function pluginsSection() {
  const list = state.pluginEntries;
  const p = state.data.plugins ?? { defaults: [], packages: [], errors: [], warnings: [] };
  const help = { git: 'pluginValueHelpGit', npm: 'pluginValueHelpNpm', path: 'pluginValueHelpPath' };
  const placeholder = { git: 'https://github.com/someone/dashboard-widget-x#v1.0.0', npm: 'dashboard-widget-x@1.0.0', path: './my-widgets/x' };
  const input = (e, i, key, attrs = {}) => el('input', { type: 'text', id: `pl-${i}-${key}`, value: e[key], spellcheck: 'false', autocapitalize: 'off', oninput: (ev) => { e[key] = ev.target.value; }, ...attrs });
  const messages = [...(p.errors ?? []), ...(p.warnings ?? [])];
  return [
    el('section', { class: 'panel' },
      el('h2', { text: t('navPlugins') }),
      el('p', { class: 'muted', text: t('pluginsHelp') }),
      ...p.defaults.map((d) => el('p', { class: 'muted' }, t('pluginsDefault', { source: d.source }), ' · ', d.replaced ? t('pluginsReplaced') : pinText(d.pin))),
      list.length ? el('div', { class: 'cards' }, ...list.map((e, i) => {
        const name = e.value || t('pluginNew');
        return el('div', { class: `card${e.error ? ' invalid' : ''}` },
          el('header', {},
            el('strong', { class: 'image', text: name }),
            el('span', { class: 'muted', text: e.index === null ? '' : pinText(e.pin) }),
            orderButtons(list, i, name, kid(e))),
          el('div', { class: 'body' },
            el('div', { class: 'grid' },
              field(`pl-${i}-kind`, t('pluginKind'), el('select', { id: `pl-${i}-kind`, onchange: (ev) => { e.kind = ev.target.value; render(); } },
                ...[['git', t('kindGit')], ['npm', t('kindNpm')], ['path', t('kindPath')]].map(([v, text]) => el('option', { value: v, selected: v === e.kind, text })))),
              field(`pl-${i}-value`, t('pluginValue'), input(e, i, 'value', { placeholder: placeholder[e.kind] }), t(help[e.kind])),
              field(`pl-${i}-subdir`, t('pluginSubdir'), input(e, i, 'subdir')),
              field(`pl-${i}-only`, t('pluginOnly'), input(e, i, 'only'), t('pluginOnlyHelp'))),
            e.error ? el('p', { class: 'error', text: e.error }) : null));
      })) : el('p', { class: 'muted', text: t('pluginsNone') }),
      el('div', { class: 'row' }, el('button', { type: 'button', text: t('pluginAdd'), onclick: () => {
        state.pluginEntries = [...list, { kind: 'git', value: '', subdir: '', only: '', index: null, pin: null, error: null }];
        render();
        document.getElementById(`pl-${list.length}-value`)?.focus();
      } }))),
    el('section', { class: 'panel' },
      el('h2', { text: t('pluginsInstalled') }),
      (p.packages ?? []).length ? el('ul', { class: 'plain' }, ...p.packages.map((pkg) => el('li', {}, pkg.url ? el('a', { href: pkg.url, target: '_blank', rel: 'noopener', text: pkg.name }) : pkg.name, ` ${pkg.version ?? ''}`))) : null,
      messages.length ? el('div', { class: 'warn' }, t('pluginMessages'), el('ul', { class: 'plain' }, ...messages.map((m) => el('li', { text: m.source ? `${m.source}: ${m.message}` : String(m.message ?? m) })))) : null,
      el('div', { class: 'row' },
        el('button', { type: 'button', text: t('pluginSync'), onclick: () => syncPlugins(false) }),
        el('button', { type: 'button', text: t('pluginUpdate'), onclick: () => syncPlugins(true) }))),
    el('div', { class: 'saved' },
      el('span', { class: state.statusClass, role: 'status', text: state.status || t('pluginSaveHelp') }),
      el('button', { type: 'button', class: 'primary', text: t('save'), onclick: savePlugins })),
  ];
}

function takePlugins(out) {
  state.data = out;
  state.pluginEntries = copy(out.plugins?.entries ?? []);
}

async function savePlugins() {
  state.status = t('pluginSyncing');
  state.statusClass = 'muted';
  render();
  const entries = state.pluginEntries.map(({ kind, value, subdir, only, index }) => ({ kind, value, subdir, only, index }));
  const out = await api('/plugins', { entries }).catch((err) => ({ ok: false, error: err.message }));
  if (out.needsPassword) return askPassword();
  if (out.ok) {
    takePlugins(out);
    state.status = t('saved');
    state.statusClass = 'ok';
  } else {
    state.status = t('failed', { error: out.error });
    state.statusClass = 'error';
  }
  render();
}

async function syncPlugins(update) {
  state.status = t('pluginSyncing');
  state.statusClass = 'muted';
  render();
  const out = await postJson(`api/plugins/sync${update ? '?update=1' : ''}`).catch((err) => ({ error: err.message }));
  const fresh = await api('').catch(() => null);
  if (fresh?.ok) takePlugins(fresh);
  state.status = out.error ? t('failed', { error: out.error }) : t('pluginSynced');
  state.statusClass = out.error ? 'error' : 'ok';
  render();
}

// ---------------------------------------------------------------- the forms of the config files
// One editor for every form section: state.forms[file] holds the server's answer (data) and the
// last save's status, its problems (refused) and its remarks (saved, with something to know).
function formOf(file, path) {
  if (state.forms[file]) return state.forms[file];
  state.forms[file] = { loading: true };
  api(path).catch((err) => ({ ok: false, error: err.message })).then((out) => {
    if (out.needsPassword) return askPassword();
    state.forms[file] = out.ok ? { data: out } : { error: out.error };
    render();
  });
  return state.forms[file];
}

function formSection(file, path, body) {
  const f = formOf(file, path);
  if (f.loading || f.error) return [modeToggle(file), el('section', { class: 'panel' }, el('p', { class: f.error ? 'error' : 'muted', text: f.error ?? t('fileLoading') }))];
  return [modeToggle(file), ...body(f.data, f)];
}

async function saveForm(file, path, body) {
  const f = state.forms[file];
  Object.assign(f, { status: t('saving'), statusClass: 'muted', problems: [], remarks: [] });
  render();
  const out = await api(path, body).catch((err) => ({ ok: false, error: err.message }));
  if (out.needsPassword) return askPassword();
  if (out.ok) {
    state.forms[file] = { data: out, status: t('saved'), statusClass: 'ok', remarks: out.warnings ?? [] };
    delete state.file[file];
    state.files = null;
  } else Object.assign(f, { status: t('failed', { error: out.error }), statusClass: 'error', problems: out.errors ?? [] });
  render();
}

const messageText = (m) => `${m.file}${m.path ? ` › ${m.path}` : ''}: ${m.message}`;
const messageItem = (m) => el('li', { text: messageText(m) });
function messages({ problems, remarks }) {
  return [
    problems?.length ? el('div', { class: 'error', role: 'alert' }, t('fileProblems'), el('ul', { class: 'plain' }, ...problems.map(messageItem))) : null,
    remarks?.length ? el('div', { class: 'warn' }, t('fileRemarks'), el('ul', { class: 'plain' }, ...remarks.map(messageItem))) : null,
  ];
}

function statusBar({ status, statusClass }, onSave, ...buttons) {
  return el('div', { class: 'saved' }, el('span', { class: statusClass ?? 'muted', role: 'status', text: status ?? '' }), ...buttons,
    el('button', { type: 'button', class: 'primary', text: t('save'), onclick: onSave }));
}

// ---------------------------------------------------------------- services.yaml as a form
// Each entry keeps the id of its YAML node; the server rebuilds the file from them (src/settings/tree.js).
const services = () => state.forms['services.yaml'].data;

function modeToggle(root) {
  const text = state.mode[root] === 'text';
  return el('div', { class: 'row mode' }, el('button', { type: 'button', text: text ? t('svcEditForm') : t('svcEditText'), onclick: () => { state.mode[root] = text ? 'form' : 'text'; render(); } }));
}

function allGroups(items, prefix = '') {
  return items.filter((x) => x.kind === 'group' && !x.include).flatMap((g) => [{ group: g, label: prefix + g.name }, ...allGroups(g.items, `${prefix}${g.name} › `)]);
}


function serviceCard(s, list, i) {
  const id = kid(s);
  const { schema } = state.data;
  const f = s.fields;
  const txt = (key, label, help = '', attrs = {}) => field(`s${id}-${key}`, label, el('input', { type: 'text', id: `s${id}-${key}`, value: f[key], spellcheck: 'false', autocapitalize: 'off', oninput: (e) => { f[key] = e.target.value; }, ...attrs }), help);
  const sel = (key, label, entries) => field(`s${id}-${key}`, label, el('select', { id: `s${id}-${key}`, onchange: (e) => { f[key] = e.target.value; } }, ...entries.map(([v, text]) => el('option', { value: v, selected: v === f[key], text }))));
  const groups = allGroups(services().items);
  const here = groups.find((g) => g.group.items === list);
  return el('div', { class: 'card' },
    el('header', {}, el('strong', { text: s.name }), el('span', { class: 'image', text: f.href }), orderButtons(list, i, s.name, id)),
    el('details', { open: s.open || null, ontoggle: (e) => { s.open = e.target.open; } },
      el('summary', { text: t('groupSettings') }),
      el('div', { class: 'body' },
        el('div', { class: 'grid' },
          field(`s${id}-name`, t('colName'), el('input', { type: 'text', id: `s${id}-name`, value: s.name, oninput: (e) => { s.name = e.target.value; } })),
          txt('href', t('fHref'), '', { type: 'url', placeholder: 'http://app.lan' }),
          field(`s${id}-icon`, t('fIcon'), iconInput(`s${id}-icon`, f.icon, (v) => { f.icon = v; })),
          txt('description', t('description'))),
        el('div', { class: 'grid' },
          txt('siteMonitor', t('fSiteMonitor'), '', { placeholder: 'http://app.lan/health' }),
          txt('ping', t('fPing'), '', { placeholder: 'app.lan' }),
          txt('container', t('fContainer')),
          txt('server', t('fServer'))),
        el('details', {},
          el('summary', { text: t('svcMore') }),
          el('div', { class: 'grid' },
            sel('target', t('fTarget'), options(['', ...schema.serviceTargets], t('asPage'))),
            sel('statusStyle', t('statusStyle'), options(['', ...schema.statusStyles], t('asPage'))),
            sel('showStats', t('fShowStats'), options(['', 'true', 'false'], t('asPage'))),
            sel('confirm', t('fConfirm'), options(['', ...schema.confirm], t('asPage'))),
            txt('weight', t('fWeight'), t('fWeightHelp'), { inputmode: 'numeric' }),
            txt('filter', t('fFilter'), t('fFilterHelp')),
            txt('proxmoxNode', t('fProxmoxNode')),
            txt('proxmoxVMID', t('fProxmoxVMID'), '', { inputmode: 'numeric' }),
            sel('proxmoxType', t('fProxmoxType'), options(['', ...schema.proxmoxTypes], t('styleDefault'))),
            txt('app', t('fApp')),
            txt('namespace', t('fNamespace')),
            txt('podSelector', t('fPodSelector'))),
          el('label', { class: 'check', for: `s${id}-external` }, el('input', { type: 'checkbox', id: `s${id}-external`, checked: f.external, onchange: (e) => { f.external = e.target.checked; } }), t('fExternal'))),
        widgetEditor(s.widgets, services().widgets, 'services.yaml', `s${id}`),
        s.other?.length ? el('p', { class: 'muted', text: t('svcOtherKeys', { list: s.other.join(', ') }) }) : null,
        groups.length > 1 ? field(`s${id}-move`, t('svcMoveTo'), el('select', { id: `s${id}-move`, onchange: (e) => {
          const target = groups[Number(e.target.value)];
          if (!target || target.group.items === list) return;
          list.splice(list.indexOf(s), 1);
          target.group.items.push(s);
          render();
        } }, ...groups.map((g, n) => el('option', { value: String(n), selected: g === here, text: g.label })))) : null)));
}

function includeCard(x, list, i, root = 'services.yaml') {
  return el('div', { class: 'card' },
    el('header', {}, el('strong', { text: t('svcIncludedItem', { file: x.file }) }), orderButtons(list, i, x.file, kid(x))),
    el('button', { type: 'button', class: 'link', text: t('svcOpenFile', { file: x.file }), onclick: () => openFile(root, x.file) }));
}

function openFile(root, file) {
  state.chosen[root] = file;
  state.mode[root] = 'text';
  render();
}

function itemsOf(list, depth) {
  return list.map((x, i) => (x.kind === 'service' ? serviceCard(x, list, i)
    : x.kind === 'group' ? groupPanel(x, list, i, depth + 1)
      : x.kind === 'include' ? includeCard(x, list, i)
        : el('div', { class: 'card invalid' }, el('header', {}, el('pre', { text: x.text }), orderButtons(list, i, x.text.split('\n')[0], kid(x))), el('p', { class: 'muted', text: t('svcOther') }))));
}

function groupPanel(g, list, i, depth = 0) {
  const id = kid(g);
  const add = (item) => { g.items.push(item); item.open = true; render(); document.getElementById(item.kind === 'group' ? `g${kid(item)}-name` : `s${kid(item)}-name`)?.focus(); };
  return el('section', { class: depth ? 'nested' : 'panel' },
    el('header', { class: 'group' },
      field(`g${id}-name`, t('svcGroupName'), el('input', { type: 'text', id: `g${id}-name`, value: g.name, oninput: (e) => { g.name = e.target.value; } })),
      orderButtons(list, i, g.name, id)),
    g.include
      ? el('p', { class: 'muted' }, t('svcIncluded', { file: g.include }), ' ', el('button', { type: 'button', class: 'link', text: t('svcOpenFile', { file: g.include }), onclick: () => openFile('services.yaml', g.include) }))
      : el('div', { class: 'cards' }, ...itemsOf(g.items, depth)),
    g.include ? null : el('div', { class: 'row' },
      el('button', { type: 'button', text: t('svcAddService'), onclick: () => add({ kind: 'service', id: null, name: t('svcNewService'), ...copy(services().blank) }) }),
      el('button', { type: 'button', text: t('svcAddNested'), onclick: () => add({ kind: 'group', id: null, name: t('svcNewGroup'), items: [] }) })));
}

function servicesSection() {
  return formSection('services.yaml', '/services', (d, f) => [
    el('p', { class: 'muted', text: t('svcHelp') }),
    ...d.items.map((x, i) => (x.kind === 'group' ? groupPanel(x, d.items, i) : el('section', { class: 'panel' }, ...itemsOf([x], 0)))),
    el('div', { class: 'row' }, el('button', { type: 'button', text: t('svcAddGroup'), onclick: () => {
      const g = { kind: 'group', id: null, name: t('svcNewGroup'), items: [] };
      d.items.push(g);
      render();
      document.getElementById(`g${kid(g)}-name`)?.focus();
    } })),
    ...messages(f),
    d.discovered.length ? el('section', { class: 'panel' },
      el('h2', { text: t('svcDiscovered') }),
      el('p', { class: 'muted', text: t('svcDiscoveredHelp') }),
      el('ul', { class: 'plain' }, ...d.discovered.map((x) => el('li', { text: `${x.group} › ${x.name} (${x.origin})` })))) : null,
    statusBar(f, () => {
      const strip = (x) => (x.kind === 'group' ? { kind: x.kind, id: x.id, name: x.name, include: x.include, items: x.items.map(strip) } : x.kind === 'service' ? { kind: x.kind, id: x.id, name: x.name, fields: x.fields, widgets: x.widgets.map((w) => ({ id: w.id, type: w.type, options: w.options })) } : { kind: x.kind, id: x.id });
      saveForm('services.yaml', '/services', { hash: d.hash, items: d.items.map(strip) });
    }),
  ]);
}

// ---------------------------------------------------------------- widgets by their options' schema
// `list`: [{ id, type, options, rest }]; `catalog`: the installed widgets and their options;
// `file`: services.yaml or widgets.yaml, for the test (hidden values are filled in on the server).
function widgetEditor(list, catalog, file, prefix) {
  const byId = new Map(catalog.map((w) => [w.id, w]));
  const choices = (current) => [...(current && !byId.has(current) ? [[current, current]] : []), ...catalog.map((w) => [w.id, w.name])];
  const card = (w, i) => {
    const id = `${prefix}-w${kid(w)}`;
    const schema = byId.get(w.type)?.options ?? null;
    const input = (k, def) => {
      const fid = `${id}-${k}`;
      const set = (e) => { w.options[k] = e.target.value; };
      const label = `${k}${def.required ? ' *' : ''}`;
      const help = w.hidden?.includes(k) ? t('wHidden') : def.description ?? '';
      if (def.type === 'enum' || def.type === 'boolean') {
        const values = def.type === 'boolean' ? ['true', 'false'] : def.values ?? [];
        return field(fid, label, el('select', { id: fid, onchange: set },
          el('option', { value: '', selected: !w.options[k], text: def.default !== undefined ? `${t('styleDefault')} (${def.default})` : '—' }),
          ...values.map((v) => el('option', { value: v, selected: w.options[k] === v, text: def.type === 'boolean' ? t(v === 'true' ? 'on' : 'off') : v }))), help);
      }
      if (def.type === 'icon') return field(fid, label, iconInput(fid, w.options[k], (v) => { w.options[k] = v; }), help);
      return field(fid, label, el('input', { type: def.secret ? 'password' : 'text', id: fid, value: w.options[k] ?? '', spellcheck: 'false', autocapitalize: 'off',
        autocomplete: def.secret ? 'new-password' : 'off', inputmode: def.type === 'number' ? 'numeric' : null,
        placeholder: def.default !== undefined ? String(def.default) : null, oninput: set }), help);
    };
    return el('div', { class: 'card' },
      el('header', {},
        field(`${id}-type`, t('wType'), el('select', { id: `${id}-type`, onchange: (e) => { w.type = e.target.value; const s = byId.get(w.type)?.options ?? {}; for (const k of Object.keys(s)) w.options[k] ??= ''; render(); } },
          ...choices(w.type).map(([v, text]) => el('option', { value: v, selected: v === w.type, text })))),
        orderButtons(list, i, w.type, id)),
      schema
        ? el('div', { class: 'grid' }, ...Object.entries(schema).filter(([k]) => k in w.options).map(([k, def]) => input(k, def)))
        : el('p', { class: 'muted', text: t('wUnknown') }),
      w.rest?.length ? el('p', { class: 'muted', text: t('wRest', { list: w.rest.join(', ') }) }) : null,
      schema ? el('div', { class: 'row' },
        el('button', { type: 'button', text: t('wTest'), onclick: () => testWidget(w, file) }),
        w.test ? el('span', { class: `result ${w.test.ok === undefined ? 'muted' : w.test.ok ? 'ok' : 'error'}`, role: 'status', text: w.test.text }) : null) : null);
  };
  const add = el('select', { id: `${prefix}-add`, 'aria-label': t('wAdd'), onchange: (e) => {
    if (!e.target.value) return;
    const s = byId.get(e.target.value)?.options ?? {};
    const w = { id: null, type: e.target.value, options: Object.fromEntries(Object.keys(s).map((k) => [k, ''])), rest: [] };
    list.push(w);
    render();
    document.getElementById(`${prefix}-w${kid(w)}-type`)?.focus();
  } }, el('option', { value: '', text: t('wChoose') }), ...catalog.map((w) => el('option', { value: w.id, text: w.name })));
  return el('fieldset', { class: 'ask' },
    el('legend', { text: t('wHeading') }),
    list.length ? el('div', { class: 'cards' }, ...list.map(card)) : el('p', { class: 'muted', text: t('wNone') }),
    field(`${prefix}-add`, t('wAdd'), add));
}

async function testWidget(w, file) {
  w.test = { text: t('wTesting') };
  render();
  const out = await api('/widget-test', { type: w.type, options: w.options, file }).catch((err) => ({ ok: false, error: err.message }));
  const blocks = (out.blocks ?? []).map((b) => `${b.label}: ${b.value}${b.unit ? ` ${b.unit}` : ''}`).join(', ');
  w.test = out.ok ? { ok: true, text: blocks ? t('wTestOk', { blocks }) : t('wTestOkEmpty') } : { ok: false, text: t('failed', { error: out.error }) };
  render();
}

// ---------------------------------------------------------------- widgets.yaml: the header widgets
function headerSection() {
  return formSection('widgets.yaml', '/header', (d, f) => [
    el('section', { class: 'panel' },
      el('h2', { text: t('navHeader') }),
      widgetEditor(d.widgets, d.catalog, 'widgets.yaml', 'h'),
      ...messages(f)),
    statusBar(f, () => saveForm('widgets.yaml', '/header', { hash: d.hash, widgets: d.widgets.map((w) => ({ id: w.id, type: w.type, options: w.options })) })),
  ]);
}

// ---------------------------------------------------------------- bookmarks.yaml as a form
function bookmarkCard(b, list, i) {
  const id = kid(b);
  const txt = (key, label, attrs = {}) => field(`b${id}-${key}`, label, el('input', { type: 'text', id: `b${id}-${key}`, value: b.fields[key], spellcheck: 'false', autocapitalize: 'off', oninput: (e) => { b.fields[key] = e.target.value; }, ...attrs }));
  const groups = state.forms['bookmarks.yaml'].data.items.filter((g) => g.kind === 'group' && !g.include);
  return el('div', { class: 'card' },
    el('header', {}, el('strong', { text: b.name }), el('span', { class: 'image', text: b.fields.href }), orderButtons(list, i, b.name, id)),
    el('div', { class: 'grid' },
      field(`b${id}-name`, t('colName'), el('input', { type: 'text', id: `b${id}-name`, value: b.name, oninput: (e) => { b.name = e.target.value; } })),
      txt('href', t('fHref'), { type: 'url', placeholder: 'https://example.com' }),
      txt('abbr', t('bAbbr'), { maxlength: '4' }),
      field(`b${id}-icon`, t('fIcon'), iconInput(`b${id}-icon`, b.fields.icon, (v) => { b.fields.icon = v; }, 'github.svg')),
      txt('description', t('description')),
      groups.length > 1 ? field(`b${id}-move`, t('svcMoveTo'), el('select', { id: `b${id}-move`, onchange: (e) => {
        const target = groups[Number(e.target.value)];
        if (!target || target.items === list) return;
        list.splice(list.indexOf(b), 1);
        target.items.push(b);
        render();
      } }, ...groups.map((g, n) => el('option', { value: String(n), selected: g.items === list, text: g.name })))) : null),
    b.other?.length ? el('p', { class: 'muted', text: t('svcOtherKeys', { list: b.other.join(', ') }) }) : null);
}

function bookmarksSection() {
  return formSection('bookmarks.yaml', '/bookmarks', (d, f) => {
    const group = (g, i) => {
      if (g.kind !== 'group') return el('section', { class: 'panel' }, g.kind === 'include' ? includeCard(g, d.items, i, 'bookmarks.yaml') : el('pre', { text: g.text }));
      const id = kid(g);
      return el('section', { class: 'panel' },
        el('header', { class: 'group' },
          field(`g${id}-name`, t('svcGroupName'), el('input', { type: 'text', id: `g${id}-name`, value: g.name, oninput: (e) => { g.name = e.target.value; } })),
          orderButtons(d.items, i, g.name, id)),
        g.include
          ? el('p', { class: 'muted' }, t('bIncluded', { file: g.include }), ' ', el('button', { type: 'button', class: 'link', text: t('svcOpenFile', { file: g.include }), onclick: () => openFile('bookmarks.yaml', g.include) }))
          : el('div', { class: 'cards' }, ...g.items.map((b, j) => (b.kind === 'bookmark' ? bookmarkCard(b, g.items, j) : b.kind === 'include' ? includeCard(b, g.items, j, 'bookmarks.yaml') : el('div', { class: 'card invalid' }, el('pre', { text: b.text }), orderButtons(g.items, j, b.text.split('\n')[0], kid(b)))))),
        g.include ? null : el('div', { class: 'row' }, el('button', { type: 'button', text: t('bAdd'), onclick: () => {
          const b = { kind: 'bookmark', id: null, name: t('bNew'), ...copy(d.blank) };
          g.items.push(b);
          render();
          document.getElementById(`b${kid(b)}-name`)?.focus();
        } })));
    };
    return [
      ...d.items.map(group),
      el('div', { class: 'row' }, el('button', { type: 'button', text: t('svcAddGroup'), onclick: () => {
        const g = { kind: 'group', id: null, name: t('svcNewGroup'), items: [] };
        d.items.push(g);
        render();
        document.getElementById(`g${kid(g)}-name`)?.focus();
      } })),
      ...messages(f),
      statusBar(f, () => {
        const strip = (x) => (x.kind === 'group' ? { kind: x.kind, id: x.id, name: x.name, include: x.include, items: x.items.map(strip) } : x.kind === 'bookmark' ? { kind: x.kind, id: x.id, name: x.name, fields: x.fields } : { kind: x.kind, id: x.id });
        saveForm('bookmarks.yaml', '/bookmarks', { hash: d.hash, items: d.items.map(strip) });
      }),
    ];
  });
}

// ---------------------------------------------------------------- docker.yaml, proxmox.yaml, kubernetes.yaml as forms
// The fields and their types come from the server (src/settings/servers.js); the page adds their
// labels (text keys), example values, the words for some values, and the connection test.
const SERVER_FORMS = {
  'docker.yaml': {
    help: 'dHelp',
    labels: { socket: 'dSocket', host: 'dHost', port: 'dPort', protocol: 'dProtocol', caFile: 'dCa', certFile: 'dCert', keyFile: 'dKey', discover: 'dDiscover', swarm: 'dSwarm' },
    examples: { socket: '/var/run/docker.sock', host: '192.168.1.20', port: '2375' },
    values: { protocol: { '': 'http', https: 'https' } },
    test: { path: '/docker-test', body: (e) => ({ name: e.id }), ok: (out) => t('dTestOk', { version: out.version ?? '?', count: out.containers ?? 0 }) },
  },
  'proxmox.yaml': {
    help: 'pHelp',
    labels: { url: 'colUrl', token: 'pToken', secret: 'pSecret', insecure: 'pInsecure' },
    examples: { url: 'https://pve.lan:8006', token: 'api@pam!dashboard' },
    test: { path: '/proxmox-test', body: (e) => ({ name: e.id }), ok: (out) => t('pTestOk', { version: out.version ?? '?' }) },
  },
  'kubernetes.yaml': {
    help: 'kHelp',
    labels: { mode: 'kMode', kubeconfig: 'kKubeconfig', context: 'kContext', ingress: 'kIngress', traefik: 'kTraefik', gateway: 'kGateway' },
    values: { mode: { disabled: 'off', cluster: 'kCluster', default: 'kDefault' } },
    test: { path: '/kubernetes-test', body: () => ({}), ok: (out) => t('kTestOk', { version: out.version ?? '?', count: out.services }) },
  },
};

function serverFields(file, form, entry, id) {
  const spec = SERVER_FORMS[file];
  return el('div', { class: 'grid' }, ...form.map(({ name, type, values }) => {
    const fid = `${id}-${name}`;
    const label = t(spec.labels[name]);
    const fields = entry.fields;
    if (type === 'boolean') return el('label', { class: 'check', for: fid }, el('input', { type: 'checkbox', id: fid, checked: fields[name], onchange: (e) => { fields[name] = e.target.checked; } }), label);
    if (type === 'enum' || type === 'tristate') {
      const choices = type === 'tristate' ? [['', t('styleDefault')], ['true', t('on')], ['false', t('off')]] : values.map((v) => [v, spec.values?.[name]?.[v] ? t(spec.values[name][v]) : v]);
      return field(fid, label, el('select', { id: fid, onchange: (e) => { fields[name] = e.target.value; } }, ...choices.map(([v, text]) => el('option', { value: v, selected: v === fields[name], text }))));
    }
    return field(fid, label, el('input', { type: type === 'secret' ? 'password' : 'text', id: fid, value: fields[name] ?? '', spellcheck: 'false', autocapitalize: 'off',
      autocomplete: type === 'secret' ? 'new-password' : 'off', inputmode: type === 'number' ? 'numeric' : null, placeholder: spec.examples?.[name] ?? null,
      oninput: (e) => { fields[name] = e.target.value; } }), entry.hidden?.includes(name) ? t('wHidden') : '');
  }));
}

/** A connection test of what is saved, with its result next to the button. */
function testButton(file, target) {
  const { test } = SERVER_FORMS[file];
  if (!test) return null;
  return el('div', { class: 'row' },
    el('button', { type: 'button', text: t('dTest'), title: t('testSaved'), onclick: async () => {
      target.test = { text: t('wTesting') };
      render();
      const out = await api(test.path, test.body(target)).catch((err) => ({ ok: false, error: err.message }));
      target.test = out.ok ? { ok: true, text: test.ok(out) } : { ok: false, text: t('failed', { error: out.error }) };
      render();
    } }),
    target.test ? el('span', { class: `result ${target.test.ok === undefined ? 'muted' : target.test.ok ? 'ok' : 'error'}`, role: 'status', text: target.test.text }) : null);
}

function serversSection(file) {
  return formSection(file, `/servers/${file}`, (d, f) => {
    const other = (x) => (x.other?.length ? el('p', { class: 'muted', text: t('svcOtherKeys', { list: x.other.join(', ') }) }) : null);
    const body = d.entries
      ? [
        d.flat ? el('p', { class: 'muted', text: t('pFlat') }) : null,
        ...d.entries.map((e, i) => el('div', { class: 'card' },
          d.flat ? null : el('header', {},
            field(`sv${kid(e)}-name`, t('colName'), el('input', { type: 'text', id: `sv${kid(e)}-name`, value: e.name, spellcheck: 'false', oninput: (ev) => { e.name = ev.target.value; } })),
            orderButtons(d.entries, i, e.name || '?', kid(e))),
          serverFields(file, d.form, e, `sv${kid(e)}`),
          other(e),
          e.id !== null ? testButton(file, e) : null)),
        d.flat ? null : el('div', { class: 'row' }, el('button', { type: 'button', text: t('srvAdd'), onclick: () => {
          const e = { id: null, name: '', fields: copy(d.blank), hidden: [], other: [] };
          d.entries.push(e);
          render();
          document.getElementById(`sv${kid(e)}-name`)?.focus();
        } })),
      ]
      : [serverFields(file, d.form, d, 'kube'), other(d), testButton(file, d)];
    const payload = () => (d.entries ? { hash: d.hash, entries: d.entries.map(({ id, name, fields }) => ({ id, name, fields })) } : { hash: d.hash, fields: d.fields });
    return [
      el('section', { class: 'panel' },
        el('h2', { text: file }),
        el('p', { class: 'muted', text: t(SERVER_FORMS[file].help) }),
        ...body,
        ...messages(f)),
      statusBar(f, () => saveForm(file, `/servers/${file}`, payload())),
    ];
  });
}

// ---------------------------------------------------------------- import from homepage, download

function importPanel() {
  const imp = state.imp ?? (state.imp = {});
  const input = el('input', { type: 'file', id: 'import-files', multiple: true, accept: '.yaml,.yml', onchange: async (e) => {
    const files = {};
    for (const f of e.target.files ?? []) {
      const name = f.name.replace(/\.yml$/, '.yaml');
      if (state.data.schema.homepageFiles.includes(name)) files[name] = await f.text();
    }
    imp.files = files;
    imp.result = null;
    imp.status = '';
    if (!Object.keys(files).length) { imp.status = t('importNone'); render(); return; }
    imp.result = await api('/import/check', { files }).catch((err) => ({ ok: false, error: err.message }));
    render();
  } });
  const r = imp.result;
  return el('section', { class: 'panel' },
    el('h2', { text: t('importHeading') }),
    el('p', { class: 'muted', text: t('importHelp') }),
    field('import-files', t('importChoose'), input),
    imp.status ? el('p', { class: imp.statusClass ?? 'muted', role: 'status', text: imp.status }) : null,
    r && !r.ok ? el('p', { class: 'error', text: t('failed', { error: r.error }) }) : null,
    r?.ok ? el('div', {},
      el('p', { text: t('importSummary', { files: r.files.join(', '), services: r.services.length, bookmarks: r.bookmarks, header: r.header }) }),
      r.replaces?.length ? el('p', { class: 'warn', text: t('importReplaces', { files: r.replaces.join(', ') }) }) : null,
      [...r.errors, ...r.warnings].length ? el('ul', { class: 'plain muted' }, ...[...r.errors, ...r.warnings].slice(0, 20).map((m) => el('li', { text: m }))) : null,
      el('button', { type: 'button', class: 'primary', text: t('importDo'), onclick: doImport })) : null);
}

async function doImport() {
  const imp = state.imp;
  imp.status = t('saving');
  imp.statusClass = 'muted';
  render();
  const out = await api('/import', { files: imp.files }).catch((err) => ({ ok: false, error: err.message }));
  if (out.needsPassword) return askPassword();
  if (out.ok) {
    state.imp = { status: t('importDone', { files: out.files.join(', ') }), statusClass: 'ok' };
    state.file = {};
    await reread();
  } else {
    imp.status = `${t('failed', { error: out.error })}${(out.errors ?? []).length ? ` — ${out.errors.map(messageText).join('; ')}` : ''}`;
    imp.statusClass = 'error';
  }
  render();
}

/** The editor's text as a file (hidden values stay hidden). */
function downloadText(name, text) {
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([text], { type: name.endsWith('.yaml') ? 'application/yaml' : 'text/plain' }));
  const a = el('a', { href: url, download: name.split('/').pop() });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------- icon fields: suggestions and a preview
const iconUrls = new Map(); // name → Promise of { url, mask } (src/icons.js resolveIcon, through the server)
function iconUrl(name) {
  if (!iconUrls.has(name)) iconUrls.set(name, api(`/icon?name=${encodeURIComponent(name)}`).then((out) => ({ url: out.url ?? null, mask: Boolean(out.mask) })).catch(() => ({ url: null, mask: false })));
  return iconUrls.get(name);
}

function loadIcons() {
  if (state.icons) return;
  state.icons = { local: [], used: [] };
  api('/icons').then((out) => {
    if (!out.ok) throw new Error(out.error);
    state.icons = { local: out.local ?? [], used: out.used ?? [] };
    const list = document.getElementById('icon-list');
    if (list) list.replaceChildren(...iconOptions());
  }).catch(() => {
    state.icons = null; // suggestions only: the next form asks again
  });
}
const iconOptions = () => [...new Set([...(state.icons?.used ?? []), ...(state.icons?.local ?? [])])].map((v) => el('option', { value: v }));

function iconList() {
  loadIcons();
  return el('datalist', { id: 'icon-list' }, ...iconOptions());
}

function iconInput(id, value, set, placeholder = 'plex.svg') {
  const preview = el('span', { class: 'icon-preview', 'aria-hidden': 'true' });
  const update = async (name) => {
    const v = String(name ?? '').trim();
    if (!v) return preview.replaceChildren();
    const { url, mask: isMask } = await iconUrl(v);
    if (!url) return preview.replaceChildren(el('span', { class: 'error', text: '?' }));
    // single-colour icons (mdi-, si-) are a mask in the text colour, as on the dashboard
    if (isMask) {
      const mask = el('span', { class: 'mask' });
      const src = `url("${url}")`;
      mask.style.setProperty('mask-image', src);
      mask.style.setProperty('-webkit-mask-image', src);
      return preview.replaceChildren(mask);
    }
    const img = el('img', { src: url, alt: '', loading: 'lazy' });
    img.addEventListener('error', () => preview.replaceChildren(el('span', { class: 'error', text: '?' })));
    preview.replaceChildren(img);
  };
  update(value);
  const input = el('input', { type: 'text', id, value: value ?? '', list: 'icon-list', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', placeholder,
    oninput: (e) => set(e.target.value), onchange: (e) => update(e.target.value) });
  return el('span', { class: 'icon-field' }, preview, input);
}

// ---------------------------------------------------------------- sections and the config files
// The sections: id, label (a text key), file (the config file it edits), form (it can show that
// file as text instead), view(section) (what it shows).
const SECTIONS = [
  { id: 'general', label: 'navGeneral', view: generalSection },
  { id: 'security', label: 'navSecurity', view: () => [securityPanel(), passwordSection(), passkeySection(), saveBar()] },
  { id: 'layout', label: 'navLayout', view: layoutSection },
  { id: 'plugins', label: 'navPlugins', view: pluginsSection },
  { id: 'services', label: 'navServices', file: 'services.yaml', form: true, view: servicesSection },
  { id: 'header', label: 'navHeader', file: 'widgets.yaml', form: true, view: headerSection },
  { id: 'bookmarks', label: 'navBookmarks', file: 'bookmarks.yaml', form: true, view: bookmarksSection },
  { id: 'docker', label: 'navDocker', file: 'docker.yaml', form: true, view: (x) => serversSection(x.file) },
  { id: 'kubernetes', label: 'navKubernetes', file: 'kubernetes.yaml', form: true, view: (x) => serversSection(x.file) },
  { id: 'proxmox', label: 'navProxmox', file: 'proxmox.yaml', form: true, view: (x) => serversSection(x.file) },
  { id: 'advanced', label: 'navAdvanced', file: 'settings.yaml', view: (x) => {
    const [panel, ...rest] = [].concat(fileSection(x));
    return [panel, importPanel(), ...rest];
  } },
];
const sectionOf = (hash) => (SECTIONS.some((x) => x.id === String(hash).slice(1)) ? String(hash).slice(1) : 'general');
const fileUrl = (name) => `/files/${encodeURIComponent(name)}`;

function nav() {
  return [el('nav', { class: 'sections', 'aria-label': t('navLabel') },
    ...SECTIONS.map(({ id, label }) => el('a', { href: `#${id}`, 'aria-current': id === state.section ? 'page' : null, text: t(label) }))), iconList()];
}

async function loadFiles() {
  const out = await api('/files').catch((err) => ({ ok: false, error: err.message }));
  if (out.needsPassword) return askPassword();
  state.files = out.ok ? out.files : [];
  if (!out.ok) state.filesError = out.error;
  render();
}

async function loadFile(name, keepStatus = false) {
  const old = state.file[name] ?? {};
  state.file[name] = { ...old, loading: true };
  const out = await api(fileUrl(name)).catch((err) => ({ ok: false, error: err.message }));
  if (out.needsPassword) return askPassword();
  state.file[name] = out.ok
    ? { text: out.text, draft: out.text, hash: out.hash, exists: out.exists, history: out.history, secrets: out.secrets ?? [], ...(keepStatus ? { status: old.status, statusClass: old.statusClass, problems: old.problems, remarks: old.remarks } : {}) }
    : { error: out.error };
  render();
}

function fileSection({ file: root }) {
  if (!state.files) {
    loadFiles();
    return el('section', { class: 'panel' }, el('p', { class: 'muted', text: t('fileLoading') }));
  }
  // Advanced also has the page's own CSS and JavaScript
  const files = state.files.filter((f) => f.root === root || (root === 'settings.yaml' && ['custom.css', 'custom.js'].includes(f.file)));
  const name = files.some((f) => f.file === state.chosen[root]) ? state.chosen[root] : root;
  const entry = files.find((f) => f.file === name) ?? { file: name, root, from: null, at: '' };
  const f = state.file[name];
  if (!f) {
    loadFile(name);
    return el('section', { class: 'panel' }, el('p', { class: 'muted', text: t('fileLoading') }));
  }
  if (f.error && f.text === undefined) return el('section', { class: 'panel' }, el('p', { class: 'error', text: t('failed', { error: f.error }) }));
  const area = el('textarea', { id: 'file-text', class: 'code', rows: '24', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', wrap: 'off', 'aria-label': name,
    oninput: (e) => { f.draft = e.target.value; } });
  area.value = f.draft;
  const history = f.history ?? [];
  const versions = history.length ? el('div', { class: 'row' },
    el('label', { for: 'file-version' }, t('fileHistory'),
      el('select', { id: 'file-version' }, ...history.map((v) => el('option', { value: v.id, text: new Date(v.time).toLocaleString(lang) })))),
    el('button', { type: 'button', text: t('fileLoadVersion'), onclick: () => loadVersion(name) })) : null;
  return [
    el('section', { class: 'panel' },
      el('h2', { text: name }),
      el('p', { class: 'muted', text: t(root === 'settings.yaml' && name === root ? 'fileAdvanced' : 'fileHelp') }),
      files.length > 1 ? el('label', { for: 'file-choose' }, t('fileChoose'),
        el('select', { id: 'file-choose', onchange: (e) => { state.chosen[root] = e.target.value; render(); } },
          ...files.map((x) => el('option', { value: x.file, selected: x.file === name, text: x.from ? t('fileIncludedOption', { file: x.file, from: x.from }) : x.file })))) : null,
      entry.from ? el('p', { class: 'muted', text: t('fileIncluded', { from: entry.from, at: entry.at || '/' }) }) : null,
      f.exists === false ? el('p', { class: 'muted', text: t('fileNew') }) : null,
      name === 'custom.js' ? el('p', { class: 'warn', role: 'note', text: t('fileCustomJs') }) : name === 'custom.css' ? el('p', { class: 'muted', text: t('fileCustomCss') }) : null,
      area,
      f.secrets?.length ? el('p', { class: 'hint muted', text: t('fileSecrets') }) : null,
      messages(f),
      f.conflict ? el('p', { class: 'error' }, t('fileConflict'), ' ', el('button', { type: 'button', class: 'link', text: t('fileReload'), onclick: () => loadFile(name) })) : null,
      versions),
    el('div', { class: 'saved' },
      el('span', { class: f.statusClass ?? 'muted', role: 'status', text: f.status ?? '' }),
      el('button', { type: 'button', text: t('fileDownload'), title: t('fileDownloadHelp'), onclick: () => downloadText(name, f.draft) }),
      el('button', { type: 'button', text: t('fileUndo'), onclick: () => { f.draft = f.text; f.status = ''; f.problems = []; render(); } }),
      el('button', { type: 'button', class: 'primary', text: t('save'), onclick: () => saveFile(name) })),
  ];
}

async function loadVersion(name) {
  const f = state.file[name];
  const id = document.getElementById('file-version')?.value;
  const v = (f.history ?? []).find((x) => x.id === id);
  if (!v) return;
  const out = await api(`${fileUrl(name)}/history/${encodeURIComponent(id)}`).catch((err) => ({ ok: false, error: err.message }));
  if (out.ok) {
    f.draft = out.text;
    f.status = t('fileLoaded', { time: new Date(v.time).toLocaleString(lang) });
    f.statusClass = 'muted';
  } else {
    f.status = t('failed', { error: out.error });
    f.statusClass = 'error';
  }
  render();
}

async function saveFile(name) {
  const f = state.file[name];
  f.status = t('saving');
  f.statusClass = 'muted';
  f.problems = [];
  f.remarks = [];
  f.conflict = false;
  render();
  const res = await post(`api/settings${fileUrl(name)}`, { text: f.draft, hash: f.hash })
    .catch((err) => ({ status: 0, json: async () => ({ ok: false, error: err.message }) }));
  const out = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (out.needsPassword) return askPassword();
  if (out.ok) {
    f.status = out.changed ? t('saved') : t('fileUnchanged');
    f.statusClass = 'ok';
    f.remarks = out.warnings ?? [];
    await loadFile(name, true);
    await reread();
  } else {
    f.status = t('failed', { error: out.error });
    f.statusClass = 'error';
    f.problems = out.errors ?? [];
    f.conflict = res.status === 409;
  }
  render();
}

// ---------------------------------------------------------------- the admin password
function passwordSection() {
  const d = state.data;
  const pw = state.pw;
  const input = (id, key, label, autocomplete) => field(id, label, el('input', { type: 'password', id, value: pw[key], autocomplete, oninput: (e) => { pw[key] = e.target.value; } }));
  return el('section', { class: 'panel' },
    el('h2', { text: t('secAdmin') }),
    d.noPassword ? el('p', { class: 'warn', text: t('setupFirst') }) : null,
    el('form', { onsubmit: async (e) => {
      e.preventDefault();
      pw.ok = false;
      if (pw.next.length < state.data.schema.minPassword) pw.message = t('passwordShort', { count: state.data.schema.minPassword });
      else if (pw.next !== pw.repeat) pw.message = t('passwordMismatch');
      else {
        const out = await api('/password', { current: pw.current, next: pw.next });
        if (out.ok) {
          Object.assign(pw, { current: '', next: '', repeat: '', message: t('passwordChanged'), ok: true });
          state.data = out;
          state.values = copy(out.values);
        } else pw.message = out.wrongPassword ? t('wrongCurrent') : out.retryAfter ? t('wait', { seconds: out.retryAfter }) : out.error;
      }
      render();
    } },
    el('input', { type: 'text', name: 'username', autocomplete: 'username', value: 'dashboard', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true' }),
    el('div', { class: 'grid' },
      d.noPassword ? null : input('pw-current', 'current', t('currentPassword'), 'current-password'),
      input('pw-next', 'next', t('newPassword'), 'new-password'),
      input('pw-repeat', 'repeat', t('passwordRepeat'), 'new-password')),
    pw.message ? el('p', { class: pw.ok ? 'ok' : 'error', role: pw.ok ? 'status' : 'alert', text: pw.message }) : null,
    el('div', { class: 'actions' }, el('div', { class: 'right' }, el('button', { type: 'submit', class: d.noPassword ? 'primary' : null, text: d.noPassword ? t('setPassword') : t('changePassword') })))));
}

// ---------------------------------------------------------------- allowed hosts
/** "https://Dash.example.com/x" -> "dash.example.com": what people paste, as a host name (with a port when given). */
const hostOf = (value) => String(value).trim().toLowerCase().replace(/^[a-z][a-z0-9+.-]*:\/\//, '').replace(/[/?#].*$/, '');

function hostsSection() {
  const v = state.values;
  const add = () => {
    const host = hostOf(state.newHost ?? '');
    if (host && !v.allowedHosts.includes(host)) v.allowedHosts = [...v.allowedHosts, host];
    state.newHost = '';
    render();
    document.getElementById('new-host')?.focus();
  };
  return el('fieldset', { class: 'ask' },
    el('legend', { text: t('secHosts') }),
    el('p', { class: 'muted', text: t('secHostsHelp') }),
    v.allowedHosts.length
      ? el('div', { class: 'hosts' }, ...v.allowedHosts.map((host) => el('div', { class: 'item line' },
        el('code', { text: host }),
        el('button', { type: 'button', text: t('remove'), 'aria-label': t('removeHost', { host }), onclick: () => { v.allowedHosts = v.allowedHosts.filter((h) => h !== host); render(); } }))))
      : el('p', { class: 'muted', text: t('hostsNone') }),
    el('div', { class: 'row' },
      field('new-host', t('hostName'), el('input', { type: 'text', id: 'new-host', value: state.newHost ?? '', spellcheck: 'false', autocapitalize: 'off', placeholder: 'dash.example.com',
        oninput: (e) => { state.newHost = e.target.value; },
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } } })),
      el('button', { type: 'button', class: 'primary', text: t('addHost'), onclick: add })));
}

// ---------------------------------------------------------------- passkeys
function passkeySection() {
  const pk = state.data.passkeys ?? { secure: false, host: null, list: [] };
  const msg = state.pk;
  const section = (...children) => el('section', { class: 'panel' }, el('h2', { text: t('secPasskeys') }), ...children);
  if (!pk.secure || !webauthn()) return section(el('p', { class: 'muted', text: t('passkeysHttps') }));
  const date = (iso) => (iso ? new Date(iso).toLocaleDateString(lang) : t('passkeyNever'));
  return section(
    el('p', { class: 'muted', text: t('passkeysText', { host: pk.host }) }),
    pk.list.length
      ? el('div', {}, ...pk.list.map((p) => el('div', { class: 'item line passkey' },
        el('div', {}, el('strong', { text: p.name }), el('br'), el('span', { class: 'muted', text: t('passkeyMeta', { created: date(p.created), used: date(p.lastUsed) }) })),
        el('button', { type: 'button', text: t('removePasskey'), onclick: () => removePasskey(p.id) }))))
      : el('p', { class: 'muted', text: t('passkeysNone', { host: pk.host }) }),
    el('div', { class: 'row' },
      field('passkey-name', t('passkeyName'), el('input', { type: 'text', id: 'passkey-name', value: msg.name, maxlength: '60', placeholder: 'MacBook, iPhone', oninput: (e) => { msg.name = e.target.value; } })),
      el('button', { type: 'button', class: 'primary', disabled: msg.busy, text: t('addPasskey'), onclick: addPasskey })),
    msg.message ? el('p', { class: msg.ok ? 'ok' : 'error', role: msg.ok ? 'status' : 'alert', text: msg.message }) : null);
}

function passkeyDone(out, okText) {
  const msg = state.pk;
  msg.busy = false;
  if (out?.needsPassword) return askPassword();
  if (out?.ok) {
    state.data = out;
    Object.assign(msg, { name: '', message: okText, ok: true });
  } else Object.assign(msg, { message: t('passkeyFailed', { error: out?.error ?? '?' }), ok: false });
  render();
}

async function addPasskey() {
  const msg = state.pk;
  Object.assign(msg, { busy: true, message: '' });
  render();
  const options = await api('/passkeys/options', {}).catch((err) => ({ ok: false, error: err.message }));
  if (!options.ok) return passkeyDone(options);
  const o = options.publicKey;
  let cred;
  try {
    cred = await navigator.credentials.create({ publicKey: { ...o, challenge: fromB64u(o.challenge), user: { ...o.user, id: fromB64u(o.user.id) }, excludeCredentials: o.excludeCredentials.map((c) => ({ ...c, id: fromB64u(c.id) })) } });
  } catch (err) {
    if (err?.name !== 'NotAllowedError' && err?.name !== 'AbortError') return passkeyDone({ ok: false, error: err.message });
    // cancelled: nothing to say
    Object.assign(msg, { busy: false, message: '' });
    return render();
  }
  const r = cred?.response;
  if (!r || typeof r.getPublicKey !== 'function' || typeof r.getAuthenticatorData !== 'function' || !r.getPublicKey()) {
    Object.assign(msg, { busy: false, message: t('passkeyOld'), ok: false });
    return render();
  }
  const out = await api('/passkeys', { id: cred.id, clientDataJSON: toB64u(r.clientDataJSON), authenticatorData: toB64u(r.getAuthenticatorData()), publicKey: toB64u(r.getPublicKey()), alg: r.getPublicKeyAlgorithm(), name: msg.name }).catch((err) => ({ ok: false, error: err.message }));
  passkeyDone(out, t('passkeyAdded'));
}

async function removePasskey(id) {
  const out = await api('/passkeys/remove', { id }).catch((err) => ({ ok: false, error: err.message }));
  passkeyDone(out, t('passkeyRemoved'));
}

window.HD_SETTINGS = { I18N, state };
state.section = sectionOf(window.location.hash);
window.addEventListener('hashchange', () => {
  state.section = sectionOf(window.location.hash);
  // a save's status belongs to the section it was made in
  state.status = '';
  state.statusClass = 'muted';
  if (state.data) render();
});
// a file edited but not saved: the browser asks before leaving
window.addEventListener('beforeunload', (e) => {
  if (Object.values(state.file).some((f) => f.draft !== undefined && f.draft !== f.text)) e.preventDefault();
});
load();
