FROM oven/bun:1.1 as base
WORKDIR /usr/src/app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

EXPOSE 3000

ENTRYPOINT ["bun", "run", "src/common/run-with-env.ts", "config/local.json", "src/index.ts"]
