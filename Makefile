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
	@echo "$(BLUE)Hotmart Jira Analytics Dashboard - Comandos Docker$(NC)"
	@echo ""
	@echo "$(YELLOW)Comandos disponíveis:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

## Constrói as imagens Docker sem cache
build:
	@echo "$(BLUE)Construindo imagens Docker sem cache...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache --pull

## Constrói forçando rebuild completo
build-fresh:
	@echo "$(BLUE)Construindo com rebuild completo...$(NC)"
	$(DOCKER_COMPOSE) build --no-cache --pull --force-rm

## Inicia a aplicação
dev:
	@echo "$(GREEN)Iniciando aplicação...$(NC)"
	$(DOCKER_COMPOSE) up app

## Inicia a aplicação em background
dev-d:
	@echo "$(GREEN)Iniciando aplicação em background...$(NC)"
	$(DOCKER_COMPOSE) up -d app

## Alias para dev (compatibilidade)
start:
	@echo "$(GREEN)Iniciando aplicação...$(NC)"
	$(DOCKER_COMPOSE) up app

## Alias para dev-d (compatibilidade)
start-d:
	@echo "$(GREEN)Iniciando aplicação em background...$(NC)"
	$(DOCKER_COMPOSE) up -d app

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

## Limpa cache do Docker build
clean-cache:
	@echo "$(RED)Limpando cache do Docker build...$(NC)"
	$(DOCKER) builder prune -f

## Limpa tudo do Docker (CUIDADO!)
clean-docker:
	@echo "$(RED)Limpando tudo do Docker - containers, imagens, volumes, cache...$(NC)"
	@read -p "Tem certeza? Esta ação é irreversível [y/N]: " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		$(DOCKER) system prune -a -f --volumes; \
		$(DOCKER) builder prune -a -f; \
	else \
		echo "Operação cancelada."; \
	fi

## Exibe logs dos containers
logs:
	@echo "$(BLUE)Exibindo logs...$(NC)"
	$(DOCKER_COMPOSE) logs -f

## Exibe logs da aplicação
logs-app:
	@echo "$(BLUE)Exibindo logs da aplicação...$(NC)"
	$(DOCKER_COMPOSE) logs -f app

## Acessa o shell do container
shell:
	@echo "$(BLUE)Acessando shell do container...$(NC)"
	$(DOCKER_COMPOSE) exec app sh

## Instala dependências no container
install:
	@echo "$(BLUE)Instalando dependências...$(NC)"
	$(DOCKER_COMPOSE) exec app npm install

## Executa o linter
lint:
	@echo "$(BLUE)Executando linter...$(NC)"
	$(DOCKER_COMPOSE) exec app npm run lint

## Faz o build da aplicação
build-app:
	@echo "$(BLUE)Fazendo build da aplicação...$(NC)"
	$(DOCKER_COMPOSE) exec app npm run build

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
