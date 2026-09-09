import os
import subprocess
import shutil
import tempfile

# Files and directories we want to ignore to save tokens and processing time
IGNORE_DIRS = {".git", "node_modules", "venv", "__pycache__", ".next", "dist", "build"}
IGNORE_EXTS = {".jpg", ".png", ".pdf", ".zip", ".exe", ".bin", ".mp4", ".ico"}

def clone_and_filter_repo(repo_url: str) -> str:
    """
    Clones a repository into a temporary directory and removes ignored files/folders.
    Returns the path to the cleaned temporary directory.
    """
    # Create a unique temporary directory
    temp_dir = tempfile.mkdtemp(prefix="repo_")
    
    try:
        # 1. Clone the repo (shallow clone to save time and space)
        subprocess.run(
            ["git", "clone", "--depth", "1", repo_url, temp_dir],
            check=True,
            capture_output=True,
            text=True
        )
        
        # 2. Filter the repo
        _clean_directory(temp_dir)
        
        return temp_dir
        
    except subprocess.CalledProcessError as e:
        # If cloning fails, clean up the temp dir and raise error
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise Exception(f"Failed to clone repository: {e.stderr}")

def _clean_directory(dir_path: str):
    """Recursively removes ignored directories and files."""
    for root, dirs, files in os.walk(dir_path, topdown=True):
        # Actually DELETE the directories from disk, and remove them from os.walk traversal
        for d in list(dirs): # Iterate over a copy of the list
            if d in IGNORE_DIRS:
                shutil.rmtree(os.path.join(root, d), ignore_errors=True)
                dirs.remove(d) # Prevent os.walk from trying to enter the deleted folder
        
        # Delete ignored files
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in IGNORE_EXTS:
                try:
                    os.remove(os.path.join(root, file))
                except FileNotFoundError:
                    pass
