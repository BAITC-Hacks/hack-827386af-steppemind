import { NextResponse } from "next/server";
import { z } from "zod";
import { checkMutation, getSessionUser } from "@/lib/auth";
import { taskCardSchema } from "@/lib/task-card";
import { confirmDraft, listDrafts, publishDraft, saveDraft, TaskWorkflowError } from "@/lib/task-workflow";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const versioned = { id: z.number().int().positive(), version: z.number().int().positive() };
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("save"), id: versioned.id.optional(), version: versioned.version.optional(),
    card: taskCardSchema, description: z.string().max(12000), language: z.enum(["ru", "kk"]) }),
  z.object({ action: z.literal("confirm"), ...versioned, confirmed: z.literal(true) }),
  z.object({ action: z.literal("publish"), ...versioned }),
]);
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const user = await getSessionUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  if (user.role !== "business") return json({ error: "forbidden" }, 403);
  return json({ tasks: listDrafts(user.id) });
}
export async function POST(request: Request) {
  const rejected = checkMutation(request); if (rejected) return rejected;
  const user = await getSessionUser();
  if (!user) return json({ error: "unauthorized" }, 401);
  if (user.role !== "business") return json({ error: "forbidden" }, 403);
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_data" }, 400);
  try {
    const data = parsed.data;
    const task = data.action === "save" ? saveDraft(user.id, data)
      : data.action === "confirm" ? await confirmDraft(user.id, data.id, data.version)
      : publishDraft(user.id, data.id, data.version);
    return json({ task });
  } catch (error) {
    if (error instanceof TaskWorkflowError) return json({ error: error.code }, error.status);
    console.error("Task workflow failed", error instanceof Error ? error.name : "unknown");
    return json({ error: "save_failed" }, 500);
  }
}
