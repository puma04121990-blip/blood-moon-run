# Blood Moon Run / Ночь Оборотня

Werewolf survival for **VK Games** (HTML5 Mini App).  
Mobile-first, **portrait** orientation, virtual **joystick** + auto-attack.

> Основной план и ориентир проекта: **[docs/PLAN.md](./docs/PLAN.md)**

## Концепция

Ты — оборотень под кровавой луной. Двигайся джойстиком, когти бьют сами, используй **Вой**, копи **Луну** и срывайся в звериную форму. Переживи 10 волн охотников.

Аналог жанра top-down wave survival (как *Pickle Pete*), **своя IP и сеттинг**.

## Стек

| Слой | Технология |
|------|------------|
| Runtime | HTML5 (VK Mini Apps WebView) |
| Engine | Phaser 3 |
| Language | TypeScript |
| Build | Vite |
| Platform | `@vkontakte/vk-bridge` |

## Быстрый старт

```bash
npm install
npm run dev
```

Открой URL из терминала (лучше с телефона в той же сети или DevTools device mode, portrait).

```bash
npm run build    # → dist/
npm run preview
git push         # → GitHub Pages (автодеплой), URL в админку VK
```

## Управление

| Ввод | Действие |
|------|----------|
| Virtual joystick (низ) | Движение |
| Авто | Атака ближайшего |
| Кнопка **ВОЙ** / Space | AOE howl (заряды) |
| T или полная шкала Луны | Transform |
| Ⅱ | Пауза |

## Структура

```
docs/PLAN.md          ← план проекта (source of truth)
src/
  main.ts             ← Phaser bootstrap
  game/config.ts      ← баланс, волны, цвета
  scenes/             ← Boot, Menu, Game
  entities/           ← Player, Enemy
  ui/                 ← Joystick, HUD
  vk/bridge.ts        ← VK Bridge + local fallback
```

## Статус (Phase 1 vertical slice)

- [x] Portrait canvas + scale FIT  
- [x] Boot / auth splash / menu  
- [x] Joystick + WASD  
- [x] Auto-attack, howl skill, moon transform  
- [x] 10 waves + boss  
- [x] XP level-up (3 cards)  
- [x] Currency pickups, HUD  
- [x] Death + rewarded continue (mock вне VK)  
- [x] Victory + share hook  
- [x] Save shards (VK Storage / localStorage)  
- [x] Cartoon sprites (player, beast, 5 enemies, moon pickup)  
- [x] Meta upgrade tree (7 perks, shards, save)  
- [x] Player walk / attack animations (sprite sheets)  
- [x] VK Mini App config, deploy scripts, publish guide  
- [ ] Ads cabinet enable + IAP  
- [ ] Submit for moderation  

## Деплой: GitHub Pages → URL в VK

**Не нужен** `vk-miniapps-deploy`. VK только открывает HTTPS-страницу.

1. **Settings → Pages → Source: GitHub Actions**
2. `git push origin main` → workflow `deploy-pages.yml` собирает и публикует
3. URL вида `https://puma04121990-blip.github.io/blood-moon-run/` вписать в админку VK Mini App
4. Ориентация: **portrait**

Подробно: **[docs/VK_PUBLISH.md](./docs/VK_PUBLISH.md)** · Bridge: `src/vk/bridge.ts`

## Лицензия

Private — all rights reserved.
