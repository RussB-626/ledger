# Multi-stage build for Checkbook Register app
# Per CLAUDE.md: Compiles backend, builds Angular frontend, serves both from Express

FROM node:20-alpine as builder

WORKDIR /app

# Copy all source files
COPY . .

# Build backend
WORKDIR /app/backend
RUN npm install
RUN npm run build

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Final stage
FROM node:20-alpine

WORKDIR /app

# Copy backend dist (compiled TypeScript)
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/package*.json ./backend/

# Copy built Angular frontend
COPY --from=builder /app/frontend/dist ./frontend/dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the Express server
CMD ["node", "backend/dist/index.js"]
