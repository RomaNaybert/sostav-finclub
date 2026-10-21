export async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(`${import.meta.env.BASE_URL}api${path}`, {
      credentials: "same-origin",
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Sostav-Request": "1",
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new Error(
      "Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.",
    );
  }
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Проверьте заполнение полей",
    );
    error.status = response.status;
    if (response.status === 401 && path !== "/auth/login")
      window.dispatchEvent(new Event("session-expired"));
    throw error;
  }
  return data;
}
