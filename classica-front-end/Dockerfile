# Etapa 1: Build
FROM node:22-alpine AS build

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de dependências
COPY package.json package-lock.json ./

# Instala as dependências
RUN npm install

# Copia o restante do código-fonte
COPY . .

# Executa o build da aplicação (o Vite gera os arquivos na pasta 'dist')
RUN npm run build

# Etapa 2: Servidor Web
FROM nginx:alpine

# Copia os arquivos estáticos gerados na Etapa 1 para o diretório do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

#Copia a regra do proxy para o Nginx
COPY default.conf /etc/nginx/conf.d/default.conf

# Expõe a porta 80 para acesso externo
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]