// The settings page (/settings, see src/settings.js): settings.yaml's look, security and other
// switches, and the admin password. It opens with the admin password (a login counts); without
// one yet, setting one comes first.
'use strict';

// the texts; those the setup wizard has too are the same there
const I18N = {
  en: {"titleLabel":"Title","languageLabel":"Language","themeLabel":"Theme","themeAuto":"Follow the system","themeDark":"Dark","themeLight":"Light","colorLabel":"Colour","safer":"safer","secHosts":"Allowed hosts","secHostsHelp":"The names you open the dashboard by, separated by commas. IP addresses and localhost always work. Written to settings.yaml.","secHostsEnv":"From the container's environment too: {list}","secAdmin":"Admin password","passwordRepeat":"Repeat the password","passwordShort":"The admin password needs at least {count} characters.","passwordMismatch":"The two passwords are not the same.","wait":"Too many tries; wait {seconds} s","wrong":"Wrong password","heading":"Settings","back":"Dashboard","unlockTitle":"Open the settings","unlockText":"The settings need authentication.","unlock":"Open","wrongCurrent":"The current password is not right.","offline":"The dashboard does not answer.","setupFirst":"There is no admin password yet. Set one first: it guards the settings, the buttons that run something and, if you like, the whole page.","setupRemote":"There is no admin password yet. Set one from the local network, or put adminPassword in settings.yaml.","secAppearance":"Appearance","showTitle":"Show the title on the page","headerStyle":"Header widgets","headerBoxed":"In a box","headerClean":"Without a box","target":"Service links open","targetBlank":"In a new tab","targetSelf":"In this tab","targetTop":"In the whole window","statusStyle":"Status labels","statusText":"As text","statusDot":"As a dot","statusBasic":"UP or DOWN","secSecurity":"Security","loginRemember":"Stay logged in for","durationHelp":"Such as 15m, 12h or 7d; 0 asks every time.","currentPassword":"Current password","newPassword":"New password","changePassword":"Change the password","setPassword":"Set the password","passwordChanged":"The admin password is changed; every other login has ended.","passwordEnv":"Set in the container's environment (DASHBOARD_ADMIN_PASSWORD): change it there.","secOther":"Other","hideVersion":"Hide the versions in the footer","disableUpdateCheck":"Do not check for a new release","disableIndexing":"Ask search engines not to index the page","save":"Save","saving":"Saving…","saved":"Saved.","failed":"Not saved: {error}","otherKeys":"Also in settings.yaml, kept as they are (edit them in the file): {list}","askWhen":"Security level","askActions":"Only privileged actions","askActionsText":"Anyone can open the dashboard, but changing the settings and running commands that need root, or are marked with confirm:, require authentication.","askPage":"Dashboard access","askPageText":"The dashboard cannot be opened without authentication.","askAgain":"Buttons ask again after","askAgainHelp":"Such as 15m, 12h or 7d; 0 asks for every button.","usePasskey":"Use a passkey","secPasskeys":"Passkeys","passkeysText":"A passkey (with your fingerprint, face or PIN) works wherever authentication is asked, on {host}. The admin password keeps working too.","passkeysHttps":"Passkeys work when the dashboard is opened over https, by its host name. A passkey belongs to the address it was added on.","passkeysNone":"No passkeys for {host} yet.","passkeyName":"Name","addPasskey":"Add a passkey","removePasskey":"Remove","passkeyAdded":"The passkey is added.","passkeyRemoved":"The passkey is removed.","passkeyMeta":"added {created}, last used {used}","passkeyNever":"never","passkeyFailed":"The passkey did not work: {error}","passkeyOld":"This browser cannot add a passkey here; try a newer one."},
  nl: {"titleLabel":"Titel","languageLabel":"Taal","themeLabel":"Thema","themeAuto":"Systeem volgen","themeDark":"Donker","themeLight":"Licht","colorLabel":"Kleur","safer":"veiliger","secHosts":"Toegestane hosts","secHostsHelp":"De namen waarmee je het dashboard opent, gescheiden door komma's. IP-adressen en localhost werken altijd. Komt in settings.yaml.","secHostsEnv":"Ook uit de environment van de container: {list}","secAdmin":"Admin wachtwoord","passwordRepeat":"Herhaal het wachtwoord","passwordShort":"Het admin wachtwoord moet minstens {count} tekens hebben.","passwordMismatch":"De twee wachtwoorden zijn niet gelijk.","wait":"Te veel pogingen; wacht {seconds} s","wrong":"Onjuist wachtwoord","heading":"Instellingen","back":"Dashboard","unlockTitle":"Instellingen openen","unlockText":"De instellingen vragen om authenticatie.","unlock":"Openen","wrongCurrent":"Het huidige wachtwoord klopt niet.","offline":"Het dashboard antwoordt niet.","setupFirst":"Er is nog geen admin wachtwoord. Stel dat eerst in: het beschermt de instellingen, de knoppen die iets uitvoeren en, als je wilt, de hele pagina.","setupRemote":"Er is nog geen admin wachtwoord. Stel er een in vanaf het lokale netwerk, of zet adminPassword in settings.yaml.","secAppearance":"Uiterlijk","showTitle":"De titel op de pagina tonen","headerStyle":"Headerwidgets","headerBoxed":"In een kader","headerClean":"Zonder kader","target":"Links van services openen","targetBlank":"In een nieuw tabblad","targetSelf":"In dit tabblad","targetTop":"In het hele venster","statusStyle":"Statuslabels","statusText":"Als tekst","statusDot":"Als een stip","statusBasic":"UP of DOWN","secSecurity":"Beveiliging","loginRemember":"Ingelogd blijven voor","durationHelp":"Zoals 15m, 12h of 7d; 0 vraagt het elke keer.","currentPassword":"Huidig wachtwoord","newPassword":"Nieuw wachtwoord","changePassword":"Wachtwoord wijzigen","setPassword":"Wachtwoord instellen","passwordChanged":"Het admin wachtwoord is gewijzigd; elke andere login is beëindigd.","passwordEnv":"Ingesteld in de environment van de container (DASHBOARD_ADMIN_PASSWORD): wijzig het daar.","secOther":"Overig","hideVersion":"De versies in de footer verbergen","disableUpdateCheck":"Niet zoeken naar een nieuwe release","disableIndexing":"Zoekmachines vragen de pagina niet te indexeren","save":"Opslaan","saving":"Opslaan…","saved":"Opgeslagen.","failed":"Niet opgeslagen: {error}","otherKeys":"Ook in settings.yaml, blijven zoals ze zijn (pas ze aan in het bestand): {list}","askWhen":"Beveiligingsniveau","askActions":"Alleen risicovolle acties","askActionsText":"Iedereen kan het dashboard openen, maar voor het wijzigen van de instellingen en het uitvoeren van commando's die root nodig hebben, of gemarkeerd zijn met confirm:, is authenticatie nodig.","askPage":"Toegang tot het dashboard","askPageText":"Het dashboard is niet te openen zonder authenticatie.","askAgain":"Knoppen vragen opnieuw na","askAgainHelp":"Zoals 15m, 12h of 7d; 0 vraagt bij elke knop.","usePasskey":"Passkey gebruiken","secPasskeys":"Passkeys","passkeysText":"Een passkey (met je vingerafdruk, gezicht of pincode) werkt overal waar om authenticatie wordt gevraagd, op {host}. Het admin wachtwoord blijft ook werken.","passkeysHttps":"Passkeys werken als het dashboard via https wordt geopend, op zijn hostnaam. Een passkey hoort bij het adres waarop hij is toegevoegd.","passkeysNone":"Nog geen passkeys voor {host}.","passkeyName":"Naam","addPasskey":"Passkey toevoegen","removePasskey":"Verwijderen","passkeyAdded":"De passkey is toegevoegd.","passkeyRemoved":"De passkey is verwijderd.","passkeyMeta":"toegevoegd {created}, laatst gebruikt {used}","passkeyNever":"nooit","passkeyFailed":"De passkey werkte niet: {error}","passkeyOld":"Deze browser kan hier geen passkey toevoegen; probeer een nieuwere."},
  fr: {"titleLabel":"Titre","languageLabel":"Langue","themeLabel":"Thème","themeAuto":"Suivre le système","themeDark":"Sombre","themeLight":"Clair","colorLabel":"Couleur","safer":"plus sûr","secHosts":"Hôtes autorisés","secHostsHelp":"Les noms par lesquels vous ouvrez le tableau de bord, séparés par des virgules. Les adresses IP et localhost fonctionnent toujours. Écrit dans settings.yaml.","secHostsEnv":"Aussi depuis l’environnement du conteneur : {list}","secAdmin":"Mot de passe administrateur","passwordRepeat":"Répétez le mot de passe","passwordShort":"Le mot de passe administrateur doit compter au moins {count} caractères.","passwordMismatch":"Les deux mots de passe ne sont pas identiques.","wait":"Trop d’essais ; attendez {seconds} s","wrong":"Mot de passe incorrect","heading":"Réglages","back":"Tableau de bord","unlockTitle":"Ouvrir les réglages","unlock":"Ouvrir","wrongCurrent":"Le mot de passe actuel n’est pas le bon.","offline":"Le tableau de bord ne répond pas.","setupFirst":"Il n’y a pas encore de mot de passe administrateur. Définissez-en un d’abord : il protège les réglages, les boutons qui exécutent quelque chose et, si vous le souhaitez, toute la page.","setupRemote":"Il n’y a pas encore de mot de passe administrateur. Définissez-en un depuis le réseau local, ou mettez adminPassword dans settings.yaml.","secAppearance":"Apparence","showTitle":"Afficher le titre sur la page","headerStyle":"Widgets d’en-tête","headerBoxed":"Dans un cadre","headerClean":"Sans cadre","target":"Les liens des services s’ouvrent","targetBlank":"Dans un nouvel onglet","targetSelf":"Dans cet onglet","targetTop":"Dans toute la fenêtre","statusStyle":"Étiquettes d’état","statusText":"En texte","statusDot":"En point","statusBasic":"UP ou DOWN","secSecurity":"Sécurité","loginRemember":"Rester connecté pendant","durationHelp":"Comme 15m, 12h ou 7d ; 0 le demande à chaque fois.","currentPassword":"Mot de passe actuel","newPassword":"Nouveau mot de passe","changePassword":"Changer le mot de passe","setPassword":"Définir le mot de passe","passwordChanged":"Le mot de passe administrateur est changé ; toutes les autres connexions sont terminées.","passwordEnv":"Défini dans l’environnement du conteneur (DASHBOARD_ADMIN_PASSWORD) : changez-le là.","secOther":"Autre","hideVersion":"Masquer les versions dans le pied de page","disableUpdateCheck":"Ne pas chercher de nouvelle version","disableIndexing":"Demander aux moteurs de recherche de ne pas indexer la page","save":"Enregistrer","saving":"Enregistrement…","saved":"Enregistré.","failed":"Non enregistré : {error}","otherKeys":"Aussi dans settings.yaml, gardés tels quels (modifiez-les dans le fichier) : {list}"},
  de: {"titleLabel":"Titel","languageLabel":"Sprache","themeLabel":"Design","themeAuto":"System folgen","themeDark":"Dunkel","themeLight":"Hell","colorLabel":"Farbe","safer":"sicherer","secHosts":"Erlaubte Hosts","secHostsHelp":"Die Namen, unter denen du das Dashboard öffnest, durch Kommas getrennt. IP-Adressen und localhost funktionieren immer. Kommt in settings.yaml.","secHostsEnv":"Auch aus der Umgebung des Containers: {list}","secAdmin":"Admin-Passwort","passwordRepeat":"Passwort wiederholen","passwordShort":"Das Admin-Passwort braucht mindestens {count} Zeichen.","passwordMismatch":"Die beiden Passwörter sind nicht gleich.","wait":"Zu viele Versuche; warte {seconds} s","wrong":"Falsches Passwort","heading":"Einstellungen","back":"Dashboard","unlockTitle":"Einstellungen öffnen","unlock":"Öffnen","wrongCurrent":"Das aktuelle Passwort stimmt nicht.","offline":"Das Dashboard antwortet nicht.","setupFirst":"Es gibt noch kein Admin-Passwort. Lege zuerst eins fest: Es schützt die Einstellungen, die Schaltflächen, die etwas ausführen, und auf Wunsch die ganze Seite.","setupRemote":"Es gibt noch kein Admin-Passwort. Lege eins im lokalen Netz fest oder trage adminPassword in settings.yaml ein.","secAppearance":"Aussehen","showTitle":"Den Titel auf der Seite zeigen","headerStyle":"Header-Widgets","headerBoxed":"In einem Kasten","headerClean":"Ohne Kasten","target":"Links der Dienste öffnen","targetBlank":"In einem neuen Tab","targetSelf":"In diesem Tab","targetTop":"Im ganzen Fenster","statusStyle":"Status-Labels","statusText":"Als Text","statusDot":"Als Punkt","statusBasic":"UP oder DOWN","secSecurity":"Sicherheit","loginRemember":"Angemeldet bleiben für","durationHelp":"Etwa 15m, 12h oder 7d; 0 fragt jedes Mal.","currentPassword":"Aktuelles Passwort","newPassword":"Neues Passwort","changePassword":"Passwort ändern","setPassword":"Passwort festlegen","passwordChanged":"Das Admin-Passwort ist geändert; jede andere Anmeldung ist beendet.","passwordEnv":"In der Umgebung des Containers gesetzt (DASHBOARD_ADMIN_PASSWORD): dort ändern.","secOther":"Sonstiges","hideVersion":"Die Versionen in der Fußzeile ausblenden","disableUpdateCheck":"Nicht nach einem neuen Release suchen","disableIndexing":"Suchmaschinen bitten, die Seite nicht zu indexieren","save":"Speichern","saving":"Speichere…","saved":"Gespeichert.","failed":"Nicht gespeichert: {error}","otherKeys":"Auch in settings.yaml, bleiben, wie sie sind (in der Datei ändern): {list}"},
  es: {"titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir al sistema","themeDark":"Oscuro","themeLight":"Claro","colorLabel":"Color","safer":"más seguro","secHosts":"Hosts permitidos","secHostsHelp":"Los nombres con los que abres el panel, separados por comas. Las direcciones IP y localhost siempre funcionan. Se escribe en settings.yaml.","secHostsEnv":"También del entorno del contenedor: {list}","secAdmin":"Contraseña de administrador","passwordRepeat":"Repite la contraseña","passwordShort":"La contraseña de administrador necesita al menos {count} caracteres.","passwordMismatch":"Las dos contraseñas no coinciden.","wait":"Demasiados intentos; espera {seconds} s","wrong":"Contraseña incorrecta","heading":"Ajustes","back":"Panel","unlockTitle":"Abrir los ajustes","unlock":"Abrir","wrongCurrent":"La contraseña actual no es correcta.","offline":"El panel no responde.","setupFirst":"Aún no hay contraseña de administrador. Crea una primero: protege los ajustes, los botones que ejecutan algo y, si quieres, toda la página.","setupRemote":"Aún no hay contraseña de administrador. Crea una desde la red local, o pon adminPassword en settings.yaml.","secAppearance":"Apariencia","showTitle":"Mostrar el título en la página","headerStyle":"Widgets de cabecera","headerBoxed":"En un recuadro","headerClean":"Sin recuadro","target":"Los enlaces de servicios se abren","targetBlank":"En una pestaña nueva","targetSelf":"En esta pestaña","targetTop":"En toda la ventana","statusStyle":"Etiquetas de estado","statusText":"Como texto","statusDot":"Como un punto","statusBasic":"UP o DOWN","secSecurity":"Seguridad","loginRemember":"Mantener la sesión durante","durationHelp":"Como 15m, 12h o 7d; 0 la pide cada vez.","currentPassword":"Contraseña actual","newPassword":"Contraseña nueva","changePassword":"Cambiar la contraseña","setPassword":"Crear la contraseña","passwordChanged":"La contraseña de administrador ha cambiado; las demás sesiones han terminado.","passwordEnv":"Configurada en el entorno del contenedor (DASHBOARD_ADMIN_PASSWORD): cámbiala allí.","secOther":"Otros","hideVersion":"Ocultar las versiones en el pie","disableUpdateCheck":"No buscar una versión nueva","disableIndexing":"Pedir a los buscadores que no indexen la página","save":"Guardar","saving":"Guardando…","saved":"Guardado.","failed":"No guardado: {error}","otherKeys":"También en settings.yaml, se quedan como están (edítalos en el archivo): {list}"},
  ca: {"titleLabel":"Títol","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Segueix el sistema","themeDark":"Fosc","themeLight":"Clar","colorLabel":"Color","safer":"més segur","secHosts":"Amfitrions permesos","secHostsHelp":"Els noms amb què obres el tauler, separats per comes. Les adreces IP i localhost sempre funcionen. S’escriu a settings.yaml.","secHostsEnv":"També de l’entorn del contenidor: {list}","secAdmin":"Contrasenya d’administrador","passwordRepeat":"Repeteix la contrasenya","passwordShort":"La contrasenya d’administrador necessita com a mínim {count} caràcters.","passwordMismatch":"Les dues contrasenyes no coincideixen.","wait":"Massa intents; espera {seconds} s","wrong":"Contrasenya incorrecta","heading":"Configuració","back":"Tauler","unlockTitle":"Obre la configuració","unlock":"Obre","wrongCurrent":"La contrasenya actual no és correcta.","offline":"El tauler no respon.","setupFirst":"Encara no hi ha contrasenya d’administrador. Crea’n una primer: protegeix la configuració, els botons que executen alguna cosa i, si vols, tota la pàgina.","setupRemote":"Encara no hi ha contrasenya d’administrador. Crea’n una des de la xarxa local, o posa adminPassword a settings.yaml.","secAppearance":"Aparença","showTitle":"Mostra el títol a la pàgina","headerStyle":"Ginys de capçalera","headerBoxed":"En un requadre","headerClean":"Sense requadre","target":"Els enllaços dels serveis s’obren","targetBlank":"En una pestanya nova","targetSelf":"En aquesta pestanya","targetTop":"A tota la finestra","statusStyle":"Etiquetes d’estat","statusText":"Com a text","statusDot":"Com un punt","statusBasic":"UP o DOWN","secSecurity":"Seguretat","loginRemember":"Mantén la sessió durant","durationHelp":"Com 15m, 12h o 7d; 0 la demana cada vegada.","currentPassword":"Contrasenya actual","newPassword":"Contrasenya nova","changePassword":"Canvia la contrasenya","setPassword":"Crea la contrasenya","passwordChanged":"La contrasenya d’administrador ha canviat; les altres sessions han acabat.","passwordEnv":"Definida a l’entorn del contenidor (DASHBOARD_ADMIN_PASSWORD): canvia-la allà.","secOther":"Altres","hideVersion":"Amaga les versions al peu","disableUpdateCheck":"No cerquis una versió nova","disableIndexing":"Demana als cercadors que no indexin la pàgina","save":"Desa","saving":"Desant…","saved":"Desat.","failed":"No s’ha desat: {error}","otherKeys":"També a settings.yaml, es mantenen tal com són (edita’ls al fitxer): {list}"},
  he: {"titleLabel":"כותרת","languageLabel":"שפה","themeLabel":"ערכת נושא","themeAuto":"לפי המערכת","themeDark":"כהה","themeLight":"בהיר","colorLabel":"צבע","safer":"בטוח יותר","secHosts":"מארחים מורשים","secHostsHelp":"השמות שבהם פותחים את לוח המחוונים, מופרדים בפסיקים. כתובות IP ו־localhost תמיד עובדים. נכתב ל־settings.yaml.","secHostsEnv":"גם מהסביבה של המכולה: {list}","secAdmin":"סיסמת מנהל","passwordRepeat":"חזרה על הסיסמה","passwordShort":"סיסמת המנהל צריכה לפחות {count} תווים.","passwordMismatch":"שתי הסיסמאות אינן זהות.","wait":"יותר מדי ניסיונות; יש להמתין {seconds} שנ׳","wrong":"סיסמה שגויה","heading":"הגדרות","back":"לוח המחוונים","unlockTitle":"פתיחת ההגדרות","unlock":"פתיחה","wrongCurrent":"הסיסמה הנוכחית אינה נכונה.","offline":"לוח המחוונים אינו עונה.","setupFirst":"עדיין אין סיסמת מנהל. יש להגדיר אחת קודם: היא מגינה על ההגדרות, על הכפתורים שמריצים משהו ואם רוצים גם על כל הדף.","setupRemote":"עדיין אין סיסמת מנהל. יש להגדיר אחת מהרשת המקומית, או להוסיף adminPassword ל־settings.yaml.","secAppearance":"מראה","showTitle":"הצגת הכותרת בדף","headerStyle":"ווידג׳טים בכותרת","headerBoxed":"בתוך מסגרת","headerClean":"בלי מסגרת","target":"קישורי שירותים נפתחים","targetBlank":"בכרטיסייה חדשה","targetSelf":"בכרטיסייה הזו","targetTop":"בכל החלון","statusStyle":"תוויות מצב","statusText":"כטקסט","statusDot":"כנקודה","statusBasic":"UP או DOWN","secSecurity":"אבטחה","loginRemember":"להישאר מחובר למשך","durationHelp":"למשל 15m, 12h או 7d; 0 שואל בכל פעם.","currentPassword":"סיסמה נוכחית","newPassword":"סיסמה חדשה","changePassword":"שינוי הסיסמה","setPassword":"הגדרת הסיסמה","passwordChanged":"סיסמת המנהל שונתה; כל שאר הכניסות הסתיימו.","passwordEnv":"מוגדרת בסביבה של המכולה (DASHBOARD_ADMIN_PASSWORD): יש לשנות אותה שם.","secOther":"אחר","hideVersion":"הסתרת הגרסאות בכותרת התחתונה","disableUpdateCheck":"לא לבדוק אם יש גרסה חדשה","disableIndexing":"לבקש ממנועי חיפוש לא לאנדקס את הדף","save":"שמירה","saving":"שומר…","saved":"נשמר.","failed":"לא נשמר: {error}","otherKeys":"גם ב־settings.yaml, נשארים כמו שהם (יש לערוך בקובץ): {list}"},
  hr: {"titleLabel":"Naslov","languageLabel":"Jezik","themeLabel":"Tema","themeAuto":"Prati sustav","themeDark":"Tamna","themeLight":"Svijetla","colorLabel":"Boja","safer":"sigurnije","secHosts":"Dopušteni hostovi","secHostsHelp":"Imena pod kojima otvaraš ploču, odvojena zarezima. IP adrese i localhost uvijek rade. Zapisuje se u settings.yaml.","secHostsEnv":"I iz okruženja spremnika: {list}","secAdmin":"Administratorska lozinka","passwordRepeat":"Ponovi lozinku","passwordShort":"Administratorska lozinka treba barem {count} znakova.","passwordMismatch":"Dvije lozinke nisu iste.","wait":"Previše pokušaja; pričekaj {seconds} s","wrong":"Pogrešna lozinka","heading":"Postavke","back":"Ploča","unlockTitle":"Otvori postavke","unlock":"Otvori","wrongCurrent":"Trenutna lozinka nije točna.","offline":"Ploča ne odgovara.","setupFirst":"Još nema administratorske lozinke. Najprije je postavi: štiti postavke, gumbe koji nešto pokreću i, ako želiš, cijelu stranicu.","setupRemote":"Još nema administratorske lozinke. Postavi je iz lokalne mreže ili upiši adminPassword u settings.yaml.","secAppearance":"Izgled","showTitle":"Prikaži naslov na stranici","headerStyle":"Widgeti zaglavlja","headerBoxed":"U okviru","headerClean":"Bez okvira","target":"Poveznice usluga otvaraju se","targetBlank":"U novoj kartici","targetSelf":"U ovoj kartici","targetTop":"U cijelom prozoru","statusStyle":"Oznake stanja","statusText":"Kao tekst","statusDot":"Kao točka","statusBasic":"UP ili DOWN","secSecurity":"Sigurnost","loginRemember":"Ostani prijavljen","durationHelp":"Npr. 15m, 12h ili 7d; 0 pita svaki put.","currentPassword":"Trenutna lozinka","newPassword":"Nova lozinka","changePassword":"Promijeni lozinku","setPassword":"Postavi lozinku","passwordChanged":"Administratorska lozinka je promijenjena; sve druge prijave su završene.","passwordEnv":"Postavljena u okruženju spremnika (DASHBOARD_ADMIN_PASSWORD): promijeni je ondje.","secOther":"Ostalo","hideVersion":"Sakrij verzije u podnožju","disableUpdateCheck":"Ne traži novo izdanje","disableIndexing":"Zamoli tražilice da ne indeksiraju stranicu","save":"Spremi","saving":"Spremam…","saved":"Spremljeno.","failed":"Nije spremljeno: {error}","otherKeys":"I u settings.yaml, ostaju kakvi jesu (uredi ih u datoteci): {list}"},
  hu: {"titleLabel":"Cím","languageLabel":"Nyelv","themeLabel":"Téma","themeAuto":"Rendszer szerint","themeDark":"Sötét","themeLight":"Világos","colorLabel":"Szín","safer":"biztonságosabb","secHosts":"Engedélyezett hostok","secHostsHelp":"A nevek, amelyekkel az irányítópultot megnyitod, vesszővel elválasztva. Az IP-címek és a localhost mindig működnek. A settings.yaml-ba kerül.","secHostsEnv":"A konténer környezetéből is: {list}","secAdmin":"Adminjelszó","passwordRepeat":"Jelszó ismét","passwordShort":"Az adminjelszónak legalább {count} karakter kell.","passwordMismatch":"A két jelszó nem egyezik.","wait":"Túl sok próbálkozás; várj {seconds} mp-et","wrong":"Hibás jelszó","heading":"Beállítások","back":"Irányítópult","unlockTitle":"Beállítások megnyitása","unlock":"Megnyitás","wrongCurrent":"A jelenlegi jelszó nem jó.","offline":"Az irányítópult nem válaszol.","setupFirst":"Még nincs adminjelszó. Előbb állíts be egyet: védi a beállításokat, a valamit futtató gombokat és, ha szeretnéd, az egész oldalt.","setupRemote":"Még nincs adminjelszó. Állíts be egyet a helyi hálózatról, vagy írd az adminPassword-öt a settings.yaml-ba.","secAppearance":"Megjelenés","showTitle":"A cím megjelenítése az oldalon","headerStyle":"Fejléc-widgetek","headerBoxed":"Keretben","headerClean":"Keret nélkül","target":"A szolgáltatások linkjei megnyílnak","targetBlank":"Új lapon","targetSelf":"Ezen a lapon","targetTop":"Az egész ablakban","statusStyle":"Állapotcímkék","statusText":"Szövegként","statusDot":"Pontként","statusBasic":"UP vagy DOWN","secSecurity":"Biztonság","loginRemember":"Bejelentkezve maradás","durationHelp":"Például 15m, 12h vagy 7d; 0 mindig kéri.","currentPassword":"Jelenlegi jelszó","newPassword":"Új jelszó","changePassword":"Jelszó módosítása","setPassword":"Jelszó beállítása","passwordChanged":"Az adminjelszó megváltozott; minden más bejelentkezés véget ért.","passwordEnv":"A konténer környezetében van beállítva (DASHBOARD_ADMIN_PASSWORD): ott módosítsd.","secOther":"Egyéb","hideVersion":"A verziók elrejtése a láblécben","disableUpdateCheck":"Ne keressen új kiadást","disableIndexing":"Kérje a keresőket, hogy ne indexeljék az oldalt","save":"Mentés","saving":"Mentés…","saved":"Mentve.","failed":"Nincs mentve: {error}","otherKeys":"A settings.yaml-ban ezek is vannak, változatlanul maradnak (a fájlban szerkeszd): {list}"},
  it: {"titleLabel":"Titolo","languageLabel":"Lingua","themeLabel":"Tema","themeAuto":"Segui il sistema","themeDark":"Scuro","themeLight":"Chiaro","colorLabel":"Colore","safer":"più sicuro","secHosts":"Host consentiti","secHostsHelp":"I nomi con cui apri la dashboard, separati da virgole. Gli indirizzi IP e localhost funzionano sempre. Scritto in settings.yaml.","secHostsEnv":"Anche dall’ambiente del container: {list}","secAdmin":"Password di amministratore","passwordRepeat":"Ripeti la password","passwordShort":"La password di amministratore richiede almeno {count} caratteri.","passwordMismatch":"Le due password non coincidono.","wait":"Troppi tentativi; attendi {seconds} s","wrong":"Password errata","heading":"Impostazioni","back":"Dashboard","unlockTitle":"Apri le impostazioni","unlock":"Apri","wrongCurrent":"La password attuale non è giusta.","offline":"La dashboard non risponde.","setupFirst":"Non c’è ancora una password di amministratore. Impostane una prima: protegge le impostazioni, i pulsanti che eseguono qualcosa e, se vuoi, tutta la pagina.","setupRemote":"Non c’è ancora una password di amministratore. Impostane una dalla rete locale, o metti adminPassword in settings.yaml.","secAppearance":"Aspetto","showTitle":"Mostra il titolo nella pagina","headerStyle":"Widget dell’intestazione","headerBoxed":"In un riquadro","headerClean":"Senza riquadro","target":"I link dei servizi si aprono","targetBlank":"In una nuova scheda","targetSelf":"In questa scheda","targetTop":"In tutta la finestra","statusStyle":"Etichette di stato","statusText":"Come testo","statusDot":"Come un punto","statusBasic":"UP o DOWN","secSecurity":"Sicurezza","loginRemember":"Resta connesso per","durationHelp":"Ad esempio 15m, 12h o 7d; 0 la chiede ogni volta.","currentPassword":"Password attuale","newPassword":"Nuova password","changePassword":"Cambia la password","setPassword":"Imposta la password","passwordChanged":"La password di amministratore è cambiata; tutti gli altri accessi sono terminati.","passwordEnv":"Impostata nell’ambiente del container (DASHBOARD_ADMIN_PASSWORD): cambiala lì.","secOther":"Altro","hideVersion":"Nascondi le versioni nel piè di pagina","disableUpdateCheck":"Non cercare una nuova versione","disableIndexing":"Chiedi ai motori di ricerca di non indicizzare la pagina","save":"Salva","saving":"Salvataggio…","saved":"Salvato.","failed":"Non salvato: {error}","otherKeys":"Anche in settings.yaml, restano come sono (modificali nel file): {list}"},
  'nb-NO': {"titleLabel":"Tittel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Følg systemet","themeDark":"Mørkt","themeLight":"Lyst","colorLabel":"Farge","safer":"tryggere","secHosts":"Tillatte verter","secHostsHelp":"Navnene du åpner dashbordet med, skilt med komma. IP-adresser og localhost virker alltid. Skrives i settings.yaml.","secHostsEnv":"Også fra containerens miljø: {list}","secAdmin":"Adminpassord","passwordRepeat":"Gjenta passordet","passwordShort":"Adminpassordet må ha minst {count} tegn.","passwordMismatch":"De to passordene er ikke like.","wait":"For mange forsøk; vent {seconds} s","wrong":"Feil passord","heading":"Innstillinger","back":"Dashbord","unlockTitle":"Åpne innstillingene","unlock":"Åpne","wrongCurrent":"Det nåværende passordet stemmer ikke.","offline":"Dashbordet svarer ikke.","setupFirst":"Det finnes ikke noe adminpassord ennå. Sett et først: det beskytter innstillingene, knappene som kjører noe og, om du vil, hele siden.","setupRemote":"Det finnes ikke noe adminpassord ennå. Sett et fra det lokale nettet, eller legg adminPassword i settings.yaml.","secAppearance":"Utseende","showTitle":"Vis tittelen på siden","headerStyle":"Toppwidgeter","headerBoxed":"I en boks","headerClean":"Uten boks","target":"Lenker til tjenester åpnes","targetBlank":"I en ny fane","targetSelf":"I denne fanen","targetTop":"I hele vinduet","statusStyle":"Statusetiketter","statusText":"Som tekst","statusDot":"Som en prikk","statusBasic":"UP eller DOWN","secSecurity":"Sikkerhet","loginRemember":"Forbli innlogget i","durationHelp":"For eksempel 15m, 12h eller 7d; 0 spør hver gang.","currentPassword":"Nåværende passord","newPassword":"Nytt passord","changePassword":"Endre passordet","setPassword":"Sett passordet","passwordChanged":"Adminpassordet er endret; alle andre innlogginger er avsluttet.","passwordEnv":"Satt i containerens miljø (DASHBOARD_ADMIN_PASSWORD): endre det der.","secOther":"Annet","hideVersion":"Skjul versjonene i bunnteksten","disableUpdateCheck":"Ikke se etter en ny utgivelse","disableIndexing":"Be søkemotorer om ikke å indeksere siden","save":"Lagre","saving":"Lagrer…","saved":"Lagret.","failed":"Ikke lagret: {error}","otherKeys":"Også i settings.yaml, beholdes som de er (rediger dem i filen): {list}"},
  pt: {"titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir o sistema","themeDark":"Escuro","themeLight":"Claro","colorLabel":"Cor","safer":"mais seguro","secHosts":"Hosts permitidos","secHostsHelp":"Os nomes com que abre o painel, separados por vírgulas. Os endereços IP e localhost funcionam sempre. Escrito em settings.yaml.","secHostsEnv":"Também do ambiente do contentor: {list}","secAdmin":"Palavra-passe de administrador","passwordRepeat":"Repita a palavra-passe","passwordShort":"A palavra-passe de administrador precisa de pelo menos {count} caracteres.","passwordMismatch":"As duas palavras-passe não são iguais.","wait":"Demasiadas tentativas; aguarde {seconds} s","wrong":"Palavra-passe incorreta","heading":"Definições","back":"Painel","unlockTitle":"Abrir as definições","unlock":"Abrir","wrongCurrent":"A palavra-passe atual não está certa.","offline":"O painel não responde.","setupFirst":"Ainda não há palavra-passe de administrador. Defina uma primeiro: protege as definições, os botões que executam algo e, se quiser, a página inteira.","setupRemote":"Ainda não há palavra-passe de administrador. Defina uma a partir da rede local, ou ponha adminPassword em settings.yaml.","secAppearance":"Aspeto","showTitle":"Mostrar o título na página","headerStyle":"Widgets do cabeçalho","headerBoxed":"Numa caixa","headerClean":"Sem caixa","target":"As ligações dos serviços abrem","targetBlank":"Num novo separador","targetSelf":"Neste separador","targetTop":"Na janela inteira","statusStyle":"Etiquetas de estado","statusText":"Como texto","statusDot":"Como um ponto","statusBasic":"UP ou DOWN","secSecurity":"Segurança","loginRemember":"Manter a sessão durante","durationHelp":"Como 15m, 12h ou 7d; 0 pede sempre.","currentPassword":"Palavra-passe atual","newPassword":"Nova palavra-passe","changePassword":"Mudar a palavra-passe","setPassword":"Definir a palavra-passe","passwordChanged":"A palavra-passe de administrador foi mudada; todas as outras sessões terminaram.","passwordEnv":"Definida no ambiente do contentor (DASHBOARD_ADMIN_PASSWORD): mude-a lá.","secOther":"Outros","hideVersion":"Ocultar as versões no rodapé","disableUpdateCheck":"Não procurar uma nova versão","disableIndexing":"Pedir aos motores de busca que não indexem a página","save":"Guardar","saving":"A guardar…","saved":"Guardado.","failed":"Não guardado: {error}","otherKeys":"Também em settings.yaml, ficam como estão (edite-os no ficheiro): {list}"},
  ru: {"titleLabel":"Заголовок","languageLabel":"Язык","themeLabel":"Тема","themeAuto":"Как в системе","themeDark":"Тёмная","themeLight":"Светлая","colorLabel":"Цвет","safer":"безопаснее","secHosts":"Разрешённые хосты","secHostsHelp":"Имена, по которым вы открываете панель, через запятую. IP-адреса и localhost работают всегда. Записывается в settings.yaml.","secHostsEnv":"Также из окружения контейнера: {list}","secAdmin":"Пароль администратора","passwordRepeat":"Повторите пароль","passwordShort":"Пароль администратора должен быть не короче {count} символов.","passwordMismatch":"Пароли не совпадают.","wait":"Слишком много попыток; подождите {seconds} с","wrong":"Неверный пароль","heading":"Настройки","back":"Панель","unlockTitle":"Открыть настройки","unlock":"Открыть","wrongCurrent":"Текущий пароль неверен.","offline":"Панель не отвечает.","setupFirst":"Пароля администратора ещё нет. Сначала задайте его: он защищает настройки, кнопки, которые что-то запускают, и при желании всю страницу.","setupRemote":"Пароля администратора ещё нет. Задайте его из локальной сети или впишите adminPassword в settings.yaml.","secAppearance":"Внешний вид","showTitle":"Показывать заголовок на странице","headerStyle":"Виджеты в шапке","headerBoxed":"В рамке","headerClean":"Без рамки","target":"Ссылки сервисов открываются","targetBlank":"В новой вкладке","targetSelf":"В этой вкладке","targetTop":"Во всём окне","statusStyle":"Метки статуса","statusText":"Текстом","statusDot":"Точкой","statusBasic":"UP или DOWN","secSecurity":"Безопасность","loginRemember":"Оставаться в системе","durationHelp":"Например 15m, 12h или 7d; 0 спрашивает каждый раз.","currentPassword":"Текущий пароль","newPassword":"Новый пароль","changePassword":"Сменить пароль","setPassword":"Задать пароль","passwordChanged":"Пароль администратора изменён; все остальные входы завершены.","passwordEnv":"Задан в окружении контейнера (DASHBOARD_ADMIN_PASSWORD): меняйте его там.","secOther":"Прочее","hideVersion":"Скрыть версии в подвале","disableUpdateCheck":"Не проверять новый релиз","disableIndexing":"Просить поисковики не индексировать страницу","save":"Сохранить","saving":"Сохранение…","saved":"Сохранено.","failed":"Не сохранено: {error}","otherKeys":"Также в settings.yaml, остаются как есть (правьте их в файле): {list}"},
  sv: {"titleLabel":"Titel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Följ systemet","themeDark":"Mörkt","themeLight":"Ljust","colorLabel":"Färg","safer":"säkrare","secHosts":"Tillåtna värdar","secHostsHelp":"Namnen du öppnar instrumentpanelen med, åtskilda med kommatecken. IP-adresser och localhost fungerar alltid. Skrivs i settings.yaml.","secHostsEnv":"Även från containerns miljö: {list}","secAdmin":"Adminlösenord","passwordRepeat":"Upprepa lösenordet","passwordShort":"Adminlösenordet behöver minst {count} tecken.","passwordMismatch":"De två lösenorden är inte lika.","wait":"För många försök; vänta {seconds} s","wrong":"Fel lösenord","heading":"Inställningar","back":"Instrumentpanel","unlockTitle":"Öppna inställningarna","unlock":"Öppna","wrongCurrent":"Det nuvarande lösenordet stämmer inte.","offline":"Instrumentpanelen svarar inte.","setupFirst":"Det finns inget adminlösenord ännu. Ställ in ett först: det skyddar inställningarna, knapparna som kör något och, om du vill, hela sidan.","setupRemote":"Det finns inget adminlösenord ännu. Ställ in ett från det lokala nätverket, eller lägg adminPassword i settings.yaml.","secAppearance":"Utseende","showTitle":"Visa titeln på sidan","headerStyle":"Sidhuvudwidgetar","headerBoxed":"I en ruta","headerClean":"Utan ruta","target":"Länkar till tjänster öppnas","targetBlank":"I en ny flik","targetSelf":"I den här fliken","targetTop":"I hela fönstret","statusStyle":"Statusetiketter","statusText":"Som text","statusDot":"Som en prick","statusBasic":"UP eller DOWN","secSecurity":"Säkerhet","loginRemember":"Förbli inloggad i","durationHelp":"Till exempel 15m, 12h eller 7d; 0 frågar varje gång.","currentPassword":"Nuvarande lösenord","newPassword":"Nytt lösenord","changePassword":"Byt lösenord","setPassword":"Ställ in lösenordet","passwordChanged":"Adminlösenordet är bytt; alla andra inloggningar har avslutats.","passwordEnv":"Satt i containerns miljö (DASHBOARD_ADMIN_PASSWORD): ändra det där.","secOther":"Övrigt","hideVersion":"Dölj versionerna i sidfoten","disableUpdateCheck":"Sök inte efter en ny version","disableIndexing":"Be sökmotorer att inte indexera sidan","save":"Spara","saving":"Sparar…","saved":"Sparat.","failed":"Inte sparat: {error}","otherKeys":"Finns också i settings.yaml, behålls som de är (redigera dem i filen): {list}"},
  vi: {"titleLabel":"Tiêu đề","languageLabel":"Ngôn ngữ","themeLabel":"Chủ đề","themeAuto":"Theo hệ thống","themeDark":"Tối","themeLight":"Sáng","colorLabel":"Màu","safer":"an toàn hơn","secHosts":"Máy chủ được phép","secHostsHelp":"Các tên bạn dùng để mở bảng điều khiển, cách nhau bằng dấu phẩy. Địa chỉ IP và localhost luôn hoạt động. Được ghi vào settings.yaml.","secHostsEnv":"Cả từ môi trường của container: {list}","secAdmin":"Mật khẩu quản trị","passwordRepeat":"Nhập lại mật khẩu","passwordShort":"Mật khẩu quản trị cần ít nhất {count} ký tự.","passwordMismatch":"Hai mật khẩu không giống nhau.","wait":"Quá nhiều lần thử; chờ {seconds} giây","wrong":"Sai mật khẩu","heading":"Cài đặt","back":"Bảng điều khiển","unlockTitle":"Mở cài đặt","unlock":"Mở","wrongCurrent":"Mật khẩu hiện tại không đúng.","offline":"Bảng điều khiển không phản hồi.","setupFirst":"Chưa có mật khẩu quản trị. Hãy đặt một mật khẩu trước: nó bảo vệ phần cài đặt, các nút chạy lệnh và, nếu muốn, cả trang.","setupRemote":"Chưa có mật khẩu quản trị. Hãy đặt từ mạng nội bộ, hoặc thêm adminPassword vào settings.yaml.","secAppearance":"Giao diện","showTitle":"Hiện tiêu đề trên trang","headerStyle":"Widget đầu trang","headerBoxed":"Trong khung","headerClean":"Không khung","target":"Liên kết dịch vụ mở","targetBlank":"Trong thẻ mới","targetSelf":"Trong thẻ này","targetTop":"Trong cả cửa sổ","statusStyle":"Nhãn trạng thái","statusText":"Dạng chữ","statusDot":"Dạng chấm","statusBasic":"UP hoặc DOWN","secSecurity":"Bảo mật","loginRemember":"Giữ đăng nhập trong","durationHelp":"Ví dụ 15m, 12h hoặc 7d; 0 hỏi mỗi lần.","currentPassword":"Mật khẩu hiện tại","newPassword":"Mật khẩu mới","changePassword":"Đổi mật khẩu","setPassword":"Đặt mật khẩu","passwordChanged":"Đã đổi mật khẩu quản trị; mọi phiên đăng nhập khác đã kết thúc.","passwordEnv":"Đặt trong môi trường của container (DASHBOARD_ADMIN_PASSWORD): hãy đổi ở đó.","secOther":"Khác","hideVersion":"Ẩn phiên bản ở chân trang","disableUpdateCheck":"Không kiểm tra bản phát hành mới","disableIndexing":"Yêu cầu công cụ tìm kiếm không lập chỉ mục trang","save":"Lưu","saving":"Đang lưu…","saved":"Đã lưu.","failed":"Chưa lưu: {error}","otherKeys":"Cũng có trong settings.yaml, giữ nguyên (sửa trong tệp): {list}"},
  'zh-Hans': {"titleLabel":"标题","languageLabel":"语言","themeLabel":"主题","themeAuto":"跟随系统","themeDark":"深色","themeLight":"浅色","colorLabel":"颜色","safer":"更安全","secHosts":"允许的主机","secHostsHelp":"打开仪表板所用的名称，用逗号分隔。IP 地址和 localhost 总是可用。写入 settings.yaml。","secHostsEnv":"也来自容器的环境变量：{list}","secAdmin":"管理员密码","passwordRepeat":"再次输入密码","passwordShort":"管理员密码至少需要 {count} 个字符。","passwordMismatch":"两次输入的密码不一致。","wait":"尝试次数过多；请等待 {seconds} 秒","wrong":"密码错误","heading":"设置","back":"仪表板","unlockTitle":"打开设置","unlock":"打开","wrongCurrent":"当前密码不正确。","offline":"仪表板没有响应。","setupFirst":"还没有管理员密码。请先设置：它保护设置、执行操作的按钮，也可以保护整个页面。","setupRemote":"还没有管理员密码。请从本地网络设置，或在 settings.yaml 中写入 adminPassword。","secAppearance":"外观","showTitle":"在页面上显示标题","headerStyle":"页头小组件","headerBoxed":"带边框","headerClean":"无边框","target":"服务链接打开于","targetBlank":"新标签页","targetSelf":"当前标签页","targetTop":"整个窗口","statusStyle":"状态标签","statusText":"文字","statusDot":"圆点","statusBasic":"UP 或 DOWN","secSecurity":"安全","loginRemember":"保持登录","durationHelp":"如 15m、12h 或 7d；0 表示每次都询问。","currentPassword":"当前密码","newPassword":"新密码","changePassword":"修改密码","setPassword":"设置密码","passwordChanged":"管理员密码已修改；其他所有登录都已结束。","passwordEnv":"已在容器环境变量中设置（DASHBOARD_ADMIN_PASSWORD）：请在那里修改。","secOther":"其他","hideVersion":"在页脚隐藏版本","disableUpdateCheck":"不检查新版本","disableIndexing":"要求搜索引擎不要索引此页面","save":"保存","saving":"正在保存…","saved":"已保存。","failed":"未保存：{error}","otherKeys":"settings.yaml 中还有以下项，保持不变（请在文件中编辑）：{list}"},
  'zh-Hant': {"titleLabel":"標題","languageLabel":"語言","themeLabel":"主題","themeAuto":"跟隨系統","themeDark":"深色","themeLight":"淺色","colorLabel":"顏色","safer":"較安全","secHosts":"允許的主機","secHostsHelp":"開啟儀表板所用的名稱，以逗號分隔。IP 位址和 localhost 一定可用。寫入 settings.yaml。","secHostsEnv":"也來自容器的環境變數：{list}","secAdmin":"管理員密碼","passwordRepeat":"再次輸入密碼","passwordShort":"管理員密碼至少需要 {count} 個字元。","passwordMismatch":"兩次輸入的密碼不一致。","wait":"嘗試次數過多；請等待 {seconds} 秒","wrong":"密碼錯誤","heading":"設定","back":"儀表板","unlockTitle":"開啟設定","unlock":"開啟","wrongCurrent":"目前的密碼不正確。","offline":"儀表板沒有回應。","setupFirst":"還沒有管理員密碼。請先設定：它保護設定、執行動作的按鈕，也可以保護整個頁面。","setupRemote":"還沒有管理員密碼。請從區域網路設定，或在 settings.yaml 中寫入 adminPassword。","secAppearance":"外觀","showTitle":"在頁面上顯示標題","headerStyle":"頁首小工具","headerBoxed":"有外框","headerClean":"無外框","target":"服務連結開啟於","targetBlank":"新分頁","targetSelf":"目前分頁","targetTop":"整個視窗","statusStyle":"狀態標籤","statusText":"文字","statusDot":"圓點","statusBasic":"UP 或 DOWN","secSecurity":"安全","loginRemember":"保持登入","durationHelp":"如 15m、12h 或 7d；0 表示每次都詢問。","currentPassword":"目前密碼","newPassword":"新密碼","changePassword":"變更密碼","setPassword":"設定密碼","passwordChanged":"管理員密碼已變更；其他所有登入都已結束。","passwordEnv":"已在容器環境變數中設定（DASHBOARD_ADMIN_PASSWORD）：請在那裡變更。","secOther":"其他","hideVersion":"在頁尾隱藏版本","disableUpdateCheck":"不檢查新版本","disableIndexing":"要求搜尋引擎不要索引此頁面","save":"儲存","saving":"正在儲存…","saved":"已儲存。","failed":"未儲存：{error}","otherKeys":"settings.yaml 中還有以下項目，保持不變（請在檔案中編輯）：{list}"},
};
// the colour palettes of index.html (tests/settings-page.test.mjs keeps them the same)
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
const LANGUAGE_NAMES = {
  en: 'English', nl: 'Nederlands', fr: 'Français', de: 'Deutsch', es: 'Español', ca: 'Català', he: 'עברית', hr: 'Hrvatski',
  hu: 'Magyar', it: 'Italiano', 'nb-NO': 'Norsk bokmål', pt: 'Português', ru: 'Русский', sv: 'Svenska', vi: 'Tiếng Việt',
  'zh-Hans': '简体中文', 'zh-Hant': '繁體中文',
};
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const MIN_PASSWORD = 8;
const copy = (value) => JSON.parse(JSON.stringify(value));

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

