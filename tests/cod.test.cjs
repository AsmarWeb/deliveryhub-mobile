const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const result = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/utils/cod.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: result, exports: result.exports });
const normalize = result.exports.normalizeCodAmount;
test('COD input uses exact decimal strings, including Arabic digits', () => {
  assert.equal(normalize('١٢٥٫٥٠'), '125.50');
  assert.equal(normalize('۱۲۵,۵'), '125.50');
  assert.equal(normalize('00025.5'), '25.50');
  assert.equal(normalize('0.01'), '0.01');
  assert.equal(normalize(''), '0.00');
  assert.equal(normalize('9999999999.99'), '9999999999.99');
});
test('invalid, negative, excessive precision and ambiguous grouped amounts are rejected', () => {
  for (const input of ['-1', '1.001', '1,000', '1e2', '10000000000', 'abc', '1 000', '12.']) assert.equal(normalize(input), null);
});
