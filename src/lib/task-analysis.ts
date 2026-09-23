import { completeness, emptyTaskCard, taskFields, taskCardSchema, type TaskCard, type TaskField, type Locale, type TaskAnalysis } from "./task-card";
import { taskLabels } from "./task-labels";

const aliases: Record<TaskField, string[]> = {
  title: ["title", "название", "атауы"], industry: ["industry", "topic", "отрасль", "тема", "сала"],
  context: ["context", "контекст"], need: ["need", "problem", "business need", "потребность", "проблема", "қажеттілік"],
  users: ["users", "target users", "пользователи", "целевые пользователи", "пайдаланушылар"],
  dataMaterials: ["data", "materials", "данные", "материалы", "деректер"], constraints: ["constraints", "ограничения", "шектеулер"],
  expectedResult: ["expected result", "result", "результат", "ожидаемый результат", "нәтиже"],
  successCriteria: ["success criteria", "criteria", "критерии успеха", "критерии", "критерийлер"],
  contact: ["contact", "контакт", "байланыс"], interactionFormat: ["communication", "interaction", "формат взаимодействия", "формат связи", "өзара әрекет"],
};
const unknown = /^(?:unknown|not specified|tbd|неизвестно|не указано|неизвестен|белгісіз|—|-)$/iu;
function clean(value: string) { return unknown.test(value.trim()) ? "" : value.trim(); }

// Conservative offline extractor. Only literal spans from the supplied text are retained.
export function extractLocally(description: string): TaskCard {
  const card = { ...emptyTaskCard };
  const narrative: string[] = [];
  for (const line of description.split(/[\n;]+/)) {
    const match = /^\s*([^:]{1,50}):\s*(.*)$/u.exec(line);
    const field = match && taskFields.find(key => aliases[key].includes(match[1].toLowerCase().trim()));
    if (field && match) card[field] = clean(match[2]); else narrative.push(line.trim());
  }
  const text = narrative.filter(Boolean).join("\n");
  const fragments = text.split(/(?<=[.!?])\s+|\s+and\s+(?=(?:want|need)\b)/iu);
  if (!card.context && text) card.context = fragments[0];
  if (!card.need) card.need = fragments.find(part => /\b(?:want|need|require)\b|хотим|нужно|необходимо|қажет/iu.test(part)) ?? "";
  const explicit: Partial<Record<TaskField, RegExp>> = {
    users: /(?:users? (?:are|will be)|used by|пользователи\s+|решением пользуются|пайдаланушылар\s+)/iu,
    dataMaterials: /\b(?:CSV|Excel|dataset|HR data|database)\b|есть данные|доступны данные|деректер бар/iu,
    expectedResult: /(?:deliverable|expected result|результатом (?:будет|должен)|на выходе|күтілетін нәтиже)/iu,
    successCriteria: /(?:accuracy|precision|recall|критерий|точность|дәлдік|MAPE|F1)/iu,
    constraints: /(?:deadline|must not|no cloud|дедлайн|не позднее|нельзя|не должны|шектеу)/iu,
    interactionFormat: /(?:weekly (?:meeting|consultation)|еженедельн\S* (?:встреч|консультац)|апта сайын)/iu,
  };
  for (const [field, pattern] of Object.entries(explicit) as [TaskField, RegExp][]) {
    if (!card[field]) card[field] = fragments.find(part => pattern.test(part)) ?? "";
  }
  if (!card.contact) card.contact = text.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/iu)?.[0] ?? "";
  if (!card.title) card.title = (text || description).slice(0, 100).trim();
  // An overlong extracted span is not reliable structured information; leave it for clarification.
  for (const field of taskFields) if (!taskCardSchema.shape[field].safeParse(card[field]).success) card[field] = "";
  return card;
}

// Reject hallucinated values, even if they pass the JSON schema.
export function groundedCard(description: string, extracted: TaskCard): TaskCard {
  const card = { ...emptyTaskCard };
  for (const field of taskFields) {
    const value = clean(extracted[field]);
    if (value && description.includes(value)) card[field] = value;
  }
  return card;
}

type GeneratedQuestion = Pick<TaskAnalysis["questions"][number], "field" | "question" | "reason">;

export function buildGeneratedAnalysis(card: TaskCard, generated: GeneratedQuestion[]): TaskAnalysis | null {
  const { known, missing } = completeness(card);
  const result: TaskAnalysis["questions"] = [];
  const seen = new Set<string>();
  for (const item of generated) {
    const question = item.question.trim();
    const reason = item.reason.trim();
    const key = question.toLocaleLowerCase();
    if (!missing.some(field => field === item.field) || question.length < 5 || reason.length < 3 || seen.has(key)) continue;
    seen.add(key);
    result.push({ id: `${item.field}-${result.length}`, field: item.field, question, reason });
    if (result.length === 5) break;
  }
  if (missing.length && result.length < 3) return null;
  return { source: "openai", card, known, missing, questions: result };
}

