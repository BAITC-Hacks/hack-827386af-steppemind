"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowRight, BriefcaseBusiness, Check, Eye, EyeOff, GraduationCap, Languages, Loader2, Sparkles } from "lucide-react";
import type { AccountRole } from "@/lib/auth-types";

const copy = {
  ru: {
    badge: "Бизнес и студенты — вместе", title: "Реальные задачи.\nНовые возможности.",
    intro: "Объединяем бизнес, которому нужны решения, и студентов, готовых создавать их.",
    steps: ["Понятные задачи от бизнеса", "Практический опыт для студентов", "Сотрудничество с реальным результатом"],
    loginTitle: "С возвращением", registerTitle: "Создайте аккаунт",
    loginHint: "Введите логин и пароль — мы определим ваш тип аккаунта.", registerHint: "Выберите, как вы будете участвовать в проектах.",
    business: "Бизнес", student: "Студент", businessHint: "Создаю задачи", studentHint: "Предлагаю решения",
    login: "Логин", loginHintField: "3–40 символов: a–z, 0–9, точка, дефис, _",
    password: "Пароль", passwordHint: "От 8 до 128 символов", confirm: "Повторите пароль",
    company: "Название компании", name: "Ваше имя", submitLogin: "Войти", submitRegister: "Зарегистрироваться",
    noAccount: "Ещё нет аккаунта?", hasAccount: "Уже есть аккаунт?", register: "Регистрация", signIn: "Войти",
    show: "Показать пароль", hide: "Скрыть пароль", mismatch: "Пароли не совпадают.",
    errors: { invalid_credentials: "Неверный логин или пароль.", login_taken: "Этот логин уже занят. Выберите другой.", invalid_data: "Проверьте заполнение полей и требования к логину и паролю.", too_many_attempts: "Слишком много попыток. Повторите через 15 минут.", unknown: "Не удалось подключиться. Попробуйте ещё раз." },
  },
  kk: {
    badge: "Бизнес пен студенттер — бірге", title: "Нақты міндеттер.\nЖаңа мүмкіндіктер.",
    intro: "Шешім іздейтін бизнес пен оны жасауға дайын студенттерді біріктіреміз.",
    steps: ["Бизнестің түсінікті міндеттері", "Студенттерге практикалық тәжірибе", "Нақты нәтижеге бағытталған жұмыс"],
    loginTitle: "Қайта қош келдіңіз", registerTitle: "Аккаунт жасаңыз",
    loginHint: "Логин мен құпиясөзді енгізіңіз — аккаунт түрін өзіміз анықтаймыз.", registerHint: "Жобаларға қалай қатысатыныңызды таңдаңыз.",
    business: "Бизнес", student: "Студент", businessHint: "Міндеттер құрамын", studentHint: "Шешімдер ұсынамын",
    login: "Логин", loginHintField: "3–40 таңба: a–z, 0–9, нүкте, дефис, _",
    password: "Құпиясөз", passwordHint: "8–128 таңба", confirm: "Құпиясөзді қайталаңыз",
    company: "Компания атауы", name: "Сіздің атыңыз", submitLogin: "Кіру", submitRegister: "Тіркелу",
    noAccount: "Аккаунтыңыз жоқ па?", hasAccount: "Аккаунтыңыз бар ма?", register: "Тіркелу", signIn: "Кіру",
    show: "Құпиясөзді көрсету", hide: "Құпиясөзді жасыру", mismatch: "Құпиясөздер сәйкес келмейді.",
    errors: { invalid_credentials: "Логин немесе құпиясөз қате.", login_taken: "Бұл логин бос емес. Басқасын таңдаңыз.", invalid_data: "Өрістерді және логин мен құпиясөз талаптарын тексеріңіз.", too_many_attempts: "Әрекет тым көп. 15 минуттан кейін қайталаңыз.", unknown: "Қосылу мүмкін болмады. Қайталап көріңіз." },
  },
};

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [locale, setLocale] = useState<"ru" | "kk">("ru");
  const [role, setRole] = useState<AccountRole>("business");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const t = copy[locale];
  const registering = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    if (registering && data.get("password") !== data.get("confirm")) { setError("mismatch"); return; }
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registering
          ? { login: data.get("login"), password: data.get("password"), name: data.get("name"), role }
          : { login: data.get("login"), password: data.get("password") }),
      });
      const result = await response.json();
      if (!response.ok) { setError(result.error ?? "unknown"); return; }
      window.location.replace(result.user.role === "business" ? "/business/dashboard" : "/student/dashboard");
    } catch { setError("unknown"); }
    finally { setBusy(false); }
  }

  return <main lang={locale} className="min-h-screen bg-[#f5f7fb] lg:grid lg:grid-cols-2">
    <section className="relative flex flex-col justify-between overflow-hidden bg-slate-950 p-8 text-white lg:min-h-screen lg:p-14">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 top-32 size-96 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="relative flex items-center gap-3 text-xl font-black"><span className="grid size-10 place-items-center rounded-xl bg-indigo-500"><Sparkles size={21} /></span>SteppeMind</div>
      <div className="relative my-20 hidden max-w-lg lg:block">
        <span className="inline-flex rounded-full border border-indigo-300/20 bg-indigo-400/10 px-4 py-2 text-xs font-bold text-indigo-200">{t.badge}</span>
        <h1 className="mt-7 whitespace-pre-line text-4xl font-black leading-tight tracking-tight lg:text-5xl">{t.title}</h1>
        <p className="mt-5 max-w-md leading-7 text-slate-300">{t.intro}</p>
        <ul className="mt-10 hidden space-y-5 lg:block">{t.steps.map(step => <li key={step} className="flex items-center gap-3 text-sm text-slate-200"><span className="grid size-7 place-items-center rounded-full bg-indigo-400/15 text-indigo-300"><Check size={15} /></span>{step}</li>)}</ul>
      </div>
      <p className="relative hidden text-xs font-semibold tracking-widest text-slate-500 lg:block">STEPPEMIND • AI SANA</p>
    </section>
    <section className="flex flex-col px-5 py-6 sm:px-12 lg:px-16">
      <div className="flex justify-end"><button type="button" className="control" onClick={() => setLocale(locale === "ru" ? "kk" : "ru")}><Languages size={16} />{locale === "ru" ? "ҚАЗ" : "РУС"}</button></div>
      <div className="mx-auto my-auto w-full max-w-md py-10">
        <h2 className="text-3xl font-black tracking-tight">{registering ? t.registerTitle : t.loginTitle}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-500">{registering ? t.registerHint : t.loginHint}</p>
        <form onSubmit={submit} className="mt-7 space-y-5">
          {registering && <fieldset disabled={busy} className="grid grid-cols-2 gap-3">
            <legend className="sr-only">{locale === "ru" ? "Тип аккаунта" : "Аккаунт түрі"}</legend>
            {(["business", "student"] as const).map(value => <label key={value} className={`relative flex cursor-pointer flex-col rounded-2xl border-2 p-4 transition ${role === value ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white"}`}>
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => { setRole(value); setError(""); }} className="absolute right-4 top-4 accent-indigo-600" />
              {value === "business" ? <BriefcaseBusiness className="mb-3 text-indigo-600" size={23} /> : <GraduationCap className="mb-3 text-indigo-600" size={23} />}
              <span className="text-sm font-extrabold">{t[value]}</span><span className="mt-1 text-xs text-slate-500">{value === "business" ? t.businessHint : t.studentHint}</span>
            </label>)}
          </fieldset>}
          {registering && <div><label className="label" htmlFor="name">{role === "business" ? t.company : t.name}</label><input className="input" id="name" name="name" autoComplete={role === "business" ? "organization" : "name"} required minLength={2} maxLength={100} disabled={busy} /></div>}
          <div><label className="label" htmlFor="login">{t.login}</label><input className="input" id="login" name="login" autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={40} pattern="[a-zA-Z0-9._\-]+" aria-describedby="login-help" disabled={busy} /><p id="login-help" className="mt-2 text-xs text-slate-500">{t.loginHintField}</p></div>
          <div><label className="label" htmlFor="password">{t.password}</label><div className="relative"><input className="input pr-12" id="password" name="password" type={visible ? "text" : "password"} autoComplete={registering ? "new-password" : "current-password"} required minLength={8} maxLength={128} aria-describedby={registering ? "password-help" : undefined} disabled={busy} /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? t.hide : t.show} className="absolute inset-y-0 right-0 px-4 text-slate-500">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{registering && <p id="password-help" className="mt-2 text-xs text-slate-500">{t.passwordHint}</p>}</div>
          {registering && <div><label className="label" htmlFor="confirm">{t.confirm}</label><input className="input" id="confirm" name="confirm" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} /></div>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error === "mismatch" ? t.mismatch : t.errors[error as keyof typeof t.errors] ?? t.errors.unknown}</p>}
          <button type="submit" disabled={busy} className="primary w-full">{busy ? <Loader2 className="animate-spin" /> : null}{registering ? t.submitRegister : t.submitLogin}{!busy && <ArrowRight size={17} />}</button>
        </form>
        <p className="mt-7 text-center text-sm text-slate-500">{registering ? t.hasAccount : t.noAccount} <Link className="font-bold text-indigo-600 hover:underline" href={registering ? "/login" : "/register"}>{registering ? t.signIn : t.register}</Link></p>
      </div>
    </section>
  </main>;
}
