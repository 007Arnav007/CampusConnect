# Build context: repository root (needs topology/ and ml-service/models/)
FROM python:3.12-slim
WORKDIR /app/ml-service
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 curl && rm -rf /var/lib/apt/lists/*
COPY ml-service/requirements.txt .
RUN pip install -r requirements.txt
COPY ml-service/ ./
COPY topology/ /app/topology/
RUN useradd -m app && chown -R app /app
USER app
EXPOSE 5100
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "5100"]
