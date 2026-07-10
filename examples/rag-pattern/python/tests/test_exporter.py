import json
import tempfile
import unittest
from pathlib import Path

from rag_ingest.exporter import chunk_to_export_record, chunks_to_export_document, write_chunks_json
from rag_ingest.models import RagChunk


class ExporterTest(unittest.TestCase):
    def test_maps_chunk_to_governance_aligned_record(self):
        chunk = RagChunk(
            chunk_id="demo-handbook:0001",
            chunk_index=1,
            source_id="demo-handbook",
            source_title="Demo Handbook",
            text="Synthetic chunk text.",
            metadata={"egress": "local-only"},
        )

        record = chunk_to_export_record(
            chunk,
            retrieved_at="2026-07-10T00:00:00.000Z",
            citation_base_url="https://example.com/cloudai-platform/rag-sources",
        )

        self.assertEqual(record["sourceId"], "demo-handbook")
        self.assertEqual(record["sourceTitle"], "Demo Handbook")
        self.assertEqual(
            record["citationUrl"],
            "https://example.com/cloudai-platform/rag-sources/demo-handbook",
        )
        self.assertEqual(record["classification"], "synthetic-public")
        self.assertEqual(record["retrievedAt"], "2026-07-10T00:00:00.000Z")
        self.assertEqual(record["chunkId"], "demo-handbook:0001")
        self.assertEqual(record["chunkIndex"], 1)
        self.assertEqual(record["contentType"], "text/markdown")
        self.assertEqual(record["metadata"]["egress"], "local-only")
        self.assertEqual(record["text"], "Synthetic chunk text.")

    def test_escapes_source_id_as_single_citation_path_segment(self):
        chunk = RagChunk(
            chunk_id="demo-handbook:0001",
            chunk_index=1,
            source_id="demo handbook/section 1",
            source_title="Demo Handbook",
            text="Synthetic chunk text.",
        )

        record = chunk_to_export_record(chunk)

        self.assertEqual(
            record["citationUrl"],
            "https://example.com/cloudai-platform/rag-sources/demo%20handbook%2Fsection%201",
        )

    def test_creates_deterministic_export_document(self):
        chunks = [
            RagChunk(
                chunk_id="demo-handbook:0001",
                chunk_index=1,
                source_id="demo-handbook",
                source_title="Demo Handbook",
                text="First chunk.",
            )
        ]

        document = chunks_to_export_document(
            chunks,
            knowledge_base="demo-handbook",
            retrieved_at="2026-07-10T00:00:00.000Z",
        )

        self.assertEqual(document["knowledgeBase"], "demo-handbook")
        self.assertEqual(document["recordCount"], 1)
        self.assertEqual(document["exportProfile"], "local-rag-ingest-demo")
        self.assertEqual(document["records"][0]["chunkId"], "demo-handbook:0001")

    def test_writes_json_export_file(self):
        chunks = [
            RagChunk(
                chunk_id="demo-handbook:0001",
                chunk_index=1,
                source_id="demo-handbook",
                source_title="Demo Handbook",
                text="First chunk.",
            )
        ]

        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = Path(tmp_dir) / "chunks.json"

            write_chunks_json(
                chunks,
                output_path,
                knowledge_base="demo-handbook",
                retrieved_at="2026-07-10T00:00:00.000Z",
            )

            written = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(written["recordCount"], 1)
        self.assertEqual(written["records"][0]["sourceId"], "demo-handbook")

    def test_writes_deterministic_json_for_equivalent_metadata(self):
        first_chunks = [
            RagChunk(
                chunk_id="demo-handbook:0001",
                chunk_index=1,
                source_id="demo-handbook",
                source_title="Demo Handbook",
                text="First chunk.",
                metadata={"zeta": "last", "alpha": "first"},
            )
        ]
        second_chunks = [
            RagChunk(
                chunk_id="demo-handbook:0001",
                chunk_index=1,
                source_id="demo-handbook",
                source_title="Demo Handbook",
                text="First chunk.",
                metadata={"alpha": "first", "zeta": "last"},
            )
        ]

        with tempfile.TemporaryDirectory() as tmp_dir:
            first_path = Path(tmp_dir) / "first.json"
            second_path = Path(tmp_dir) / "second.json"

            write_chunks_json(first_chunks, first_path, knowledge_base="demo-handbook")
            write_chunks_json(second_chunks, second_path, knowledge_base="demo-handbook")

            first_text = first_path.read_text(encoding="utf-8")
            second_text = second_path.read_text(encoding="utf-8")

        self.assertEqual(first_text, second_text)


if __name__ == "__main__":
    unittest.main()
