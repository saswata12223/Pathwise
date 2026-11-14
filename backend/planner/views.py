import re
from pathlib import Path
from zipfile import BadZipFile

from django.contrib.auth import authenticate, get_user_model, login as auth_login, logout as auth_logout
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from docx.opc.exceptions import PackageNotFoundError
from django.http import JsonResponse
from django.middleware.csrf import get_token
from pypdf.errors import PdfReadError
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST


def _json_error(message, status=400):
    return JsonResponse({"error": message}, status=status)


@require_GET
def health(request):
    return JsonResponse({"status": "ok"})


def _user_payload(user):
    return {
        "id": user.pk,
        "name": user.first_name or user.username,
        "email": user.email,
    }


@ensure_csrf_cookie
@require_GET
def csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_GET
def current_user(request):
    if not request.user.is_authenticated:
        return JsonResponse({"user": None})
    return JsonResponse({"user": _user_payload(request.user)})


@require_POST
def register(request):
    import json

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _json_error("Send a valid JSON request.")
    if not isinstance(payload, dict):
        return _json_error("Send a valid JSON object.")
    name = payload.get("name", "")
    email = payload.get("email", "")
    password = payload.get("password", "")
    if not isinstance(name, str) or not name.strip():
        return _json_error("Enter your name.")
    if not isinstance(email, str):
        return _json_error("Enter a valid email address.")
    email = email.strip().lower()
    if len(email) > 150:
        return _json_error("Email addresses must be 150 characters or fewer.")
    try:
        validate_email(email)
    except ValidationError:
        return _json_error("Enter a valid email address.")
    user_model = get_user_model()
    if user_model.objects.filter(email__iexact=email).exists():
        return _json_error("An account with this email already exists. Log in instead.")
    if not isinstance(password, str) or len(password) < 8:
        return _json_error("Choose a password with at least 8 characters.")
    user = user_model.objects.create_user(
        username=email,
        email=email,
        first_name=name.strip()[:150],
        password=password,
    )
    auth_login(request, user)
    return JsonResponse({"user": _user_payload(user)}, status=201)


@require_POST
def login(request):
    import json

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _json_error("Send a valid JSON request.")
    if not isinstance(payload, dict):
        return _json_error("Send a valid JSON object.")
    email = payload.get("email", "")
    password = payload.get("password", "")
    if not isinstance(email, str) or not isinstance(password, str):
        return _json_error("Enter your email and password.")
    user = authenticate(request, username=email.strip().lower(), password=password)
    if user is None:
        return _json_error("That email and password combination wasn’t recognized.", status=401)
    auth_login(request, user)
    return JsonResponse({"user": _user_payload(user)})


@require_POST
def logout(request):
    auth_logout(request)
    return JsonResponse({"user": None})


@require_POST
def profile(request):
    import json

    if not request.user.is_authenticated:
        return _json_error("Log in to edit your profile.", status=401)
    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _json_error("Send a valid JSON request.")
    if not isinstance(payload, dict):
        return _json_error("Send a valid JSON object.")
    name = payload.get("name")
    email = payload.get("email")
    if not isinstance(name, str) or not name.strip():
        return _json_error("Enter your name.")
    if not isinstance(email, str):
        return _json_error("Enter a valid email address.")
    email = email.strip().lower()
    if len(email) > 150:
        return _json_error("Email addresses must be 150 characters or fewer.")
    try:
        validate_email(email)
    except ValidationError:
        return _json_error("Enter a valid email address.")
    user_model = get_user_model()
    if user_model.objects.filter(email__iexact=email).exclude(pk=request.user.pk).exists():
        return _json_error("That email address is already associated with another account.")
    request.user.first_name = name.strip()[:150]
    request.user.email = email
    request.user.username = email
    request.user.save(update_fields=["first_name", "email", "username"])
    return JsonResponse({"user": _user_payload(request.user)})


@require_GET
def dashboard(request):
    return JsonResponse({
        "welcome": "Good morning, Alex",
        "streak": 7,
        "weekly_goal": {"completed": 8, "total": 12},
        "focus_minutes": 145,
        "next_up": [
            {"title": "Understand async JavaScript", "course": "Frontend development", "duration": "25 min", "color": "violet"},
            {"title": "Practice array methods", "course": "JavaScript fundamentals", "duration": "30 min", "color": "blue"},
            {"title": "Review your flashcards", "course": "Daily review", "duration": "10 min", "color": "mint"},
        ],
    })


def _extract_text(upload):
    suffix = Path(upload.name).suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader

        pages = PdfReader(upload).pages
        return "\n".join(page.extract_text() or "" for page in pages)
    if suffix in {".doc", ".docx"}:
        if suffix == ".doc":
            raise ValueError("Legacy .doc files are not supported yet. Save the document as .docx and try again.")
        from docx import Document

        document = Document(upload)
        paragraphs = [paragraph.text for paragraph in document.paragraphs]
        for table in document.tables:
            paragraphs.extend(cell.text for row in table.rows for cell in row.cells)
        return "\n".join(paragraphs)
    raise ValueError("Please upload a PDF or Word document (.docx).")


