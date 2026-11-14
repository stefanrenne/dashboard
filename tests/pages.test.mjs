// The documentation site: staging (scripts/pages.sh), the widget pages (scripts/pages-widgets.mjs)
// and the examples behind the widget images (scripts/widget-images.mjs; the pictures themselves
// need Playwright and are not taken here).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { attributeRows, displayFields, movedLinks, optionRows, widgetPage, withFieldsInExample, writeWidgetPages } from '../scripts/pages-widgets.mjs';
import { exampleEntry, showsData, splitFiles, widgetHashes, useCache } from '../scripts/widget-images.mjs';
import { tmpDir, COLLECTION_DIR } from './helpers.mjs';

test('optionRows: type, required, default, secret and the line comment', () => {
  const rows = optionRows(`id: x
options:
  url: { type: url, required: true }      # e.g. http://x:1
  key: { type: string, secret: true }
  mode: { type: enum, values: [a, b], default: a }
`);
  assert.deepEqual(rows, [
    { name: 'url', type: 'url', required: true, default: undefined, secret: false, description: 'E.g. http://x:1' },
    { name: 'key', type: 'string', required: false, default: undefined, secret: true, description: '' },
    { name: 'mode', type: 'a / b', required: false, default: 'a', secret: false, description: '' },
  ]);
});

