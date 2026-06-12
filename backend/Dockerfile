FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    libpango-1.0-0 libpangoft2-1.0-0 libcairo2 libgdk-pixbuf-2.0-0 \
    libffi-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /data /app/storage/email_attachments /app/storage/company /app/storage/reports /app/storage/stoerungsanlagen

ENV DATABASE_URL=sqlite:////data/terminplanung.db
ENV STORAGE_ROOT=/app/storage

EXPOSE 8000

# For PostgreSQL: run Alembic migrations; for SQLite: app handles create_all + ALTER TABLE
CMD ["bash", "-c", "if [[ \"$DATABASE_URL\" == postgresql* ]]; then alembic upgrade head; fi && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
