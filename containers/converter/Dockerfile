FROM node:24-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates ffmpeg imagemagick pandoc \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY 2020_profile.icc /app/2020_profile.icc
COPY server.mjs /app/server.mjs

USER node
EXPOSE 8080

CMD ["node", "/app/server.mjs"]
