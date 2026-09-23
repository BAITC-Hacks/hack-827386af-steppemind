# SteppeMind — 5-Hour MVP Implementation Guide

## 1. Product Goal

Build a working web application where:

1. A business representative enters a weak initial task description.
2. AI identifies missing information and asks at least three relevant questions.
3. The answers become an editable business-task card.
4. The system calculates a transparent readiness score from 0 to 100.
5. The business confirms and publishes the task in a public catalog.
6. A student team browses the catalog and submits a proposal.
7. The business manually accepts or rejects proposals.

The main gamification is the task readiness score. AI must assist with clarification, but it must not invent facts or choose a team.

## 2. Recommended Stack

| Area | Technology | Reason |
| --- | --- | --- |
| Full-stack framework | Next.js App Router + TypeScript | One project for UI and server routes; fast to build and deploy |
| UI | shadcn/ui | Ready-made accessible components |
| Styling | Tailwind CSS | Fast layout and visual iteration |
| AI | OpenAI JavaScript SDK + Responses API | Structured clarification and card generation |
| Validation | Zod | Validates forms and AI JSON responses |
| Localization | `next-intl` | Kazakh and Russian interfaces with shared translation keys |
| Database | SQLite | Local, zero configuration, sufficient for the MVP |
| ORM | Drizzle ORM | Typed schema and straightforward SQLite queries |
| Icons | Lucide React | Included naturally with shadcn/ui |
| Package manager | npm | Already available and avoids extra setup |

Do not add a separate backend, Docker, vector database, real-time chat, file storage, or production authentication during the five-hour build.

## 3. Proposed Architecture

```text
Browser
   |
   v
Next.js App Router
   |-- React pages and shadcn/ui components
   |-- Server Actions / Route Handlers
   |-- OpenAI integration (server only)
   |
   v
SQLite database through Drizzle ORM
```

Keep `OPENAI_API_KEY` only in `.env.local`. Never expose it through a `NEXT_PUBLIC_` variable or call OpenAI directly from the browser.

## 4. Scope Decisions

### Build

- Business and student role switcher instead of registration.
- Complete Kazakh and Russian interfaces with a persistent language switcher.
- Draft input and AI clarification flow.
- Editable task-card form with manual confirmation.
- Deterministic score calculation with a visible breakdown.
- Catalog sorted by score with topic/readiness filters.
- Team proposal form.
- Business proposal review with accept/reject controls.
- At least five synthetic tasks, five teams, and five proposals.
- API error handling and a local fallback clarification result.

### Do not build

- Registration, password recovery, OAuth, or complex authorization.
- Chat, notifications, calendar, or uploads.
- Vector search or custom ML training.
- Automatic team assignment.
- Full project management after a proposal is accepted.
- Extensive mobile optimization or production infrastructure.

## 5. Application Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing page with “Business” and “Student team” demo entry points |
| `/business/tasks/new` | Initial draft, clarification questions, editable card, and score |
| `/business/tasks/[id]` | Published task and received proposals for its owner |
| `/catalog` | Public task catalog, sorting, and filtering |
| `/tasks/[id]` | Public task details and proposal form |
| `/team/proposals` | Proposals submitted by the current demo team |

Use a simple role switcher stored in a cookie or URL parameter. Seed one demo business and one demo team as the active identities.

## 6. Kazakh and Russian Interfaces

The entire business and student experience must be available in both Kazakh and Russian. Use `next-intl`, locale-prefixed routes such as `/kk/catalog` and `/ru/catalog`, and a visible `LanguageSwitcher` in the application header.

Implementation rules:

- Store translations in `messages/kk.json` and `messages/ru.json`.
- Translate navigation, headings, buttons, field labels, placeholders, validation messages, loading and empty states, filters, readiness levels, score explanations, and proposal statuses.
- Keep internal field names language-neutral and translate only displayed labels.
- Persist the selected locale in a cookie across navigation and refreshes.
- Format dates using `kk-KZ` or `ru-KZ` according to the active locale.
- Preserve user-authored task content in its original language; do not translate it automatically.
- Pass `locale: "kk" | "ru"` to the AI endpoint and require all questions and generated card text in that language.
- Provide localized deterministic fallback questions for both languages.
- Seed at least one Kazakh task and one Russian task.
- Test the complete required journey once in each language.

Suggested structure:

```text
messages/
  kk.json
  ru.json
src/i18n/
  routing.ts
  request.ts
```

Group translation keys by `common`, `navigation`, `taskBuilder`, `score`, `catalog`, and `proposal`.

## 7. Database Model

### `businesses`

- `id`
- `name`
- `contactName`
- `contactEmail`

### `teams`

