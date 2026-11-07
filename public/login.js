// The login page of settings.yaml `login` (src/login.js): the admin password opens the dashboard.
// The form has a username, so password managers and the browser's keychain fill it in. Over
// https, with a passkey made for this host in the settings, a passkey logs in too: the page asks
// for it at once.
'use strict';

const I18N = {
  en: { heading: 'Log in', label: 'Admin password', submit: 'Log in', wrong: 'Wrong password', wait: 'Too many tries; wait {seconds} s', broken: 'The admin password cannot be checked: it is not a scrypt hash. See the dashboard\'s log.', passkey: 'Log in with a passkey', passkeyFailed: 'The passkey did not work: {error}' },
  nl: { heading: 'Inloggen', label: 'Admin wachtwoord', submit: 'Inloggen', wrong: 'Onjuist wachtwoord', wait: 'Te veel pogingen; wacht {seconds} s', broken: 'Het admin wachtwoord kan niet worden gecontroleerd: het is geen scrypt-hash. Zie de log van het dashboard.', passkey: 'Inloggen met een passkey', passkeyFailed: 'De passkey werkte niet: {error}' },
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
let lang = 'en';
const t = translator(I18N, () => lang);
const $ = (id) => document.getElementById(id);

function look(info) {
  lang = applyLanguage(info.language, I18N);
  applyPalette(info.color);
  applyAppearance(info.theme);
  document.title = t('heading');
  $('heading').textContent = t('heading');
  $('label').textContent = t('label');
  $('submit').textContent = t('submit');
  $('passkey').textContent = t('passkey');
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
  $('passkey').hidden = !(await passkeyAvailable());
  $('passkey').addEventListener('click', async () => {
    $('passkey').disabled = true;
    $('error').textContent = '';
    try {
      const token = await passkeyToken();
      if (token) {
        const out = await postJson('api/login', { passkeyToken: token });
        if (out.ok) {
          window.location.href = './';
          return;
        }
        $('error').textContent = t('passkeyFailed', { error: out.error });
      }
    } catch (err) {
      $('error').textContent = err.retryAfter ? t('wait', { seconds: err.retryAfter }) : t('passkeyFailed', { error: err.message });
    }
    $('passkey').disabled = false;
  });
  if (!$('passkey').hidden && !info.broken) $('passkey').click();
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

window.HD_LOGIN = { I18N };
init();
