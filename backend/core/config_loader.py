import json
from pathlib import Path
from typing import Dict, List, Any
from backend.core.schemas import DomainPack

BASE_DIR = Path(__file__).resolve().parent.parent


def load_domain_pack(domain_name: str) -> dict:
    """
    Loads and validates the domain pack JSON file.
    Validates it against the Pydantic DomainPack schema.
    """
    # Resolve domain pack filename
    domain_file = f"{domain_name}.json"
    file_path = BASE_DIR / "config" / "domain_packs" / domain_file

    if not file_path.exists():
        raise FileNotFoundError(f"Domain pack configuration file not found at: {file_path}")

    with open(file_path, "r") as f:
        raw_data = json.load(f)

    # Perform Pydantic validation (fails early if invalid)
    validated_pack = DomainPack.model_validate(raw_data)
    
    # Return as standard dictionary
    return validated_pack.model_dump()


def load_accounts(domain_name: str) -> list:
    """
    Loads the synthetic accounts or candidates data file for a given domain name.
    """
    if domain_name == "customer_success":
        file_path = BASE_DIR / "data" / "customer_success" / "accounts.json"
    elif domain_name == "recruitment":
        file_path = BASE_DIR / "data" / "recruitment" / "candidates.json"
    else:
        # Generic fallback directory matching domain_name
        file_path = BASE_DIR / "data" / domain_name / "accounts.json"

    if not file_path.exists():
        raise FileNotFoundError(f"Accounts/candidates data file not found at: {file_path}")

    with open(file_path, "r") as f:
        return json.load(f)


def load_data(domain_name: str) -> dict:
    """
    Helper function to load both domain pack configuration and accounts data in one call.
    """
    return {
        "domain_pack": load_domain_pack(domain_name),
        "accounts": load_accounts(domain_name)
    }
