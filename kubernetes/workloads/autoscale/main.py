from fastapi import FastAPI, HTTPException
import os

app = FastAPI()

# Maximum megabytes that can be allocated via /mem.
# Can be overridden with the MEM_LOAD_MAX_MB environment variable.
try:
    _MAX_MEM_MB = int(os.environ.get("MEM_LOAD_MAX_MB", "256"))
    if _MAX_MEM_MB < 0:
        _MAX_MEM_MB = 256
except ValueError:
    _MAX_MEM_MB = 256

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
    if size_mb < 0:
        raise HTTPException(
            status_code=400,
            detail="size_mb must be non-negative",
        )
    if size_mb > _MAX_MEM_MB:
        raise HTTPException(
            status_code=400,
            detail=f"size_mb must not exceed {_MAX_MEM_MB} MB",
        )
    _mem_hold = bytearray(size_mb * 1024 * 1024)
    return {"status": "ok", "allocated_mb": size_mb}


@app.get("/health")
def health():
    return {"status": "healthy"}
