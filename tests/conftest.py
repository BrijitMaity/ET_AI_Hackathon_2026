import os
import sys

# Add the project root to sys.path so 'backend' module is resolvable
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Force SQLite and disable external DBs for all tests before any modules are imported
os.environ["USE_SQLITE"] = "1"
os.environ["DISABLE_NEO4J"] = "1"
