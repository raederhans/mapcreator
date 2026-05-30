from __future__ import annotations

import tempfile
from pathlib import Path
import unittest

from map_backend.routes import handle_backend_request
from map_backend.security import SESSION_COOKIE_NAME


class BackendRoutesTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _request(self, method: str, route: str, *, headers=None, payload=None):
        return handle_backend_request(
            method,
            route,
            headers=headers or {},
            payload=payload,
            root=self.root,
        )

    def test_auth_cookie_save_publish_and_community_download_routes(self) -> None:
        registered = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "alice",
                "password": "correct horse",
                "displayName": "Alice",
            },
        )
        self.assertEqual(registered.status, 201)
        cookie_header = dict(registered.headers)["Set-Cookie"]
        session_cookie = cookie_header.split(";", 1)[0]
        self.assertTrue(session_cookie.startswith(f"{SESSION_COOKIE_NAME}="))
        csrf = str(registered.payload["csrfToken"])

        save_response = self._request(
            "POST",
            "/api/backend/saves",
            headers={"Cookie": session_cookie, "X-MapCreator-CSRF": csrf},
            payload={
                "title": "Published save",
                "project": {"schemaVersion": 21, "mapSemanticMode": "visual"},
            },
        )
        self.assertEqual(save_response.status, 201)
        save_id = str(save_response.payload["save"]["id"])

        publish_response = self._request(
            "POST",
            f"/api/backend/saves/{save_id}/publish",
            headers={"Cookie": session_cookie, "X-MapCreator-CSRF": csrf},
            payload={"visibility": "public"},
        )
        self.assertEqual(publish_response.status, 200)

        community_response = self._request("GET", "/api/backend/community/saves")
        self.assertEqual(community_response.status, 200)
        self.assertEqual(community_response.payload["saves"][0]["id"], save_id)

        download_response = self._request("GET", f"/api/backend/community/saves/{save_id}/download")
        self.assertEqual(download_response.status, 200)
        self.assertEqual(download_response.payload["save"]["project"]["schemaVersion"], 21)

    def test_missing_project_file_returns_structured_error(self) -> None:
        registered = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "alice",
                "password": "correct horse",
                "displayName": "Alice",
            },
        )
        session_cookie = dict(registered.headers)["Set-Cookie"].split(";", 1)[0]
        csrf = str(registered.payload["csrfToken"])
        save_response = self._request(
            "POST",
            "/api/backend/saves",
            headers={"Cookie": session_cookie, "X-MapCreator-CSRF": csrf},
            payload={
                "title": "Missing file save",
                "project": {"schemaVersion": 21},
            },
        )
        save_id = str(save_response.payload["save"]["id"])
        (self.root / ".runtime" / "backend" / "saves" / f"{save_id}.json").unlink()

        response = self._request(
            "GET",
            f"/api/backend/saves/{save_id}",
            headers={"Cookie": session_cookie},
        )

        self.assertEqual(response.status, 500)
        self.assertEqual(response.payload["code"], "save_payload_unavailable")

    def test_unknown_backend_route_returns_structured_404(self) -> None:
        response = self._request("GET", "/api/backend/missing")

        self.assertEqual(response.status, 404)
        self.assertEqual(response.payload["code"], "not_found")

    def test_login_me_logout_and_export_routes_preserve_cookie_contract(self) -> None:
        registered = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "alice",
                "password": "correct horse",
                "displayName": "Alice",
            },
        )
        first_cookie = dict(registered.headers)["Set-Cookie"].split(";", 1)[0]

        login = self._request(
            "POST",
            "/api/backend/auth/login",
            payload={
                "username": "alice",
                "password": "correct horse",
            },
        )
        self.assertEqual(login.status, 200)
        session_cookie = dict(login.headers)["Set-Cookie"].split(";", 1)[0]
        self.assertNotEqual(session_cookie, first_cookie)

        me_response = self._request("GET", "/api/backend/auth/me", headers={"Cookie": session_cookie})
        self.assertEqual(me_response.status, 200)
        self.assertEqual(me_response.payload["user"]["username"], "alice")

        save_response = self._request(
            "POST",
            "/api/backend/saves",
            headers={"Cookie": session_cookie, "X-MapCreator-CSRF": str(login.payload["csrfToken"])},
            payload={"title": "Export me", "project": {"schemaVersion": 21}},
        )
        save_id = str(save_response.payload["save"]["id"])
        export_response = self._request("GET", f"/api/backend/saves/{save_id}/export", headers={"Cookie": session_cookie})
        self.assertEqual(export_response.status, 200)
        self.assertEqual(export_response.payload["save"]["project"]["schemaVersion"], 21)

        logout_response = self._request("POST", "/api/backend/auth/logout", headers={"Cookie": session_cookie})
        self.assertEqual(logout_response.status, 200)
        self.assertIn("Max-Age=0", dict(logout_response.headers)["Set-Cookie"])

        expired_me_response = self._request("GET", "/api/backend/auth/me", headers={"Cookie": session_cookie})
        self.assertEqual(expired_me_response.status, 401)

    def test_community_comment_and_report_routes_require_session_and_csrf(self) -> None:
        registered = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "alice",
                "password": "correct horse",
                "displayName": "Alice",
            },
        )
        session_cookie = dict(registered.headers)["Set-Cookie"].split(";", 1)[0]
        csrf = str(registered.payload["csrfToken"])
        save_response = self._request(
            "POST",
            "/api/backend/saves",
            headers={"Cookie": session_cookie, "X-MapCreator-CSRF": csrf},
            payload={"title": "Commented save", "project": {"schemaVersion": 21}},
        )
        save_id = str(save_response.payload["save"]["id"])
        self._request(
            "POST",
            f"/api/backend/saves/{save_id}/publish",
            headers={"Cookie": session_cookie, "X-MapCreator-CSRF": csrf},
            payload={"visibility": "public"},
        )

        rejected = self._request(
            "POST",
            f"/api/backend/community/saves/{save_id}/comments",
            headers={"Cookie": session_cookie},
            payload={"body": "Missing csrf"},
        )
        self.assertEqual(rejected.status, 403)
        self.assertEqual(rejected.payload["code"], "invalid_csrf")

        comment = self._request(
            "POST",
            f"/api/backend/community/saves/{save_id}/comments",
            headers={"cookie": session_cookie, "x-mapcreator-csrf": csrf},
            payload={"body": "Works locally."},
        )
        self.assertEqual(comment.status, 201)
        self.assertEqual(comment.payload["comment"]["body"], "Works locally.")

        report = self._request(
            "POST",
            f"/api/backend/community/saves/{save_id}/reports",
            headers={"Cookie": session_cookie, "X-MapCreator-CSRF": csrf},
            payload={"reason": "other", "details": "Local report"},
        )
        self.assertEqual(report.status, 201)
        self.assertEqual(report.payload["report"]["status"], "open")

    def test_route_layer_rejects_non_string_user_input(self) -> None:
        response = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": ["alice"],
                "password": "correct horse",
                "displayName": "Alice",
            },
        )

        self.assertEqual(response.status, 400)
        self.assertEqual(response.payload["code"], "invalid_username")


if __name__ == "__main__":
    unittest.main()
