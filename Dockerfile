# Stage 1: Build Vue Frontend
FROM node:20 AS builder
WORKDIR /app/dashboard-vue
COPY dashboard-vue/package*.json ./
RUN npm install
COPY dashboard-vue .
RUN npm run build

# Stage 2: Production Environment
FROM node:20-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy root package files and install production dependencies
COPY package*.json ./
RUN npm install --force --production

# Copy built frontend assets from builder stage
COPY --from=builder /app/dashboard-vue/dist ./dashboard-vue/dist

# Copy application files
COPY . .

# Ensure start script is executable
RUN chmod +x start.sh

# Expose ports (dashboard uses 3001/3002 by default)
EXPOSE 3001 3002

# Start both bot and dashboard
CMD ["./start.sh"]
