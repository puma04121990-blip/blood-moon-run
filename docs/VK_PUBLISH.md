# Публикация в VK Mini Apps / VK Games

Гайд для **Ночь Оборотня (Blood Moon Run)** — HTML5, portrait, mobile-first.

Официально: [dev.vk.com — Mini Apps](https://dev.vk.com/mini-apps/getting-started) · [Хостинг](https://dev.vk.com/mini-apps/development/hosting)

---

## 1. Создать приложение

1. Открой [vk.com/apps?act=manage](https://vk.com/apps?act=manage) или [dev.vk.com](https://dev.vk.com).
2. **Создать** → тип **VK Mini Apps** (игра / мини-приложение).
3. Заполни название: `Ночь Оборотня` / `Blood Moon Run`.
4. Скопируй **App ID** → впиши в:
   - `vk-hosting-config.json` → `"app_id": YOUR_ID`
   - `.env.local` → `VITE_VK_APP_ID=YOUR_ID` (опционально)

### Рекомендуемые настройки в админке

| Параметр | Значение |
|----------|----------|
| Ориентация | **Portrait** (книжная) |
| Платформы | iOS, Android, Web (MVK) |
| URL (если свой хост) | HTTPS `https://…/index.html` |
| Или | Хостинг VK (см. §3) |
| Возраст | 12+ / 16+ (cartoon violence) |
| Категория | Игры → экшен / аркада |

---

## 2. Локальная разработка

```bash
npm install
npm run dev
```

- Вне WebView VK Bridge работает в **mock** (localStorage, «реклама» = успех).
- Проверка в клиенте VK:
  1. `npm run build && npm run preview` (или tunnel)
  2. В админке укажи URL preview / [vk-tunnel](https://dev.vk.com/mini-apps/development/testing)
  3. Открой приложение из VK на телефоне

### Tunnel (опционально)

```bash
npx @vkontakte/vk-tunnel
```

Подставь выданный HTTPS URL в настройки приложения (dev endpoint).

---

## 3. Сборка и деплой на хостинг VK

```bash
npm install
npm run build          # → dist/
npm run deploy:vk      # vk-miniapps-deploy (нужен app_id + авторизация)
```

Или вручную:

```bash
npx @vkontakte/vk-miniapps-deploy
```

Конфиг: [`vk-hosting-config.json`](../vk-hosting-config.json)

- `static_path`: `dist`
- `endpoints.mobile|mvk|web`: `index.html`
- **`app_id`**: твой ID (не оставляй `0`)

При первом деплое откроется авторизация VK.

### Свой HTTPS-хост

1. `npm run build`
2. Залей содержимое `dist/` на HTTPS (GitHub Pages, Cloudflare Pages, Vercel, …)
3. В админке VK укажи URL `https://your-domain/index.html`
4. `base` в Vite уже `./` — относительные пути для assets.

---

## 4. Что уже в коде (VK Bridge)

| Возможность | Метод / файл |
|-------------|--------------|
| Init | `VKWebAppInit` → `src/vk/bridge.ts` |
| User name | `VKWebAppGetUserInfo` |
| Save / load | `VKWebAppStorageSet/Get` (+ localStorage fallback) |
| Rewarded ads | `VKWebAppShowNativeAds` (reward) |
| Share | `VKWebAppShare` / wall post |
| Safe area | `VKWebAppGetSafeAreaInsets` (применяется к CSS vars) |
| Portrait hint | `VKWebAppSetViewSettings` + meta orientation |
| Launch params | `vk_user_id`, `vk_app_id`, `vk_platform` в query |

Включи **рекламу** в кабинете приложения (монетизация), иначе rewarded может падать — код обработает ошибку.

---

## 5. Чеклист модерации

- [ ] Свой арт/название (не копия бренда Pickle Pete)
- [ ] Нет жестокого gore; cartoon-стиль
- [ ] Работает на mid Android + iOS WebView
- [ ] Portrait, без обязательного landscape
- [ ] Иконка 278×278 (или актуальный размер в админке) + splash
- [ ] Описание RU, скриншоты portrait
- [ ] Privacy / данные: только storage + user name (если запрашиваешь)
- [ ] Реклама не блокирует первый запуск навечно
- [ ] `VKWebAppInit` вызывается при старте
- [ ] HTTPS, без mixed content

---

## 6. Иконки и материалы

Положи в `public/`:

| Файл | Назначение |
|------|------------|
| `icon-278.png` | Иконка приложения (загрузить в админку) |
| `splash.png` | Splash (опционально) |
| `og-cover.png` | Обложка для каталога |

Генерация placeholder:

```bash
npm run icons:placeholder
```

(скрипт рисует простую иконку с луной/волком)

---

## 7. Аналитика (позже)

- События: `run_start`, `wave_clear`, `death`, `ad_reward`, `meta_buy`
- MyTracker / VK pixel — по [доке](https://docs.tracker.my.com/en/tracking/platforms/vk-mini-apps)

---

## 8. Быстрые команды

| Команда | Действие |
|---------|----------|
| `npm run dev` | Локальный dev-сервер |
| `npm run build` | Production `dist/` |
| `npm run preview` | Превью dist |
| `npm run deploy:vk` | Деплой на хостинг VK |
| `npm run typecheck` | TypeScript check |

---

*Связанный GDD: [PLAN.md](./PLAN.md)*
