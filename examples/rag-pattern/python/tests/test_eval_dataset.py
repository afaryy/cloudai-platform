import json
import tempfile
import unittest
from pathlib import Path

from rag_ingest.eval_dataset import build_eval_dataset, chunk_to_eval_case, write_eval_dataset_json
from rag_ingest.models import RagChunk


class EvalDatasetTest(unittest.TestCase):
    def test_maps_chunk_to_eval_case(self):
        chunk = RagChunk(
            chunk_id="cloudai-demo-handbook:0001",
            chunk_index=1,
            source_id="cloudai-demo-handbook",
            source_title="CloudAI Demo Handbook",
            text="The platform evaluates policy, token budget, and audit requirements.",
            metadata={"use_case": "rag-pattern"},
        )

        eval_case = chunk_to_eval_case(chunk)

        self.assertEqual(eval_case["caseId"], "eval-cloudai-demo-handbook-0001")
        self.assertEqual(eval_case["question"], "What governance signals are described in CloudAI Demo Handbook?")
        self.assertEqual(eval_case["expectedSourceId"], "cloudai-demo-handbook")
        self.assertTrue(eval_case["expectedCitationRequired"])
        self.assertEqual(eval_case["sourceChunkId"], "cloudai-demo-handbook:0001")
        self.assertEqual(eval_case["qualityNotes"], ["answer should cite the expected source"])

    def test_eval_case_id_normalises_source_id(self):
        chunk = RagChunk(
            chunk_id="CloudAI Handbook/Section 1:0001",
            chunk_index=1,
            source_id="CloudAI Handbook/Section 1",
            source_title="CloudAI Handbook",
            text="Synthetic chunk text.",
        )

        eval_case = chunk_to_eval_case(chunk)

        self.assertEqual(eval_case["caseId"], "eval-cloudai-handbook-section-1-0001")

    def test_builds_deterministic_eval_dataset(self):
        chunks = [
            RagChunk(
                chunk_id="cloudai-demo-handbook:0001",
                chunk_index=1,
                source_id="cloudai-demo-handbook",
                source_title="CloudAI Demo Handbook",
                text="First synthetic chunk.",
            )
        ]

        dataset = build_eval_dataset(chunks, dataset_id="cloudai-rag-eval-demo")

        self.assertEqual(dataset["datasetId"], "cloudai-rag-eval-demo")
        self.assertEqual(dataset["datasetProfile"], "local-rag-eval-demo")
        self.assertEqual(dataset["caseCount"], 1)
        self.assertEqual(dataset["cases"][0]["caseId"], "eval-cloudai-demo-handbook-0001")

    def test_writes_eval_dataset_json(self):
        chunks = [
            RagChunk(
                chunk_id="cloudai-demo-handbook:0001",
                chunk_index=1,
                source_id="cloudai-demo-handbook",
                source_title="CloudAI Demo Handbook",
                text="First synthetic chunk.",
            )
        ]

        with tempfile.TemporaryDirectory() as tmp_dir:
            output_path = Path(tmp_dir) / "eval-dataset.json"

            write_eval_dataset_json(
                chunks,
                output_path,
                dataset_id="cloudai-rag-eval-demo",
            )

            written = json.loads(output_path.read_text(encoding="utf-8"))

        self.assertEqual(written["caseCount"], 1)
        self.assertEqual(written["cases"][0]["expectedSourceId"], "cloudai-demo-handbook")


if __name__ == "__main__":
    unittest.main()
