# F1 Race Performance Analysis using Machine Learning

## Overview

This project analyzes Formula 1 Bahrain Grand Prix 2024 race data using Python, data visualization techniques, and Machine Learning. The objective is to understand the factors influencing lap time performance and develop a predictive model for lap time estimation.

## Objective

* Analyze Formula 1 race data.
* Perform data cleaning and preprocessing.
* Visualize race performance metrics.
* Study the relationship between speed and lap times.
* Build a Machine Learning model to predict lap times.

## Technologies Used

* Python
* Pandas
* FastF1
* Matplotlib
* Seaborn
* Scikit-Learn

## Dataset

Race data was collected from the Bahrain Grand Prix 2024 using the FastF1 API. The dataset includes driver information, lap times, sector times, tyre compounds, tyre life, and speed measurements.

## Data Preprocessing

* Removed missing values.
* Converted lap and sector times into seconds.
* Filtered unusually slow laps (>120 seconds).
* Prepared data for machine learning analysis.

## Analysis & Visualizations

The project includes:

* Lap Time Distribution Analysis
* Tyre Compound Performance Analysis
* Sector Time Comparison
* Speed vs Lap Time Correlation Analysis
* Feature Importance Analysis

## Key Findings

### Correlation Analysis

A strong negative correlation (-0.7999) was observed between Speed Trap Speed (SpeedST) and Lap Time. This indicates that higher speeds are generally associated with lower lap times and improved race performance.

### Machine Learning Results

Random Forest Regressor Performance:

* Mean Absolute Error (MAE): 0.289 seconds
* R² Score: 0.986

The model achieved high prediction accuracy and explained approximately 98.6% of the variation in lap times.

### Feature Importance

The most influential factors affecting lap time were:

1. SpeedST (72.95%)
2. TyreLife (17.83%)
3. LapNumber (5.02%)

## Conclusion

The analysis shows that Speed Trap Speed and Tyre Life are the most significant factors influencing Formula 1 lap performance. The Random Forest model successfully predicted lap times with excellent accuracy, demonstrating the effectiveness of machine learning for motorsport performance analysis.

## Author

**Nivedhitha K**

GitHub: https://github.com/nivedell09-bit
