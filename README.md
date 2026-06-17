# F1 AI/ML Analytics – Live Telemetry Dashboard

**Live Race Simulation · ML Predictions · Anomaly Detection**

**live sever link:**
https://nivedel109-bit.github.io/f1-race-analysis/

---

## Overview

Interactive F1 dashboard for the **2024 Bahrain Grand Prix** featuring:

- 🏎️ **Live Race Simulation** – 10 cars on a realistic circuit
- 📡 **Telemetry Charts** – Lap times, tyre degradation, sector analysis
- 🤖 **ML Model** – Random Forest with **R² = 0.9835**
- ⚠️ **Anomaly Detection** – Statistical outlier identification

---

## Key Results

| Metric | Value |
|--------|-------|
| R² Score | **0.9835** |
| MAE | 0.386s |
| RMSE | 0.532s |
| Laps Cleaned | 1,101 |
| Features | 13 |
| Anomalies | 40 |

**Top Features:** SectorBalance (67.5%), SpeedST (13.4%), TyreLife (9.7%)

**Fastest Driver:** VER – 96.56s avg lap time

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| FastF1 | F1 data access |
| Python / Pandas / NumPy | Data processing |
| Scikit-learn | Machine Learning |
| Matplotlib / Seaborn | Visualizations |
| Plotly.js / Chart.js | Interactive charts |
| HTML / CSS / JS | Dashboard |

---

## Installation

```bash
# Clone
git clone https://github.com/nivedell09-bit/f1-race-analysis.git
cd f1-race-analysis

# Install
pip install fastf1 pandas numpy scikit-learn matplotlib seaborn

# Run analysis
python f1_analysis.py
