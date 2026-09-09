from slowapi import Limiter
from slowapi.util import get_remote_address

# Global rate limiter using the user's IP address
limiter = Limiter(key_func=get_remote_address)
