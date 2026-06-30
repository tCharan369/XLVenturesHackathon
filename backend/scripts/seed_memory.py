"""
Seed Memory — discovers all domains and loads playbook markdown files into ChromaDB.

Domain-agnostic: scans every subdirectory of backend/data/ for a playbooks/ folder
and seeds the corresponding ChromaDB collection automatically.

Idempotent: uses upsert so multiple runs do not duplicate data.

Usage:
    PYTHONPATH=. python backend/scripts/seed_memory.py
"""

import sys
from pathlib import Path

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.memory.semantic import add_documents

# ---------------------------------------------------------------------------
# Auto-discover domains
# ---------------------------------------------------------------------------

DATA_DIR = PROJECT_ROOT / "backend" / "data"


def discover_domains() -> dict:
    """
    Scan backend/data/ for subdirectories that contain a playbooks/ folder.
    Returns {domain_id: playbook_dir_path}.
    """
    domains = {}
    if not DATA_DIR.exists():
        return domains

    for child in sorted(DATA_DIR.iterdir()):
        if not child.is_dir():
            continue
        # Skip __pycache__ and hidden dirs
        if child.name.startswith(("_", ".")):
            continue
        playbook_dir = child / "playbooks"
        if playbook_dir.exists() and playbook_dir.is_dir():
            domains[child.name] = playbook_dir

    return domains


def seed_playbooks() -> None:
    """Read all .md playbooks across all domains and ingest them into ChromaDB."""
    domains = discover_domains()

    if not domains:
        print("⚠️  No domains with playbooks/ directories found in backend/data/")
        return

    total = 0
    for domain_id, playbook_dir in domains.items():
        md_files = sorted(playbook_dir.glob("*.md"))
        if not md_files:
            print(f"⚠️  No .md files found in {playbook_dir}")
            continue

        docs = []
        for md_file in md_files:
            content = md_file.read_text(encoding="utf-8")
            docs.append({
                "id": md_file.stem,
                "content": content,
                "metadata": {"type": "playbook", "domain": domain_id, "filename": md_file.name},
            })

        count = add_documents(domain_id, docs)
        total += count
        print(f"✅ Domain '{domain_id}': ingested {count} playbook(s) into ChromaDB.")
        for d in docs:
            print(f"   • {d['id']}")

    print(f"\n📊 Total: {total} playbook(s) across {len(domains)} domain(s).")


if __name__ == "__main__":
    print("=" * 60)
    print("  Seeding Memory — Playbook Ingestion (All Domains)")
    print("=" * 60)
    seed_playbooks()
    print("\nDone.")
