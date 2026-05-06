FROM node:20-slim

# Install Chromium deps for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    libglib2.0-0 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 \
    libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 \
    libxtst6 ca-certificates fonts-liberation libnss3 lsb-release xdg-utils wget \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip its own Chromium download and use system one
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 5000
CMD ["node", "src/server.js"]
