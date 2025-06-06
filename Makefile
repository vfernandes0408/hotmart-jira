# Makefile para gerenciar a aplicação Jira Analytics

# Variáveis
APP_NAME = jira-analytics
DOCKER_COMPOSE = docker-compose
DOCKER = docker

# Cores para output
RED = \033[0;31m
GREEN = \033[0;32m
YELLOW = \033[1;33m
BLUE = \033[0;34m
NC = \033[0m # No Color

.PHONY: help build dev prod stop clean logs shell test

# Comando padrão
.DEFAULT_GOAL := help

## Exibe esta mensagem de ajuda
help:
	@echo "$(BLUE)Jira Analytics Dashboard - Comandos Docker$(NC)"
	@echo ""
	@echo "$(YELLOW)Comandos disponíveis:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## Constrói as imagens Docker
build:
	@echo "$(BLUE)Construindo imagens Docker...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache

## Inicia o ambiente de desenvolvimento
dev:
	@echo "$(GREEN)Iniciando ambiente de desenvolvimento...$(NC)"
	$(DOCKER_COMPOSE) up app-dev

## Inicia o ambiente de desenvolvimento em background
dev-d:
	@echo "$(GREEN)Iniciando ambiente de desenvolvimento em background...$(NC)"
	$(DOCKER_COMPOSE) up -d app-dev

## Inicia o ambiente de produção
prod:
	@echo "$(GREEN)Iniciando ambiente de produção...$(NC)"
	$(DOCKER_COMPOSE) up app-prod

## Inicia o ambiente de produção em background
prod-d:
	@echo "$(GREEN)Iniciando ambiente de produção em background...$(NC)"
	$(DOCKER_COMPOSE) up -d app-prod

## Para todos os containers
stop:
	@echo "$(YELLOW)Parando todos os containers...$(NC)"
	$(DOCKER_COMPOSE) down

## Para e remove containers, redes e volumes
clean:
	@echo "$(RED)Limpando containers, redes e volumes...$(NC)"
	$(DOCKER_COMPOSE) down -v --remove-orphans
	$(DOCKER) system prune -f

## Limpa tudo incluindo imagens
clean-all: clean
	@echo "$(RED)Removendo imagens Docker...$(NC)"
	$(DOCKER) rmi $$($(DOCKER) images -q --filter=reference="$(APP_NAME)*") 2>/dev/null || true

## Exibe logs dos containers
logs:
	@echo "$(BLUE)Exibindo logs...$(NC)"
	$(DOCKER_COMPOSE) logs -f

## Exibe logs do ambiente de desenvolvimento
logs-dev:
	@echo "$(BLUE)Exibindo logs do desenvolvimento...$(NC)"
	$(DOCKER_COMPOSE) logs -f app-dev

## Exibe logs do ambiente de produção
logs-prod:
	@echo "$(BLUE)Exibindo logs da produção...$(NC)"
	$(DOCKER_COMPOSE) logs -f app-prod

## Acessa o shell do container de desenvolvimento
shell-dev:
	@echo "$(BLUE)Acessando shell do container de desenvolvimento...$(NC)"
	$(DOCKER_COMPOSE) exec app-dev sh

## Acessa o shell do container de produção
shell-prod:
	@echo "$(BLUE)Acessando shell do container de produção...$(NC)"
	$(DOCKER_COMPOSE) exec app-prod sh

## Instala dependências no container de desenvolvimento
install:
	@echo "$(BLUE)Instalando dependências...$(NC)"
	$(DOCKER_COMPOSE) exec app-dev npm install

## Executa o linter
lint:
	@echo "$(BLUE)Executando linter...$(NC)"
	$(DOCKER_COMPOSE) exec app-dev npm run lint

## Faz o build da aplicação
build-app:
	@echo "$(BLUE)Fazendo build da aplicação...$(NC)"
	$(DOCKER_COMPOSE) exec app-dev npm run build

## Exibe o status dos containers
status:
	@echo "$(BLUE)Status dos containers:$(NC)"
	$(DOCKER_COMPOSE) ps

## Reinicia os containers
restart:
	@echo "$(YELLOW)Reiniciando containers...$(NC)"
	$(DOCKER_COMPOSE) restart

## Atualiza as imagens base
pull:
	@echo "$(BLUE)Atualizando imagens base...$(NC)"
	$(DOCKER_COMPOSE) pull

## Verifica a saúde dos containers
health:
	@echo "$(BLUE)Verificando saúde dos containers...$(NC)"
	$(DOCKER) ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 