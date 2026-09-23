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

const complete = (value: string, minimum = 12) => value.trim().length >= minimum;

export function calculateScore(task: ScorableTask) {
  const breakdown = [
    { key: "contextNeed", weight: 20, earned: complete(task.context) && complete(task.need) },
    { key: "data", weight: 20, earned: complete(task.dataMaterials) },
    { key: "result", weight: 15, earned: complete(task.expectedResult) },
    { key: "criteria", weight: 15, earned: complete(task.successCriteria) },
    { key: "constraints", weight: 10, earned: complete(task.constraints) },
    { key: "users", weight: 10, earned: complete(task.users) },
    { key: "communication", weight: 10, earned: complete(task.contact, 5) && complete(task.interactionFormat, 5) },
  ];
  const score = breakdown.reduce((sum, item) => sum + (item.earned ? item.weight : 0), 0);
  const level = score >= 90 ? "priority" : score >= 70 ? "ready" : score >= 40 ? "workable" : "draft";
  return { score, level, breakdown };
}
