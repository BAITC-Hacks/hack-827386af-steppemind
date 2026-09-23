"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, Check, ChevronDown, CircleAlert, Filter, Languages, LayoutDashboard, Lightbulb, Loader2, LogOut, Send, Sparkles, UserRound } from "lucide-react";
import { calculateScore, type ScorableTask } from "@/lib/scoring";
import type { Proposal, Task } from "@/lib/schema";
import type { SessionUser } from "@/lib/auth-types";

async function apiFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (response.status === 401) window.location.replace("/login");
  return response;
}

type Locale = "kk" | "ru";
type Role = "business" | "team";
type View = "dashboard" | "catalog" | "create" | "proposals";
type State = { tasks: Task[]; proposals: Proposal[]; proposalCounts: Record<number, number> };
type CardDraft = ScorableTask & { title: string; industry: string };
type Question = { field: string; question: string; reason: string };

const copy = {
  ru: {
    tagline:"Платформа готовых бизнес-задач",dashboard:"Дашборд",dashboardLink:"Перейти в дашборд",myTasks:"Мои задачи",myProposals:"Мои предложения",welcome:"Добро пожаловать",account:"Аккаунт",logout:"Выйти",catalog:"Каталог",create:"Создать задачу",proposals:"Предложения",business:"Бизнес",team:"Команда",hero:"Задачи, готовые к реальной работе",heroText:"Бизнес формулирует задачу лучше. Студенты выбирают осознанно. Решение остаётся за бизнесом.",all:"Все",draft:"Черновик",workable:"Рабочая",ready:"Готовая",priority:"Приоритетная",score:"Готовность",open:"Открыть задачу",responses:"откликов",newTitle:"Превратите идею в готовую задачу",newText:"Опишите потребность своими словами. AI найдёт пробелы и поможет собрать понятную карточку.",description:"Черновик задачи",descriptionPh:"Например: мы хотим уменьшить время обработки обращений клиентов...",analyze:"Проанализировать с AI",clarifications:"Уточняющие вопросы",continue:"Перейти к карточке",editCard:"Проверьте карточку",editHint:"Отредактируйте результат перед публикацией. AI не публикует задачу самостоятельно.",publish:"Подтвердить и опубликовать",missing:"Как повысить рейтинг",noKey:"Демо-режим: резервные вопросы. Добавьте OPENAI_API_KEY для AI-анализа.",proposal:"Отправить предложение",idea:"Идея решения",plan:"План работ",duration:"Срок",prototype:"Ссылка на прототип",send:"Отправить отклик",teamName:"Название команды",incoming:"Входящие предложения",incomingText:"Бизнес вручную выбирает одну, несколько или ни одной команды.",accept:"Выбрать",reject:"Отклонить",accepted:"Выбрано",rejected:"Отклонено",pending:"На рассмотрении",empty:"Пока нет предложений",error:"Что-то пошло не так. Попробуйте ещё раз.",loading:"Загрузка...",
    fields:{title:"Название",industry:"Отрасль / тема",context:"Контекст",need:"Потребность",users:"Пользователи",dataMaterials:"Данные и материалы",constraints:"Ограничения",expectedResult:"Ожидаемый результат",successCriteria:"Критерии успеха",contact:"Контакт",interactionFormat:"Формат взаимодействия"},
    breakdown:{contextNeed:"Контекст и потребность",data:"Данные и материалы",result:"Ожидаемый результат",criteria:"Критерии успеха",constraints:"Ограничения",users:"Пользователи",communication:"Связь с бизнесом"},
  },
  kk: {
    tagline:"Дайын бизнес-міндеттер платформасы",dashboard:"Басқару тақтасы",dashboardLink:"Басқару тақтасына өту",myTasks:"Менің міндеттерім",myProposals:"Менің ұсыныстарым",welcome:"Қош келдіңіз",account:"Аккаунт",logout:"Шығу",catalog:"Каталог",create:"Міндет құру",proposals:"Ұсыныстар",business:"Бизнес",team:"Команда",hero:"Нақты жұмысқа дайын міндеттер",heroText:"Бизнес міндетті нақтылайды. Студенттер саналы түрде таңдайды. Соңғы шешімді бизнес қабылдайды.",all:"Барлығы",draft:"Жоба",workable:"Жұмысқа жарамды",ready:"Дайын",priority:"Басым",score:"Дайындық",open:"Міндетті ашу",responses:"ұсыныс",newTitle:"Идеяны дайын міндетке айналдырыңыз",newText:"Қажеттілікті өз сөзіңізбен жазыңыз. AI жетіспейтін ақпаратты тауып, түсінікті карточка жасауға көмектеседі.",description:"Міндет жобасы",descriptionPh:"Мысалы: клиенттердің өтініштерін өңдеу уақытын қысқартқымыз келеді...",analyze:"AI көмегімен талдау",clarifications:"Нақтылау сұрақтары",continue:"Карточкаға өту",editCard:"Карточканы тексеріңіз",editHint:"Жариялау алдында нәтижені өңдеңіз. AI міндетті өздігінен жарияламайды.",publish:"Растау және жариялау",missing:"Рейтингті қалай көтеруге болады",noKey:"Демо режимі: резервтік сұрақтар. AI талдауы үшін OPENAI_API_KEY қосыңыз.",proposal:"Ұсыныс жіберу",idea:"Шешім идеясы",plan:"Жұмыс жоспары",duration:"Мерзім",prototype:"Прототип сілтемесі",send:"Ұсынысты жіберу",teamName:"Команда атауы",incoming:"Келген ұсыныстар",incomingText:"Бизнес бір, бірнеше немесе ешбір команданы таңдамайды — шешім қолмен қабылданады.",accept:"Таңдау",reject:"Қабылдамау",accepted:"Таңдалды",rejected:"Қабылданбады",pending:"Қаралуда",empty:"Әзірге ұсыныс жоқ",error:"Қате орын алды. Қайта көріңіз.",loading:"Жүктелуде...",
    fields:{title:"Атауы",industry:"Сала / тақырып",context:"Контекст",need:"Қажеттілік",users:"Пайдаланушылар",dataMaterials:"Деректер мен материалдар",constraints:"Шектеулер",expectedResult:"Күтілетін нәтиже",successCriteria:"Табыс критерийлері",contact:"Байланыс",interactionFormat:"Өзара әрекет форматы"},
    breakdown:{contextNeed:"Контекст және қажеттілік",data:"Деректер мен материалдар",result:"Күтілетін нәтиже",criteria:"Табыс критерийлері",constraints:"Шектеулер",users:"Пайдаланушылар",communication:"Бизнеспен байланыс"},
  },
} as const;

