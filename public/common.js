// What the dashboard's pages share (index.html, login, setup and settings): the colour palettes,
// the element helper, translating, the page's language, colour and appearance, and passkeys.
// A plain script loaded before each page's own: its top-level names are the pages' too.
'use strict';

// each colour's shades 50 … 950 (Tailwind's), set as the --t50 … --t950 tokens of theme.css
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
const LANGUAGE_NAMES = {
  en: 'English', nl: 'Nederlands', fr: 'Français', de: 'Deutsch', es: 'Español', ca: 'Català', he: 'עברית', hr: 'Hrvatski',
  hu: 'Magyar', it: 'Italiano', 'nb-NO': 'Norsk bokmål', pt: 'Português', ru: 'Русский', sv: 'Svenska', vi: 'Tiếng Việt',
  'zh-Hans': '简体中文', 'zh-Hant': '繁體中文',
};
const RTL_LANGUAGES = ['he'];

// the texts the setup wizard and the settings page both use; a page's own I18N goes first
const SHARED_I18N = {
  en: {"wait":"Too many tries; wait {seconds} s","titleLabel":"Title","languageLabel":"Language","themeLabel":"Theme","themeAuto":"Follow the system","themeDark":"Dark","themeLight":"Light","colorLabel":"Colour","secHosts":"Allowed hosts","secAdmin":"Admin password","passwordRepeat":"Repeat the password","passwordShort":"The admin password needs at least {count} characters.","passwordMismatch":"The two passwords are not the same.","safer":"safer"},
  nl: {"wait":"Te veel pogingen; wacht {seconds} s","titleLabel":"Titel","languageLabel":"Taal","themeLabel":"Thema","themeAuto":"Systeem volgen","themeDark":"Donker","themeLight":"Licht","colorLabel":"Kleur","secHosts":"Toegestane hosts","secAdmin":"Admin wachtwoord","passwordRepeat":"Herhaal het wachtwoord","passwordShort":"Het admin wachtwoord moet minstens {count} tekens hebben.","passwordMismatch":"De twee wachtwoorden zijn niet gelijk.","safer":"veiliger"},
  fr: {"wait":"Trop d’essais ; attendez {seconds} s","titleLabel":"Titre","languageLabel":"Langue","themeLabel":"Thème","themeAuto":"Suivre le système","themeDark":"Sombre","themeLight":"Clair","colorLabel":"Couleur","secHosts":"Hôtes autorisés","secAdmin":"Mot de passe administrateur","passwordRepeat":"Répétez le mot de passe","passwordShort":"Le mot de passe administrateur doit compter au moins {count} caractères.","passwordMismatch":"Les deux mots de passe ne sont pas identiques.","safer":"plus sûr"},
  de: {"wait":"Zu viele Versuche; warte {seconds} s","titleLabel":"Titel","languageLabel":"Sprache","themeLabel":"Design","themeAuto":"System folgen","themeDark":"Dunkel","themeLight":"Hell","colorLabel":"Farbe","secHosts":"Erlaubte Hosts","secAdmin":"Admin-Passwort","passwordRepeat":"Passwort wiederholen","passwordShort":"Das Admin-Passwort braucht mindestens {count} Zeichen.","passwordMismatch":"Die beiden Passwörter sind nicht gleich.","safer":"sicherer"},
  es: {"wait":"Demasiados intentos; espera {seconds} s","titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir al sistema","themeDark":"Oscuro","themeLight":"Claro","colorLabel":"Color","secHosts":"Hosts permitidos","secAdmin":"Contraseña de administrador","passwordRepeat":"Repite la contraseña","passwordShort":"La contraseña de administrador necesita al menos {count} caracteres.","passwordMismatch":"Las dos contraseñas no coinciden.","safer":"más seguro"},
  ca: {"wait":"Massa intents; espera {seconds} s","titleLabel":"Títol","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Segueix el sistema","themeDark":"Fosc","themeLight":"Clar","colorLabel":"Color","secHosts":"Amfitrions permesos","secAdmin":"Contrasenya d’administrador","passwordRepeat":"Repeteix la contrasenya","passwordShort":"La contrasenya d’administrador necessita com a mínim {count} caràcters.","passwordMismatch":"Les dues contrasenyes no coincideixen.","safer":"més segur"},
  he: {"wait":"יותר מדי ניסיונות; יש להמתין {seconds} שנ׳","titleLabel":"כותרת","languageLabel":"שפה","themeLabel":"ערכת נושא","themeAuto":"לפי המערכת","themeDark":"כהה","themeLight":"בהיר","colorLabel":"צבע","secHosts":"מארחים מורשים","secAdmin":"סיסמת מנהל","passwordRepeat":"חזרה על הסיסמה","passwordShort":"סיסמת המנהל צריכה לפחות {count} תווים.","passwordMismatch":"שתי הסיסמאות אינן זהות.","safer":"בטוח יותר"},
  hr: {"wait":"Previše pokušaja; pričekaj {seconds} s","titleLabel":"Naslov","languageLabel":"Jezik","themeLabel":"Tema","themeAuto":"Prati sustav","themeDark":"Tamna","themeLight":"Svijetla","colorLabel":"Boja","secHosts":"Dopušteni hostovi","secAdmin":"Administratorska lozinka","passwordRepeat":"Ponovi lozinku","passwordShort":"Administratorska lozinka treba barem {count} znakova.","passwordMismatch":"Dvije lozinke nisu iste.","safer":"sigurnije"},
  hu: {"wait":"Túl sok próbálkozás; várj {seconds} mp-et","titleLabel":"Cím","languageLabel":"Nyelv","themeLabel":"Téma","themeAuto":"Rendszer szerint","themeDark":"Sötét","themeLight":"Világos","colorLabel":"Szín","secHosts":"Engedélyezett hostok","secAdmin":"Adminjelszó","passwordRepeat":"Jelszó ismét","passwordShort":"Az adminjelszónak legalább {count} karakter kell.","passwordMismatch":"A két jelszó nem egyezik.","safer":"biztonságosabb"},
  it: {"wait":"Troppi tentativi; attendi {seconds} s","titleLabel":"Titolo","languageLabel":"Lingua","themeLabel":"Tema","themeAuto":"Segui il sistema","themeDark":"Scuro","themeLight":"Chiaro","colorLabel":"Colore","secHosts":"Host consentiti","secAdmin":"Password di amministratore","passwordRepeat":"Ripeti la password","passwordShort":"La password di amministratore richiede almeno {count} caratteri.","passwordMismatch":"Le due password non coincidono.","safer":"più sicuro"},
  'nb-NO': {"wait":"For mange forsøk; vent {seconds} s","titleLabel":"Tittel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Følg systemet","themeDark":"Mørkt","themeLight":"Lyst","colorLabel":"Farge","secHosts":"Tillatte verter","secAdmin":"Adminpassord","passwordRepeat":"Gjenta passordet","passwordShort":"Adminpassordet må ha minst {count} tegn.","passwordMismatch":"De to passordene er ikke like.","safer":"tryggere"},
  pt: {"wait":"Demasiadas tentativas; aguarde {seconds} s","titleLabel":"Título","languageLabel":"Idioma","themeLabel":"Tema","themeAuto":"Seguir o sistema","themeDark":"Escuro","themeLight":"Claro","colorLabel":"Cor","secHosts":"Hosts permitidos","secAdmin":"Palavra-passe de administrador","passwordRepeat":"Repita a palavra-passe","passwordShort":"A palavra-passe de administrador precisa de pelo menos {count} caracteres.","passwordMismatch":"As duas palavras-passe não são iguais.","safer":"mais seguro"},
  ru: {"wait":"Слишком много попыток; подождите {seconds} с","titleLabel":"Заголовок","languageLabel":"Язык","themeLabel":"Тема","themeAuto":"Как в системе","themeDark":"Тёмная","themeLight":"Светлая","colorLabel":"Цвет","secHosts":"Разрешённые хосты","secAdmin":"Пароль администратора","passwordRepeat":"Повторите пароль","passwordShort":"Пароль администратора должен быть не короче {count} символов.","passwordMismatch":"Пароли не совпадают.","safer":"безопаснее"},
  sv: {"wait":"För många försök; vänta {seconds} s","titleLabel":"Titel","languageLabel":"Språk","themeLabel":"Tema","themeAuto":"Följ systemet","themeDark":"Mörkt","themeLight":"Ljust","colorLabel":"Färg","secHosts":"Tillåtna värdar","secAdmin":"Adminlösenord","passwordRepeat":"Upprepa lösenordet","passwordShort":"Adminlösenordet behöver minst {count} tecken.","passwordMismatch":"De två lösenorden är inte lika.","safer":"säkrare"},
  vi: {"wait":"Quá nhiều lần thử; chờ {seconds} giây","titleLabel":"Tiêu đề","languageLabel":"Ngôn ngữ","themeLabel":"Chủ đề","themeAuto":"Theo hệ thống","themeDark":"Tối","themeLight":"Sáng","colorLabel":"Màu","secHosts":"Máy chủ được phép","secAdmin":"Mật khẩu quản trị","passwordRepeat":"Nhập lại mật khẩu","passwordShort":"Mật khẩu quản trị cần ít nhất {count} ký tự.","passwordMismatch":"Hai mật khẩu không giống nhau.","safer":"an toàn hơn"},
  'zh-Hans': {"wait":"尝试次数过多；请等待 {seconds} 秒","titleLabel":"标题","languageLabel":"语言","themeLabel":"主题","themeAuto":"跟随系统","themeDark":"深色","themeLight":"浅色","colorLabel":"颜色","secHosts":"允许的主机","secAdmin":"管理员密码","passwordRepeat":"再次输入密码","passwordShort":"管理员密码至少需要 {count} 个字符。","passwordMismatch":"两次输入的密码不一致。","safer":"更安全"},
  'zh-Hant': {"wait":"嘗試次數過多；請等待 {seconds} 秒","titleLabel":"標題","languageLabel":"語言","themeLabel":"主題","themeAuto":"跟隨系統","themeDark":"深色","themeLight":"淺色","colorLabel":"顏色","secHosts":"允許的主機","secAdmin":"管理員密碼","passwordRepeat":"再次輸入密碼","passwordShort":"管理員密碼至少需要 {count} 個字元。","passwordMismatch":"兩次輸入的密碼不一致。","safer":"較安全"},
};

