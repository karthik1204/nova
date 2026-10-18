import { createClient } from '@supabase/supabase-js';
import config from './config.json';
import { cleanContent, emptyContent, editableText, editableAsset } from './content.js';
import { validScope } from './settings.js';
import { createEditor } from './editor.js';

const db = createClient(config.url, config.publishableKey);
const $ = (id) => document.getElementById(id);
const assets = window.NOVA_DATA.assets;
let draft = emptyContent(),
  revision = 0,
  dirty = false,
  busy = false,
  signedIn = false;
const frame = $('preview');
const editor = createEditor({
  data: window.NOVA_DATA,
  getDraft: () => draft,
  changed,
  refresh,
  selectText,
  selectImage
});
function notice(message, error = false) {
  $('status').textContent = message;
  $('status').classList.toggle('error', error);
}
function changed() {
  dirty = true;
  $('save-state').textContent = 'Unsaved changes';
}
function el(tag, text) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  return node;
}
function button(label, action) {
  const b = el('button', label);
  b.onclick = () => run(action);
  return b;
}
async function run(action) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('button,input,textarea,select').forEach((b) => (b.disabled = true));
  try {
    await action();
  } catch (e) {
    notice(e.message || 'Something went wrong. Please try again.', true);
  } finally {
    busy = false;
    document.querySelectorAll('button,input,textarea,select').forEach((b) => (b.disabled = false));
  }
}
function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}
function refresh() {
  frame.src = '../?cms-preview=1&t=' + Date.now() + '#/' + $('page').value;
}
function defaultGallery(key) {
  const p = window.NOVA_DATA.products.find((p) => p.key === key);
  const ids = [
    p.cutout,
    p.photo,
    ...(key === 'immunity' ? ['10'] : []),
    ...[1, 2, 3].map((i) => key + '-scene-' + i)
  ];
  return ids.map((id, i) => ({
    url: assets[id],
    alt: p.name + ' photo ' + (i + 1),
    caption: i === 0 ? 'Product packaging' : 'Product photograph'
  }));
}
function gallery() {
  const key = $('gallery-product').value;
  return draft.galleries[key] || defaultGallery(key);
}
function setGallery(items) {
  draft.galleries[$('gallery-product').value] = items;
  changed();
  renderGallery();
  refresh();
}
function renderGallery() {
  const list = $('gallery-list');
  list.replaceChildren();
  gallery().forEach((item, index) => {
    const row = el('div');
    row.className = 'gallery-item';
    const img = el('img');
    img.src = new URL(item.url, new URL('../', location.href));
    img.alt = item.alt;
    row.append(img);
    const controls = el('div');
    const label = el('label', 'Photo ' + (index + 1) + ' description');
    const input = el('input');
    input.value = item.alt;
    input.maxLength = 300;
    label.append(input);
    controls.append(label);
    input.onchange = () => {
      const items = gallery().map((i) => ({ ...i }));
      items[index].alt = input.value;
      items[index].caption = input.value;
      setGallery(items);
    };
    controls.append(
      button('Replace', async () => {
        const url = await upload();
        if (url) {
          const items = gallery().map((i) => ({ ...i }));
          items[index].url = url;
          setGallery(items);
        }
      })
    );
    if (index > 0)
      controls.append(
        button('Move up', () => {
          const items = [...gallery()];
          [items[index - 1], items[index]] = [items[index], items[index - 1]];
          setGallery(items);
        })
      );
    controls.append(
      button('Remove', () => {
        if (gallery().length === 1) throw Error('Keep at least one product photo.');
        setGallery(gallery().filter((_, i) => i !== index));
      })
    );
    row.append(controls);
    list.append(row);
  });
}
async function upload() {
  const file = await new Promise((resolve) => {
    const input = el('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = () => resolve(input.files[0]);
    input.oncancel = () => resolve(null);
    input.click();
  });
  if (!file) return null;
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
  if (!ext || file.size > 10 * 1024 * 1024)
    throw Error('Choose a PNG, JPG or WebP image under 10 MB.');
  const bitmap = await createImageBitmap(file);
  if (!bitmap.width || !bitmap.height) throw Error('This file is not a readable image.');
  bitmap.close();
  const path = crypto.randomUUID() + '.' + ext;
  unwrap(
    await db.storage
      .from(config.bucket)
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' })
  );
  notice(
    'Photo uploaded. Save and publish when ready. The uploaded file is already public by URL.'
  );
  return db.storage.from(config.bucket).getPublicUrl(path).data.publicUrl;
}
function selectText(original, scope = $('page').value) {
  if (!editableText(original) || !validScope(scope)) return;
  const box = $('selection');
  box.replaceChildren(el('h2', 'Edit selected words'));
  const label = el('label', 'Replacement text');
  const input = el('textarea');
  input.maxLength = 5000;
  input.value = draft.pages[scope]?.[original] ?? draft.texts[original] ?? original;
  label.append(input);
  box.append(label);
  box.append(
    button('Apply to draft', () => {
      draft.pages[scope] ||= {};
      draft.pages[scope][original] = input.value;
      changed();
      refresh();
    }),
    button('Restore original', () => {
      if (draft.pages[scope]) delete draft.pages[scope][original];
      if (Object.hasOwn(draft.texts, original)) {
        draft.pages[scope] ||= {};
        draft.pages[scope][original] = original;
      }
      changed();
      refresh();
    })
  );
  box.append(
    el(
      'p',
      scope === 'global'
        ? 'Shared header/footer text updates across the website.'
        : 'Matching words on this page update together. Other pages stay unchanged.'
    )
  );
  box.scrollIntoView({ block: 'nearest' });
}
function selectImage(key) {
  if (!editableAsset(key, assets)) return;
  const box = $('selection');
  box.replaceChildren(el('h2', 'Edit selected photo'));
  const preview = el('img');
  preview.className = 'selected-image';
  preview.src = new URL(draft.images[key] || assets[key], new URL('../', location.href));
  preview.alt = 'Selected website image';
  box.append(preview);
  box.append(
    button('Upload replacement', async () => {
      const url = await upload();
      if (url) {
        draft.images[key] = url;
        changed();
        refresh();
      }
    }),
    button('Hide photo', () => {
      draft.images[key] = null;
      changed();
      refresh();
    }),
    button('Restore original', () => {
      delete draft.images[key];
      changed();
      refresh();
    })
  );
  box.scrollIntoView({ block: 'nearest' });
}
async function history() {
  const rows = unwrap(
    await db
      .from('website_versions')
      .select('revision,content,published_at')
      .order('revision', { ascending: false })
      .limit(10)
  );
  const list = $('history');
  list.replaceChildren();
  for (const row of rows)
    list.append(
      button(
        'Restore version ' + row.revision + ' · ' + new Date(row.published_at).toLocaleDateString(),
        () => {
          if (
            !confirm('Load this previous version into your draft? Unsaved edits will be replaced.')
          )
            return;
          draft = cleanContent(row.content, assets);
          changed();
          renderGallery();
          editor.render();
          refresh();
          notice('Previous version loaded into draft. Save and publish when ready.');
        }
      )
    );
  if (!rows.length) list.append(el('p', 'Your earlier published versions will appear here.'));
}
async function load() {
  const row = unwrap(await db.from('website_content').select('*').eq('id', 'draft').maybeSingle());
  if (!row) throw Error('This verified email does not have admin access.');
  draft = cleanContent(row.content, assets);
  revision = row.revision;
  dirty = false;
  signedIn = true;
  $('login').hidden = true;
  $('workspace').hidden = false;
  $('signout').hidden = false;
  $('save-state').textContent = 'Saved draft · revision ' + revision;
  renderGallery();
  editor.render();
  refresh();
  await history();
  notice('You are signed in. Draft changes stay private until you publish.');
}
async function save() {
  const content = cleanContent(draft, assets);
  const row = unwrap(
    await db
      .from('website_content')
      .update({ content, revision: revision + 1, updated_at: new Date().toISOString() })
      .eq('id', 'draft')
      .eq('revision', revision)
      .select('revision')
      .maybeSingle()
  );
  if (!row)
    throw Error(
      'Another session changed the draft, or your access changed. Your edits are still here. Copy them before reloading.'
    );
  revision = row.revision;
  dirty = false;
  $('save-state').textContent = 'Saved draft · revision ' + revision;
  notice('Draft saved securely. The published website is unchanged.');
}
$('login-form').onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    unwrap(
      await db.auth.signInWithOtp({
        email: $('email').value.trim(),
        options: { emailRedirectTo: new URL('./', location.href).href }
      })
    );
    notice(
      'Sign-in email requested. Check your inbox. If Supabase reports an unauthorized address, email delivery must be configured first.'
    );
  });
};
$('code-form').onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    unwrap(
      await db.auth.verifyOtp({
        email: $('email').value.trim(),
        token: $('code').value.trim(),
        type: 'email'
      })
    );
    await load();
  });
};
$('signout').onclick = () =>
  run(async () => {
    if (dirty && !confirm('Sign out and discard unsaved changes?')) return;
    unwrap(await db.auth.signOut());
    dirty = false;
    location.reload();
  });
