from __future__ import annotations
import hmac
import secrets
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

def verify_password(plain: str, expected: str) -> bool:
    return hmac.compare_digest(plain.encode("utf-8"), expected.encode("utf-8"))

def _serializer(secret: str) -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(secret, salt="sih-dashboard-session")

def create_session_token(secret: str, max_age_s: int) -> str:
    # max_age enforced on verify; payload is opaque auth marker
    return _serializer(secret).dumps({"auth": True, "n": secrets.token_hex(8)})

def verify_session_token(token: str, secret: str, max_age_s: int) -> bool:
    try:
        data = _serializer(secret).loads(token, max_age=max_age_s)
    except (BadSignature, SignatureExpired):
        return False
    return bool(data.get("auth"))
