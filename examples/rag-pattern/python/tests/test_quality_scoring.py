import json
import tempfile
import unittest
from pathlib import Path

from rag_ingest.quality_scoring import score_eval_dataset, score_eval_response, write_score_report_json


class QualityScoringTest(unittest.TestCase):
    def test_scores_response_with_expected_source_and_citation(self):
        eval_case = {
            "caseId": "eval-cloudai-demo-handbook-0001",
            "expectedSourceId": "cloudai-demo-handbook",
            "expectedCitationRequired": True,
        }
        response = {
            "caseId": "eval-cloudai-demo-handbook-0001",
            "answer": "The response cites the governed source.",
            "sourceIds": ["cloudai-demo-handbook"],
            "citations": [{"sourceId": "cloudai-demo-handbook"}],
        }

        score = score_eval_response(eval_case, response)

        self.assertEqual(score["caseId"], "eval-cloudai-demo-handbook-0001")
        self.assertEqual(score["score"], 4)
        self.assertEqual(score["maxScore"], 4)
        self.assertTrue(score["passed"])
        self.assertEqual(score["checks"]["responsePresent"], "pass")
        self.assertEqual(score["checks"]["expectedSourcePresent"], "pass")
        self.assertEqual(score["checks"]["citationRequirementMet"], "pass")
        self.assertEqual(score["checks"]["unsupportedMarkerAbsent"], "pass")

    def test_scores_response_with_missing_citation_and_unsupported_marker(self):
        eval_case = {
            "caseId": "eval-cloudai-demo-handbook-0001",
            "expectedSourceId": "cloudai-demo-handbook",
            "expectedCitationRequired": True,
        }
        response = {
            "caseId": "eval-cloudai-demo-handbook-0001",
            "answer": "UNSUPPORTED: missing evidence.",
            "sourceIds": [],
            "citations": [],
        }

        score = score_eval_response(eval_case, response)

        self.assertEqual(score["score"], 1)
        self.assertFalse(score["passed"])
        self.assertEqual(score["checks"]["responsePresent"], "pass")
        self.assertEqual(score["checks"]["expectedSourcePresent"], "fail")
        self.assertEqual(score["checks"]["citationRequirementMet"], "fail")
        self.assertEqual(score["checks"]["unsupportedMarkerAbsent"], "fail")

    def test_scores_dataset_and_writes_report(self):
        dataset = {
            "datasetId": "cloudai-rag-eval-demo",
            "cases": [
                {
                    "caseId": "eval-cloudai-demo-handbook-0001",
                    "expectedSourceId": "cloudai-demo-handbook",
                    "expectedCitationRequired": True,
                }
            ],
        }
        responses = {
            "responseSetId": "mock-rag-responses",
            "responses": [
                {
                    "caseId": "eval-cloudai-demo-handbook-0001",
                    "answer": "The response cites the governed source.",
                    "sourceIds": ["cloudai-demo-handbook"],
                    "citations": [{"sourceId": "cloudai-demo-handbook"}],
                }
            ],
        }

        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = Path(tmp_dir) / "score-report.json"
            write_score_report_json(dataset, responses, output_path)
            report = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(report["datasetId"], "cloudai-rag-eval-demo")
        self.assertEqual(report["responseSetId"], "mock-rag-responses")
        self.assertEqual(report["caseCount"], 1)
        self.assertEqual(report["passedCount"], 1)
        self.assertEqual(report["results"][0]["score"], 4)

    def test_missing_response_fails_all_checks(self):
        dataset = {
            "datasetId": "cloudai-rag-eval-demo",
            "cases": [
                {
                    "caseId": "eval-cloudai-demo-handbook-0001",
                    "expectedSourceId": "cloudai-demo-handbook",
                    "expectedCitationRequired": True,
                }
            ],
        }
        responses = {"responseSetId": "mock-rag-responses", "responses": []}

        report = score_eval_dataset(dataset, responses)

        self.assertEqual(report["passedCount"], 0)
        self.assertEqual(report["results"][0]["score"], 0)
        self.assertEqual(report["results"][0]["checks"]["responsePresent"], "fail")

    def test_malformed_response_record_raises_clear_error(self):
        dataset = {
            "datasetId": "cloudai-rag-eval-demo",
            "cases": [
                {
                    "caseId": "eval-cloudai-demo-handbook-0001",
                    "expectedSourceId": "cloudai-demo-handbook",
                    "expectedCitationRequired": True,
                }
            ],
        }
        responses = {"responseSetId": "mock-rag-responses", "responses": [{}]}

        with self.assertRaisesRegex(ValueError, "response is missing caseId"):
            score_eval_dataset(dataset, responses)

    def test_missing_top_level_ids_raise_clear_error(self):
        with self.assertRaisesRegex(ValueError, "dataset is missing datasetId"):
            score_eval_dataset({"cases": []}, {"responseSetId": "mock-rag-responses", "responses": []})

        with self.assertRaisesRegex(ValueError, "responses are missing responseSetId"):
            score_eval_dataset({"datasetId": "cloudai-rag-eval-demo", "cases": []}, {"responses": []})


if __name__ == "__main__":
    unittest.main()
