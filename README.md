# ETS2 Overlay - Versão de Auditoria

![Electron](https://img.shields.io/badge/Electron-31.x-47848F?logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES2022-F7DF1E?logo=javascript&logoColor=black)
![Windows](https://img.shields.io/badge/Windows-10%2B-0078D6?logo=windows&logoColor=white)
![ETS2/ATS](https://img.shields.io/badge/ETS2%2FATS-Telemetry-FFCC00)
![trucksim-telemetry](https://img.shields.io/npm/v/trucksim-telemetry?label=trucksim-telemetry)
![Licença](https://img.shields.io/badge/License-Audit%20Version-orange)

> **⚠️ VERSÃO DE AUDITORIA** - Esta é uma versão limpa para análise e auditoria de código.

Overlay em Electron sempre no topo (200x400) para Euro Truck Simulator 2 / American Truck Simulator, exibindo telemetria do jogo em tempo real.

## 🎯 Propósito desta Versão

Esta versão foi criada especificamente para:
- **Auditoria de código** e análise de segurança
- **Demonstração técnica** das funcionalidades de telemetria
- **Base para desenvolvimento** sem componentes comerciais
- **Estudo e aprendizado** da integração com jogos de simulação

## 🚀 Funcionalidades Principais

### 📊 Telemetria em Tempo Real
- **Velocidade, RPM e marcha** do veículo
- **Combustível e sistemas** do caminhão
- **Navegação e destino** da rota
- **Status da carga** transportada
- **Avisos do painel** e alertas
- **Danos do veículo** e componentes

### 🎮 Interface Interativa
- **Sempre no topo** e transparente
- **Arrastável** pela tela
- **Múltiplas visões** (padrão, caminhão, carga)
- **Atalhos de teclado** para navegação rápida
- **Modo foco** para interação

## 🛠️ Especificações Técnicas

### Plataforma e Sistema
- **SO**: Windows 10+ (recomendado)
- **Runtime**: Electron 31.x
- **Node.js**: 18+
- **Arquitetura**: x64

### Jogos Suportados
- Euro Truck Simulator 2 (ETS2)
- American Truck Simulator (ATS)

### Linguagem e Dependências
- **JavaScript ES2022**
- **trucksim-telemetry**: ^0.21.0
- **canvas-confetti**: ^1.9.3
- **dotenv**: ^16.6.1

## ⌨️ Atalhos de Teclado

| Atalho | Função |
|--------|--------|
| `Ctrl + Alt + 1` | Visão padrão (resumo geral) |
| `Ctrl + Alt + 2` | Visão do caminhão (detalhes técnicos) |
| `Ctrl + Alt + 3` | Visão da carga (informações de transporte) |
| `Ctrl + Alt + H` | Alternar modo foco/clique-através |

## 🎯 Configuração de Telemetria

### Requisitos do Jogo
1. **Plugin de telemetria** instalado (ex: scs-sdk-plugin)
2. **Jogo em execução** com perfil carregado
3. **Telemetria habilitada** nas configurações do jogo

### Configuração no Jogo
1. Abra ETS2/ATS
2. Carregue seu perfil
3. Verifique se a telemetria está ativa
4. Inicie uma viagem ou modo livre

### Configuração no Aplicativo
1. Execute o overlay
2. Aguarde a conexão automática
3. Verifique o status no rodapé da aplicação

### Verificação de Conexão
- **🟢 Conectado**: Dados sendo recebidos normalmente
- **🟡 Aguardando**: Tentando conectar com o jogo
- **🔴 Desconectado**: Sem comunicação com a telemetria

## 📱 Ícones e Indicadores

### Status da Telemetria
- 🟢 **Conectado** - Recebendo dados
- 🟡 **Aguardando** - Tentando conectar
- 🔴 **Erro** - Falha na conexão

### Veículo
- 🚗 **Velocidade** - Velocidade atual
- 🔄 **RPM** - Rotação do motor
- ⚙️ **Marcha** - Marcha engatada
- ⛽ **Combustível** - Nível do tanque
- 🚦 **Limite** - Velocidade máxima da via
- 🎚️ **Cruzeiro** - Controle de velocidade

### Navegação
- 🧭 **Distância** - Até o destino
- 📍 **Origem** - Cidade de partida
- 🎯 **Destino** - Cidade de chegada
- 🛣️ **Rota** - Informações da estrada

### Carga
- 📦 **Tipo** - Mercadoria transportada
- ⚖️ **Peso** - Massa da carga
- 🧰 **Dano** - Estado da mercadoria
- 💰 **Valor** - Informações comerciais

### Sistema
- 🔋 **Bateria** - Voltagem elétrica
- 🌡️ **Temperatura** - Motor e sistemas
- 🛢️ **Óleo** - Pressão e nível
- 💨 **Ar** - Sistema pneumático

### Alertas
- ⚠️ **Aviso** - Atenção necessária
- 🚨 **Crítico** - Ação imediata
- ℹ️ **Info** - Informação geral
- ✅ **OK** - Sistema normal

## 🚀 Execução

### Instalação
```bash
npm install
```

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

## 🔧 Solução de Problemas

### Telemetria não conecta
1. Verifique se o jogo está rodando
2. Confirme a instalação do plugin de telemetria
3. Carregue um perfil no jogo
4. Reinicie o overlay se necessário

### Overlay não aparece
1. Verifique se está sempre no topo
2. Tente mover com Alt+Tab
3. Reinicie a aplicação
4. Verifique as configurações de exibição

### Performance baixa
1. Feche aplicações desnecessárias
2. Verifique uso de CPU/RAM
3. Atualize drivers gráficos
4. Reduza configurações do jogo se necessário

## 📋 Funcionalidades Removidas

Esta versão de auditoria **não inclui**:
- ❌ Integração com APIs comerciais
- ❌ Sistemas de pagamento
- ❌ Funcionalidades de voz/IA
- ❌ Componentes proprietários
- ❌ Chaves de API hardcoded
- ❌ Dependências comerciais

## 📄 Licença

**Versão de Auditoria** - Disponibilizada para:
- ✅ Análise e auditoria de código
- ✅ Estudo e aprendizado
- ✅ Desenvolvimento não comercial
- ✅ Demonstração técnica

**Restrições**:
- ❌ Uso comercial sem autorização
- ❌ Revenda ou sublicenciamento
- ❌ Distribuição com fins lucrativos

---

**Desenvolvido para demonstração técnica e auditoria de código**

*Esta versão mantém apenas as funcionalidades essenciais de telemetria para análise e estudo.*


