import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Compile the actual pure modules with the project's existing TypeScript dependency.
const root = resolve('tmp');
await mkdir(root, { recursive: true });
const directory = await mkdtemp(join(root, 'task-logic-'));
try {
  for (const name of ['task-card', 'task-labels', 'task-analysis', 'scoring']) {
    const source = await readFile(`src/lib/${name}.ts`, 'utf8');
    const result = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
    await writeFile(join(directory, `${name}.mjs`), result.outputText.replace(/from "\.\/([\w-]+)"/g, 'from "./$1.mjs"'));
  }
  const { emptyTaskCard } = await import(pathToFileURL(join(directory, 'task-card.mjs')));
  const { calculateScore, readinessLevel } = await import(pathToFileURL(join(directory, 'scoring.mjs')));
  const { groundedCard, extractLocally, buildAnalysis } = await import(pathToFileURL(join(directory, 'task-analysis.mjs')));
  const groups = [['context', 'need'], ['dataMaterials'], ['expectedResult'], ['successCriteria'], ['constraints'], ['users'], ['contact', 'interactionFormat']];
  const valid = {
    context: 'The current support process is manual', need: 'Reduce customer request processing time',
    dataMaterials: 'Historical requests in CSV format', expectedResult: 'A working request classification prototype',
    successCriteria: 'Classification accuracy at least 80%', constraints: 'Prototype deadline is two weeks',
    users: 'Support operators', contact: 'owner@example.com', interactionFormat: 'Weekly online feedback meeting',
  };
  const weights = [20, 20, 15, 15, 10, 10, 10];
  for (let mask = 0; mask < 128; mask++) {
    const card = { ...emptyTaskCard }; let expected = 0;
    groups.forEach((fields, index) => { if (mask & (1 << index)) { expected += weights[index]; fields.forEach(field => { card[field] = valid[field]; }); } });
    const rating = calculateScore(card);
    assert.equal(rating.score, expected);
    assert.deepEqual(rating.breakdown.map(item => item.weight), weights);
    assert.equal(rating.breakdown.reduce((total, item) => total + (item.earned ? item.weight : 0), 0), rating.score);
  }
  for (const [score, level] of [[0,'draft'],[39,'draft'],[40,'workable'],[69,'workable'],[70,'ready'],[89,'ready'],[90,'priority'],[100,'priority']]) assert.equal(readinessLevel(score), level);
  assert.equal(calculateScore({ ...emptyTaskCard, context: valid.context, contact: valid.contact }).score, 0, 'paired categories need both fields');
  assert.equal(calculateScore({ ...emptyTaskCard, users: ' \n ' }).score, 0);
  assert.equal(calculateScore({ ...emptyTaskCard, dataMaterials: 'CSV', users: 'x', expectedResult: 'Report' }).score, 0, 'token fields do not earn points');
  assert.equal(calculateScore({ ...emptyTaskCard, successCriteria: 'The result should be better' }).score, 0, 'criteria must be measurable');
  assert.equal(calculateScore({ ...emptyTaskCard, successCriteria: 'Error below 20% on the test set' }).score, 15, 'measurable criteria earn points');
  const description = 'We have high employee turnover and want to use our HR data to identify employees at risk of leaving.';
  const extracted = extractLocally(description);
  assert.equal(extracted.users, ''); assert.equal(extracted.successCriteria, '');
  assert.ok(extracted.need.includes('want'));
  const hallucinated = groundedCard(description, { ...emptyTaskCard, dataMaterials: '10,000 rows of payroll data', successCriteria: 'Accuracy 90%', contact: 'hr@example.com', need: 'want to use our HR data' });
  assert.equal(hallucinated.dataMaterials, ''); assert.equal(hallucinated.successCriteria, ''); assert.equal(hallucinated.contact, '');
  assert.equal(hallucinated.need, 'want to use our HR data');
  for (const locale of ['ru','kk']) {
    for (const card of [extracted, { ...emptyTaskCard, users: 'HR' }, { ...Object.fromEntries(Object.keys(emptyTaskCard).map(key => [key,'Known'])), contact: '' }]) {
      const result = buildAnalysis(card, locale, 'fallback');
      assert.ok(result.questions.length >= 3 && result.questions.length <= 5);
      for (const question of result.questions) { assert.ok(result.missing.includes(question.field)); assert.ok(!result.known.includes(question.field)); assert.ok(question.question); }
      assert.equal(new Set(result.questions.map(question => question.id)).size, result.questions.length);
    }
  }
  const allKnown = Object.fromEntries(Object.keys(emptyTaskCard).map(key => [key, 'Known']));
  assert.equal(buildAnalysis(allKnown, 'ru', 'fallback').questions.length, 0, 'do not ask redundant questions when everything is supplied');
  assert.equal(extractLocally('Users: unknown; Data: CSV; Need: Reduce turnover').users, '');
  assert.equal(extractLocally('Data: ' + 'x'.repeat(6000)).dataMaterials, '', 'overlong extraction stays missing and editable');
  console.log('PASS: 128 score combinations, level boundaries, quote grounding and targeted clarifications.');
} finally {
  await rm(directory, { recursive: true, force: true });
}
