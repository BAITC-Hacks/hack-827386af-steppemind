import { randomBytes, scryptSync } from "node:crypto";
import type Database from "better-sqlite3";
import { calculateScore } from "./scoring";
import type { TaskCard } from "./task-card";

const DEMO_PASSWORD = "Demo2026!";
const createdAt = "2026-01-15T09:00:00.000Z";

const publishedCards: TaskCard[] = [
  { title: "Прогноз загрузки городских автобусов", industry: "Транспорт", context: "Пассажиропоток распределяется неравномерно, а расписание корректируется вручную.", need: "Нужно прогнозировать загрузку маршрутов по часам и остановкам.", users: "Диспетчеры транспортной компании и специалисты отдела планирования.", dataMaterials: "Обезличенные данные валидаторов за 12 месяцев, расписание и календарь праздников в CSV.", constraints: "Прототип должен работать локально; персональные данные пассажиров использовать нельзя.", expectedResult: "Дашборд с прогнозом загрузки на семь дней и предупреждениями о перегрузке.", successCriteria: "Средняя ошибка прогноза не выше 15% на контрольных четырёх неделях.", contact: "Данияр, transport-demo@example.kz", interactionFormat: "Еженедельная встреча в Google Meet и вопросы в Telegram.", },
  { title: "Раннее выявление риска пропусков", industry: "Образование", context: "Преподаватели проверяют посещаемость вручную, поэтому проблемы обнаруживаются слишком поздно.", need: "Нужен инструмент для раннего выявления студентов с риском частых пропусков.", users: "Сотрудники деканата, кураторы групп и преподаватели.", dataMaterials: "Обезличенная история посещаемости из электронного журнала за два семестра.", constraints: "Работа на обычном ноутбуке без облака; данные студентов должны быть обезличены.", expectedResult: "Локальный дашборд с уровнями риска, фильтрами по группам и объяснением факторов.", successCriteria: "Выявлять не менее 80% студентов группы риска; отчёт формируется не более 30 секунд.", contact: "Анна, education-demo@example.kz", interactionFormat: "Одна онлайн-встреча в неделю и обратная связь в Telegram.", },
  { title: "Оптимизация маршрутов доставки", industry: "Логистика", context: "Маршруты курьеров составляются вручную, из-за чего часть заказов доставляется с опозданием.", need: "Нужно планировать маршруты и точнее прогнозировать время прибытия заказа.", users: "Диспетчеры, курьеры и клиенты службы доставки.", dataMaterials: "История заказов, координаты адресов и длительность поездок за девять месяцев.", constraints: "До 50 курьеров, не более восьми заказов на курьера, работа в пределах Алматы.", expectedResult: "Интерфейс диспетчера с рекомендуемыми маршрутами и расчётом ETA.", successCriteria: "Не менее 90% заказов доставляются за 60 минут; ошибка ETA не превышает 10 минут.", contact: "Руслан, delivery-demo@example.kz", interactionFormat: "Две короткие консультации в неделю через Zoom.", },
  { title: "Контроль товарных остатков аптек", industry: "Ритейл", context: "Популярные товары заканчиваются, а позиции с низким спросом долго остаются на складе.", need: "Нужно рекомендовать объём закупки для каждой аптеки и категории товаров.", users: "Управляющие аптек и отдел централизованных закупок.", dataMaterials: "Продажи и остатки 15 аптек за 18 месяцев, календарь акций и праздников.", constraints: "Решение не должно передавать данные во внешние системы и должно работать локально.", expectedResult: "Семидневный прогноз спроса и таблица рекомендуемых закупок по точкам.", successCriteria: "Ошибка прогноза ниже 20%, а число случаев отсутствия товара снижено минимум на 15%.", contact: "Мария, pharmacy-demo@example.kz", interactionFormat: "Еженедельная демонстрация и письменные комментарии в общем чате.", },
  { title: "Классификация обращений клиентов", industry: "Финансы", context: "Операторы ежедневно вручную распределяют сотни обращений между отделами.", need: "Нужно автоматически определять тему, приоритет и ответственное подразделение.", users: "Операторы первой линии и руководители службы поддержки.", dataMaterials: "2 500 обезличенных обращений с историческими категориями в формате JSON.", constraints: "Данные не покидают локальный контур; срок создания прототипа — три недели.", expectedResult: "API и демонстрационный интерфейс с категорией, приоритетом и объяснением результата.", successCriteria: "Точность категории не ниже 85%, обработка одного обращения занимает менее двух секунд.", contact: "Айдана, support-demo@example.kz", interactionFormat: "Консультации по вторникам и пятницам в Microsoft Teams.", },
];

