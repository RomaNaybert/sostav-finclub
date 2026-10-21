import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  MagnifyingGlass,
  X,
  Plus,
  ArrowUpRight,
  CaretDown,
  SignOut,
  Check,
  SpinnerGap,
} from "@phosphor-icons/react";
import { api } from "./api";
import { STATUS } from "./constants";
import { Avatar, ErrorMessage, Modal, Empty } from "./components/UI";
import { Card } from "./components/PublicationCard";
import { PublicationForm } from "./components/PublicationForm";
import { Detail } from "./components/PublicationDetail";
import { Login } from "./pages/Login";
import { Profile } from "./pages/Profile";
import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/500.css";
import "@fontsource/golos-text/600.css";
import "@fontsource/golos-text/700.css";
import "@fontsource/golos-text/800.css";
import "@fontsource/golos-text/900.css";

export function App() {
  const [user, setUser] = useState(null),
    [booting, setBooting] = useState(true),
    [bootError, setBootError] = useState(""),
    [tab, setTab] = useState("feed"),
    [kind, setKind] = useState(""),
    [query, setQuery] = useState(""),
    [posts, setPosts] = useState([]),
    [sent, setSent] = useState([]),
    [received, setReceived] = useState([]),
    [direction, setDirection] = useState("received"),
    [loading, setLoading] = useState(false),
    [total, setTotal] = useState(0),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [accountOpen, setAccountOpen] = useState(false);
  const searchRef = useRef(0);
  useEffect(() => {
    let live = true;
    api("/me")
      .then((u) => live && setUser(u))
      .catch((e) => {
        if (live && e.status !== 401) setBootError(e.message);
      })
      .finally(() => live && setBooting(false));
    const expired = () => {
      setUser(null);
      setModal(null);
      setPosts([]);
      setSent([]);
      setReceived([]);
      setTab("feed");
      setToast("");
      setError("");
    };
    window.addEventListener("session-expired", expired);
    return () => {
      live = false;
      window.removeEventListener("session-expired", expired);
    };
  }, []);
  useEffect(() => {
    if (!user) return;
    let live = true;
    Promise.all([
      api("/applications?direction=sent"),
      api("/applications?direction=received"),
    ])
      .then(([s, r]) => {
        if (live) {
          setSent(s);
          setReceived(r);
        }
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [user?.id, revision]);
  useEffect(() => {
    if (!user || !["feed", "mine"].includes(tab)) return;
    const seq = ++searchRef.current;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      api(
        `/publications?mine=${tab === "mine"}&kind=${kind}&q=${encodeURIComponent(query)}`,
      )
        .then((d) => {
          if (seq === searchRef.current) {
            setPosts(d.items);
            setTotal(d.total);
          }
        })
        .catch((e) => {
          if (seq === searchRef.current) setError(e.message);
        })
        .finally(() => {
          if (seq === searchRef.current) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      searchRef.current++;
    };
  }, [user?.id, tab, kind, query, revision]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(t);
  }, [toast]);
  function saved(message) {
    setModal(null);
    setToast(message);
    setRevision((v) => v + 1);
  }
  function navigate(t) {
    setTab(t);
    setQuery("");
    setKind("");
    setError("");
    setAccountOpen(false);
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      setUser(null);
      setPosts([]);
      setSent([]);
      setReceived([]);
      setTab("feed");
      setAccountOpen(false);
    } catch (e) {
      setError(e.message);
    }
  }
  async function changeStatus(item) {
    if (item.status === "active") {
      setModal({ type: "close", item });
      return;
    }
    await executeStatus(item);
  }
  async function executeStatus(item) {
    setBusy(true);
    setError("");
    try {
      await api(`/publications/${item.id}/status`, {
        method: "PATCH",
        body: { status: item.status === "active" ? "closed" : "active" },
      });
      saved(
        item.status === "active"
          ? "Набор закрыт. Ожидающие отклики отклонены"
          : "Набор открыт",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function decide(a, status) {
    setBusy(true);
    setError("");
    try {
      await api(`/applications/${a.id}`, { method: "PATCH", body: { status } });
      saved(
        status === "accepted"
          ? "Отлично, теперь вы в одной команде"
          : status === "withdrawn"
            ? "Отклик отозван"
            : "Решение сохранено",
      );
    } catch (e) {
      setError(e.message);
      setRevision((v) => v + 1);
    } finally {
      setBusy(false);
    }
  }
  if (booting)
    return (
      <div className="splash">
        <span className="brand">СОСТАВ</span>
        <SpinnerGap size={28} className="spin" />
      </div>
    );
  if (!user)
    return (
      <>
        <Login
          onLogin={(u) => {
            setUser(u);
            setBootError("");
          }}
        />
        {bootError && (
          <div className="connection-error" role="alert">
            {bootError}
            <button onClick={() => location.reload()}>Повторить</button>
          </div>
        )}
      </>
    );
  const applications = direction === "sent" ? sent : received;
  const nav = [
    ["feed", "Лента"],
    ["mine", "Мои публикации"],
    ["applications", "Отклики"],
    ["profile", "Профиль"],
  ];
  return (
    <div className="app">
      <header className="header">
        <button className="brand" onClick={() => navigate("feed")}>
          СОСТАВ
          <span>
            БИЗНЕС-КЛУБ
            <br />
            ВШЭ
          </span>
        </button>
        <nav aria-label="Основная навигация">
          {nav.map(([key, label]) => (
            <button
              key={key}
              aria-current={tab === key ? "page" : undefined}
              className={tab === key ? "active" : ""}
              onClick={() => navigate(key)}
            >
              {label}
              {key === "applications" &&
                received.some((a) => a.status === "pending") && (
                  <span className="nav-dot" />
                )}
            </button>
          ))}
        </nav>
        <div className="account">
          <button
            className="account-button"
            aria-label={`Аккаунт: ${user.name}`}
            aria-expanded={accountOpen}
            onClick={() => setAccountOpen(!accountOpen)}
          >
            <Avatar user={user} />
            <span>{user.name}</span>
            <CaretDown size={15} />
          </button>
          {accountOpen && (
            <div className="account-menu">
              <small>Тестовый аккаунт</small>
              <strong>{user.email}</strong>
              <button onClick={logout}>
                <SignOut size={18} />
                Выйти и сменить аккаунт
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="main">
        {tab === "feed" ? (
          <section className="hero">
            <div className="hero-copy">
              <h1>
                Есть идея?
                <br />
                Найдутся свои.
              </h1>
              <p>Собери команду внутри Бизнес-клуба.</p>
              <button
                className="primary hero-button"
                onClick={() => setModal({ type: "create" })}
              >
                Разместить объявление
                <ArrowRight size={23} />
              </button>
            </div>
            <div className="hero-art">
              <img
                src={`${import.meta.env.BASE_URL}assets/binder-clips.webp`}
                alt="Три зелёных зажима, соединённые в цепочку"
              />
              <img
                className="stamp"
                src={`${import.meta.env.BASE_URL}assets/club-stamp.webp`}
                alt="Бизнес-клуб"
              />
            </div>
          </section>
        ) : (
          <section className="page-heading">
            <div>
              <span className="eyebrow">ВАШЕ МЕСТО В СОСТАВЕ</span>
              <h1>
                {tab === "mine"
                  ? "Ваши идеи в деле."
                  : tab === "applications"
                    ? "На связи с командой."
                    : "Давайте знакомиться."}
              </h1>
              <p>
                {tab === "mine"
                  ? "Публикации, черновики и управление набором."
                  : tab === "applications"
                    ? "Все знакомства начинаются с одного отклика."
                    : "Расскажите, что умеете и что вам интересно."}
              </p>
            </div>
            {tab === "mine" && (
              <button
                className="primary"
                onClick={() => setModal({ type: "create" })}
              >
                Новая публикация
                <Plus size={20} />
              </button>
            )}
          </section>
        )}
        <ErrorMessage text={error} />
        {error && (
          <button
            className="text-button"
            onClick={() => setRevision((v) => v + 1)}
          >
            Попробовать ещё раз
          </button>
        )}
        {["feed", "mine"].includes(tab) && (
          <>
            <div className="feed-controls">
              <label className="search">
                <MagnifyingGlass size={23} />
                <input
                  aria-label="Поиск объявлений"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск по объявлениям, навыкам или ключевым словам…"
                />
                {query && (
                  <button
                    className="icon-button"
                    onClick={() => setQuery("")}
                    aria-label="Очистить поиск"
                  >
                    <X size={18} />
                  </button>
                )}
              </label>
              <div className="filters" aria-label="Тип объявления">
                {[
                  ["", "Все"],
                  ["startup", "Стартапы"],
                  ["vacancy", "Вакансии"],
                ].map(([value, label]) => (
                  <button
                    aria-pressed={kind === value}
                    key={value}
                    className={kind === value ? "selected" : ""}
                    onClick={() => setKind(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="loading" role="status">
                <SpinnerGap className="spin" size={28} />
                Ищем своих…
              </div>
            ) : posts.length ? (
              <section className="offers" aria-label="Объявления">
                {posts.map((item) => (
                  <Card
                    key={item.id}
                    item={item}
                    mine={tab === "mine"}
                    busy={busy}
                    onOpen={(item) => setModal({ type: "detail", item })}
                    onEdit={(item) => setModal({ type: "edit", item })}
                    onStatus={changeStatus}
                  />
                ))}
              </section>
            ) : (
              !error && (
                <Empty
                  title={
                    query || kind
                      ? "Пока ничего не нашлось"
                      : "Здесь начнётся ваша история"
                  }
                  text={
                    query || kind
                      ? "Попробуйте другой запрос или уберите фильтр."
                      : "Опубликуйте идею или вакансию — свои люди найдутся."
                  }
                  action={
                    <button
                      className="primary"
                      onClick={() =>
                        query || kind
                          ? (setQuery(""), setKind(""))
                          : setModal({ type: "create" })
                      }
                    >
                      {query || kind ? "Сбросить поиск" : "Создать публикацию"}
                      <ArrowRight size={20} />
                    </button>
                  }
                />
              )
            )}
          </>
        )}
        {["feed", "mine"].includes(tab) && !loading && posts.length < total && (
          <div className="load-more">
            <button
              className="secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const sequence = searchRef.current;
                try {
                  const result = await api(
                    `/publications?mine=${tab === "mine"}&kind=${kind}&q=${encodeURIComponent(query)}&offset=${posts.length}&limit=40`,
                  );
                  if (sequence === searchRef.current) {
                    setPosts((previous) => [...previous, ...result.items]);
                    setTotal(result.total);
                  }
                } catch (error) {
                  setError(error.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Показать ещё
              <ArrowRight size={18} />
            </button>
          </div>
        )}
        {tab === "applications" && (
          <>
            <div className="application-tabs">
              {[
                ["received", "Полученные", received],
                ["sent", "Отправленные", sent],
              ].map(([value, label, list]) => (
                <button
                  key={value}
                  className={direction === value ? "selected" : ""}
                  onClick={() => setDirection(value)}
                >
                  {label}
                  <span>{list.length}</span>
                </button>
              ))}
            </div>
            {applications.length ? (
              <div className="application-list">
                {applications.map((a) => (
                  <article key={a.id} className="application-item">
                    <div className="application-person">
                      <Avatar
                        user={
                          direction === "received"
                            ? a.applicant
                            : a.publication.owner
                        }
                        size={46}
                      />
                      <div>
                        <span className="eyebrow">
                          {direction === "received"
                            ? a.applicant.name
                            : a.publication.owner.name}
                        </span>
                        <button
                          className="text-button"
                          onClick={() =>
                            setModal({ type: "detail", item: a.publication })
                          }
                        >
                          <h2>
                            {a.publication.project} <ArrowUpRight size={20} />
                          </h2>
                        </button>
                      </div>
                      <span className={`status-badge ${a.status}`}>
                        {STATUS[a.status]}
                      </span>
                    </div>
                    <p className="application-message">{a.message}</p>
                    {direction === "received" && a.applicant.skills && (
                      <p className="muted">Навыки: {a.applicant.skills}</p>
                    )}
                    {a.status === "accepted" && (
                      <div className="notice accepted">
                        Вы в одной команде.{" "}
                        {a.contact ? (
                          <>
                            Свяжитесь в Telegram:{" "}
                            <strong>@{a.contact.replace(/^@/, "")}</strong>{" "}
                            <small>(вымышленный демо-контакт)</small>
                          </>
                        ) : (
                          "Участник пока не указал Telegram."
                        )}
                      </div>
                    )}
                    {a.status === "pending" && (
                      <div className="decision-actions">
                        {direction === "received" ? (
                          <>
                            <button
                              className="primary"
                              disabled={busy}
                              onClick={() => decide(a, "accepted")}
                            >
                              Пригласить в команду
                              <Check size={19} />
                            </button>
                            <button
                              className="secondary"
                              disabled={busy}
                              onClick={() => decide(a, "rejected")}
                            >
                              Отклонить
                            </button>
                          </>
                        ) : (
                          <button
                            className="secondary"
                            disabled={busy}
                            onClick={() => decide(a, "withdrawn")}
                          >
                            Отозвать отклик
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <Empty
                title={
                  direction === "received"
                    ? "Пока без откликов"
                    : "Первый шаг за вами"
                }
                text={
                  direction === "received"
                    ? "Когда кто-то захочет присоединиться к вашему проекту, вы увидите его здесь."
                    : "Найдите интересный проект в ленте и расскажите, чем можете помочь."
                }
                action={
                  <button
                    className="primary"
                    onClick={() =>
                      navigate(direction === "received" ? "mine" : "feed")
                    }
                  >
                    {direction === "received"
                      ? "К моим публикациям"
                      : "Посмотреть проекты"}
                    <ArrowRight size={20} />
                  </button>
                }
              />
            )}
          </>
        )}
        {tab === "profile" && (
          <Profile
            key={user.id}
            user={user}
            onSave={(u) => {
              setUser(u);
              setToast("Профиль сохранён");
              setRevision((v) => v + 1);
            }}
          />
        )}
      </main>
      <footer className="footer">
        <span>СОСТАВ · Бизнес-клуб ВШЭ</span>
        <span>От знакомства — к общему делу.</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          <Check size={20} />
          {toast}
          <button
            className="icon-button"
            aria-label="Закрыть уведомление"
            onClick={() => setToast("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {modal?.type === "create" && (
        <PublicationForm onClose={() => setModal(null)} onSave={saved} />
      )}
      {modal?.type === "edit" && (
        <PublicationForm
          initial={modal.item}
          onClose={() => setModal(null)}
          onSave={saved}
        />
      )}
      {modal?.type === "detail" && (
        <Detail
          item={modal.item}
          user={user}
          sent={sent}
          onClose={() => setModal(null)}
          onSave={saved}
        />
      )}
      {modal?.type === "close" && (
        <Modal title="Закрыть набор?" onClose={() => setModal(null)}>
          <p>
            Объявление «{modal.item.project}» исчезнет из ленты. Ожидающие
            отклики получат отказ. Принятые участники останутся в команде.
          </p>
          <p>Открыть набор заново можно в любое время.</p>
          <ErrorMessage text={error} />
          <button
            className="primary full"
            disabled={busy}
            onClick={() => executeStatus(modal.item)}
          >
            {busy ? "Закрываем…" : "Закрыть набор"}
          </button>
        </Modal>
      )}
    </div>
  );
}
