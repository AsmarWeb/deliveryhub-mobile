const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function billing(api) {
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, '../src/services/billing.ts'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, URL,
    require: name => { if (name === './api') return api; throw new Error(name); },
  });
  return module.exports;
}

test('checkout accepts only a Stripe-hosted HTTPS URL', async () => {
  const service = billing({ post: async () => ({ data: { checkout_url: 'https://checkout.stripe.com/c/pay/test' } }) });
  assert.equal(await service.createBillingCheckout('growth'), 'https://checkout.stripe.com/c/pay/test');
  for (const url of ['http://checkout.stripe.com/c/pay/test', 'https://checkout.stripe.com.evil.test/path', 'https://checkout.stripe.com@evil.test/', 'https://user@checkout.stripe.com/path', 'https://checkout.stripe.com:444/path']) {
    const invalid = billing({ post: async () => ({ data: { checkout_url: url } }) });
    await assert.rejects(invalid.createBillingCheckout('growth'), /Invalid Stripe/);
  }
});

test('portal uses server URL and rejects non-Stripe destinations', async () => {
  const api = { post: async url => { assert.equal(url, '/merchant/billing/portal'); return { data: { portal_url: 'https://billing.stripe.com/p/session/test' } }; } };
  assert.equal(await billing(api).openBillingPortal(), 'https://billing.stripe.com/p/session/test');
  await assert.rejects(billing({ post: async () => ({ data: { portal_url: 'https://evil.test/' } }) }).openBillingPortal());
});

test('local active status alone cannot grant app access', () => {
  const service = billing({});
  assert.equal(service.hasPaidAccess({ status: 'active', has_access: false }), false);
  assert.equal(service.hasPaidAccess({ status: 'active' }), false);
  assert.equal(service.hasPaidAccess({ has_access: true }), true);
});

test('existing subscribers manage plans; fully expired cancellations can subscribe again', () => {
  const service = billing({});
  assert.equal(service.shouldManageSubscription({ provider: 'stripe', stripe_status: 'active', has_access: true }), true);
  assert.equal(service.shouldManageSubscription({ provider: 'stripe', stripe_status: 'past_due', has_access: false }), true);
  assert.equal(service.shouldManageSubscription({ provider: 'stripe', stripe_status: 'canceled', has_access: true }), true);
  assert.equal(service.shouldManageSubscription({ provider: 'stripe', stripe_status: 'canceled', has_access: false }), false);
  assert.equal(service.shouldManageSubscription({ provider: 'manual', has_access: true }), false);
});

test('subscription requests pass abort signals for safe screen cleanup', async () => {
  const controller = new AbortController();
  const service = billing({ get: async (url, options) => {
    assert.equal(options.signal, controller.signal);
    assert.equal(url, '/merchant/billing/current');
    return { data: { data: null } };
  } });
  assert.equal(await service.getCurrentSubscription(controller.signal), null);
});

test('billing failures give actionable messages without disclosing provider details', () => {
  const service = billing({});
  assert.match(service.billingErrorMessage({ response: { status: 409, data: { message: 'sk_test_private' } } }, false), /already have a subscription/);
  assert.match(service.billingErrorMessage({ response: { status: 429 } }, false), /Wait/);
  assert.match(service.billingErrorMessage({ response: { status: 503 } }, true), /غير متاحة/);
  for (const error of [null, undefined, new Error('sk_test_private'), { response: { status: 500 } }]) {
    assert.doesNotMatch(service.billingErrorMessage(error, false), /sk_test_private/);
  }
});
