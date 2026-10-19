FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production PORT=3000

# Primeiro só o package.json, para aproveitar o cache das camadas quando houver dependências.
COPY package.json ./
COPY src ./src

# Executa sem privilégios de root.
USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "src/server.js"]
