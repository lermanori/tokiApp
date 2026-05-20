const http = require('http');
const https = require('https');
const detoxGlobalSetup = require('detox/runners/jest/globalSetup');

const probeFeatureFlags = () =>
  new Promise((resolve) => {
    const apiRoot =
      process.env.TOKI_TEST_API_URL ||
      process.env.EXPO_PUBLIC_API_URL ||
      'http://127.0.0.1:3002';
    const url = `${apiRoot}/api/features`;
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve({});
      return;
    }
    const transport = parsed.protocol === 'https:' ? https : http;
    const req = transport.request(
      {
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname,
        method: 'GET',
        headers: { Accept: 'application/json' },
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          try {
            const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            resolve(body && typeof body === 'object' ? body : {});
          } catch {
            resolve({});
          }
        });
      }
    );
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({});
    });
    req.on('error', () => resolve({}));
    req.end();
  });

module.exports = async function globalSetup(globalConfig, projectConfig) {
  await detoxGlobalSetup(globalConfig, projectConfig);

  const flags = await probeFeatureFlags();
  process.env.TOKI_E2E_BOOSTS_ENABLED = flags.boosts === true ? '1' : '0';
  console.log(
    `[e2e globalSetup] boosts feature flag: ${process.env.TOKI_E2E_BOOSTS_ENABLED === '1' ? 'ON' : 'OFF'}`
  );
};
