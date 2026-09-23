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

const normalized = (value: string) => value.trim().replace(/\s+/g, " ");
const words = (value: string) => normalized(value).match(/[\p{L}\p{N}]+(?:[-'][\p{L}\p{N}]+)*/gu) ?? [];

function substantial(value: string, minimumCharacters: number, minimumWords: number) {
  const text = normalized(value);
  return text.length >= minimumCharacters && words(text).length >= minimumWords;
}

// Success criteria need an observable threshold, metric, time bound, or explicit acceptance condition.
const measurable = (value: string) => substantial(value, 12, 2) && /(?:\d|%|процент|пайыз|percent|не\s+(?:менее|более)|кемінде|аспайтын|at\s+(?:least|most)|точност|accuracy|ошиб|error|срок|мерзім|deadline|дн(?:я|ей)|күн|week|апт|час|сағат|minute|минут|принят|қабылдан|accept)/iu.test(value);

export function readinessLevel(score: number): "draft" | "workable" | "ready" | "priority" {
  return score >= 90 ? "priority" : score >= 70 ? "ready" : score >= 40 ? "workable" : "draft";
}

export function calculateScore(task: ScorableTask) {
  const breakdown = [
    { key: "contextNeed", weight: 20, earned: substantial(task.context, 18, 3) && substantial(task.need, 18, 3) },
    { key: "data", weight: 20, earned: substantial(task.dataMaterials, 12, 2) },
    { key: "result", weight: 15, earned: substantial(task.expectedResult, 15, 3) },
    { key: "criteria", weight: 15, earned: measurable(task.successCriteria) },
    { key: "constraints", weight: 10, earned: substantial(task.constraints, 12, 2) },
    { key: "users", weight: 10, earned: substantial(task.users, 5, 1) },
    { key: "communication", weight: 10, earned: substantial(task.contact, 5, 1) && substantial(task.interactionFormat, 10, 2) },
  ] as const;
  const score = breakdown.reduce((sum, item) => sum + (item.earned ? item.weight : 0), 0);
  const level = readinessLevel(score);
  return { score, level, breakdown };
}
