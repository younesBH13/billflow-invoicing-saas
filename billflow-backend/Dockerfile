# FROM node:18-alpine

# Use Debian-based image for better compatibility with native builds (better-sqlite3)
FROM node:20

WORKDIR /app

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Install dependencies (including devDependencies for build scripts if needed)
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 3000

# Create data directory
RUN mkdir -p /app/data

# Environment variables (can be overridden by docker-compose)
ENV DB_FILE=/app/data/billflow.sqlite
ENV PORT=3000

CMD ["node", "dist/index.js"]