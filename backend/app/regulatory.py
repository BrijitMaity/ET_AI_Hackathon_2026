import json
import os
import re
from typing import List, Dict

REG_PATH = os.path.join(os.path.dirname(__file__), "..", "regulations", "regulations.json")


def load_regulations() -> List[Dict]:
    path = os.path.normpath(REG_PATH)
    try:
        with open(path, "r", encoding="utf-8") as f:
            regs = json.load(f)
            return regs
    except Exception:
        return []


_REGS = load_regulations()


def _text_search(patterns: List[str], text: str) -> bool:
    txt = text.lower() if text else ""
    for p in patterns:
        if p.lower() in txt:
            return True
    return False


def check_compliance(event: Dict) -> Dict:
    """Deterministically map an event to relevant regulatory clauses.

    Returns matches and a simple compliance assessment.
    """
    matches = []
    text_fields = []
    # combine useful textual fields from event
    if isinstance(event.get("payload"), dict):
        payload = event.get("payload")
        for k in ("message", "note", "description"):
            if payload.get(k):
                text_fields.append(str(payload.get(k)))
        # include sensor id, camera, and asset
        for k in ("sensor_id", "camera", "asset", "source", "type"):
            if payload.get(k):
                text_fields.append(str(payload.get(k)))
        # include serialized detections
        if payload.get("detections"):
            text_fields.append(json.dumps(payload.get("detections")))
    else:
        text_fields.append(str(event))

    combined = " \n ".join(text_fields)

    for reg in _REGS:
        # keyword match
        kw = reg.get("keywords", [])
        if _text_search(kw, combined):
            matches.append({"id": reg.get("id"), "title": reg.get("title"), "severity": reg.get("severity")})
            continue
        # fallback: regex on rule text
        if re.search(r"\b(" + "|".join([re.escape(k) for k in kw]) + r")\b", combined, flags=re.I):
            matches.append({"id": reg.get("id"), "title": reg.get("title"), "severity": reg.get("severity")})

    # Simple compliance decision: non-empty matches + risk score => violation if risk >= threshold
    risk = 0.0
    try:
        if isinstance(event.get("risk"), dict):
            risk = float(event.get("risk").get("risk_score", 0.0))
    except Exception:
        risk = 0.0

    violations = []
    for m in matches:
        sev = m.get("severity", "medium")
        weight = {"critical": 0.9, "high": 0.7, "medium": 0.4, "low": 0.1}.get(sev, 0.4)
        if risk >= (weight * float(os.getenv("REG_VIOLATION_MULT", 0.5))):
            violations.append(m)

    return {"matches": matches, "violations": violations, "risk": risk}
