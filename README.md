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
npm run build   # → dist/ для хостинга VK
npm run preview
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

## VK Mini Apps

Полный гайд: **[docs/VK_PUBLISH.md](./docs/VK_PUBLISH.md)**

```bash
# 1. App ID в vk-hosting-config.json
# 2. Иконки-заглушки
npm run icons:placeholder
# 3. Сборка + деплой на хостинг VK
npm run deploy:vk
# или tunnel для теста на телефоне
npm run tunnel
```

| | |
|--|--|
| Конфиг хостинга | `vk-hosting-config.json` |
| Bridge | `src/vk/bridge.ts` |
| Orientation | **portrait** |
| Env example | `.env.example` |

## Лицензия

Private — all rights reserved.
