# 🐾 NeuralPaw — Cat vs Dog AI Classifier

> **Award-tier** full-stack ML web application. MobileNetV2 → PCA → SVM pipeline, FastAPI military-grade backend, React + Three.js + GSAP frontend.

---

## Project Structure

```
catdog-svm/
├── train_svm.py          # Phase 1: ML training pipeline
├── requirements.txt      # Python dependencies
├── Dockerfile            # Multi-stage production Docker image
├── test_main.py          # Backend integration tests
├── .env.example          # Backend environment template
│
├── backend/
│   ├── __init__.py
│   └── main.py           # Phase 2: FastAPI server
│
├── models/               # Generated after training
│   ├── scaler.pkl
│   ├── pca.pkl
│   └── svm.pkl
│
└── frontend/             # Phase 3: React + Three.js + GSAP
    ├── index.html
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    └── src/
        ├── App.tsx
        ├── main.tsx
        ├── index.css
        ├── types/index.ts
        ├── hooks/usePredict.ts
        └── components/
            ├── Navbar.tsx
            ├── HeroSection.tsx
            ├── NeuralNetCanvas.tsx   ← Three.js neural network
            ├── TextReveal.tsx        ← GSAP word reveal
            ├── UploadTerminal.tsx    ← Glassmorphism drag-drop
            ├── ScanAnimation.tsx     ← Laser scan
            └── ResultCard.tsx        ← Confetti + confidence ring
```

---

## Quick Start

### 1 — Train the Model

```bash
# Install Python deps
pip install -r requirements.txt

# Download Kaggle Dogs vs Cats dataset to ./data/train
# https://www.kaggle.com/competitions/dogs-vs-cats/data

# Full training run (GridSearchCV, auto-detect GPU)
python train_svm.py \
  --data_dir ./data/train \
  --output_dir ./models \
  --batch_size 64 \
  --n_jobs -1

# Fast smoke-test (skip GridSearchCV)
python train_svm.py --data_dir ./data/train --fast
```

### 2 — Start the Backend

```bash
# Dev server
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload

# Or with Docker
docker build -t catdog-api .
docker run -p 8000:8000 -v $(pwd)/models:/app/models catdog-api

# Run tests
pip install pytest httpx
pytest test_main.py -v
```

API docs: http://localhost:8000/docs

### 3 — Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Feature Extraction** | PyTorch MobileNetV2 (frozen, ImageNet) |
| **Dimensionality Reduction** | sklearn PCA (95% variance) |
| **Classifier** | sklearn SVC (RBF kernel, GridSearchCV) |
| **Backend** | FastAPI + Uvicorn + slowapi + Pydantic |
| **Frontend** | React 18 + TypeScript + Vite |
| **3D** | Three.js + @react-three/fiber + @react-three/drei |
| **Animation** | GSAP 3 + ScrollTrigger |
| **Scroll** | Lenis smooth scroll |
| **Styling** | Tailwind CSS v3 |

## Security Layers

1. **10 MB ASGI middleware cap** — fires before FastAPI routing
2. **CORS strict allowlist** — no wildcards
3. **Rate limit 5 req/min/IP** — slowapi
4. **Magic-number hex validation** — not file extension
5. **PIL integrity check** — rejects truncated/corrupt files
6. **Global sanitised error handler** — zero stack-trace leakage
