"""
Input Guard — input validation filters for incoming API requests.
"""

from typing import Dict, Any
from backend.security.prompt_guard import contains_prompt_injection

class ValidationError(Exception):
    """Custom input validation exception."""
    pass

def validate_interaction_input(payload: Dict[str, Any]) -> None:
    """
    Validate the incoming request payload structure, interaction text, and size.
    Raises ValidationError if validation fails.
    """
    # 1. Null check
    if not payload:
        raise ValidationError("Empty payload received.")
        
    # 2. Check required fields
    domain_pack_id = payload.get("domain_pack_id")
    entity_id = payload.get("entity_id")
    interaction = payload.get("interaction")
    
    if not domain_pack_id:
        raise ValidationError("Missing required field: 'domain_pack_id'")
    if not entity_id:
        raise ValidationError("Missing required field: 'entity_id'")
        
    # 3. Check interaction length if provided
    if interaction:
        if len(interaction) > 10000:
            raise ValidationError("Interaction notes length exceeds the maximum allowed limit of 10,000 characters.")
        
        # 4. Check for obvious prompt injection (raise warning or handle strictly if wanted, here we raise validation warning for test)
        # Note: We will allow processing but flag it in metadata, unless it is a severe attack.
        # The prompt injection is flagged in backend, but let's check validation rules.