$('save').onclick = () => run(save);
$('publish').onclick = () =>
  run(async () => {
    if (!confirm('Publish this draft to the connected website?')) return;
    if (dirty) await save();
    const published = unwrap(await db.rpc('publish_website', { expected_revision: revision }));
    await history();
    notice(
      'Published version ' +
        published +
        '. Website visitors see it on their next page load. Refresh already-open pages.'
    );
  });
$('reload').onclick = () =>
  run(async () => {
    if (!dirty || confirm('Discard unsaved edits and reload the saved draft?')) await load();
  });
$('add-photo').onclick = () =>
  run(async () => {
    if (gallery().length >= 20) throw Error('Maximum 20 gallery photos.');
    const url = await upload();
    if (url)
      setGallery([...gallery(), { url, alt: 'New product photo', caption: 'Product photograph' }]);
  });
$('reset-gallery').onclick = () =>
  run(() => {
    if (confirm('Restore this product’s original gallery in the draft?')) {
      delete draft.galleries[$('gallery-product').value];
      changed();
      renderGallery();
      refresh();
    }
  });
$('gallery-product').onchange = renderGallery;
$('refresh-preview').onclick = refresh;
$('page').onchange = refresh;
$('edit-mode').onchange = refresh;
window.addEventListener('message', (event) => {
  if (!signedIn || event.origin !== location.origin || event.source !== frame.contentWindow) return;
  if (event.data?.type === 'nova-ready')
    frame.contentWindow.postMessage(
      { type: 'nova-draft', content: draft, edit: $('edit-mode').checked },
      location.origin
    );
  if (event.data?.type === 'nova-select-text' && typeof event.data.original === 'string')
    selectText(event.data.original, event.data.scope);
  if (event.data?.type === 'nova-select-image') selectImage(event.data.key);
  if (event.data?.type === 'nova-catalog') editor.catalog(event.data);
});
window.addEventListener('beforeunload', (event) => {
  if (dirty) {
    event.preventDefault();
    event.returnValue = '';
  }
});
run(async () => {
  const { session } = unwrap(await db.auth.getSession());
  if (session) {
    unwrap(await db.auth.getUser());
    await load();
  } else notice('Sign in to continue. Only the approved, verified admin email can edit.');
});
