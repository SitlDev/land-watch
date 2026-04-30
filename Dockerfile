# LandWatch Pro Unified Deployment
FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

# Copy package manifests first (for caching)
COPY package.json ./
COPY backend/package.json ./backend/

# Install root dependencies
RUN npm install

# Install backend dependencies (Playwright, Scrapers, etc.)
RUN cd backend && npm install

# Copy the entire project (respecting .dockerignore)
COPY . .

# Generate Prisma Client
RUN cd backend && npx prisma generate

# Expose the unified port
EXPOSE 3001

# Startup sequence: Deploy migrations, then start the server
CMD ["sh", "-c", "cd backend && npx prisma migrate deploy && cd .. && npm start"]
