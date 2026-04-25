"""
PromptOS Quality Benchmark
The real question: does the assembled prompt actually give an AI more to work with?

Measures:
  - Word count expansion (raw → assembled)
  - Section coverage (how many of the 7 structured sections are filled)
  - Specificity score (Gemini's own rating of the output)
  - Vagueness reduction (are gaps filled with inferred context?)
  - Side-by-side diff summary
"""

import asyncio
import time
import httpx
import re

BASE = "http://localhost:8000"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxODA4NjQxMTE3LCJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDAiLCJlbWFpbCI6ImRldkBleGFtcGxlLmNvbSIsInJvbGUiOiJhdXRoZW50aWNhdGVkIn0.oMzu3WUbEmZ_8SrYWm20Evo2LXn85VfPerllkd5Jq0I"
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

SECTIONS = ["## Task", "## Context", "## Reproduction", "## Expected", "## Actual", "## Prior Attempts", "## Request"]

BENCHMARKS = [
    {
        "label": "Vague bug: 'my app crashes'",
        "raw": "my app crashes",
        "mode": "mid",
        "answers": ["Bug fix", "TypeError: Cannot read properties of undefined reading 'token'", "src/components/LoginForm.tsx"],
    },
    {
        "label": "Vague feature: 'add dark mode'",
        "raw": "add dark mode",
        "mode": "mid",
        "answers": ["New feature", "Toggle in the navbar", "Persist with localStorage, use Tailwind dark: classes"],
    },
    {
        "label": "Vague refactor: 'clean up my code'",
        "raw": "clean up my code",
        "mode": "mid",
        "answers": ["Refactor", "utils/helpers.ts — lots of duplicated fetch logic", "Extract into reusable hooks, keep TypeScript types"],
    },
    {
        "label": "Specific bug (should need fewer questions)",
        "raw": "TypeError: Cannot read properties of undefined reading 'user' in Dashboard.tsx line 42 after upgrading to React 18",
        "mode": "mid",
        "answers": ["Bug fix", "After React 18 upgrade, user object is undefined on first render", "Tried adding optional chaining but it breaks the type"],
    },
    {
        "label": "Skip mode: instant assembly",
        "raw": "add input validation to the registration form",
        "mode": "skip",
        "answers": [],
    },
]


def analyze_quality(raw: str, assembled: str) -> dict:
    raw_words = len(raw.split())
    assembled_words = len(assembled.split())
    expansion = round(assembled_words / max(raw_words, 1), 1)

    sections_present = [s for s in SECTIONS if s.lower().replace("## ", "") in assembled.lower()]
    section_coverage = len(sections_present)

    # Check for placeholder values (unfilled gaps)
    placeholders = len(re.findall(r'\bN/A\b|Unknown|Unclear|None stated|unspecified', assembled, re.IGNORECASE))

    # Check for inferred content (model filled gaps itself)
    inferred = len(re.findall(r'\blikely\b|\binferred\b|\bprobably\b|\bassume\b|\btypically\b|\bstandard\b', assembled, re.IGNORECASE))

    # Actionability: does the Request section have a measurable success criterion?
    request_section = ""
    if "## Request" in assembled:
        request_section = assembled.split("## Request")[-1].strip()
    has_success_criterion = bool(re.search(r'so that|without breaking|success when|ensure|verify|confirm', request_section, re.IGNORECASE))

    return {
        "raw_words": raw_words,
        "assembled_words": assembled_words,
        "expansion": expansion,
        "section_coverage": section_coverage,
        "sections_present": sections_present,
        "placeholders": placeholders,
        "inferred_gaps": inferred,
        "has_success_criterion": has_success_criterion,
        "request_preview": request_section[:120] if request_section else "",
    }


