# PaddyScan — Web-Based Paddy Rice Harvest Time Classification System

> AI-powered web application that classifies paddy rice images into **Immature**, **Nearly Mature**, or **Ready for Harvest** — designed for Filipino smallholder farmers.

---

## Project Structure

```
paddy/
├── database/           Supabase/Postgres schema SQL
│   └── schema.sql
├── ml/                 Python CNN model (TensorFlow/Keras)
│   ├── model_config.py Shared constants (image size, class names, etc.)
│   ├── train.py        Training script (two-phase MobileNetV2 fine-tuning)
│   ├── predict.py      CLI inference script
│   ├── requirements.txt
│   └── dataset/        ← Place your dataset here (see below)
├── backend/            Python FastAPI REST API
│   ├── main.py         API routes & Supabase integration
│   ├── classifier.py   CNN model singleton wrapper
│   ├── supabase_client.py
│   ├── requirements.txt
│   └── .env.example
└── frontend/           React + TypeScript (Vite) web app
    ├── src/
    │   ├── components/ NavBar, ImageUploader, ResultCard, ClassificationHistory
    │   ├── pages/      HomePage, ClassifyPage, HistoryPage, AuthPage
    │   └── lib/        supabase.ts (client), api.ts (typed API calls)
    └── .env.example
```

---

## Setup Guide

### 0. Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.10 or 3.11 |
| Node.js | 18+ |
| A Supabase project | [supabase.com](https://supabase.com) |

---

### 1. Database — Supabase Schema

1. Log in to [app.supabase.com](https://app.supabase.com) and open your project.
2. Go to **SQL Editor** → **New Query**.
3. Paste the entire contents of `database/schema.sql` and click **Run**.
4. This creates:
   - `profiles` table (linked to Supabase Auth users)
   - `classifications` table (stores CNN predictions)
   - Row Level Security policies (per-farmer data isolation)
   - `rice-images` storage bucket with upload/read policies
   - `user_classification_summary` view (for dashboard stats)

---

### 2. ML Model — Dataset & Training

#### 2a. Prepare your dataset

Place your paddy maturity images inside `ml/dataset/` following this structure:

```
ml/dataset/
  train/
    Immature/           ← ~200+ JPEG/PNG images of immature paddy
    Nearly_Mature/      ← ~200+ images of nearly mature paddy
    Ready_for_Harvest/  ← ~200+ images of harvest-ready paddy
  val/
    Immature/
    Nearly_Mature/
    Ready_for_Harvest/
```

> **Recommended split**: 80% train / 20% val  
> **Minimum images per class**: 200 (more = better accuracy)

#### 2b. Install Python dependencies

```bash
cd paddy/ml
pip install -r requirements.txt
```

#### 2c. Train the model

```bash
python train.py
```

Training runs in **two phases**:
- **Phase 1** (20 epochs): Only the custom classification head is trained. MobileNetV2 base is frozen.
- **Phase 2** (30 epochs): Top layers of MobileNetV2 are fine-tuned at a very low learning rate.

The trained model is saved to:
- `ml/saved_model/paddy_cnn.keras` — Keras model (used by the backend)
- `ml/saved_model/paddy_cnn.tflite` — TFLite model (for edge/mobile deployment)
- `ml/saved_model/paddy_cnn_history.json` — Training metrics

Monitor progress with TensorBoard:
```bash
tensorboard --logdir ml/logs
```

#### 2d. Test the trained model (optional)

```bash
python predict.py path/to/your/test_image.jpg
```

---

### 3. Backend — FastAPI Server

#### 3a. Configure environment

```bash
cd paddy/backend
cp .env.example .env
```

Edit `.env` and fill in:
```env
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_role_key_here
MODEL_PATH=../ml/saved_model/paddy_cnn.keras
STORAGE_BUCKET=rice-images
ALLOWED_ORIGINS=http://localhost:5173
```

> Find your Supabase credentials in: **Dashboard → Settings → API**

#### 3b. Install dependencies

```bash
pip install -r requirements.txt
```

#### 3c. Start the server

```bash
uvicorn main:app --reload --port 8000
```

The API is now running at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

### 4. Frontend — React Web App

#### 4a. Configure environment

```bash
cd paddy/frontend
cp .env.example .env
```

Edit `.env`:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_API_BASE_URL=http://localhost:8000
```

> The Vite dev server also proxies `/api/*` to `localhost:8000` automatically.

#### 4b. Install dependencies and start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## End-to-End Flow

```
Farmer → takes rice photo → uploads to ClassifyPage
  → React sends FormData to POST /api/classify
  → FastAPI: validates image → runs CNN → uploads to Supabase Storage
  → Stores result in Supabase DB → returns JSON prediction
  → React displays ResultCard with label, confidence, harvest advice
  → History page shows all past scans
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/health` | Health check (no auth) |
| `POST` | `/api/classify` | Upload image → CNN prediction |
| `GET`  | `/api/classifications` | Paginated scan history |
| `GET`  | `/api/classifications/{id}` | Single result |
| `DELETE` | `/api/classifications/{id}` | Delete record + image |
| `GET`  | `/api/stats` | Aggregate farmer statistics |

All `/api/*` endpoints require `Authorization: Bearer <supabase_jwt>`.

---

## CNN Architecture

```
Input: (224, 224, 3)
  └─ MobileNetV2 (ImageNet pre-trained backbone)
       └─ GlobalAveragePooling2D
            └─ Dense(256) → BatchNorm → ReLU → Dropout(0.4)
                 └─ Dense(3, softmax)   ← Immature / Nearly Mature / Ready for Harvest
```

**Why MobileNetV2?**
- Lightweight (~3.4M params) — exportable to embedded hardware
- Excellent accuracy on domain-shifted datasets when fine-tuned
- TFLite export for future edge deployment (Raspberry Pi, OV2640 camera modules)

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, React Router v6 |
| Styling | Vanilla CSS (design tokens, no Tailwind) |
| Backend | Python 3.11, FastAPI, Uvicorn |
| ML | TensorFlow 2.x, Keras, MobileNetV2 |
| Database | Supabase (PostgreSQL + Row Level Security) |
| File Storage | Supabase Storage (S3-compatible) |
| Auth | Supabase Auth (email + password) |

---

## Low-Connectivity Considerations

- **Offline banner**: The app detects when the device goes offline and shows a clear warning.
- **Session persistence**: Supabase JWT is stored in `localStorage` — farmers stay logged in between sessions.
- **Minimal dependencies**: The frontend ships minimal JS. No heavy UI framework.
- **Image size limit**: 10 MB cap prevents large uploads on slow connections.
- **Optimistic UX**: The UI shows results immediately after the API responds — no unnecessary re-fetches.
