FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --force

# Copy application files
COPY . .

# Expose ports (dashboard uses 1395 by default)
EXPOSE 1395

# Default command (can be overridden in docker-compose)
CMD ["node", "index.js"]

