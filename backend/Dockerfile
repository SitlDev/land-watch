# Use the official Playwright image which includes all browser dependencies
# Updated: Rebuilding for fallback seed data support
FROM mcr.microsoft.com/playwright:v1.42.0-jammy

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy Prisma schema and generate client
COPY prisma ./prisma
RUN npx prisma generate

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 3001

# Run migrations on startup before app starts
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