const draftCards: TaskCard[] = [
  { title: "Сокращение очередей", industry: "Сервисы", context: "В часы пик клиенты долго ждут обслуживания.", need: "", users: "", dataMaterials: "", constraints: "", expectedResult: "", successCriteria: "", contact: "", interactionFormat: "" },
  { title: "Анализ отзывов", industry: "Гостеприимство", context: "Отзывы читаются вручную.", need: "Хотим быстрее находить повторяющиеся жалобы.", users: "Команда клиентского опыта.", dataMaterials: "Отзывы из двух площадок.", constraints: "", expectedResult: "Отчёт по темам.", successCriteria: "", contact: "", interactionFormat: "" },
  { title: "Прогноз энергопотребления", industry: "Энергетика", context: "Пиковые нагрузки сложно планировать заранее.", need: "Прогнозировать потребление на следующие сутки.", users: "Диспетчеры объектов.", dataMaterials: "Почасовые показания счётчиков за год.", constraints: "Только локальная обработка.", expectedResult: "График прогноза по объектам.", successCriteria: "", contact: "Инженер проекта.", interactionFormat: "" },
  { title: "Поиск дефектов упаковки", industry: "Производство", context: "Контроль упаковки выполняется выборочно вручную.", need: "Обнаруживать повреждения на изображениях с линии.", users: "Операторы контроля качества.", dataMaterials: "3 000 размеченных фотографий.", constraints: "Ответ модели до одной секунды.", expectedResult: "Прототип классификатора и экран проверки.", successCriteria: "Recall дефектов не ниже 90%.", contact: "Олег, factory-demo@example.kz", interactionFormat: "", },
  { title: "Помощник для библиотечного каталога", industry: "Культура", context: "Посетителям сложно находить литературу по свободному описанию темы.", need: "Предлагать релевантные книги по текстовому запросу.", users: "Посетители и библиотекари.", dataMaterials: "Каталог из 25 000 библиографических записей.", constraints: "Без использования персональной истории чтения.", expectedResult: "Поисковый интерфейс с объяснением рекомендаций.", successCriteria: "Не менее 70% рекомендаций признаны релевантными в тесте с библиотекарями.", contact: "Сауле, library-demo@example.kz", interactionFormat: "Еженедельная встреча и комментарии в Notion.", },
];

const teams = [
  { login: "demo_student_1", name: "Data Nomads", interests: "Прогнозирование, городская мобильность", skills: "Анализ данных, временные ряды, визуализация", technologies: "Python, pandas, LightGBM, React" },
  { login: "demo_student_2", name: "EduVision", interests: "Образовательные технологии, социальные проекты", skills: "Машинное обучение, UX-исследования, аналитика", technologies: "Python, scikit-learn, FastAPI, Next.js" },
  { login: "demo_student_3", name: "RouteLab", interests: "Логистика, оптимизация, геоаналитика", skills: "Исследование операций, карты, backend", technologies: "Python, OR-Tools, PostgreSQL, MapLibre" },
  { login: "demo_student_4", name: "Retail Pulse", interests: "Ритейл, прогноз спроса, BI", skills: "Прогнозирование, продуктовая аналитика, дизайн дашбордов", technologies: "Python, CatBoost, SQL, Power BI" },
  { login: "demo_student_5", name: "NLP Steppe", interests: "Обработка текста, финтех, поддержка клиентов", skills: "NLP, классификация, MLOps", technologies: "Python, transformers, FastAPI, Docker" },
];

