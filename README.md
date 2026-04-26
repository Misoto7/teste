# Misoto Generator v5.0

> Um construtor de link-tree totalmente client-side, sem dependências externas e com estética cyberpunk — projetado para personalização rápida e exportação em um clique para um arquivo HTML autossuficiente.

---

## Índice

- [Visão Geral](#visão-geral)
- [Funcionalidades](#funcionalidades)
- [Arquitetura](#arquitetura)
- [Tecnologias Utilizadas](#tecnologias-utilizadas)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Como Executar](#como-executar)
- [Build e Exportação](#build-e-exportação)
- [Boas Práticas Implementadas](#boas-práticas-implementadas)
- [Compatibilidade com Navegadores](#compatibilidade-com-navegadores)
- [Contribuindo](#contribuindo)

---

## Visão Geral

O **Misoto Generator** é um editor visual que permite criar uma página de link-tree personalizada diretamente no navegador, sem escrever uma linha de código. Cada alteração é refletida em tempo real no preview, e o resultado final pode ser exportado como um arquivo `.html` autocontido — fontes, imagens e toda a mídia embutida em Base64 — pronto para ser publicado em qualquer servidor de hospedagem estática.

A interface é dividida em dois painéis: uma barra lateral de configurações recolhível e um iframe de preview em tempo real. Uma camada de estado reativa sincroniza ambas as visões sem recarregamentos de página.

---

## Funcionalidades

### Personalização Visual
- Controle completo da paleta de cores (primária, secundária, fundo, card, texto)
- Seleção tipográfica entre 16 fontes display incluídas e upload de fonte customizada (TTF, OTF, WOFF, WOFF2)
- Fontes por elemento (nome de usuário, nome do link, descrição do link, cabeçalho do card, rodapé)
- Forma do avatar (círculo / quadrado / arredondado) com estilos de borda configuráveis e efeitos neon/brilho/pulso/anel
- Controles de largura, altura mínima, opacidade e desfoque do card

### Mídia
- Upload de imagem de perfil com suporte a GIF
- Upload de wallpaper do card com suporte a GIF — animações preservadas via estratégia de renderização com `<img>` para máxima compatibilidade
- Upload de wallpaper de fundo da página com suporte a GIF — fundos animados renderizados via elementos `<img>` com posição fixa para manter a taxa de quadros
- Filtros de cor no wallpaper (rotação de matiz, dessaturação, quente, frio, sobreposição personalizada)
- Upload de música de fundo com visualizador de forma de onda (barras, onda, pontos, círculos)

### Efeitos
- Sobreposição de scanlines, chuva matrix, sistema de partículas, rastros de cursor (neon, estrelas, chama, padrão)
- Animação de onda sônica ao clicar, efeitos de aura/anel/pulso/brilho no avatar
- Animação de glitch no wallpaper do card
- Camadas de imagens flutuantes (posicionamento por arrastar e soltar, opacidade/rotação/escala por imagem)

### Links
- Links ilimitados com ícone (classe Font Awesome ou URL de imagem personalizada), rótulo, descrição, cor e badge
- Três modos de layout: lista, grade
- Três estilos de link: padrão, pílula, contornado
- Efeitos de hover (deslizar / brilhar / escalar) e animações de entrada (deslizar à esquerda / aparecer / saltar / escalar)
- Links do Discord com cópia de username ao clicar
- Reordenação por arrastar e soltar com controles de mover para cima / mover para baixo

### Qualidade de Uso do Editor
- Desfazer / refazer com histórico de 50 etapas (gerenciado eficientemente com `Array.splice`)
- Atualizações ao vivo vs. confirmadas — eventos `input` do slider atualizam o preview instantaneamente; eventos `change` confirmam no histórico
- Temas predefinidos (Cyberpunk, Synthwave, Matrix, Minimal, Blood, etc.)
- Importação / exportação de configuração em JSON
- Salvamento automático no `localStorage` (chave `misoto_v5`)
- Nome do arquivo exportado derivado automaticamente do nome de exibição do perfil (ex.: nome `misoto` → `misoto-links.html`)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                         │
│  ┌──────────────┐          ┌───────────────────────┐   │
│  │  Barra de    │          │   Preview em Tempo     │   │
│  │  Config.     │          │   Real (iframe / div)  │   │
│  └──────┬───────┘          └──────────┬────────────┘   │
│         │ eventos DOM                  │ re-renderização │
│         ▼                              ▼                 │
│  ┌──────────────────────────────────────────────────┐   │
│  │                   State (state.js)               │   │
│  │  Fonte única de verdade · listeners · histórico  │   │
│  └──────────────────────────────────────────────────┘   │
│         │ notify(source)                                 │
│         ├──► app.js          (binding de UI / sync)     │
│         ├──► preview.js      (re-renderização do iframe)│
│         ├──► export.js       (geração do HTML final)    │
│         ├──► render-utils.js (construtores HTML compart.)│
│         ├──► links.js        (gerenciamento de links)   │
│         ├──► floating.js     (imagens flutuantes)       │
│         ├──► player.js       (música / forma de onda)   │
│         ├──► font-manager.js (carregamento de fontes)   │
│         └──► themes.js       (aplicação de temas)       │
└─────────────────────────────────────────────────────────┘
```

### Camada de Estado (`state.js`)

O store central é uma IIFE (função imediatamente invocada) que retorna uma API pública imutável. Todas as mutações passam por setters tipados:

| Método | Comportamento |
|---|---|
| `setConfig(key, value)` | Muta config + registra histórico + notifica |
| `setConfigLive(key, value)` | Muta config + notifica (sem entrada no histórico — usado durante arraste de slider) |
| `commitHistory()` | Escreve manualmente um snapshot no histórico (chamado no evento `change`) |
| `setConfigBatch(patch)` | Aplica múltiplas chaves de config atomicamente + uma entrada no histórico |
| `undo() / redo()` | Navega pelo histórico; máximo de 50 entradas |

Os snapshots de histórico contêm uma cópia rasa de `config` e cópias profundas de `links` e `floats`. Apenas dados serializáveis são armazenados — blobs de mídia não são incluídos no histórico.

### Pipeline de Renderização

O preview e a exportação final compartilham os mesmos construtores HTML em `render-utils.js`. Isso garante paridade visual entre o que o editor exibe e o que é exportado.

**Estratégia de renderização de GIF:** Quando uma fonte GIF é detectada (via `isGifSrc()`), as camadas de wallpaper e fundo trocam de um `<div>` com `background-image` para um elemento `<img>` com `object-fit:cover`. Isso impede que o WebKit congele os quadros do GIF e permite que o navegador acelere a animação por hardware independentemente do DOM ao redor.

### Exportação (`export.js`)

O exportador chama `_buildFinalHTML()` que:
1. Resolve todas as fontes em data URIs Base64 (via `FontManager.getExportFontConfig`)
2. Embutida toda a mídia (avatar, wallpaper, imagem de fundo, música) como dados Base64 inline
3. Injeta todo o CSS e gera os bundles de JS (forma de onda, digitação, matrix, partículas, rastros)
4. Define o nome do arquivo como `<nomeExibição>-links.html`, derivado de `State.getConfig().username`, em minúsculas e sem caracteres inválidos para URL

---

## Tecnologias Utilizadas

| Camada | Tecnologia |
|---|---|
| Execução | Vanilla JavaScript (ES2020, sem bundler, sem framework) |
| Estilização | Vanilla CSS com propriedades customizadas (CSS custom properties) |
| Ícones | Font Awesome 6.4 (CDN, embutido na exportação) |
| Fontes | 16 fontes display incluídas (TTF/OTF) + upload customizado |
| Persistência | `localStorage` (estado do editor) · Data URIs Base64 (mídia) |
| API de Áudio | Web Audio API (`AudioContext`, `AnalyserNode`) |
| Canvas | Canvas 2D API (forma de onda, matrix, partículas, rastros de cursor) |
| Exportação | `Blob` + `URL.createObjectURL` · HTML único e autocontido |

---

## Estrutura de Diretórios

```
origins/
├── index.html              # Shell da aplicação e UI de configurações
├── css/
│   ├── style.css           # Estilos da UI do editor
│   └── preview.css         # Sobrescritas específicas do preview
├── js/
│   ├── state.js            # Fonte única de verdade, desfazer/refazer
│   ├── app.js              # Binding de controles, uploads, sincronização
│   ├── preview.js          # Renderizador do preview em tempo real
│   ├── export.js           # Gerador do HTML final para exportação
│   ├── render-utils.js     # Construtores HTML/CSS compartilhados
│   ├── links.js            # Gerenciamento de links (adicionar/editar/remover/reordenar)
│   ├── floating.js         # Camada de imagens flutuantes arrastáveis
│   ├── player.js           # Player de música e visualizador de forma de onda
│   ├── font-manager.js     # Carregamento de fontes, preview e exportação Base64
│   ├── themes.js           # Definições e aplicação de temas predefinidos
│   └── ui.js               # Utilitários de UI (Notify, Loading, UploadZone, Tooltip)
└── assets/
    └── fonts/              # 16 fontes display incluídas (TTF/OTF)
```

---

## Como Executar

O Misoto Generator **não requer nenhuma etapa de build nem servidor** — funciona inteiramente no navegador.

```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/misoto-generator.git
cd misoto-generator

# Abrir diretamente no navegador
open origins/index.html
# ou servir localmente para melhor desempenho
npx serve origins
# ou
python3 -m http.server 8080 --directory origins
```

> **Observação:** Abrir o `index.html` via `file://` funciona para a maioria das funcionalidades. Um servidor HTTP local é recomendado ao testar uploads de fontes customizadas ou embeds de música, para evitar restrições de CORS em alguns ambientes.

---

## Build e Exportação

Não há etapa de compilação. O editor roda diretamente a partir do código-fonte.

**Para exportar uma página de link-tree finalizada:**

1. Personalize sua página no editor (barra lateral de configurações).
2. Clique no botão **Exportar** (canto superior direito do editor).
3. Um arquivo chamado `<seunome>-links.html` será baixado na sua máquina.
4. Faça o upload desse arquivo em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel, Cloudflare Pages, etc.).

O arquivo exportado é 100% autocontido — fontes embutidas em Base64, imagens como data URIs e todo o JS inline. Nenhuma dependência externa é necessária em tempo de execução, exceto o Font Awesome (carregado via CDN na exportação).

---

## Boas Práticas Implementadas

**Gerenciamento de estado**
- API pública imutável via padrão de módulo IIFE
- Separação entre atualizações ao vivo (`setConfigLive`) e confirmadas (`setConfig` / `commitHistory`) para evitar poluição do histórico durante entradas contínuas
- Corte eficiente do histórico usando `Array.splice` em vez de slice/cópia — evita criação de arrays temporários a cada interação

**Renderização**
- Preview e exportação compartilham os mesmos helpers de `render-utils.js`, garantindo paridade visual
- Detecção de GIF direciona imagens animadas para elementos `<img>` em vez de `background-image` CSS, preservando a animação e habilitando aceleração por hardware
- Filtros CSS com `transform:scale(1.08)` evitam que bordas desfocadas revelem a cor de fundo
- `isolation:isolate` no container do card cria um contexto de empilhamento que previne vazamentos de z-index das camadas internas

**Desempenho**
- `setConfigLive` não registra entradas no histórico durante o arraste do slider; o histórico é confirmado apenas no evento `change` (ao soltar o mouse)
- Efeitos baseados em Canvas (forma de onda, partículas, matrix) usam `requestAnimationFrame` exclusivamente — nunca `setInterval`
- `cancelAnimationFrame` é chamado quando o áudio pausa, para que o loop de desenho do canvas não rode em idle
- As fontes são carregadas uma vez e reutilizadas; a conversão para Base64 na exportação é lazy (apenas no momento da exportação)

**Acessibilidade e UX**
- Seções de painel recolhíveis com atributos `aria-expanded` e `aria-controls`
- Overlay de carregamento com spinner durante a exportação
- Sistema de notificações (sucesso / erro / aviso / info) com auto-fechamento e fechamento manual
- Modal de confirmação antes de ações destrutivas (remover imagem, resetar tudo)
- Sistema de tooltip para rótulos de controles

**Segurança**
- Todo conteúdo do usuário é passado por `escHtml()` antes de ser inserido no HTML exportado
- Links exportados usam `rel="noopener"` em âncoras com `target="_blank"`
- Dados de fontes e imagens externas embutidos como Base64 — sem chamadas externas em tempo de execução na página exportada (exceto Font Awesome via CDN)

---

## Compatibilidade com Navegadores

| Navegador | Versão | Observações |
|---|---|---|
| Chrome / Edge | 90+ | Suporte completo, incluindo todos os efeitos de canvas |
| Firefox | 88+ | Suporte completo |
| Safari | 14+ | Suporte completo; estratégia `<img>` para GIF garante animação no WebKit |
| Chrome Mobile (Android) | 90+ | Suporte completo |
| Safari Mobile (iOS) | 14+ | Web Audio API requer interação do usuário antes da reprodução (tratado pelo overlay de clique para entrar) |

> Recursos CSS utilizados: `backdrop-filter`, `CSS custom properties`, `isolation`, `mix-blend-mode`, `object-fit`, `roundRect` (Canvas 2D). Todos disponíveis no intervalo de navegadores-alvo acima.

---

## Contribuindo

1. Faça um fork do repositório.
2. Crie uma branch de feature: `git checkout -b feature/minha-feature`.
3. Faça suas alterações — nenhuma etapa de build é necessária.
4. Teste em pelo menos Chrome e Firefox.
5. Abra um pull request com uma descrição clara da mudança.

Mantenha cada módulo JS com responsabilidade única e evite introduzir dependências de frameworks — a abordagem sem dependências é intencional.

---

*Feito com ♥ pelo projeto Misoto.*
