"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, ChevronDown, ExternalLink, Filter, Languages, LayoutDashboard, Loader2, LogOut, Pencil, Sparkles, UserRound } from "lucide-react";
import { readinessLevel } from "@/lib/scoring";
import TaskWorkflow from "./business/TaskWorkflow";
import WorkflowRating from "./business/WorkflowRating";
import type { Proposal, Task, TeamProfile } from "@/lib/schema";
import type { SessionUser } from "@/lib/auth-types";
import ProposalForm from "@/components/proposal-form";

async function apiFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, options);
  if (response.status === 401) window.location.replace("/login");
  return response;
}

type Locale = "kk" | "ru";
type Role = "business" | "team";
type View = "dashboard" | "catalog" | "create" | "proposals";
type State = { tasks: Task[]; proposals: Proposal[]; teamProfiles: TeamProfile[]; proposalCounts: Record<number, number> };

const copy = {
  ru: {
    tagline:"Платформа готовых бизнес-задач",dashboard:"Дашборд",dashboardLink:"Перейти в дашборд",myTasks:"Мои задачи",myProposals:"Мои предложения",welcome:"Добро пожаловать",account:"Аккаунт",logout:"Выйти",catalog:"Каталог",create:"Создать задачу",proposals:"Предложения",business:"Бизнес",team:"Команда",hero:"Задачи, готовые к реальной работе",heroText:"Бизнес формулирует задачу лучше. Студенты выбирают осознанно. Решение остаётся за бизнесом.",all:"Все",draft:"Черновик",workable:"Рабочая",ready:"Готовая",priority:"Приоритетная",score:"Готовность",open:"Открыть задачу",responses:"откликов",newTitle:"Превратите идею в готовую задачу",newText:"Опишите потребность своими словами. AI найдёт пробелы и поможет собрать понятную карточку.",description:"Черновик задачи",descriptionPh:"Например: мы хотим уменьшить время обработки обращений клиентов...",analyze:"Проанализировать с AI",clarifications:"Уточняющие вопросы",continue:"Перейти к карточке",editCard:"Проверьте карточку",editHint:"Отредактируйте результат перед публикацией. AI не публикует задачу самостоятельно.",publish:"Подтвердить и опубликовать",missing:"Как повысить рейтинг",noKey:"Демо-режим: резервные вопросы. Добавьте OPENAI_API_KEY для AI-анализа.",proposal:"Отправить предложение",idea:"Идея решения",plan:"План работ",duration:"Срок",prototype:"Ссылка на прототип",send:"Отправить отклик",teamName:"Название команды",incoming:"Входящие предложения",incomingText:"Бизнес вручную выбирает одну, несколько или ни одной команды.",studentProposalText:"Здесь видны все ваши предложения и решения бизнеса по ним.",studentEmpty:"Вы ещё не отправляли предложения. Выберите задачу в каталоге.",viewPrototype:"Открыть прототип",submitted:"Отправлено",accept:"Выбрать",reject:"Отклонить",accepted:"Выбрано",rejected:"Отклонено",pending:"На рассмотрении",empty:"Пока нет предложений",error:"Что-то пошло не так. Попробуйте ещё раз.",loading:"Загрузка...",
    fields:{title:"Название",industry:"Отрасль / тема",context:"Контекст",need:"Потребность",users:"Пользователи",dataMaterials:"Данные и материалы",constraints:"Ограничения",expectedResult:"Ожидаемый результат",successCriteria:"Критерии успеха",contact:"Контакт",interactionFormat:"Формат взаимодействия"},
    breakdown:{contextNeed:"Контекст и потребность",data:"Данные и материалы",result:"Ожидаемый результат",criteria:"Критерии успеха",constraints:"Ограничения",users:"Пользователи",communication:"Связь с бизнесом"},
  },
  kk: {
    tagline:"Дайын бизнес-міндеттер платформасы",dashboard:"Басқару тақтасы",dashboardLink:"Басқару тақтасына өту",myTasks:"Менің міндеттерім",myProposals:"Менің ұсыныстарым",welcome:"Қош келдіңіз",account:"Аккаунт",logout:"Шығу",catalog:"Каталог",create:"Міндет құру",proposals:"Ұсыныстар",business:"Бизнес",team:"Команда",hero:"Нақты жұмысқа дайын міндеттер",heroText:"Бизнес міндетті нақтылайды. Студенттер саналы түрде таңдайды. Соңғы шешімді бизнес қабылдайды.",all:"Барлығы",draft:"Жоба",workable:"Жұмысқа жарамды",ready:"Дайын",priority:"Басым",score:"Дайындық",open:"Міндетті ашу",responses:"ұсыныс",newTitle:"Идеяны дайын міндетке айналдырыңыз",newText:"Қажеттілікті өз сөзіңізбен жазыңыз. AI жетіспейтін ақпаратты тауып, түсінікті карточка жасауға көмектеседі.",description:"Міндет жобасы",descriptionPh:"Мысалы: клиенттердің өтініштерін өңдеу уақытын қысқартқымыз келеді...",analyze:"AI көмегімен талдау",clarifications:"Нақтылау сұрақтары",continue:"Карточкаға өту",editCard:"Карточканы тексеріңіз",editHint:"Жариялау алдында нәтижені өңдеңіз. AI міндетті өздігінен жарияламайды.",publish:"Растау және жариялау",missing:"Рейтингті қалай көтеруге болады",noKey:"Демо режимі: резервтік сұрақтар. AI талдауы үшін OPENAI_API_KEY қосыңыз.",proposal:"Ұсыныс жіберу",idea:"Шешім идеясы",plan:"Жұмыс жоспары",duration:"Мерзім",prototype:"Прототип сілтемесі",send:"Ұсынысты жіберу",teamName:"Команда атауы",incoming:"Келген ұсыныстар",incomingText:"Бизнес бір, бірнеше немесе ешбір команданы таңдамайды — шешім қолмен қабылданады.",studentProposalText:"Мұнда барлық ұсынысыңыз бен бизнес шешімдері көрсетіледі.",studentEmpty:"Сіз әлі ұсыныс жібермедіңіз. Каталогтан міндет таңдаңыз.",viewPrototype:"Прототипті ашу",submitted:"Жіберілді",accept:"Таңдау",reject:"Қабылдамау",accepted:"Таңдалды",rejected:"Қабылданбады",pending:"Қаралуда",empty:"Әзірге ұсыныс жоқ",error:"Қате орын алды. Қайта көріңіз.",loading:"Жүктелуде...",
    fields:{title:"Атауы",industry:"Сала / тақырып",context:"Контекст",need:"Қажеттілік",users:"Пайдаланушылар",dataMaterials:"Деректер мен материалдар",constraints:"Шектеулер",expectedResult:"Күтілетін нәтиже",successCriteria:"Табыс критерийлері",contact:"Байланыс",interactionFormat:"Өзара әрекет форматы"},
    breakdown:{contextNeed:"Контекст және қажеттілік",data:"Деректер мен материалдар",result:"Күтілетін нәтиже",criteria:"Табыс критерийлері",constraints:"Шектеулер",users:"Пайдаланушылар",communication:"Бизнеспен байланыс"},
  },
} as const;

