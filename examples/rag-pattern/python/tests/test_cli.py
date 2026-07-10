import json
import tempfile
import unittest
from contextlib import redirect_stderr
from io import StringIO
from pathlib import Path

from rag_ingest.cli import main


class CliTest(unittest.TestCase):
    def test_exports_chunks_from_sample_docs(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            docs_dir = tmp_path / "docs"
            docs_dir.mkdir()
            (docs_dir / "demo-handbook.md").write_text(
                "# Demo Handbook\n\nSynthetic content for local export.",
                encoding="utf-8",
            )
            output_path = tmp_path / "chunks.json"

            exit_code = main(
                [
                    "--docs",
                    str(docs_dir),
                    "--out",
                    str(output_path),
                    "--knowledge-base",
                    "demo-handbook",
                ]
            )

            exported = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 0)
        self.assertEqual(exported["knowledgeBase"], "demo-handbook")
        self.assertEqual(exported["recordCount"], 1)
        self.assertEqual(exported["records"][0]["sourceId"], "demo-handbook")

    def test_exports_eval_dataset_from_sample_docs(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            docs_dir = tmp_path / "docs"
            docs_dir.mkdir()
            (docs_dir / "demo-handbook.md").write_text(
                "# Demo Handbook\n\nSynthetic content for local export.",
                encoding="utf-8",
            )
            output_path = tmp_path / "eval-dataset.json"

            exit_code = main(
                [
                    "--mode",
                    "eval-dataset",
                    "--docs",
                    str(docs_dir),
                    "--out",
                    str(output_path),
                    "--dataset-id",
                    "demo-rag-eval",
                ]
            )

            exported = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(exit_code, 0)
        self.assertEqual(exported["datasetId"], "demo-rag-eval")
        self.assertEqual(exported["caseCount"], 1)
        self.assertEqual(exported["cases"][0]["expectedSourceId"], "demo-handbook")

    def test_returns_error_for_missing_docs_directory(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            output_path = tmp_path / "chunks.json"
            stderr = StringIO()

            with redirect_stderr(stderr):
                exit_code = main(
                    [
                        "--docs",
                        str(tmp_path / "missing-docs"),
                        "--out",
                        str(output_path),
                    ]
                )

        self.assertEqual(exit_code, 2)
        self.assertIn("docs_dir does not exist", stderr.getvalue())

    def test_returns_error_when_output_path_is_directory(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_path = Path(tmp_dir)
            docs_dir = tmp_path / "docs"
            docs_dir.mkdir()
            (docs_dir / "demo-handbook.md").write_text(
                "# Demo Handbook\n\nSynthetic content for local export.",
                encoding="utf-8",
            )
            stderr = StringIO()

            with redirect_stderr(stderr):
                exit_code = main(
                    [
                        "--docs",
                        str(docs_dir),
                        "--out",
                        str(tmp_path),
                    ]
                )

        self.assertEqual(exit_code, 2)
        self.assertIn("error:", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
