export type ScorableTask = {
  context: string;
  need: string;
  users: string;
  dataMaterials: string;
  constraints: string;
  expectedResult: string;
  successCriteria: string;
  contact: string;
  interactionFormat: string;
};

// A confirmed, non-empty value counts. Short valid answers (e.g. "HR") are not penalized.
const complete = (value: string) => value.trim().length > 0;

export function readinessLevel(score: number): "draft" | "workable" | "ready" | "priority" {
  return score >= 90 ? "priority" : score >= 70 ? "ready" : score >= 40 ? "workable" : "draft";
}

export function calculateScore(task: ScorableTask) {
  const breakdown = [
    { key: "contextNeed", weight: 20, earned: complete(task.context) && complete(task.need) },
    { key: "data", weight: 20, earned: complete(task.dataMaterials) },
    { key: "result", weight: 15, earned: complete(task.expectedResult) },
    { key: "criteria", weight: 15, earned: complete(task.successCriteria) },
    { key: "constraints", weight: 10, earned: complete(task.constraints) },
    { key: "users", weight: 10, earned: complete(task.users) },
    { key: "communication", weight: 10, earned: complete(task.contact) && complete(task.interactionFormat) },
  ] as const;
  const score = breakdown.reduce((sum, item) => sum + (item.earned ? item.weight : 0), 0);
  const level = readinessLevel(score);
  return { score, level, breakdown };
}
