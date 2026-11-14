import json

from django.test import Client, SimpleTestCase, TestCase
from django.contrib.auth import get_user_model

from django.test import override_settings


class CareerRoadmapTests(SimpleTestCase):
    def request_roadmap(self, career):
        return self.client.post(
            "/api/career-roadmap/",
            data=json.dumps({"career": career}),
            content_type="application/json",
        )

    def test_cybersecurity_roadmap_has_role_specific_stages(self):
        response = self.request_roadmap("Cybersecurity analyst")

        self.assertEqual(response.status_code, 200)
        self.assertIn("SIEM tools", response.json()["stages"][2]["title"])

    def test_ai_developer_roadmap_has_role_specific_stages(self):
        response = self.request_roadmap("AI developer")

        self.assertEqual(response.status_code, 200)
        self.assertIn("LLMs", response.json()["stages"][2]["title"])

    def test_custom_career_receives_a_general_roadmap(self):
        response = self.request_roadmap("Game developer")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["career"], "Game developer")
        self.assertEqual(len(response.json()["stages"]), 5)


class AccountApiTests(TestCase):
    def post_json(self, path, payload):
        return self.client.post(path, data=json.dumps(payload), content_type="application/json")

    def test_register_login_edit_profile_and_logout(self):
        response = self.post_json("/api/auth/register/", {
            "name": "Alex Morgan",
            "email": "alex@example.com",
            "password": "learning123",
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["user"]["name"], "Alex Morgan")

        response = self.post_json("/api/profile/", {
            "name": "Alex Rivera",
            "email": "alex.rivera@example.com",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["name"], "Alex Rivera")
        self.assertEqual(response.json()["user"]["email"], "alex.rivera@example.com")

        self.post_json("/api/auth/logout/", {})
        self.assertIsNone(self.client.get("/api/auth/me/").json()["user"])

        response = self.post_json("/api/auth/login/", {
            "email": "alex.rivera@example.com",
            "password": "learning123",
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["name"], "Alex Rivera")

    def test_duplicate_email_is_rejected(self):
        get_user_model().objects.create_user(
            username="alex@example.com",
            email="alex@example.com",
            password="learning123",
        )
        response = self.post_json("/api/auth/register/", {
            "name": "Another Alex",
            "email": "ALEX@example.com",
            "password": "learning123",
        })
        self.assertEqual(response.status_code, 400)

    def test_login_requires_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post(
            "/api/auth/login/",
            data=json.dumps({"email": "alex@example.com", "password": "learning123"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    @override_settings(ALLOWED_HOSTS=["testserver"])
    def test_profile_requires_authentication(self):
        response = self.post_json("/api/profile/", {"name": "Alex", "email": "alex@example.com"})
        self.assertEqual(response.status_code, 401)
