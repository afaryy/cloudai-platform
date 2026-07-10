import json
import unittest
from pathlib import Path

from rag_ingest.exporter import chunks_to_export_document
from rag_ingest.ingest import ingest_markdown_directory


class SampleOutputTest(unittest.TestCase):
    def test_sample_output_matches_current_ingest_export_flow(self):
        example_root = Path(__file__).resolve().parents[1]
        sample_docs = example_root / "sample_docs"
        sample_output = example_root / "sample_outputs" / "cloudai-rag-chunks.json"

        chunks = ingest_markdown_directory(sample_docs)
        expected = chunks_to_export_document(
            chunks,
            knowledge_base="cloudai-demo-handbook",
        )
        actual = json.loads(sample_output.read_text(encoding="utf-8"))

        self.assertEqual(actual, expected)


if __name__ == "__main__":
    unittest.main()
