# syntax=docker/dockerfile:1
FROM node:24.4.0-alpine AS node-base

RUN --mount=type=cache,target=/var/cache/apk \
    # Update repos
    apk update && \
    # Update packages
    apk upgrade && \
    # Add packages
    apk add libc6-compat ca-certificates && \
    # Remove SUID bit
    chmod ug-s /home/node && \
    mkdir /app && \
    chown node:node /app && \
    chmod 0755 /app
