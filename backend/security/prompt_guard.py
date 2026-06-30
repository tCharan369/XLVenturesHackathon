"""
Prompt Guard — security filters and detection rules for prompt injection attempts.
"""

import re
import logging

logger = logging.getLogger(__name__)

# Basic keywords for prompt injection detection (case-insensitive)
INJECTION_KEYWORDS = [
    r"ignore\s+(?:previous|above|all)\s+instructions",
    r"system\s+prompt",
    r"override\s+instructions",
    r"developer\s+message",
    r"reveal\s+(?:secret|prompt|key|api)",
    r"execute\s+",
    r"tool\s+call",
    r"you\s+are\s+now\s+a",
    r"assistant\s+must",
    r"api\s*key",
]

def contains_prompt_injection(text: str) -> bool:
    """
    Check if the interaction text contains prompt injection signatures.
    """
    if not text:
        return False
    
    text_lower = text.lower()
    for pattern in INJECTION_KEYWORDS:
        if re.search(pattern, text_lower):
            logger.warning(f"Prompt injection pattern detected matching pattern: {pattern}")
            return True
            
    return False

def sanitize_interaction(text: str) -> str:
    """
    Sanitize interaction text to strip potential malicious payload instructions and redact pasted API keys.
    """
    if not text:
        return ""
    
    # Redact any pasted API keys / secrets
    # 1. OpenRouter / OpenAI patterns: sk-or-v1-... or sk-...
    text = re.sub(r"\bsk-or-v1-[a-zA-Z0-9]{32,}\b", "[REDACTED_API_KEY]", text)
    text = re.sub(r"\bsk-[a-zA-Z0-9]{20,}\b", "[REDACTED_API_KEY]", text)
    # 2. AWS / Generic secrets keywords
    text = re.sub(r"(?i)(?:aws_secret|secret_key|api_key|password)\s*[:=]\s*[^\s,\'\"]+", r"\g<0> [REDACTED_SECRET]", text)
    
    # Strip double braces/brackets/markdown delimiters that models might parse as structured directives
    sanitized = text.replace("{", "[").replace("}", "]")
    sanitized = re.sub(r"```[a-zA-Z]*", "", sanitized) # Remove markdown code blocks
    
    return sanitized.strip()
