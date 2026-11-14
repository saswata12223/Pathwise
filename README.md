# Pathwise

A personal learning assistant built with React and Django. Pathwise turns an uploaded syllabus into a structured module roadmap and includes career planning, interview practice, a daily task list, and a focus timer.

Original repository note: `ASSESMENT FOR CSA3426_P`.

## Requirements

- Python 3.10+
- Node.js 20+

## Run locally

Install the frontend dependencies from the project root:

```powershell
npm install
```

In one terminal, install the Python dependencies and start Django:

```powershell
python -m pip install -r requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

In a second terminal at the project root, start React:

```powershell
npm run dev
```

Open the Vite URL (usually `http://localhost:5173`). Vite proxies `/api` requests to Django at `http://127.0.0.1:8000`.

## Syllabus uploads

Upload a text-based PDF or `.docx` file (up to 10 MB) from **My roadmap** or the dashboard. The API extracts readable text and uses syllabus headings to create a starter roadmap. Scanned/image-only PDFs need OCR before upload. Legacy `.doc` files are not supported.

## API

- `GET /api/health/` — service health
- `GET /api/dashboard/` — sample dashboard data
- `POST /api/scan-syllabus/` — multipart form upload with a `file` field
- `POST /api/career-roadmap/` — JSON body such as `{"career":"Product designer"}`

The roadmap extraction and career plans are deterministic starter features; they do not call an external AI service.

## Accounts and search

Use the **Log in** button to create an account or sign in. The profile button opens profile editing and logout. Accounts use Django's built-in user model and password hashing; run `python manage.py migrate` once before starting the API. Search is available from the top bar or with **Ctrl+K** / **⌘K** and filters the available pages, lessons, career paths, and interview prompts.
