FROM node:24-alpine

WORKDIR /app

# Install Prisma CLI globally (optional, but helpful)
RUN npm install -g prisma

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start"]

