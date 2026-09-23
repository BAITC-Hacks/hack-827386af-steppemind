import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { localEvaluation, type ScoreEvaluation, type ScorableTask, type ScoreKey } from "./scoring";
import type { Locale } from "./task-card";

const weights: Record<ScoreKey, number> = { contextNeed: 20, data: 20, result: 15, criteria: 15, constraints: 10, users: 10, communication: 10 };
const keys = Object.keys(weights) as ScoreKey[];
const item = z.object({ score: z.number(), reason: z.string() });
const evaluationSchema = z.object({ categories: z.object(Object.fromEntries(keys.map(key => [key, item])) as Record<ScoreKey, typeof item>) });

export async function evaluateTask(card: ScorableTask, locale: Locale): Promise<ScoreEvaluation> {
  const fallback = localEvaluation(card);
  if (!process.env.OPENAI_API_KEY) return fallback;
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL, timeout: 20000, maxRetries: 0 });
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-5.4-nano", store: false,
      input: [
        { role: "system", content: `Evaluate how ready this business task is for a student team. Analyze meaning and specificity, not answer length or keywords. Award partial credit. Categories and maximums: contextNeed 20 (context and business need), data 20 (available data/materials and access), result 15 (concrete deliverable), criteria 15 (verifiable acceptance criteria), constraints 10, users 10, communication 10 (contact and interaction format). Empty or irrelevant information gets 0. Never infer facts absent from the card. For every category return an integer score from 0 through its maximum and a concise explanation in ${locale === "ru" ? "Russian" : "Kazakh"}.` },
        { role: "user", content: JSON.stringify(card) },
      ],
      text: { format: zodTextFormat(evaluationSchema, "task_readiness_evaluation") },
    });
    const categories = response.output_parsed?.categories;
    if (!categories) return fallback;
    const breakdown = keys.map(key => {
      const raw = categories[key];
      return { key, weight: weights[key], score: Math.max(0, Math.min(weights[key], Math.round(raw.score))), reason: raw.reason.trim() };
    });
    if (breakdown.some(entry => !entry.reason)) return fallback;
    return { source: "openai", score: breakdown.reduce((sum, entry) => sum + entry.score, 0), breakdown };
  } catch (error) {
    console.warn("Task scoring used local fallback", error instanceof Error ? error.name : "unknown");
    return fallback;
  }
}
