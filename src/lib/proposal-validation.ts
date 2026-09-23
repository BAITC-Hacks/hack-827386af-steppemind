import { z } from "zod";

const optionalPrototypeUrl = z.string().trim().max(500).refine(value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}, { message: "Prototype URL must be empty or a complete HTTP(S) URL" });

export const createProposalSchema = z.object({
  action: z.literal("createProposal"),
  taskId: z.number().int().positive(),
  teamName: z.string().trim().min(2).max(100),
  solutionIdea: z.string().trim().min(20).max(2_000),
  plan: z.string().trim().min(20).max(4_000),
  estimatedDuration: z.string().trim().min(2).max(100),
  prototypeUrl: optionalPrototypeUrl,
});

export const proposalStatusSchema = z.object({
  action: z.literal("proposalStatus"),
  id: z.number().int().positive(),
  status: z.enum(["accepted", "rejected"]),
});
