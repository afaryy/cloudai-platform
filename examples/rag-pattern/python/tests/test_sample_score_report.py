import json
import unittest
from pathlib import Path

from rag_ingest.quality_scoring import score_eval_dataset


class SampleScoreReportTest(unittest.TestCase):
    def test_sample_score_report_matches_eval_dataset_and_responses(self):
        example_root = Path(__file__).resolve().parents[1]
        eval_dataset_path = example_root / "sample_outputs" / "cloudai-rag-eval-dataset.json"
        responses_path = example_root / "sample_outputs" / "mock-rag-responses.json"
        score_report_path = example_root / "sample_outputs" / "cloudai-rag-score-report.json"

        dataset = json.loads(eval_dataset_path.read_text(encoding="utf-8"))
        responses = json.loads(responses_path.read_text(encoding="utf-8"))
        expected = score_eval_dataset(dataset, responses)
        actual_text = score_report_path.read_text(encoding="utf-8")
        actual = json.loads(actual_text)

        self.assertEqual(actual, expected)
        self.assertEqual(
            actual_text,
            json.dumps(expected, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        )


if __name__ == "__main__":
    unittest.main()
