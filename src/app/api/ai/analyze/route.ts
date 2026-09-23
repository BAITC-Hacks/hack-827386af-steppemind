import { NextResponse } from "next/server";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { checkMutation, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

const requestSchema = z.object({
  description: z.string().min(10),
  locale: z.enum(["kk", "ru"]),
});

const analysisSchema = z.object({
  questions: z.array(z.object({ field: z.string(), question: z.string(), reason: z.string() })).min(3).max(5),
  card: z.object({
    title: z.string(), industry: z.string(), context: z.string(), need: z.string(), users: z.string(),
    dataMaterials: z.string(), constraints: z.string(), expectedResult: z.string(),
    successCriteria: z.string(), contact: z.string(), interactionFormat: z.string(),
  }),
});

const fallback = {
  kk: [
    ["users", "Бұл шешімді кімдер пайдаланады?", "Мақсатты пайдаланушылар көрсетілмеген."],
    ["expectedResult", "Команда қандай нақты нәтиже ұсынуы керек?", "Күтілетін нәтиже нақтыланбаған."],
    ["successCriteria", "Нәтиженің сәтті болғанын қалай өлшейсіз?", "Өлшенетін критерийлер қажет."],
  ],
  ru: [
    ["users", "Кто будет пользоваться решением?", "Целевые пользователи не указаны."],
    ["expectedResult", "Какой конкретный результат должна предоставить команда?", "Ожидаемый результат не уточнён."],
    ["successCriteria", "Как вы измерите успешность результата?", "Нужны измеримые критерии."],
  ],
} as const;

export async function POST(request: Request) {
  const rejected = checkMutation(request);
  if (rejected) return rejected;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "business") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { description, locale } = parsed.data;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({
      source: "fallback",
      questions: fallback[locale].map(([field, question, reason]) => ({ field, question, reason })),
      card: { title: description.slice(0, 70), industry: "", context: description, need: "", users: "", dataMaterials: "", constraints: "", expectedResult: "", successCriteria: "", contact: "", interactionFormat: "" },
    });
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL });
    const response = await client.responses.parse({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      store: false,
      input: [
        { role: "system", content: `You analyze business task drafts. Respond only in ${locale === "kk" ? "Kazakh" : "Russian"}. Never invent facts. Unknown fields must be empty strings. Ask 3-5 concise questions about missing details. Produce a short editable task card using only supplied facts.` },
        { role: "user", content: description },
      ],
      text: { format: zodTextFormat(analysisSchema, "task_analysis") },
    });
    if (!response.output_parsed) throw new Error("Empty structured response");
    return NextResponse.json({ source: "openai", ...response.output_parsed });
  } catch (error) {
    console.error("OpenAI analysis failed", error);
    return NextResponse.json({
      source: "fallback",
      questions: fallback[locale].map(([field, question, reason]) => ({ field, question, reason })),
      card: { title: description.slice(0, 70), industry: "", context: description, need: "", users: "", dataMaterials: "", constraints: "", expectedResult: "", successCriteria: "", contact: "", interactionFormat: "" },
    });
  }
}
