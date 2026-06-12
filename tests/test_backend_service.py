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
                    "intensityFields": {"channels": {"physicalAtlas": {"enabled": True}}},
                    "appearancePresets": {"byId": {"dark": {"id": "dark"}}},
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
            [
                "schemaVersion",
                "specialZoneLayers",
                "paintMode",
                "operationGraphics",
                "unitCounters",
                "appearancePresets",
                "intensityFields",
                "transportCountryOverlayState",
            ],
        )
        self.assertEqual(project["specialZoneLayers"], {"zones": []})
        self.assertEqual(project["operationGraphics"], [{"id": "op-1"}])
        self.assertEqual(project["unitCounters"], {"counters": []})
        self.assertEqual(project["appearancePresets"], {"byId": {"dark": {"id": "dark"}}})
        self.assertEqual(project["intensityFields"], {"channels": {"physicalAtlas": {"enabled": True}}})
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
        self.assertEqual(first_session["user"]["role"], "admin")
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

    def test_public_save_owner_route_is_owner_only(self) -> None:
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
        owner_save = self.service.get_save(str(owner["sessionId"]), str(save["id"]))
        public_save = self.service.get_community_save(str(save["id"]))
        downloaded = self.service.download_community_save(str(save["id"]))

        self.assertEqual(owner_save["project"]["schemaVersion"], 21)
        self.assertIn("referenceImageState", owner_save["project"])
        self.assertEqual(public_save["title"], "Shared draft")
        self.assertEqual(downloaded["save"]["project"]["schemaVersion"], 21)
        self.assertEqual(downloaded["save"]["project"]["paintMode"], "visual")
        self.assertNotIn("referenceImageState", downloaded["save"]["project"])
        self.assertNotIn("dynamicBordersDirty", downloaded["save"]["project"])
        self.assertNotIn("dynamicBordersDirtyReason", downloaded["save"]["project"])
        self.assertNotIn("__privateLocalProbe", downloaded["save"]["project"])
        with self.assertRaises(BackendError) as get_exc:
            self.service.get_save(str(stranger["sessionId"]), str(save["id"]))
        self.assertEqual(get_exc.exception.code, "save_not_found")
        with self.assertRaises(BackendError) as export_exc:
            self.service.export_save(str(stranger["sessionId"]), str(save["id"]))
        self.assertEqual(export_exc.exception.code, "save_not_found")

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

    def test_admin_overview_and_review_queue_are_limited_to_admin(self) -> None:
        admin = self._register("admin")
        member = self._register("member")
        save = self.service.create_save(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            {"title": "Reviewed save", "project": {"schemaVersion": 21}},
        )
        self.service.publish_save(str(admin["sessionId"]), str(admin["csrfToken"]), str(save["id"]), {"visibility": "public"})
        report = self.service.report_save(
            str(member["sessionId"]),
            str(member["csrfToken"]),
            str(save["id"]),
            {"reason": "other", "details": "needs review"},
        )

        with self.assertRaises(BackendError) as member_exc:
            self.service.admin_overview(str(member["sessionId"]))
        self.assertEqual(member_exc.exception.code, "admin_required")

        overview = self.service.admin_overview(str(admin["sessionId"]))
        self.assertEqual(overview["stats"]["users"], 2)
        self.assertEqual(overview["stats"]["openReports"], 1)
        save_counts = {item["username"]: item["saveCount"] for item in overview["users"]}
        self.assertEqual(save_counts["admin"], 1)
        self.assertEqual(save_counts["member"], 0)
        self.assertTrue(any(item["role"] == "admin" for item in overview["users"]))

        reviewed = self.service.admin_review_report(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(report["report"]["id"]),
        )
        self.assertEqual(reviewed["report"]["status"], "reviewed")
        self.assertEqual(self.service.admin_overview(str(admin["sessionId"]))["stats"]["openReports"], 0)

    def test_admin_can_hide_public_save(self) -> None:
        admin = self._register("admin")
        save = self.service.create_save(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            {"title": "Public save", "project": {"schemaVersion": 21}},
        )
        self.service.publish_save(str(admin["sessionId"]), str(admin["csrfToken"]), str(save["id"]), {"visibility": "public"})

        updated = self.service.admin_set_save_visibility(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(save["id"]),
            {"visibility": "private"},
        )

        self.assertEqual(updated["save"]["visibility"], "private")
        self.assertEqual(self.service.list_community_saves()["saves"], [])

    def test_admin_can_preview_other_users_private_save(self) -> None:
        admin = self._register("admin")
        member = self._register("member")
        private_save = self.service.create_save(
            str(member["sessionId"]),
            str(member["csrfToken"]),
            {
                "title": "Private moderation target",
                "project": {"schemaVersion": 21, "referenceImageState": {"private": True}},
            },
        )

        preview = self.service.admin_get_save(str(admin["sessionId"]), str(private_save["id"]))

        self.assertEqual(preview["title"], "Private moderation target")
        self.assertEqual(preview["project"]["referenceImageState"]["private"], True)

    def test_admin_manages_comments_images_users_and_demo_seed(self) -> None:
        admin = self._register("admin")
        member = self._register("member")
        seeded = self.service.admin_seed_demo(str(admin["sessionId"]), str(admin["csrfToken"]))
        self.assertEqual(len(seeded["created"]), 3)
        self.assertEqual(len(self.service.list_community_saves()["saves"]), 3)

        save = self.service.create_save(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            {
                "title": "Moderated save",
                "imageUrl": "/backend/assets/demo-plains.svg",
                "project": {"schemaVersion": 21},
            },
        )
        self.service.publish_save(str(admin["sessionId"]), str(admin["csrfToken"]), str(save["id"]), {"visibility": "public"})
        comment = self.service.add_comment(
            str(member["sessionId"]),
            str(member["csrfToken"]),
            str(save["id"]),
            {"body": "needs a look"},
        )

        closed = self.service.admin_set_save_comments(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(save["id"]),
            {"enabled": False},
        )
        self.assertFalse(closed["save"]["commentsEnabled"])
        with self.assertRaises(BackendError) as comment_exc:
            self.service.add_comment(
                str(member["sessionId"]),
                str(member["csrfToken"]),
                str(save["id"]),
                {"body": "closed"},
            )
        self.assertEqual(comment_exc.exception.code, "comments_closed")

        hidden = self.service.admin_hide_comment(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(comment["comment"]["id"]),
        )
        self.assertEqual(hidden["comment"]["status"], "hidden")
        image = self.service.admin_set_save_image(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(save["id"]),
            {"imageUrl": ""},
        )
        self.assertEqual(image["save"]["imageUrl"], "")

        updated_user = self.service.admin_update_user(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(member["user"]["id"]),
            {"role": "moderator", "status": "banned"},
        )
        self.assertEqual(updated_user["user"]["role"], "moderator")
        self.assertEqual(updated_user["user"]["status"], "banned")
        with self.assertRaises(BackendError) as banned_exc:
            self.service.current_session(str(member["sessionId"]))
        self.assertEqual(banned_exc.exception.code, "account_banned")

    def test_image_url_rejects_external_or_css_breakout_urls(self) -> None:
        session = self._register()
        session_id = str(session["sessionId"])
        csrf = str(session["csrfToken"])
        valid_urls = [
            "/backend/assets/demo-plains.svg",
            "http://localhost:8000/backend/assets/demo-plains.svg",
            "http://localhost./backend/assets/demo-plains.svg",
            "https://127.0.0.1:8000/backend/assets/demo-plains.svg",
            "http://[::1]:8000/backend/assets/demo-plains.svg",
        ]
        for image_url in valid_urls:
            save = self.service.create_save(
                session_id,
                csrf,
                {
                    "title": "Safe image",
                    "imageUrl": image_url,
                    "project": {"schemaVersion": 21},
                },
            )
            self.assertEqual(save["imageUrl"], image_url)

        rejected_urls = [
            "//evil.example/pixel.png",
            "http://localhost.evil.example/pixel.png",
            "http://localhost:bad/pixel.png",
            "http://localhost:8000.evil/pixel.png",
            "http://localhost/%0Afoo",
            "http://localhost/%5Cfoo",
            "http://localhost/%28foo%29",
            "http://%0A@127.0.0.1/pixel.png",
            "http://%5C@127.0.0.1/pixel.png",
            "http://%28@127.0.0.1/pixel.png",
            "http://127.0.0.1.evil.example/pixel.png",
            "http://127.0.0.1:8000.evil/pixel.png",
            "/backend/assets/%28demo%29.svg",
            "/backend/assets/demo-plains.svg');background-image:url('//evil.example/pixel')",
        ]
        for image_url in rejected_urls:
            with self.assertRaises(BackendError) as exc_info:
                self.service.create_save(
                    session_id,
                    csrf,
                    {
                        "title": "Unsafe image",
                        "imageUrl": image_url,
                        "project": {"schemaVersion": 21},
                    },
                )
            self.assertEqual(exc_info.exception.code, "invalid_image_url")

    def test_legacy_invalid_image_url_is_hidden_from_payloads(self) -> None:
        session = self._register()
        session_id = str(session["sessionId"])
        csrf = str(session["csrfToken"])
        save = self.service.create_save(
            session_id,
            csrf,
            {
                "title": "Legacy unsafe image",
                "imageUrl": "/backend/assets/demo-plains.svg",
                "project": {"schemaVersion": 21},
            },
        )
        self.service.publish_save(session_id, csrf, str(save["id"]), {"visibility": "public"})
        with self.service.store.connect() as connection:
            connection.execute(
                "UPDATE saves SET image_url = ? WHERE id = ?",
                ("//evil.example/pixel.png", str(save["id"])),
            )

        self.assertEqual(self.service.get_save(session_id, str(save["id"]))["imageUrl"], "")
        self.assertEqual(self.service.list_my_saves(session_id)["saves"][0]["imageUrl"], "")
        self.assertEqual(self.service.list_community_saves()["saves"][0]["imageUrl"], "")
        self.assertEqual(self.service.get_community_save(str(save["id"]))["imageUrl"], "")
        self.assertEqual(self.service.download_community_save(str(save["id"]))["save"]["imageUrl"], "")
        self.assertEqual(self.service.admin_get_save(session_id, str(save["id"]))["imageUrl"], "")

    def test_admin_cannot_remove_last_active_admin(self) -> None:
        admin = self._register("admin")
        with self.assertRaises(BackendError) as only_admin_exc:
            self.service.admin_update_user(
                str(admin["sessionId"]),
                str(admin["csrfToken"]),
                str(admin["user"]["id"]),
                {"role": "moderator"},
            )
        self.assertEqual(only_admin_exc.exception.code, "cannot_remove_last_admin")

        backup = self._register("backup")
        promoted = self.service.admin_update_user(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(backup["user"]["id"]),
            {"role": "admin"},
        )
        self.assertEqual(promoted["user"]["role"], "admin")
        demoted = self.service.admin_update_user(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(admin["user"]["id"]),
            {"role": "moderator"},
        )
        self.assertEqual(demoted["user"]["role"], "moderator")
        with self.assertRaises(BackendError) as backup_admin_exc:
            self.service.admin_update_user(
                str(backup["sessionId"]),
                str(backup["csrfToken"]),
                str(backup["user"]["id"]),
                {"role": "member"},
            )
        self.assertEqual(backup_admin_exc.exception.code, "cannot_remove_last_admin")

    def test_moderator_can_review_content_but_cannot_manage_users_or_seed(self) -> None:
        admin = self._register("admin")
        moderator = self._register("moderator")
        self.service.admin_update_user(
            str(admin["sessionId"]),
            str(admin["csrfToken"]),
            str(moderator["user"]["id"]),
            {"role": "moderator"},
        )
        moderator_session = self.service.login({"username": "moderator", "password": "correct horse"})

        self.assertIn("stats", self.service.admin_overview(str(moderator_session["sessionId"])))
        with self.assertRaises(BackendError) as update_exc:
            self.service.admin_update_user(
                str(moderator_session["sessionId"]),
                str(moderator_session["csrfToken"]),
                str(admin["user"]["id"]),
                {"status": "banned"},
            )
        self.assertEqual(update_exc.exception.code, "admin_required")
        with self.assertRaises(BackendError) as seed_exc:
            self.service.admin_seed_demo(str(moderator_session["sessionId"]), str(moderator_session["csrfToken"]))
        self.assertEqual(seed_exc.exception.code, "admin_required")


if __name__ == "__main__":
    unittest.main()
