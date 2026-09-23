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
  status(await request('/api/auth/login', { body: credentials('absent'), origin: 'https://other.example' }), 403, 'cross-origin rejected');

  const business = await register('business_a', 'business');
  const otherBusiness = await register('business_b', 'business');
  const student = await register('student_a', 'student');
  const otherStudent = await register('student_b', 'student');
  status(await request('/api/auth/register', { body: { ...credentials('BUSINESS_A'), name: 'Duplicate' } }), 409, 'case-insensitive duplicate');
  status(await request('/api/auth/login', { body: { ...credentials('business_a'), password: 'incorrect-password' } }), 401, 'wrong password');
  status(await request('/api/auth/login', { body: credentials('business_a', 'student') }), 401, 'wrong role');
  const login = await request('/api/auth/login', { body: credentials(' BUSINESS_A ') });
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

  const task = { title: 'Integration task', industry: 'Education', context: 'Context', need: 'Need', users: '', dataMaterials: '', constraints: '', expectedResult: '', successCriteria: '', contact: '', interactionFormat: '', language: 'ru', ownerId: otherBusiness.user.id };
  const create = { action: 'createTask', task };
  status(await request('/api/state', { cookie: student.cookie, body: create }), 403, 'student cannot publish');
  const published = await request('/api/state', { cookie: business.cookie, body: create });
  status(published, 200, 'business publishes');
  const created = (await published.json()).tasks.find(item => item.title === task.title);
  assert.equal(created.ownerId, business.user.id, 'ownership cannot be forged');
  const proposal = { action: 'createProposal', taskId: created.id, teamName: 'Same team name', solutionIdea: 'A concrete solution idea', plan: 'A concrete project plan', estimatedDuration: '2 weeks', prototypeUrl: '', studentId: otherStudent.user.id };
  status(await request('/api/state', { cookie: business.cookie, body: proposal }), 403, 'business cannot submit student proposal');
  status(await request('/api/state', { cookie: student.cookie, body: { ...proposal, taskId: 999999 } }), 404, 'nonexistent task');
  const sent = await request('/api/state', { cookie: student.cookie, body: proposal });
  status(sent, 200, 'student submits');
  const sentState = await sent.json();
  assert.equal(sentState.proposals.length, 1);
  const proposalId = sentState.proposals[0].id;
  assert.equal(sentState.proposals[0].studentId, student.user.id, 'student ownership cannot be forged');
  const otherState = await (await request('/api/state', { cookie: otherStudent.cookie })).json();
  assert.equal(otherState.proposals.length, 0, 'other student cannot read proposal details');
  assert.equal(otherState.proposalCounts[created.id], 1, 'catalog still has total counts');
  const otherBusinessState = await (await request('/api/state', { cookie: otherBusiness.cookie })).json();
  assert.equal(otherBusinessState.proposals.length, 0, 'other business cannot read proposals');
  const decision = { action: 'proposalStatus', id: proposalId, status: 'accepted' };
  status(await request('/api/state', { cookie: otherBusiness.cookie, body: decision }), 404, 'only task owner decides');
  status(await request('/api/state', { cookie: student.cookie, body: decision }), 403, 'students cannot decide');
  status(await request('/api/state', { cookie: business.cookie, body: decision }), 200, 'owner accepts');
  const studentState = await (await request('/api/state', { cookie: student.cookie })).json();
  assert.equal(studentState.proposals[0].status, 'accepted');
  status(await request('/api/ai/analyze', { cookie: student.cookie, body: { description: 'Example business task', locale: 'ru' } }), 403, 'students cannot invoke business AI');
  status(await request('/api/ai/analyze', { cookie: business.cookie, body: { description: 'Example business task', locale: 'ru' } }), 200, 'business AI works');

  const inspector = new Database(database);
  const stored = inspector.prepare('SELECT password_hash FROM accounts WHERE id = ?').get(student.user.id);
  assert.match(stored.password_hash, /^scrypt:/); assert.ok(!stored.password_hash.includes(credentials('').password));
  inspector.close();
  await stop(); await start();
  status(await request('/api/state', { cookie: signedIn }), 200, 'session survives server restart');
  status(await request('/api/auth/login', { body: credentials('student_a', 'student') }), 200, 'account persists');
  status(await request('/api/auth/logout', { cookie: signedIn, body: {} }), 200, 'logout');
  status(await request('/api/state', { cookie: signedIn }), 401, 'logout revokes server session');
  status(await request('/api/state', { cookie: 'steppemind_session=forged' }), 401, 'forged cookie rejected');

  const expiry = new Database(database);
  expiry.prepare('UPDATE sessions SET expires_at = 0 WHERE account_id = ?').run(otherStudent.user.id); expiry.close();
  status(await request('/api/state', { cookie: otherStudent.cookie }), 401, 'expired session');
  for (let i = 0; i < 10; i++) status(await request('/api/auth/login', { body: credentials('nonexistent') }), 401, 'failed login');
  status(await request('/api/auth/login', { body: credentials('nonexistent') }), 429, 'login rate limit');
  console.log(`PASS: ${checks} HTTP checks; ownership, password hashes, cookies, session expiry and persistence verified.`);
} finally {
  await stop();
  await rm(directory, { recursive: true, force: true });
}