- `id`
- `name`
- `interests` as JSON text
- `skills` as JSON text
- `technologies` as JSON text

### `tasks`

- `id`
- `businessId`
- `status`: `draft` or `published`
- `title`
- `industry`
- `topic`
- `initialDescription`
- `context`
- `need`
- `users`
- `dataMaterials`
- `constraints`
- `expectedResult`
- `successCriteria`
- `contact`
- `interactionFormat`
- `score`
- `readinessLevel`
- `confirmedAt`
- `publishedAt`
- `createdAt`
- `updatedAt`

### `clarifications`

- `id`
- `taskId`
- `question`
- `answer`
- `field`
- `position`

### `proposals`

- `id`
- `taskId`
- `teamId`
- `solutionIdea`
- `plan`
- `estimatedDuration`
- `prototypeUrl`
- `status`: `pending`, `accepted`, or `rejected`
- `createdAt`

Do not enforce a single accepted proposal: the requirements allow the business to accept one, several, or none.

## 8. Readiness Score

Calculate the score in application code, not with AI. AI may explain missing information, but the deterministic formula is the source of truth.

| Category | Weight | Required information |
| --- | ---: | --- |
| Context and need | 20 | Both `context` and `need` are meaningfully completed |
| Data and materials | 20 | Available data, examples, or sources are described |
| Expected result | 15 | A concrete deliverable is described |
| Success criteria | 15 | Measurable acceptance criteria are provided |
| Constraints | 10 | Timeline, technology, access, or other limits are provided |
| Users | 10 | Target users are identified |
| Business communication | 10 | Contact and interaction format are provided |

Recommended MVP rule: award a category's full weight only when its required fields are confirmed and pass a small minimum-length check. Show each awarded/missing category in the UI. Recalculate after every confirmed edit.

Readiness levels:

- `0–39`: Draft — visible but needs clarification.
- `40–69`: Workable — teams may respond.
- `70–89`: Ready — ranked higher.
- `90–100`: Priority — visually highlighted.

Low scores must never hide a task or block a proposal.

## 9. AI Integration Contract

Use AI for two actions:

1. Analyze the initial description and generate at least three clarification questions.
2. Convert the description and answers into a structured task-card suggestion.

Create one server-only module at `src/lib/ai.ts`. Validate every response with Zod.

Suggested response structure:

```ts
const analysisSchema = z.object({
  locale: z.enum(["kk", "ru"]),
  questions: z.array(
    z.object({
      field: z.enum([
        "context",
        "need",
        "users",
        "dataMaterials",
        "constraints",
        "expectedResult",
        "successCriteria",
        "contact",
        "interactionFormat",
      ]),
      question: z.string().min(5),
      reason: z.string().min(5),
    }),
  ).min(3),
  card: z.object({
    title: z.string(),
    context: z.string(),
    need: z.string(),
    users: z.string(),
    dataMaterials: z.string(),
    constraints: z.string(),
    expectedResult: z.string(),
    successCriteria: z.string(),
    contact: z.string(),
    interactionFormat: z.string(),
  }),
});
```

Prompt rules:

- Produce all user-facing output in the requested Kazakh or Russian locale.
- Use only facts present in the user's description and answers.
- Return an empty string for unknown card fields.
- Ask concise, task-specific questions for missing fields.
- Never fabricate data, deadlines, contacts, users, or success metrics.
- Never select or rank student teams.
- Return JSON matching the schema.

If the API fails or returns invalid JSON, show a friendly retry action and load three deterministic fallback questions about users, expected result, and success criteria. This keeps the demo functional.

## 10. API and Server Actions

| Operation | Implementation |
| --- | --- |
| Analyze draft | `POST /api/ai/analyze-task` |
| Create/update draft | Server action with Zod validation |
| Confirm card | Server action; save confirmation and recalculate score |
| Publish task | Server action; set `status = published` |
| Read catalog | Server component query with sort/filter parameters |
| Submit proposal | Server action with team and task IDs |
| Accept/reject proposal | Server action restricted to the task's demo business |

Business rules must run on the server even though authentication is mocked.

## 11. UI Component Checklist

Initialize shadcn/ui and add only the necessary components:

- `button`
- `card`
- `input`
- `textarea`
- `label`
- `badge`
- `progress`
- `select`
- `tabs`
- `dialog`
- `alert`
- `skeleton`

Custom components:

- `RoleSwitcher`
- `LanguageSwitcher`
- `DraftForm`
- `ClarificationQuestionList`
- `EditableTaskCard`
- `ScoreGauge`
- `ScoreBreakdown`
- `MissingInformationList`
- `TaskCatalogCard`
- `CatalogFilters`
- `ProposalForm`
- `ProposalReviewCard`

