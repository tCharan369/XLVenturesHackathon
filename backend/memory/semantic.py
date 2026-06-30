"""
Semantic Memory — ChromaDB-backed vector store for playbooks and domain knowledge.

Uses a local sentence-transformers model (all-MiniLM-L6-v2) for embeddings
and ChromaDB PersistentClient for on-disk persistence.

Collections are auto-created via get_or_create_collection in every public method.
"""

from pathlib import Path
from typing import Dict, Any, List

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from backend.core.settings import settings

# ---------------------------------------------------------------------------
# ChromaDB client setup
# ---------------------------------------------------------------------------

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_CHROMA_PATH = _PROJECT_ROOT / "backend" / "data" / "chroma"
_CHROMA_PATH.mkdir(parents=True, exist_ok=True)

_client = chromadb.PersistentClient(path=str(_CHROMA_PATH))

_embedding_fn = SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2",
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _collection_name(domain_pack_id: str) -> str:
    """Build a namespaced collection name from the domain pack id."""
    return f"{settings.MEMORY_COLLECTION_PREFIX}{domain_pack_id}"


def _get_collection(domain_pack_id: str):
    """Get or create a ChromaDB collection for a domain (auto-creates)."""
    return _client.get_or_create_collection(
        name=_collection_name(domain_pack_id),
        embedding_function=_embedding_fn,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def add_documents(
    domain_pack_id: str,
    docs: List[Dict[str, Any]],
) -> int:
    """
    Upsert documents into the domain's ChromaDB collection.

    Each doc dict must contain:
        - id:       unique string identifier
        - content:  the text to embed
        - metadata: dict of arbitrary metadata (optional, defaults to {})

    Collection is auto-created via get_or_create_collection.
    Returns the number of documents upserted.
    """
    if not docs:
        return 0

    collection = _get_collection(domain_pack_id)

    ids = [d["id"] for d in docs]
    documents = [d["content"] for d in docs]
    metadatas = [d.get("metadata") or {"_id": d["id"]} for d in docs]

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
    )
    return len(ids)


def query(
    domain_pack_id: str,
    query_text: str,
    k: int = 3,
) -> List[Dict[str, Any]]:
    """
    Query the domain's collection for the *k* most relevant documents.

    Collection is auto-created via get_or_create_collection.
    Returns a list of dicts with keys: id, content, metadata, distance.
    """
    collection = _get_collection(domain_pack_id)

    # Guard against querying an empty collection
    if collection.count() == 0:
        return []

    results = collection.query(
        query_texts=[query_text],
        n_results=min(k, collection.count()),
    )

    output: List[Dict[str, Any]] = []
    for i in range(len(results["ids"][0])):
        output.append({
            "id": results["ids"][0][i],
            "content": results["documents"][0][i],
            "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
            "distance": results["distances"][0][i] if results["distances"] else None,
        })
    return output


# ---------------------------------------------------------------------------
# Utility methods (for tests and demo resets)
# ---------------------------------------------------------------------------


def clear_collection(domain_pack_id: str) -> bool:
    """
    Delete the entire ChromaDB collection for a domain.

    Returns True if the collection existed and was deleted, False otherwise.
    """
    col_name = _collection_name(domain_pack_id)
    try:
        _client.delete_collection(name=col_name)
        return True
    except ValueError:
        # Collection does not exist
        return False


def get_document_by_id(domain_pack_id: str, doc_id: str) -> dict:
    """
    Retrieve a specific document by its ID from the domain's collection.
    Returns None if not found.
    """
    collection = _get_collection(domain_pack_id)
    try:
        res = collection.get(ids=[doc_id])
        if res and res.get("documents") and len(res["documents"]) > 0:
            return {
                "id": doc_id,
                "content": res["documents"][0],
                "metadata": res["metadatas"][0] if res["metadatas"] else {},
                "distance": 0.80,
            }
    except Exception:
        pass
    return None


