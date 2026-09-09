from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from app.services.vector_service import search_codebase, check_semantic_cache, save_to_semantic_cache
from app.services.llm_service import answer_question
from app.limiter import limiter

router = APIRouter()

class ChatRequest(BaseModel):
    question: str

@router.post("/chat")
@limiter.limit("5/minute") # Prevent API abuse and protect LLM credits
def chat_with_codebase(request: Request, body: ChatRequest):
    try:
        # 0. SDE1+ Feature: Check Semantic Cache first
        cached_answer = check_semantic_cache(body.question)
        if cached_answer:
            return {
                "answer": cached_answer + "\n\n*(⚡ Served instantly from Semantic Cache to save costs)*",
                "sources": ["System Cache"]
            }

        # 1. Search the Vector Database for the top 5 most relevant code chunks
        relevant_chunks = search_codebase(body.question, n_results=5)
        
        # 2. Extract unique source files
        unique_sources = list(set([chunk["file_path"] for chunk in relevant_chunks]))
        
        # 3. Generate the factual answer using OpenRouter
        answer_markdown = answer_question(body.question, relevant_chunks)
        
        # 4. Save to Semantic Cache for future users
        save_to_semantic_cache(body.question, answer_markdown)
        
        return {
            "answer": answer_markdown,
            "sources": unique_sources
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
