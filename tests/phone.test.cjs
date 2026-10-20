const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const moduleSource = fs.readFileSync(path.join(__dirname, '../src/utils/phone.ts'), 'utf8');
const compiled = ts.transpileModule(moduleSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const result = { exports: {} };
vm.runInNewContext(compiled, { module: result, exports: result.exports });
const normalize = result.exports.normalizeContactPhone;
test('UAE mobile and landline numbers normalize across Arabic and Latin input', () => {
  for (const input of ['0501234567', '٠٥٠١٢٣٤٥٦٧', '۰۵۰۱۲۳۴۵۶۷', '+971 50 123 4567', '00971501234567', '971501234567']) assert.equal(normalize(input), '+971501234567');
  assert.equal(normalize('04 123 4567'), '+97141234567');
});
test('international contacts remain supported and invalid input is rejected', () => {
  assert.equal(normalize('+44 20 7946 0958'), '+442079460958');
  for (const input of ['', 'abcdefghi', '123', '+9710501234567', '+97150123', '++971501234567', '+971501234567 ext 1']) assert.equal(normalize(input), null);
});
