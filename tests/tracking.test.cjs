const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Load the real TypeScript services with only native/network boundaries mocked.
function load(file, mocks) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/services', file), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true,
  }}).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports, Date, AbortController, console,
    require: name => {
      if (!(name in mocks)) throw new Error(`Unexpected dependency: ${name}`);
      return mocks[name];
    },
  }, { filename: file });
  return module.exports;
}

const position = () => ({ coords: { latitude: 25.2, longitude: 55.3, accuracy: 10 }, timestamp: Date.now() });
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture({ patch = async () => {}, permission, watch } = {}) {
  const calls = [];
  let callback;
  let onState;
  let removed = 0;
  let watched = 0;
  const location = {
    Accuracy: { Balanced: 3 },
    requestForegroundPermissionsAsync: permission ?? (async () => ({ status: 'granted' })),
    hasServicesEnabledAsync: async () => true,
    getCurrentPositionAsync: async () => position(),
    watchPositionAsync: async (options, update) => {
      watched++;
      callback = update;
      return watch ? watch() : { remove: () => { removed++; } };
    },
  };
  const AppState = {
    currentState: 'active',
    addEventListener: (event, handler) => { onState = handler; return { remove() {} }; },
  };
  const api = { patch: (...args) => { calls.push(args); return patch(...args); } };
  const { driverLocationTracking: tracker } = load('locationTracking.ts', {
    './api': api, 'expo-location': location, 'react-native': { AppState },
  });
  return { tracker, calls, update: p => callback(p), background: () => onState('background'),
    removed: () => removed, watched: () => watched };
}

test('first upload failure still starts watching and retries the next position', async () => {
  let attempts = 0;
  const f = fixture({ patch: async () => { if (++attempts === 1) throw new Error('offline'); } });
  await f.tracker.start(42);
  assert.equal(f.tracker.getSnapshot().status, 'tracking');
  assert.equal(f.watched(), 1);
  f.update(position());
  await flush();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1][0], '/driver/location');
  assert.equal(f.calls[1][1].delivery_id, 42);
  assert.ok(f.tracker.getSnapshot().lastSentAt);
  f.tracker.stop();
});

test('server authorization rejection stops tracking instead of retrying', async () => {
  const f = fixture({ patch: async () => { throw { response: { status: 403 } }; } });
  await f.tracker.start(42);
  assert.equal(f.tracker.getSnapshot().status, 'error');
  assert.equal(f.watched(), 0);
});

test('stopping during permission request cannot create a late GPS watcher', async () => {
  let grant;
  const f = fixture({ permission: () => new Promise(resolve => { grant = resolve; }) });
  const starting = f.tracker.start(42);
  f.tracker.stop();
  grant({ status: 'granted' });
  await starting;
  assert.equal(f.tracker.getSnapshot().status, 'stopped');
  assert.equal(f.watched(), 0);
  assert.equal(f.calls.length, 0);
});

test('a watcher created after stop is removed immediately', async () => {
  let resolveWatch;
  let removed = 0;
  const f = fixture({ watch: () => new Promise(resolve => { resolveWatch = resolve; }) });
  const starting = f.tracker.start(42);
  await flush();
  f.tracker.stop();
  resolveWatch({ remove() { removed++; } });
  await starting;
  assert.equal(removed, 1);
  assert.equal(f.tracker.getSnapshot().status, 'stopped');
});

test('background transition removes watcher and ignores late coordinates', async () => {
  const f = fixture();
  await f.tracker.start(42);
  f.background();
  f.update(position());
  await flush();
  assert.equal(f.removed(), 1);
  assert.equal(f.calls.length, 1);
  assert.equal(f.tracker.getSnapshot().status, 'stopped');
});

test('invalid delivery IDs never request GPS or send coordinates', async () => {
  const f = fixture();
  await assert.rejects(f.tracker.start(0), /Invalid delivery ID/);
  assert.equal(f.calls.length, 0);
  assert.equal(f.watched(), 0);
});

test('location sync sends delivery ID and prevents rapid duplicate uploads', async () => {
  const calls = [];
  const { syncDriverLocation } = load('driverLocationSync.ts', { './api': {
    patch: async (...args) => { calls.push(args); },
  }});
  const coordinates = { latitude: 25.2, longitude: 55.3, accuracy: 10, timestamp: Date.now() };
  assert.equal(await syncDriverLocation(coordinates, '/driver/location', 42), true);
  assert.equal(await syncDriverLocation(coordinates, '/driver/location', 42), false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], '/driver/location');
  assert.equal(calls[0][1].delivery_id, 42);
});

test('invalid coordinates and unsafe endpoints cannot send location', async () => {
  let sent = 0;
  const { syncDriverLocation } = load('driverLocationSync.ts', { './api': { patch: async () => { sent++; } } });
  const coordinates = { latitude: 91, longitude: 55, accuracy: 10, timestamp: Date.now() };
  assert.equal(await syncDriverLocation(coordinates, '/driver/location', 42), false);
  await assert.rejects(syncDriverLocation(coordinates, '//other.example/location', 42));
  await assert.rejects(syncDriverLocation(coordinates, '/driver/location', 0));
  assert.equal(sent, 0);
});

test('manual location update includes the selected active delivery', async () => {
  let body;
  const { updateCurrentDriverLocation } = load('location.ts', {
    './api': { patch: async (url, data) => { body = data; return { data: {} }; } },
    'expo-location': {
      Accuracy: { Balanced: 3 },
      getForegroundPermissionsAsync: async () => ({ status: 'granted' }),
      getCurrentPositionAsync: async () => position(),
    },
  });
  await updateCurrentDriverLocation(42);
  assert.equal(body.delivery_id, 42);
  assert.equal(body.latitude, 25.2);
});
