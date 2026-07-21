import os
import logging

logger = logging.getLogger(__name__)

try:
    from neo4j import GraphDatabase
    _neo4j_available = True
except ImportError:
    GraphDatabase = None
    _neo4j_available = False

_driver = None
_neo4j_failed = False


def get_driver():
    global _driver, _neo4j_failed
    # Allow tests and lightweight environments to disable Neo4j entirely
    if os.getenv("DISABLE_NEO4J", "0") == "1":
        if _driver:
            try:
                _driver.close()
            except Exception:
                pass
            _driver = None
        return None

    if not _neo4j_available or _neo4j_failed:
        return None
    if _driver is None:
        uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        user = os.getenv("NEO4J_USER", "neo4j")
        password = os.getenv("NEO4J_PASSWORD", "password")
        try:
            # We don't want to hang forever or throw massive errors if not available locally
            _driver = GraphDatabase.driver(uri, auth=(user, password), max_connection_lifetime=5)
            _driver.verify_connectivity()
        except Exception:
            logger.debug(f"Failed to connect to Neo4j at {uri}. Graph features will be gracefully disabled.")
            _driver = None
            _neo4j_failed = True
    return _driver


def ensure_schema():
    """Create basic uniqueness constraints for scaffold."""
    if os.getenv("DISABLE_NEO4J", "0") == "1":
        logger.info("DISABLE_NEO4J=1; skipping schema initialization")
        return

    if not _neo4j_available:
        logger.warning("Neo4j package not installed; skipping schema initialization")
        return
    try:
        drv = get_driver()
        if not drv:
            return
        with drv.session() as session:
            # Asset, Permit, Person unique ids
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (a:Asset) REQUIRE a.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (p:Permit) REQUIRE p.id IS UNIQUE")
            session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (u:Person) REQUIRE u.id IS UNIQUE")
    except Exception as e:
        logger.warning(f"Could not ensure Neo4j schema (continuing without graph features). Reason: {str(e)}")
