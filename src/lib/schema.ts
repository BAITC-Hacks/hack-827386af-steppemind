import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("owner_id"),
  draftCard: text("draft_card"),
  description: text("description").notNull().default(""),
  version: integer("version").notNull().default(1),
  confirmedVersion: integer("confirmed_version"),
  publishedVersion: integer("published_version"),
  confirmedScore: integer("confirmed_score").notNull().default(0),
  previousScore: integer("previous_score").notNull().default(0),
  title: text("title").notNull(),
  industry: text("industry").notNull(),
  context: text("context").notNull(),
  need: text("need").notNull(),
  users: text("users").notNull(),
  dataMaterials: text("data_materials").notNull(),
  constraints: text("constraints").notNull(),
  expectedResult: text("expected_result").notNull(),
  successCriteria: text("success_criteria").notNull(),
  contact: text("contact").notNull(),
  interactionFormat: text("interaction_format").notNull(),
  score: integer("score").notNull(),
  status: text("status").notNull().default("published"),
  language: text("language").notNull().default("ru"),
  createdAt: text("created_at").notNull(),
});

export const proposals = sqliteTable("proposals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  studentId: integer("student_id"),
  taskId: integer("task_id").notNull(),
  teamName: text("team_name").notNull(),
  solutionIdea: text("solution_idea").notNull(),
  plan: text("plan").notNull(),
  estimatedDuration: text("estimated_duration").notNull(),
  prototypeUrl: text("prototype_url").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

export type Task = Omit<typeof tasks.$inferSelect,
  "draftCard" | "description" | "version" | "confirmedVersion" | "publishedVersion" | "confirmedScore" | "previousScore">;
export type NewTask = typeof tasks.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
