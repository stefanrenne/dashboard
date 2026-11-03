// A service's `filter:` expression (src/filter.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFilter, bindFilter, evalFilter, filterRefs } from '../src/filter.js';

const run = (text, widgets, results) => {
  const { tree, errors } = bindFilter(parseFilter(text), widgets);
  assert.deepEqual(errors, []);
  return evalFilter(tree, (i, attr) => results[i]?.[attr]);
};
const shelly = [{ type: 'shelly', attributes: { update: { type: 'boolean' }, version: { type: 'string' } } }];

test('parseFilter: the user\'s example and the three path forms', () => {
  assert.deepEqual(parseFilter('widget.update == false'), { op: '==', a: { ref: { widget: { merged: true }, attr: 'update' } }, b: { lit: false } });
  assert.deepEqual(filterRefs(parseFilter('widgets[1].count > 2 || widgets.custom-api.ok')), [
    { widget: { index: 1 }, attr: 'count' },
    { widget: { type: 'custom-api' }, attr: 'ok' },
  ]);
});

test('parseFilter: && binds tighter than ||, ! tighter than both, parentheses win', () => {
  assert.deepEqual(parseFilter('true || false && false'), { op: '||', a: { lit: true }, b: { op: '&&', a: { lit: false }, b: { lit: false } } });
  assert.deepEqual(parseFilter('!(true || false)'), { op: '!', a: { op: '||', a: { lit: true }, b: { lit: false } } });
  assert.deepEqual(parseFilter("widget.version != 'v1' && widget.n >= -1.5"), {
    op: '&&',
    a: { op: '!=', a: { ref: { widget: { merged: true }, attr: 'version' } }, b: { lit: 'v1' } },
    b: { op: '>=', a: { ref: { widget: { merged: true }, attr: 'n' } }, b: { lit: -1.5 } },
  });
});

test('parseFilter: mistakes give a message that says where', () => {
  assert.throws(() => parseFilter('widget.update false'), /expected an operator at "false"/);
  assert.throws(() => parseFilter('update == false'), /"update" is not a value: use widget\.<attribute>/);
  assert.throws(() => parseFilter('widget.update =='), /the expression ends too early/);
  assert.throws(() => parseFilter('(widget.update'), /expected "\)" at the end/);
  assert.throws(() => parseFilter("widget.v == 'x"), /not closed/);
  assert.throws(() => parseFilter('widget.a = 1'), /unexpected "=" at position 10/);
  assert.throws(() => parseFilter(''), /expected an expression/);
  assert.throws(() => parseFilter(true), /expected an expression/);
});

test('bindFilter: widget.<attr> reads every widget that declares it; types and positions name one', () => {
  const widgets = [{ type: 'button', attributes: undefined }, ...shelly, { type: 'custom-api', attributes: { update: { type: 'boolean' } } }];
  const bound = bindFilter(parseFilter('widgets.shelly.update && widget.update && widgets[0].x'), widgets);
  assert.deepEqual(filterRefs(bound.tree), [{ indexes: [1], attr: 'update' }, { indexes: [1, 2], attr: 'update' }, { indexes: [0], attr: 'x' }]);
  assert.deepEqual(bound.errors, []);
  assert.deepEqual(bindFilter(parseFilter('widgets.radarr.x || widgets[3].y'), widgets.slice(0, 2)).errors, [
    'no "radarr" widget on this service',
    'the service has no widget 3 (it has 2, counted from 0)',
  ]);
  assert.deepEqual(bindFilter(parseFilter('widget.x'), []).errors, ['the service has no widget to read attributes from']);
});

test('bindFilter: an attribute no widget declares is a warning, and every widget is read', () => {
  const both = [...shelly, { type: 'ping', attributes: {} }];
  const bound = bindFilter(parseFilter('widget.updates'), both);
  assert.deepEqual(bound.warnings, ['no widget on this service publishes "updates" (they publish update, version)']);
  assert.deepEqual(filterRefs(bound.tree), [{ indexes: [0, 1], attr: 'updates' }]);
  assert.deepEqual(bindFilter(parseFilter('widgets.shelly.updates'), shelly).warnings, ['shelly has no attribute "updates" (it has update, version)']);
  assert.deepEqual(bindFilter(parseFilter('widget.x'), [{ type: 'ping', attributes: {} }]).warnings, ['no widget on this service publishes "x" (they publish none)']);
});

