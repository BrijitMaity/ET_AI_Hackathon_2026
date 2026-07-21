import re
import math
from collections import Counter

# --- THE SAFETY CORPUS (Training Data) ---
# This simulates a massive database of safety regulations and historical logs.
CORPUS = [
    {
        "id": "OISD-105-4.3",
        "title": "OISD-105 Section 4.3 (Work Permit System)",
        "content": "Continuous gas monitoring must be explicitly transferred and logged during shift handovers for all confined space and hot work. Undetected gas leaks during the 17:30 - 18:00 handover window are a major vulnerability. Mandatory 15-minute overlap with dual-sign gas monitoring transfer protocol is required.",
        "tags": ["shift change", "gas", "monitoring", "handover", "permit", "oisd", "vulnerability"]
    },
    {
        "id": "FA-1948-36",
        "title": "Factory Act 1948 Section 36",
        "content": "Precautions against dangerous fumes. No person shall be required or allowed to enter any chamber, tank, vat, pit, pipe, flue or other confined space in any factory in which any gas, fume, vapour or dust is likely to be present to such an extent as to involve risk to persons being overcome thereby, unless it is provided with a manhole of adequate size or other effective means of egress. Re-entry gas testing is mandatory after any break exceeding 30 minutes.",
        "tags": ["confined space", "fumes", "gas", "factory act", "re-entry", "lunch"]
    },
    {
        "id": "FA-1948-35",
        "title": "Factory Act 1948 Section 35",
        "content": "Protection of eyes and personal protective equipment (PPE). Effective screens or suitable goggles shall be provided for the protection of persons employed in or in the immediate vicinity of the process. PPE compliance is strictly enforced. Violations during overtime shifts require automated alerts and mandatory checkpoints.",
        "tags": ["ppe", "helmet", "safety vest", "overtime", "factory act", "injury", "non-compliance"]
    },
    {
        "id": "DGMS-3-2019",
        "title": "DGMS Circular No. 3/2019",
        "content": "Guidelines on safety management in confined spaces. Atmospheric testing must be fresh and time-stamped. Assuming morning tests are valid after lunch breaks is a direct violation. The permit-to-work system must automatically suspend the permit if the zone is vacated.",
        "tags": ["confined space", "dgms", "testing", "permit", "lunch", "re-entry"]
    },
    {
        "id": "IS-2925",
        "title": "IS 2925 (Industrial Safety Helmets)",
        "content": "Specification for industrial safety helmets. Non-compliance correlates with a 3.2x increase in head injuries, especially during low-supervision windows like overtime. Vision AI detection of missing helmets requires immediate PA system alerts.",
        "tags": ["ppe", "helmet", "injury", "overtime", "vision", "ai"]
    },
    {
        "id": "OISD-137",
        "title": "OISD-137 (Scaffolding Safety)",
        "content": "Scaffolding must be inspected by a certified scaffolding supervisor before use. A 'Green Tag' must be displayed on the scaffold indicating it is safe for use. Safety harnesses are mandatory for work above 2.0 meters. Scaffolds erected near live electrical equipment require a special electrical clearance permit.",
        "tags": ["scaffolding", "tag", "harness", "height", "oisd"]
    },
    {
        "id": "LOTO-SOP-01",
        "title": "Standard Operating Procedure: Lockout/Tagout (LOTO)",
        "content": "Electrical safety and LOTO guidelines require that all energy sources be isolated, locked, and tagged before maintenance begins. Only the person who applied the lock may remove it. High-voltage work requires Arc Flash PPE and a secondary verification by the shift supervisor.",
        "tags": ["loto", "electrical", "lockout", "tagout", "voltage", "ppe"]
    },
    {
        "id": "HOT-WORK-01",
        "title": "Hot Work & Welding Compliance",
        "content": "Hot work permits are required for welding, cutting, or brazing. A dedicated fire watch must be present for the duration of the work and for 30 minutes after completion. Combustible materials within 35 feet must be removed or covered with fire-retardant blankets.",
        "tags": ["hot work", "welding", "fire", "permit", "combustible"]
    },
    {
        "id": "IS-2190",
        "title": "IS 2190: Selection, Installation and Maintenance of First-Aid Fire Extinguishers",
        "content": "A fire extinguisher is an active fire protection device used to extinguish or control small fires, often in emergency situations. It is not intended for use on an out-of-control fire. Portable fire extinguishers must be visually inspected monthly and subjected to a thorough maintenance check annually. The correct type of extinguisher (e.g., Water, Foam, Dry Powder, CO2) must be selected based on the specific class of fire risk in the zone.",
        "tags": ["fire", "extinguisher", "is 2190", "emergency", "maintenance", "co2", "powder"]
    }
]

def tokenize(text):
    text = text.lower()
    return re.findall(r'\b[a-z0-9]+\b', text)

# Pre-compute IDF (Inverse Document Frequency)
N = len(CORPUS)
df = Counter()
for doc in CORPUS:
    words = set(tokenize(doc['content']) + tokenize(doc['title']) + doc['tags'])
    for w in words:
        df[w] += 1

idf = {}
for w, count in df.items():
    idf[w] = math.log(N / (1 + count)) + 1 # +1 to avoid 0

def score_document(query, doc):
    q_tokens = tokenize(query)
    doc_text = doc['title'] + " " + doc['content'] + " " + " ".join(doc['tags'])
    d_tokens = tokenize(doc_text)
    
    d_tf = Counter(d_tokens)
    
    score = 0
    for q in q_tokens:
        if q in d_tf:
            tf = d_tf[q]
            score += tf * idf.get(q, 1.0)
            
    # Boost score if exact phrase matches in tags
    for tag in doc['tags']:
        if tag in query.lower():
            score += 15.0 # High boost for direct tag matching
            
    return score

def generate_response(query: str):
    """
    Simulates a highly accurate RAG response by scoring documents
    and synthesizing a formatted markdown response.
    """
    # 1. Retrieve
    scores = [(doc, score_document(query, doc)) for doc in CORPUS]
    scores.sort(key=lambda x: x[1], reverse=True)
    
    # Filter matches above a threshold
    top_matches = [d for d, s in scores if s > 0.5][:2]
    
    # 2. Generate (Synthesize)
    if not top_matches:
        return (
            "**Query Analysis:** No direct regulatory match found for your query in the immediate corpus.\n\n"
            "However, standard industrial safety principles dictate that you should:\n"
            "1. Halt any unsafe operations immediately.\n"
            "2. Consult your site-specific HSE manual.\n"
            "3. Raise a query with the shift supervisor for specialized clearance.\n\n"
            "*(Please provide more specific keywords regarding equipment, zone, or procedure).* "
        )
        
    primary = top_matches[0]
    
    response = f"### **Regulatory Analysis: {primary['title']}**\n\n"
    response += f"Based on the safety corpus, here is the verified protocol for your query:\n\n"
    
    # Format the content into a nice blockquote
    response += f"> {primary['content']}\n\n"
    
    if len(top_matches) > 1 and scores[1][1] > 2.0:
        secondary = top_matches[1]
        response += f"**Additional Corroborating Standard:**\n"
        response += f"- **{secondary['title']}**: {secondary['content'][:150]}...\n\n"
        
    response += "**Required Actions:**\n"
    response += "1. Enforce the guidelines exactly as stated in the cited regulation.\n"
    response += "2. Ensure all supervisors have signed off on the digital permit.\n"
    response += "3. Update the shift log with this regulatory check.\n"
    
    return response

if __name__ == "__main__":
    print(generate_response("What is the OISD standard for scaffolding?"))