export default function Dashboard({ user, initialView = "catalog", initialTaskId }: { user: SessionUser; initialView?: View; initialTaskId?: number }) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("ru");
  const role: Role = user.role === "business" ? "business" : "team";
  const view = initialView;
  const [state, setState] = useState<State>({ tasks: [], proposals: [], teamProfiles: [], proposalCounts: {} });
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

  const tasks = state.tasks.filter(task => filter === "all" || readinessLevel(task.score) === filter);
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
        {view === "dashboard" && <DashboardHome t={t} locale={locale} user={user} state={state} />}
        {view === "catalog" && <Catalog locale={locale} industries={[...new Set(state.tasks.map(task => task.industry).filter(Boolean))]} t={t} tasks={tasks} teamProfiles={state.teamProfiles} proposalCounts={state.proposalCounts} filter={filter} setFilter={setFilter} role={role} userId={user.id} userName={user.name} />}
        {view === "create" && role === "business" && <TaskWorkflow locale={locale} initialTaskId={initialTaskId} onCatalog={async () => { await refresh(); router.push("/catalog"); }} />}
        {view === "proposals" && <ProposalList t={t} locale={locale} state={state} role={role} refresh={refresh} />}
      </>}
    </main>
  </div>;
}

function DashboardHome({t,locale,user,state}:{t:typeof copy.ru|typeof copy.kk;locale:Locale;user:SessionUser;state:State}) {
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
      {isBusiness ? <TaskCards tasks={ownTasks} proposalCounts={state.proposalCounts} t={t} locale={locale}/> : <ProposalList t={t} locale={locale} state={state} role="team" refresh={async()=>{}} compact/>}
    </section>
  </div>;
}

