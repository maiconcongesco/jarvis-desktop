# F7 — Roteiro fim a fim (Windows)

Checklist manual da spec §10. Cole a saída (ok/falha por item) no `PROGRESS.md` do
repositório `jarvis` quando concluir.

## Pré-requisitos

- [ ] Segredos do repo: `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  (já definidos no GitHub Actions; espelho no OpenBao `project-secrets/jarvis-desktop` —
  ver `HUMANO.md` H29).
- [ ] Releases **publicados** (não só draft): `v0.1.0` e depois `v0.1.1` com
  `latest.json` + artefatos NSIS + `.sig`.
- [ ] API `jarvis-01` alcançável; token no Credential Manager (Configurações).
- [ ] Caixa de entrada Telegram / painel para ver canal `desktop`.

## 1. Instalar `v0.1.0`

1. Baixar o `.exe` NSIS do release `v0.1.0`.
2. Instalar (SmartScreen pode avisar — Authenticode fora da v1).
3. Abrir pelo atalho do menu Iniciar / área de trabalho.

**Resultado:** ________________

## 2. Um turno por texto

1. Em Conversa, enviar uma mensagem curta (ex.: «oi»).
2. Confirmar resposta stream + rodapé/trace se aplicável.
3. No painel da API, conferir turno com canal `desktop`.

**Resultado:** ________________

## 3. Um turno por voz

1. Segurar para falar → soltar.
2. Confirmar transcrição + resposta; opcional «ler em voz alta».

**Resultado:** ________________

## 4. Aprovação notificada e negada

1. Disparar ação que peça aprovação (ou usar item pendente no sino).
2. Notificação / sino → **Negar**.
3. Confirmar status negado na API.

**Resultado:** ________________

## 5. Atualizar `v0.1.0` → `v0.1.1`

1. Publicar o release `v0.1.1` (tag após bump de versão na `main`).
2. Abrir o app em `0.1.0` (ou aguardar o poll de 6 h / reiniciar).
3. Banner «Atualização disponível: v0.1.1» → **Baixar** → **Reiniciar agora**.
4. Em Sobre / `app_version`, conferir `0.1.1`.

**Resultado:** ________________

## Publicar releases (agente / CI)

```powershell
# Após merge na main, com segredos de assinatura no repo:
git tag v0.1.0
git push origin v0.1.0
# Workflow `release` cria draft; dono publica no GitHub quando o build verde terminar.

# Depois do bump 0.1.0 → 0.1.1 na main:
git tag v0.1.1
git push origin v0.1.1
```

Dev local sem updater: `VITE_JARVIS_NO_UPDATER=1` antes de `npm run tauri dev`.
