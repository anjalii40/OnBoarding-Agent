from fastapi import APIRouter, HTTPException
from app.services.vector_service import chroma_client
from app.services.llm_service import generate_overview

router = APIRouter()

@router.get("/overview")
def get_repository_overview():
    try:
        # 1. Connect to our Vector Database
        collection = chroma_client.get_collection("codebase")
        
        # 2. Extract metadata AND documents
        results = collection.get(include=["metadatas", "documents"])
        
        if not results or not results["metadatas"]:
            raise HTTPException(status_code=400, detail="Database is empty. Ingest a repository first.")
        
        unique_files = set()
        context_docs = []
        
        for i, meta in enumerate(results["metadatas"]):
            path = meta.get("file_path", "")
            unique_files.add(path)
            
            # If this chunk belongs to a dependency file or README, grab its actual code!
            if path.endswith("package.json") or path.endswith("requirements.txt") or path.endswith("README.md"):
                context_docs.append(f"--- {path} ---\n{results['documents'][i]}\n")
                
        # Combine the actual file contents into one string
        dependency_context = "\n".join(context_docs)
        
        # 4. Ask OpenAI to analyze the structure, providing the dependencies!
        overview_markdown = generate_overview(list(unique_files), dependency_context)
        
        return {"overview": overview_markdown}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
