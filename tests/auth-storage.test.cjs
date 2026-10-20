const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}, browser) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/services', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} };
  const context = { module, exports: module.exports, process: { env: {} }, require: name => {
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
    return mocks[name];
  } };
  if (browser !== undefined) context.window = browser;
  vm.runInNewContext(code, context);
  return module.exports;
}

function browserStorage() {
  const values = new Map();
  return { localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  } };
}

test('web session survives a fresh module/page and is removed by logout', async () => {
  const browser = browserStorage();
  const first = load('authStorage.web.ts', {}, browser);
  assert.equal(await first.getAuthToken(), null);
  await first.setAuthToken('test-token');
  const afterRedirect = load('authStorage.web.ts', {}, browser);
  assert.equal(await afterRedirect.getAuthToken(), 'test-token');
  await afterRedirect.removeAuthToken();
  assert.equal(await first.getAuthToken(), null);
});

test('web storage is safe during static rendering without window', async () => {
  const storage = load('authStorage.web.ts');
  assert.equal(await storage.getAuthToken(), null);
  await storage.removeAuthToken();
  await assert.rejects(storage.setAuthToken('token'), /AUTH_STORAGE_UNAVAILABLE/);
});

test('blocked browser storage produces an explicit sign-in error', async () => {
  const browser = { get localStorage() { throw new Error('blocked'); } };
  const storage = load('authStorage.web.ts', {}, browser);
  assert.equal(await storage.getAuthToken(), null);
  await assert.rejects(storage.setAuthToken('token'), /AUTH_STORAGE_UNAVAILABLE/);
});

test('native clients continue using SecureStore with the existing key', async () => {
  const calls = [];
  const storage = load('authStorage.ts', { 'expo-secure-store': {
    getItemAsync: async key => { calls.push(key); return 'native-token'; },
    setItemAsync: async (...args) => { calls.push(args); },
    deleteItemAsync: async key => { calls.push(key); },
  } });
  assert.equal(await storage.getAuthToken(), 'native-token');
  await storage.setAuthToken('new-token');
  await storage.removeAuthToken();
  assert.deepEqual(calls, ['deliveryhub_token', ['deliveryhub_token', 'new-token'], 'deliveryhub_token']);
});

test('successful login stores the server token before returning the user', async () => {
  let stored;
  const user = { id: 1, roles: [{ name: 'merchant' }] };
  const auth = load('auth.ts', {
    './api': { post: async (url, body) => { assert.equal(url, '/auth/login'); assert.equal(body.email, 'test@example.test'); return { data: { token: 'server-token', user } }; } },
    './authStorage': { setAuthToken: async token => { stored = token; } },
    './locationTracking': { driverLocationTracking: { stop() {} } },
  });
  assert.equal(await auth.login('test@example.test', 'password'), user);
  assert.equal(stored, 'server-token');
});

test('logout removes browser/native token even if the network fails', async () => {
  let removed = false;
  const auth = load('auth.ts', {
    './api': { post: async () => { throw new Error('offline'); } },
    './authStorage': { removeAuthToken: async () => { removed = true; } },
    './locationTracking': { driverLocationTracking: { stop() {} } },
  });
  await assert.rejects(auth.logout(), /offline/);
  assert.equal(removed, true);
});

test('API interceptor sends the stored browser session as a bearer token', async () => {
  let interceptor;
  const client = { interceptors: { request: { use: handler => { interceptor = handler; } } } };
  load('api.ts', {
    axios: { create: () => client },
    'react-native': { Platform: { OS: 'web' } },
    './authStorage': { getAuthToken: async () => 'web-token' },
  });
  const request = await interceptor({ headers: {} });
  assert.equal(request.headers.Authorization, 'Bearer web-token');
});