const questions: Record<Locale, Record<TaskField, [string, string, string]>> = {
  ru: {
    title: ["Как назвать задачу?", "Как кратко обозначить её цель?", "Какое название поможет командам найти задачу?"],
    industry: ["К какой теме относится задача?", "В какой отрасли она решается?", "Как описать сферу применения?"],
    context: ["Что происходит сейчас?", "Как сейчас устроен этот процесс?", "Какая ситуация привела к задаче?"],
    need: ["Что именно нужно изменить?", "Какую проблему необходимо решить?", "Какой потребности бизнеса должно отвечать решение?"],
    users: ["Кто будет пользоваться решением?", "Какие роли будут работать с решением?", "Какую работу решение поможет выполнять пользователям?"],
    dataMaterials: ["Какие данные или материалы доступны команде?", "В каком формате доступны данные и материалы?", "Какие примеры или источники можно предоставить?"],
    constraints: ["Какие сроки, технические ограничения или условия доступа нужно учесть?", "Какие ограничения есть у используемых технологий?", "Какие требования к доступу и размещению данных?"],
    expectedResult: ["Какой конкретный результат должна предоставить команда?", "В каком виде нужно передать результат?", "Что должно входить в итоговую работу?"],
    successCriteria: ["По каким измеримым критериям вы примете результат?", "Как вы будете проверять успешность решения?", "Какие показатели и целевые значения важны бизнесу?"],
    contact: ["Кто будет контактным лицом со стороны бизнеса?", "Как связаться с представителем бизнеса?", "Какой контакт можно передать студентам?"],
    interactionFormat: ["Как будут проходить консультации и обратная связь?", "Как часто бизнес сможет общаться с командой?", "В каком формате планируются встречи и проверка результата?"],
  },
  kk: {
    title: ["Міндет қалай аталады?", "Мақсатты қысқаша қалай атауға болады?", "Командаларға қандай атау түсінікті болады?"],
    industry: ["Міндет қай тақырыпқа жатады?", "Қай салада шешіледі?", "Қолдану саласы қандай?"],
    context: ["Қазір не болып жатыр?", "Қазіргі процесс қалай жұмыс істейді?", "Міндетке қандай жағдай себеп болды?"],
    need: ["Нені өзгерту қажет?", "Қандай мәселені шешу керек?", "Шешім бизнестің қандай қажеттілігін өтейді?"],
    users: ["Шешімді кім пайдаланады?", "Қандай рөлдер шешіммен жұмыс істейді?", "Шешім пайдаланушыларға қандай жұмыста көмектеседі?"],
    dataMaterials: ["Қандай деректер мен материалдар қолжетімді?", "Деректер қандай форматта?", "Қандай мысалдар немесе көздер беріледі?"],
    constraints: ["Қандай мерзімдер, техникалық шектеулер және қолжетімділік шарттары бар?", "Технологияларға қандай шектеулер бар?", "Деректерді орналастыруға қандай талаптар бар?"],
    expectedResult: ["Команда қандай нақты нәтиже ұсынуы керек?", "Нәтиже қандай түрде беріледі?", "Соңғы жұмысқа не кіруі тиіс?"],
    successCriteria: ["Нәтижені қандай өлшенетін критерийлермен қабылдайсыз?", "Шешімнің сәттілігін қалай тексересіз?", "Қандай көрсеткіштер мен мақсатты мәндер маңызды?"],
    contact: ["Бизнес тарапынан байланыс тұлғасы кім?", "Бизнес өкілімен қалай байланысуға болады?", "Студенттерге қандай байланыс беріледі?"],
    interactionFormat: ["Кеңестер мен кері байланыс қалай өтеді?", "Бизнес командамен қаншалықты жиі байланысады?", "Кездесулер мен нәтижені тексеру форматы қандай?"],
  },
};
export function buildAnalysis(card: TaskCard, locale: Locale, source: TaskAnalysis["source"]): TaskAnalysis {
  const { known, missing } = completeness(card);
  const priority: Exclude<TaskField, "industry">[] = ["dataMaterials", "users", "expectedResult", "successCriteria", "constraints", "contact", "interactionFormat", "need", "context", "title"];
  const absent = priority.filter(field => missing.includes(field));
  const count = Math.min(5, Math.max(3, absent.length));
  const result: TaskAnalysis["questions"] = [];
  // When nothing is missing, do not manufacture irrelevant questions merely to reach a quota.
  for (let index = 0; absent.length && index < count; index++) {
    const field = absent[index % absent.length];
    const variant = Math.floor(index / absent.length);
    result.push({ id: `${field}-${variant}`, field, question: questions[locale][field][variant],
      reason: `${taskLabels[locale].fields[field]}: ${locale === "ru" ? "не указано" : "көрсетілмеген"}` });
  }
  return { source, card, known, missing, questions: result };
}
