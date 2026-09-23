import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';

// Uses a separate database and production server; never touches local app data.
const directory = await mkdtemp(join(tmpdir(), 'steppemind-auth-test-'));
const database = join(directory, 'test.db');
const port = process.env.AUTH_TEST_PORT ?? '3107';
const base = `http://127.0.0.1:${port}`;
let server;
let output = '';
let checks = 0;

async function start() {
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', port], {
    env: { ...process.env, DATABASE_PATH: database, OPENAI_API_KEY: '', NODE_ENV: 'production' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(`Server exited: ${output}`);
    try { if ((await fetch(`${base}/login`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`Server not ready: ${output}`);
}
async function stop() {
  if (server && server.exitCode === null) {
    const exited = once(server, 'exit');
    server.kill('SIGTERM');
    await exited;
  }
}
async function request(path, { body, cookie, origin = base, raw } = {}) {
  const headers = {};
  if (body !== undefined || raw !== undefined) { headers['Content-Type'] = 'application/json'; headers.Origin = origin; }
  if (cookie) headers.Cookie = cookie;
  return fetch(base + path, { method: body !== undefined || raw !== undefined ? 'POST' : 'GET', headers,
    body: raw ?? (body === undefined ? undefined : JSON.stringify(body)), redirect: 'manual' });
}
function status(response, expected, message) { assert.equal(response.status, expected, message); checks++; }
function cookie(response) { const value = response.headers.get('set-cookie'); assert.ok(value); return value.split(';')[0]; }
const credentials = (login, role = 'business') => ({ login, role, password: 'Test-password-2026!' });
const loginCredentials = login => ({ login, password: 'Test-password-2026!' });
async function register(login, role) {
  const response = await request('/api/auth/register', { body: { ...credentials(login, role), name: `Test ${login}` } });
  status(response, 201, `register ${role}`);
  const user = (await response.json()).user;
  assert.equal(user.role, role); assert.equal(user.password_hash, undefined);
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  assert.match(response.headers.get('set-cookie'), /SameSite=lax/i);
  assert.match(response.headers.get('set-cookie'), /Secure/i);
  return { cookie: cookie(response), user };
}

try {
  await start();
  const guest = await request('/'); status(guest, 307, 'guest redirect'); assert.equal(guest.headers.get('location'), '/login');
  status(await request('/api/state'), 401, 'private catalog');
  status(await request('/api/state', { body: { action: 'createTask' } }), 401, 'guest cannot mutate');
  status(await request('/api/ai/analyze', { body: { description: 'Example business task', locale: 'ru' } }), 401, 'private AI endpoint');
  status(await request('/api/auth/register', { raw: '{broken' }), 400, 'malformed JSON');
  status(await request('/api/auth/register', { body: { ...credentials('short'), password: 'x', name: 'Test' } }), 400, 'short password');
  status(await request('/api/auth/login', { body: loginCredentials('absent'), origin: 'https://other.example' }), 403, 'cross-origin rejected');

  const business = await register('business_a', 'business');
  const otherBusiness = await register('business_b', 'business');
  const student = await register('student_a', 'student');
  const otherStudent = await register('student_b', 'student');
  status(await request('/api/auth/register', { body: { ...credentials('BUSINESS_A'), name: 'Duplicate' } }), 409, 'case-insensitive duplicate');
  status(await request('/api/auth/login', { body: { ...loginCredentials('business_a'), password: 'incorrect-password' } }), 401, 'wrong password');
  const login = await request('/api/auth/login', { body: loginCredentials(' BUSINESS_A ') });
  status(login, 200, 'normalized login');
  const signedIn = cookie(login);
  const authenticatedHome = await request('/', { cookie: signedIn });
  status(authenticatedHome, 307, 'authenticated home redirects');
  assert.equal(authenticatedHome.headers.get('location'), '/catalog');
  status(await request('/catalog', { cookie: business.cookie }), 200, 'business catalog page');
  status(await request('/catalog', { cookie: student.cookie }), 200, 'student catalog page');
  status(await request('/business/dashboard', { cookie: business.cookie }), 200, 'business dashboard page');
  status(await request('/business/tasks/new', { cookie: business.cookie }), 200, 'business task creation page');
  status(await request('/business/proposals', { cookie: business.cookie }), 200, 'business proposals page');
  const blockedStudentTaskPage = await request('/business/tasks/new', { cookie: student.cookie });
  status(blockedStudentTaskPage, 307, 'student task creation page redirects');
  assert.equal(blockedStudentTaskPage.headers.get('location'), '/student/dashboard');
  status(await request('/student/dashboard', { cookie: student.cookie }), 200, 'student dashboard page');
  status(await request('/student/proposals', { cookie: student.cookie }), 200, 'student proposals page');
  status(await request('/login', { cookie: signedIn }), 307, 'authenticated login redirects');

  const task = { title: 'Integration task', industry: 'Education', context: 'The current support process is manual', need: 'Reduce customer request processing time', users: '', dataMaterials: '', constraints: '', expectedResult: '', successCriteria: '', contact: '', interactionFormat: '', language: 'ru', ownerId: otherBusiness.user.id };
  const create = { action: 'createTask', task };
  status(await request('/api/state', { cookie: student.cookie, body: create }), 403, 'student cannot publish');
  const savedResponse = await request('/api/state', { cookie: business.cookie, body: create });
  status(savedResponse, 200, 'legacy create saves an unconfirmed draft');
  const savedState = await savedResponse.json();
  const draft = savedState.draft;
  assert.equal(draft.status, 'draft'); assert.equal(draft.confirmedScore, 0);
  assert.ok(!savedState.tasks.some(item => item.id === draft.id));
  async function workflow(body, expected = 200, auth = business.cookie) {
    const response = await request('/api/tasks', { cookie: auth, body });
    status(response, expected, `${body.action} task`);
    return response.json();
  }
  const ref = { id: draft.id, version: draft.version };
  status(await request('/api/tasks'), 401, 'private drafts');
  status(await request('/api/tasks', { cookie: student.cookie }), 403, 'student cannot list drafts');
  await workflow({ action: 'publish', ...ref }, 409);
  await workflow({ action: 'confirm', ...ref }, 400);
  await workflow({ action: 'confirm', ...ref, confirmed: true }, 404, otherBusiness.cookie);
  await workflow({ action: 'confirm', ...ref, confirmed: true }, 403, student.cookie);
  const confirmed = (await workflow({ action: 'confirm', ...ref, confirmed: true })).task;
  assert.equal(confirmed.status, 'confirmed'); assert.equal(confirmed.confirmedScore, 20);
  assert.ok(!(await (await request('/api/state', { cookie: student.cookie })).json()).tasks.some(item => item.id === draft.id));
  await workflow({ action: 'publish', ...ref });
  const shared = async () => (await (await request('/api/state', { cookie: student.cookie })).json()).tasks;
  const created = (await shared()).find(item => item.id === draft.id);
  assert.equal(created.ownerId, business.user.id, 'ownership cannot be forged');
  assert.equal(created.readinessLevel, 'draft'); assert.equal(created.score, 20);
  for (const key of ['draftCard', 'description', 'version', 'confirmedVersion', 'confirmedScore', 'previousScore']) assert.equal(created[key], undefined);

  // A new 45-point card progresses to 80, then changes again without leaking a working copy.
  const card45 = { title: 'Turnover demo', industry: 'HR', context: 'Employee turnover remains consistently high', need: 'Identify employees with increased departure risk', users: 'HR managers', dataMaterials: '', constraints: '', expectedResult: 'A detailed employee risk assessment report', successCriteria: '', contact: '', interactionFormat: '' };
  const saveBody = { action: 'save', card: card45, description: 'Employee turnover', language: 'ru' };
  let edited = (await workflow(saveBody)).task;
  const demoId = edited.id;
  const current = () => ({ id: demoId, version: edited.version });
  edited = (await workflow({ action: 'confirm', ...current(), confirmed: true })).task;
  assert.equal(edited.confirmedScore, 45);
  edited = (await workflow({ ...saveBody, ...current(), card: { ...card45, dataMaterials: 'Historical HR records in CSV format', successCriteria: 'Recall at least 80% on the test set' } })).task;
  assert.equal(edited.confirmedVersion, null); assert.equal(edited.status, 'draft');
  await workflow({ action: 'publish', ...current() }, 409);
  await workflow({ ...saveBody, id: demoId, version: 1 }, 409);
  edited = (await workflow({ action: 'confirm', ...current(), confirmed: true })).task;
  assert.equal(edited.previousScore, 45); assert.equal(edited.confirmedScore, 80);
  assert.equal(edited.evaluation.source, 'fallback', 'confirmation stores the server-side evaluation');
  assert.equal(edited.evaluation.breakdown.length, 7, 're-evaluation covers every rating category');
  edited = (await workflow({ action: 'publish', ...current() })).task;
  let publicDemo = (await shared()).find(item => item.id === demoId);
  assert.equal(publicDemo.score, 80); assert.equal(publicDemo.readinessLevel, 'ready');
  edited = (await workflow({ ...saveBody, ...current(), card: { ...edited.card, title: 'Private revised title', successCriteria: '' } })).task;
  publicDemo = (await shared()).find(item => item.id === demoId);
  assert.equal(publicDemo.title, 'Turnover demo'); assert.equal(publicDemo.score, 80);
  edited = (await workflow({ action: 'confirm', ...current(), confirmed: true })).task;
  assert.equal(edited.confirmedScore, 65); assert.equal(edited.previousScore, 80);
  assert.equal(edited.evaluation.score, 65, 'edited information produces a fresh evaluation');
  assert.equal((await shared()).find(item => item.id === demoId).score, 80, 'confirmation does not publish');
  await workflow({ action: 'publish', ...current() });
  await workflow({ action: 'publish', ...current() });
  assert.equal((await shared()).filter(item => item.id === demoId).length, 1, 'same ID, no duplicate publishing');
  assert.equal((await shared()).find(item => item.id === demoId).score, 65);
  const zeroCard = Object.fromEntries(Object.keys(card45).map(key => [key, key === 'title' ? 'Only a title' : '']));
  const zero = (await workflow({ ...saveBody, card: zeroCard })).task;
  await workflow({ action: 'confirm', id: zero.id, version: zero.version, confirmed: true });
  await workflow({ action: 'publish', id: zero.id, version: zero.version });
  assert.equal((await shared()).find(item => item.id === zero.id).score, 0, 'zero score and no industry do not block publishing');
  const privateDraft = (await workflow(saveBody)).task;
  const ownDrafts = (await (await request('/api/tasks', { cookie: business.cookie })).json()).tasks;
  assert.ok(ownDrafts.some(item => item.id === privateDraft.id));
  assert.deepEqual((await (await request('/api/tasks', { cookie: otherBusiness.cookie })).json()).tasks, []);
  const proposal = { action: 'createProposal', taskId: created.id, teamName: 'Same team name', solutionIdea: 'A concrete solution idea', plan: 'A concrete project plan', estimatedDuration: '2 weeks', prototypeUrl: '', studentId: otherStudent.user.id };
  status(await request('/api/state', { cookie: business.cookie, body: proposal }), 403, 'business cannot submit student proposal');
  status(await request('/api/state', { cookie: student.cookie, body: { ...proposal, taskId: 999999 } }), 404, 'nonexistent task');
  status(await request('/api/state', { cookie: student.cookie, body: { ...proposal, prototypeUrl: 'not a URL' } }), 400, 'invalid prototype URL');
  status(await request('/api/state', { cookie: student.cookie, body: { ...proposal, solutionIdea: 'too short' } }), 400, 'short solution idea');
  const sent = await request('/api/state', { cookie: student.cookie, body: proposal });
  status(sent, 200, 'student submits without optional prototype');
  const sentState = await sent.json();
  assert.equal(sentState.proposals.length, 1);
  const proposalId = sentState.proposals[0].id;
  assert.equal(sentState.proposals[0].studentId, student.user.id, 'student ownership cannot be forged');
  assert.equal(sentState.proposals[0].estimatedDuration, proposal.estimatedDuration);
  assert.equal(sentState.proposals[0].prototypeUrl, '');
  const second = await request('/api/state', { cookie: student.cookie, body: { ...proposal, solutionIdea: 'A second independent solution proposal', prototypeUrl: 'https://example.com/prototype' } });
  status(second, 200, 'student can submit multiple proposals');
  const secondState = await second.json();
  assert.equal(secondState.proposals.length, 2, 'proposal count is unlimited');
  const secondProposalId = secondState.proposals.find(item => item.id !== proposalId).id;
  const third = await request('/api/state', { cookie: student.cookie, body: { ...proposal, solutionIdea: 'A third solution proposal for manual review' } });
  status(third, 200, 'student can continue submitting proposals');
  const thirdState = await third.json();
  const thirdProposalId = thirdState.proposals.find(item => item.id !== proposalId && item.id !== secondProposalId).id;
  const otherState = await (await request('/api/state', { cookie: otherStudent.cookie })).json();
  assert.equal(otherState.proposals.length, 0, 'other student cannot read proposal details');
  assert.equal(otherState.proposalCounts[created.id], 3, 'catalog still has total counts');
  const otherBusinessState = await (await request('/api/state', { cookie: otherBusiness.cookie })).json();
  assert.equal(otherBusinessState.proposals.length, 0, 'other business cannot read proposals');
  const ownerState = await (await request('/api/state', { cookie: business.cookie })).json();
  assert.equal(ownerState.proposals.length, 3, 'task owner reads every proposal for their task');
  const decision = { action: 'proposalStatus', id: proposalId, status: 'accepted' };
  status(await request('/api/state', { cookie: otherBusiness.cookie, body: decision }), 404, 'only task owner decides');
  status(await request('/api/state', { cookie: student.cookie, body: decision }), 403, 'students cannot decide');
  status(await request('/api/state', { cookie: business.cookie, body: decision }), 200, 'owner accepts');
  status(await request('/api/state', { cookie: business.cookie, body: { ...decision, id: secondProposalId } }), 200, 'owner may accept multiple teams');
  status(await request('/api/state', { cookie: business.cookie, body: { action: 'proposalStatus', id: thirdProposalId, status: 'rejected' } }), 200, 'owner may reject a proposal');
  const studentState = await (await request('/api/state', { cookie: student.cookie })).json();
  assert.equal(studentState.proposals.find(item => item.id === proposalId).status, 'accepted');
  assert.equal(studentState.proposals.find(item => item.id === secondProposalId).status, 'accepted');
  assert.equal(studentState.proposals.find(item => item.id === thirdProposalId).status, 'rejected');
  status(await request('/api/ai/analyze', { cookie: student.cookie, body: { description: 'Example business task', locale: 'ru' } }), 403, 'students cannot invoke business AI');
  status(await request('/api/ai/analyze', { cookie: business.cookie, body: { description: 'Example business task', locale: 'ru' } }), 200, 'business AI works');

  const analysisResponse = await request('/api/ai/analyze', { cookie: business.cookie, body: { description: 'We have high employee turnover and want to use our HR data to identify employees at risk of leaving.', locale: 'ru' } });
  status(analysisResponse, 200, 'HR demo analysis');
  const analysis = await analysisResponse.json();
  assert.equal(analysis.source, 'fallback');
  assert.ok(analysis.known.includes('need'));
  assert.ok(analysis.questions.length >= 3 && analysis.questions.length <= 5);
  for (const question of analysis.questions) { assert.ok(analysis.missing.includes(question.field)); assert.ok(!analysis.known.includes(question.field)); }
  assert.equal(analysis.card.successCriteria, ''); assert.equal(analysis.card.contact, '');
  const labeled = await (await request('/api/ai/analyze', { cookie: business.cookie, body: { description: 'Users: HR managers; Data: CSV; Need: Identify turnover risk', locale: 'kk' } })).json();
  assert.equal(labeled.card.users, 'HR managers');
  assert.ok(!labeled.questions.some(question => ['users', 'dataMaterials', 'need'].includes(question.field)));

  const inspector = new Database(database);
  const stored = inspector.prepare('SELECT password_hash FROM accounts WHERE id = ?').get(student.user.id);
  assert.match(stored.password_hash, /^scrypt:/); assert.ok(!stored.password_hash.includes(credentials('').password));
  inspector.close();
  await stop(); await start();
  status(await request('/api/state', { cookie: signedIn }), 200, 'session survives server restart');
  status(await request('/api/auth/login', { body: loginCredentials('student_a') }), 200, 'account persists');
  assert.equal((await shared()).find(item => item.id === demoId).score, 65, 'publication survives restart');
  assert.ok((await (await request('/api/tasks', { cookie: business.cookie })).json()).tasks.some(item => item.id === privateDraft.id), 'private draft survives restart');
  status(await request('/api/auth/logout', { cookie: signedIn, body: {} }), 200, 'logout');
  status(await request('/api/state', { cookie: signedIn }), 401, 'logout revokes server session');
  status(await request('/api/state', { cookie: 'steppemind_session=forged' }), 401, 'forged cookie rejected');

  const expiry = new Database(database);
  expiry.prepare('UPDATE sessions SET expires_at = 0 WHERE account_id = ?').run(otherStudent.user.id); expiry.close();
  status(await request('/api/state', { cookie: otherStudent.cookie }), 401, 'expired session');
  for (let i = 0; i < 10; i++) status(await request('/api/auth/login', { body: loginCredentials('nonexistent') }), 401, 'failed login');
  status(await request('/api/auth/login', { body: loginCredentials('nonexistent') }), 429, 'login rate limit');
  console.log(`PASS: ${checks} HTTP checks; auth, ownership, draft/confirm/publish, 45→80 recalculation, public snapshots, fallback analysis and persistence verified.`);
} finally {
  await stop();
  await rm(directory, { recursive: true, force: true });
}
