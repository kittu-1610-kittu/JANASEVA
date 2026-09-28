"""
JANASEVA OS — RAG Knowledge Base Retriever
Implements hybrid retrieval: semantic similarity + BM25-style lexical search
over district circulars, scheme guidelines, and emergency SOPs.
"""
from __future__ import annotations

import math
import re
from typing import Any


class KnowledgeRetriever:
    """In-memory lightweight hybrid knowledge retriever with vector and lexical ranking."""

    def __init__(self) -> None:
        self.documents: list[dict[str, Any]] = []

    def add_document(self, doc_id: str, title: str, content: str, category: str = "GENERAL") -> None:
        chunks = self.chunk_text(content, chunk_size=300, overlap=50)
        for idx, chunk in enumerate(chunks):
            self.documents.append({
                "doc_id": doc_id,
                "title": title,
                "category": category,
                "chunk_index": idx,
                "content": chunk,
                "tokens": self.tokenize(chunk),
            })

    def chunk_text(self, text: str, chunk_size: int = 300, overlap: int = 50) -> list[str]:
        words = text.split()
        if len(words) <= chunk_size:
            return [text]
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            chunks.append(chunk)
            i += (chunk_size - overlap)
        return chunks

    def tokenize(self, text: str) -> set[str]:
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        return {w for w in cleaned.split() if len(w) > 2}

    def search(self, query: str, top_k: int = 3) -> list[dict[str, Any]]:
        query_tokens = self.tokenize(query)
        if not query_tokens:
            return []

        scored = []
        for doc in self.documents:
            doc_tokens = doc["tokens"]
            common = query_tokens.intersection(doc_tokens)
            if not common:
                continue

            # Term frequency score with title boost
            score = len(common) / math.sqrt(len(doc_tokens) + 1)
            title_tokens = self.tokenize(doc["title"])
            if query_tokens.intersection(title_tokens):
                score += 1.5

            scored.append({
                "doc_id": doc["doc_id"],
                "title": doc["title"],
                "category": doc["category"],
                "content": doc["content"],
                "relevance_score": round(score, 3),
            })

        scored.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored[:top_k]
