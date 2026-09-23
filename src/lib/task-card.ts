import { z } from "zod";
import type { ScoreEvaluation } from "./scoring";

export const taskCardSchema = z.object({
  title: z.string().max(500), industry: z.string().max(200), context: z.string().max(12000),
  need: z.string().max(12000), users: z.string().max(5000), dataMaterials: z.string().max(5000),
  constraints: z.string().max(5000), expectedResult: z.string().max(5000),
  successCriteria: z.string().max(5000), contact: z.string().max(2000), interactionFormat: z.string().max(5000),
});
export type TaskCard = z.infer<typeof taskCardSchema>;
export type TaskField = keyof TaskCard;
export type Locale = "ru" | "kk";
export const taskFields = Object.keys(taskCardSchema.shape) as TaskField[];
export const requiredTaskFields = taskFields.filter(field => field !== "industry");
export const emptyTaskCard: TaskCard = {
  title: "", industry: "", context: "", need: "", users: "", dataMaterials: "", constraints: "",
  expectedResult: "", successCriteria: "", contact: "", interactionFormat: "",
};
export function completeness(card: TaskCard) {
  return {
    known: requiredTaskFields.filter(field => card[field].trim()),
    missing: requiredTaskFields.filter(field => !card[field].trim()),
  };
}
export type Clarification = { id: string; field: TaskField; question: string; reason: string };
export type TaskAnalysis = { source: "openai" | "fallback"; card: TaskCard; known: TaskField[]; missing: TaskField[]; questions: Clarification[] };
export type TaskDraft = {
  id: number; card: TaskCard; description: string; language: Locale; version: number;
  confirmedVersion: number | null; publishedVersion: number | null; confirmedScore: number;
  previousScore: number; evaluation: ScoreEvaluation | null; status: "draft" | "confirmed" | "published";
};
