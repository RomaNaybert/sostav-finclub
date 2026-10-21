import { Clock, ArrowRight, PencilSimple } from "@phosphor-icons/react";
import { Avatar } from "./UI";
import { STATUS } from "../constants";
export function Card({ item, onOpen, mine, onStatus, onEdit, busy }) {
  const color =
    item.project === "Finflow"
      ? "green"
      : item.project === "Круг"
        ? "pink"
        : "cream";
  return (
    <article className={`offer-card ${color}`}>
      <div className="card-top">
        <span className={`kind ${item.kind}`}>
          {item.kind === "startup" ? "СТАРТАП" : "ВАКАНСИЯ"}
        </span>
        {mine && <span className="small-status">{STATUS[item.status]}</span>}
      </div>
      {item.project === "Finflow" && (
        <img
          className="sticky"
          src={`${import.meta.env.BASE_URL}assets/cofounder-note.webp`}
          alt="Ищем сооснователя"
        />
      )}
      {["Nota", "Orbit", "Круг"].includes(item.project) && (
        <img
          className={`project-mark ${item.project === "Круг" ? "coffee" : ""}`}
          src={`${import.meta.env.BASE_URL}assets/${item.project === "Круг" ? "coffee-note" : item.project.toLowerCase()}.webp`}
          alt=""
        />
      )}
      <button className="card-title-button" onClick={() => onOpen(item)}>
        <h2>{item.project}</h2>
        <h3>{item.title}</h3>
      </button>
      <p className="card-description">{item.description}</p>
      <div className="card-bottom">
        <div className="commitment">
          <Clock size={20} weight="light" />
          {item.commitment}
        </div>
        <div className="tags">
          {item.roles.split(",").map((t) => (
            <span key={t}>{t.trim()}</span>
          ))}
        </div>
        <div className="card-author">
          <Avatar user={item.owner} />
          <div>
            <strong>{item.owner.name.split(" ")[0]}</strong>
            <small>
              {item.kind === "startup"
                ? "Автор идеи"
                : `Команда ${item.project}`}
            </small>
          </div>
          <button
            className="circle-button"
            onClick={() => onOpen(item)}
            aria-label={`Открыть ${item.project}`}
          >
            <ArrowRight size={23} />
          </button>
        </div>
        {mine && (
          <div className="owner-actions">
            <button
              disabled={busy || item.status === "closed"}
              onClick={() => onEdit(item)}
            >
              <PencilSimple size={16} />
              Изменить
            </button>
            <button disabled={busy} onClick={() => onStatus(item)}>
              {item.status === "active"
                ? "Закрыть набор"
                : item.status === "draft"
                  ? "Опубликовать"
                  : "Открыть набор"}
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
