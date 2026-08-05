# Публикация в VK Mini Apps / VK Games

**Основной способ деплоя: GitHub Pages.**  
VK открывает игру по HTTPS URL — отдельный `vk-miniapps-deploy` **не нужен**.

Официально: [dev.vk.com — Mini Apps](https://dev.vk.com/mini-apps/getting-started)

---

## Как это устроено

```
push в main
    → GitHub Actions собирает Vite (dist/)
    → GitHub Pages раздаёт HTTPS
    → В админке VK указываешь этот URL
    → Игроки открывают мини-приложение во WebView
```

Пример URL (после включения Pages):

```
https://puma04121990-blip.github.io/blood-moon-run/
```

(или с `index.html` в конце — как требует админка)

---

## 1. Один раз: включить GitHub Pages

1. Репозиторий → **Settings → Pages**
2. **Source:** GitHub Actions  
   (не «Deploy from a branch»)
3. Запушь в `main` или **Actions → Deploy to GitHub Pages → Run workflow**
4. Дождись зелёного workflow `.github/workflows/deploy-pages.yml`
5. URL появится в Settings → Pages

Workflow уже в репо: каждый push в `main` пересобирает и публикует игру.

---

## 2. Создать приложение VK

1. [vk.com/apps?act=manage](https://vk.com/apps?act=manage) / [dev.vk.com](https://dev.vk.com)
2. Создать **VK Mini Apps**
3. Название: `Ночь Оборотня` / `Blood Moon Run`
4. **URL приложения** = URL GitHub Pages (HTTPS)
5. Ориентация: **Portrait**
6. Иконка: `public/icon-278.png` (загрузить в админку)

| Параметр | Значение |
|----------|----------|
| URL | `https://<user>.github.io/blood-moon-run/` |
| Ориентация | Portrait |
| Платформы | iOS, Android, Web |
| Возраст | 12+ / 16+ (cartoon) |

Опционально: `.env.local` → `VITE_VK_APP_ID=…` (для логов/аналитики).

---

## 3. Локальная разработка

```bash
npm install
npm run dev
```

Вне WebView Bridge в mock (localStorage, «реклама» = ok).

Тест на телефоне до Pages: `npm run preview` + свой туннель, либо сразу Pages.

---

## 4. Что в коде (VK Bridge)

| | |
|--|--|
| Init, user, storage | `src/vk/bridge.ts` |
| Rewarded / interstitial ads | там же |
| Share, haptic, safe area | там же |
| `base: './'` в Vite | относительные пути → ок на Pages |

Рекламу всё равно нужно **включить в кабинете** VK, иначе rewarded может не показаться.

---

## 5. Чеклист модерации

- [ ] Pages отдаёт игру по HTTPS
- [ ] URL прописан в админке VK
- [ ] Portrait, свой арт/название
- [ ] Иконка + описание + скриншоты
- [ ] `VKWebAppInit` при старте
- [ ] Нет hard paywall / жестокого gore

---

## 6. Опционально: хостинг VK

Если **очень** захочется заливать на сервера VK (не GitHub):

```bash
# app_id в vk-hosting-config.json
npx @vkontakte/vk-miniapps-deploy
```

Это **не основной** путь. Для большинства случаев GitHub Pages проще и прозрачнее (история деплоев = коммиты).

---

## Команды

| | |
|--|--|
| `npm run dev` | Локально |
| `npm run build` | Сборка `dist/` |
| `git push origin main` | **Автодеплой на Pages** |
| `npm run icons:placeholder` | Иконки-заглушки |

*GDD: [PLAN.md](./PLAN.md)*