const proposals = [
  { idea: "Построим прогноз по маршрутам и временным интервалам с учётом календаря и покажем наиболее загруженные участки.", plan: "Аудит данных, baseline, валидация по времени, разработка дашборда и демонстрация.", duration: "4 недели", url: "https://example.com/data-nomads" },
  { idea: "Создадим объяснимую модель риска пропусков и интерфейс для кураторов без отображения персональных данных.", plan: "Обезличивание, анализ признаков, обучение модели, интерфейс групп, тестирование метрик.", duration: "4 недели", url: "https://example.com/eduvision" },
  { idea: "Используем оптимизационную модель маршрутов и отдельный прогноз ETA с пересчётом при появлении нового заказа.", plan: "Подготовка геоданных, прототип оптимизатора, ETA-модель, интерфейс диспетчера, нагрузочный тест.", duration: "5 недель", url: "https://example.com/routelab" },
  { idea: "Разработаем прогноз спроса по каждой точке и преобразуем его в понятные рекомендации по объёму заказа.", plan: "Исследование продаж, backtesting, модель прогноза, правила закупки, локальный дашборд.", duration: "4 недели", url: "https://example.com/retail-pulse" },
  { idea: "Настроим многоуровневую классификацию темы и приоритета с объяснением ключевых фрагментов обращения.", plan: "Аудит разметки, baseline, обучение, оценка ошибок, API и демонстрационный интерфейс.", duration: "3 недели", url: "https://example.com/nlp-steppe" },
];

function passwordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt:${salt}:${key.toString("hex")}`;
}

function account(sqlite: Database.Database, login: string, name: string, role: "business" | "student") {
  const existing = sqlite.prepare("SELECT id, role FROM accounts WHERE login = ?").get(login) as { id: number; role: string } | undefined;
  if (existing) {
    if (existing.role !== role) throw new Error(`Demo login ${login} has an incompatible role`);
    return existing.id;
  }
  sqlite.prepare(`INSERT INTO accounts (login, name, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(login) DO NOTHING`).run(login, name, role, passwordHash(DEMO_PASSWORD), Date.parse(createdAt));
  const row = sqlite.prepare("SELECT id, role FROM accounts WHERE login = ?").get(login) as { id: number; role: string };
  return row.id;
}

function insertTask(sqlite: Database.Database, ownerId: number, card: TaskCard, index: number, published: boolean) {
  const marker = `[demo:${published ? "published" : "draft"}:${index + 1}]`;
  const existing = sqlite.prepare("SELECT id FROM tasks WHERE description = ?").get(marker) as { id: number } | undefined;
  if (existing) return existing.id;
  const score = published ? calculateScore(card).score : 0;
  const result = sqlite.prepare(`INSERT INTO tasks
    (owner_id, draft_card, description, version, confirmed_version, published_version, confirmed_score, previous_score,
     title, industry, context, need, users, data_materials, constraints, expected_result, success_criteria, contact,
     interaction_format, score, status, language, created_at)
    VALUES (?, ?, ?, 1, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ru', ?)`)
    .run(ownerId, JSON.stringify(card), marker, published ? 1 : null, published ? 1 : null, score,
      card.title, card.industry, card.context, card.need, card.users, card.dataMaterials, card.constraints,
      card.expectedResult, card.successCriteria, card.contact, card.interactionFormat, score,
      published ? "published" : "draft", createdAt);
  return Number(result.lastInsertRowid);
}

export function seedDemoData(sqlite: Database.Database) {
  if (process.env.SEED_DEMO_DATA === "0") return;
  sqlite.transaction(() => {
    const businessId = account(sqlite, "demo_business", "Steppe Demo Business", "business");
    const publishedIds = publishedCards.map((card, index) => insertTask(sqlite, businessId, card, index, true));
    draftCards.forEach((card, index) => insertTask(sqlite, businessId, card, index, false));
    teams.forEach((team, index) => {
      const studentId = account(sqlite, team.login, team.name, "student");
      sqlite.prepare(`INSERT INTO team_profiles (student_id, name, interests, skills, technologies, created_at)
        VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(student_id) DO NOTHING`)
        .run(studentId, team.name, team.interests, team.skills, team.technologies, createdAt);
      const proposal = proposals[index];
      const taskId = publishedIds[index];
      const exists = sqlite.prepare("SELECT id FROM proposals WHERE student_id = ? AND task_id = ? AND team_name = ?")
        .get(studentId, taskId, team.name);
      if (!exists) sqlite.prepare(`INSERT INTO proposals
        (student_id, task_id, team_name, solution_idea, plan, estimated_duration, prototype_url, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)`)
        .run(studentId, taskId, team.name, proposal.idea, proposal.plan, proposal.duration, proposal.url, createdAt);
    });
  }).immediate();
}

export const demoCredentials = { business: "demo_business", students: teams.map(team => team.login), password: DEMO_PASSWORD };
