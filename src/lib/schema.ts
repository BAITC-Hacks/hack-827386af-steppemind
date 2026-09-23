import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ownerId: integer("owner_id"),
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

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Proposal = typeof proposals.$inferSelect;
