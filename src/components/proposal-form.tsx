"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";

type Locale = "kk" | "ru";
type ProposalField = "teamName" | "estimatedDuration" | "solutionIdea" | "plan" | "prototypeUrl";

const copy = {
  ru: {
    title: "Предложить решение",
    hint: "Опишите конкретный подход. После отправки предложение появится в разделе «Мои предложения» и будет доступно бизнесу для ручного решения.",
    teamName: "Название команды",
    duration: "Срок выполнения",
    idea: "Идея решения",
    plan: "План работ",
    prototype: "Ссылка на прототип",
    teamPlaceholder: "Например, Data Nomads",
    durationPlaceholder: "Например, 3 недели",
    ideaPlaceholder: "Как именно ваше решение закроет потребность бизнеса?",
    planPlaceholder: "Опишите основные этапы, инструменты и ожидаемые результаты.",
    prototypePlaceholder: "https://github.com/team/prototype",
    required: "Все поля обязательны. Идея и план должны содержать не менее 20 символов.",
    send: "Отправить предложение",
    invalid: "Проверьте обязательные поля и укажите полную ссылку, начинающуюся с https://.",
    forbidden: "Отправлять предложения может только студенческий аккаунт.",
    missing: "Эта задача больше недоступна для предложений.",
    error: "Не удалось сохранить предложение. Попробуйте ещё раз.",
  },
  kk: {
    title: "Шешім ұсыну",
    hint: "Нақты тәсілді сипаттаңыз. Жібергеннен кейін ұсыныс «Менің ұсыныстарым» бөлімінде пайда болады және бизнес қолмен шешім қабылдай алады.",
    teamName: "Команда атауы",
    duration: "Орындау мерзімі",
    idea: "Шешім идеясы",
    plan: "Жұмыс жоспары",
    prototype: "Прототип сілтемесі",
    teamPlaceholder: "Мысалы, Data Nomads",
    durationPlaceholder: "Мысалы, 3 апта",
    ideaPlaceholder: "Шешіміңіз бизнестің қажеттілігін қалай орындайды?",
    planPlaceholder: "Негізгі кезеңдерді, құралдарды және күтілетін нәтижелерді сипаттаңыз.",
    prototypePlaceholder: "https://github.com/team/prototype",
    required: "Барлық өріс міндетті. Идея мен жоспар кемінде 20 таңбадан тұруы керек.",
    send: "Ұсынысты жіберу",
    invalid: "Міндетті өрістерді тексеріп, https:// деп басталатын толық сілтемені көрсетіңіз.",
    forbidden: "Ұсынысты тек студенттік аккаунт жібере алады.",
    missing: "Бұл міндет енді ұсыныстар үшін қолжетімсіз.",
    error: "Ұсынысты сақтау мүмкін болмады. Қайталап көріңіз.",
  },
} as const;

type ApiError = { error?: string; issues?: Array<{ path?: PropertyKey[]; message?: string }> };

export default function ProposalForm({
  taskId,
  initialTeamName,
  locale,
  onSubmitted,
}: {
  taskId: number;
  initialTeamName: string;
  locale: Locale;
  onSubmitted: () => Promise<void> | void;
}) {
  const t = copy[locale];
  const [form, setForm] = useState<Record<ProposalField, string>>({
    teamName: initialTeamName,
    estimatedDuration: "",
    solutionIdea: "",
    plan: "",
    prototypeUrl: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function update(field: ProposalField, value: string) {
    setForm(current => ({ ...current, [field]: value }));
    if (error) setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createProposal", taskId, ...form }),
      });
      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as ApiError;
        if (response.status === 400 || result.error === "invalid_data") setError(t.invalid);
        else if (response.status === 403) setError(t.forbidden);
        else if (response.status === 404) setError(t.missing);
        else setError(t.error);
        return;
      }
      await onSubmitted();
    } catch {
      setError(t.error);
    } finally {
      setBusy(false);
    }
  }

  return <section className="mt-8 border-t pt-7">
    <h3 className="text-xl font-black">{t.title}</h3>
    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{t.hint}</p>
    <form onSubmit={submit} className="mt-5 grid gap-5 md:grid-cols-2">
      <ProposalInput id="proposal-team" label={t.teamName} value={form.teamName} onChange={value => update("teamName", value)} placeholder={t.teamPlaceholder} minLength={2} maxLength={100} disabled={busy} />
      <ProposalInput id="proposal-duration" label={t.duration} value={form.estimatedDuration} onChange={value => update("estimatedDuration", value)} placeholder={t.durationPlaceholder} minLength={2} maxLength={100} disabled={busy} />
      <ProposalInput id="proposal-idea" label={t.idea} value={form.solutionIdea} onChange={value => update("solutionIdea", value)} placeholder={t.ideaPlaceholder} minLength={20} maxLength={2_000} disabled={busy} area wide />
      <ProposalInput id="proposal-plan" label={t.plan} value={form.plan} onChange={value => update("plan", value)} placeholder={t.planPlaceholder} minLength={20} maxLength={4_000} disabled={busy} area wide />
      <ProposalInput id="proposal-prototype" label={t.prototype} value={form.prototypeUrl} onChange={value => update("prototypeUrl", value)} placeholder={t.prototypePlaceholder} maxLength={500} disabled={busy} type="url" wide />
      <div className="md:col-span-2">
        <p className="text-xs text-slate-500">{t.required}</p>
        {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="primary mt-4">
          {busy ? <Loader2 className="animate-spin" /> : <Send />}{t.send}
        </button>
      </div>
    </form>
  </section>;
}

function ProposalInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  minLength,
  maxLength,
  disabled,
  area = false,
  wide = false,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  minLength?: number;
  maxLength: number;
  disabled: boolean;
  area?: boolean;
  wide?: boolean;
  type?: "text" | "url";
}) {
  const shared = {
    id,
    value,
    required: true,
    minLength,
    maxLength,
    disabled,
    placeholder,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    className: `input ${area ? "min-h-28" : ""}`,
  };
  return <div className={wide ? "md:col-span-2" : ""}>
    <label className="label" htmlFor={id}>{label} <span aria-hidden="true" className="text-red-500">*</span></label>
    {area ? <textarea {...shared} /> : <input {...shared} type={type} />}
    {area && <p className="mt-1 text-right text-xs text-slate-400">{value.length}/{maxLength}</p>}
  </div>;
}
