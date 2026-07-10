import json
from pathlib import Path

from rag_ingest.exporter import DEFAULT_RETRIEVED_AT


def score_eval_response(eval_case: dict[str, object], response: dict[str, object]) -> dict[str, object]:
    """Score one synthetic response against one local eval case."""

    response_present = bool(response)
    checks = {
        "responsePresent": _pass_fail(response_present),
        "expectedSourcePresent": _pass_fail(response_present and _expected_source_present(eval_case, response)),
        "citationRequirementMet": _pass_fail(response_present and _citation_requirement_met(eval_case, response)),
        "unsupportedMarkerAbsent": _pass_fail(response_present and _unsupported_marker_absent(response)),
    }
    score = sum(1 for result in checks.values() if result == "pass")

    return {
        "caseId": eval_case["caseId"],
        "score": score,
        "maxScore": len(checks),
        "passed": score == len(checks),
        "checks": checks,
    }


def score_eval_dataset(
    dataset: dict[str, object],
    responses: dict[str, object],
    *,
    scored_at: str = DEFAULT_RETRIEVED_AT,
) -> dict[str, object]:
    """Score a local eval dataset against synthetic mock responses."""

    _validate_score_inputs(dataset, responses)
    response_by_case_id = _response_by_case_id(responses)
    results = [
        score_eval_response(eval_case, response_by_case_id.get(eval_case["caseId"], {}))
        for eval_case in dataset.get("cases", [])
        if isinstance(eval_case, dict)
    ]
    passed_count = sum(1 for result in results if result["passed"])

    return {
        "scoreProfile": "local-rag-quality-demo",
        "datasetId": dataset.get("datasetId"),
        "responseSetId": responses.get("responseSetId"),
        "scoredAt": scored_at,
        "caseCount": len(results),
        "passedCount": passed_count,
        "results": results,
    }


def write_score_report_json(
    dataset: dict[str, object],
    responses: dict[str, object],
    output_path: Path,
    *,
    scored_at: str = DEFAULT_RETRIEVED_AT,
) -> None:
    """Write deterministic local response-quality scores."""

    report = score_eval_dataset(dataset, responses, scored_at=scored_at)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(report, indent=2, ensure_ascii=False, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _expected_source_present(eval_case: dict[str, object], response: dict[str, object]) -> bool:
    expected_source_id = eval_case.get("expectedSourceId")
    source_ids = response.get("sourceIds", [])
    return isinstance(source_ids, list) and expected_source_id in source_ids


def _citation_requirement_met(eval_case: dict[str, object], response: dict[str, object]) -> bool:
    if not eval_case.get("expectedCitationRequired"):
        return True

    expected_source_id = eval_case.get("expectedSourceId")
    citations = response.get("citations", [])
    return isinstance(citations, list) and any(
        isinstance(citation, dict) and citation.get("sourceId") == expected_source_id
        for citation in citations
    )


def _unsupported_marker_absent(response: dict[str, object]) -> bool:
    answer = response.get("answer", "")
    return isinstance(answer, str) and "UNSUPPORTED" not in answer.upper()


def _pass_fail(value: bool) -> str:
    return "pass" if value else "fail"


def _validate_score_inputs(dataset: dict[str, object], responses: dict[str, object]) -> None:
    if "datasetId" not in dataset:
        raise ValueError("dataset is missing datasetId")
    if "responseSetId" not in responses:
        raise ValueError("responses are missing responseSetId")
    if not isinstance(dataset.get("cases", []), list):
        raise ValueError("dataset cases must be a list")
    if not isinstance(responses.get("responses", []), list):
        raise ValueError("responses must be a list")


def _response_by_case_id(responses: dict[str, object]) -> dict[object, dict[str, object]]:
    response_by_case_id: dict[object, dict[str, object]] = {}
    for response in responses.get("responses", []):
        if not isinstance(response, dict):
            raise ValueError("response must be an object")
        if "caseId" not in response:
            raise ValueError("response is missing caseId")
        response_by_case_id[response["caseId"]] = response
    return response_by_case_id
