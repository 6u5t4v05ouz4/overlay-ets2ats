### ETS2 Overlay — Telemetria + Voz

![Electron](https://img.shields.io/badge/Electron-31.x-47848F?logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)
![Windows](https://img.shields.io/badge/Windows-10%2B-0078D6?logo=windows&logoColor=white)
![ETS2/ATS](https://img.shields.io/badge/ETS2%2FATS-Telemetry-FFCC00)
![trucksim-telemetry](https://img.shields.io/npm/v/trucksim-telemetry?label=trucksim-telemetry)
![dotenv](https://img.shields.io/badge/dotenv-16.x-000000)
![OpenAI Whisper](https://img.shields.io/badge/OpenAI-Whisper-412991?logo=openai&logoColor=white)
![Google Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?logo=google&logoColor=white)
![Licença](https://img.shields.io/badge/License-Nao%20autorizada%20para%20revenda-red)

> Não autorizado para revenda.

Pequeno overlay em Electron sempre no topo (200x400) para Euro Truck Simulator 2 / American Truck Simulator, exibindo telemetria do jogo e suportando comandos por voz (OpenAI Whisper ou Google Gemini) para alternar entre visões (padrão, caminhão, carga).

#### Recursos
- **Sempre no topo, transparente e arrastável**.
- **Telemetria em tempo real** via `trucksim-telemetry` (velocidade, RPM, marcha, combustível, limite/cruzeiro, avisos de painel, danos, carga, navegação etc.).
- **Comandos por voz** (PT-BR): "status do caminhão", "status da carga", "voltar".
- **Provedores de voz**: OpenAI Whisper (`whisper-1`) ou Google Gemini (`gemini-1.5-flash`).
- **Config persistente** (API Key e provedor) salva no diretório `userData` do Electron.

---

### Requisitos
- Windows 10+ (recomendado; projeto usa Electron 31).
- Node.js 18+ e npm.
- ETS2 ou ATS em execução, com plugin de telemetria compatível (ex.: `scs-sdk-plugin`).
- Microfone e acesso à internet para transcrição.

> Observação: o pacote `trucksim-telemetry` depende do plugin de telemetria do jogo. Verifique a instalação do plugin conforme a sua distribuição/versão do jogo.

---

### Instalação
1. Instale dependências:
   ```bash
   npm install
   ```
2. (Opcional) Crie um arquivo `.env` na raiz com sua chave, se preferir usar via ambiente:
   ```ini
   # Escolha um provedor e configure a chave correspondente
   OPENAI_API_KEY=coloque_sua_chave_aqui
   # ou
   GOOGLE_API_KEY=coloque_sua_chave_aqui
   ```
   Você também pode salvar a chave diretamente pela interface do overlay (campo "API Key" + botão "Salvar"). Isso persiste em `overlay-config.json` no `userData` do app.

---

### Execução
```bash
npm run dev
```
Ou:
```bash
npm start
```

### Icones 
�� Visão Padrão (Telemetria)
🚗 - "Velocidade atual do veículo"
�� - "Rotação por minuto do motor"
⚙️ - "Marcha atual engatada"
⛽ - "Nível de combustível restante"
🚦 - "Limite de velocidade da via"
🎚️ - "Velocidade do controle de cruzeiro"
�� Status do Truck
��️ - "Marca do caminhão"
�� - "Modelo do caminhão"
🧭 - "Quilometragem total percorrida"
�� - "Dano total acumulado no veículo"
🏠 - "Dano na cabine do caminhão"
🧱 - "Dano no chassi do veículo"
🛠️ - "Dano no motor do caminhão"
⚙️ - "Dano no sistema de transmissão"
🛞 - "Dano nos pneus do veículo"
⚠️ Avisos do Painel
�� - "Status da pressão do sistema de ar"
�� - "Status da pressão de ar de emergência"
⛽ - "Status do nível de combustível"
�� - "Status do nível de AdBlue"
🛢️ - "Status da pressão do óleo do motor"
🌡️ - "Status da temperatura da água"
🔋 - "Status da voltagem da bateria"
�� Status da Carga
📍 - "Cidade de origem da carga"
🎯 - "Cidade de destino da carga"
🧭 - "Distância restante até o destino"
⚖️ - "Peso total da carga transportada"
📦 - "Tipo de mercadoria transportada"
🧰 - "Dano acumulado na carga"

### Atalhos de Teclado
- Ctrl + Alt + 1: alterna para a visão padrão (resumo)
- Ctrl + Alt + 2: alterna para a visão de Truck (detalhes do caminhão)
- Ctrl + Alt + 3: alterna para a visão de Cargo (detalhes da carga)
- Ctrl + Alt + H: alterna o modo de foco/clique-através do overlay

Com o app aberto:
- Selecione o **provedor** (OpenAI ou Google) no seletor.
- Informe a **API Key** e clique em **Salvar** (ou use variáveis de ambiente conforme acima).
- Clique em **Iniciar** para começar a gravar áudio e habilitar comandos.
- Clique em **Parar** para encerrar a gravação.

Comandos de voz suportados (PT-BR):
- "central status do caminhão" → mostra a aba de Truck
- "central status da carga" → mostra a aba de Cargo
- "central voltar" → retorna à visão padrão (telemetria resumida)

---

### Telemetria do jogo
O app usa `trucksim-telemetry` e escuta atualizações periódicas (100 ms). Campos principais mapeados:
- Velocidade, RPM, marcha, combustível, limite de velocidade, cruzeiro
- Marca/modelo, hodômetro, danos (total e por subsistema)
- Origem/destino, distância restante, tipo/peso, dano da carga
- Avisos de painel (ar, óleo, água, bateria, etc.)

Se a telemetria não conectar:
- Verifique a instalação do `scs-sdk-plugin`/plugin equivalente.
- Abra o jogo e carregue o perfil antes de iniciar o overlay.
- Confira eventuais mensagens de erro no overlay (rodapé) ou no console do app.

---

### Segurança e armazenamento
- O arquivo de configuração persistente é salvo automaticamente em `userData/overlay-config.json` com o formato:
  ```json
  { "apiKey": "...", "provider": "openai|google" }
  ```
- Alternativamente, `OPENAI_API_KEY` e/ou `GOOGLE_API_KEY` podem ser lidos do `.env` (via `dotenv`).

---

### Scripts
- `npm run dev` / `npm start`: inicia o Electron.

---

### Troubleshooting rápido
- "Jogo desconectado" / sem dados: confirme o plugin de telemetria e que o jogo está em execução.
- "API Key ausente": salve a chave na UI ou configure `.env` e reinicie.
- Problemas de microfone: verifique permissões do Windows e que o dispositivo padrão está ativo.

---

### Licença
Este projeto é disponibilizado para uso pessoal e não comercial. É **estritamente proibido**:

- Revender, sublicenciar, alugar, ou monetizar direta ou indiretamente este software, seus binários ou derivados.
- Distribuir versões pagas ou que exijam qualquer forma de contraprestação financeira.

Você pode:

- Fazer fork e modificar para uso próprio (não comercial).
- Distribuir binários ou forks de forma gratuita, mantendo atribuição e link para este repositório.

Para parcerias ou uso comercial, entre em contato previamente para autorização por escrito.


