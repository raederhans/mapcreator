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


if __name__ == "__main__":
    unittest.main()
