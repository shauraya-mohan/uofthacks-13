"""
Embedding generation and FAISS vector store management.
Uses Gemini's free text-embedding-004 model for embeddings.
"""

import os
import numpy as np
import faiss
from typing import List, Dict, Any, Optional, Tuple
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Embedding model (free tier)
EMBEDDING_MODEL = "models/text-embedding-004"
EMBEDDING_DIM = 768  # Gemini embedding dimension

# In-memory FAISS index and metadata
_index: Optional[faiss.IndexFlatIP] = None  # Inner product for cosine similarity
_id_map: List[str] = []  # Maps FAISS index positions to report IDs
_text_cache: Dict[str, str] = {}  # Maps report IDs to their text (for cache invalidation)


def get_embeddings_model() -> GoogleGenerativeAIEmbeddings:
    """Get the Gemini embeddings model."""
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")
    
    return GoogleGenerativeAIEmbeddings(
        model=EMBEDDING_MODEL,
        google_api_key=api_key,
    )


def build_report_text(report: Dict[str, Any]) -> str:
    """
    Build searchable text for a report (used for embedding).
    Combines title, description, category, severity, and suggested fix.
    """
    content = report.get('content', {})
    ai_draft = report.get('aiDraft', {})
    
    title = content.get('title') or ai_draft.get('title') or ''
    description = content.get('description') or ai_draft.get('description') or ''
    category = (content.get('category') or ai_draft.get('category') or '').replace('_', ' ')
    severity = content.get('severity') or ai_draft.get('severity') or ''
    fix = content.get('suggestedFix') or ai_draft.get('suggestedFix') or ''
    
    text = f"{title}. {category}. {severity} severity. {description} {fix}".strip()
    # Debug: show first 100 chars of each report text
    print(f"[EMBED] {report.get('_id', 'unknown')[:8]}: {text[:100]}...")
    return text


def normalize_vectors(vectors: np.ndarray) -> np.ndarray:
    """Normalize vectors for cosine similarity using inner product."""
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    norms[norms == 0] = 1  # Avoid division by zero
    return vectors / norms


async def build_index(reports: List[Dict[str, Any]], force_rebuild: bool = False) -> int:
    """
    Build or update the FAISS index from reports.
    Returns the number of indexed reports.
    """
    global _index, _id_map, _text_cache
    
    if not reports:
        return 0
    
    # Check which reports need (re)embedding
    reports_to_embed = []
    for report in reports:
        report_id = report['_id']
        text = build_report_text(report)
        
        if force_rebuild or report_id not in _text_cache or _text_cache[report_id] != text:
            reports_to_embed.append((report_id, text))
    
    if not reports_to_embed and _index is not None:
        # No updates needed
        return len(_id_map)
    
    # If we need to rebuild, start fresh
    if force_rebuild or _index is None:
        _index = faiss.IndexFlatIP(EMBEDDING_DIM)
        _id_map = []
        _text_cache = {}
        reports_to_embed = [(r['_id'], build_report_text(r)) for r in reports]
    
    if not reports_to_embed:
        return len(_id_map)
    
    # Generate embeddings
    model = get_embeddings_model()
    texts = [text for _, text in reports_to_embed]
    
    # Batch embed (LangChain handles batching internally)
    embeddings = await model.aembed_documents(texts)
    embeddings_array = normalize_vectors(np.array(embeddings, dtype=np.float32))
    
    # Add to index
    _index.add(embeddings_array)
    
    for report_id, text in reports_to_embed:
        _id_map.append(report_id)
        _text_cache[report_id] = text
    
    return len(_id_map)


async def search_similar(
    query: str,
    top_k: int = 20,
    threshold: float = 0.5,
) -> List[Tuple[str, float]]:
    """
    Search for similar reports using vector similarity.
    
    Args:
        query: Natural language search query
        top_k: Maximum number of results to return
        threshold: Minimum similarity score (0-1)
    
    Returns:
        List of (report_id, score) tuples, sorted by score descending
    """
    global _index, _id_map
    
    if _index is None or _index.ntotal == 0:
        return []
    
    # Generate query embedding
    model = get_embeddings_model()
    query_embedding = await model.aembed_query(query)
    query_vector = normalize_vectors(np.array([query_embedding], dtype=np.float32))
    
    # Search
    k = min(top_k, _index.ntotal)
    scores, indices = _index.search(query_vector, k)
    
    # Filter by threshold and map to report IDs
    results = []
    for score, idx in zip(scores[0], indices[0]):
        if idx >= 0 and score >= threshold:
            results.append((_id_map[idx], float(score)))
    
    return results


def get_index_size() -> int:
    """Get the number of vectors in the index."""
    global _index
    return _index.ntotal if _index is not None else 0
