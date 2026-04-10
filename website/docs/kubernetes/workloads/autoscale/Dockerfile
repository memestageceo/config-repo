FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

# --no-cache-dir -> image doesn't store package cache ->
# smaller image size...kaching!
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
