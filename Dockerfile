# ---- Build the frontend ----
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Runtime: backend API + served frontend ----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
# Data lives on a mounted volume; honor DB_PATH so it lands there.
ENV DB_PATH=/data/squadly.db

COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY backend/src ./backend/src

# Copy the built frontend into the location the backend serves statically.
COPY --from=frontend-build /app/dist ./frontend/dist

EXPOSE 5000
VOLUME ["/data"]
CMD ["node", "backend/src/index.js"]
