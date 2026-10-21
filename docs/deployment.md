# Развёртывание демо

Адрес: https://roman-naipert.com/finclub/

- Источники и статика: `/opt/sostav/releases/20261021-01`, активная ссылка `/opt/sostav/current`.
- API: systemd `sostav`, loopback `127.0.0.1:8181`, пользователь `sostav`, Python 3.12.
- База: PostgreSQL 14, отдельные базы `sostav` и `sostav_test`; пароль вне исходников.
- Environment: `/etc/sostav.env`, права 0600. `APP_ORIGIN=https://roman-naipert.com`, `COOKIE_SECURE=true`, `COOKIE_PATH=/finclub/`.
- Nginx: `/etc/nginx/snippets/finclub.conf`, подключён только в HTTPS vhost портфолио.
- Резервная копия vhost перед публикацией: `/opt/sostav/backups/nginx-20261021-131100.conf`.

Сборка для подпапки:

```bash
cd frontend
npm ci
VITE_BASE_PATH=/finclub/ npm run build
```

Веб-каталог на сервере содержит `web/finclub/index.html` и `web/finclub/assets/`. Для следующих обновлений создать отдельный каталог release, скопировать статику и backend, проверить тесты, затем переключить `current` и перезапустить `sostav`. Перед изменением схемы нужна миграция и резервная копия PostgreSQL.

Откат первой публикации: восстановить сохранённый vhost, выполнить `nginx -t`, затем reload. Это уберёт маршрут приложения, сохранив данные базы. Для отката следующей версии переключить `current` на предыдущий release и перезапустить API.
