# 🌍 TripMind — AI-Powered Intelligent Travel Planning Assistant

A full-stack AI travel planner: FastAPI + MongoDB backend, a TF-IDF +
weighted-scoring recommendation engine, a rule-based (optionally LLM-powered)
itinerary generator, and a Bootstrap + Tailwind frontend with a dark "AI
Travel Canvas" design.

```
User Preferences → Preference Analysis → Destination Recommendation AI →
Destination Ranking → Budget Estimation → AI Itinerary Generator →
Personalized Travel Plan → Feedback → Preference Learning
```

---

## 1. Project structure

```
TripMind/
├── backend/
│   ├── main.py                  FastAPI app entrypoint
│   ├── requirements.txt
│   ├── .env.example             copy → .env and edit
│   ├── database/mongodb.py      Mongo connection + collections
│   ├── models/                  Pydantic request/response schemas
│   ├── routes/                  auth, users, recommendations, itinerary, feedback, admin
│   ├── ai/
│   │   ├── recommender.py       TF-IDF + weighted scoring + feedback learning
│   │   └── itinerary_generator.py   rule-based generator (+ optional LLM hook)
│   ├── utils/
│   │   ├── security.py          JWT + password hashing
│   │   └── budget.py            cost breakdown engine
│   └── seed/
│       ├── seed_admin.py        seeds your admin account on startup
│       └── seed_destinations.py seeds 12 starter destinations
│
└── frontend/
    ├── index.html                landing + login / sign-up
    ├── planner.html              trip preference form
    ├── recommendations.html      ranked destination matches
    ├── itinerary.html            day-by-day vertical timeline
    ├── dashboard.html            user stats + travel personality
    ├── admin.html                admin login + management panel
    ├── css/ (style.css, animations.css)
    └── js/  (api.js, auth.js, planner.js, recommendations.js,
              itinerary.js, dashboard.js, admin.js)
```

---

## 2. Backend setup

**Requirements:** Python 3.10+, MongoDB running locally (or a connection
string to a remote cluster).

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env              # then edit .env if needed
```

Your `.env` already contains the admin credentials you gave me:

```
ADMIN_EMAIL=giritharand3@gmail.com
ADMIN_PASSWORD=Admin@123
```

**⚠️ Security note:** don't commit your real `.env` to a public repo, and
change this password after your first login — it's in plaintext in the
example file only so the project works out of the box for your demo/viva.

Start MongoDB (if it isn't already running):

```bash
mongod --dbpath /path/to/your/data/db
```

Run the API:

```bash
uvicorn main:app --reload --port 8000
```

On first startup the backend automatically:
- Creates indexes
- Seeds your **admin account** into the `Admins` collection (password is
  bcrypt-hashed — never stored in plaintext)
- Seeds 12 starter destinations into the `Destinations` collection (Munnar,
  Coorg, Wayanad, Ooty, Goa, Manali, Jaipur, Rishikesh, Andaman Islands,
  Udaipur, Darjeeling, Hampi)

Check it's alive: open **http://localhost:8000/docs** for interactive
Swagger docs, or **http://localhost:8000/health**.

---

## 3. Frontend setup

The frontend is plain HTML/CSS/JS — no build step. Just serve the folder:

```bash
cd frontend
python3 -m http.server 5500
```

Then open **http://localhost:5500** in your browser.
(`js/api.js` points at `http://localhost:8000` by default — change
`API_BASE` there if your backend runs elsewhere.)

---

## 4. Using the app

1. **Plan a trip** → fill in budget/days/interests → get ranked matches
   with AI match scores.
2. **Build My Trip** on any match → generates a day-by-day itinerary with
   a vertical timeline, cost breakdown, and a **🔄 Change** button per
   activity (re-plans just that day, not the whole trip).
3. **Rate the trip** on the itinerary page — this feeds the feedback-learning
   loop so future recommendations for that user are nudged toward
   categories they've rated highly (see `ai/recommender.py::_feedback_boost`).
4. **Dashboard** → trips planned, destinations explored, avg AI match, and
   a "travel personality" breakdown built from your feedback history.
5. **Admin panel** (`admin.html`) → log in with your admin credentials to
   see platform stats, view registered users, and add/remove destinations
   without touching MongoDB directly.

---

## 5. Admin login

```
URL:      admin.html
Email:    giritharand3@gmail.com
Password: Admin@123
```

This account is (re-)seeded automatically every time the backend starts,
using whatever is in `ADMIN_EMAIL` / `ADMIN_PASSWORD` in your `.env`. To
change the admin password later, just update `.env` and restart the server
— the seed script will refresh the stored hash.

---

## 6. How the AI layers work

**Layer 1 — Destination Recommendation** (`ai/recommender.py`)
- TF-IDF vectorizes each destination's categories/activities/food/style
  and compares it to the user's interests via cosine similarity (0–40 pts)
- Adds rule-based scores for budget fit (0–20), duration fit (0–15),
  travel-style match (0–15), and season match (0–10)
- Applies a feedback boost (±10) from the user's `Travel_Feedback` history
  — this is the "preference learning" loop
- Final score is a 0–100 match percentage

**Layer 2 — Itinerary Generation** (`ai/itinerary_generator.py`)
- Default: deterministic rule-based generator that spreads a destination's
  activity list across Morning/Afternoon/Evening slots per day, with cost
  computed by `utils/budget.py`
- Optional: set `USE_LLM=true` in `.env` plus either `OPENAI_API_KEY` or a
  local Ollama server (`OLLAMA_URL` / `OLLAMA_MODEL`) to have an LLM write
  the itinerary instead — it automatically falls back to the rule-based
  generator if the LLM call fails, so the app never breaks in a demo.

**Budget AI** (`utils/budget.py`) — splits daily cost into Accommodation
(30%) / Food (22%) / Activities (20%) / Local Transport (13%) / Transport
(10%) / Emergency Buffer (5%), and scales down to fit under the traveler's
budget cap when needed.

---

## 7. Extending the project

- Add more destinations via the admin panel, or bulk-insert into
  `backend/seed/seed_destinations.py`.
- Swap TF-IDF for `sentence-transformers` embeddings in `recommender.py`
  if you want denser semantic matching (heavier dependency, needs a model
  download).
- Wire up the "Smart Weather/Condition-based Activity Suggestions" feature
  from the original spec by calling a weather API before
  `generate_itinerary()` and filtering out outdoor activities on rainy days.
- Add JWT refresh tokens / rate limiting before deploying publicly.

---

## 8. Tech stack

| Layer | Technology |
|---|---|
| Frontend | HTML, JavaScript, Bootstrap 5, Tailwind CSS |
| Backend | Python, FastAPI |
| Database | MongoDB |
| Recommendation AI | scikit-learn (TF-IDF + cosine similarity) + weighted rules |
| Generative AI | Rule-based generator, optional Ollama/OpenAI LLM |
| Auth | JWT (python-jose) + bcrypt (passlib) |
