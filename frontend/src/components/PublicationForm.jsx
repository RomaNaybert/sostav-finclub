import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { api } from "../api";
import { Modal, Field, ErrorMessage } from "./UI";
const emptyForm = () => ({
  request_id: crypto.randomUUID(),
  kind: "startup",
  project: "",
  title: "",
  description: "",
  roles: "",
  commitment: "5–10 ч / неделю",
  location: "Удалённо",
  reward: "",
  status: "active",
});
export function PublicationForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() =>
      initial ? { ...initial, request_id: crypto.randomUUID() } : emptyForm(),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const {
        request_id,
        kind,
        project,
        title,
        description,
        roles,
        commitment,
        location,
        reward,
        status,
      } = form;
      await api(initial ? `/publications/${initial.id}` : "/publications", {
        method: initial ? "PUT" : "POST",
        body: {
          request_id,
          kind,
          project,
          title,
          description,
          roles,
          commitment,
          location,
          reward,
          status: status === "draft" ? "draft" : "active",
        },
      });
      onSave(
        initial
          ? "Изменения сохранены"
          : status === "draft"
            ? "Черновик сохранён"
            : "Объявление опубликовано",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={initial ? "Редактировать объявление" : "Начнём с вашей идеи"}
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        <p className="form-intro">
          Расскажите, что вы делаете и кто поможет сделать следующий шаг.
        </p>
        <div className="form-grid">
          <Field label="Тип публикации">
            <select value={form.kind} onChange={change("kind")}>
              <option value="startup">Стартап — собираю команду</option>
              <option value="vacancy">Вакансия — ищу специалиста</option>
            </select>
          </Field>
          <Field label="Название проекта">
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.project}
              onChange={change("project")}
              placeholder="Например, Finflow"
            />
          </Field>
        </div>
        <Field label="Заголовок">
          <input
            required
            minLength={5}
            maxLength={120}
            value={form.title}
            onChange={change("title")}
            placeholder="Коротко: что делаете или кого ищете"
          />
        </Field>
        <Field
          label="О проекте и задачах"
          hint="От 30 до 6000 символов. Что уже есть, что предстоит сделать и зачем присоединяться."
        >
          <textarea
            required
            minLength={30}
            maxLength={6000}
            rows={4}
            value={form.description}
            onChange={change("description")}
          />
        </Field>
        <Field label="Кого ищете" hint="Разделяйте роли и навыки запятыми">
          <input
            required
            minLength={2}
            maxLength={300}
            value={form.roles}
            onChange={change("roles")}
            placeholder="Python, Product design"
          />
        </Field>
        <div className="form-grid">
          <Field label="Занятость">
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.commitment}
              onChange={change("commitment")}
            />
          </Field>
          <Field label="Где работаем">
            <input
              required
              minLength={2}
              maxLength={80}
              value={form.location}
              onChange={change("location")}
            />
          </Field>
        </div>
        <Field label="Что предлагаете">
          <input
            required
            minLength={2}
            maxLength={200}
            value={form.reward}
            onChange={change("reward")}
            placeholder="Оплата, доля или опыт — напишите честно"
          />
        </Field>
        {!initial && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.status === "draft"}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.checked ? "draft" : "active",
                })
              }
            />
            Пока сохранить в черновики
          </label>
        )}
        <ErrorMessage text={error} />
        <button className="primary full" disabled={busy}>
          {busy
            ? "Сохраняем…"
            : initial
              ? "Сохранить изменения"
              : form.status === "draft"
                ? "Сохранить черновик"
                : "Опубликовать"}
          <ArrowRight size={20} />
        </button>
      </form>
    </Modal>
  );
}
