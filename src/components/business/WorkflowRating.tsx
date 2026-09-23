import { calculateScore } from "@/lib/scoring";
import { completeness, type TaskCard, type Locale } from "@/lib/task-card";
import { taskLabels } from "@/lib/task-labels";

export default function WorkflowRating({ card, locale, confirmed, previousScore }: { card: TaskCard; locale: Locale; confirmed: boolean; previousScore?: number }) {
  const rating = calculateScore(card);
  const t = taskLabels[locale];
  const score = confirmed ? rating.score : 0;
  const missing = completeness(card).missing;
  return <aside className="card h-fit p-6">
    <h2 className="text-sm font-black uppercase tracking-wide text-slate-600">{locale === "ru" ? "Готовность задачи" : "Міндеттің дайындығы"}</h2>
    <p className="mt-3 text-4xl font-black" aria-live="polite">{score}<span className="text-lg text-slate-400"> / 100</span></p>
    <p className="mt-2 font-bold text-indigo-700">{confirmed ? t.levels[rating.level] : (locale === "ru" ? "Не подтверждено" : "Расталмаған")}</p>
    {!confirmed && <p className="mt-3 text-sm text-slate-500">{locale === "ru" ? `После подтверждения: ${rating.score}/100. Неподтверждённые сведения пока не дают официальных баллов.` : `Растаудан кейін: ${rating.score}/100. Расталмаған ақпарат ресми ұпай бермейді.`}</p>}
    {confirmed && previousScore !== undefined && previousScore !== score && <p role="status" className={`mt-4 rounded-xl p-3 font-bold ${score > previousScore ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{previousScore} → {score} / 100 · {score > previousScore ? "+" : ""}{score - previousScore}</p>}
    <progress className="mt-5 h-2 w-full accent-indigo-600" value={score} max={100} aria-label={locale === "ru" ? "Готовность" : "Дайындық"} />
    <dl className="mt-5 space-y-3">{rating.breakdown.map(item => <div key={item.key} className="flex justify-between gap-3 text-sm"><dt>{confirmed && item.earned ? "✓" : "○"} {t.categories[item.key]}</dt><dd className="shrink-0 font-bold">{confirmed && item.earned ? item.weight : 0} / {item.weight}</dd></div>)}</dl>
    <p className="mt-5 border-t pt-4 font-bold">{locale === "ru" ? "Итого" : "Барлығы"}: {score} / 100</p>
    <section className="mt-5 rounded-xl bg-amber-50 p-4"><h3 className="font-bold text-amber-900">{locale === "ru" ? "Недостающие сведения" : "Жетіспейтін ақпарат"}</h3>
      {missing.length ? <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900">{missing.map(field => <li key={field}>{t.fields[field]}</li>)}</ul> : <p className="mt-2 text-sm">{locale === "ru" ? "Все поля заполнены." : "Барлық өрістер толтырылған."}</p>}
    </section>
    <section className="mt-4 rounded-xl bg-indigo-50 p-4"><h3 className="font-bold text-indigo-900">{locale === "ru" ? "Как повысить рейтинг" : "Рейтингті қалай көтеруге болады"}</h3>
      {rating.breakdown.filter(item => !item.earned).map(item => <p key={item.key} className="mt-3 text-sm leading-6 text-indigo-800"><b>+{item.weight}</b> {t.improvements[item.key]}</p>)}
      {rating.score === 100 && <p className="mt-2 text-sm text-indigo-800">{locale === "ru" ? "Все категории заполнены." : "Барлық санаттар толтырылған."}</p>}
    </section>
  </aside>;
}
