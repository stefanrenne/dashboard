// The page texts in their languages. English and Dutch are written with every change; the others
// fall back to English and are filled in a pass of their own:
//
//   npm run i18n -- missing              what each page still misses, per language
//   npm run i18n -- export > todo.json   those texts with their English, to translate
//   npm run i18n -- apply todo.json      the translated file back into the pages
//
// The translator fills each value of todo.json in its language, keeping {placeholders} and
// names such as settings.yaml, DASHBOARD_VAR_* or confirm: as they are.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const FILES = ['public/index.html', 'public/common.js', 'public/setup.js', 'public/login.js', 'public/settings.js'];

const block = (src) => /const (?:SHARED_)?I18N = (\{[\s\S]*?\n\});/.exec(src);

export function readI18n(file) {
  const m = block(fs.readFileSync(path.join(ROOT, file), 'utf8'));
  if (!m) throw new Error(`${file}: no const I18N or SHARED_I18N`);
  return new Function(`return ${m[1]}`)();
}

export function missing() {
  const out = {};
  for (const file of FILES) {
    const I = readI18n(file);
    for (const [lang, dict] of Object.entries(I)) {
      if (lang === 'en') continue;
      const lacks = Object.fromEntries(Object.entries(I.en).filter(([k]) => !(k in dict)));
      if (Object.keys(lacks).length) (out[file] ??= {})[lang] = lacks;
    }
  }
  return out;
}

const quote = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/**
 * Adds translations to a page file, leaving each language's layout as it is: a language on one
 * line (`  fr: {"a": "…"},`, or its head line with the texts on the next) gets them in that line;
 * one written over several lines gets a line before its closing brace.
 */
export function apply(file, langs) {
  const full = path.join(ROOT, file);
  const lines = fs.readFileSync(full, 'utf8').split('\n');
  const known = readI18n(file);
  for (const [lang, add] of Object.entries(langs)) {
    const fresh = Object.fromEntries(Object.entries(add).filter(([k, v]) => k in known.en && typeof v === 'string' && v !== ''));
    if (!Object.keys(fresh).length) continue;
    const head = new RegExp(`^  (?:${lang}|'${lang}'): \\{`);
    const at = lines.findIndex((l) => head.test(l));
    if (at < 0) throw new Error(`${file}: no language ${lang}`);
    if (/\},?\s*$/.test(lines[at]) && lines[at].includes('{"')) {
      const [, pre, json] = /^(.*?: )(\{.*\}),?\s*$/.exec(lines[at]);
      lines[at] = `${pre}${JSON.stringify({ ...JSON.parse(json), ...fresh })},`;
    } else if (/^\s*"/.test(lines[at + 1] ?? '') && /^ {2}\},?$/.test(lines[at + 2] ?? '')) {
      const pairs = Object.entries(fresh).map(([k, v]) => `${JSON.stringify(k)}: ${JSON.stringify(v)}`).join(', ');
      lines[at + 1] = `${lines[at + 1].replace(/,?\s*$/, '')}, ${pairs}`;
    } else {
      const end = lines.findIndex((l, i) => i > at && /^ {2}\},?$/.test(l));
      lines.splice(end, 0, `    ${Object.entries(fresh).map(([k, v]) => `${k}: ${quote(v)}`).join(', ')},`);
    }
  }
  fs.writeFileSync(full, lines.join('\n'));
  const after = readI18n(file);
  for (const [lang, add] of Object.entries(langs)) for (const k of Object.keys(add)) if (k in known.en && !(k in after[lang])) throw new Error(`${file}: ${lang}.${k} not added`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command, arg] = process.argv.slice(2);
  if (command === 'missing') {
    const out = missing();
    if (!Object.keys(out).length) console.log('Every text is in every language.');
    for (const [file, langs] of Object.entries(out)) {
      console.log(`${file}: ${Object.entries(langs).map(([l, d]) => `${l} ${Object.keys(d).length}`).join(', ')}`);
    }
  } else if (command === 'export') {
    console.log(JSON.stringify(missing(), null, 2));
  } else if (command === 'apply' && arg) {
    const todo = JSON.parse(fs.readFileSync(arg, 'utf8'));
    for (const [file, langs] of Object.entries(todo)) apply(file, langs);
    console.log(`applied: ${Object.keys(todo).join(', ')}`);
  } else {
    console.error('usage: node scripts/i18n.mjs missing | export | apply <file.json>');
    process.exit(1);
  }
}
