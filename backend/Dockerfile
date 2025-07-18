# syntax=docker/dockerfile:1
FROM python:3.13.5-bookworm AS sphinx-docs

# Prevents Python from writing pyc files.
ENV PYTHONDONTWRITEBYTECODE=1
# Keeps Python from buffering stdout and stderr to avoid situations where the application crashes without emitting any logs due to buffering.
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y pandoc && rm -rf /var/lib/apt/lists/*

WORKDIR /app/docs

COPY docs .

RUN --mount=type=cache,target=/root/.cache/pip pip install bailo -r requirements.txt

RUN make dirhtml

FROM bailo-base:latest AS base

WORKDIR /app

COPY --from=sphinx-docs --chown=node:node /app/docs/python-docs python-docs
COPY package*.json ./
RUN --mount=type=cache,target=/cache/npm npm ci --omit=dev --cache=/cache/npm

EXPOSE 3001

FROM base AS dev

# Pickup dev packages too
RUN --mount=type=cache,target=/cache/npm npm ci --cache=/cache/npm

COPY . .

EXPOSE 9229

CMD [ "npm", "run", "dev" ]

FROM dev AS build

RUN npm run build

FROM base AS prod
ENV NODE_ENV=production

COPY --from=build --chown=node:node /app/config config
COPY --from=build --chown=node:node /app/dist .

RUN chown node:node /app && chmod -R g=u /app

USER node

CMD ["node", "src/index.js"]
