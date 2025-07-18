# syntax=docker/dockerfile:1

FROM bailo-base:latest AS base
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app
COPY package*.json ./
# Install all packages except dev
RUN --mount=type=cache,target=/cache/npm npm ci --omit=dev --cache=/cache/npm

EXPOSE 3000

FROM base AS dev

# Pickup dev packages too
RUN --mount=type=cache,target=/cache/npm npm ci --cache=/cache/npm

# Copy all source files in
COPY . .

RUN npm install sharp@0.33.5

CMD [ "npm", "run", "dev" ]

FROM dev AS build

RUN npm run build

FROM base AS prod
ENV PORT=3000

COPY --from=dev /app/next.config.mjs .
COPY --from=dev /app/package.json .

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

RUN chown node:node /app && chmod -R g=u /app

USER node

CMD ["node", "server.js"]
