const assert = require('node:assert/strict');
const vm = require('node:vm');
const { read } = require('./site_source.cjs');

// Run the real form handlers against a fake Auth client; never send test emails.
async function test() {
  const source = read('src/cms/admin.js');
  const handlers = source.slice(source.indexOf("$('login-form').onsubmit"), source.indexOf("$('signout').onclick"));
  const nodes = new Map();
  const get = (id) => {
    if (!nodes.has(id)) nodes.set(id, { value: '', valid: true, reportValidity() { return this.valid; } });
    return nodes.get(id);
  };
  const calls = [];
  let pending, error, loads = 0, rejectCode = false;
  vm.runInNewContext(handlers, {
    $: get, URL, location: { href: 'https://nova-1qm.pages.dev/admin/' },
    run: (fn) => { pending = fn().catch((e) => { error = e; }); },
    notice() {}, load: async () => { loads++; },
    unwrap(result) { if (result.error) throw result.error; return result.data; },
    db: { auth: {
      async signInWithOtp(args) { calls.push(['send', args]); return { data: {} }; },
      async verifyOtp(args) { calls.push(['verify', args]); return rejectCode ? { error: Error('Invalid or expired code') } : { data: {} }; }
    } }
  });
  const submit = async (id) => { get(id).onsubmit({ preventDefault() {} }); await pending; };
  get('email').value = ' admin@example.com ';
  await submit('login-form');
  assert.equal(calls[0][1].email, 'admin@example.com');
  assert.equal(calls[0][1].options.shouldCreateUser, false, 'Sign-in must not register arbitrary accounts');
  assert.equal(calls[0][1].options.emailRedirectTo, 'https://nova-1qm.pages.dev/admin/');
  get('email').valid = false;
  await submit('code-form');
  assert.equal(calls.length, 1, 'Code form validates email from the separate form');
  get('email').valid = true; get('code').valid = false;
  await submit('code-form');
  assert.equal(calls.length, 1, 'Malformed code must not call Auth');
  get('code').valid = true; get('code').value = '123456'; rejectCode = true;
  await submit('code-form');
  assert.equal(loads, 0, 'Invalid code cannot open the editor');
  assert.match(error.message, /Invalid/);
  rejectCode = false; get('code').value = ' 123456 ';
  await submit('code-form');
  assert.equal(calls.at(-1)[1].token, '123456');
  assert.equal(calls.at(-1)[1].type, 'email');
  assert.equal(loads, 1);
  assert.equal(get('code').value, '', 'Clear the used code');
  const html = read('src/cms/admin.html');
  assert.match(html, /autocomplete="one-time-code"/);
  assert.match(html, /inputmode="numeric"/);
  assert.match(read('src/index.html'), /rel="preload" href="assets\/app.js" as="script"/);
  assert.match(read('src/cms/public.js'), /cache: 'no-store'/, 'Published content stays fresh');
  console.log('PASS: admin email/code validation, existing-account-only sign-in, expired code rejection, cross-device code verification, early script fetch and fresh published content.');
}
test().catch((error) => { console.error(error); process.exitCode = 1; });
