"""
PII Redaction Layer — simple masking rules for email, phone, and linkedin urls.
"""

import re

# Regex patterns for matching common PII strings
EMAIL_REGEX = re.compile(r"[\w\.-]+@[\w\.-]+\.\w+")
PHONE_REGEX = re.compile(r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b")
LINKEDIN_REGEX = re.compile(r"https?://(?:www\.)?linkedin\.com/in/[\w\-]+/?")

def mask_email(text: str) -> str:
    """Mask email addresses in text."""
    return EMAIL_REGEX.sub("[EMAIL]", text)

def mask_phone(text: str) -> str:
    """Mask phone numbers in text."""
    return PHONE_REGEX.sub("[PHONE]", text)

def mask_linkedin(text: str) -> str:
    """Mask LinkedIn profile links in text."""
    return LINKEDIN_REGEX.sub("[LINKEDIN]", text)

def sanitize_for_llm(text: str) -> str:
    """
    Apply all PII masking filters to make interaction text safe for LLMs.
    """
    if not text:
        return ""
    
    text = mask_linkedin(text)
    text = mask_email(text)
    text = mask_phone(text)
    
    return text
