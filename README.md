# Jarvis Desktop

Cliente nativo (Tauri v2 + React) do [JARVIS](https://github.com/maiconcongesco/jarvis)
para Windows. O cérebro permanece na API da VM `jarvis-01`; este app só conversa
com ela.

Spec: no repositório `jarvis`,
`docs/superpowers/specs/2026-10-14-jarvis-desktop-design.md`.

## Fase atual (F3)

Casca com marca Jarvis, UI em pt-BR, configurações (URL da API), teste de
`/healthz`, CI de PR. Chat com streaming, cofre do token, voz, HUD, bandeja e
updater vêm nas fases F4–F7.

Componentes herdados do OpenJarvis (ainda não adaptados) ficam em
`src/_upstream/` e entram no typecheck só quando forem portados.

## Requisitos

- Node ≥ 22.22 e npm ≥ 11.19
- Rust stable + Visual Studio Build Tools (workload C++) no Windows
- API do JARVIS alcançável (padrão `http://192.168.20.210:8000`)

## Desenvolvimento

```powershell
npm install
npm run typecheck
npm test
npm run dev
```

App nativo (quando o toolchain Rust/MSVC estiver ok):

```powershell
npm run tauri dev
```

## Origem

Fork **só do front-end** do [OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
no commit fixado em `NOTICE`, sem histórico git (o upstream carrega binário
grande em `desktop/`). Licença Apache-2.0.