/** An element: attrs (class, text, on<event>, true for a bare attribute), then children (arrays flattened). */
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

function translator(I18N, currentLang) {
  const text = (dict, key) => (dict[currentLang()] ?? {})[key] ?? dict.en[key];
  return (key, vars = {}) => String(text(I18N, key) ?? text(SHARED_I18N, key) ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
}

function applyLanguage(language, I18N) {
  const lang = I18N[language] ? language : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL_LANGUAGES.includes(lang) ? 'rtl' : 'ltr';
  return lang;
}

function applyPalette(color) {
  const shades = (PALETTES[color] ?? PALETTES.slate).split(' ');
  SHADES.forEach((s, i) => document.documentElement.style.setProperty(`--t${s}`, shades[i]));
  return shades;
}

const systemLight = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;

function applyAppearance(theme) {
  const resolved = theme === 'light' || theme === 'dark' ? theme : systemLight() ? 'light' : 'dark';
  document.documentElement.dataset.theme = resolved;
  return resolved;
}

// ---------------------------------------------------------------- requests
/**
 * A POST to the dashboard: `body` as JSON (none: an empty one), with the header the server asks
 * on every write (a page of another site cannot send it). The Response.
 */
const post = (url, body, headers = {}) => fetch(url, {
  method: 'POST',
  headers: { 'x-requested-with': 'dashboard', ...(body === undefined ? {} : { 'content-type': 'application/json' }), ...headers },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});
const postJson = (url, body, headers) => post(url, body, headers).then((r) => r.json());

// ---------------------------------------------------------------- passkeys
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const toB64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
