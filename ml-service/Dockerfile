FROM python:3.11-slim
WORKDIR /app
# Install build tools for prophet/pystan
RUN apt-get update && apt-get install -y gcc g++ && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8001
CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8001"]
