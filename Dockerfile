# Stage 1: Build the React frontend
FROM node:20-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Stage 2: Python backend + serve frontend static files
FROM python:3.11-slim

# System dependencies for pytesseract + pdf2image + PyMuPDF
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-ara \
    poppler-utils \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Copy built frontend so FastAPI can serve it
COPY --from=frontend-build /frontend/dist /frontend/dist

RUN mkdir -p /app/uploads /app/data

ENV DATABASE_URL=sqlite:////app/data/contracts.db
ENV UPLOAD_DIR=/app/uploads
ENV FRONTEND_DIST=/frontend/dist

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