const state = { data: null, values: null, status: '', statusClass: 'muted', pw: { current: '', next: '', repeat: '', message: '', ok: false }, pk: { name: '', message: '', ok: false, busy: false } };

async function api(path, body, headers = {}) {
  const init = body === undefined && !Object.keys(headers).length ? {} : { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'dashboard', ...headers }, body: JSON.stringify(body ?? {}) };
  const res = await fetch(`api/settings${path}`, init);
  return res.json();
}

function applyTheme(v) {
  lang = I18N[v.language] ? v.language : 'en';
  (PALETTES[v.color] ?? PALETTES.slate).split(' ').forEach((c, i) => document.documentElement.style.setProperty(`--t${SHADES[i]}`, c));
  const light = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;
  document.documentElement.dataset.theme = v.theme === 'auto' ? (light ? 'light' : 'dark') : v.theme;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  document.title = t('heading');
  document.getElementById('heading').textContent = t('heading');
  document.getElementById('back').textContent = `← ${t('back')}`;
}

function show(...nodes) {
  const y = window.scrollY ?? 0;
  document.getElementById('panel').replaceChildren(...nodes.flat().filter(Boolean));
  window.scrollTo?.(0, y);
}

// ---------------------------------------------------------------- passkeys (the same in index.html and login.js)
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const toB64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const postJson = (url, body) => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'dashboard' }, body: JSON.stringify(body) }).then((r) => r.json());
const webauthn = () => Boolean(window.isSecureContext && window.PublicKeyCredential && navigator.credentials);
/** Whether a passkey can be used here: a browser with WebAuthn, https, and a passkey for this host. */
async function passkeyAvailable() {
  if (!webauthn()) return false;
  try {
    return (await (await fetch('api/passkey')).json()).available === true;
  } catch {
    return false;
  }
}
/** Asks the browser for a passkey: the server's one-time token, null when the viewer cancels; throws when it is refused. */
async function passkeyToken() {
  const options = await postJson('api/passkey/options', {});
  if (!options.available) throw new Error('no passkey for this address');
  const o = options.publicKey;
  let cred;
  try {
    cred = await navigator.credentials.get({ publicKey: { ...o, challenge: fromB64u(o.challenge), allowCredentials: o.allowCredentials.map((c) => ({ ...c, id: fromB64u(c.id) })) } });
  } catch (err) {
    if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') return null;
    throw err;
  }
  if (!cred) return null;
  const out = await postJson('api/passkey/verify', { id: cred.id, clientDataJSON: toB64u(cred.response.clientDataJSON), authenticatorData: toB64u(cred.response.authenticatorData), signature: toB64u(cred.response.signature) });
  if (!out.ok) throw Object.assign(new Error(out.error), { retryAfter: out.retryAfter });
  return out.token;
}