test('container.<attr>: the service\'s container: status check, after its widgets', () => {
  const docker = [{ kind: 'container', type: 'docker', attributes: { status: { type: 'string' }, attention: { type: 'boolean' } } }];
  assert.deepEqual(parseFilter('container.attention'), { ref: { status: 'container', attr: 'attention' } });
  const bound = bindFilter(parseFilter('container.attention'), shelly, [{ kind: 'ping', type: 'ping', attributes: {} }, ...docker]);
  assert.deepEqual([bound.tree, bound.errors, bound.warnings], [{ ref: { indexes: [2], attr: 'attention' } }, [], []], 'widgets first, then the checks');
  assert.deepEqual(filterRefs(bindFilter(parseFilter('widget.attention'), shelly, docker).tree), [{ indexes: [0], attr: 'attention' }], 'widget.<attr> leaves the checks out');
  assert.deepEqual(bindFilter(parseFilter('container.attention'), shelly).errors, ['the service has no container: to read "attention" from']);
  assert.deepEqual(bindFilter(parseFilter('container.nope'), [], docker).warnings, ['container: has no attribute "nope" (it has status, attention)']);
  const hidden = (text, attrs) => {
    const { tree, errors } = bindFilter(parseFilter(text), [], docker);
    assert.deepEqual(errors, []);
    return evalFilter(tree, (i, attr) => [attrs][i]?.[attr]);
  };
  // hidden while all is well
  assert.equal(hidden('container.attention == false', { attention: false }), true);
  assert.equal(hidden('container.attention == false', { attention: true }), false, 'shown while unhealthy or stopped');
  assert.equal(hidden('container.attention == false', {}), false, 'shown before it is known');
  // a bare attribute is true while its value is
  assert.equal(hidden('container.attention', { attention: true }), true);
  assert.equal(hidden('!container.attention', { attention: false }), true);
});

test('ping.<attr> and siteMonitor.<attr>: the service\'s ping: and siteMonitor: checks', () => {
  const status = { status: { type: 'string' }, latency: { type: 'number' } };
  const checks = [{ kind: 'siteMonitor', type: 'http-status', attributes: { ...status, code: { type: 'number' } } }, { kind: 'ping', type: 'ping', attributes: status }];
  assert.deepEqual(parseFilter("ping.status == 'down'"), { op: '==', a: { ref: { status: 'ping', attr: 'status' } }, b: { lit: 'down' } });
  const bound = bindFilter(parseFilter("ping.status == 'down' || siteMonitor.code >= 500"), shelly, checks);
  assert.deepEqual([filterRefs(bound.tree), bound.errors], [[{ indexes: [2], attr: 'status' }, { indexes: [1], attr: 'code' }], []]);
  assert.deepEqual(bindFilter(parseFilter("ping.status == 'down'"), shelly, [checks[0]]).errors, ['the service has no ping: to read "status" from']);
  const offline = (status) => evalFilter(bindFilter(parseFilter("ping.status == 'down'"), [], [checks[1]]).tree, () => status);
  assert.deepEqual([offline('down'), offline('up')], [true, false], 'hidden while it does not answer');
  assert.throws(() => parseFilter('app.status'), /container\.<attribute>, ping\.<attribute> or siteMonitor\.<attribute>/);
});

test('evalFilter: merged attributes, the first widget in card order that has one counts', () => {
  const two = [{ type: 'shelly', attributes: { update: { type: 'boolean' } } }, { type: 'other', attributes: { update: { type: 'boolean' }, count: { type: 'number' } } }];
  assert.equal(run('widget.count > 2', two, [{ update: false }, { count: 3 }]), true, 'from the second widget');
  assert.equal(run('widget.update', two, [{ update: false }, { update: true }]), false, 'the first one wins');
  assert.equal(run('widget.update', two, [{}, { update: true }]), true, 'a widget without it is skipped');
  assert.equal(run('widget.update == null', two, [{}, {}]), true);
});

test('evalFilter: strict comparisons, missing is null, numbers only for < and >', () => {
  assert.equal(run('widget.update == false', shelly, [{ update: false }]), true);
  assert.equal(run('widget.update == false', shelly, [{ update: true }]), false);
  assert.equal(run('widget.update == false', shelly, [{}]), false, 'missing is null, not false');
  assert.equal(run('widget.update == null', shelly, [{}]), true);
  assert.equal(run('!widget.update', shelly, [{ update: false }]), true);
  assert.equal(run("widget.version == '1.4.2'", shelly, [{ version: '1.4.2' }]), true);
  assert.equal(run('widget.n > 2', shelly, [{ n: 3 }]), true);
  assert.equal(run('widget.n > 2', shelly, [{ n: '3' }]), false, 'a string is not a number');
  assert.equal(run('widget.n <= 2 || widget.update', shelly, [{ n: 5, update: true }]), true);
});
