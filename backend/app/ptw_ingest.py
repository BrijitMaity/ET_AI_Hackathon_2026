from .neo4j_client import get_driver
import logging

logger = logging.getLogger(__name__)


def ingest_permit(permit: dict):
    """Ingest a Permit-to-Work JSON payload into Neo4j as Permit, Asset, Person nodes and relationships.

    Expected minimal payload structure:
    {
      "id": "PTW-123",
      "type": "HotWork",
      "issued_by": {"id": "u1", "name": "Alice"},
      "asset": {"id": "asset-42", "name": "Compressor"},
      "start": "2026-06-27T08:00:00Z",
      ...
    }
    """
    try:
        drv = get_driver()
        with drv.session() as session:
            # Merge permit node
            session.run(
                "MERGE (perm:Permit {id:$id}) SET perm += $props",
                id=permit.get("id"),
                props={k: v for k, v in permit.items() if k != "asset" and k != "issued_by"},
            )

            # Issued by person
            if permit.get("issued_by"):
                person = permit["issued_by"]
                session.run(
                    "MERGE (u:Person {id:$uid}) SET u += $props",
                    uid=person.get("id"),
                    props=person,
                )
                session.run(
                    "MATCH (u:Person {id:$uid}), (perm:Permit {id:$pid}) MERGE (u)-[:ISSUED]->(perm)",
                    uid=person.get("id"),
                    pid=permit.get("id"),
                )

            # Asset
            if permit.get("asset"):
                asset = permit["asset"]
                session.run(
                    "MERGE (a:Asset {id:$aid}) SET a += $props",
                    aid=asset.get("id"),
                    props=asset,
                )
                session.run(
                    "MATCH (perm:Permit {id:$pid}), (a:Asset {id:$aid}) MERGE (perm)-[:APPLIES_TO]->(a)",
                    pid=permit.get("id"),
                    aid=asset.get("id"),
                )

        return {"status": "ok"}
    except Exception:
        logger.exception("PTW ingest failed")
        return {"status": "error", "message": "ingest failed"}
