import pytest
import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient

# Mock SQLAlchemy and Model bundle loading
with patch("backend.main._init_models", return_value=None), \
     patch("backend.main.engine.begin", return_value=AsyncMock()):
    from backend.main import app

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c

def test_health_check_db_connected(client):
    # Test /health with mock success check
    with patch("backend.main.engine.connect") as mock_connect:
        mock_connect.return_value.__aenter__.return_value.execute = AsyncMock()
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["db_connected"] is True
        assert body["status"] == "ok"

def test_health_check_db_disconnected(client):
    # Test /health with database exception
    with patch("backend.main.engine.connect", side_effect=Exception("DB Down")):
        response = client.get("/health")
        assert response.status_code == 200
        body = response.json()
        assert body["db_connected"] is False
        assert body["status"] == "degraded"

def test_metrics_endpoint(client):
    response = client.get("/metrics")
    assert response.status_code == 200
    assert "neuralpaw_predictions_total" in response.text
