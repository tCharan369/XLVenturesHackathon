import os
import json
from pathlib import Path
from backend.core.config_loader import load_domain_pack, load_accounts

BASE_DIR = Path(__file__).resolve().parent.parent


def seed_all_data():
    """
    Checks, creates, and validates all domain packs and synthetic datasets.
    """
    print("--- Starting Seeding and Validation Script ---")
    
    # 1. Ensure folders exist
    folders = [
        BASE_DIR / "config" / "domain_packs",
        BASE_DIR / "data" / "customer_success",
        BASE_DIR / "data" / "recruitment",
        BASE_DIR / "docs" / "examples"
    ]
    
    for f in folders:
        f.mkdir(parents=True, exist_ok=True)
        print(f"Verified directory: {f}")

    # 2. Check and Seed Customer Success domain pack
    cs_pack_path = BASE_DIR / "config" / "domain_packs" / "customer_success.json"
    if not cs_pack_path.exists():
        cs_pack = {
            "id": "customer_success",
            "name": "Customer Success",
            "description": "Customer Success domain pack for SaaS account management and renewal intelligence.",
            "entities": ["Customer", "Account", "Product"],
            "workflows": ["Renewal", "Upsell", "Escalation"],
            "decision_points": ["renewal_risk", "upsell_opportunity", "champion_change_risk", "escalation_risk"],
            "business_rules": [],
            "success_metrics": ["net_revenue_retention", "renewal_rate", "customer_health"],
            "tools": [],
            "prompt_overrides": {}
        }
        with open(cs_pack_path, "w") as f:
            json.dump(cs_pack, f, indent=2)
        print("Seeded customer_success.json")

    # 3. Check and Seed Recruitment domain pack
    rec_pack_path = BASE_DIR / "config" / "domain_packs" / "recruitment.json"
    if not rec_pack_path.exists():
        rec_pack = {
            "id": "recruitment",
            "name": "Staffing and Recruitment",
            "description": "Staffing and Recruitment domain pack for screening and offer workflows in candidate hiring pipelines.",
            "entities": ["Candidate", "Job", "Interview"],
            "workflows": ["Screening", "Offer"],
            "decision_points": ["candidate_dropoff_risk", "fast_track_opportunity"],
            "business_rules": [],
            "success_metrics": ["time_to_hire"],
            "tools": [],
            "prompt_overrides": {}
        }
        with open(rec_pack_path, "w") as f:
            json.dump(rec_pack, f, indent=2)
        print("Seeded recruitment.json")

    # 4. Check and Validate loading
    print("\nValidating loaded configurations...")
    for domain in ["customer_success", "recruitment"]:
        try:
            pack_data = load_domain_pack(domain)
            accounts_data = load_accounts(domain)
            print(f"✅ Domain pack '{domain}' validated successfully. Loaded {len(accounts_data)} records.")
        except Exception as e:
            print(f"❌ Validation failed for '{domain}': {str(e)}")

    print("\n--- Seeding and Validation Completed ---")


if __name__ == "__main__":
    seed_all_data()