const emptyCard: CardDraft={title:"",industry:"",context:"",need:"",users:"",dataMaterials:"",constraints:"",expectedResult:"",successCriteria:"",contact:"",interactionFormat:""};
const fields=Object.keys(emptyCard) as (keyof CardDraft)[];
const levelFor=(score:number)=>score>=90?"priority":score>=70?"ready":score>=40?"workable":"draft";

export default function Dashboard({ user, initialView = "catalog" }: { user: SessionUser; initialView?: View }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ru");
  const role: Role = user.role === "business" ? "business" : "team";
  const view = initialView;
  const [state, setState] = useState<State>({ tasks: [], proposals: [], proposalCounts: {} });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const t = copy[locale];

  async function refresh() {
    setError(false);
    try {
      const response = await apiFetch("/api/state", { cache: "no-store" });
      if (response.status === 401) { window.location.replace("/login"); return; }
      if (!response.ok) throw new Error("Unable to load state");
      setState(await response.json());
    } catch { setError(true); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    apiFetch("/api/state", { cache: "no-store" }).then(async response => {
      if (response.status === 401) { window.location.replace("/login"); return; }
      if (!response.ok) throw new Error("Unable to load state");
      const data = await response.json();
      if (active) setState(data);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function logout() {
    setLeaving(true);
    try {
      const response = await apiFetch("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!response.ok) throw new Error("Unable to log out");
      window.location.replace("/login");
    } catch { setError(true); setLeaving(false); }
  }

  const tasks = state.tasks.filter(task => filter === "all" || levelFor(task.score) === filter);
  const dashboardHref = user.role === "business" ? "/business/dashboard" : "/student/dashboard";
  const proposalsHref = user.role === "business" ? "/business/proposals" : "/student/proposals";
  const navigation = <>
    <Nav href="/catalog" active={view === "catalog"}>{t.catalog}</Nav>
    {role === "business" && <Nav href="/business/tasks/new" active={view === "create"}>{t.create}</Nav>}
    <Nav href={proposalsHref} active={view === "proposals"}>{t.proposals}</Nav>
  </>;
  return <div className="min-h-screen bg-[#f5f7fb] text-slate-950">
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95">
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center gap-3 px-5 py-3 lg:gap-8">
        <Link href="/catalog" className="flex items-center gap-2 font-black"><span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white"><Sparkles size={18} /></span>SteppeMind</Link>
        <nav className="hidden gap-1 lg:flex">{navigation}</nav>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button onClick={() => setLocale(locale === "ru" ? "kk" : "ru")} className="control"><Languages size={16} />{locale === "ru" ? "ҚАЗ" : "РУС"}</button>
          <details className="group relative">
            <summary aria-label={t.account} className="control list-none px-2.5 [&::-webkit-details-marker]:hidden"><UserRound size={18}/><ChevronDown className="transition group-open:rotate-180" size={14}/></summary>
            <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
              <div className="border-b border-slate-100 px-3 py-3"><p className="truncate text-sm font-extrabold">{user.name}</p><p className="mt-1 truncate text-xs text-slate-500">@{user.login} · {role === "business" ? t.business : t.team}</p></div>
              <Link href={dashboardHref} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"><LayoutDashboard size={17}/>{t.dashboardLink}</Link>
              <button onClick={logout} disabled={leaving} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"><LogOut size={17}/>{t.logout}</button>
            </div>
          </details>
        </div>
      </div>
      <nav className="flex flex-wrap gap-1 px-5 pb-3 lg:hidden">{navigation}</nav>
    </header>
    <main className="mx-auto max-w-7xl px-5 py-10">
      {error && <div role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-red-700">{t.error} <button className="underline" onClick={refresh}>{locale === "ru" ? "Повторить" : "Қайталау"}</button></div>}
      {loading ? <div className="py-20 text-center"><Loader2 className="mx-auto animate-spin" />{t.loading}</div> : <>
        {view === "dashboard" && <DashboardHome t={t} user={user} state={state} />}
        {view === "catalog" && <Catalog t={t} tasks={tasks} proposalCounts={state.proposalCounts} filter={filter} setFilter={setFilter} role={role} userName={user.name} refresh={refresh} />}
        {view === "create" && role === "business" && <Builder t={t} locale={locale} done={async () => { await refresh(); router.push("/business/dashboard"); }} />}
        {view === "proposals" && <ProposalList t={t} state={state} role={role} refresh={refresh} />}
      </>}
    </main>
  </div>;
}

function DashboardHome({t,user,state}:{t:typeof copy.ru|typeof copy.kk;user:SessionUser;state:State}) {
  const isBusiness = user.role === "business";
  const ownTasks = state.tasks.filter(task => task.ownerId === user.id);
  const pending = state.proposals.filter(proposal => proposal.status === "pending").length;
  const proposalsHref = isBusiness ? "/business/proposals" : "/student/proposals";
  return <div>
    <span className="eyebrow"><LayoutDashboard size={15}/>{t.dashboard}</span>
    <h1 className="mt-4 text-4xl font-black">{t.welcome}, {user.name}</h1>
    <p className="mt-2 text-slate-500">@{user.login} · {isBusiness ? t.business : t.team}</p>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <Link href={isBusiness ? "/catalog" : proposalsHref} className="card p-6 text-left transition hover:-translate-y-0.5 hover:shadow-md">
        <p className="text-sm font-bold text-slate-500">{isBusiness ? t.myTasks : t.myProposals}</p>
        <p className="mt-3 text-4xl font-black text-indigo-600">{isBusiness ? ownTasks.length : state.proposals.length}</p>
      </Link>
      <Link href={proposalsHref} className="card p-6 text-left transition hover:-translate-y-0.5 hover:shadow-md">
        <p className="text-sm font-bold text-slate-500">{isBusiness ? t.incoming : t.pending}</p>
        <p className="mt-3 text-4xl font-black text-indigo-600">{isBusiness ? state.proposals.length : pending}</p>
      </Link>
    </div>
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-2xl font-black">{isBusiness ? t.myTasks : t.myProposals}</h2>{isBusiness&&<Link className="primary" href="/business/tasks/new">{t.create}</Link>}</div>
      {isBusiness ? <TaskCards tasks={ownTasks} proposalCounts={state.proposalCounts} t={t}/> : <ProposalList t={t} state={state} role="team" refresh={async()=>{}} compact/>}
    </section>
  </div>;
}

function TaskCards({tasks,proposalCounts,t}:{tasks:Task[];proposalCounts:Record<number,number>;t:typeof copy.ru|typeof copy.kk}) {
  if (!tasks.length) return <div className="card p-10 text-center text-slate-500">{t.empty}</div>;
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{tasks.map(task=><article key={task.id} className="card p-6"><div className="mb-4 flex justify-between"><span className="tag">{task.industry}</span><Score value={task.score}/></div><h3 className="text-lg font-extrabold">{task.title}</h3><p className="mt-3 text-sm text-slate-500">{proposalCounts[task.id]??0} {t.responses}</p></article>)}</div>;
}

function Nav({active,href,children}:{active:boolean;href:string;children:React.ReactNode}){return <Link href={href} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active?"bg-indigo-50 text-indigo-700":"text-slate-600"}`}>{children}</Link>}
function Score({value}:{value:number}){return <div className="grid size-14 place-items-center rounded-full" style={{background:`conic-gradient(#4f46e5 ${value}%,#e2e8f0 0)`}}><div className="grid size-11 place-items-center rounded-full bg-white text-sm font-black">{value}</div></div>}

function Catalog({t,tasks,proposalCounts,filter,setFilter,role,userName,refresh}:{t:typeof copy.ru|typeof copy.kk;tasks:Task[];proposalCounts:Record<number,number>;filter:string;setFilter:(x:string)=>void;role:Role;userName:string;refresh:()=>Promise<void>}){const [selected,setSelected]=useState<Task|null>(null);return <><section className="mb-10 rounded-3xl bg-slate-950 px-8 py-10 text-white md:px-12"><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-indigo-200"><Sparkles size={13}/>{t.tagline}</span><h1 className="max-w-3xl text-4xl font-black md:text-5xl">{t.hero}</h1><p className="mt-4 max-w-2xl text-slate-300">{t.heroText}</p></section><div className="mb-6 flex flex-wrap gap-2"><Filter size={17}/>{["all","draft","workable","ready","priority"].map(k=><button key={k} onClick={()=>setFilter(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter===k?"bg-indigo-600 text-white":"border bg-white"}`}>{t[k as "all"|"draft"|"workable"|"ready"|"priority"]}</button>)}</div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{tasks.map(task=><article key={task.id} className="card flex flex-col p-6"><div className="mb-5 flex justify-between"><span className="tag">{task.industry}</span><Score value={task.score}/></div><h2 className="text-xl font-extrabold">{task.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{task.need||task.context}</p><div className="mt-auto flex justify-between border-t pt-5"><span className="text-xs text-slate-500">{proposalCounts[task.id] ?? 0} {t.responses}</span><button onClick={()=>setSelected(task)} className="font-bold text-indigo-600">{role==="team"?t.proposal:t.open} <ArrowRight className="inline" size={15}/></button></div></article>)}</div>{selected&&<TaskModal task={selected} userName={userName} role={role} t={t} close={()=>setSelected(null)} done={async()=>{await refresh();setSelected(null)}}/>}</>}

function Builder({t,locale,done}:{t:typeof copy.ru|typeof copy.kk;locale:Locale;done:()=>void}){const [step,setStep]=useState(1),[description,setDescription]=useState(""),[questions,setQuestions]=useState<Question[]>([]),[answers,setAnswers]=useState<Record<string,string>>({}),[card,setCard]=useState<CardDraft>(emptyCard),[busy,setBusy]=useState(false),[fallback,setFallback]=useState(false),[error,setError]=useState("");const rating=useMemo(()=>calculateScore(card),[card]);async function analyze(){setBusy(true);setError("");try{const r=await apiFetch("/api/ai/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({description,locale})});if(!r.ok)throw 0;const d=await r.json();setQuestions(d.questions);setCard(d.card);setFallback(d.source==="fallback");setStep(2)}catch{setError(t.error)}finally{setBusy(false)}}function apply(){const next={...card};questions.forEach(q=>{if(q.field in next&&answers[q.field])next[q.field as keyof CardDraft]=answers[q.field]});setCard(next);setStep(3)}async function publish(){setBusy(true);setError("");try{const r=await apiFetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createTask",task:{...card,language:locale}})});if(!r.ok)throw new Error("Publish failed");done()}catch{setError(t.error)}finally{setBusy(false)}}return <div className="mx-auto max-w-5xl"><span className="eyebrow"><Bot size={15}/>AI Task Builder</span><h1 className="mt-4 text-4xl font-black">{t.newTitle}</h1><p className="mt-3 text-slate-600">{t.newText}</p><div className="my-8 grid grid-cols-3 gap-2">{[1,2,3].map(n=><div key={n} className={`h-1.5 rounded-full ${step>=n?"bg-indigo-600":"bg-slate-200"}`}/>)}</div>{step===1&&<section className="card p-7"><label className="label">{t.description}</label><textarea className="input min-h-44" value={description} onChange={e=>setDescription(e.target.value)} placeholder={t.descriptionPh}/><button disabled={description.length<10||busy} onClick={analyze} className="primary mt-5">{busy?<Loader2 className="animate-spin"/>:<Sparkles/>}{t.analyze}</button></section>}{step===2&&<section className="card p-7"><h2 className="text-2xl font-black">{t.clarifications}</h2>{fallback&&<div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><CircleAlert size={18}/>{t.noKey}</div>}<div className="mt-6 space-y-5">{questions.map((q,i)=><div key={q.field+i}><label className="label">{i+1}. {q.question}</label><p className="mb-2 text-xs text-slate-500">{q.reason}</p><textarea className="input min-h-24" value={answers[q.field]||""} onChange={e=>setAnswers({...answers,[q.field]:e.target.value})}/></div>)}</div><button onClick={apply} className="primary mt-6">{t.continue}<ArrowRight/></button></section>}{step===3&&<div className="grid gap-6 lg:grid-cols-[1fr_320px]"><section className="card p-7"><h2 className="text-2xl font-black">{t.editCard}</h2><p className="mt-2 text-sm text-slate-500">{t.editHint}</p><div className="mt-6 grid gap-5 md:grid-cols-2">{fields.map((key,i)=><div key={key} className={i>1?"md:col-span-2":""}><label className="label">{t.fields[key]}</label>{i>1?<textarea className="input min-h-24" value={card[key]} onChange={e=>setCard({...card,[key]:e.target.value})}/>:<input className="input" value={card[key]} onChange={e=>setCard({...card,[key]:e.target.value})}/>}</div>)}</div><button onClick={publish} disabled={busy||!card.title||!card.industry} className="primary mt-6"><Check/>{t.publish}</button></section><ScorePanel t={t} rating={rating}/></div>}{error&&<p className="mt-4 text-red-600">{error}</p>}</div>}

function ScorePanel({t,rating}:{t:typeof copy.ru|typeof copy.kk;rating:ReturnType<typeof calculateScore>}){return <aside className="card h-fit p-6 lg:sticky lg:top-24"><div className="flex items-center gap-4"><Score value={rating.score}/><div><p className="text-xs font-bold uppercase text-slate-500">{t.score}</p><p className="font-black">{t[rating.level as "priority"|"ready"|"workable"|"draft"]}</p></div></div><div className="mt-6 space-y-3">{rating.breakdown.map(x=><div key={x.key} className="flex justify-between text-sm"><span className={x.earned?"":"text-slate-400"}>{t.breakdown[x.key as keyof typeof t.breakdown]}</span><b className={x.earned?"text-emerald-600":"text-slate-400"}>{x.earned?x.weight:0}/{x.weight}</b></div>)}</div><div className="mt-6 rounded-xl bg-indigo-50 p-4"><p className="mb-2 flex gap-2 text-sm font-bold text-indigo-900"><Lightbulb size={16}/>{t.missing}</p>{rating.breakdown.filter(x=>!x.earned).map(x=><p key={x.key} className="text-xs leading-5 text-indigo-700">• {t.breakdown[x.key as keyof typeof t.breakdown]}</p>)}</div></aside>}

function TaskModal({task,userName,role,t,close,done}:{task:Task;userName:string;role:Role;t:typeof copy.ru|typeof copy.kk;close:()=>void;done:()=>void}){const [form,setForm]=useState({teamName:userName,solutionIdea:"",plan:"",estimatedDuration:"",prototypeUrl:""}),[busy,setBusy]=useState(false),[error,setError]=useState(false);async function submit(){setBusy(true);setError(false);try{const r=await apiFetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"createProposal",taskId:task.id,...form})});if(!r.ok)throw new Error("Proposal failed");done()}catch{setError(true)}finally{setBusy(false)}}return <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4" onMouseDown={close}><div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-7" onMouseDown={e=>e.stopPropagation()}><button onClick={close} className="float-right text-2xl">×</button><span className="tag">{task.industry}</span><h2 className="mt-3 text-3xl font-black">{task.title}</h2><p className="mt-5 leading-7 text-slate-600">{task.context}</p><div className="mt-6 grid gap-4 md:grid-cols-2">{(["need","users","dataMaterials","constraints","expectedResult","successCriteria"] as const).map(k=><div key={k} className="rounded-xl bg-slate-50 p-4"><p className="mb-1 text-xs font-bold uppercase text-slate-400">{t.fields[k]}</p><p className="text-sm">{task[k]||"—"}</p></div>)}</div>{role==="team"&&<div className="mt-8 border-t pt-7"><h3 className="text-xl font-black">{t.proposal}</h3><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label={t.teamName} value={form.teamName} set={v=>setForm({...form,teamName:v})}/><Field label={t.duration} value={form.estimatedDuration} set={v=>setForm({...form,estimatedDuration:v})}/><Field label={t.idea} value={form.solutionIdea} set={v=>setForm({...form,solutionIdea:v})} area/><Field label={t.plan} value={form.plan} set={v=>setForm({...form,plan:v})} area/><Field label={t.prototype} value={form.prototypeUrl} set={v=>setForm({...form,prototypeUrl:v})}/></div>{error&&<p role="alert" className="mt-4 text-red-600">{t.error}</p>}<button disabled={busy||form.teamName.trim().length<2||form.estimatedDuration.trim().length<2||form.solutionIdea.length<10||form.plan.length<10} onClick={submit} className="primary mt-5"><Send/>{t.send}</button></div>}</div></div>}
function Field({label,value,set,area=false}:{label:string;value:string;set:(x:string)=>void;area?:boolean}){return <div className={area?"md:col-span-2":""}><label className="label">{label}</label>{area?<textarea className="input min-h-24" value={value} onChange={e=>set(e.target.value)}/>:<input className="input" value={value} onChange={e=>set(e.target.value)}/>}</div>}

function ProposalList({t,state,role,refresh,compact=false}:{t:typeof copy.ru|typeof copy.kk;state:State;role:Role;refresh:()=>Promise<void>;compact?:boolean}){const [error,setError]=useState(false),[busy,setBusy]=useState(false);async function decide(id:number,status:"accepted"|"rejected"){setBusy(true);setError(false);try{const response=await apiFetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"proposalStatus",id,status})});if(!response.ok)throw new Error("Decision failed");await refresh()}catch{setError(true)}finally{setBusy(false)}}const list=state.proposals;return <div>{!compact&&<><span className="eyebrow">{t.proposals}</span><h1 className="mt-4 text-4xl font-black">{role==="business"?t.incoming:t.proposals}</h1>{role==="business"&&<p className="mt-3 text-slate-600">{t.incomingText}</p>}</>}{error&&<p role="alert" className="mt-4 text-red-600">{t.error}</p>}<div className={compact?"space-y-4":"mt-8 space-y-4"}>{!list.length&&<div className="card p-10 text-center">{t.empty}</div>}{list.map(p=><article key={p.id} className="card p-6"><div className="flex justify-between"><div><span className="tag">{p.teamName}</span><h2 className="mt-3 text-xl font-black">{state.tasks.find(x=>x.id===p.taskId)?.title}</h2></div><span className="text-sm font-bold">{t[p.status as "accepted"|"rejected"|"pending"]}</span></div><p className="mt-4 text-sm text-slate-600">{p.solutionIdea}</p><p className="mt-2 text-sm"><b>{t.plan}:</b> {p.plan}</p>{role==="business"&&p.status==="pending"&&<div className="mt-5 flex gap-2"><button disabled={busy} onClick={()=>decide(p.id,"accepted")} className="primary"><Check/>{t.accept}</button><button disabled={busy} onClick={()=>decide(p.id,"rejected")} className="secondary">{t.reject}</button></div>}</article>)}</div></div>}
