# go swim analysis

Notebook project and Firebase-ready visualization app for analyzing Apple Watch recorded workout exports and USA Swimming race results.

## Live App

The web app is live at [https://go-swim-analysis.web.app](https://go-swim-analysis.web.app/).

## Current Data

Real input data lives here:

- `data/raw/go-swim-export.json`
- `data/csv/usa-swim-race-results.csv`

Prepared notebook data is written to `data/processed/` by the ingest notebooks.

## Notebook Flow

Run the ingest notebooks first:

```bash
jupyter notebook notebooks/01_swim_data_ingestion_and_cleaning.ipynb
jupyter notebook notebooks/02_race_data_ingestion_and_cleaning.ipynb
```

Then use the analysis notebooks, which read prepared files directly from `data/processed`:

- `notebooks/03_initial_profile.ipynb`
- `notebooks/04_linear_modeling.ipynb`
- `notebooks/05_statistical_inference.ipynb`
- `notebooks/06_race_analysis.ipynb`
- `notebooks/07_training_load_and_physiology.ipynb`
- `notebooks/08_load_phase_pattern_analysis.ipynb`

## Build App Data

Build derived app datasets and the initial report:

```bash
python scripts/build_analysis.py
```

The static app lives under `app/public` and reads generated data from `app/public/data`.

## Dependencies

```bash
python -m pip install -r requirements.txt
```
