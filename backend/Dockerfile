FROM node:22-bookworm-slim

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY src ./src
COPY scripts ./scripts

RUN mkdir -p uploads

ENV NODE_ENV=production
EXPOSE 3020

CMD ["node", "src/server.js"]
