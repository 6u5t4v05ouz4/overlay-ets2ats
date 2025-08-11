### Stack técnica

#### Runtime e plataforma
- **Electron 31**: base do app desktop, janela sem moldura/overlay.
- **Node.js 18+**: runtime para o processo main e dependências nativas.

#### Dependências
- **`trucksim-telemetry` (0.21.0)**: coleta dados de ETS2/ATS. Requer plugin compatível (ex.: `scs-sdk-plugin`).
- **`dotenv` (16.6.1)**: carrega variáveis de ambiente de `.env`.

#### Voz/IA
- **OpenAI Whisper (`whisper-1`)**: endpoint REST `audio/transcriptions` para transcrever áudio PT-BR.
- **Google Gemini (`gemini-1.5-flash`)**: `generateContent` com `inline_data` (áudio em base64). Prompt direciona para tokens de comando.

#### UI
- HTML/CSS/JS puro (sem frameworks). `public/index.html` define a UI; `public/renderer.js` controla estado, captura áudio e integra IPC.

#### IPC e segurança
- `preload.js` expõe `overlayAPI` com `contextIsolation: true` e `nodeIntegration: false`.
- Handlers IPC no main: `overlay:transcribe`, `overlay:config:*`, `overlay:telemetry:*`.

#### Configuração
- `.env`: `OPENAI_API_KEY` e/ou `GOOGLE_API_KEY`.
- Persistência: `overlay-config.json` no `userData` do Electron com `{ apiKey, provider }`.

#### Scripts npm
- `dev` / `start`: inicia o Electron (`electron .`).

#### Build/Distribuição (sugerido)
- Não incluso. Para empacotar, sugere-se `electron-builder` ou `electron-forge` (adicionar no futuro).


