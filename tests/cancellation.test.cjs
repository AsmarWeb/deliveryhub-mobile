const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function service(api) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/deliveries.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, { module, exports: module.exports, require: name => { if (name === './api') return api; throw new Error(name); } });
  return module.exports;
}
test('cancellation sends the reason to the dedicated endpoint and returns the server state', async () => {
  const api = { post: async (url, data) => { assert.equal(url, '/deliveries/12/cancel'); assert.equal(data.reason, 'Customer request'); return { data: { data: { id: 12, status: 'cancelled' } } }; } };
  assert.equal((await service(api).cancelDelivery(12, '  Customer request  ')).status, 'cancelled');
});
test('invalid cancellation input never reaches the server and assigned tasks hide cancellation', async () => {
  let calls = 0;
  const s = service({ post: async () => { calls++; } });
  for (const id of [0, -1, NaN, 1.5]) await assert.rejects(s.cancelDelivery(id, 'Valid reason'));
  for (const reason of ['', '  ', 'ab', 'x'.repeat(501)]) await assert.rejects(s.cancelDelivery(12, reason));
  assert.equal(calls, 0);
  assert.equal(s.canCancelDelivery({ status: 'matching' }), true);
  for (const status of ['assigned', 'accepted', 'pickup', 'completed', 'cancelled']) assert.equal(s.canCancelDelivery({ status }), false);
});
