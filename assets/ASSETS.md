# Art assets — Blood Moon Run

Cartoon 2D mobile style: thick outlines, cel shading, chroma-keyed from magenta.

| File | Role | Size |
|------|------|------|
| `sprites/player.png` | Hero (hybrid werewolf) | 128² |
| `sprites/player_beast.png` | Transformed form | 144² |
| `sprites/player_idle.png` | Idle frame | 128² |
| `sprites/player_walk1.png` | Walk A | 128² |
| `sprites/player_walk2.png` | Walk B | 128² |
| `sprites/player_attack.png` | Attack slash | 128² |
| `sprites/player_walk_sheet.png` | Walk strip (4×128) | 512×128 |
| `sprites/player_attack_sheet.png` | Attack strip (2×128) | 256×128 |
| `sprites/enemy_villager.png` | Wave enemy | 96² |
| `sprites/enemy_dog.png` | Fast enemy | 96² |
| `sprites/enemy_hunter.png` | Hunter | 112² |
| `sprites/enemy_silver.png` | Silver knight | 112² |
| `sprites/enemy_boss.png` | Wave 10 boss | 160² |
| `sprites/pickup_moon.png` | Soft currency drop | 48² |

### Animations (Phaser)
| Key | Sheet | FPS | Loop |
|-----|-------|-----|------|
| `player_idle` | walk sheet frame 0 | 1 | yes |
| `player_walk` | walk sheet 0–3 | 8 | yes |
| `player_attack` | attack sheet 0–1 | 10 | no |

Loaded in `BootScene` from `/assets/sprites/*`.
