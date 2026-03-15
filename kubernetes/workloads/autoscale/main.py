from fastapi import FastAPI
import hashlib

app = FastAPI()

# will perform repeated CPU work
# so increases CPU load
@app.get("/")
def cpu_load():
    for _ in range(100000):
        hashlib.sha256(b"hpa-test").hexdigest()
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "healthy"}