def _build_modules(text):
    lines = [re.sub(r"\s+", " ", line).strip(" \t•*-") for line in text.splitlines()]
    headings = []
    for line in lines:
        if not line or len(line) > 100:
            continue
        is_numbered = re.match(r"^(?:(?:week|unit|module|chapter|part)\s*)?\d{1,2}\s*[:.)\-]\s*\w", line, re.I)
        is_named_section = re.match(r"^(week|unit|module|chapter|part)\s+[ivx\d]+\b", line, re.I)
        is_short_title = len(line.split()) <= 8 and line[0].isupper() and not line.endswith((".", "?", ",", ";"))
        if is_numbered or is_named_section or is_short_title:
            cleaned = re.sub(r"^(?:(?:week|unit|module|chapter|part)\s*)?\d{1,2}\s*[:.)\-]\s*", "", line, flags=re.I)
            if cleaned and cleaned.lower() not in {item.lower() for item in headings}:
                headings.append(cleaned[:80])
        if len(headings) == 8:
            break
    if not headings:
        words = re.findall(r"[A-Za-z][A-Za-z'-]+", text)
        headings = [" ".join(words[index:index + 4]).title() for index in range(0, min(len(words), 24), 4)]
    return [
        {
            "title": title,
            "week": index + 1,
            "duration": "2.5 hours",
            "topics": ["Core concepts", "Guided practice", "Quick knowledge check"],
            "status": "in_progress" if index == 0 else "upcoming",
        }
        for index, title in enumerate(headings[:8])
    ]


@csrf_exempt
@require_POST
def scan_syllabus(request):
    upload = request.FILES.get("file")
    if not upload:
        return _json_error("Choose a syllabus file to upload.")
    if upload.size > 10 * 1024 * 1024:
        return _json_error("The file is too large. Maximum size is 10 MB.")
    try:
        text = _extract_text(upload)
    except (ValueError, ImportError, OSError, BadZipFile, PackageNotFoundError, PdfReadError) as exc:
        return _json_error(str(exc) or "We couldn't read this file. Try another PDF or .docx.")
    if not text.strip():
        return _json_error("No readable text found. If this is a scanned PDF, try an OCR-enabled version.")
    modules = _build_modules(text)
    return JsonResponse({
        "filename": upload.name,
        "course": Path(upload.name).stem.replace("_", " ").replace("-", " ").title(),
        "module_count": len(modules),
        "modules": modules,
    })


CAREER_PATHS = {
    "Product designer": ["Design foundations", "UX research", "Interaction design", "Prototyping & testing", "Portfolio & job search"],
    "Frontend developer": ["HTML & CSS", "JavaScript foundations", "React & component design", "Testing & accessibility", "Portfolio & interviews"],
    "Data analyst": ["Spreadsheets & statistics", "SQL fundamentals", "Python for analysis", "Visualization & storytelling", "Portfolio & interviews"],
    "UX researcher": ["Research methods", "Interview practice", "Synthesis & insights", "Research operations", "Portfolio & interviews"],
    "Cybersecurity analyst": ["Networking & Linux fundamentals", "Security principles & threat modeling", "SIEM tools & log analysis", "Incident response & hands-on labs", "Certifications & interview preparation"],
    "AI developer": ["Python & software foundations", "Machine learning fundamentals", "LLMs, prompting & retrieval", "Build and evaluate AI applications", "Deploy projects & prepare for interviews"],
    "Cloud engineer": ["Linux & networking foundations", "Cloud platform fundamentals", "Infrastructure as code", "Containers, deployment & monitoring", "Cloud projects & certifications"],
    "Backend developer": ["Programming & data structures", "APIs & backend frameworks", "Databases & data modeling", "Testing, security & deployment", "Portfolio & interviews"],
}


@csrf_exempt
@require_POST
def career_roadmap(request):
    import json

    try:
        payload = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return _json_error("Send a valid JSON request.")
    career = payload.get("career", "")
    if not isinstance(career, str) or not career.strip():
        return _json_error("Choose a career path.")
    career = career.strip()
    stages = CAREER_PATHS.get(career, [
        "Explore the fundamentals",
        "Build practical skills",
        "Create hands-on projects",
        "Develop your portfolio",
        "Prepare for interviews",
    ])
    return JsonResponse({
        "career": career,
        "duration": "16 weeks",
        "stages": [
            {
                "title": title,
                "week": f"Weeks {index * 3 + 1}–{16 if index == len(stages) - 1 else index * 3 + 3}",
            }
            for index, title in enumerate(stages)
        ],
    })
