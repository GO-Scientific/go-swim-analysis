# Analysis Expectations

## Purpose

This report records the expectations going into the analysis. It is useful because it separates the questions and hypotheses from the results. That makes it easier to avoid forcing the data to fit a story after the fact.

## Main expectations

| Area | Expected pattern | Why this seemed reasonable |
|---|---|---|
| Training volume | Weekly distance would rise and fall in phases. | Swim training often includes build weeks, easier weeks, and meet weeks. |
| Training consistency | Most weeks would include several practices. | The dataset covers a competitive swimmer with regular training. |
| Heart rate | Higher-load weeks would usually have more high-heart-rate time. | Longer or harder work should often create more cardiovascular demand. |
| Race performance | Current race times would be closer to best times in some events than others. | Different events develop at different rates depending on training focus and age. |
| Stroke profile | Freestyle would make up the largest share of training distance. | Freestyle is commonly used for aerobic volume and general conditioning. |
| Loading phases | Loading, holding, unloading, and recovery patterns would be visible at the weekly level. | Weekly totals should show enough variation to classify broad training patterns. |

## Mathematical expectations

Several formulas were expected to help translate raw records into interpretable metrics.

### Pace

Pace converts distance and time into a standard comparison.

```text
pace_sec_per_100m = swim_time_sec / distance_m * 100
```

Expected interpretation:

> Lower pace values mean faster swimming, but comparisons are strongest when stroke, course, and workout type are similar.

### Weekly volume

Weekly volume groups workout distance by week.

```text
weekly_distance_km = sum(distance_m) / 1000
```

Expected interpretation:

> Higher weekly distance usually means greater training volume, but volume alone does not describe intensity.

### Heart-rate intensity

Heart-rate reserve intensity estimates effort using a low active heart-rate proxy and observed maximum heart rate.

```text
HRR_intensity = (avg_hr - active_low_hr_proxy) / (observed_hr_max - active_low_hr_proxy)
```

Expected interpretation:

> This should help compare workouts, but it is only a proxy because the data does not include a true lab-tested max HR or resting HR.

### Acute/chronic load ratio

The acute/chronic ratio compares recent load to a longer baseline.

```text
ACR = acute_load_2w / chronic_load_6w
```

Expected interpretation:

> Values above 1 suggest recent load is higher than the longer baseline. Values below 1 suggest reduced load.

## Statistical expectations

The project expected to use AP Statistics ideas in a practical way:

| Statistical idea | Expected use |
|---|---|
| One-variable summaries | Describe workout distance, pace, heart rate, and race time distributions. |
| Two-variable relationships | Compare training load with heart-rate and race-performance metrics. |
| Correlation | Measure the direction and strength of relationships. |
| Regression | Estimate trends while checking residuals and limitations. |
| Observational-data caution | Avoid claiming causation from training and race history alone. |

## Expected limitations

The analysis was expected to have several important limits:

1. The data comes from one athlete.
2. Race conditions vary by meet, pool, event, taper, and season.
3. Heart-rate data from wearable devices can be noisy.
4. Training-load formulas are project-specific proxies.
5. Some variables, such as true resting heart rate or lab-tested lactate threshold, are not directly measured.

## Expected outcome

The goal was not only to produce numbers. The expected outcome is a full analysis workflow:

1. Start with raw data.
2. Clean and standardize it.
3. Define metrics.
4. Write formulas.
5. Implement formulas in code.
6. Inspect outputs.
7. Interpret results carefully.
8. Explain what the data can and cannot support.
