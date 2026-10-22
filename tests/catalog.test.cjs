const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function service(api) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/catalog.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL, require: name => { if (name === './api') return api; throw Error(name); } });
  return module.exports;
}
test('catalog links allow HTTPS and reject credentials and executable URLs', () => {
  const api = service({});
  assert.equal(api.safeCatalogUrl('https://store.example/products/1'), 'https://store.example/products/1');
  for (const url of [null, '', 'javascript:alert(1)', 'http://store.example/1', 'https://u:p@store.example/', 'file:///x', 'bad']) assert.equal(api.safeCatalogUrl(url), null);
});
test('catalog search and pagination pass abort signals without constructing arbitrary URLs', async () => {
  const controller = new AbortController();
  const api = service({ get: async (url, options) => {
    assert.equal(url, '/catalog/products'); assert.equal(options.signal, controller.signal);
    assert.equal(options.params.q, 'shoe & bag'); assert.equal(options.params.page, 2);
    return { data: { data: [{ id: 1 }], current_page: 2, last_page: 2 } };
  } });
  assert.equal((await api.getCatalog('shoe & bag', 2, controller.signal)).data[0].id, 1);
});
test('integration listing propagates entitlement errors instead of faking empty results', async () => {
  const error = new Error('Forbidden');
  await assert.rejects(service({ get: async () => { throw error; } }).getCatalogConnections(), value => value === error);
});
test('synchronization only requests a server job and does not send any credentials in payloads', async () => {
  let called = false;
  await service({ post: async (url, body) => { called = true; assert.equal(url, '/merchant/integrations/12/sync'); assert.equal(body, undefined); } }).syncCatalogConnection(12);
  assert.equal(called, true);
});
