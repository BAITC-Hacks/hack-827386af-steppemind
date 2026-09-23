import { NextResponse } from "next/server";
import { z } from "zod";
import { db, getState, setProposalStatus } from "@/lib/db";
import { calculateScore } from "@/lib/scoring";
import { proposals, tasks } from "@/lib/schema";

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
  return NextResponse.json(getState());
}

export async function POST(request: Request) {
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  if (parsed.data.action === "createTask") {
    const result = calculateScore(parsed.data.task);
    db.insert(tasks).values({ ...parsed.data.task, score: result.score, status: "published", createdAt: new Date().toISOString() }).run();
  } else if (parsed.data.action === "createProposal") {
    const { action: _action, ...proposal } = parsed.data;
    void _action;
    db.insert(proposals).values({ ...proposal, status: "pending", createdAt: new Date().toISOString() }).run();
  } else {
    setProposalStatus(parsed.data.id, parsed.data.status);
  }
  return NextResponse.json(getState());
}
