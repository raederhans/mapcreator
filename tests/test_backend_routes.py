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

        rejected_logout = self._request("POST", "/api/backend/auth/logout", headers={"Cookie": session_cookie})
        self.assertEqual(rejected_logout.status, 403)
        self.assertEqual(rejected_logout.payload["code"], "invalid_csrf")

        logout_response = self._request(
            "POST",
            "/api/backend/auth/logout",
            headers={"Cookie": session_cookie, "X-MapCreator-CSRF": str(login.payload["csrfToken"])},
        )
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

    def test_admin_overview_report_review_and_save_visibility_routes(self) -> None:
        admin = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "admin",
                "password": "correct horse",
                "displayName": "Admin",
            },
        )
        admin_cookie = dict(admin.headers)["Set-Cookie"].split(";", 1)[0]
        admin_csrf = str(admin.payload["csrfToken"])
        member = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "member",
                "password": "correct horse",
                "displayName": "Member",
            },
        )
        member_cookie = dict(member.headers)["Set-Cookie"].split(";", 1)[0]
        member_csrf = str(member.payload["csrfToken"])
        save_response = self._request(
            "POST",
            "/api/backend/saves",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"title": "Admin save", "project": {"schemaVersion": 21}},
        )
        save_id = str(save_response.payload["save"]["id"])
        self._request(
            "POST",
            f"/api/backend/saves/{save_id}/publish",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"visibility": "public"},
        )
        report = self._request(
            "POST",
            f"/api/backend/community/saves/{save_id}/reports",
            headers={"Cookie": member_cookie, "X-MapCreator-CSRF": member_csrf},
            payload={"reason": "other", "details": "review this"},
        )
        report_id = str(report.payload["report"]["id"])

        member_overview = self._request("GET", "/api/backend/admin/overview", headers={"Cookie": member_cookie})
        self.assertEqual(member_overview.status, 403)
        self.assertEqual(member_overview.payload["code"], "admin_required")

        overview = self._request("GET", "/api/backend/admin/overview", headers={"Cookie": admin_cookie})
        self.assertEqual(overview.status, 200)
        self.assertEqual(overview.payload["stats"]["openReports"], 1)

        reviewed = self._request(
            "POST",
            f"/api/backend/admin/reports/{report_id}/review",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={},
        )
        self.assertEqual(reviewed.status, 200)
        self.assertEqual(reviewed.payload["report"]["status"], "reviewed")

        hidden = self._request(
            "POST",
            f"/api/backend/admin/saves/{save_id}/visibility",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"visibility": "private"},
        )
        self.assertEqual(hidden.status, 200)
        self.assertEqual(hidden.payload["save"]["visibility"], "private")

    def test_public_save_owner_routes_reject_other_users_and_admin_can_preview_private(self) -> None:
        admin = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "admin",
                "password": "correct horse",
                "displayName": "Admin",
            },
        )
        admin_cookie = dict(admin.headers)["Set-Cookie"].split(";", 1)[0]
        admin_csrf = str(admin.payload["csrfToken"])
        member = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "member",
                "password": "correct horse",
                "displayName": "Member",
            },
        )
        member_cookie = dict(member.headers)["Set-Cookie"].split(";", 1)[0]
        member_csrf = str(member.payload["csrfToken"])
        save_response = self._request(
            "POST",
            "/api/backend/saves",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={
                "title": "Public owner-only save",
                "project": {"schemaVersion": 21, "referenceImageState": {"private": True}},
            },
        )
        save_id = str(save_response.payload["save"]["id"])
        self._request(
            "POST",
            f"/api/backend/saves/{save_id}/publish",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"visibility": "public"},
        )

        stranger_detail = self._request("GET", f"/api/backend/saves/{save_id}", headers={"Cookie": member_cookie})
        stranger_export = self._request("GET", f"/api/backend/saves/{save_id}/export", headers={"Cookie": member_cookie})
        community_download = self._request("GET", f"/api/backend/community/saves/{save_id}/download")
        admin_preview = self._request("GET", f"/api/backend/admin/saves/{save_id}", headers={"Cookie": admin_cookie})

        self.assertEqual(stranger_detail.status, 404)
        self.assertEqual(stranger_export.status, 404)
        self.assertNotIn("referenceImageState", community_download.payload["save"]["project"])
        self.assertEqual(admin_preview.status, 200)
        self.assertTrue(admin_preview.payload["save"]["project"]["referenceImageState"]["private"])

        private_save = self._request(
            "POST",
            "/api/backend/saves",
            headers={"Cookie": member_cookie, "X-MapCreator-CSRF": member_csrf},
            payload={"title": "Private staff preview", "project": {"schemaVersion": 21}},
        )
        private_id = str(private_save.payload["save"]["id"])
        private_admin_preview = self._request(
            "GET",
            f"/api/backend/admin/saves/{private_id}",
            headers={"Cookie": admin_cookie},
        )
        self.assertEqual(private_admin_preview.status, 200)
        self.assertEqual(private_admin_preview.payload["save"]["title"], "Private staff preview")

    def test_admin_moderation_routes_cover_comments_users_images_and_seed(self) -> None:
        admin = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "admin",
                "password": "correct horse",
                "displayName": "Admin",
            },
        )
        admin_cookie = dict(admin.headers)["Set-Cookie"].split(";", 1)[0]
        admin_csrf = str(admin.payload["csrfToken"])
        member = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "member",
                "password": "correct horse",
                "displayName": "Member",
            },
        )
        member_cookie = dict(member.headers)["Set-Cookie"].split(";", 1)[0]
        member_csrf = str(member.payload["csrfToken"])
        seeded = self._request(
            "POST",
            "/api/backend/admin/demo/seed",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={},
        )
        self.assertEqual(seeded.status, 201)
        self.assertEqual(len(seeded.payload["created"]), 3)

        save_response = self._request(
            "POST",
            "/api/backend/saves",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={
                "title": "Moderated save",
                "imageUrl": "/backend/assets/demo-plains.svg",
                "project": {"schemaVersion": 21},
            },
        )
        save_id = str(save_response.payload["save"]["id"])
        self._request(
            "POST",
            f"/api/backend/saves/{save_id}/publish",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"visibility": "public"},
        )
        comment = self._request(
            "POST",
            f"/api/backend/community/saves/{save_id}/comments",
            headers={"Cookie": member_cookie, "X-MapCreator-CSRF": member_csrf},
            payload={"body": "visible comment"},
        )
        comment_id = str(comment.payload["comment"]["id"])

        comments_closed = self._request(
            "POST",
            f"/api/backend/admin/saves/{save_id}/comments",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"enabled": False},
        )
        self.assertEqual(comments_closed.status, 200)
        self.assertFalse(comments_closed.payload["save"]["commentsEnabled"])

        invalid_image = self._request(
            "POST",
            f"/api/backend/admin/saves/{save_id}/image",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"imageUrl": "//evil.example/pixel.png"},
        )
        self.assertEqual(invalid_image.status, 400)
        self.assertEqual(invalid_image.payload["code"], "invalid_image_url")

        image_cleared = self._request(
            "POST",
            f"/api/backend/admin/saves/{save_id}/image",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"imageUrl": ""},
        )
        self.assertEqual(image_cleared.status, 200)
        self.assertEqual(image_cleared.payload["save"]["imageUrl"], "")

        hidden_comment = self._request(
            "POST",
            f"/api/backend/admin/comments/{comment_id}/hide",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={},
        )
        self.assertEqual(hidden_comment.status, 200)
        self.assertEqual(hidden_comment.payload["comment"]["status"], "hidden")

        last_admin_demote = self._request(
            "POST",
            f"/api/backend/admin/users/{admin.payload['user']['id']}",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"role": "moderator"},
        )
        self.assertEqual(last_admin_demote.status, 400)
        self.assertEqual(last_admin_demote.payload["code"], "cannot_remove_last_admin")

        updated_user = self._request(
            "POST",
            f"/api/backend/admin/users/{member.payload['user']['id']}",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"role": "moderator", "status": "banned"},
        )
        self.assertEqual(updated_user.status, 200)
        self.assertEqual(updated_user.payload["user"]["role"], "moderator")
        self.assertEqual(updated_user.payload["user"]["status"], "banned")

    def test_moderator_routes_can_review_but_cannot_manage_users_or_seed_demo(self) -> None:
        admin = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "admin",
                "password": "correct horse",
                "displayName": "Admin",
            },
        )
        admin_cookie = dict(admin.headers)["Set-Cookie"].split(";", 1)[0]
        admin_csrf = str(admin.payload["csrfToken"])
        moderator = self._request(
            "POST",
            "/api/backend/auth/register",
            payload={
                "username": "moderator",
                "password": "correct horse",
                "displayName": "Moderator",
            },
        )
        moderator_user_id = str(moderator.payload["user"]["id"])
        self._request(
            "POST",
            f"/api/backend/admin/users/{moderator_user_id}",
            headers={"Cookie": admin_cookie, "X-MapCreator-CSRF": admin_csrf},
            payload={"role": "moderator"},
        )
        moderator_login = self._request(
            "POST",
            "/api/backend/auth/login",
            payload={"username": "moderator", "password": "correct horse"},
        )
        moderator_cookie = dict(moderator_login.headers)["Set-Cookie"].split(";", 1)[0]
        moderator_csrf = str(moderator_login.payload["csrfToken"])

        overview = self._request("GET", "/api/backend/admin/overview", headers={"Cookie": moderator_cookie})
        seed = self._request(
            "POST",
            "/api/backend/admin/demo/seed",
            headers={"Cookie": moderator_cookie, "X-MapCreator-CSRF": moderator_csrf},
            payload={},
        )
        user_update = self._request(
            "POST",
            f"/api/backend/admin/users/{admin.payload['user']['id']}",
            headers={"Cookie": moderator_cookie, "X-MapCreator-CSRF": moderator_csrf},
            payload={"status": "banned"},
        )

        self.assertEqual(overview.status, 200)
        self.assertEqual(seed.status, 403)
        self.assertEqual(user_update.status, 403)


if __name__ == "__main__":
    unittest.main()
