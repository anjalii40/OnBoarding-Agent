from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import shutil
from app.services.git_service import clone_and_filter_repo
from app.services.vector_service import process_and_store_repo, peek_database

router = APIRouter()

class IngestRequest(BaseModel):
    repo_url: str

@router.post("/ingest")
def ingest_repository(request: IngestRequest):
    if not request.repo_url.startswith("https://github.com/"):
        raise HTTPException(status_code=400, detail="Only public GitHub URLs are supported.")
    
    temp_dir = None
    try:
        temp_dir = clone_and_filter_repo(request.repo_url)
        total_chunks = process_and_store_repo(temp_dir)
        return {
            "message": "Repository successfully ingested into Vector DB.",
            "chunks_created": total_chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

@router.get("/debug/db")
def debug_database():
    """A temporary endpoint to let us 'see' inside the Vector Database!"""
    return peek_database()