test('widgetPage: info line, options table before the example', () => {
  const page = widgetPage(path.join(COLLECTION_DIR, 'widgets/docker'), { kind: 'collection', tag: 'v9.9.9' });
  assert.match(page.markdown, /^# Docker container\n\n`type: docker` · version \d+\.\d+\.\d+/);
  const options = page.markdown.indexOf('## Configuration options');
  assert.ok(options > page.markdown.indexOf('## Display fields') && options < page.markdown.indexOf('## Example'));
  assert.ok(!/^## (Fields|Options)$/m.test(page.markdown), 'the README\'s headings are renamed for the page');
  assert.match(page.markdown, /\| `container` \| string \| yes \|/);
  assert.match(widgetPage(path.join(COLLECTION_DIR, 'widgets/custom-api'), { kind: 'collection', tag: 'v9.9.9' }).markdown, /`type: custom-api` \(or `customapi`\) · version/, 'aliases are named');
  assert.equal(page.kind, 'service');
  assert.equal(widgetPage(path.join(COLLECTION_DIR, 'widgets/datetime'), { kind: 'collection', tag: 'v9.9.9' }).kind, 'header', 'a widgets.yaml example makes a header widget');
});

test('attributeRows and the Attributes table, after the options; option comments stay their own', () => {
  const yaml = `id: x
options:
  version: { type: number }               # the API version
attributes:
  update: { type: boolean }               # true while an update waits
  version: { type: string }               # the installed firmware
`;
  assert.deepEqual(attributeRows(yaml), [
    { name: 'update', type: 'boolean', description: 'True while an update waits' },
    { name: 'version', type: 'string', description: 'The installed firmware' },
  ]);
  assert.equal(optionRows(yaml)[0].description, 'The API version', 'a same-named attribute does not take the option\'s comment');
  const dir = tmpDir('hd-attr-page-');
  fs.writeFileSync(path.join(dir, 'widget.yaml'), `name: X\nversion: 1.0.0\napiVersion: 2\n${yaml}`);
  fs.writeFileSync(path.join(dir, 'README.md'), '# X\n\nIntro.\n\n## Example\n\n```yaml\n- x: {}\n```\n');
  const md = widgetPage(dir, { kind: 'collection', tag: 'v1' }).markdown;
  assert.ok(md.indexOf('## Configuration options') < md.indexOf('## Filter attributes') && md.indexOf('## Filter attributes') < md.indexOf('## Example'));
  assert.match(md, /\| `update` \| boolean \| True while an update waits \|/);
  assert.ok(!widgetPage(path.join(COLLECTION_DIR, 'widgets/datetime'), { kind: 'collection', tag: 'v1' }).markdown.includes('## Filter attributes'), 'none, no section');
});

test('widgetPage: one Filter attributes section, with the README\'s own text merged in', () => {
  const dir = tmpDir('hd-merge-');
  fs.writeFileSync(path.join(dir, 'widget.yaml'), 'id: x\nname: X\nversion: 1.0.0\napiVersion: 2\nattributes:\n  update: { type: boolean }   # true while an update waits\n');
  fs.writeFileSync(path.join(dir, 'README.md'), '# X\n\nIntro.\n\n## Fields\n\n`a`, `b`\n\n## Attributes\n\nA note.\n\n## Example\n\n```yaml\n- G:\n    - S:\n        widget:\n          type: x\n```\n');
  const md = widgetPage(dir, { kind: 'collection', tag: 'v1' }).markdown;
  assert.equal(md.match(/^## .*[Aa]ttributes$/gm).length, 1);
  assert.match(md, /## Filter attributes\n\nPublic values[^\n]*\n\nA note\.\n\n\| Attribute/);
  assert.ok(!/0\.\d+\.\d+ or newer/.test(md), 'no dashboard versions on the page');
});

test('display fields: listed on the page and written into the example, unless it has fields:', () => {
  assert.deepEqual(displayFields('## Display fields\n\n`a`, `b` (only sometimes), `a`\n\n## Example\n`c`', {}), ['a', 'b']);
  const service = '## Example\n\n```yaml\n- G:\n    - S:\n        widget:\n          type: x\n          url: http://x.lan\n```\n';
  assert.match(withFieldsInExample(service, ['x'], ['a', 'b']), /          type: x\n          fields: \[a, b\]   # the display fields; leave out for the defaults\n          url:/);
  const header = '## Example\n\n```yaml\n# widgets.yaml\n- x:\n    label: L\n```\n';
  assert.match(withFieldsInExample(header, ['x'], ['a']), /- x:\n    fields: \[a\]/);
  const has = service.replace('url:', 'fields: [b]\n          url:');
  assert.equal(withFieldsInExample(has, ['x'], ['a']), has, 'its own fields: stays');
  assert.equal(withFieldsInExample(service, ['x'], []), service, 'no fields, no line');
});

test('every collection widget page: the example still parses with its fields: line', () => {
  for (const id of fs.readdirSync(path.join(COLLECTION_DIR, 'widgets'))) {
    if (!fs.existsSync(path.join(COLLECTION_DIR, 'widgets', id, 'widget.yaml'))) continue;
    const md = widgetPage(path.join(COLLECTION_DIR, 'widgets', id), { kind: 'collection', tag: 'v1' }).markdown;
    const example = md.slice(Math.max(0, md.search(/^## Example/m)));
    for (const [, block] of example.matchAll(/```ya?ml\n([\s\S]*?)```/g)) {
      for (const part of block.split(/^(?=# [\w.-]+\.ya?ml)/m)) assert.doesNotThrow(() => YAML.parse(part), `${id}: ${part.slice(0, 60)}`);
    }
  }
});

test('widgetPage: the example image right after the info line', () => {
  const page = widgetPage(path.join(COLLECTION_DIR, 'widgets/radarr'), { kind: 'collection', tag: 'v9.9.9' }, 'images/radarr.png');
  assert.match(page.markdown, /\{: \.fs-3 \.text-grey-dk-000 \}\n\n!\[Radarr with example data\]\(images\/radarr\.png\)\n/);
  assert.ok(!widgetPage(path.join(COLLECTION_DIR, 'widgets/radarr'), { kind: 'collection', tag: 'v9.9.9' }).markdown.includes('!['), 'no image, no picture');
});

test('writeWidgetPages: the widgets part, its sections, menu front matter, examples kept literal', () => {
  const site = tmpDir('hd-site-');
  const collection = tmpDir('hd-collection-');
  fs.cpSync(path.resolve('examples/widget-template'), path.join(collection, 'widgets', 'example-counter'), { recursive: true });
  fs.writeFileSync(path.join(collection, 'widgets', 'example-counter', 'README.md'), '# Example counter\n\nIntro, see [Services](../../configuration/services.html).\n\n## Example\n\n```yaml\nkey: "{{DASHBOARD_VAR_KEY}}"\n```\n');

  fs.mkdirSync(path.join(site, 'collection', 'images'), { recursive: true });
  fs.writeFileSync(path.join(site, 'collection', 'images', 'example-counter.png'), '');
  fs.writeFileSync(path.join(site, 'README.md'), '# Widgets\n');
  const n = writeWidgetPages({ site, collectionDir: collection, collectionTag: 'v9.9.9' });
  assert.deepEqual(n, { collection: 1, service: 1, header: 0, images: 1 });

  const page = fs.readFileSync(path.join(site, 'collection/example-counter.md'), 'utf8');
  const [, front, body] = page.split(/^---$/m);
  assert.deepEqual(YAML.parse(front), { title: 'Example counter', parent: 'Service widgets', grand_parent: 'Widgets', permalink: '/collection/example-counter.html' }, 'under /widgets/ once served');
  assert.ok(body.includes('](images/example-counter.png)'));
  assert.match(body, /^\n\{% raw %\}\n/);
  assert.ok(body.includes('"{{DASHBOARD_VAR_KEY}}"'));
  assert.ok(body.includes('**Secret**: stays on the server.'));
  assert.ok(body.includes('tree/v9.9.9/widgets/example-counter'));
  assert.ok(body.includes('see [Services](/configuration/services.html)'), 'the dashboard docs from wherever the part is served');
  assert.ok(!body.includes('](../../'));
  const index = fs.readFileSync(path.join(site, 'collection/index.md'), 'utf8');
  assert.match(index, /^---\ntitle: Service widgets\nparent: Widgets\nnav_order: 1\n/);
  assert.match(index, /\| \[Example counter\]\(\.\.\/collection\/example-counter\.html\) \| `example-counter` \|/);
  assert.match(fs.readFileSync(path.join(site, 'header/index.md'), 'utf8'), /^---\n[\s\S]*permalink: \/header\//);
  const all = fs.readFileSync(path.join(site, 'README.md'), 'utf8');
  assert.match(all, /## Service widgets\n\n[\s\S]*\| \[Example counter\]\(collection\/example-counter\.html\) \|[\s\S]*## Header widgets/, 'the home page lists them all');
});

test('movedLinks: old configuration addresses in a widget README go to the dashboard docs\' pages', () => {
  assert.equal(movedLinks('see [Configuration](../../configuration.html#dockeryaml) and [x](../../configuration.html#widgetsyaml)'),
    'see [Configuration](/configuration/docker.html) and [x](/configuration/header-widgets.html)');
  assert.equal(movedLinks('[v](../../configuration.html#variables)'), '[v](/configuration/#variables)');
  assert.equal(movedLinks('[k](../../discovery.html#kubernetes)'), '[k](/configuration/kubernetes.html#discovery)');
  assert.equal(movedLinks('[e](../../extend/security.html) [s](../collection/x.html)'), '[e](/extend/security.html) [s](../collection/x.html)');
});

test('splitFiles: a README code block with several files', () => {
  assert.deepEqual(splitFiles('# settings.yaml\nproviders:\n  x: y\n\n# widgets.yml\n- stocks: {}\n'), {
    'settings.yaml': '# settings.yaml\nproviders:\n  x: y\n\n',
    'widgets.yaml': '# widgets.yml\n- stocks: {}\n\n',
  });
});

test('exampleEntry: the README example, with url options at the mock and secrets made up', () => {
  const radarr = exampleEntry(path.join(COLLECTION_DIR, 'widgets/radarr'), 'http://127.0.0.1:9');
  assert.equal(radarr.kind, 'service');
  assert.equal(radarr.service.widget.type, 'radarr');
  assert.equal(radarr.service.widget.url, 'http://127.0.0.1:9/radarr');
  assert.ok(!JSON.stringify(radarr).includes('{{'), 'no variables left');
  const datetime = exampleEntry(path.join(COLLECTION_DIR, 'widgets/datetime'), 'http://127.0.0.1:9');
  assert.equal(datetime.kind, 'header');
  assert.deepEqual(Object.keys(datetime.entry), ['datetime']);
  const dir = tmpDir('hd-widget-');
  fs.writeFileSync(path.join(dir, 'widget.yaml'), 'id: x\nname: X\noptions: {}\n');
  assert.equal(exampleEntry(dir, 'http://m'), null, 'no README');
});

test('showsData: only results worth a picture', () => {
  assert.equal(showsData({ ok: true, data: { blocks: [{ label: 'a', value: 1 }] } }), true);
  assert.equal(showsData({ ok: false, error: 'answered 401' }), false);
  assert.equal(showsData({ ok: true, data: { status: 'error', blocks: [] } }), false);
  assert.equal(showsData({ ok: true, data: { blocks: [{ label: 'status', value: 'not found', status: 'error' }] } }), false);
  assert.equal(showsData({ ok: true, data: { blocks: [{ key: 'down', label: 'down', value: 1, status: 'error' }] } }), true, 'a count that needs attention is data');
});

test('pages.sh: links that leave docs/ go to GitHub, from every depth', () => {
  const out = path.join(tmpDir('hd-pages-'), 'site');
  execFileSync('sh', ['scripts/pages.sh', out, 'someone/repo']);
  const local = fs.readFileSync(path.join(out, 'extend/custom-widget/local.md'), 'utf8');
  assert.ok(local.includes('](https://github.com/someone/repo/tree/main/examples/widget-template)'));
  assert.ok(local.includes('](../api-reference.md#clientjs)'), 'links inside docs/ stay');
  const home = fs.readFileSync(path.join(out, 'README.md'), 'utf8');
  assert.ok(home.includes('](https://github.com/someone/repo/tree/main/CHANGELOG.md)'));
  assert.ok(home.includes('<details markdown="1">'));
  assert.match(home, /^---\n---\n\{% raw %\}\n/);
});

test('pages.sh: the dashboard part, latest at the root, develop under /develop/ with its own GitHub links', () => {
  const stage = (env, dir = 'docs') => {
    const out = path.join(tmpDir('hd-pages-'), 'site');
    execFileSync('sh', ['scripts/pages.sh', out, 'someone/repo'], { env: { ...process.env, DOCS_DIR: dir, ...env } });
    return { out, config: YAML.parse(fs.readFileSync(path.join(out, '_config.yml'), 'utf8')), home: fs.readFileSync(path.join(out, 'README.md'), 'utf8') };
  };
  const release = stage({});
  assert.equal(release.config.docs_part, 'dashboard');
  assert.equal(release.config.docs_channel, 'release');
  assert.equal(release.config.baseurl, '', 'the root, whatever the Pages settings of the building repository');
  assert.equal(release.config.url, 'https://getdashboard.dev');
  assert.equal(release.config.gh_edit_branch, 'main');
  assert.equal(fs.readFileSync(path.join(release.out, 'part-widgets.md'), 'utf8'), '---\ntitle: Widgets\nnav_order: 3\npermalink: /part-widgets.html\nredirect_to: https://getdashboard.dev/widgets/\n---\n', 'the widgets in their place in the menu');
  const develop = stage({ DOCS_CHANNEL: 'develop' });
  assert.equal(develop.config.docs_channel, 'develop');
  assert.equal(develop.config.baseurl, '/develop');
  assert.equal(develop.config.gh_edit_branch, 'develop');
  assert.ok(develop.home.includes('](https://github.com/someone/repo/tree/develop/CHANGELOG.md)'));
  assert.ok(develop.config.defaults.length > 10, 'the rest of _config.yml stays');
  assert.throws(() => stage({ DOCS_CHANNEL: 'nightly' }));

  // older docs (main's, before the widgets moved): their widgets folder goes, links to it go to the widgets part
  const old = tmpDir('hd-old-docs-');
  fs.cpSync('docs', old, { recursive: true });
  fs.mkdirSync(path.join(old, 'widgets'));
  fs.writeFileSync(path.join(old, 'widgets', 'README.md'), '# Widgets\n');
  fs.writeFileSync(path.join(old, 'configuration', 'old.md'), '[w](../widgets/README.md) [c](../widgets/catalogue.md) [b](../widgets/collection/button.html)\n');
  fs.appendFileSync(path.join(old, '_config.yml'), '  - { scope: { path: a.md }, values: { title: A, redirect_from: [/widgets/authoring.html, /extend/local.html] } }\n  - { scope: { path: b.md }, values: { title: B, redirect_from: [/widgets/security.html] } }\n');
  const staged = stage({}, old);
  assert.ok(!fs.existsSync(path.join(staged.out, 'widgets')));
  const redirects = staged.config.defaults.slice(-2).map((d) => d.values.redirect_from ?? null);
  assert.deepEqual(redirects, [['/extend/local.html'], null], 'no redirects into the widgets part');
  assert.match(fs.readFileSync(path.join(staged.out, 'configuration', 'old.md'), 'utf8'),
    /\[w\]\(https:\/\/getdashboard\.dev\/widgets\/\) \[c\]\(https:\/\/getdashboard\.dev\/widgets\/catalogue\.html\) \[b\]\(https:\/\/getdashboard\.dev\/widgets\/collection\/button\.html\)/);
});

test('pages.sh: the widgets part, the collection\'s docs with this theme, latest under /widgets/, develop under /widgets/develop/', () => {
  const collection = tmpDir('hd-col-docs-');
  fs.mkdirSync(path.join(collection, 'docs'));
  fs.mkdirSync(path.join(collection, 'widgets'));
  fs.writeFileSync(path.join(collection, 'docs', 'README.md'), '# Widgets\n\nSee [CLAUDE](../CLAUDE.md) and the [Catalogue](catalogue.md).\n');
  fs.writeFileSync(path.join(collection, 'docs', '_config.yml'), 'defaults:\n  - { scope: { path: README.md }, values: { title: Widgets, nav_order: 1, permalink: / } }\n');
  const stage = (env) => {
    const out = path.join(tmpDir('hd-pages-'), 'site');
    execFileSync('sh', ['scripts/pages.sh', out, 'me/widgets', collection, 'v1.0.0'], { env: { ...process.env, DOCS_PART: 'widgets', ...env }, stdio: 'pipe' });
    return { out, config: YAML.parse(fs.readFileSync(path.join(out, '_config.yml'), 'utf8')), home: fs.readFileSync(path.join(out, 'README.md'), 'utf8') };
  };
  const latest = stage({});
  assert.equal(latest.config.docs_part, 'widgets');
  assert.equal(latest.config.baseurl, '/widgets');
  assert.equal(latest.config.remote_theme, YAML.parse(fs.readFileSync('docs/_config.yml', 'utf8')).remote_theme, 'the theme\'s settings from the dashboard');
  assert.equal(latest.config.gh_edit_repository, 'https://github.com/me/widgets');
  assert.deepEqual(latest.config.defaults, [{ scope: { path: 'README.md' }, values: { title: 'Widgets', nav_order: 1, permalink: '/' } }], 'the menu from the collection');
  const front = (name) => YAML.parse(fs.readFileSync(path.join(latest.out, `part-${name}.md`), 'utf8').split('---')[1]);
  assert.deepEqual(['home', 'configuration', 'extend'].map((n) => [front(n).title, front(n).nav_order, front(n).redirect_to]),
    [['Home', 1, 'https://getdashboard.dev/'], ['Configuration', 2, 'https://getdashboard.dev/configuration/'], ['Extend', 4, 'https://getdashboard.dev/extend/']], 'the dashboard\'s sections around the widgets');
  assert.ok(fs.existsSync(path.join(latest.out, '_includes', 'header_custom.html')) && fs.existsSync(path.join(latest.out, 'images', 'logo.svg')));
  assert.ok(latest.home.includes('](https://github.com/me/widgets/tree/main/CLAUDE.md)') && latest.home.includes('](catalogue.md)'));
  assert.match(fs.readFileSync(path.join(latest.out, 'security.html'), 'utf8'), /url=https:\/\/getdashboard\.dev\/extend\/security\.html/, 'an old address under /widgets/');
  const develop = stage({ DOCS_CHANNEL: 'develop' });
  assert.equal(develop.config.baseurl, '/widgets/develop');
  assert.ok(develop.home.includes('/tree/develop/CLAUDE.md'));
});

test('docs: the version menus read the version from the address, so a copy of develop is the release', () => {
  const header = fs.readFileSync('docs/_includes/header_custom.html', 'utf8');
  assert.match(header, /\{%- if site\.docs_channel -%\}/, 'no menu on a site staged without a channel');
  assert.ok(!/site\.docs_channel ==|site\.docs_release|selected/.test(header), 'nothing baked in for one version');
  assert.ok(!/["'(](\/widgets)?\/develop\//.test(header), 'nothing the release copy rewrites');
  assert.ok(!/^\s*\/\/|[;{}]\s*\/\//m.test(header.split('<script>')[1]), 'no line comments: the theme puts the page on one line');
  assert.ok(!fs.readFileSync('docs/_includes/head_custom.html', 'utf8').includes('noindex'), 'robots.txt keeps develop out of search engines');
  // no page links to a develop address: the release copy would point it at the latest one
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
  for (const file of walk('docs').filter((f) => f.endsWith('.md'))) assert.ok(!/getdashboard\.dev\/(widgets\/)?develop/.test(fs.readFileSync(file, 'utf8')), file);
  assert.ok(!fs.existsSync('docs/widgets'), 'the widgets part is the collection\'s');
});

test('pages-promote.sh: the dashboard part, develop at the root; the widgets part stays', () => {
  const site = tmpDir('hd-promote-');
  const write = (p, text) => { fs.mkdirSync(path.dirname(path.join(site, p)), { recursive: true }); fs.writeFileSync(path.join(site, p), text); };
  write('CNAME', 'getdashboard.dev\n');
  write('.nojekyll', '');
  write('robots.txt', 'User-agent: *\nDisallow: /develop/\n');
  write('version.json', '{}');
  write('old.html', 'gone');
  write('widgets/index.html', 'the widgets part');
  write('develop/index.html', '<link rel="canonical" href="https://getdashboard.dev/develop/"><link href="/develop/assets/css/a.css"><a href="/develop/configuration/tabs.html">Tabs</a> <a href="https://github.com/me/dash/edit/develop/docs/README.md">Edit</a> <a href="https://github.com/me/dash/tree/develop/CHANGELOG.md">c</a> <a href="https://getdashboard.dev/widgets/">Widgets</a> <p>run the develop branch of /develop/x</p>');
  write('develop/assets/js/search-data.json', '{"0": {"url": "/develop/configuration/"}}');
  write('develop/assets/js/x.js', "fetch('/develop/assets/js/search-data.json')");
  execFileSync('sh', ['scripts/pages-promote.sh', site, '0.27.0'], { env: { ...process.env, DOCS_REPO: 'me/dash' } });
  const read = (p) => fs.readFileSync(path.join(site, p), 'utf8');
  assert.equal(read('index.html'), '<link rel="canonical" href="https://getdashboard.dev/"><link href="/assets/css/a.css"><a href="/configuration/tabs.html">Tabs</a> <a href="https://github.com/me/dash/edit/main/docs/README.md">Edit</a> <a href="https://github.com/me/dash/tree/main/CHANGELOG.md">c</a> <a href="https://getdashboard.dev/widgets/">Widgets</a> <p>run the develop branch of /develop/x</p>');
  assert.equal(read('assets/js/search-data.json'), '{"0": {"url": "/configuration/"}}');
  assert.equal(read('assets/js/x.js'), "fetch('/assets/js/search-data.json')");
  assert.ok(!fs.existsSync(path.join(site, 'old.html')), 'the old root goes');
  for (const kept of ['CNAME', '.nojekyll', 'robots.txt', 'version.json']) assert.ok(fs.existsSync(path.join(site, kept)), kept);
  assert.equal(read('widgets/index.html'), 'the widgets part', 'another part, another release');
  assert.match(read('develop/index.html'), /href="\/develop\/configuration\/tabs\.html"/, 'develop itself stays as it was');

  // from another build than develop/ (main's docs)
  const other = tmpDir('hd-promote-from-');
  fs.writeFileSync(path.join(other, 'index.html'), '<a href="/develop/x.html">x</a>');
  execFileSync('sh', ['scripts/pages-promote.sh', site, '0.27.0', other]);
  assert.equal(read('index.html'), '<a href="/x.html">x</a>');
  assert.ok(fs.existsSync(path.join(site, 'develop/index.html')));
  assert.throws(() => execFileSync('sh', ['scripts/pages-promote.sh', site, 'v2', tmpDir('hd-empty-')], { stdio: 'pipe' }));
});

test('pages-promote.sh: the widgets part, /widgets/develop/ to /widgets/, named after the collection release', () => {
  const site = tmpDir('hd-promote-w-');
  const write = (p, text) => { fs.mkdirSync(path.dirname(path.join(site, p)), { recursive: true }); fs.writeFileSync(path.join(site, p), text); };
  write('index.html', 'the dashboard part');
  write('develop/index.html', 'its develop');
  write('widgets/old.html', 'gone');
  write('widgets/develop/index.html', '<link rel="canonical" href="https://getdashboard.dev/widgets/develop/"><a href="/widgets/develop/collection/">s</a> From the <a href="https://github.com/stefanrenne/dashboard-widgets">widgets collection</a> develop, always installed. <a href="https://github.com/stefanrenne/dashboard-widgets/edit/develop/docs/README.md">Edit</a> <a href="/configuration/services.html">services</a>');
  write('widgets/develop/collection/sonarr.html', '<a href="https://github.com/stefanrenne/dashboard-widgets">Widget collection</a> develop · <a href="https://github.com/stefanrenne/dashboard-widgets/tree/develop/widgets/sonarr">source</a>');
  write('widgets/develop/assets/js/search-data.json', '{"0": {"url": "/widgets/develop/collection/sonarr.html"}}');
  write('widgets/develop/collection/images/sonarr.png', 'png');
  execFileSync('sh', ['scripts/pages-promote.sh', site, 'v0.18.0'], { env: { ...process.env, DOCS_PART: 'widgets' } });
  const read = (p) => fs.readFileSync(path.join(site, p), 'utf8');
  assert.equal(read('widgets/index.html'), '<link rel="canonical" href="https://getdashboard.dev/widgets/"><a href="/widgets/collection/">s</a> From the <a href="https://github.com/stefanrenne/dashboard-widgets">widgets collection</a> v0.18.0, always installed. <a href="https://github.com/stefanrenne/dashboard-widgets/edit/main/docs/README.md">Edit</a> <a href="/configuration/services.html">services</a>');
  assert.equal(read('widgets/collection/sonarr.html'), '<a href="https://github.com/stefanrenne/dashboard-widgets">Widget collection</a> v0.18.0 · <a href="https://github.com/stefanrenne/dashboard-widgets/tree/v0.18.0/widgets/sonarr">source</a>');
  assert.equal(read('widgets/assets/js/search-data.json'), '{"0": {"url": "/widgets/collection/sonarr.html"}}');
  assert.equal(read('widgets/collection/images/sonarr.png'), 'png');
  assert.ok(!fs.existsSync(path.join(site, 'widgets/old.html')));
  assert.equal(read('index.html'), 'the dashboard part', 'the dashboard part stays');
  assert.equal(read('develop/index.html'), 'its develop');
  assert.match(read('widgets/develop/index.html'), /widgets\/develop\/collection/, 'its develop stays');
});

test('widget images: a hash per widget, the cache used while it matches', () => {
  const collection = tmpDir('hd-hash-col-');
  const widget = (id, text) => { fs.mkdirSync(path.join(collection, 'widgets', id), { recursive: true }); fs.writeFileSync(path.join(collection, 'widgets', id, 'widget.yaml'), text); };
  widget('a', 'id: a\n');
  widget('b', 'id: b\n');
  fs.mkdirSync(path.join(collection, 'widgets', 'not-a-widget'));
  const before = widgetHashes(collection);
  assert.deepEqual(Object.keys(before), ['a', 'b']);
  widget('b', 'id: b\nname: B\n');
  const after = widgetHashes(collection);
  assert.equal(after.a, before.a, 'another widget\'s change leaves a alone');
  assert.notEqual(after.b, before.b);
  fs.mkdirSync(path.join(collection, 'scripts'));
  fs.writeFileSync(path.join(collection, 'scripts/mock-homelab.mjs'), 'x');
  assert.notEqual(widgetHashes(collection).a, after.a, 'the mock draws every widget');

  const hashes = widgetHashes(collection);
  const cache = tmpDir('hd-hash-cache-');
  fs.writeFileSync(path.join(cache, 'a.png'), 'A');
  fs.writeFileSync(path.join(cache, 'a.hash'), `${hashes.a}\n`);
  fs.writeFileSync(path.join(cache, 'b.png'), 'old B');
  fs.writeFileSync(path.join(cache, 'b.hash'), 'stale\n');
  const out = path.join(tmpDir('hd-hash-out-'), 'images');
  assert.deepEqual(useCache(hashes, cache, out), ['b']);
  assert.equal(fs.readFileSync(path.join(out, 'a.png'), 'utf8'), 'A');
  assert.ok(!fs.existsSync(path.join(out, 'b.png')), 'a changed widget does not keep its old image');
  // a widget tried before without an image: its .hash alone, not tried again
  fs.rmSync(path.join(cache, 'a.png'));
  const again = path.join(tmpDir('hd-hash-out-'), 'images');
  assert.deepEqual(useCache(hashes, cache, again), ['b']);
  assert.ok(!fs.existsSync(path.join(again, 'a.png')) && fs.existsSync(path.join(again, 'a.hash')));
  assert.deepEqual(useCache(hashes, null, again).sort(), ['a', 'b'], 'without a cache: all of them');
});

test('docs: every page has an entry in _config.yml, and relative links point at files', () => {
  const config = YAML.parse(fs.readFileSync('docs/_config.yml', 'utf8'));
  const scopes = new Set(config.defaults.map((d) => d.scope.path));
  const pages = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) pages.push(path.relative('docs', p));
    }
  };
  walk('docs');
  for (const page of pages) {
    assert.ok(scopes.has(page), `${page} has no entry under defaults: in docs/_config.yml`);
    const text = fs.readFileSync(path.join('docs', page), 'utf8');
    for (const [, target] of text.matchAll(/\]\(([^)#\s]+\.md)(?:#[^)]*)?\)/g)) {
      if (/^https?:/.test(target)) continue;
      assert.ok(fs.existsSync(path.join('docs', path.dirname(page), target)), `${page} links to ${target}, which is not there`);
    }
  }
});

test('docs: no YAML key with [ ] or \', which the site\'s highlighter (Rouge) marks red, quoted or not', () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) files.push(p);
    }
  };
  walk('docs');
  const bad = [];
  for (const file of files) {
    for (const [, block] of fs.readFileSync(file, 'utf8').matchAll(/```ya?ml\n([\s\S]*?)```/g)) {
      for (const line of block.split('\n')) {
        const key = /^\s*(?:- )?("[^"]*"|'[^']*'|[^"'\s#{[][^:"#]*?)\s*:(?:\s|$)/.exec(line)?.[1];
        if (key && /[[\]']/.test(key.replace(/^'|'$/g, ''))) bad.push(`${file}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(bad, [], 'labels as a list (- dashboard.widgets[0].type=emby), or ’ for an apostrophe');
});

test('docs: no \\| inside `code` in a table, which the site shows with its backslash', () => {
  const bad = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md')) {
        for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
          if (line.startsWith('|') && /`[^`]*\\\|[^`]*`/.test(line)) bad.push(`${p}: ${line.slice(0, 80)}`);
        }
      }
    }
  };
  walk('docs');
  assert.deepEqual(bad, [], 'write "a or b", or move it out of the table');
});

