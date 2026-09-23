"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Loader2, Save, Sparkles } from "lucide-react";
import { emptyTaskCard, taskFields, taskCardSchema, completeness, type TaskAnalysis, type TaskCard, type TaskDraft, type Locale } from "@/lib/task-card";
import { taskLabels } from "@/lib/task-labels";
import WorkflowRating from "./WorkflowRating";

class WorkflowRequestError extends Error {}
async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(path, body === undefined ? { cache: "no-store" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (response.status === 401) window.location.replace("/login");
  const result = await response.json();
  if (!response.ok) throw new WorkflowRequestError(result.error ?? "request_failed");
  return result;
}

export default function TaskWorkflow({ locale, onCatalog, initialTaskId }: { locale: Locale; onCatalog: () => void; initialTaskId?: number }) {
  const [step, setStep] = useState(1);
  const [description, setDescription] = useState("");
  const [card, setCard] = useState<TaskCard>({ ...emptyTaskCard });
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [drafts, setDrafts] = useState<TaskDraft[]>([]);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [published, setPublished] = useState(false);
  const t = taskLabels[locale];
  const ru = locale === "ru";
  const confirmed = !dirty && !!draft && draft.confirmedVersion === draft.version;
  const steps = ru ? ["Черновик", "Уточнение", "Карточка", "Готовность", "Публикация"] : ["Жоба", "Нақтылау", "Карточка", "Дайындық", "Жариялау"];

  useEffect(() => {
    let active = true;
    api<{ tasks: TaskDraft[] }>("/api/tasks").then(data => {
      if (!active) return;
      setDrafts(data.tasks);
      if (initialTaskId !== undefined) {
        const selected = data.tasks.find(task => task.id === initialTaskId);
        if (!selected) { setError("task_not_found"); return; }
        setDraft(selected); setCard(selected.card); setDescription(selected.description); setStep(3);
        setDirty(false); setAnalysis(null); setAnswers({}); setPublished(false); setError(""); setNotice("");
      }
    }).catch(() => { if (active) setError("load_failed"); });
    return () => { active = false; };
  }, [initialTaskId]);
  function remember(next: TaskDraft) {
    setDraft(next); setDrafts(previous => [next, ...previous.filter(item => item.id !== next.id)]);
  }
  function failure(reason: unknown) { setError(reason instanceof WorkflowRequestError ? reason.message : "request_failed"); }
  function change(field: keyof TaskCard, value: string) {
    setCard(previous => ({ ...previous, [field]: value })); setDirty(true); setPublished(false); setNotice("");
  }
  async function persist() {
    const result = await api<{ task: TaskDraft }>("/api/tasks", { action: "save", id: draft?.id, version: draft?.version, card, description, language: locale });
    remember(result.task); setDirty(false); return result.task;
  }
  async function analyze() {
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await api<TaskAnalysis>("/api/ai/analyze", { description, locale });
      const extracted = taskCardSchema.parse(result.card);
      if (!Array.isArray(result.questions)) throw new Error("Invalid analysis");
      const saved = await api<{ task: TaskDraft }>("/api/tasks", { action: "save", card: extracted, description, language: locale });
      setCard(extracted); setAnalysis(result); setAnswers({}); remember(saved.task); setDirty(false); setPublished(false);
      setStep(result.questions.length ? 2 : 3);
    } catch (reason) { failure(reason); } finally { setBusy(false); }
  }
  function applyAnswers() {
    const next = { ...card };
    const grouped: Partial<Record<keyof TaskCard, string[]>> = {};
    analysis?.questions.forEach(question => { const answer = answers[question.id]?.trim(); if (answer) (grouped[question.field] ??= []).push(answer); });
    for (const [field, values] of Object.entries(grouped)) next[field as keyof TaskCard] = values!.join("\n");
    setCard(next); setDirty(Object.keys(grouped).length > 0 || dirty); setStep(3); setError("");
  }
  async function save() {
    setBusy(true); setError("");
    try { await persist(); setNotice(ru ? "Черновик сохранён. Информация ещё не подтверждена." : "Жоба сақталды. Ақпарат әлі расталмаған."); }
    catch (reason) { failure(reason); } finally { setBusy(false); }
  }
  async function confirm() {
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = dirty || !draft ? await persist() : draft;
      const result = await api<{ task: TaskDraft }>("/api/tasks", { action: "confirm", id: saved.id, version: saved.version, confirmed: true });
      remember(result.task); setStep(4);
      setNotice(saved.publishedVersion ? (ru ? "Изменения сохранены. ИИ повторно оценил задачу; проверьте новый рейтинг перед публикацией." : "Өзгерістер сақталды. AI міндетті қайта бағалады; жарияламас бұрын жаңа рейтингті тексеріңіз.") : "");
    } catch (reason) { failure(reason); } finally { setBusy(false); }
  }
  async function publish() {
    if (!confirmed || !draft) return;
    setBusy(true); setError("");
    try {
      const result = await api<{ task: TaskDraft }>("/api/tasks", { action: "publish", id: draft.id, version: draft.version });
      remember(result.task);
      // Verify the very same ID is in the shared catalog; never copy it to another store.
      const shared = await api<{ tasks: { id: number; score: number; status: string }[] }>("/api/state");
      if (!shared.tasks.some(task => task.id === draft.id && task.score === result.task.confirmedScore && task.status === "published")) throw new Error("Publication verification failed");
      setPublished(true);
    } catch (reason) { failure(reason); } finally { setBusy(false); }
  }
  function load(task: TaskDraft | null) {
    if (dirty && !window.confirm(ru ? "Несохранённые изменения будут потеряны. Продолжить?" : "Сақталмаған өзгерістер жоғалады. Жалғастыру керек пе?")) return;
    setDraft(task); setCard(task?.card ?? { ...emptyTaskCard }); setDescription(task?.description ?? "");
    setStep(task ? 3 : 1); setDirty(false); setAnalysis(null); setAnswers({}); setPublished(false); setError(""); setNotice("");
  }
  const errorMessage = error === "stale_version" ? (ru ? "Задача изменена в другом окне. Скопируйте нужные правки, обновите страницу и откройте сохранённую задачу заново." : "Міндет басқа терезеде өзгертілген. Ағымдағы жобаны ашыңыз.")
    : error === "task_not_found" ? (ru ? "Задача не найдена или принадлежит другому бизнес-аккаунту." : "Міндет табылмады немесе басқа бизнес аккаунтына тиесілі.")
    : error === "title_required" ? (ru ? "Укажите название минимум из 3 символов. Другие пропуски не мешают публикации." : "Кемінде 3 таңбадан тұратын атау енгізіңіз.")
    : error === "confirmation_required" ? (ru ? "Сначала подтвердите текущие изменения." : "Алдымен ағымдағы өзгерістерді растаңыз.")
    : (ru ? "Не удалось выполнить действие. Введённые данные сохранены на экране; попробуйте ещё раз." : "Әрекет орындалмады. Енгізілген ақпарат экранда сақталған; қайталап көріңіз.");
  const currentCompleteness = completeness(card);

  return <section className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="eyebrow">AI Task Builder</span><h1 className="mt-3 text-3xl font-black">{draft ? (ru ? "Редактирование бизнес-задачи" : "Бизнес міндетін өңдеу") : (ru ? "Создайте понятную бизнес-задачу" : "Түсінікті бизнес міндетін жасаңыз")}</h1>{draft?.publishedVersion&&<p className="mt-2 text-sm text-slate-500">{ru ? "После правок подтвердите сведения: сервер вызовет AI API и пересчитает рейтинг." : "Өзгерістерден кейін ақпаратты растаңыз: сервер AI API арқылы рейтингті қайта есептейді."}</p>}</div><button className="secondary" disabled={busy} onClick={() => load(null)}>{ru ? "Новая задача" : "Жаңа міндет"}</button></div>
    <div className="mt-6"><label htmlFor="saved-task" className="label">{ru ? "Мои сохранённые задачи" : "Сақталған міндеттерім"}</label><select id="saved-task" className="input max-w-xl" value={draft?.id ?? ""} disabled={busy} onChange={event => load(drafts.find(task => task.id === Number(event.target.value)) ?? null)}><option value="">{ru ? "Новая задача" : "Жаңа міндет"}</option>{drafts.map(task => <option key={task.id} value={task.id}>#{task.id} · {task.card.title || (ru ? "Без названия" : "Атаусыз")} · {task.status === "draft" ? (ru ? "Черновик" : "Жоба") : task.status === "confirmed" ? (ru ? "Подтверждена" : "Расталған") : (ru ? "Опубликована" : "Жарияланған")}</option>)}</select></div>
    <ol className="my-8 grid grid-cols-2 gap-2 sm:grid-cols-5">{steps.map((label, index) => <li key={label} aria-current={step === index + 1 ? "step" : undefined} className={`rounded-xl border p-3 text-sm font-bold ${step === index + 1 ? "border-indigo-600 bg-indigo-50 text-indigo-800" : "border-slate-200 text-slate-500"}`}>{step > index + 1 ? "✓" : index + 1} {label}</li>)}</ol>
    {draft?.publishedVersion && (dirty || draft.publishedVersion !== draft.version) ? <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">{ru ? "Студенты видят последнюю опубликованную версию. Правки появятся в каталоге только после подтверждения и повторной публикации." : "Студенттер соңғы жарияланған нұсқаны көреді. Өзгерістер растау мен қайта жариялаудан кейін көрінеді."}</p> : null}
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{errorMessage}</p>}
    {notice && <p role="status" className="mb-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">{notice}</p>}
    {step === 1 && <form onSubmit={event => { event.preventDefault(); void analyze(); }} className="card p-7"><label htmlFor="task-description" className="label">{ru ? "Опишите проблему своими словами" : "Мәселені өз сөзіңізбен сипаттаңыз"}</label><textarea id="task-description" className="input min-h-44" value={description} minLength={10} maxLength={12000} required disabled={busy} onChange={event => { setDescription(event.target.value); setDirty(true); }} placeholder={ru ? "У нас высокая текучесть сотрудников. Хотим использовать HR-данные, чтобы понимать причины ухода." : "Бизнес мәселесін сипаттаңыз..."} /><button type="submit" disabled={busy || description.trim().length < 10} className="primary mt-5">{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{ru ? "Проанализировать описание" : "Сипаттаманы талдау"}</button></form>}
    {step === 2 && <div className="grid gap-6 lg:grid-cols-[1fr_320px]"><form className="card p-7" onSubmit={event => { event.preventDefault(); applyAnswers(); }}><h2 className="text-2xl font-black">{ru ? "Уточняющие вопросы" : "Нақтылау сұрақтары"}</h2>{analysis?.source === "fallback" && <p className="mt-3 text-sm text-amber-800">{ru ? "Локальный демо-анализ: проверьте извлечённые сведения и дополните карточку." : "Жергілікті демо талдау: алынған ақпаратты тексеріп, карточканы толықтырыңыз."}</p>}<div className="mt-6 space-y-5">{analysis?.questions.map((question, index) => <div key={question.id}><label htmlFor={`answer-${question.id}`} className="label">{index + 1}. {question.question}</label><p className="mb-2 text-xs text-slate-500">{question.reason}</p><textarea id={`answer-${question.id}`} className="input min-h-24" value={answers[question.id] ?? ""} onChange={event => { setAnswers({ ...answers, [question.id]: event.target.value }); setDirty(true); }} maxLength={1500} /></div>)}</div><p className="mt-4 text-xs text-slate-500">{ru ? "Можно ответить частично. Неизвестное останется пустым." : "Ішінара жауап беруге болады. Белгісіз ақпарат бос қалады."}</p><button className="primary mt-5" type="submit">{ru ? "Собрать карточку" : "Карточканы құру"}<ArrowRight /></button></form><aside className="card h-fit p-6"><h3 className="font-black">{ru ? "Что удалось извлечь" : "Алынған ақпарат"}</h3><ul className="mt-4 space-y-3 text-sm">{taskFields.filter(field => field !== "industry").map(field => <li key={field}><span className={card[field].trim() ? "text-emerald-700" : "text-amber-800"}>{card[field].trim() ? "✓" : "⚠"} {t.fields[field]}</span>{card[field].trim() && <p className="mt-1 break-words text-xs text-slate-500">{card[field]}</p>}</li>)}</ul></aside></div>}
    {step === 3 && <div className="grid gap-6 lg:grid-cols-[1fr_350px]"><div className="card p-7"><h2 className="text-2xl font-black">{ru ? "Проверьте и подтвердите карточку" : "Карточканы тексеріп, растаңыз"}</h2><p className="mt-2 text-sm text-slate-500">{ru ? "Все поля редактируются. Подтверждение вызывает AI-оценку, но не публикует изменения автоматически." : "Барлық өрістер өңделеді. Растау AI бағалауын іске қосады, бірақ өзгерістерді автоматты түрде жарияламайды."}</p><fieldset disabled={busy} className="mt-6 space-y-5">{taskFields.map(field => <div key={field}><label className="label" htmlFor={`card-${field}`}>{t.fields[field]} <span className={card[field].trim() ? "text-emerald-700" : "text-amber-700"}>{card[field].trim() ? "✓" : (ru ? "⚠ Не указано" : "⚠ Көрсетілмеген")}</span></label>{field === "title" || field === "industry" ? <input id={`card-${field}`} className="input" maxLength={field === "title" ? 500 : 200} value={card[field]} onChange={event => change(field, event.target.value)} /> : <textarea id={`card-${field}`} className="input min-h-24" maxLength={field === "contact" ? 2000 : field === "context" || field === "need" ? 12000 : 5000} value={card[field]} onChange={event => change(field, event.target.value)} />}</div>)}</fieldset><div className="mt-6 flex flex-wrap gap-3"><button className="secondary" onClick={save} disabled={busy || (!dirty && !!draft)}><Save size={16} />{ru ? "Сохранить черновик" : "Жобаны сақтау"}</button><button className="primary" onClick={confirm} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}{draft?.publishedVersion ? (ru ? "Сохранить и пересчитать рейтинг" : "Сақтау және рейтингті қайта есептеу") : (ru ? "Подтвердить и рассчитать рейтинг" : "Растау және рейтингті есептеу")}</button></div></div><WorkflowRating card={card} locale={locale} confirmed={confirmed} /></div>}
    {step === 4 && <div className="grid gap-6 lg:grid-cols-[1fr_400px]"><div className="card h-fit p-7"><h2 className="text-2xl font-black">{ru ? "ИИ пересчитал рейтинг" : "AI рейтингті қайта есептеді"}</h2><p className="mt-3 text-slate-600">{ru ? "Рейтинг рассчитан по новой подтверждённой версии. Старая версия остаётся в каталоге, пока вы не опубликуете обновление." : "Рейтинг жаңа расталған нұсқа бойынша есептелді. Жаңартуды жариялағанша каталогта ескі нұсқа қалады."}</p><div className="mt-6 flex flex-wrap gap-3"><button className="secondary" onClick={() => { setStep(3); setError(""); }}>{ru ? "Дополнить карточку" : "Карточканы толықтыру"}</button><button className="primary" disabled={!confirmed} onClick={() => setStep(5)}>{ru ? "Перейти к публикации" : "Жариялауға өту"}<ArrowRight /></button></div></div><WorkflowRating card={card} locale={locale} confirmed={confirmed} previousScore={draft?.previousScore} confirmedScore={draft?.confirmedScore} evaluation={draft?.evaluation} /></div>}
    {step === 5 && <div className="grid gap-6 lg:grid-cols-[1fr_400px]"><section className="card h-fit p-7"><h2 className="text-2xl font-black">{published ? (ru ? "✓ Задача опубликована" : "✓ Міндет жарияланды") : (ru ? "Публикация в общем каталоге" : "Жалпы каталогта жариялау")}</h2><p className="mt-4 text-lg font-bold">{card.title || (ru ? "Без названия" : "Атаусыз")}</p><p className="mt-3 text-slate-600">{published ? (ru ? `Задача #${draft?.id} доступна студентам через общий каталог.` : `#${draft?.id} міндеті студенттерге жалпы каталогта қолжетімді.`) : (ru ? `Не заполнено полей: ${currentCompleteness.missing.length}. Низкая готовность не запрещает публикацию или отклики.` : `Толтырылмаған өрістер: ${currentCompleteness.missing.length}. Төмен дайындық жариялауға немесе ұсыныс беруге тыйым салмайды.`)}</p><div className="mt-6 flex flex-wrap gap-3">{published ? <button className="primary" onClick={onCatalog}>{ru ? "Открыть общий каталог" : "Жалпы каталогты ашу"}</button> : <><button className="secondary" disabled={busy} onClick={() => setStep(3)}>{ru ? "Редактировать" : "Өңдеу"}</button><button className="primary" disabled={busy || !confirmed} onClick={publish}>{busy ? <Loader2 className="animate-spin" /> : <Check />}{ru ? "Опубликовать задачу" : "Міндетті жариялау"}</button></>}</div></section><WorkflowRating card={card} locale={locale} confirmed={confirmed} confirmedScore={draft?.confirmedScore} evaluation={draft?.evaluation} /></div>}
  </section>;
}
