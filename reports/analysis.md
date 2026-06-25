# Analysis Report

## Summary

The analysis combines two main parts of the athlete's swimming history:

1. About two years of workout and heart-rate data.
2. A longer race-history dataset from 2018 through 2026.

The strongest finding is that the data can describe training patterns very well. It can show weekly load changes, heart-rate intensity patterns, race trends, and whether recent performances are close to historical bests. The data should be used carefully, though, because it is observational and comes from one athlete.

## Prepared analysis tables

| File | Purpose |
|---|---|
| `clean_workouts.csv` | Cleaned workout records for core training analysis. |
| `weekly_training.csv` | Weekly distance, sessions, and pace summaries. |
| `clean_race_results.csv` | Standardized race results. |
| `race_best_times.csv` | Best time for each event-course combination. |
| `race_event_summary.csv` | Event-level race history. |
| `workout_physiology_metrics.csv` | Workout-level heart-rate and load proxy metrics. |
| `weekly_physiology_metrics.csv` | Weekly load and heart-rate summaries. |
| `weekly_load_phase_patterns.csv` | Weekly loading, holding, unloading, recovery, and mixed labels. |

## Training findings

The cleaned weekly training table covers `104` weeks from `2024-05-27` through `2026-06-15`.

| Metric | Approximate result |
|---|---:|
| Average sessions per week | 4.35 |
| Average distance per week | 14.2 km |
| Maximum distance in one week | 28.6 km |
| Average workout distance | 3.1 km |
| Maximum workout distance | 9.144 km |

The training history shows regular weekly work with clear variation in load. That variation is important because it allows the project to classify weeks into different training phases.

## Heart-rate and physiology proxy findings

The physiology notebook created several heart-rate-derived anchors:

| Metric | Value |
|---|---:|
| Observed maximum heart rate | 208 bpm |
| Active low HR proxy | 67 bpm |
| LTHR proxy from average HR percentile | 152.85 bpm |

These values are useful for analysis inside this project, but they are not medical or lab-tested measurements.

The weekly physiology table covers `107` weeks. The average weekly combined load is about `2522` load points across the phase summary, but the phase averages vary a lot.

## LTHR zones and HR transition metrics

The physiology analysis now treats the inferred LTHR proxy as the primary zone anchor. Instead of relying only on percent of maximum heart rate, workout HR samples are interpreted relative to the athlete-specific threshold-like value:

```text
LTHR ratio = HR / LTHR_proxy
```

The default zone model is:

| Zone | LTHR ratio | Meaning in this project |
|---|---:|---|
| z1 | below 0.85 | lower/recovery HR relative to threshold proxy |
| z2 | 0.85-0.90 | moderate aerobic HR relative to threshold proxy |
| z3 | 0.90-0.95 | stronger aerobic / steady HR relative to threshold proxy |
| z4 | 0.95-1.00 | near-threshold HR relative to threshold proxy |
| z5 | 1.00-1.06 | above the inferred threshold proxy |
| z6 | above 1.06 | very high or sprint-like HR response relative to threshold proxy |

The broader physiology notebook also estimates HR transition behavior from raw HR samples and lap/segment timestamps:

| Metric | Interpretation |
|---|---|
| `avg_hr_rise_bpm` | Approximate HR increase after a lap or segment starts. |
| `avg_hr_rise_bpm_per_min` | Approximate speed of HR increase. |
| `avg_hr_drop_bpm` | Approximate HR decrease after a lap or segment ends. |
| `avg_hr_drop_bpm_per_min` | Approximate speed of HR recovery. |

These transition metrics are useful because fatigue or adaptation may not always appear as a higher average HR. It may also appear as a slower rise, slower drop, lower HR response, or reduced pace efficiency. These are still proxies, not clinical measurements.

## Load phase findings

The phase-pattern notebook classified weekly training as loading, holding, unloading, recovery, or mixed.

