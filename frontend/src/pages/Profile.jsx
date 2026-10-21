import { useState } from "react";
import { Check } from "@phosphor-icons/react";
import { api } from "../api";
import { Avatar, Field, ErrorMessage } from "../components/UI";
export function Profile({ user, onSave }) {
  const [form, setForm] = useState({
      name: user.name,
      bio: user.bio,
      skills: user.skills,
      telegram: user.telegram,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSave(await api("/me", { method: "PATCH", body: form }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="profile-panel">
      <div className="profile-intro">
        <Avatar user={user} size={76} />
        <div>
          <h2>{user.name}</h2>
          <p>{user.email}</p>
        </div>
      </div>
      <form onSubmit={submit}>
        {[
          ["name", "Как вас зовут", 80],
          ["bio", "О себе", 1200],
          ["skills", "Навыки через запятую", 300],
          ["telegram", "Telegram", 32],
        ].map(([key, label, max]) => (
          <Field
            key={key}
            label={label}
            hint={
              key === "telegram"
                ? "Контакт увидит другая сторона после принятия отклика. В демо контакты вымышлены."
                : undefined
            }
          >
            {key === "bio" ? (
              <textarea
                rows={4}
                maxLength={max}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            ) : (
              <input
                required={key === "name"}
                minLength={key === "name" ? 2 : undefined}
                maxLength={max}
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            )}
          </Field>
        ))}
        <ErrorMessage text={error} />
        <button className="primary" disabled={busy}>
          {busy ? "Сохраняем…" : "Сохранить профиль"}
          <Check size={20} />
        </button>
      </form>
    </section>
  );
}