async def run_session(client: httpx.AsyncClient, bench: dict) -> dict:
    raw = bench["raw"]
    mode = bench["mode"]
    answers = bench["answers"]

    # Start
    r = await client.post(f"{BASE}/session/start", headers=HEADERS,
                          json={"raw_prompt": raw, "workspace_context": {}, "mode": mode})
    sid = r.json()["session_id"]

    # Init
    r = await client.post(f"{BASE}/session/message", headers=HEADERS,
                          json={"session_id": sid, "user_message": "_init_"})
    data = r.json()
    turns = 0

    # Answer loop
    for ans in answers:
        if data.get("done"):
            break
        r = await client.post(f"{BASE}/session/message", headers=HEADERS,
                              json={"session_id": sid, "user_message": ans})
        data = r.json()
        turns += 1

    assembled = data.get("assembled_prompt", "") if data.get("done") else ""
    scores = data.get("scores", {}) if data.get("done") else {}
    return {"assembled": assembled, "scores": scores, "turns": turns}


async def main():
    print("\n" + "="*70)
    print("  PromptOS Quality Benchmark — Does it produce a BETTER prompt?")
    print("="*70)

    results = []
    async with httpx.AsyncClient(timeout=60.0) as client:
        for bench in BENCHMARKS:
            print(f"\n{'─'*70}")
            print(f"  RAW:  \"{bench['raw']}\"")
            print(f"  MODE: {bench['mode']} | answers: {len(bench['answers'])}")
            print(f"{'─'*70}")

            t0 = time.time()
            try:
                result = await run_session(client, bench)
            except Exception as e:
                print(f"  ERROR: {e}")
                continue
            elapsed = round((time.time() - t0) * 1000)

            assembled = result["assembled"]
            scores = result["scores"]

            if not assembled:
                print(f"  ⚠  No assembled prompt returned (session didn't complete)")
                await asyncio.sleep(1)
                continue

            q = analyze_quality(bench["raw"], assembled)

            print(f"\n  EXPANSION:   {q['raw_words']} words → {q['assembled_words']} words  ({q['expansion']}x)")
            print(f"  SECTIONS:    {q['section_coverage']}/7 present: {[s.replace('## ','') for s in q['sections_present']]}")
            print(f"  PLACEHOLDERS (N/A / Unknown): {q['placeholders']}")
            print(f"  INFERRED GAPS (model filled): {q['inferred_gaps']}")
            print(f"  SUCCESS CRITERION in Request: {'✓' if q['has_success_criterion'] else '✗'}")
            if scores:
                print(f"  SPECIFICITY (Gemini self-rate): {scores.get('specificity_score')}/100")
                print(f"  TURNS SAVED:                    {scores.get('estimated_turns_saved')}")
            print(f"  TIME:        {elapsed}ms over {result['turns']+1} turns")

            print(f"\n  ── ASSEMBLED PROMPT ──────────────────────────────────────────")
            for line in assembled.split("\n"):
                print(f"  {line}")

            results.append({**bench, **q, "scores": scores, "elapsed": elapsed})
            await asyncio.sleep(1)

    # Summary table
    print(f"\n\n{'='*70}")
    print(f"  SUMMARY — Quality at a glance")
    print(f"{'='*70}")
    print(f"  {'Prompt':<42} {'Exp':>5} {'Sec':>4} {'Gaps':>5} {'Spec':>5} {'✓Req':>5}")
    print(f"  {'─'*42} {'─'*5} {'─'*4} {'─'*5} {'─'*5} {'─'*5}")
    for r in results:
        spec = r['scores'].get('specificity_score', '—') if r.get('scores') else '—'
        req = '✓' if r['has_success_criterion'] else '✗'
        print(f"  {r['label'][:42]:<42} {r['expansion']:>4}x {r['section_coverage']:>3}/7 {r['placeholders']:>5} {str(spec):>5} {req:>5}")

    print(f"\n  Exp = word expansion ratio")
    print(f"  Sec = structured sections filled")
    print(f"  Gaps = N/A / Unknown placeholders (lower = better)")
    print(f"  Spec = Gemini's own specificity rating")
    print(f"  ✓Req = has measurable success criterion in Request section")


asyncio.run(main())
