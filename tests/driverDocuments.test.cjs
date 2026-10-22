const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, dependencies = {}) {
 const module = { exports: {} };
 const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
 vm.runInNewContext(code, { module, exports: module.exports, Date, FormData, require: name => { if (name in dependencies) return dependencies[name]; throw Error(name); } });
 return module.exports;
}
test('document upload filters unsafe formats, oversized files and PDF profile photos', () => {
 const s = load('utils/driverDocuments.ts');
 assert.equal(s.documentFileError('image/jpeg', 100), null);
 assert.equal(s.documentFileError('application/pdf', 100), null);
 assert.equal(s.documentFileError('application/pdf', 100, true), 'type');
 for(const mime of ['image/svg+xml','text/html','application/x-php','image/heic']) assert.equal(s.documentFileError(mime, 10), 'type');
 assert.equal(s.documentFileError('image/png', 5242881), 'size');
 assert.equal(s.documentFileError('image/png', 0), 'size');
});
test('expiry validation rejects invalid calendar dates, past dates and non-ISO formats', () => {
 const s = load('utils/driverDocuments.ts'); const now = new Date(2026, 9, 22);
 for(const date of ['2026-10-22','2028-02-29','2027-01-01']) assert.equal(s.validDocumentExpiry(date, now), true);
 for(const date of ['2026-10-21','2027-02-29','2028-13-01','22/10/2028','2028-02-30','']) assert.equal(s.validDocumentExpiry(date, now), false);
});
test('upload preserves multipart binary data, expiry and server validation failures', async () => {
 const file = new File(['binary-test-content'], 'document.pdf', { type: 'application/pdf' });
 const s = load('services/driverDocuments.ts', { 'react-native': { Platform: { OS: 'web' } }, './api': { post: async (url, body, config) => {
  assert.equal(url, '/driver/documents'); assert.equal(body.get('file').name, file.name);
  assert.equal(await body.get('file').text(), 'binary-test-content'); assert.equal(body.get('expires_on'), '2028-12-31');
  assert.equal(config.headers['Content-Type'], undefined); return { data: { data: [{ status: 'pending' }] } };
 } } });
 assert.equal((await s.uploadDriverDocument('driving_license', { file, name: file.name, uri: 'blob:test', mime: file.type }, '2028-12-31'))[0].status, 'pending');
 const error = new Error('validation');
 const failing = load('services/driverDocuments.ts', { 'react-native': { Platform: { OS: 'web' } }, './api': { post: async () => { throw error; } } });
 await assert.rejects(failing.uploadDriverDocument('portrait', { file, name: file.name }, ''), value => value === error);
});
test('driver document notifications open documents and use the selected language', () => {
 const s = load('services/notifications.ts', { './api': {} });
 const item = { data: { type: 'driver_document', title_ar: 'تم قبول مستندك', title_en: 'Document approved', status: 'approved' } };
 assert.equal(s.notificationMessage(item, 'driver', 'en'), 'Document approved');
 assert.equal(s.notificationMessage(item, 'driver', 'ar'), 'تم قبول مستندك');
 assert.equal(s.notificationTarget(item, 'driver').pathname, '/documents');
 assert.equal(s.notificationTarget(item, 'merchant'), null);
});