| Phase | Weeks | Average load | Average distance km | Average HR | Average ACR |
|---|---:|---:|---:|---:|---:|
| Loading | 22 | 3328.8 | 19.62 | 141.87 | 1.34 |
| Holding | 5 | 2943.7 | 14.72 | 141.16 | 1.02 |
| Mixed | 42 | 2609.6 | 15.61 | 141.00 | 1.04 |
| Unloading | 11 | 2001.7 | 12.71 | 142.04 | 0.85 |
| Recovery | 27 | 1080.4 | 7.42 | 133.62 | 0.75 |

The classification appears reasonable because loading weeks have higher average load and higher acute/chronic ratios, while recovery weeks have the lowest average load, distance, and heart rate.

## Load and heart-rate relationships

The strongest weekly relationship found was between total combined load and total near-max heart-rate minutes:

| Relationship | Correlation |
|---|---:|
| Total combined load vs total near-max minutes | 0.746 |
| Total simple HR load vs total active-zone minutes | 0.666 |
| Total zone-weighted load vs total active-zone minutes | 0.661 |
| Total duration vs total active-zone minutes | 0.618 |
| Total distance vs total active-zone minutes | 0.606 |

The strongest relationship makes sense because combined load includes a near-max component. The weaker relationships are still useful because they show that distance and duration alone do not fully explain heart-rate intensity.

## Correlation and distribution views

The full report now benefits from scatterplot-style and distribution-style analysis. Local PNG generation was not available in this environment because `matplotlib` is not installed, so the LaTeX report uses self-contained correlation tables and bar-style distribution summaries.

Key correlations from the weekly physiology data:

| Relationship | Pearson r | Weeks |
|---|---:|---:|
| Combined load vs near-max HR minutes | 0.746 | 107 |
| Distance vs near-max HR minutes | 0.374 | 107 |
| Combined load vs mean average HR | 0.367 | 106 |
| Distance vs mean pace per 50 m | -0.303 | 106 |
| Combined load vs mean pace per 50 m | -0.279 | 106 |
| Sample zone depth vs mean pace per 50 m | -0.465 | 106 |
| Combined load vs HR efficiency proxy | -0.295 | 106 |
| 14-day pre-race load vs race percent off best | 0.217 | 119 |

Distribution summaries added to the technical report include:

| Distribution | Main takeaway |
|---|---|
| Weekly combined load | Most weeks are moderate, with some much higher-load weeks. |
| Race percent off best | Race outcomes are widely spread because the dataset covers many ages, events, courses, and seasons. |
| Load by phase | Loading and holding weeks have higher load; recovery weeks have lower load. |

Matplotlib is now installed for the report-generation Python environment, so true scatterplot and distribution figures have been generated.

### Generated report figures

The report figures were generated in `SVG`, `PNG`, and `PDF` formats under `reports/figures/`. The SVG files are useful for web/Markdown viewing, PNG files are easy to preview, and PDF files are used by the LaTeX report.

| Figure | SVG | PNG | PDF |
|---|---|---|---|
| Combined load vs near-max HR minutes | `reports/figures/scatter_load_nearmax.svg` | `reports/figures/scatter_load_nearmax.png` | `reports/figures/scatter_load_nearmax.pdf` |
| Weekly distance vs pace | `reports/figures/scatter_distance_pace.svg` | `reports/figures/scatter_distance_pace.png` | `reports/figures/scatter_distance_pace.pdf` |
| 14-day pre-race load vs race percent off best | `reports/figures/scatter_prerace_load_performance.svg` | `reports/figures/scatter_prerace_load_performance.png` | `reports/figures/scatter_prerace_load_performance.pdf` |
| Weekly load distribution | `reports/figures/distribution_weekly_load.svg` | `reports/figures/distribution_weekly_load.png` | `reports/figures/distribution_weekly_load.pdf` |
| Race percent-off-best distribution | `reports/figures/distribution_race_percent_off_best.svg` | `reports/figures/distribution_race_percent_off_best.png` | `reports/figures/distribution_race_percent_off_best.pdf` |
| Weekly physiology correlation matrix | `reports/figures/correlation_matrix_weekly_physiology.svg` | `reports/figures/correlation_matrix_weekly_physiology.png` | `reports/figures/correlation_matrix_weekly_physiology.pdf` |
| Load by phase boxplot | `reports/figures/boxplot_load_by_phase.svg` | `reports/figures/boxplot_load_by_phase.png` | `reports/figures/boxplot_load_by_phase.pdf` |


