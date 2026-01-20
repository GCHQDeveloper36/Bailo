# syntax=docker/dockerfile:1

ARG PYTHONPATH=/venv/lib/python3.12/site-packages

FROM python:3.12.12-slim-trixie AS build
ARG PYTHONPATH
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY requirements.txt /requirements.txt
RUN --mount=type=cache,target=/root/.cache/pip \
    python3 -m venv /venv && \
    /venv/bin/pip install --upgrade pip setuptools wheel && \
    /venv/bin/pip install -r /requirements.txt && \
    /venv/bin/pip uninstall -y pip setuptools wheel

FROM ubuntu:24.04 AS base
ARG PYTHONPATH
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=${PYTHONPATH}
# Cache packages with run cache, set up nonroot user
# Update system packages, install python3
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked --mount=type=cache,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache && \
    groupadd -g 65532 nonroot && \
    useradd nonroot -u 65532 -g 65532 -M && \
    apt-get update && \
    apt-get dist-upgrade -y && \
    apt-get install -y --no-install-recommends curl python3.12 && \
    update-alternatives --install /usr/local/bin/python3 python3 /usr/bin/python3.12 0

WORKDIR /app
CMD ["/venv/bin/python", "/venv/bin/fastapi", "run", "bailo_modelscan_api/main.py", "--port", "3311"]
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=5 CMD ["curl", "--noproxy='*'", "--fail", "http://localhost:3311/info"] || exit 1
EXPOSE 3311

FROM base AS dev

COPY --from=build /venv /venv
# Ensure app dir exists before mounting
RUN mkdir -p /app/bailo_modelscan_api
CMD ["/venv/bin/python", "/venv/bin/fastapi", "dev", "bailo_modelscan_api/main.py", "--host", "0.0.0.0", "--port", "3311"]

FROM base AS prod

COPY --from=build --chown=65532:65532 /venv /venv
# Copy application files
COPY --chown=65532:65532 ./bailo_modelscan_api /app/bailo_modelscan_api
# Run as non-root
USER 65532
