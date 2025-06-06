# Multi-stage build para otimizar o tamanho da imagem final

# Stage 1: Build da aplicação
FROM node:18-alpine AS builder

# Instalar dependências do sistema se necessário
RUN apk add --no-cache git

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY yarn.lock* ./

# Instalar yarn globalmente e dependências
RUN npm install -g yarn && \
    if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    else npm ci; fi

# Copiar código fonte
COPY . .

# Build da aplicação para produção
RUN if [ -f yarn.lock ]; then yarn build; else npm run build; fi

# Stage 2: Servir com Nginx
FROM nginx:alpine AS production

# Copiar configuração customizada do Nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Copiar arquivos buildados do stage anterior
COPY --from=builder /app/dist /usr/share/nginx/html

# Expor porta 80
EXPOSE 80

# Comando para iniciar o Nginx
CMD ["nginx", "-g", "daemon off;"]

# Stage para desenvolvimento (opcional)
FROM node:18-alpine AS development

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY yarn.lock* ./

# Instalar todas as dependências (incluindo devDependencies)
RUN npm ci --silent

# Copiar código fonte
COPY . .

# Expor porta do dev server
EXPOSE 5173

# Comando para desenvolvimento
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"] 