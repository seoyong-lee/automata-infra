FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y --no-install-recommends ffmpeg python3 python3-venv fonts-clear-sans fonts-noto-cjk \
  && python3 -m venv /opt/yt-dlp \
  && /opt/yt-dlp/bin/pip install --no-cache-dir --upgrade pip \
  && /opt/yt-dlp/bin/pip install --no-cache-dir yt-dlp \
  && ln -s /opt/yt-dlp/bin/yt-dlp /usr/local/bin/yt-dlp \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm init -y && npm install @aws-sdk/client-s3

COPY services/composition/fargate-renderer ./services/composition/fargate-renderer

CMD ["node", "services/composition/fargate-renderer/index.mjs"]
