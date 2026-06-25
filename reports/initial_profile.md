# Initial Profile Report

## Purpose

This report gives the first high-level profile of the swim data before deeper modeling. It is meant to answer a basic question:

> What data do we have, how much of it is usable, and what early patterns can we see?

The project uses two main data sources:

| Source | Prepared file | Main use |
|---|---|---|
| Apple Watch workout export | `data/processed/workout_physiology_metrics.csv` | Full workout and heart-rate profile. |
| Cleaned workout table | `data/processed/clean_workouts.csv` | Core cleaned workout analysis table. |
| USA Swimming race results | `data/processed/clean_race_results.csv` | Race history, event trends, best times, and meet summaries. |

## Dataset size

| Dataset | Rows | Date range | Notes |
|---|---:|---|---|
| Full workout physiology table | 483 workouts | 2024-05-31 to 2026-06-17 | Includes heart-rate-derived workout metrics. |
| Cleaned workout table | 452 workouts | 2024-05-31 to 2026-06-17 | Filtered and standardized table used for core workout analysis. |
| Weekly workout summary | 104 weeks | 2024-05-27 to 2026-06-15 | Weekly distance, sessions, and pace summaries. |
| Weekly physiology summary | 107 weeks | 2024-05-27 to 2026-06-15 | Weekly load and heart-rate summaries. |
| Race result table | 453 races | 2018-09-16 to 2026-05-09 | Race history across events, courses, and meets. |
| Race event summary | 33 events | 2018 to 2026 | Event-level best and latest race information. |
| Meet summary | 173 meets | 2018 to 2026 | Meet-level grouping of race performances. |

The workout data is concentrated in the most recent two years. The race data covers a longer competitive history, which makes it useful for understanding long-term development.

## Workout profile

The full workout export contains about `1500.8 km` of total swimming distance, about `443.9 hours` of active swim time, and about `519.4 hours` of inferred rest or non-swimming elapsed time.

| Metric | Value |
|---|---:|
| Full workout rows | 483 |
| Cleaned core workout rows | 452 |
| Average workout distance | 3.1 km |
| Maximum workout distance | 9.144 km |
| Average workout duration | 119.7 minutes |
| Average heart rate | 139.4 bpm |
| Maximum observed heart rate | 208 bpm |
| Average pace | 58.99 seconds per 50 m |

The cleaned weekly training table shows an average of about `4.35 sessions per week` and about `14.2 km per week`. The largest week in the cleaned weekly table is about `28.6 km`.

## Stroke profile

The early stroke totals show freestyle as the largest training category by distance.

| Stroke | Distance km | Hours | Strokes | Pace per 50 m |
|---|---:|---:|---:|---:|
| Freestyle | 978.8 | 256.9 | 366,914 | 47.239 s |
| Kickboard | 186.0 | 76.7 | 3,739 | 74.186 s |
| Backstroke | 125.5 | 39.9 | 37,883 | 57.234 s |
| Breaststroke | 116.3 | 35.4 | 50,876 | 54.721 s |
| Butterfly | 71.0 | 16.6 | 29,432 | 42.226 s |
| Mixed | 20.3 | 15.7 | 7,476 | 138.641 s |
| Unknown | 3.0 | 1.0 | 533 | 61.848 s |

The stroke table should be interpreted as a training-profile summary, not as proof that one stroke is always faster or more important. Different strokes appear in different workout contexts.

## Race profile

The race dataset contains `453` race results across `33` event-course combinations and `173` meets. The earliest race in the table is from `2018-09-16`, and the latest race is from `2026-05-09`.

| Race metric | Value |
|---|---:|
| Race rows | 453 |
| Event-course summaries | 33 |
| Meets | 173 |
| Best-time rows | 33 |
| Earliest race | 2018-09-16 |
| Latest race | 2026-05-09 |

Recent examples from 2026 show several races close to the best recorded time for that event:

| Event | Latest time | Best time | Percent off best |
|---|---:|---:|---:|
| 50 FR SCY | 27.67 s | 27.65 s | 0.07% |
| 200 FR SCY | 128.12 s | 124.66 s | 2.78% |
| 200 BK SCY | 147.04 s | 143.56 s | 2.42% |

This suggests that some current performances are near the athlete's best historical marks, but interpretation still depends on meet context, event focus, taper, pool type, and training phase.

## Early correlations

These first correlations are descriptive only. They help identify relationships worth exploring, but they do not prove cause and effect.

| Relationship | Pearson r |
|---|---:|
| Workout distance vs average HR | 0.485 |
| Workout distance vs pace per 50 | -0.411 |
| Rest ratio vs pace per 50 | -0.566 |
| Average HR vs pace per 50 | -0.454 |
| Simple HR load vs pace per 50 | -0.419 |
| HR90 vs pace per 50 | -0.107 |

Because pace is measured in seconds, a lower pace value means faster swimming. Negative correlations with pace can therefore mean that the related variable tends to increase when speed improves, but this must be interpreted carefully.

## First interpretation

The initial profile supports three main observations:

1. The project has enough workout data to study weekly training patterns over about two years.
2. The race data is long enough to compare current performance against a multi-year race history.
3. Heart-rate data can support useful training-load and intensity proxies, but those proxies should not be treated as lab-tested physiology.

## Main caution

This is one athlete's observational dataset. It can show patterns and generate strong questions, but it cannot prove that one training pattern caused a specific race result.
