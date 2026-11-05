// The login page of settings.yaml `login` (src/login.js): the admin password opens the dashboard.
// The form has a username, so password managers and the browser's keychain fill it in.
'use strict';

const I18N = {
  en: { heading: 'Log in', label: 'Admin password', submit: 'Log in', wrong: 'Wrong password', wait: 'Too many tries; wait {seconds} s', broken: 'The admin password cannot be checked: it is not a scrypt hash. See the dashboard\'s log.' },
  nl: { heading: 'Inloggen', label: 'Admin wachtwoord', submit: 'Inloggen', wrong: 'Onjuist wachtwoord', wait: 'Te veel pogingen; wacht {seconds} s', broken: 'Het admin wachtwoord kan niet worden gecontroleerd: het is geen scrypt-hash. Zie de log van het dashboard.' },
  fr: { heading: 'Connexion', label: 'Mot de passe administrateur', submit: 'Se connecter', wrong: 'Mot de passe incorrect', wait: 'Trop d’essais ; attendez {seconds} s', broken: 'Le mot de passe administrateur ne peut pas être vérifié : ce n’est pas un hachage scrypt. Voir le journal du tableau de bord.' },
  de: { heading: 'Anmelden', label: 'Admin-Passwort', submit: 'Anmelden', wrong: 'Falsches Passwort', wait: 'Zu viele Versuche; warte {seconds} s', broken: 'Das Admin-Passwort kann nicht geprüft werden: Es ist kein scrypt-Hash. Siehe das Log des Dashboards.' },
  es: { heading: 'Iniciar sesión', label: 'Contraseña de administrador', submit: 'Entrar', wrong: 'Contraseña incorrecta', wait: 'Demasiados intentos; espera {seconds} s', broken: 'No se puede comprobar la contraseña de administrador: no es un hash scrypt. Consulta el registro del panel.' },
  ca: { heading: 'Inicia la sessió', label: 'Contrasenya d’administrador', submit: 'Entra', wrong: 'Contrasenya incorrecta', wait: 'Massa intents; espera {seconds} s', broken: 'No es pot comprovar la contrasenya d’administrador: no és un hash scrypt. Consulta el registre del tauler.' },
  he: { heading: 'כניסה', label: 'סיסמת מנהל', submit: 'כניסה', wrong: 'סיסמה שגויה', wait: 'יותר מדי ניסיונות; יש להמתין {seconds} שנ׳', broken: 'לא ניתן לבדוק את סיסמת המנהל: היא אינה hash של scrypt. ראו את היומן של לוח המחוונים.' },
  hr: { heading: 'Prijava', label: 'Administratorska lozinka', submit: 'Prijavi se', wrong: 'Pogrešna lozinka', wait: 'Previše pokušaja; pričekaj {seconds} s', broken: 'Administratorsku lozinku nije moguće provjeriti: nije scrypt hash. Pogledaj zapisnik ploče.' },
  hu: { heading: 'Bejelentkezés', label: 'Adminjelszó', submit: 'Bejelentkezés', wrong: 'Hibás jelszó', wait: 'Túl sok próbálkozás; várj {seconds} mp-et', broken: 'Az adminjelszó nem ellenőrizhető: nem scrypt-hash. Nézd meg az irányítópult naplóját.' },
  it: { heading: 'Accedi', label: 'Password di amministratore', submit: 'Accedi', wrong: 'Password errata', wait: 'Troppi tentativi; attendi {seconds} s', broken: 'Impossibile verificare la password di amministratore: non è un hash scrypt. Vedi il log della dashboard.' },
  'nb-NO': { heading: 'Logg inn', label: 'Adminpassord', submit: 'Logg inn', wrong: 'Feil passord', wait: 'For mange forsøk; vent {seconds} s', broken: 'Adminpassordet kan ikke kontrolleres: det er ikke en scrypt-hash. Se dashbordets logg.' },
  pt: { heading: 'Iniciar sessão', label: 'Palavra-passe de administrador', submit: 'Entrar', wrong: 'Palavra-passe incorreta', wait: 'Demasiadas tentativas; aguarde {seconds} s', broken: 'Não é possível verificar a palavra-passe de administrador: não é um hash scrypt. Veja o registo do painel.' },
  ru: { heading: 'Вход', label: 'Пароль администратора', submit: 'Войти', wrong: 'Неверный пароль', wait: 'Слишком много попыток; подождите {seconds} с', broken: 'Пароль администратора нельзя проверить: это не хеш scrypt. См. журнал панели.' },
  sv: { heading: 'Logga in', label: 'Adminlösenord', submit: 'Logga in', wrong: 'Fel lösenord', wait: 'För många försök; vänta {seconds} s', broken: 'Adminlösenordet kan inte kontrolleras: det är ingen scrypt-hash. Se instrumentpanelens logg.' },
  vi: { heading: 'Đăng nhập', label: 'Mật khẩu quản trị', submit: 'Đăng nhập', wrong: 'Sai mật khẩu', wait: 'Quá nhiều lần thử; chờ {seconds} giây', broken: 'Không kiểm tra được mật khẩu quản trị: đó không phải hash scrypt. Xem nhật ký của bảng điều khiển.' },
  'zh-Hans': { heading: '登录', label: '管理员密码', submit: '登录', wrong: '密码错误', wait: '尝试次数过多；请等待 {seconds} 秒', broken: '无法校验管理员密码：它不是 scrypt 哈希。请查看仪表板日志。' },
  'zh-Hant': { heading: '登入', label: '管理員密碼', submit: '登入', wrong: '密碼錯誤', wait: '嘗試次數過多；請等待 {seconds} 秒', broken: '無法驗證管理員密碼：它不是 scrypt 雜湊。請查看儀表板記錄。' },
};
// the colour palettes' 50 … 950 shades, as in index.html (tests/login-page.test.mjs keeps them the same)
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

let lang = 'en';
const t = (key, vars = {}) => String((I18N[lang] ?? {})[key] ?? I18N.en[key]).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
const $ = (id) => document.getElementById(id);

function look(info) {
  lang = I18N[info.language] ? info.language : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  (PALETTES[info.color] ?? PALETTES.slate).split(' ').forEach((c, i) => document.documentElement.style.setProperty(`--t${SHADES[i]}`, c));
  const light = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: light)').matches;
  document.documentElement.dataset.theme = info.theme === 'auto' || !info.theme ? (light ? 'light' : 'dark') : info.theme;
  document.title = t('heading');
  $('heading').textContent = t('heading');
  $('label').textContent = t('label');
  $('submit').textContent = t('submit');
}

async function init() {
  let info = {};
  try {
    info = await (await fetch('api/login')).json();
  } catch {
    // the defaults
  }
  if (info.loggedIn || info.login === false) {
    window.location.href = './';
    return;
  }
  look(info);
  if (info.broken) $('error').textContent = t('broken');
  $('login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = $('password').value;
    if (!password) return;
    $('submit').disabled = true;
    let out;
    try {
      out = await (await fetch('api/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-requested-with': 'dashboard' }, body: JSON.stringify({ password }) })).json();
    } catch {
      out = { ok: false };
    }
    $('submit').disabled = false;
    if (out.ok) {
      window.location.href = './';
      return;
    }
    $('error').textContent = out.retryAfter ? t('wait', { seconds: out.retryAfter }) : t('wrong');
    $('password').select();
  });
}

window.HD_LOGIN = { I18N, PALETTES };
init();
