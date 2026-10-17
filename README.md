# Jarvis Desktop

Cliente nativo (Tauri v2 + React) do [JARVIS](https://github.com/maiconcongesco/jarvis)
para Windows. O cérebro permanece na API da VM `jarvis-01`; este app só conversa
com ela.

Spec: no repositório `jarvis`,
`docs/superpowers/specs/2026-10-14-jarvis-desktop-design.md`.

## Fase atual (F3)

Casca com marca Jarvis, UI em pt-BR, configurações (URL da API), teste de
`/healthz`, CI de PR. Chat com streaming, cofre do token, voz, HUD, bandeja e
updater: F4–F7 (branches/PRs separados).

Toolchain front alinhado ao pin OpenJarvis: **Vite 8** + `@vitejs/plugin-react` 6
+ **vitest 5**.

## Bloqueio local (estação, 2026-10-17)

1. **Reiniciar o PC** — o Visual Studio Build Tools 2022 instalou e pediu reboot
   (`PendingFileRename` ativo; último boot ainda era 2026-10-15).
2. Depois do reboot, **um único** install na raiz deste repo (sem install paralelo):

```powershell
# se node_modules estiver quebrado (TAR_ENTRY_ERROR):
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
npm run typecheck
npm test
npm run build
```

3. Commitar o `package-lock.json` gerado e trocar o CI de `npm install` para
   `npm ci` se preferir.

Não rode `cargo`/`tauri` até o reboot concluir o MSVC.

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

App nativo (após reboot + MSVC ok):

```powershell
npm run tauri dev
```

## Origem

Fork **só do front-end** do [OpenJarvis](https://github.com/open-jarvis/OpenJarvis)
no commit fixado em `NOTICE`, sem histórico git. Licença Apache-2.0.
