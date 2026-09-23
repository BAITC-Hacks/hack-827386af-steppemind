# SteppeMind

Working bilingual MVP for the AI Sana hackathon case. Businesses improve and score task briefs; student teams browse tasks and submit proposals; businesses manually accept or reject them.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The application works without an API key by using localized fallback questions. Add the hackathon key to `.env.local` to enable OpenAI analysis:

```env
OPENAI_API_KEY=your_key
OPENAI_MODEL=model_allowed_by_the_organizers
```

If the organizers provide a proxy endpoint, also set `OPENAI_BASE_URL`.

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- OpenAI Responses API with Zod structured outputs
- SQLite, better-sqlite3, and Drizzle ORM
- Lucide icons

## Demo flow

1. Start as **Бизнес** and choose **Создать задачу**.
2. Enter a weak task description and run AI analysis.
3. Answer at least three clarification questions.
4. Edit the generated card and watch the deterministic readiness score change.
5. Confirm and publish the task.
6. Switch to **Команда**, open the task, and submit a proposal.
7. Switch back to **Бизнес**, open **Предложения**, and accept or reject it.
8. Use the language control to repeat the interface in Kazakh.

## Readiness score

- Context and need: 20
- Data and materials: 20
- Expected result: 15
- Success criteria: 15
- Constraints: 10
- Users: 10
- Business communication: 10

Score levels are 0–39 draft, 40–69 workable, 70–89 ready, and 90–100 priority. Low scores never hide a task or prevent proposals.

The SQLite file and tables are created automatically on first launch and seeded with Kazakh and Russian examples.

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete plan and requirements mapping.
