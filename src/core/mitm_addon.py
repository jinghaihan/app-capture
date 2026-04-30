from __future__ import annotations

import hashlib
import json
import os
import time
from pathlib import Path

from mitmproxy import http


CONFIG = json.loads(Path(os.environ["APP_CAPTURE_MITM_CONFIG"]).read_text(encoding="utf-8"))
HOSTS = [item.lower() for item in CONFIG.get("hosts", [])]
PATHS = [item.lower() for item in CONFIG.get("paths", [])]
HTTP_LOG = Path(CONFIG["httpLog"])
WEBSOCKET_LOG = Path(CONFIG["websocketLog"])
BODIES_DIR = Path(CONFIG["bodiesDir"])

http_counter = 0
websocket_counter = 0


def is_interesting(flow: http.HTTPFlow) -> bool:
    if not HOSTS and not PATHS:
        return True

    host = (flow.request.host or "").lower()
    path = (flow.request.path or "").lower()

    return any(item in host for item in HOSTS) or any(item in path for item in PATHS)


def now() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")


def message_headers(message) -> list[list[str]]:
    return [[str(key), str(value)] for key, value in message.headers.items()]


def message_body(message) -> bytes:
    if message is None:
        return b""

    if message.raw_content is not None:
        return bytes(message.raw_content)

    if message.content is not None:
        return bytes(message.content)

    return b""


def write_body(name: str, content: bytes) -> dict:
    BODIES_DIR.mkdir(parents=True, exist_ok=True)
    path = BODIES_DIR / name
    path.write_bytes(content)

    return {
        "bodyPath": str(path.relative_to(BODIES_DIR.parent)),
        "bodySize": len(content),
        "bodySha256": hashlib.sha256(content).hexdigest(),
    }


def append_jsonl(path: Path, record: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, ensure_ascii=False) + "\n")


def log_capture_event(message: str) -> None:
    print(message, flush=True)


def response(flow: http.HTTPFlow) -> None:
    if not is_interesting(flow):
        return

    global http_counter
    http_counter += 1
    flow_id = http_counter

    request_body = write_body(f"http-{flow_id:06d}-request.bin", message_body(flow.request))
    response_body = write_body(f"http-{flow_id:06d}-response.bin", message_body(flow.response))

    record = {
        "type": "http",
        "ts": now(),
        "id": flow_id,
        "method": flow.request.method,
        "url": flow.request.pretty_url,
        "request": {
            "headers": message_headers(flow.request),
            **request_body,
        },
        "response": {
            "status": flow.response.status_code if flow.response else None,
            "headers": message_headers(flow.response) if flow.response else [],
            **response_body,
        },
    }

    append_jsonl(HTTP_LOG, record)
    log_capture_event(f"[app-capture-http] {record['method']} {record['response']['status']} {record['url']}")


def error(flow: http.HTTPFlow) -> None:
    if not is_interesting(flow):
        return

    global http_counter
    http_counter += 1
    flow_id = http_counter
    request_body = write_body(f"http-{flow_id:06d}-request.bin", message_body(flow.request))

    append_jsonl(HTTP_LOG, {
        "type": "http_error",
        "ts": now(),
        "id": flow_id,
        "method": flow.request.method,
        "url": flow.request.pretty_url,
        "error": str(flow.error),
        "request": {
            "headers": message_headers(flow.request),
            **request_body,
        },
    })
    log_capture_event(f"[app-capture-http-error] {flow.request.method} {flow.request.pretty_url} {flow.error}")


def websocket_message(flow: http.HTTPFlow) -> None:
    if not is_interesting(flow) or not flow.websocket or not flow.websocket.messages:
        return

    global websocket_counter
    websocket_counter += 1
    message_id = websocket_counter
    message = flow.websocket.messages[-1]
    content = message.content

    if isinstance(content, str):
        body = content.encode("utf-8")
    else:
        body = bytes(content)

    direction = "client_to_server" if message.from_client else "server_to_client"
    body_info = write_body(f"ws-{message_id:06d}-{direction}.bin", body)

    record = {
        "type": "websocket_message",
        "ts": now(),
        "id": message_id,
        "url": flow.request.pretty_url,
        "direction": direction,
        "opcode": str(getattr(message, "type", "")),
        **body_info,
    }

    append_jsonl(WEBSOCKET_LOG, record)
    log_capture_event(f"[app-capture-ws] {direction} {record['bodySize']}b {record['url']}")