function TaskCards({tasks,proposalCounts,t,locale}:{tasks:Task[];proposalCounts:Record<number,number>;t:typeof copy.ru|typeof copy.kk;locale:Locale}) {
  if (!tasks.length) return <div className="card p-10 text-center text-slate-500">{t.empty}</div>;
  return <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{tasks.map(task=><article key={task.id} className="card p-6"><div className="mb-4 flex justify-between"><span className="tag">{task.industry}</span><Score value={task.score}/></div><h3 className="text-lg font-extrabold">{task.title}</h3><p className="mt-3 text-sm text-slate-500">{proposalCounts[task.id]??0} {t.responses}</p><Link href={`/business/tasks/new?task=${task.id}`} className="secondary mt-5"><Pencil size={16}/>{locale==="ru"?"Редактировать и пересчитать":"Өңдеу және қайта есептеу"}</Link></article>)}</div>;
}

function Nav({active,href,children}:{active:boolean;href:string;children:React.ReactNode}){return <Link href={href} className={`rounded-lg px-3 py-2 text-sm font-semibold ${active?"bg-indigo-50 text-indigo-700":"text-slate-600"}`}>{children}</Link>}
function Score({value}:{value:number}){return <div className="grid size-14 place-items-center rounded-full" style={{background:`conic-gradient(#4f46e5 ${value}%,#e2e8f0 0)`}}><div className="grid size-11 place-items-center rounded-full bg-white text-sm font-black">{value}</div></div>}

