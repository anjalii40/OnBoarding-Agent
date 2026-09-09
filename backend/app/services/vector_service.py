import os
import ast
import chromadb

# Initialize Persistent ChromaDB client so data survives server restarts in production
chroma_client = chromadb.PersistentClient(path="./chroma_data")

def chunk_overlap(text: str, max_chars: int = 1500, overlap: int = 200) -> list[str]:
    """
    Fallback chunker with a sliding window (overlap) for non-Python files.
    """
    chunks = []
    # Step forward by (max_chars - overlap) to create the sliding window effect
    for i in range(0, len(text), max_chars - overlap):
        chunks.append(text[i:i + max_chars])
        # If we've reached the end of the text, stop so we don't create tiny duplicate chunks
        if i + max_chars >= len(text):
            break
    return chunks

def chunk_python_ast(source_code: str) -> list[str]:
    """
    Uses Python's Abstract Syntax Tree to chunk code intelligently.
    Extracts Classes and Functions as perfectly intact chunks.
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        # If the file has a syntax error, the AST parser will fail. 
        # We gracefully fallback to our overlap chunker.
        return chunk_overlap(source_code)

    chunks = []
    current_global_chunk = []
    
    for node in tree.body:
        # Get the exact string of code for this specific node
        segment = ast.get_source_segment(source_code, node)
        if not segment:
            continue
            
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
            # 1. Flush any accumulated global variables or imports into their own chunk
            if current_global_chunk:
                chunks.append("\n".join(current_global_chunk))
                current_global_chunk = []
            
            # 2. Add the complete Class or Function as its own perfect chunk
            chunks.append(segment)
        else:
            # Accumulate top-level code (like imports: 'import os')
            current_global_chunk.append(segment)
            
    # Flush any remaining global code at the bottom of the file
    if current_global_chunk:
        chunks.append("\n".join(current_global_chunk))
        
    return chunks if chunks else chunk_overlap(source_code)

def process_and_store_repo(temp_dir: str) -> int:
    """Reads all files, intelligently chunks them, and stores in ChromaDB."""
    try:
        chroma_client.delete_collection("codebase")
    except Exception:
        pass 
    
    collection = chroma_client.create_collection(name="codebase")

    documents = []
    metadatas = []
    ids = []
    chunk_id_counter = 0
    
    for root, _, files in os.walk(temp_dir):
        for file in files:
            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, temp_dir)
            
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
            except UnicodeDecodeError:
                continue 
            
            # --- INTELLIGENT CHUNKING ROUTING ---
            if file.endswith(".py"):
                chunks = chunk_python_ast(content)
            else:
                chunks = chunk_overlap(content)
            
            for i, chunk in enumerate(chunks):
                documents.append(chunk)
                metadatas.append({"file_path": rel_path, "chunk_index": i})
                ids.append(f"{rel_path}_chunk_{i}")
                chunk_id_counter += 1

    if documents:
        collection.add(
            documents=documents,
            metadatas=metadatas,
            ids=ids
        )
        
    return chunk_id_counter

def peek_database():
    """Returns a sample of the database contents to prove it works."""
    try:
        collection = chroma_client.get_collection("codebase")
        # Get 1 sample chunk with its embeddings
        results = collection.get(limit=1, include=["documents", "metadatas", "embeddings"])
        
        if not results or not results["ids"]:
            return {"status": "Database is empty!"}
        
        # The embedding is a huge list of floats, let's just show the first 5 dimensions
        sample_embedding = results["embeddings"][0][:5]
        
        return {
            "total_chunks_in_db": collection.count(),
            "sample_metadata": results["metadatas"][0],
            "sample_document_snippet": results["documents"][0][:200] + " ... (truncated)",
            "sample_vector_dimensions": len(results["embeddings"][0]),
            "sample_vector_preview": f"{sample_embedding} ... (truncated)"
        }
    except Exception as e:
        return {"error": str(e)}

def search_codebase(query: str, n_results: int = 5) -> list[dict]:
    """Searches the vector database for code chunks matching the query."""
    try:
        collection = chroma_client.get_collection("codebase")
    except Exception:
        return [] # DB not initialized

    # Chroma automatically embeds the query string and performs the mathematical vector search!
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        include=["documents", "metadatas"]
    )
    
    if not results or not results["documents"] or not results["documents"][0]:
        return []
        
    formatted_results = []
    # results["documents"] is a list of lists (one list per query). We only have 1 query.
    for i in range(len(results["documents"][0])):
        formatted_results.append({
            "content": results["documents"][0][i],
            "file_path": results["metadatas"][0][i].get("file_path", "Unknown File")
        })
        
    return formatted_results

# --- SDE1+ FEATURE: SEMANTIC CACHING ---
import uuid

def get_or_create_cache_collection():
    try:
        return chroma_client.get_collection("semantic_cache")
    except Exception:
        return chroma_client.create_collection("semantic_cache")

def check_semantic_cache(question: str) -> str | None:
    """Checks if a highly similar question was recently asked to save LLM costs."""
    try:
        collection = get_or_create_cache_collection()
        results = collection.query(
            query_texts=[question],
            n_results=1,
            include=["documents", "distances"]
        )
        if not results or not results["documents"] or not results["documents"][0]:
            return None
            
        # ChromaDB L2 distance: Lower means more similar.
        # Distance < 0.4 means it is practically the exact same semantic question.
        distance = results["distances"][0][0]
        if distance < 0.4:
            return results["documents"][0][0] # Return the cached LLM answer
    except Exception as e:
        print(f"Cache lookup failed: {e}")
    return None

def save_to_semantic_cache(question: str, answer: str):
    """Saves the generated answer to the vector database for future caching."""
    try:
        collection = get_or_create_cache_collection()
        # We embed the QUESTION, but store the ANSWER as the returned document
        collection.add(
            documents=[answer],
            metadatas=[{"original_question": question}],
            ids=[str(uuid.uuid4())]
        )
    except Exception as e:
        print(f"Cache save failed: {e}")
