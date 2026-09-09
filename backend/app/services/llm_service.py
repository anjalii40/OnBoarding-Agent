import os
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# We use the standard OpenAI client, but point it to OpenRouter!
client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.environ.get("OPENROUTER_API_KEY"),
)

# Pull the model from the .env file, or default to Llama 3.1 if not found
MODEL_NAME = os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.1-8b-instruct:free")

def generate_overview(file_paths: list[str], dependency_context: str = "") -> str:
    """
    Sends the file structure and key dependencies to OpenRouter to generate an onboarding guide.
    """
    file_tree = "\n".join([f"- {path}" for path in file_paths])
    
    prompt = f"""
    You are a Senior Software Engineer helping a junior developer onboard onto a new project.
    Here is the complete file structure of the repository:
    
    {file_tree}
    
    Here is the exact content of the project's dependency files and README (if any) to tell you EXACTLY what tech stack is used:
    {dependency_context}
    
    Based ONLY on these files, please provide:
    1. A strictly factual summary of what this project does and its verified tech stack.
    2. A 'Where to Start' guide recommending which 3 files the developer should read first.
    
    Format your response in clean Markdown.
    """
    
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You are a helpful expert coding assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7
    )
    
    return response.choices[0].message.content

def answer_question(question: str, context_chunks: list[dict]) -> str:
    """
    Answers a user's question using ONLY the provided code chunks.
    """
    if not context_chunks:
        return "I couldn't find any relevant code in the repository to answer that."
        
    context_string = ""
    for i, chunk in enumerate(context_chunks):
        context_string += f"\n--- File: {chunk['file_path']} (Search Rank: {i+1}) ---\n"
        context_string += f"{chunk['content']}\n"
        
    prompt = f"""
    You are a Senior Software Engineer answering a technical question about a codebase.
    
    USER QUESTION: {question}
    
    RELEVANT CODE CHUNKS (Retrieved from Vector DB):
    {context_string}
    
    INSTRUCTIONS:
    1. Answer the user's question based STRICTLY on the provided code chunks.
    2. Do not hallucinate or guess. If the answer is not in the code chunks, say "I don't have enough context in the database to answer that."
    3. Cite the exact file names you used to formulate your answer.
    4. Format your response in clean Markdown, using code blocks where appropriate.
    """
    
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "You are a precise and helpful coding assistant."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.1
    )
    
    return response.choices[0].message.content