## Race findings

The race dataset includes `453` results across `33` event-course combinations. The data shows a long development path from age 9 through age 16.

Recent races from May 2026 were close to best times in several events:

| Event | Latest time | Best time | Percent off best |
|---|---:|---:|---:|
| 50 FR SCY | 27.67 s | 27.65 s | 0.07% |
| 200 FR SCY | 128.12 s | 124.66 s | 2.78% |
| 200 BK SCY | 147.04 s | 143.56 s | 2.42% |

This suggests that the athlete was still racing near personal-best level in some events during the most recent season represented in the data.

## Overall interpretation

The data supports these cautious conclusions:

1. Training is consistent enough to study week-to-week load patterns.
2. Loading, recovery, unloading, and mixed phases can be identified from the weekly data.
3. Heart-rate metrics add important context beyond distance and duration.
4. Race results can be compared against long-term best times to show current competitiveness.
5. The strongest claims should remain descriptive because the project is based on one athlete's observational history.

## What the data does not prove

The data does not prove that a specific workout, phase, or training pattern caused a specific race result. It also does not provide clinical physiology measurements. The best use of the project is to describe patterns, generate questions, and support more careful future analysis.

### Short figure interpretations

| Graph | Most useful metric | Short interpretation |
|---|---|---|
| Weekly combined load vs near-max HR minutes | `r = 0.75` | Higher-load weeks usually had more near-max HR time, so the load metric captures intensity without being only a duplicate of near-max time. |
| Weekly distance vs mean pace per 50m | `r = -0.30` | Higher-distance weeks were somewhat associated with faster average pace because lower seconds per 50m means faster swimming, but volume alone does not explain pace. |
| 14-day pre-race load vs race percent off best | `r = 0.22` | Higher recent load was weakly associated with being farther from best time, but the relationship is small and race context still matters. |
| Distribution of weekly combined load | median about `2307` | Most weeks were moderate-load weeks, with a smaller number of very high-load weeks. |
| Distribution of race percent off best | median about `3.58%` | Race outcomes vary widely across ages, events, and courses, so races close to best time are meaningfully different from typical historical races. |
| Weekly physiology correlation matrix | strongest load-near-max relationship | Load, HR, pace, and efficiency are related but not interchangeable; near-max HR time is more connected to load than average HR alone. |
| Weekly load distribution by phase | median load by phase | Phase labels separate weeks sensibly: loading weeks tend to be higher-load, recovery weeks lower-load, and mixed/unloading weeks sit between them. |

## Additive finding: raw HR zone distribution

The physiology view now uses a raw-sample HR zone distribution instead of relying only on workout-average HR. This is important because average HR can hide interval structure. A workout with intense repeats and meaningful recovery may average lower than the actual work portions feel. The raw-sample distribution classifies each HR sample by the inferred LTHR proxy and summarizes time in Z1 through Z6. In the current prepared output, Z6 represents about 9,281 minutes, or 21.6% of classified HR sample time, so it should remain a separate high-intensity bucket instead of being folded into Z5.

This update makes the HR interpretation more useful for swim training because it preserves high-intensity exposure that would otherwise be diluted by rest periods.

## Additive finding: periodized training waves

The training view now includes a periodization score. The score combines rolling 4-week load amplitude, unload frequency, loading/unloading alternation, load variability, and a missing-data penalty. The current prepared output classifies the training pattern as moderate waves. This supports the interpretation that training was not flat; it rose and fell in repeated load patterns.

The score should be interpreted as a metric, not proof of intent. Some wave patterns can come from planned training, but others can come from meets, missed sessions, travel, school schedules, incomplete, or inaccurate data.

