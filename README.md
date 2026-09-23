# SteppeMind

SteppeMind is an AI-powered platform that turns vague business problems into structured, publishable task briefs and connects them with student teams ready to propose solutions.

It solves a real bottleneck in challenge-driven learning: businesses often post unclear problems, and students struggle to respond with high-quality proposals because the brief is weak, incomplete, or inconsistent. SteppeMind fixes this by combining guided task creation, AI-assisted clarification, transparent readiness scoring, and human review of proposals.

## Why this project is powerful

This project stands out because it is not just a generic AI demo. It is a full workflow that creates real value for both sides:

- Businesses can describe a problem in plain language and get a structured task card instead of a messy note.
- Students get better briefs, clearer requirements, and better visibility into task quality before they invest time.
- The platform makes tasks easier to evaluate and easier to respond to.
- The final decision stays in human hands, which keeps the workflow trustworthy and realistic.
- AI helps refine the task without inventing facts or taking away business control.
- The app works in demo mode even without an external API key, which makes it reliable for presentations and tests.

This is the kind of project that feels immediately useful in a real-world setting and easy to explain to judges in a live demo.

---

## The problem we solve

Many business tasks are published as vague, under-specified ideas such as:

- “We need a better system”
- “We want to improve efficiency”
- “We need a mobile app for our company”

Those descriptions are too weak for students to act on confidently. The result is poor-quality proposals, unclear expectations, wasted effort, and frustration on both sides.

SteppeMind solves this by guiding the business user through a structured task-creation flow:

- clarify the business context
- define the need and users
- state the expected output and success criteria
- capture constraints and communication details
- generate a score that reflects readiness and completeness

The result is a cleaner, more actionable task that students can understand and respond to properly.

---

## How the product works

### 1. Business creates a challenge
The business user writes a short description of the problem in plain language.

### 2. AI asks clarifying questions
The platform analyzes the task and asks targeted follow-up questions to uncover missing information. This helps transform rough input into a useful brief.

### 3. Business reviews and edits the draft
The generated task card is editable before confirmation. The business can refine the wording, adjust fields, and correct mistakes before publishing.

### 4. Readiness is scored transparently
The task receives a readiness score from 0 to 100, with a breakdown by category. This makes it easy to understand what is strong and what still needs work.

### 5. The task is published to the catalog
Once confirmed, the task appears in a shared catalog where students can browse and evaluate it.

### 6. Students submit proposals
Student teams can apply to published tasks with a structured proposal: team name, idea, implementation plan, timeline, and optional prototype link.

### 7. Business chooses the team
The business owner reviews the proposals and manually accepts or rejects them. Multiple teams can be accepted if relevant.

This is a practical matchmaking flow: better brief quality leads to better proposals, and humans make the final decision.

---

## Main advantages of the project

### AI that improves quality, not chaos
The app does not invent facts. Instead, it helps identify missing information and encourages the business to provide precise details. This keeps the workflow trustworthy and grounded.

### Transparent evaluation
Every task can be scored based on completeness and quality. This gives businesses a clear idea of how ready their brief is and gives students a better sense of task quality before they apply.

### Human-in-the-loop control
The business remains in charge. The system does not auto-assign students or fabricate decisions. It supports fast matching while keeping human judgment central.

### Strong demo appeal
This product has a clear story that is easy to show live:

- rough business idea
- AI clarification
- structured task card
- scored readiness
- published challenge
- student proposals
- business approval

That narrative is compelling, easy to explain, and persuasive in a contest setting.

### Works even without external AI
If no OpenAI API key is configured, the app falls back to a local evaluation model. This makes the project resilient, testable, and demo-friendly.

### Clean and lightweight architecture
The app is built with a modern stack that is easy to understand and extend:

- Next.js
- TypeScript
- SQLite
- Drizzle ORM
- React

This gives the project a solid technical foundation without unnecessary complexity.

---

## Tech stack

