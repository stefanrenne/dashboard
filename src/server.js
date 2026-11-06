#!/usr/bin/env node
// Entry point: `node src/server.js [--config <dir>] [--port <n>] [--host <addr>]`.
// Environment: DASHBOARD_CONFIG_DIR, PORT, HOST, LOG_TARGETS (both, stdout or file; see src/log.js),
// DASHBOARD_WATCH_POLL, DASHBOARD_WIDGET_ISOLATION and DASHBOARD_WIDGET_MEMORY_MB (see src/app.js).

import http from 'node:http';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { createApp, VERSION } from './app.js';
import { createLogger } from './log.js';

const { values } = parseArgs({
  options: {
    config: { type: 'string', default: process.env.DASHBOARD_CONFIG_DIR ?? '/config' },
    port: { type: 'string', default: process.env.PORT ?? '3000' },
    host: { type: 'string', default: process.env.HOST ?? '0.0.0.0' },
  },
});

const configDir = path.resolve(values.config);
const log = createLogger(); // stdout, and a file when settings.yaml has logpath

const app = await createApp({ configDir, log, watch: true });
// the last line of defence: a request that fails is answered and logged, never ends the process
const server = http.createServer((req, res) => {
  app.handler(req, res).catch((err) => {
    log.error(`${req.method} ${String(req.url).slice(0, 200)}: ${err.stack ?? err}`);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal error' }));
  });
});
// explicit limits for slow clients: the whole request (headers and a body of at most 1 MB) in
// 30 s, its headers in 20 s; an open event stream is a response and not affected
server.headersTimeout = 20_000;
server.requestTimeout = 30_000;
server.maxConnections = 2000;
server.listen(Number(values.port), values.host, () => {
  log.info(`dashboard ${VERSION} on http://${values.host}:${values.port} (config: ${configDir})`);
  // a first install: where the wizard is, and the code it asks from outside the local network
  const shown = ['0.0.0.0', '::'].includes(values.host) ? '<this server>' : values.host;
  app.onboarding.announce(`http://${shown}:${values.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    app.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 2000).unref();
  });
}
