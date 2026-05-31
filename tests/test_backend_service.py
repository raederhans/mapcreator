from __future__ import annotations

import tempfile
from pathlib import Path
import unittest

from map_backend.errors import BackendError
from map_backend.service import BackendService


class BackendServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        self.service = BackendService(self.root)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def _register(self, username: str = "alice") -> dict[str, object]:
        return self.service.register({
            "username": username,
            "password": "correct horse",
            "displayName": username.title(),
        })

    def test_register_login_create_publish_comment_report_download_flow(self) -> None:
        session = self._register()
        session_id = str(session["sessionId"])
        csrf = str(session["csrfToken"])

        save = self.service.create_save(
            session_id,
            csrf,
            {
                "title": "Atlantic scenario",
                "description": "first cloud copy",
                "project": {"schemaVersion": 21, "paintMode": "visual"},
            },
        )
        self.assertEqual(save["title"], "Atlantic scenario")
        self.assertEqual(save["visibility"], "private")

        private_community = self.service.list_community_saves()
        self.assertEqual(private_community["saves"], [])

        published = self.service.publish_save(session_id, csrf, str(save["id"]), {"visibility": "public"})
        self.assertEqual(published["visibility"], "public")
        self.assertTrue(str(published["publishedAt"]))

        community = self.service.list_community_saves()
        self.assertEqual(len(community["saves"]), 1)
        self.assertEqual(community["saves"][0]["id"], save["id"])

        comment = self.service.add_comment(
            session_id,
            csrf,
            str(save["id"]),
            {"body": "Works locally."},
        )
        self.assertEqual(comment["comment"]["body"], "Works locally.")

        report = self.service.report_save(
            session_id,
            csrf,
            str(save["id"]),
            {"reason": "other", "details": "Local review queue smoke."},
        )
        self.assertEqual(report["report"]["status"], "open")

        downloaded = self.service.download_community_save(str(save["id"]))
        self.assertEqual(downloaded["save"]["project"]["schemaVersion"], 21)
        self.assertIn("community-mapcreator-save-", downloaded["filename"])

    def test_community_download_omits_local_only_project_fields(self) -> None:
        session = self._register()
        session_id = str(session["sessionId"])
        csrf = str(session["csrfToken"])
        save = self.service.create_save(
            session_id,
            csrf,
            {
                "title": "Shareable project",
                "project": {
                    "schemaVersion": 21,
                    "paintMode": "visual",
                    "specialZoneLayers": {"zones": []},
                    "operationGraphics": [{"id": "op-1"}],
                    "unitCounters": {"counters": []},
                    "transportCountryOverlayState": {"country": "JPN"},
                    "referenceImageState": {"dataUrl": "data:image/png;base64,private"},
                    "dynamicBordersDirty": True,
                    "dynamicBordersDirtyReason": "local-edit",
                    "__privateLocalProbe": "private",
                },
            },
        )
        self.service.publish_save(session_id, csrf, str(save["id"]), {"visibility": "public"})

        downloaded = self.service.download_community_save(str(save["id"]))
        project = downloaded["save"]["project"]

        self.assertEqual(project["schemaVersion"], 21)
        self.assertEqual(project["paintMode"], "visual")
        self.assertEqual(
            list(project.keys()),
            ["schemaVersion", "specialZoneLayers", "paintMode", "operationGraphics", "unitCounters", "transportCountryOverlayState"],
        )
        self.assertEqual(project["specialZoneLayers"], {"zones": []})
        self.assertEqual(project["operationGraphics"], [{"id": "op-1"}])
        self.assertEqual(project["unitCounters"], {"counters": []})
        self.assertEqual(project["transportCountryOverlayState"], {"country": "JPN"})
        self.assertNotIn("referenceImageState", project)
        self.assertNotIn("dynamicBordersDirty", project)
        self.assertNotIn("dynamicBordersDirtyReason", project)
        self.assertNotIn("__privateLocalProbe", project)

    def test_private_save_is_hidden_from_other_user(self) -> None:
        owner = self._register("owner")
        stranger = self._register("stranger")
        save = self.service.create_save(
            str(owner["sessionId"]),
            str(owner["csrfToken"]),
            {
                "title": "Private draft",
                "project": {"schemaVersion": 21},
            },
        )

        with self.assertRaises(BackendError) as exc_info:
            self.service.get_save(str(stranger["sessionId"]), str(save["id"]))

        self.assertEqual(exc_info.exception.code, "save_not_found")
        self.assertEqual(exc_info.exception.status, 404)

    def test_write_requires_matching_csrf_token(self) -> None:
        session = self._register()

        with self.assertRaises(BackendError) as exc_info:
            self.service.create_save(
                str(session["sessionId"]),
                "wrong-token",
                {
                    "title": "Rejected draft",
                    "project": {"schemaVersion": 21},
                },
            )

        self.assertEqual(exc_info.exception.code, "invalid_csrf")
        self.assertEqual(exc_info.exception.status, 403)

    def test_login_replaces_previous_session_and_logout_expires_access(self) -> None:
        first_session = self._register()
        second_session = self.service.login({
            "username": "alice",
            "password": "correct horse",
        })

        with self.assertRaises(BackendError) as exc_info:
            self.service.current_session(str(first_session["sessionId"]))
        self.assertEqual(exc_info.exception.code, "auth_required")

        self.assertEqual(
            self.service.current_session(str(second_session["sessionId"]))["user"]["username"],
            "alice",
        )
        self.service.logout(str(second_session["sessionId"]), str(second_session["csrfToken"]))
        with self.assertRaises(BackendError) as logout_exc:
            self.service.list_my_saves(str(second_session["sessionId"]))
        self.assertEqual(logout_exc.exception.code, "auth_required")

    def test_public_save_is_readable_by_other_user(self) -> None:
        owner = self._register("owner")
        stranger = self._register("stranger")
        save = self.service.create_save(
            str(owner["sessionId"]),
            str(owner["csrfToken"]),
            {
                "title": "Shared draft",
                "project": {
                    "schemaVersion": 21,
                    "paintMode": "visual",
                    "referenceImageState": {"dataUrl": "data:image/png;base64,private"},
                    "dynamicBordersDirty": True,
                    "dynamicBordersDirtyReason": "local-edit",
                    "__privateLocalProbe": "private",
                },
            },
        )

        self.service.publish_save(str(owner["sessionId"]), str(owner["csrfToken"]), str(save["id"]), {"visibility": "public"})
        public_save = self.service.get_save(str(stranger["sessionId"]), str(save["id"]))
        public_export = self.service.export_save(str(stranger["sessionId"]), str(save["id"]))

        self.assertEqual(public_save["project"]["schemaVersion"], 21)
        self.assertEqual(public_save["project"]["paintMode"], "visual")
        self.assertNotIn("referenceImageState", public_save["project"])
        self.assertNotIn("dynamicBordersDirty", public_save["project"])
        self.assertNotIn("dynamicBordersDirtyReason", public_save["project"])
        self.assertNotIn("__privateLocalProbe", public_save["project"])
        self.assertNotIn("__privateLocalProbe", public_export["save"]["project"])
        self.assertEqual(public_save["title"], "Shared draft")

    def test_invalid_write_payloads_return_contract_codes(self) -> None:
        session = self._register()
        session_id = str(session["sessionId"])
        csrf = str(session["csrfToken"])

        invalid_cases = [
            lambda: self.service.create_save(session_id, csrf, {"title": "Missing project"}),
            lambda: self.service.create_save(session_id, csrf, {"title": "", "project": {"schemaVersion": 21}}),
            lambda: self.service.create_save(session_id, csrf, {"title": "Bad project", "project": []}),
            lambda: self.service.create_save(session_id, csrf, {"title": ["bad"], "project": {"schemaVersion": 21}}),
        ]
        for action in invalid_cases:
            with self.assertRaises(BackendError):
                action()

        save = self.service.create_save(
            session_id,
            csrf,
            {"title": "Draft", "project": {"schemaVersion": 21}},
        )
        with self.assertRaises(BackendError) as visibility_exc:
            self.service.publish_save(session_id, csrf, str(save["id"]), {"visibility": "friends"})
        self.assertEqual(visibility_exc.exception.code, "invalid_visibility")

        self.service.publish_save(session_id, csrf, str(save["id"]), {"visibility": "public"})
        with self.assertRaises(BackendError) as comment_exc:
            self.service.add_comment(session_id, csrf, str(save["id"]), {"body": ""})
        self.assertEqual(comment_exc.exception.code, "invalid_comment")

        with self.assertRaises(BackendError) as report_exc:
            self.service.report_save(session_id, csrf, str(save["id"]), {"reason": "duplicate"})
        self.assertEqual(report_exc.exception.code, "invalid_report_reason")


if __name__ == "__main__":
    unittest.main()
