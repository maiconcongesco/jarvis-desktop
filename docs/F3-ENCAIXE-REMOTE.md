# Remote oficial (pós-F3)

Repo: https://github.com/maiconcongesco/jarvis-desktop  
`main` de referência: `d77efdf` (F3).

## Branches locais

| Branch | Uso |
|---|---|
| `main` | espelha `origin/main` |
| `feat/f4-cliente-api` | cliente API, cofre, chat stream (esta entrega) |
| `feat/f5-*` | voz + HUD (próxima) |

Worktree sugerida: `git worktree add ../jarvis-desktop-wt-f5 -b feat/f5-voz-hud origin/main`

## Pós-reboot (estação)

1. Visual Studio Build Tools (C++) ok → `npm install` na pasta do repo (evitar AV a corromper `node_modules` sob `GitHub\`; se TAR_ENTRY_ERROR, instalar em `%TEMP%` e junção).
2. `cargo update -p tauri-plugin-http` (ou acrescentar dep + `cargo check`), ligar o plugin em `lib.rs` + capability `http:default` (spec §4).
3. `npm test` / `cargo test` locais; Markdown GFM na bolha (portar `MessageBubble` de `_upstream`).
