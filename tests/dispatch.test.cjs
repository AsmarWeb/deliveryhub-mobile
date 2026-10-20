const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function service({ available = true, enabled = true, location = {}, state = { currentState: 'active' }, api = {} } = {}) {
  const calls = [];
  const module = { exports: {} };
  const native = { getForegroundPermissionsAsync: async () => ({ status: 'granted' }), requestForegroundPermissionsAsync: async () => ({ status: 'granted' }), getCurrentPositionAsync: async () => ({ coords: { latitude: 25.2, longitude: 55.27, accuracy: 10 }, timestamp: Date.now() }), Accuracy: { Balanced: 3 }, ...location };
  const client = { get: async () => ({ data: { data: { is_available: available, dispatch_enabled: enabled } } }), post: async (url, data) => { calls.push({ url, data }); }, ...api };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/autoDispatch.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, { module, exports: module.exports, setTimeout, clearTimeout, require: name => {
    if (name === './api') return client;
    if (name === 'expo-location') return native;
    if (name === 'react-native') return { AppState: state };
    throw new Error(name);
  } });
  return { ...module.exports, calls };
}
test('presence sends only dispatch coordinates after availability and opt-in', async () => {
  const s = service();
  await s.syncDispatchPresence(new AbortController().signal);
  assert.equal(s.calls.length, 1);
  assert.equal(s.calls[0].url, '/driver/dispatch-presence');
  assert.equal(s.calls[0].data.latitude, 25.2);
  assert.equal(s.calls[0].data.enabled, undefined);
  assert.equal(s.calls[0].data.delivery_id, undefined);
});
test('offline or opted-out drivers do not request GPS or send presence', async () => {
  for (const options of [{ available: false }, { enabled: false }]) {
    const s = service({ ...options, location: { getForegroundPermissionsAsync: () => { throw new Error('GPS must not run'); } } });
    await s.syncDispatchPresence(new AbortController().signal);
    assert.equal(s.calls.length, 0);
  }
});
test('stopping during permission acquisition prevents late GPS and uploads', async () => {
  const controller = new AbortController();
  const s = service({ location: { requestForegroundPermissionsAsync: async () => { controller.abort(); return { status: 'granted' }; }, getCurrentPositionAsync: () => { throw new Error('Late GPS must not run'); } } });
  await s.syncDispatchPresence(controller.signal, true);
  assert.equal(s.calls.length, 0);
});
test('background transition and old GPS fixes never publish dispatch locations', async () => {
  const state = { currentState: 'active' };
  const s = service({ state, location: { getCurrentPositionAsync: async () => { state.currentState = 'background'; return { coords: { latitude: 25, longitude: 55, accuracy: 10 }, timestamp: Date.now() }; } } });
  await s.syncDispatchPresence(new AbortController().signal);
  assert.equal(s.calls.length, 0);
  const old = service({ location: { getCurrentPositionAsync: async () => ({ coords: { latitude: 25, longitude: 55, accuracy: 10 }, timestamp: Date.now() - 180000 }) } });
  await assert.rejects(old.syncDispatchPresence(new AbortController().signal));
  assert.equal(old.calls.length, 0);
});
test('denied location cannot enable dispatch and disabling sends no coordinates', async () => {
  const s = service({ location: { requestForegroundPermissionsAsync: async () => ({ status: 'denied' }) } });
  await assert.rejects(s.syncDispatchPresence(new AbortController().signal, true));
  assert.equal(s.calls.length, 0);
  await s.disableDispatch();
  assert.equal(s.calls[0].data.enabled, false);
  assert.equal(s.calls[0].data.latitude, undefined);
});
