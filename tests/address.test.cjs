const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/utils/address.ts'), 'utf8');
const result = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { module: result, exports: result.exports });
const { normalizeMakani, formatAddress } = result.exports;
test('Makani normalization preserves leading zeros and handles Arabic digits and spaces', () => {
  assert.equal(normalizeMakani('٠١٢٣٤ ٥٦٧٨٩'), '0123456789');
  assert.equal(normalizeMakani('۰۱۲۳۴ ۵۶۷۸۹'), '0123456789');
  assert.equal(normalizeMakani('abc123'), 'abc123');
});
test('driver address includes the building, unit, landmark and Makani', () => {
  const address = { address_line: 'Business Bay', building: 'Bay Tower', unit: '1204', city: 'Dubai', emirate: 'dubai', landmark: 'Metro', makani_number: '0123456789' };
  const text = formatAddress(address);
  for (const part of ['Bay Tower', 'Unit 1204', 'Near Metro', 'Makani 0123456789']) assert.ok(text.includes(part));
  assert.equal(text.match(/Dubai/g).length, 1);
  assert.match(formatAddress(address, true), /الوحدة 1204/);
});
test('legacy addresses do not need newly added fields', () => {
  assert.equal(formatAddress({ address_line: 'Old address', city: 'Dubai' }), 'Old address, Dubai');
  assert.equal(formatAddress({}), '');
});
test('driver navigation prefers a valid map pin and falls back for legacy addresses', () => {
  const { addressDestination } = result.exports;
  assert.equal(addressDestination({ latitude: '25.1850000', longitude: '55.2750000', city: 'Dubai' }), '25.185,55.275');
  for (const pair of [{latitude: null, longitude: null}, {latitude: 91, longitude: 55}, {latitude: '', longitude: '55'}]) {
    assert.equal(addressDestination({ ...pair, address_line: 'Business Bay', city: 'Dubai', makani_number: '0123456789' }), 'Business Bay, Dubai');
  }
});