- Next.js
- TypeScript
- SQLite
- Drizzle ORM
- OpenAI integration with fallback evaluation
- React UI components

This combination is well-suited for a strong MVP: modern enough to impress, simple enough to run locally, and robust enough for real workflow logic.

---

## Quick start

### Prerequisites

- Node.js 20+ recommended (24 LTS is ideal)
- npm
- Git

### 1. Install dependencies

```bash
npm install
```

Or use the exact lockfile version:

```bash
npm ci
```

### 2. Set up environment variables

Create a local environment file:

```bash
cp .env.example .env.local
```

Then optionally add your API key:

```bash
OPENAI_API_KEY=your_key_here
```

If you do not provide an API key, the app will still function using the built-in local fallback logic. This is perfect for local testing and demo usage.

### 3. Run the app

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

### 4. Use the app

The app starts with a login screen. You can register as either:

- Business user
- Student user

After registration, the system signs you in automatically and takes you to the right experience for your role.

---

## Demo dataset for judges

On startup, SQLite idempotently creates the required demo dataset: 5 drafts with different levels of completeness, 5 published task cards with readiness scores, 5 student team profiles, and 5 proposals linked to those teams and tasks. Team profiles appear in the catalog. Drafts and incoming proposals are visible through the demo business account.

| Role | Login | Password |
| --- | --- | --- |
| Business | `demo_business` | `Demo2026!` |
| Students | `demo_student_1` through `demo_student_5` | `Demo2026!` |

Repeated starts do not create duplicates. Set `SEED_DEMO_DATA=0` before the first start with a new database to disable the known hackathon demo accounts.

---

## Typical end-to-end flow

### For businesses
1. Sign up as a business user.
2. Start a new challenge.
3. Describe the problem in plain language.
4. Answer the AI clarifying questions.
5. Review and edit the generated task card.
6. Confirm the final task.
7. Check the score and readiness breakdown.
8. Publish the task in the shared catalog.
9. Review incoming proposals and accept the best team or teams.

### For students
1. Sign up as a student user.
2. Browse the published catalog.
3. Open a task.
4. Submit a proposal with team name, concept, plan, and timeline.
5. Track proposal status.
6. Wait for business review and acceptance.

---

## Why this project is competitive

This product is compelling because it combines technical execution with a strong real-world use case:

- It solves a common workflow problem in challenge-based education.
- It reduces poor-quality briefs and improves proposal quality.
- It uses AI where it adds actual value instead of as decoration.
- It keeps the final decision human-centered and trustworthy.
- It is easy to demo in a short time without sacrificing clarity.
- It has a simple architecture that is easy to explain and extend.

These are exactly the ingredients that help a project stand out during judging.

---

## Project structure

- `src/app` — app pages and API routes
- `src/components` — dashboard and workflow UI
- `src/lib` — auth, scoring, storage, AI logic, validation
- `tests` — logic and integration checks
- `docs` — product, workflow, and architecture documentation

---

## Verification

The project includes checks for the core logic and integration flow. Run:

```bash
npm run lint
npm run test:logic
npm run build
npm run test:auth
```

These checks cover user registration, login, role handling, task creation, publication, scoring, proposal validation, privacy enforcement, and session behavior.

---

## Documentation

Additional project notes are available here:

- [docs/architecture.md](docs/architecture.md)
- [docs/business-workflow.md](docs/business-workflow.md)
- [docs/demo.md](docs/demo.md)
- [docs/mvp.md](docs/mvp.md)

---

## Final pitch

SteppeMind is more than a task board. It is a smarter bridge between business problems and student talent.

It improves the quality of business briefs, gives students better context, and makes it easier to match the right team with the right challenge. The combination of AI assistance, transparent scoring, and human decision-making makes the platform practical, convincing, and genuinely useful.

If you want the strongest demo, register as a business user, write a rough idea, let the AI clarify it, confirm the card, publish it, then switch to a student account and submit a proposal. The product story becomes clear almost immediately.
