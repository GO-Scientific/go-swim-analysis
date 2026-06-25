# Swim Analysis Notebook Suite

This folder contains a sequenced notebook workflow for preparing Apple Watch workout exports, preparing USA Swimming race results, and then using those prepared tables for linear analysis and statistical modeling.

## Expected structure

```text
project/
  data/
    csv/
      usa-swim-race-results.csv
    raw/
      go-swim-export.json
    processed/
      clean_workouts.csv
      weekly_training.csv
      clean_race_results.csv
      race_best_times.csv
      race_meet_summary.csv
      race_event_summary.csv
      workout_physiology_metrics.csv
      weekly_physiology_metrics.csv
      weekly_load_phase_patterns.csv
```

## Notebook sequence

1. `01_swim_data_ingestion_and_cleaning.ipynb`
   - Reads the real GoSwim JSON export from `data/raw/go-swim-export.json`.
   - Builds CSV-style workout rows and weekly training rows.
   - Writes `data/processed/clean_workouts.csv` and `data/processed/weekly_training.csv`.

2. `02_race_data_ingestion_and_cleaning.ipynb`
   - Reads the real USA Swimming CSV from `data/csv/usa-swim-race-results.csv`.
   - Standardizes race date, event, stroke, course, age, and time fields.
   - Writes race-ready tables under `data/processed`.

3. `03_initial_profile.ipynb`
   - Uses the project parser to profile the raw GoSwim export.
   - Reviews summary metrics, stroke rows, and correlations.

4. `04_linear_modeling.ipynb`
   - Reads prepared swim data directly from `data/processed`.
   - Models swim pace over time using linear, logarithmic, and exponential-style models.

5. `05_statistical_inference.ipynb`
   - Reads prepared swim data directly from `data/processed`.
   - Builds descriptive statistics, confidence intervals, hypothesis tests, and regression plots.

6. `06_race_analysis.ipynb`
   - Reads prepared swim and race data from `data/processed`.
   - Links race results to prior training windows and explores race-performance predictors.

7. `07_training_load_and_physiology.ipynb`
   - Reads prepared swim data and heart-rate summaries.
   - Estimates HR anchors, zones, LTHR proxy, zone load, and load-HR correlations.
   - Writes physiology-ready tables under `data/processed`.

8. `08_load_phase_pattern_analysis.ipynb`
   - Reads weekly physiology metrics.
   - Classifies loading, holding, unloading, recovery, and intensity-emphasis patterns.
   - Writes load-phase tables under `data/processed`.

## Run order

Run notebooks `01` and `02` first. Run notebook `07` before notebook `08`. The later notebooks expect their prepared CSV files to already exist in `data/processed`.
