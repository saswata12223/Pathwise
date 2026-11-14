from django.urls import path

from planner import views

urlpatterns = [
    path("api/health/", views.health, name="health"),
    path("api/auth/csrf/", views.csrf_token, name="csrf-token"),
    path("api/auth/me/", views.current_user, name="current-user"),
    path("api/auth/register/", views.register, name="register"),
    path("api/auth/login/", views.login, name="login"),
    path("api/auth/logout/", views.logout, name="logout"),
    path("api/profile/", views.profile, name="profile"),
    path("api/dashboard/", views.dashboard, name="dashboard"),
    path("api/scan-syllabus/", views.scan_syllabus, name="scan-syllabus"),
    path("api/career-roadmap/", views.career_roadmap, name="career-roadmap"),
]
