# Jarvis Desktop

Cliente nativo (Tauri v2 + React) do [JARVIS](https://github.com/maiconcongesco/jarvis)
para Windows. O c?rebro permanece na API da VM `jarvis-01`; este app s? conversa
com ela.

Spec: no reposit?rio `jarvis`,
`docs/superpowers/specs/2026-10-14-jarvis-desktop-design.md`.

## Fase atual (F7)

Updater assinado (minisign) + workflow de release por tag `v*`:

- Banner no app (`UpdateChecker`): checa ao abrir e a cada 6 h
- Endpoint: `?/releases/latest/download/latest.json`
- Roteiro manual: [`docs/F7-ROTEIRO-E2E.md`](docs/F7-ROTEIRO-E2E.md)

Fases anteriores na `main`: F3 casca ? F4 chat/cofre ? F5 voz/HUD ? F6 bandeja/atalho/sino.

## Releases

Tags `v0.1.0` / `v0.1.1` disparam `.github/workflows/release.yml` (Windows NSIS +
`latest.json` assinado). Segredos do Actions (n?o no Git):

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`

A chave p?blica est? em `src-tauri/tauri.conf.json` ? `plugins.updater.pubkey`.
Espelho da privada no OpenBao: `project-secrets/jarvis-desktop` (campos iguais) ?
a??o humana H29.

Instalador **sem** Authenticode na v1 (SmartScreen pode avisar). Atualiza??es
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
`sessionStorage` (s? sess?o). No app Tauri, o token vai ao Credential Manager.

## Requisitos

- Node ? 22.22 e npm ? 11.19
- Rust stable + Visual Studio Build Tools (workload C++) no Windows
- API do JARVIS alcan??vel (padr?o `http://192.168.20.210:8000`)
- Token `JARVIS_DESKTOP_TOKEN` (OpenBao ? Configura??es do app; nunca no Git)

## Origem

Fork **s? do front-end** do [OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
no commit fixado em `NOTICE`, sem hist?rico git. Licen?a Apache-2.0.

## Remote

https://github.com/maiconcongesco/jarvis-desktop ? worktrees e p?s-reboot:
`docs/F3-ENCAIXE-REMOTE.md`.
