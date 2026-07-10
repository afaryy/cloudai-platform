import json
import unittest
from pathlib import Path

from rag_ingest.eval_dataset import build_eval_dataset
from rag_ingest.ingest import ingest_markdown_directory


class SampleEvalDatasetTest(unittest.TestCase):
    def test_sample_eval_dataset_matches_current_ingest_flow(self):
        example_root = Path(__file__).resolve().parents[1]
        sample_docs = example_root / "sample_docs"
        sample_output = example_root / "sample_outputs" / "cloudai-rag-eval-dataset.json"

        chunks = ingest_markdown_directory(sample_docs)
        expected = build_eval_dataset(
            chunks,
            dataset_id="cloudai-rag-eval-demo",
        )
        actual_text = sample_output.read_text(encoding="utf-8")
        actual = json.loads(actual_text)

        self.assertEqual(actual, expected)
        self.assertEqual(
            actual_text,
            json.dumps(expected, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        )


if __name__ == "__main__":
    unittest.main()
