# Jarvis Desktop

Cliente nativo (Tauri v2 + React) do [JARVIS](https://github.com/maiconcongesco/jarvis)
para Windows. O cérebro permanece na API da VM `jarvis-01`; este app só conversa
com ela.

Spec: no repositório `jarvis`,
`docs/superpowers/specs/2026-10-14-jarvis-desktop-design.md`.

## Fase atual (F4)

Cliente tipado (`src/lib/jarvis.ts`) para `/v1/chat/stream` (Bearer desktop),
cofre do token (keyring / sessão), chat com frases + cartões de ferramenta,
histórico local, rodapé (agente/modelo/latência/custo), painel de trace e
feedback 👍/👎. Voz, HUD, bandeja e updater: F5–F7.

Toolchain front alinhado ao pin OpenJarvis: **Vite 8** + `@vitejs/plugin-react` 6
+ **vitest 5**. Componentes herdados ainda não portados ficam em `src/_upstream/`.

## Bloqueio local (estação)

1. **Reiniciar o PC** se o Visual Studio Build Tools 2022 acabou de instalar
   (pede reboot para o MSVC).
2. Depois, um único `npm install` na raiz (evite installs paralelos — no path
   longo do GitHub o AV às vezes corrompe `node_modules` com `TAR_ENTRY_ERROR`).

```powershell
npm install
npm run typecheck
npm test
npm run build
```

Não rode `cargo`/`tauri` até o reboot concluir o MSVC.

## Requisitos

- Node ≥ 22.22 e npm ≥ 11.19
- Rust stable + Visual Studio Build Tools (workload C++) no Windows
- API do JARVIS alcançável (padrão `http://192.168.20.210:8000`)
- Token `JARVIS_DESKTOP_TOKEN` (OpenBao → Configurações do app; nunca no Git)

## Desenvolvimento

```powershell
npm install
npm run typecheck
npm test
npm run dev
```

App nativo (após reboot + MSVC ok):

```powershell
npm run tauri dev
```

No `npm run dev`, o Vite faz proxy de `/v1` e `/healthz`. O token fica em
`sessionStorage` (só sessão). No app Tauri, o token vai ao Credential Manager.

## Origem

Fork **só do front-end** do [OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
no commit fixado em `NOTICE`, sem histórico git. Licença Apache-2.0.

## Remote

https://github.com/maiconcongesco/jarvis-desktop � worktrees e pos-reboot: `docs/F3-ENCAIXE-REMOTE.md`.

