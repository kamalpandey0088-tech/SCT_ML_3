from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response

PREDICTION_COUNTER = Counter(
    "neuralpaw_predictions_total", 
    "Total predictions classified", 
    ["label"]
)

INFERENCE_LATENCY = Histogram(
    "neuralpaw_inference_seconds", 
    "Inference latency", 
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5]
)

ERROR_COUNTER = Counter(
    "neuralpaw_errors_total", 
    "Total application errors", 
    ["type"]
)

ACTIVE_REQUESTS = Gauge(
    "neuralpaw_active_requests", 
    "Number of concurrently active HTTP requests"
)

def get_metrics_response() -> Response:
    return Response(
        content=generate_latest(), 
        media_type=CONTENT_TYPE_LATEST
    )
