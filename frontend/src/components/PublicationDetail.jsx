import { useState } from "react";
import { ArrowRight, PaperPlaneTilt } from "@phosphor-icons/react";
import { api } from "../api";
import { STATUS } from "../constants";
import { Avatar, Modal, Field, ErrorMessage } from "./UI";
export function Detail({ item, user, sent, onClose, onSave }) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [writing, setWriting] = useState(false);
  const existing = sent.find((a) => a.publication.id === item.id),
    own = user.id === item.owner_id;
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/publications/${item.id}/applications`, {
        method: "POST",
        body: { message },
      });
      onSave("Отклик отправлен. Решение появится в разделе «Отклики»");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={item.project} onClose={onClose} wide>
      <span className="eyebrow">
        {item.kind === "startup" ? "СОБИРАЕМ КОМАНДУ" : "ВАКАНСИЯ"} ·{" "}
        {STATUS[item.status]}
      </span>
      <h2 className="detail-title">{item.title}</h2>
      <p className="detail-description">{item.description}</p>
      <h3>Кого ищем</h3>
      <div className="tags detail-tags">
        {item.roles.split(",").map((r) => (
          <span key={r}>{r.trim()}</span>
        ))}
      </div>
      <div className="detail-facts">
        <div>
          <small>Формат</small>
          <p>{item.location}</p>
        </div>
        <div>
          <small>Занятость</small>
          <p>{item.commitment}</p>
        </div>
        <div>
          <small>Что предлагаем</small>
          <p>{item.reward}</p>
        </div>
      </div>
      <div className="detail-author">
        <Avatar user={item.owner} />
        <div>
          <strong>{item.owner.name}</strong>
          <small>{item.owner.bio}</small>
        </div>
      </div>
      {own ? (
        <p className="notice">
          Это ваше объявление. Отклики участников появятся в разделе «Отклики →
          Полученные».
        </p>
      ) : existing ? (
        <p className={`notice ${existing.status}`}>
          {STATUS[existing.status]}. Все подробности — в разделе «Отклики».
        </p>
      ) : item.status !== "active" ? (
        <p className="notice">
          Набор закрыт. Посмотрите другие предложения в ленте.
        </p>
      ) : writing ? (
        <form onSubmit={submit}>
          <Field
            label="Почему вам интересно?"
            hint="От 15 до 2000 символов. Расскажите о себе и о том, чем можете помочь."
          >
            <textarea
              autoFocus
              required
              minLength={15}
              maxLength={2000}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <ErrorMessage text={error} />
          <button className="primary full" disabled={busy}>
            {busy ? "Отправляем…" : "Отправить отклик"}
            <PaperPlaneTilt size={20} />
          </button>
        </form>
      ) : (
        <button className="primary full" onClick={() => setWriting(true)}>
          Хочу в команду
          <ArrowRight size={20} />
        </button>
      )}
    </Modal>
  );
}
