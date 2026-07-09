const sampleDocuments = [
  {
    id: "synthetic-policy-001",
    title: "Synthetic AI Access Policy",
    classification: "public-demo"
  },
  {
    id: "synthetic-runbook-001",
    title: "Synthetic Gateway Operations Runbook",
    classification: "public-demo"
  }
];

console.log(JSON.stringify({
  mode: "mock",
  note: "Synthetic ingest preview only. No files are uploaded and no vector store is created.",
  documents: sampleDocuments
}, null, 2));
