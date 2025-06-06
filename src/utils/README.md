# Jira Links Utility

Este utilitário fornece funcionalidades para automaticamente transformar IDs de tickets do Jira em links clicáveis para a plataforma.

## Funcionalidades

### 1. `JiraLink` Component
Componente React que renderiza um ID de ticket como um link para o Jira.

```tsx
<JiraLink 
  ticketId="SCH-123"
  className="text-blue-600 hover:text-blue-800"
  showIcon={true}
/>
```

**Props:**
- `ticketId`: ID do ticket (ex: "SCH-123", "ABC-456")
- `className`: Classes CSS opcionais
- `showIcon`: Se deve mostrar o ícone de link externo (padrão: true)

### 2. `renderTextWithJiraLinks` Function
Função que automaticamente detecta e transforma IDs de tickets em texto para links clicáveis.

```tsx
const text = "Implementar funcionalidade relacionada ao SCH-123 e SCH-456";
return <div>{renderTextWithJiraLinks(text)}</div>;
```

**Padrão de detecção:**
- Detecta padrões como: `SCH-123`, `ABC-456`, `PROJECT-789`
- Regex: `/\b([A-Z]{2,10}-\d+)\b/g`
- Suporta prefixos de 2-10 letras maiúsculas seguido de hífen e números

### 3. `buildJiraTicketUrl` Function
Constrói URL completa para um ticket baseado na configuração salva.

```tsx
const url = buildJiraTicketUrl("SCH-123");
// Retorna: "https://yourcompany.atlassian.net/browse/SCH-123"
```

### 4. `getJiraBaseUrl` Function
Obtém a URL base do Jira do localStorage (configuração salva pelo usuário).

## Como funciona

1. **Configuração**: O usuário configura a URL do servidor Jira no `JiraConnector`
2. **Armazenamento**: As credenciais são salvas no `localStorage`
3. **Detecção**: Os utilitários detectam automaticamente IDs de tickets no formato padrão
4. **Transformação**: IDs são convertidos em links clicáveis que abrem o ticket no Jira

## Locais de uso

- **TicketList**: IDs dos tickets e nos títulos/summaries
- **CycleTimeScatterplot**: Tooltips dos gráficos
- **Qualquer texto**: Função `renderTextWithJiraLinks` pode ser usada em qualquer lugar

## Exemplo de uso completo

```tsx
import { JiraLink, renderTextWithJiraLinks } from '@/utils/jiraLinks';

// Link direto
<JiraLink ticketId="SCH-123" />

// Texto com links automáticos
const summary = "Fix bug relacionado ao SCH-123 e dependency do ABC-456";
<p>{renderTextWithJiraLinks(summary)}</p>
```

## Fallback

Se a URL do Jira não estiver configurada, os IDs são exibidos como texto simples sem links. 