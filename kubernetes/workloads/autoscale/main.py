from fastapi import FastAPI

app = FastAPI()

# will perform repeated CPU work
# so increases CPU load
@app.get("/")
def cpu_load():
    import hashlib
    for _ in range(100000):
        hashlib.sha256(b"hpa-test").hexdigest()
    return {"status": "ok"}

# memory load
# allocates size_mb megabytes and holds it in a module-level variable
# so memory stays elevated across requests, triggering the HPA memory metric
_mem_hold = None

@app.get("/mem")
def mem_load(size_mb: int = 20):
    global _mem_hold
    _mem_hold = bytearray(size_mb * 1024 * 1024)
    return {"status": "ok", "allocated_mb": size_mb}


@app.get("/health")
def health():
    return {"status": "healthy"}
