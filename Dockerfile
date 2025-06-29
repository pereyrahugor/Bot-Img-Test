# Image size ~ 400MB
FROM node:slim AS builder


WORKDIR /app


RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin


COPY . .


COPY package*.json *-lock.yaml ./


RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ git ca-certificates \
    && update-ca-certificates \
    && pnpm install && pnpm run build \
    && apt-get remove -y python3 make g++ git \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*



FROM node:slim AS deploy


WORKDIR /app



# --- ENVIRONMENT VARIABLES ---
ARG ASSISTANT_ID=asst_AdoKqgHqMiqfXiVkOPtzvfrW
ARG OPENAI_API_KEY=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
ARG ID_GRUPO_RESUMEN=
ARG IMGUR_CLIENT_ID=dbe415c6bbb950d
ARG msjCierre=MsjCierre
ARG msjSeguimiento1=Seguimiento1
ARG msjSeguimiento2=Seguimiento2
ARG msjSeguimiento3=Seguimiento3
ARG timeOutCierre=7
ARG timeOutSeguimiento2=45
ARG timeOutSeguimiento3=120
ARG PORT=3000

ENV ASSISTANT_ID=${ASSISTANT_ID}
ENV OPENAI_API_KEY=${OPENAI_API_KEY}
ENV ID_GRUPO_RESUMEN=${ID_GRUPO_RESUMEN}
ENV IMGUR_CLIENT_ID=${IMGUR_CLIENT_ID}
ENV msjCierre=${msjCierre}
ENV msjSeguimiento1=${msjSeguimiento1}
ENV msjSeguimiento2=${msjSeguimiento2}
ENV msjSeguimiento3=${msjSeguimiento3}
ENV timeOutCierre=${timeOutCierre}
ENV timeOutSeguimiento2=${timeOutSeguimiento2}
ENV timeOutSeguimiento3=${timeOutSeguimiento3}
ENV PORT=${PORT}

EXPOSE $PORT

# Asegurar que la carpeta de credenciales exista
RUN mkdir -p /app/credentials


COPY --from=builder /app/assets ./assets
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/*.json /app/*-lock.yaml ./


RUN corepack enable && corepack prepare pnpm@latest --activate
ENV PNPM_HOME=/usr/local/bin
RUN mkdir /app/tmp
RUN npm cache clean --force && pnpm install --production --ignore-scripts \
    && rm -rf $PNPM_HOME/.npm $PNPM_HOME/.node-gyp

# Parchear la versión de Baileys automáticamente
RUN sed -i 's/version: \[[0-9, ]*\]/version: [2, 3000, 1023223821]/' node_modules/@builderbot/provider-baileys/dist/index.cjs

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs -m nodejs


CMD ["npm", "start"]