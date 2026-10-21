import { useState } from "react";
import { ArrowRight, ArrowUpRight } from "@phosphor-icons/react";
import { api } from "../api";
import { Avatar, Field, ErrorMessage } from "../components/UI";
export function Login({ onLogin }) {
  const [email, setEmail] = useState("maria@demo.local"),
    [password, setPassword] = useState("Demo2026!"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e, selected) {
    e?.preventDefault();
    setError("");
    setBusy(true);
    try {
      onLogin(
        await api("/auth/login", {
          method: "POST",
          body: {
            email: selected || email,
            password: selected ? "Demo2026!" : password,
          },
        }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="login-story">
        <a className="brand" href={import.meta.env.BASE_URL}>
          СОСТАВ{" "}
          <span>
            БИЗНЕС-КЛУБ
            <br />
            ВШЭ
          </span>
        </a>
        <h1>
          Есть идея?
          <br />
          Найдутся свои.
        </h1>
        <p>
          Место, где участники Бизнес-клуба
          <br />
          становятся командой.
        </p>
        <img
          src={`${import.meta.env.BASE_URL}assets/binder-clips.webp`}
          alt="Три соединённых зелёных зажима"
        />
      </div>
      <section className="login-panel">
        <span className="eyebrow">СВОИ ЛЮДИ. ОБЩЕЕ ДЕЛО.</span>
        <h2>
          Привет, будущий
          <br />
          участник команды.
        </h2>
        <p>Войдите, чтобы найти проект или собрать свой.</p>
        <form onSubmit={submit}>
          <Field label="Почта">
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Пароль">
            <input
              type="password"
              autoComplete="current-password"
              required
              maxLength={128}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <ErrorMessage text={error} />
          <button disabled={busy} className="primary full">
            {busy ? "Входим…" : "Войти"}
            <ArrowRight size={20} />
          </button>
        </form>
        <div className="demo">
          <span>ПОПРОБОВАТЬ БЕЗ РЕГИСТРАЦИИ</span>
          <p>
            Два тестовых аккаунта. Можно публиковать,
            <br />
            откликаться и менять роли.
          </p>
          <div>
            {[
              { name: "Мария", avatar: "maria", email: "maria@demo.local" },
              { name: "Алексей", avatar: "alex", email: "alex@demo.local" },
            ].map((u) => (
              <button
                key={u.email}
                disabled={busy}
                onClick={() => submit(null, u.email)}
              >
                <Avatar user={u} size={30} />
                {u.name}
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </div>
        <small className="muted">Данные и контакты в демо вымышлены.</small>
      </section>
    </main>
  );
}
