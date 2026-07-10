import tempfile
import unittest
from pathlib import Path

from rag_ingest.ingest import ingest_markdown_directory


class IngestMarkdownDirectoryTest(unittest.TestCase):
    def test_ingests_synthetic_markdown_with_governance_metadata(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            docs_dir = Path(tmp_dir)
            (docs_dir / "cloudai-demo-handbook.md").write_text(
                "\n\n".join(
                    [
                        "# CloudAI Demo Handbook",
                        "Synthetic guidance for governed AI access.",
                        "Only demonstration content is used in this example.",
                    ]
                ),
                encoding="utf-8",
            )

            records = ingest_markdown_directory(docs_dir, max_chars=96)

        self.assertGreaterEqual(len(records), 1)
        first = records[0]
        self.assertEqual(first.source_id, "cloudai-demo-handbook")
        self.assertEqual(first.source_title, "CloudAI Demo Handbook")
        self.assertEqual(first.classification, "synthetic-demo")
        self.assertEqual(first.content_type, "text/markdown")
        self.assertEqual(first.metadata["use_case"], "rag-pattern")
        self.assertEqual(first.metadata["egress"], "local-only")
        self.assertEqual(first.metadata["embedding_status"], "not-generated")
        self.assertIn("Synthetic guidance", " ".join(record.text for record in records))

    def test_ingests_markdown_files_in_stable_filename_order(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            docs_dir = Path(tmp_dir)
            (docs_dir / "b-guide.md").write_text("# B Guide\n\nSecond file.", encoding="utf-8")
            (docs_dir / "a-guide.md").write_text("# A Guide\n\nFirst file.", encoding="utf-8")

            records = ingest_markdown_directory(docs_dir, max_chars=96)

        self.assertEqual([record.source_id for record in records], ["a-guide", "b-guide"])

    def test_raises_clear_error_for_missing_directory(self):
        missing_dir = Path("missing-rag-docs")

        with self.assertRaisesRegex(FileNotFoundError, "docs_dir does not exist"):
            ingest_markdown_directory(missing_dir)


if __name__ == "__main__":
    unittest.main()
