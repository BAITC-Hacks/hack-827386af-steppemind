import { z } from "zod";

export const createProposalSchema = z.object({
  action: z.literal("createProposal"),
  taskId: z.number().int().positive(),
  teamName: z.string().trim().min(2).max(100),
  solutionIdea: z.string().trim().min(20).max(2_000),
  plan: z.string().trim().min(20).max(4_000),
  estimatedDuration: z.string().trim().min(2).max(100),
  prototypeUrl: z.string().trim().url().max(500).refine(value => value.startsWith("https://"), {
    message: "Prototype URL must use HTTPS",
  }),
});

export const proposalStatusSchema = z.object({
  action: z.literal("proposalStatus"),
  id: z.number().int().positive(),
  status: z.enum(["accepted", "rejected"]),
});
