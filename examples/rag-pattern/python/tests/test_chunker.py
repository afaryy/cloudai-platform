import unittest

from rag_ingest.chunker import chunk_markdown_text


class ChunkMarkdownTextTest(unittest.TestCase):
    def test_splits_markdown_into_ordered_chunks_with_stable_ids(self):
        text = "\n\n".join(
            [
                "# CloudAI Demo Handbook",
                "This synthetic handbook describes governed model access.",
                "It also describes token budgets and evaluation evidence.",
            ]
        )

        chunks = chunk_markdown_text(
            source_id="demo-handbook",
            source_title="CloudAI Demo Handbook",
            text=text,
            max_chars=72,
        )

        self.assertGreaterEqual(len(chunks), 2)
        self.assertEqual(chunks[0].chunk_id, "demo-handbook:0001")
        self.assertEqual(chunks[0].chunk_index, 1)
        self.assertEqual(chunks[0].source_id, "demo-handbook")
        self.assertEqual(chunks[0].source_title, "CloudAI Demo Handbook")
        self.assertTrue(chunks[0].text.startswith("# CloudAI Demo Handbook"))
        self.assertTrue(all(len(chunk.text) <= 72 for chunk in chunks))

    def test_preserves_order_when_long_paragraph_requires_splitting(self):
        text = "\n\n".join(
            [
                "# Title",
                "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda",
            ]
        )

        chunks = chunk_markdown_text(
            source_id="ordered-doc",
            source_title="Ordered Doc",
            text=text,
            max_chars=40,
        )

        self.assertEqual(
            [chunk.chunk_id for chunk in chunks],
            ["ordered-doc:0001", "ordered-doc:0002", "ordered-doc:0003"],
        )
        self.assertEqual([chunk.chunk_index for chunk in chunks], [1, 2, 3])
        self.assertEqual(chunks[0].text, "# Title")
        self.assertTrue(chunks[1].text.startswith("alpha beta"))
        self.assertEqual(
            " ".join(chunk.text for chunk in chunks),
            "# Title alpha beta gamma delta epsilon zeta eta theta iota kappa lambda",
        )

    def test_rejects_single_token_that_exceeds_max_chars(self):
        with self.assertRaisesRegex(ValueError, "single token exceeds max_chars"):
            chunk_markdown_text(
                source_id="oversized-token",
                source_title="Oversized Token",
                text="x" * 41,
                max_chars=40,
            )


if __name__ == "__main__":
    unittest.main()
