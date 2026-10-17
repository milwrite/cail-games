import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../worker/index.js';
const request = (path, init) => new Request('https://cail-games.ailab-452.workers.dev' + path, init);

test('launches keep saved work and deep paths at their app origin', async () => {
  const response = await worker.fetch(request('/cadavre/play/?work=saved-poem'), {});
  assert.equal(response.status, 302);
  assert.equal(response.headers.get('location'), 'https://cadavre.ailab-452.workers.dev/play/?work=saved-poem');
  const crafted = await worker.fetch(request('/cloze//untrusted.example/?next=https://untrusted.example'), {});
  assert.equal(new URL(crafted.headers.get('location')).origin, 'https://cloze.ailab-452.workers.dev');
});

test('launch routes refuse mutation and never forward a request body', async () => {
  const response = await worker.fetch(request('/jeopardy/', {method:'POST',body:'do not forward'}), {});
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('location'), null);
});

test('health reports an isolated game outage and still checks the other games', async () => {
  const env = {RELEASE:'release'};
  env.CADAVRE = {fetch:async () => Response.json({ok:true,release:'poem'})};
  env.JEOPARDY = {fetch:async () => {throw new Error('offline');}};
  env.CLOZE = {fetch:async () => Response.json({ok:true,release:'reading'})};
  const response = await worker.fetch(request('/health'), env);
  const data = await response.json();
  assert.equal(response.status, 503);
  assert.equal(data.ok, false);
  assert.deepEqual(data.games.cloze, {ok:true,release:'reading'});
  assert.deepEqual(data.games.jeopardy, {ok:false,release:null});
});

test('game pages render first and Play launches all five verified destinations', async () => {
  const served = [];
  const env = {ASSETS:{fetch:async req => {served.push(new URL(req.url).pathname);return new Response('Project page');}}};
  for (const id of ['cadavre','jeopardy','cloze','haggle','langames']) {
    const detail = await worker.fetch(request('/'+id+'/'), env);
    assert.equal(detail.status,200);
    assert.equal(detail.headers.get('location'),null);
  }
  assert.equal(served.length,5);
  const haggle = await worker.fetch(request('/play/haggle/'), env);
  assert.equal(haggle.headers.get('location'),'https://zweibel.net/haggle/');
  const languages = await worker.fetch(request('/play/langames/?id=lesson'), env);
  assert.equal(languages.headers.get('location'),'https://stefanomorello.com/langames/?id=lesson');
});

test('the old worker preserves page paths and saved-work queries on the canonical domain', async () => {
  const response = await worker.fetch(request('/cadavre/play/?work=saved-poem'), {LEGACY_REDIRECT:'true'});
  assert.equal(response.status,308);
  assert.equal(response.headers.get('location'),'https://games.ailab-452.workers.dev/cadavre/play/?work=saved-poem');
});