## 12. Step-by-Step Execution Plan

### Phase 1 — Foundation, 0–30 minutes

1. Scaffold Next.js with TypeScript, App Router, Tailwind, and ESLint.
2. Initialize shadcn/ui.
3. Install and configure `next-intl` for `kk` and `ru` locale routes.
4. Install `openai`, `zod`, `drizzle-orm`, `better-sqlite3`, and Drizzle tooling.
5. Add `.env.example`, `.env.local`, and correct `.gitignore` entries.
6. Create the Drizzle schema and local SQLite database.
7. Seed five tasks, five teams, and five proposals, including both languages.
8. Agree on one Kazakh and one Russian demo task.

Exit condition: the app starts, the database is readable, and seeded catalog data renders.

### Phase 2 — Task Builder and AI, 30–100 minutes

1. Build the initial free-text draft form.
2. Add the server-only OpenAI call.
3. Pass the active locale and require the response in the same language.
4. Validate the structured AI output with Zod.
5. Display at least three clarification questions.
6. Collect answers and generate the editable task-card form.
7. Require explicit user confirmation before publication.
8. Add localized deterministic fallback questions for API failure.

Exit condition: a weak description becomes an editable card without invented facts.

### Phase 3 — Scoring, 100–165 minutes

1. Implement `calculateTaskScore(task)` as a pure function.
2. Return total score, readiness level, category breakdown, and missing fields.
3. Display a progress indicator and exact awarded points.
4. Display actionable suggestions for missing categories.
5. Recalculate after confirmed edits.
6. Add unit tests for score boundaries and the maximum score.

Exit condition: changing a field visibly changes the score and explanation.

### Phase 4 — Catalog and Proposals, 165–225 minutes

1. Publish confirmed cards into the catalog.
2. Sort by score descending by default.
3. Add topic and readiness filters.
4. Ensure low-scoring tasks remain visible and actionable.
5. Build task details and the team proposal form.
6. Build the business proposal list.
7. Add manual accept and reject actions.

Exit condition: a team can submit a proposal and the business can manually decide it.

### Phase 5 — Integration and Reliability, 225–270 minutes

1. Run the entire journey from draft to decision.
2. Add loading, empty, validation, and API-error states.
3. Verify all user-facing strings and errors in both languages.
4. Run the complete journey in both locales and verify locale persistence.
5. Verify that OpenAI is never called from client-side code.
6. Verify that AI cannot publish tasks or choose teams.
7. Confirm every required task-card field exists.
8. Fix only issues that block the primary demo flow.

Exit condition: the complete scenario works without manual database edits.

### Phase 6 — Submission and Demo, 270–300 minutes

1. Finalize synthetic seed data.
2. Document setup, architecture, score formula, and demo accounts in `README.md`.
3. Prepare one weak task description and expected clarification answers.
4. Rehearse a demonstration shorter than five minutes.
5. Record a fallback video or screenshots.
6. Restart from a clean state and verify the setup instructions once.

## 13. Suggested Team Split

For a team of four:

- Developer 1: project setup, database, seed data, and server actions.
- Developer 2: draft builder, AI prompt, structured output, and fallback.
- Developer 3: score engine, score UI, catalog sorting, and filters.
- Developer 4: proposal flow, Kazakh/Russian translations, testing, README, and demo.

Integrate after each phase rather than waiting until the final hour.

## 14. Demo Script

The final demonstration should take less than five minutes:

1. Enter a deliberately weak business description.
2. Show its low initial readiness and missing information.
3. Answer at least three AI-generated clarification questions.
4. Review and manually edit the generated card.
5. Confirm the card and show the readiness score increase.
6. Publish it and show its score-based catalog position.
7. Switch to the student-team role and submit a proposal.
8. Switch back to the business role.
9. Compare proposals and manually accept or reject one.

Every step must happen in the running application, not in slides.

Switch languages at least once during the demonstration and show that navigation, scoring, and AI clarification are available in both Kazakh and Russian.

## 15. Definition of Done

- The full draft → clarification → card → score → publish → proposal → decision flow works.
- AI asks at least three relevant questions and produces validated structured output.
- Every user-facing workflow is available in Kazakh and Russian.
- The chosen language persists across navigation and refreshes.
- AI questions and generated card content follow the selected language.
- AI does not invent missing facts.
- The task card remains editable and requires manual confirmation.
- The deterministic 0–100 score has a visible breakdown and improvement hints.
- All published tasks remain visible; score affects ordering only.
- Any demo team can submit a proposal.
- The business can accept several proposals, reject proposals, or accept none.
- The repository contains setup instructions and synthetic data.
- The entire flow can be demonstrated reliably in under five minutes.
