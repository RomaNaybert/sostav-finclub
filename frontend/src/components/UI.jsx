import React, { useEffect, useRef, useId } from "react";
import { X, Tray } from "@phosphor-icons/react";
export function Avatar({ user, size = 38 }) {
  return (
    <img
      className="avatar"
      src={`${import.meta.env.BASE_URL}assets/${user?.avatar || "maria"}.webp`}
      alt=""
      width={size}
      height={size}
    />
  );
}
export function ErrorMessage({ text }) {
  return text ? (
    <p className="error" role="alert">
      {text}
    </p>
  ) : null;
}
export function Field({ label, children, hint }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      {React.cloneElement(children, { id })}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const titleId = useId();
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    d.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      d.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="modal-inner">
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Закрыть"
          >
            <X size={23} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export function Empty({ title, text, action }) {
  return (
    <div className="empty">
      <Tray size={42} weight="light" />
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}
