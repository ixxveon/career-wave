from types import SimpleNamespace

from admin.ai_metrics.service.chunking_service import ChunkingService


def test_chunking_service_splits_text_into_ordered_chunks():
    settings = SimpleNamespace(
        rag_chunk_target_chars=40,
        rag_chunk_max_chars=60,
    )
    service = ChunkingService(settings=settings)

    text = (
        "Career Wave AI Metrics overview.\n\n"
        "This paragraph should become another chunk because the combined size exceeds target.\n\n"
        "Final notes."
    )

    result = service.chunk_text(text)

    assert result.chunk_count >= 2
    assert [chunk.index for chunk in result.chunks] == list(range(result.chunk_count))
    assert all(chunk.content.strip() for chunk in result.chunks)
    assert result.chunks[0].content == "Career Wave AI Metrics overview."
    assert "Final notes." in result.chunks[-1].content
