FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip fonts-clear-sans fonts-noto-cjk \
  && pip3 install --no-cache-dir yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm init -y && npm install @aws-sdk/client-s3

COPY services/composition/fargate-renderer ./services/composition/fargate-renderer

CMD ["node", "services/composition/fargate-renderer/index.mjs"]
