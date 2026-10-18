# Jarvis Desktop

Cliente nativo (Tauri v2 + React) do [JARVIS](https://github.com/maiconcongesco/jarvis)
para Windows. O cérebro permanece na API da VM `jarvis-01`; este app só conversa
com ela.

Spec: no repositório `jarvis`,
`docs/superpowers/specs/2026-10-14-jarvis-desktop-design.md`.

## Fase atual (F7)

Updater assinado (minisign) + workflow de release por tag `v*`:

- Banner no app (`UpdateChecker`): checa ao abrir e a cada 6 h
- Endpoint: `…/releases/latest/download/latest.json`
- Roteiro manual: [`docs/F7-ROTEIRO-E2E.md`](docs/F7-ROTEIRO-E2E.md)

Fases anteriores na `main`: F3 casca · F4 chat/cofre · F5 voz/HUD · F6 bandeja/atalho/sino.

## Releases

Publicados (não draft):

- [v0.1.0](https://github.com/maiconcongesco/jarvis-desktop/releases/tag/v0.1.0) — baseline
- [v0.1.1](https://github.com/maiconcongesco/jarvis-desktop/releases/tag/v0.1.1) — updater (sem CORS: não fala com a API)
- [v0.1.2](https://github.com/maiconcongesco/jarvis-desktop/releases/tag/v0.1.2) — tauri-plugin-http (#12); o token não era salvo
- [v0.1.3](https://github.com/maiconcongesco/jarvis-desktop/releases/tag/v0.1.3) — Latest (cofre do token, #14)

Cada release traz NSIS + `.sig` + `latest.json`. Tags `v*` disparam
`.github/workflows/release.yml`. Segredos do Actions (não no Git):

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

A chave pública está em `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`.
Espelho da privada no OpenBao: `project-secrets/jarvis-desktop` (campos iguais) —
restante humano H29 (secrets Actions + publicar já feitos).

Instalador **sem** Authenticode na v1 (SmartScreen pode avisar). Atualizações
in-app verificam a assinatura minisign do Tauri.

## Desenvolvimento

```powershell
npm install
npm run typecheck
npm test
npm run build
npm run dev
```

App nativo (MSVC ok):

```powershell
npm run tauri dev
```

Desligar o poll do updater no dev: `$env:VITE_JARVIS_NO_UPDATER=1`.

No `npm run dev`, o Vite faz proxy de `/v1` e `/healthz`. O token fica em
`sessionStorage` (só sessão). No app Tauri, o token vai ao Credential Manager.

## Requisitos

- Node ≥ 22.22 e npm ≥ 11.19
- Rust stable + Visual Studio Build Tools (workload C++) no Windows
- API do JARVIS alcançável (padrão `http://192.168.20.210:8000`)
- Token `JARVIS_DESKTOP_TOKEN` (OpenBao → Configurações do app; nunca no Git)

## Origem

Fork **só do front-end** do [OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
no commit fixado em `NOTICE`, sem histórico git. Licença Apache-2.0.

## Remote

https://github.com/maiconcongesco/jarvis-desktop — worktrees e pós-reboot:
`docs/F3-ENCAIXE-REMOTE.md`.
