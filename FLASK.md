# Lyzius — Flask Application

Python rewrite of the Lyzius Travel & Tours workspace (itineraries + accounting).

## Quick start

```bash
pip install -r requirements.txt
python run.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000)

## Project structure

```
app/
  routes/          # HTTP blueprints (itineraries, accounting, API)
  templates/       # Jinja2 HTML (list, editor, accounting, PDF)
  static/
    css/main.css   # Design system (Cormorant Garamond + Source Sans 3)
    js/            # Vanilla JS (editor autosave, PDF export, accounting)
    images/
  models/          # SQLAlchemy models (SQLite by default)
  utils/           # Money math, dates, PDF page builder
run.py
requirements.txt
instance/          # SQLite database (created automatically)
```

## Features preserved

- **Itineraries**: create, list, search/filter, edit all form sections, status draft/ready, duplicate, delete, debounced autosave, live PDF preview, client-side PDF export (html2canvas + jsPDF).
- **Accounting**: client details, payables/receivables ledgers, net income snapshot, debounced save, PDF export, reset sheet.
- **Workspace tabs**: switch between Itineraries and Accounting without losing context.

## Data storage

SQLite database at `instance/lyzius.db`. Itinerary `form` is stored as JSON (same shape as the original React `localStorage` schema).

Set `DATABASE_URL` for another backend if needed.

## Typography

- Headings: **Cormorant Garamond**
- Body: **Source Sans 3**

## Legacy React app

The previous Vite/React SPA remains under `src/` for reference. The Flask app is the new primary runtime entry point via `run.py`.
