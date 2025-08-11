### Arquitetura

Este projeto é um aplicativo Electron de janela única, sem moldura e transparente, que funciona como um overlay (sempre no topo) para ETS2/ATS. Ele coleta telemetria do jogo via módulo nativo `trucksim-telemetry` e, opcionalmente, processa comandos de voz usando OpenAI Whisper ou Google Gemini.

#### Camadas e responsabilidades
- **Main Process (`main.js`)**
  - Cria a `BrowserWindow` com tamanho 400x400, transparente, `alwaysOnTop` e `contextIsolation` habilitado.
  - Inicializa a telemetria (`trucksim-telemetry`), mantém o último snapshot em memória e emite eventos para a janela via IPC (`overlay:telemetry:update` e `overlay:telemetry:error`).
  - Expõe handlers IPC para:
    - Transcrição de áudio (`overlay:transcribe`), roteando para OpenAI Whisper ou Google Gemini a partir do provedor selecionado.
    - Persistência de configuração (`overlay:config:*`) — salva/recupera API Key e provedor em `userData/overlay-config.json`.
  - Gerencia permissões de mídia (microfone) permitindo sem prompt dentro do overlay.

- **Preload (`preload.js`)**
  - Usa `contextBridge` para expor API segura ao renderer: `transcribe`, `setApiKey`, `hasSavedApiKey`, `setProvider`, `getProvider`, listeners para `onTelemetryUpdate` e `onTelemetryError`, além de `getLatestTelemetry`.
  - Mantém o isolamento de contexto sem habilitar `nodeIntegration` no renderer.

- **Renderer (`public/index.html` + `public/renderer.js`)**
  - UI mínima com três visões: `default` (resumo), `truck` (detalhes do caminhão) e `cargo` (detalhes da carga).
  - Captura áudio do microfone via WebAudio, converte para WAV PCM 16-bit mono e envia buffers periodicamente para transcrição via IPC.
  - Recebe e normaliza snapshots da telemetria, atualizando os elementos de UI e aplicando badges de estado.
  - Permite seleção de provedor (OpenAI/Google) e salvamento de API Key sem reinício.

#### Fluxos principais
1. Início do app:
   - `main.js` cria a janela e tenta iniciar a telemetria. Em caso de sucesso, começa a emitir atualizações (`watch` a cada 100 ms).
   - Ao carregar a UI, o renderer requisita o snapshot inicial e assina os eventos de telemetria.

2. Transcrição de voz:
   - Renderer captura áudio (mono, 16 kHz preferencial) → gera WAV → envia via `overlayAPI.transcribe`.
   - Main chama Whisper (OpenAI) ou Gemini (Google). Gemini já retorna um token de comando, Whisper retorna texto; o renderer mapeia para comandos.

3. Persistência de configuração:
   - Chaves e provedor são salvos em `overlay-config.json` no diretório `userData` do Electron. `.env` também pode ser usado (via `dotenv`).

#### Decisões de design
- Janela com `contextIsolation: true` e APIs expostas via `preload.js` para reduzir a superfície de ataque.
- Renderização sem frameworks para minimizar dependências e footprint.
- Telemetria normalizada no renderer para desacoplar a UI do formato bruto do módulo.
- Suporte a dois provedores de voz com fallback para variáveis de ambiente.

#### Pontos de atenção
- `trucksim-telemetry` requer plugin (ex.: `scs-sdk-plugin`) instalado no jogo e, em alguns casos, rebuild nativo compatível com a versão do Node/Electron.
- Permissões de microfone no Windows podem impedir a captura; o app solicita via `getUserMedia`.
- Armazenamento de chave de API no `userData`: considere criptografar/obfuscar caso distribua builds para terceiros.

#### Próximos passos (sugestões)
- Suporte a hotkeys globais para trocar de visão sem voz.
- Opção para clique-através (já suportado via `setIgnoreMouseEvents(true)` se desejado) com alternância por atalho.


