import { NextResponse } from "next/server";
import { z } from "zod";
import { db, getState, setProposalStatus } from "@/lib/db";
import { calculateScore } from "@/lib/scoring";
import { proposals, tasks } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { checkMutation, getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const taskSchema = z.object({
  action: z.literal("createTask"),
  task: z.object({
    title: z.string().min(3), industry: z.string().min(2), context: z.string(), need: z.string(),
    users: z.string(), dataMaterials: z.string(), constraints: z.string(), expectedResult: z.string(),
    successCriteria: z.string(), contact: z.string(), interactionFormat: z.string(),
    language: z.enum(["kk", "ru"]),
  }),
});

const proposalSchema = z.object({
  action: z.literal("createProposal"), taskId: z.number().int(), teamName: z.string().min(2),
  solutionIdea: z.string().min(10), plan: z.string().min(10), estimatedDuration: z.string().min(2),
  prototypeUrl: z.string(),
});

const statusSchema = z.object({
  action: z.literal("proposalStatus"), id: z.number().int(), status: z.enum(["accepted", "rejected"]),
});

const actionSchema = z.discriminatedUnion("action", [taskSchema, proposalSchema, statusSchema]);

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(getState(user), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rejected = checkMutation(request);
  if (rejected) return rejected;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  if (parsed.data.action === "createTask") {
    if (user.role !== "business") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const result = calculateScore(parsed.data.task);
    db.insert(tasks).values({ ...parsed.data.task, ownerId: user.id, score: result.score, status: "published", createdAt: new Date().toISOString() }).run();
  } else if (parsed.data.action === "createProposal") {
    if (user.role !== "student") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    const task = db.select().from(tasks).where(eq(tasks.id, parsed.data.taskId)).get();
    if (!task || task.status !== "published") return NextResponse.json({ error: "not_found" }, { status: 404 });
    const { action: _action, ...proposal } = parsed.data;
    void _action;
    db.insert(proposals).values({ ...proposal, studentId: user.id, status: "pending", createdAt: new Date().toISOString() }).run();
  } else {
    if (user.role !== "business") return NextResponse.json({ error: "forbidden" }, { status: 403 });
    if (!setProposalStatus(parsed.data.id, parsed.data.status, user.id)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }
  return NextResponse.json(getState(user), { headers: { "Cache-Control": "no-store" } });
}