// ---------------------------------------------------------------- the door
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
  passkeyAvailable().then((ok) => { passkey.hidden = !ok; });
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
  state.data = out;
  state.values = copy(out.values);
  applyTheme(state.values);
  render();
}

// ---------------------------------------------------------------- the form
function field(id, label, input, help = '') {
  return el('label', { for: id }, label, input, help ? el('span', { class: 'hint', text: help }) : null);
}
function select(key, entries) {
  return el('select', { id: key, onchange: (e) => { state.values[key] = e.target.value; if (['language', 'theme'].includes(key)) { applyTheme(state.values); render(); } } },
    ...entries.map(([v, label]) => el('option', { value: v, selected: v === state.values[key], text: label })));
}
function check(key, label) {
  return el('label', { class: 'check', for: key }, el('input', { type: 'checkbox', id: key, checked: state.values[key], onchange: (e) => { state.values[key] = e.target.checked; } }), label);
}
function text(key, attrs = {}) {
  return el('input', { type: 'text', id: key, value: state.values[key], oninput: (e) => { state.values[key] = e.target.value; }, ...attrs });
}

function render() {
  const v = state.values;
  const d = state.data;
  if (d.noPassword) return show(passwordSection());
  const swatches = el('div', { class: 'swatches', role: 'group', 'aria-label': t('colorLabel') }, ...Object.keys(PALETTES).map((name) => {
    const b = el('button', { type: 'button', class: 'swatch', title: name, 'aria-label': name, 'aria-pressed': String(name === v.color), onclick: () => { v.color = name; applyTheme(v); render(); } });
    b.style.background = PALETTES[name].split(' ')[5];
    return b;
  }));
  const choice = (on, title, hint, badge = null) => el('label', { class: 'choice', for: `login-${on ? 'page' : 'actions'}` },
    el('input', { type: 'radio', name: 'login', id: `login-${on ? 'page' : 'actions'}`, checked: v.login === on, onchange: () => { v.login = on; render(); } }),
    el('span', {}, el('strong', { text: title }), badge ? el('span', { class: 'badge', text: badge }) : null, el('br'), el('span', { class: 'hint', text: hint })));
  const envHosts = Array.isArray(d.envHosts) ? d.envHosts.join(', ') : d.envHosts;
  return show(
    el('section', { class: 'panel' },
      el('h2', { text: t('secAppearance') }),
      el('div', { class: 'grid' },
        field('title', t('titleLabel'), text('title', { maxlength: '100' })),
        field('language', t('languageLabel'), select('language', Object.entries(LANGUAGE_NAMES))),
        field('theme', t('themeLabel'), select('theme', [['auto', t('themeAuto')], ['dark', t('themeDark')], ['light', t('themeLight')]]))),
      el('div', {}, el('span', { class: 'muted', text: t('colorLabel') }), swatches),
      el('div', { class: 'grid' },
        field('headerStyle', t('headerStyle'), select('headerStyle', [['boxed', t('headerBoxed')], ['clean', t('headerClean')]])),
        field('target', t('target'), select('target', [['_blank', t('targetBlank')], ['_self', t('targetSelf')], ['_top', t('targetTop')]])),
        field('statusStyle', t('statusStyle'), select('statusStyle', [['', t('statusText')], ['dot', t('statusDot')], ['basic', t('statusBasic')]]))),
      check('showTitle', t('showTitle'))),
    el('section', { class: 'panel' },
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
      field('allowedHosts', t('secHosts'), el('input', { type: 'text', id: 'allowedHosts', value: v.allowedHosts.join(', '), spellcheck: 'false', placeholder: 'dash.lan, dash.example.com',
        oninput: (e) => { v.allowedHosts = e.target.value.split(/[\s,]+/).filter(Boolean); } }), t('secHostsHelp')),
      envHosts ? el('p', { class: 'muted', text: t('secHostsEnv', { list: envHosts }) }) : null),
    passwordSection(),
    passkeySection(),
    el('section', { class: 'panel' },
      el('h2', { text: t('secOther') }),
      check('hideVersion', t('hideVersion')),
      check('disableUpdateCheck', t('disableUpdateCheck')),
      check('disableIndexing', t('disableIndexing')),
      d.other.length ? el('p', { class: 'muted', text: t('otherKeys', { list: d.other.join(', ') }) }) : null),
    el('div', { class: 'saved' },
      el('span', { class: state.statusClass, role: 'status', text: state.status }),
      el('button', { type: 'button', class: 'primary', text: t('save'), onclick: save })),
  );
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

// ---------------------------------------------------------------- the admin password
function passwordSection() {
  const d = state.data;
  const pw = state.pw;
  const input = (id, key, label, autocomplete) => field(id, label, el('input', { type: 'password', id, value: pw[key], autocomplete, oninput: (e) => { pw[key] = e.target.value; } }));
  if (d.envPassword) return el('section', { class: 'panel' }, el('h2', { text: t('secAdmin') }), el('p', { class: 'muted', text: t('passwordEnv') }));
  return el('section', { class: 'panel' },
    el('h2', { text: t('secAdmin') }),
    d.noPassword ? el('p', { class: 'warn', text: t('setupFirst') }) : null,
    el('form', { onsubmit: async (e) => {
      e.preventDefault();
      pw.ok = false;
      if (pw.next.length < MIN_PASSWORD) pw.message = t('passwordShort', { count: MIN_PASSWORD });
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
      ? el('div', {}, ...pk.list.map((p) => el('div', { class: 'item passkey' },
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

window.HD_SETTINGS = { I18N, PALETTES, state };
load();
