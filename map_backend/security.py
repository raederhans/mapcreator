from __future__ import annotations

from http.cookies import SimpleCookie
import base64
import hashlib
import hmac
import secrets


SESSION_COOKIE_NAME = "mapcreator_session"
PASSWORD_SCHEME = "pbkdf2_sha256"
PASSWORD_ITERATIONS = 260_000


def now_token() -> str:
    return secrets.token_urlsafe(32)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return ":".join(
        [
            PASSWORD_SCHEME,
            str(PASSWORD_ITERATIONS),
            base64.urlsafe_b64encode(salt).decode("ascii"),
            base64.urlsafe_b64encode(digest).decode("ascii"),
        ]
    )


def verify_password(password: str, password_hash: str) -> bool:
    try:
        scheme, raw_iterations, raw_salt, raw_digest = password_hash.split(":", 3)
        if scheme != PASSWORD_SCHEME:
            return False
        iterations = int(raw_iterations)
        salt = base64.urlsafe_b64decode(raw_salt.encode("ascii"))
        expected = base64.urlsafe_b64decode(raw_digest.encode("ascii"))
    except Exception:
        return False
    actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return hmac.compare_digest(actual, expected)


def read_cookie(raw_cookie: str, name: str) -> str:
    if not raw_cookie:
        return ""
    cookie = SimpleCookie()
    try:
        cookie.load(raw_cookie)
    except Exception:
        return ""
    morsel = cookie.get(name)
    return str(morsel.value or "").strip() if morsel else ""


def build_session_cookie(session_id: str, *, max_age: int, secure: bool = False) -> str:
    secure_part = "; Secure" if secure else ""
    return (
        f"{SESSION_COOKIE_NAME}={session_id}; Path=/; Max-Age={max_age}; "
        f"HttpOnly; SameSite=Strict{secure_part}"
    )


def expire_session_cookie() -> str:
    return f"{SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict"