function Catalog({locale,industries,t,tasks,teamProfiles,proposalCounts,filter,setFilter,role,userId,userName}:{locale:Locale;industries:string[];t:typeof copy.ru|typeof copy.kk;tasks:Task[];teamProfiles:TeamProfile[];proposalCounts:Record<number,number>;filter:string;setFilter:(x:string)=>void;role:Role;userId:number;userName:string}){const router=useRouter();const [selected,setSelected]=useState<Task|null>(null);
  const [industry,setIndustry]=useState("");
  const [sort,setSort]=useState("desc");
  const visible=tasks.filter(task=>!industry||task.industry===industry).toSorted((a,b)=>sort==="asc"?a.score-b.score||a.id-b.id:b.score-a.score||b.id-a.id);
  return <><section className="mb-10 rounded-3xl bg-slate-950 px-8 py-10 text-white md:px-12"><span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-indigo-200"><Sparkles size={13}/>{t.tagline}</span><h1 className="max-w-3xl text-4xl font-black md:text-5xl">{t.hero}</h1><p className="mt-4 max-w-2xl text-slate-300">{t.heroText}</p></section><div className="mb-6 flex flex-wrap gap-2"><Filter size={17}/>{["all","draft","workable","ready","priority"].map(k=><button key={k} onClick={()=>setFilter(k)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter===k?"bg-indigo-600 text-white":"border bg-white"}`}>{t[k as "all"|"draft"|"workable"|"ready"|"priority"]}</button>)}</div><div className="mb-6 flex flex-wrap gap-4">
    <label className="text-sm font-semibold">{locale==="ru"?"Отрасль / тема":"Сала / тақырып"}<select className="input mt-2" value={industry} onChange={e=>setIndustry(e.target.value)}><option value="">{t.all}</option>{industries.map(value=><option key={value}>{value}</option>)}</select></label>
    <label className="text-sm font-semibold">{locale==="ru"?"Сортировка по готовности":"Дайындық бойынша сұрыптау"}<select className="input mt-2" value={sort} onChange={e=>setSort(e.target.value)}><option value="desc">{locale==="ru"?"Сначала наиболее готовые":"Алдымен ең дайындары"}</option><option value="asc">{locale==="ru"?"Сначала наименее готовые":"Алдымен дайындығы төмендері"}</option></select></label>
  </div>{!visible.length&&<p className="card p-8">{locale==="ru"?"Нет задач по выбранным фильтрам":"Таңдалған сүзгілер бойынша міндеттер жоқ"}</p>}<div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{visible.map(task=><article key={task.id} className="card flex flex-col p-6"><div className="mb-5 flex justify-between"><span className="tag">{task.industry}</span><div className="flex flex-col items-center gap-1"><Score value={task.score}/><span className="text-xs text-slate-600">{t[readinessLevel(task.score)]} · {task.score}/100</span></div></div><h2 className="text-xl font-extrabold">{task.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{task.need||task.context}</p><div className="mt-auto flex justify-between border-t pt-5"><span className="text-xs text-slate-500">{proposalCounts[task.id] ?? 0} {t.responses}</span><button onClick={()=>setSelected(task)} className="font-bold text-indigo-600">{role==="team"?t.proposal:t.open} <ArrowRight className="inline" size={15}/></button></div></article>)}</div><TeamProfiles profiles={teamProfiles} locale={locale}/>{selected&&<TaskModal locale={locale} task={selected} userName={userName} role={role} canEdit={role==="business"&&selected.ownerId===userId} t={t} close={()=>setSelected(null)} done={()=>{setSelected(null);router.push("/student/proposals");router.refresh()}}/>}</>}

function TeamProfiles({profiles,locale}:{profiles:TeamProfile[];locale:Locale}){
  if(!profiles.length)return null;
  return <section className="mt-14"><span className="eyebrow">{locale==="ru"?"Команды":"Командалар"}</span><h2 className="mt-3 text-3xl font-black">{locale==="ru"?"Профили студенческих команд":"Студенттік команда профильдері"}</h2><div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{profiles.map(profile=><article key={profile.id} className="card p-6"><h3 className="text-xl font-black">{profile.name}</h3><dl className="mt-4 space-y-4 text-sm"><div><dt className="font-bold text-slate-500">{locale==="ru"?"Интересы":"Қызығушылықтар"}</dt><dd className="mt-1">{profile.interests}</dd></div><div><dt className="font-bold text-slate-500">{locale==="ru"?"Навыки":"Дағдылар"}</dt><dd className="mt-1">{profile.skills}</dd></div><div><dt className="font-bold text-slate-500">{locale==="ru"?"Технологии":"Технологиялар"}</dt><dd className="mt-1">{profile.technologies}</dd></div></dl></article>)}</div></section>;
}

function TaskModal({locale,task,userName,role,canEdit,t,close,done}:{locale:Locale;task:Task;userName:string;role:Role;canEdit:boolean;t:typeof copy.ru|typeof copy.kk;close:()=>void;done:()=>void}){
  return <div role="dialog" aria-modal="true" aria-labelledby="task-title" className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4" onMouseDown={close}>
    <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-7" onMouseDown={event=>event.stopPropagation()}>
      <button onClick={close} aria-label={locale==="ru"?"Закрыть":"Жабу"} className="float-right text-2xl">×</button>
      <span className="tag">{task.industry}</span>
      <h2 id="task-title" className="mt-3 pr-8 text-3xl font-black">{task.title}</h2>
      <p className="mt-5 leading-7 text-slate-600">{task.context}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{(["need","users","dataMaterials","constraints","expectedResult","successCriteria","contact","interactionFormat"] as const).map(key=><div key={key} className="rounded-xl bg-slate-50 p-4"><p className="mb-1 text-xs font-bold uppercase text-slate-400">{t.fields[key]}</p><p className="text-sm leading-6">{task[key]||(locale==="ru"?"⚠ Не указано":"⚠ Көрсетілмеген")}</p></div>)}</div>
      <div className="mt-6"><WorkflowRating card={task} locale={locale} confirmed /></div>
      {canEdit&&<Link href={`/business/tasks/new?task=${task.id}`} className="primary mt-6"><Pencil size={16}/>{locale==="ru"?"Редактировать и пересчитать рейтинг":"Өңдеу және рейтингті қайта есептеу"}</Link>}
      {role==="team"&&<ProposalForm taskId={task.id} initialTeamName={userName} locale={locale} onSubmitted={done}/>}
    </div>
  </div>;
}

function ProposalList({t,locale,state,role,refresh,compact=false}:{t:typeof copy.ru|typeof copy.kk;locale:Locale;state:State;role:Role;refresh:()=>Promise<void>;compact?:boolean}){
  const [error,setError]=useState(false);const [busyId,setBusyId]=useState<number|null>(null);
  async function decide(id:number,status:"accepted"|"rejected"){setBusyId(id);setError(false);try{const response=await apiFetch("/api/state",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"proposalStatus",id,status})});if(!response.ok)throw new Error("Decision failed");await refresh()}catch{setError(true)}finally{setBusyId(null)}}
  const formatter=new Intl.DateTimeFormat(locale==="ru"?"ru-KZ":"kk-KZ",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
  const statusClass={pending:"bg-amber-50 text-amber-700",accepted:"bg-emerald-50 text-emerald-700",rejected:"bg-red-50 text-red-700"} as const;
  return <div>{!compact&&<><span className="eyebrow">{t.proposals}</span><h1 className="mt-4 text-4xl font-black">{role==="business"?t.incoming:t.myProposals}</h1><p className="mt-3 text-slate-600">{role==="business"?t.incomingText:t.studentProposalText}</p></>}{error&&<p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{t.error}</p>}<div className={compact?"space-y-4":"mt-8 space-y-4"}>{!state.proposals.length&&<div className="card p-10 text-center text-slate-500">{role==="business"?t.empty:t.studentEmpty}</div>}{state.proposals.map(proposal=>{const task=state.tasks.find(item=>item.id===proposal.taskId);const status=proposal.status as "accepted"|"rejected"|"pending";return <article key={proposal.id} className="card p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><span className="tag">{proposal.teamName}</span><h2 className="mt-3 text-xl font-black">{task?.title??`#${proposal.taskId}`}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[status]}`}>{t[status]}</span></div>
    <div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4 md:col-span-2"><p className="label">{t.idea}</p><p className="text-sm leading-6 text-slate-700">{proposal.solutionIdea}</p></div><div className="rounded-xl bg-slate-50 p-4 md:col-span-2"><p className="label">{t.plan}</p><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{proposal.plan}</p></div><div className="flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={17}/><b>{t.duration}:</b> {proposal.estimatedDuration}</div>{proposal.prototypeUrl&&<a className="flex items-center gap-2 break-all text-sm font-bold text-indigo-600 hover:underline" href={proposal.prototypeUrl} target="_blank" rel="noreferrer"><ExternalLink size={17}/>{t.viewPrototype}</a>}</div>
    <p className="mt-5 text-xs text-slate-400">{t.submitted}: {formatter.format(new Date(proposal.createdAt))}</p>
    {role==="business"&&status==="pending"&&<div className="mt-5 flex flex-wrap gap-2"><button disabled={busyId!==null} onClick={()=>decide(proposal.id,"accepted")} className="primary">{busyId===proposal.id?<Loader2 className="animate-spin"/>:<Check/>}{t.accept}</button><button disabled={busyId!==null} onClick={()=>decide(proposal.id,"rejected")} className="secondary">{t.reject}</button></div>}
  </article>})}</div></div>;
}
