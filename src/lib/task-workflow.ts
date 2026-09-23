import { and, desc, eq } from "drizzle-orm";
import { db, sqlite } from "./db";
import { tasks } from "./schema";
import { evaluateTask } from "./ai-scoring";
import type { ScoreEvaluation } from "./scoring";
import { taskCardSchema, type TaskCard, type TaskDraft, type Locale } from "./task-card";

type StoredTask = typeof tasks.$inferSelect;
export class TaskWorkflowError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}
function ownedTask(ownerId: number, id: number, version?: number) {
  const task = db.select().from(tasks).where(and(eq(tasks.id, id), eq(tasks.ownerId, ownerId))).get();
  if (!task) throw new TaskWorkflowError(404, "task_not_found");
  if (version !== undefined && version !== task.version) throw new TaskWorkflowError(409, "stale_version");
  return task;
}
export function workingCard(task: StoredTask): TaskCard {
  return taskCardSchema.parse(task.draftCard ? JSON.parse(task.draftCard) : task);
}
function asDraft(task: StoredTask): TaskDraft {
  return {
    id: task.id, card: workingCard(task), description: task.description, language: task.language as Locale,
    version: task.version, confirmedVersion: task.confirmedVersion, publishedVersion: task.publishedVersion,
    confirmedScore: task.confirmedScore, previousScore: task.previousScore,
    evaluation: task.scoreEvaluation ? JSON.parse(task.scoreEvaluation) as ScoreEvaluation : null,
    status: task.publishedVersion === task.version ? "published" : task.confirmedVersion === task.version ? "confirmed" : "draft",
  };
}
export function listDrafts(ownerId: number) {
  return db.select().from(tasks).where(eq(tasks.ownerId, ownerId)).orderBy(desc(tasks.id)).all().map(asDraft);
}
export function saveDraft(ownerId: number, input: { id?: number; version?: number; card: TaskCard; description: string; language: Locale }) {
  return sqlite.transaction(() => {
    const values = { draftCard: JSON.stringify(input.card), description: input.description, language: input.language };
    if (input.id === undefined) {
      const task = db.insert(tasks).values({ ...input.card, ...values, ownerId, score: 0, status: "draft", createdAt: new Date().toISOString() }).returning().get();
      return asDraft(task);
    }
    if (input.version === undefined) throw new TaskWorkflowError(400, "version_required");
    const previous = ownedTask(ownerId, input.id, input.version);
    // The live catalog retains its last published snapshot until explicit re-publication.
    const snapshot = previous.status === "published" ? {} : { ...input.card, score: 0, status: "draft" };
    const task = db.update(tasks).set({ ...snapshot, ...values, version: previous.version + 1, confirmedVersion: null, scoreEvaluation: null })
      .where(eq(tasks.id, previous.id)).returning().get();
    return asDraft(task);
  })();
}
export async function confirmDraft(ownerId: number, id: number, version: number) {
  const current = ownedTask(ownerId, id, version);
  if (current.confirmedVersion === version) return asDraft(current);
  const evaluation = await evaluateTask(workingCard(current), current.language as Locale);
  return sqlite.transaction(() => {
    const task = ownedTask(ownerId, id, version);
    if (task.confirmedVersion === version) return asDraft(task);
    const score = evaluation.score;
    const updated = db.update(tasks).set({ confirmedVersion: version, previousScore: task.confirmedScore, confirmedScore: score,
      scoreEvaluation: JSON.stringify(evaluation),
      ...(task.status === "published" ? {} : { score, status: "confirmed" }),
    }).where(eq(tasks.id, id)).returning().get();
    return asDraft(updated);
  })();
}
export function publishDraft(ownerId: number, id: number, version: number) {
  return sqlite.transaction(() => {
    const task = ownedTask(ownerId, id, version);
    if (task.confirmedVersion !== version) throw new TaskWorkflowError(409, "confirmation_required");
    const card = workingCard(task);
    if (card.title.trim().length < 3) throw new TaskWorkflowError(400, "title_required");
    const score = task.confirmedScore;
    const updated = db.update(tasks).set({ ...card, score, status: "published", publishedVersion: version })
      .where(eq(tasks.id, id)).returning().get();
    return asDraft(updated);
  })();
}
