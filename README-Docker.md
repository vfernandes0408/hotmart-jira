# 🐳 Docker Setup - Jira Analytics Dashboard

Este guia explica como usar Docker para executar a aplicação Jira Analytics Dashboard em ambientes de desenvolvimento e produção.

## 📋 Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) (versão 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (versão 2.0+)
- Make (opcional, para usar os comandos do Makefile)

## 🏗️ Estrutura dos Arquivos

```
├── Dockerfile           # Multi-stage build (development + production)
├── docker-compose.yml   # Orquestração dos containers
├── nginx.conf          # Configuração do Nginx para produção
├── .dockerignore       # Arquivos ignorados no build
├── Makefile            # Comandos utilitários
└── README-Docker.md    # Este arquivo
```

## 🚀 Início Rápido

### Usando Make (Recomendado)

```bash
# Ver todos os comandos disponíveis
make help

# Construir as imagens
make build

# Executar em desenvolvimento
make dev

# Executar em produção
make prod
```

### Usando Docker Compose Diretamente

```bash
# Desenvolvimento
docker-compose up app-dev

# Produção
docker-compose up app-prod
```

## 🛠️ Ambientes

### 🔧 Desenvolvimento

**Características:**
- Hot reload ativado
- Volume bind para código fonte
- Porta: `5173`
- Node.js com Vite dev server

**Comandos:**
```bash
# Iniciar em foreground
make dev
# ou
docker-compose up app-dev

# Iniciar em background
make dev-d
# ou
docker-compose up -d app-dev

# Ver logs
make logs-dev

# Acessar shell do container
make shell-dev
```

**Acesso:** http://localhost:5173

### 🚀 Produção

**Características:**
- Build otimizado
- Servido via Nginx
- Gzip compression
- Cache headers
- Health checks
- Porta: `80`

**Comandos:**
```bash
# Iniciar em foreground
make prod
# ou
docker-compose up app-prod

# Iniciar em background
make prod-d
# ou
docker-compose up -d app-prod

# Ver logs
make logs-prod

# Verificar saúde
curl http://localhost/health
```

**Acesso:** http://localhost

## 📊 Monitoramento

### Health Check

O container de produção inclui um health check automático:

```bash
# Via curl
curl http://localhost/health

# Via Docker
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Via Make
make health
```

### Logs

```bash
# Todos os logs
make logs

# Logs específicos
make logs-dev   # Desenvolvimento
make logs-prod  # Produção

# Logs em tempo real
docker-compose logs -f app-dev
```

## 🛠️ Comandos Úteis

### Gerenciamento de Containers

```bash
# Status dos containers
make status
docker-compose ps

# Parar containers
make stop
docker-compose down

# Reiniciar
make restart
docker-compose restart

# Limpar (containers + volumes)
make clean

# Limpar tudo (incluindo imagens)
make clean-all
```

### Desenvolvimento

```bash
# Instalar dependências
make install
docker-compose exec app-dev npm install

# Executar linter
make lint
docker-compose exec app-dev npm run lint

# Build da aplicação
make build-app
docker-compose exec app-dev npm run build

# Acessar shell
make shell-dev
docker-compose exec app-dev sh
```

### Build e Deploy

```bash
# Rebuild das imagens
make build
docker-compose build --no-cache

# Atualizar imagens base
make pull
docker-compose pull
```

## 🔧 Configuração Avançada

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Configurações da aplicação
NODE_ENV=development
VITE_API_URL=http://localhost:5173

# Configurações do Docker
COMPOSE_PROJECT_NAME=jira-analytics
DOCKER_BUILDKIT=1
```

### Customização do Nginx

Edite o arquivo `nginx.conf` para personalizar:
- Cache policies
- Security headers
- Gzip compression
- SSL/TLS (se necessário)

### Multi-stage Build

O Dockerfile usa multi-stage build:

```dockerfile
# Stage 1: Builder (Node.js)
FROM node:18-alpine AS builder
# ... build da aplicação

# Stage 2: Production (Nginx)
FROM nginx:alpine AS production
# ... servir arquivos estáticos

# Stage 3: Development (Node.js com hot reload)
FROM node:18-alpine AS development
# ... desenvolvimento com hot reload
```

## 🔒 Segurança

### Headers de Segurança

O Nginx está configurado com headers de segurança:
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Content-Security-Policy
- Referrer-Policy

### Volumes

Em desenvolvimento, apenas o código fonte é montado como volume.
Node_modules fica no container para melhor performance.

## 📈 Performance

### Otimizações Implementadas

1. **Multi-stage build** para imagens menores
2. **Gzip compression** no Nginx
3. **Cache headers** para assets estáticos
4. **Health checks** para monitoramento
5. **.dockerignore** para contexto de build otimizado

### Metrics

```bash
# Tamanho das imagens
docker images | grep jira-analytics

# Uso de recursos
docker stats

# Logs de performance
make logs-prod | grep -E "(GET|POST|PUT|DELETE)"
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Porta já em uso:**
   ```bash
   # Verificar processos na porta
   lsof -i :5173  # desenvolvimento
   lsof -i :80    # produção
   
   # Parar containers
   make stop
   ```

2. **Build falha:**
   ```bash
   # Limpar cache
   make clean-all
   make build
   ```

3. **Hot reload não funciona:**
   ```bash
   # Verificar se o volume está montado
   docker-compose exec app-dev ls -la /app
   
   # Reiniciar container de dev
   docker-compose restart app-dev
   ```

4. **Problemas de permissão:**
   ```bash
   # No Linux, ajustar ownership
   sudo chown -R $USER:$USER node_modules
   ```

### Debug

```bash
# Entrar no container
make shell-dev

# Verificar logs detalhados
docker-compose logs --details app-dev

# Inspecionar container
docker inspect jira-analytics-dev
```

## 📚 Referências

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Vite Documentation](https://vitejs.dev/)

---

## 🤝 Contribuindo

Para contribuir com melhorias na configuração Docker:

1. Teste suas mudanças em ambos os ambientes (dev/prod)
2. Atualize este README se necessário
3. Verifique se os comandos do Makefile funcionam
4. Teste o build e deploy completo

---

*Para questões específicas sobre Docker, consulte a [documentação oficial](https://docs.docker.com/) ou abra uma issue.* 