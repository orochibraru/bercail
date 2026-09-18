# syntax=docker/dockerfile:1
FROM oven/bun:1 AS install

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Builder — glibc Bun image so the compiled binary is glibc-linked and runs on
# debian:slim below.
FROM oven/bun:1 AS builder

WORKDIR /app

COPY --from=install /app/node_modules node_modules
COPY . .

RUN bun --bun run build

# Runner — no Bun, no node_modules. @orochibraru/svelte-smol compiles the app
# (Bun runtime embedded) into the single self-contained /app/build/server binary.
FROM debian:bookworm-slim AS runner

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates gosu \
	&& rm -rf /var/lib/apt/lists/* \
	&& groupadd --system --gid 10001 app \
	&& useradd --system --create-home --uid 10001 --gid 10001 app

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder --chown=app:app /app/build /app/build
# Drizzle migrations, applied on boot.
COPY --from=builder --chown=app:app /app/drizzle /app/drizzle

COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /app/data && chown -R app:app /app/data

VOLUME /app/data

EXPOSE 3000/tcp

ENV HOST=0.0.0.0
ENV PORT=3000
ENV ORIGIN=http://localhost:3000

# uid/gid the server runs as; the entrypoint chowns /app/data to match.
ENV PUID=10001
ENV PGID=10001

HEALTHCHECK --interval=10s --timeout=10s --start-period=5s --retries=3 \
	CMD ["/app/build/healthcheck"]

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["/app/build/server"]
