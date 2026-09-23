import Database from "better-sqlite3";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { proposals, tasks, type NewTask } from "./schema";
import type { SessionUser } from "./auth-types";

export const sqlite = new Database(process.env.DATABASE_PATH ?? "steppemind.db");
sqlite.pragma("journal_mode = WAL");
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, industry TEXT NOT NULL,
    context TEXT NOT NULL, need TEXT NOT NULL, users TEXT NOT NULL, data_materials TEXT NOT NULL,
    constraints TEXT NOT NULL, expected_result TEXT NOT NULL, success_criteria TEXT NOT NULL,
    contact TEXT NOT NULL, interaction_format TEXT NOT NULL, score INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'published', language TEXT NOT NULL DEFAULT 'ru', created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, team_name TEXT NOT NULL,
    solution_idea TEXT NOT NULL, plan TEXT NOT NULL, estimated_duration TEXT NOT NULL,
    prototype_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL
  );
`);

// Additive migration: existing demo records remain unowned, never assigned to a new account.
sqlite.transaction(() => {
  const taskColumns = sqlite.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  if (!taskColumns.some(column => column.name === "owner_id")) sqlite.exec("ALTER TABLE tasks ADD COLUMN owner_id INTEGER");
  const proposalColumns = sqlite.prepare("PRAGMA table_info(proposals)").all() as { name: string }[];
  if (!proposalColumns.some(column => column.name === "student_id")) sqlite.exec("ALTER TABLE proposals ADD COLUMN student_id INTEGER");
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      login TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('business', 'student')),
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      account_id INTEGER NOT NULL REFERENCES accounts(id),
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS auth_attempts (
      login TEXT PRIMARY KEY,
      count INTEGER NOT NULL,
      resets_at INTEGER NOT NULL
    );
  `);
})();

export const db = drizzle(sqlite);

const seedTasks: NewTask[] = [
  {
    title: "Клиенттік өтінімдерді автоматты сұрыптау",
    industry: "Қаржы",
    context: "Қолдау қызметі күн сайын жүздеген өтінімді қолмен сұрыптайды.",
    need: "Өтінімдерді тақырып пен басымдық бойынша автоматты бөлу қажет.",
    users: "Банк қолдау қызметінің операторлары.",
    dataMaterials: "Анонимделген 2 000 тарихи өтінім CSV форматында бар.",
    constraints: "Деректер жергілікті ортадан шықпауы тиіс. MVP мерзімі — 2 апта.",
    expectedResult: "Өтінім санатын және басымдығын ұсынатын жұмыс прототипі.",
    successCriteria: "Тест жиынында санат дәлдігі кемінде 80 пайыз.",
    contact: "Айдана, product@example.kz",
    interactionFormat: "Аптасына екі рет 30 минуттық онлайн кездесу.",
    score: 100,
    language: "kk",
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Прогнозирование спроса для сети кофеен",
    industry: "Ритейл",
    context: "Списания продуктов растут из-за ручного планирования закупок.",
    need: "Нужен прогноз спроса по точкам и категориям товаров.",
    users: "Управляющие 12 кофеен и отдел закупок.",
    dataMaterials: "Есть продажи за 18 месяцев и календарь акций.",
    constraints: "Прототип должен работать на ноутбуке без облачной инфраструктуры.",
    expectedResult: "Дашборд с прогнозом на семь дней и рекомендацией закупки.",
    successCriteria: "Ошибка прогноза ниже 20 процентов на контрольном месяце.",
    contact: "Мария, demo@example.kz",
    interactionFormat: "Одна консультация в неделю в Google Meet.",
    score: 100,
    language: "ru",
    status: "published",
    createdAt: new Date().toISOString(),
  },
  {
    title: "Анализ отзывов клиентов",
    industry: "Сервисы",
    context: "Отзывы читаются вручную и важные проблемы обнаруживаются поздно.",
    need: "Хотим видеть основные темы и динамику тональности.",
    users: "Команда клиентского опыта.",
    dataMaterials: "",
    constraints: "",
    expectedResult: "Отчёт с темами отзывов.",
    successCriteria: "",
    contact: "Команда CX",
    interactionFormat: "Чат по будням",
    score: 40,
    language: "ru",
    status: "published",
    createdAt: new Date().toISOString(),
  },
];

if ((sqlite.prepare("SELECT COUNT(*) AS count FROM tasks").get() as { count: number }).count === 0) {
  db.insert(tasks).values(seedTasks).run();
  db.insert(proposals).values({
    taskId: 1,
    teamName: "Data Nomads",
    solutionIdea: "Көптілді өтінім классификаторы және операторға арналған түсіндірме.",
    plan: "Деректерді талдау, baseline, интерфейс, тестілеу.",
    estimatedDuration: "2 апта",
    prototypeUrl: "https://example.com/demo",
    status: "pending",
    createdAt: new Date().toISOString(),
  }).run();
}

export function getState(user: SessionUser) {
  const visibleProposals = user.role === "business"
    ? db.select({ proposal: proposals }).from(proposals).innerJoin(tasks, eq(proposals.taskId, tasks.id))
      .where(eq(tasks.ownerId, user.id)).orderBy(desc(proposals.id)).all().map(row => row.proposal)
    : db.select().from(proposals).where(eq(proposals.studentId, user.id)).orderBy(desc(proposals.id)).all();
  const counts = sqlite.prepare("SELECT task_id, COUNT(*) AS count FROM proposals GROUP BY task_id").all() as { task_id: number; count: number }[];
  return {
    tasks: db.select().from(tasks).where(eq(tasks.status, "published")).orderBy(desc(tasks.score)).all(),
    proposals: visibleProposals,
    proposalCounts: Object.fromEntries(counts.map(row => [row.task_id, row.count])),
  };
}

export function setProposalStatus(id: number, status: "accepted" | "rejected", ownerId: number) {
  const owned = db.select({ id: proposals.id }).from(proposals).innerJoin(tasks, eq(proposals.taskId, tasks.id))
    .where(and(eq(proposals.id, id), eq(tasks.ownerId, ownerId))).get();
  if (!owned) return false;
  db.update(proposals).set({ status }).where(eq(proposals.id, id)).run();
  return true;
}
