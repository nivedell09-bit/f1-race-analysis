"""
F1 Race Performance Analysis - AI/ML Project
Complete Data Science Pipeline for Bahrain GP 2024
"""

# ============ PART 1: IMPORTS ============
import fastf1
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# Set style for beautiful plots
sns.set_theme(style='darkgrid')
plt.rcParams['figure.figsize'] = (10, 6)

# Create plots folder if it doesn't exist
import os
if not os.path.exists('plots'):
    os.makedirs('plots')

print("=" * 60)
print("F1 RACE PERFORMANCE ANALYSIS - BAHRAIN GP 2024")
print("=" * 60)

# ============ PART 2: DATA COLLECTION ============
print("\n📥 STEP 1: Loading F1 data...")

# Enable cache to avoid re-downloading
fastf1.Cache.enable_cache('f1_cache')

# Load Bahrain GP 2024 race session
session = fastf1.get_session(2024, 'Bahrain', 'R')
session.load()

# Get lap data
laps = session.laps
print(f"✅ Data loaded! Shape: {laps.shape}")
print(f"Columns available: {list(laps.columns)[:10]}...")

# ============ PART 3: DATA CLEANING ============
print("\n🧹 STEP 2: Cleaning data...")

# Keep only relevant columns
keep_cols = ['Driver', 'Team', 'LapNumber', 'LapTime', 'Sector1Time', 
             'Sector2Time', 'Sector3Time', 'Compound', 'TyreLife', 
             'SpeedI1', 'SpeedI2', 'SpeedFL', 'SpeedST']
laps = laps[keep_cols].copy()

rows_before = len(laps)

# Convert time columns to seconds
laps['LapTime_sec'] = laps['LapTime'].dt.total_seconds()
laps['S1_sec'] = laps['Sector1Time'].dt.total_seconds()
laps['S2_sec'] = laps['Sector2Time'].dt.total_seconds()
laps['S3_sec'] = laps['Sector3Time'].dt.total_seconds()

# Remove invalid laps
laps = laps[laps['LapTime_sec'].notna()]
laps = laps[laps['LapTime_sec'] <= 120]  # Remove laps > 120 seconds
laps = laps[laps['S1_sec'].notna() & laps['S2_sec'].notna() & laps['S3_sec'].notna()]

rows_after = len(laps)
print(f"Cleaned data: {rows_before} rows → {rows_after} rows")
print(f"Removed: {rows_before - rows_after} invalid laps")

# ============ PART 4: EXPLORATORY DATA ANALYSIS ============
print("\n📊 STEP 3: Exploratory Data Analysis...")

# 3.1 Lap Time Distribution Histogram
plt.figure(figsize=(10, 6))
plt.hist(laps['LapTime_sec'], bins=30, color='skyblue', edgecolor='black', alpha=0.7)
mean_time = laps['LapTime_sec'].mean()
median_time = laps['LapTime_sec'].median()
plt.axvline(mean_time, color='gold', linestyle='--', linewidth=2, label=f'Mean: {mean_time:.2f}s')
plt.axvline(median_time, color='teal', linestyle='--', linewidth=2, label=f'Median: {median_time:.2f}s')
plt.xlabel('Lap Time (seconds)', fontsize=12)
plt.ylabel('Frequency', fontsize=12)
plt.title('Lap Time Distribution - Bahrain GP 2024', fontsize=14)
plt.legend()
plt.savefig('plots/lap_distribution.png', dpi=150, bbox_inches='tight')
plt.close()
print("✅ Saved: plots/lap_distribution.png")

# 3.2 Boxplot by Tyre Compound
plt.figure(figsize=(10, 6))
compound_colors = {'SOFT': 'red', 'MEDIUM': 'gold', 'HARD': 'grey'}
order = ['SOFT', 'MEDIUM', 'HARD']
sns.boxplot(data=laps, x='Compound', y='LapTime_sec', order=order, 
            palette=compound_colors)
plt.xlabel('Tyre Compound', fontsize=12)
plt.ylabel('Lap Time (seconds)', fontsize=12)
plt.title('Lap Time Distribution by Tyre Compound', fontsize=14)
plt.savefig('plots/compound_boxplot.png', dpi=150, bbox_inches='tight')
plt.close()
print("✅ Saved: plots/compound_boxplot.png")

# 3.3 Fastest drivers by average lap time
fastest_drivers = laps.groupby('Driver')['LapTime_sec'].mean().sort_values().head()
print("\n🏆 Top 5 Fastest Drivers (avg lap time):")
for driver, time in fastest_drivers.items():
    print(f"   {driver}: {time:.2f} seconds")

# 3.4 Sector times comparison
sector_avg = laps.groupby('Driver')[['S1_sec', 'S2_sec', 'S3_sec']].mean()
sector_avg['Total'] = sector_avg.sum(axis=1)
sector_avg_sorted = sector_avg.sort_values('Total').head(8)

plt.figure(figsize=(12, 6))
x = np.arange(len(sector_avg_sorted))
width = 0.25
plt.bar(x - width, sector_avg_sorted['S1_sec'], width, label='Sector 1', color='#FF6B6B')
plt.bar(x, sector_avg_sorted['S2_sec'], width, label='Sector 2', color='#4ECDC4')
plt.bar(x + width, sector_avg_sorted['S3_sec'], width, label='Sector 3', color='#45B7D1')
plt.xlabel('Driver', fontsize=12)
plt.ylabel('Sector Time (seconds)', fontsize=12)
plt.title('Average Sector Times by Driver', fontsize=14)
plt.xticks(x, sector_avg_sorted.index, rotation=45)
plt.legend()
plt.tight_layout()
plt.savefig('plots/sector_comparison.png', dpi=150, bbox_inches='tight')
plt.close()
print("✅ Saved: plots/sector_comparison.png")

# 3.5 Speed correlation
correlation = laps['SpeedST'].corr(laps['LapTime_sec'])
print(f"\n📈 Correlation between SpeedST and LapTime: {correlation:.3f}")
print(f"   Interpretation: {'Negative (faster speed = better lap time)' if correlation < 0 else 'Positive'}")

plt.figure(figsize=(10, 6))
sns.scatterplot(data=laps, x='SpeedST', y='LapTime_sec', hue='Compound', 
                palette=compound_colors, alpha=0.6)
sns.regplot(data=laps, x='SpeedST', y='LapTime_sec', scatter=False, color='black', line_kws={'linewidth': 2})
plt.xlabel('Speed Trap (km/h)', fontsize=12)
plt.ylabel('Lap Time (seconds)', fontsize=12)
plt.title('Speed Trap vs Lap Time', fontsize=14)
plt.legend(title='Compound')
plt.savefig('plots/speed_correlation.png', dpi=150, bbox_inches='tight')
plt.close()
print("✅ Saved: plots/speed_correlation.png")

# ============ PART 5: FEATURE ENGINEERING ============
print("\n🔧 STEP 4: Feature Engineering...")

# Create new features
laps['SectorBalance'] = laps['S1_sec'] - laps['S3_sec']

# Bin TyreLife
laps['TyreAgeBucket'] = pd.cut(laps['TyreLife'], bins=[0, 10, 25, 100], 
                                labels=['Fresh', 'Used', 'Old'])

# Encode categorical variables
compound_dummies = pd.get_dummies(laps['Compound'], prefix='Tyre')
tyreage_dummies = pd.get_dummies(laps['TyreAgeBucket'], prefix='Age')
laps = pd.concat([laps, compound_dummies, tyreage_dummies], axis=1)

# Encode Driver as numeric
le = LabelEncoder()
laps['Driver_encoded'] = le.fit_transform(laps['Driver'])

# Define features X and target y
feature_cols = ['LapNumber', 'TyreLife', 'SectorBalance', 'SpeedI1', 'SpeedI2', 
                'SpeedFL', 'SpeedST', 'Driver_encoded'] + \
               list(compound_dummies.columns) + list(tyreage_dummies.columns)

X = laps[feature_cols]
y = laps['LapTime_sec']

print(f"Feature matrix shape: {X.shape}")
print(f"Features: {feature_cols}")
print(f"No nulls? {not X.isnull().any().any()}")

# ============ PART 6: TRAIN RANDOM FOREST MODEL ============
print("\n🤖 STEP 5: Training Random Forest Model...")

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
rf_model.fit(X_train, y_train)

# Predict and evaluate
y_pred = rf_model.predict(X_test)

mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print(f"\n📊 Model Performance:")
print(f"   MAE (Mean Absolute Error): {mae:.3f} seconds")
print(f"   RMSE (Root Mean Square Error): {rmse:.3f} seconds")
print(f"   R² Score: {r2:.3f}")
print(f"   {'✅ Good model!' if r2 > 0.85 else '⚠️ R² below target (0.85)'}")

# Plot predicted vs actual
plt.figure(figsize=(10, 6))
plt.scatter(y_test, y_pred, alpha=0.5, color='steelblue')
plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
         'r--', lw=2, label='Perfect Prediction')
plt.xlabel('Actual Lap Time (seconds)', fontsize=12)
plt.ylabel('Predicted Lap Time (seconds)', fontsize=12)
plt.title(f'Random Forest: Predicted vs Actual Lap Time (R² = {r2:.3f})', fontsize=14)
plt.legend()
plt.savefig('plots/predicted_vs_actual.png', dpi=150, bbox_inches='tight')
plt.close()
print("✅ Saved: plots/predicted_vs_actual.png")

# Feature importance
importances = rf_model.feature_importances_
feature_imp_df = pd.DataFrame({'Feature': feature_cols, 'Importance': importances})
feature_imp_df = feature_imp_df.sort_values('Importance', ascending=True).tail(10)

plt.figure(figsize=(10, 6))
plt.barh(feature_imp_df['Feature'], feature_imp_df['Importance'], color='coral')
plt.xlabel('Importance', fontsize=12)
plt.title('Top 10 Feature Importances', fontsize=14)
plt.tight_layout()
plt.savefig('plots/feature_importance.png', dpi=150, bbox_inches='tight')
plt.close()
print("✅ Saved: plots/feature_importance.png")

# ============ PART 7: ANOMALY DETECTION ============
print("\n🚨 STEP 6: Anomaly Detection...")

laps['IsAnomaly'] = False

for driver in laps['Driver'].unique():
    driver_laps = laps[laps['Driver'] == driver]
    median_time = driver_laps['LapTime_sec'].median()
    std_time = driver_laps['LapTime_sec'].std()
    
    # Flag laps > 2 standard deviations from median
    anomaly_mask = (laps['Driver'] == driver) & \
                   (abs(laps['LapTime_sec'] - median_time) > 2 * std_time)
    laps.loc[anomaly_mask, 'IsAnomaly'] = True

# Print anomaly summary
print("\n📋 Anomaly Detection Summary:")
print(f"Total anomalies found: {laps['IsAnomaly'].sum()}")

print("\nPer-driver anomaly count:")
driver_anomalies = laps[laps['IsAnomaly']].groupby('Driver').size()
for driver in laps['Driver'].unique():
    count = driver_anomalies.get(driver, 0)
    print(f"   {driver}: {count} anomaly laps")

# Plot anomalies for top 3 drivers
top_drivers = laps.groupby('Driver')['LapTime_sec'].mean().nsmallest(3).index.tolist()

fig, axes = plt.subplots(3, 1, figsize=(12, 10))
for idx, driver in enumerate(top_drivers):
    driver_data = laps[laps['Driver'] == driver]
    normal = driver_data[~driver_data['IsAnomaly']]
    anomalies = driver_data[driver_data['IsAnomaly']]
    
    axes[idx].scatter(normal['LapNumber'], normal['LapTime_sec'], 
                      alpha=0.6, color='blue', label='Normal')
    axes[idx].scatter(anomalies['LapNumber'], anomalies['LapTime_sec'], 
                      color='red', marker='*', s=200, label='Anomaly')
    axes[idx].axhline(driver_data['LapTime_sec'].median(), 
                      color='green', linestyle='--', label='Median')
    axes[idx].set_title(f'{driver} - Lap Times', fontsize=12)
    axes[idx].set_xlabel('Lap Number')
    axes[idx].set_ylabel('Lap Time (seconds)')
    axes[idx].legend()

plt.suptitle('Anomaly Detection - Laps > 2σ from Driver Median', fontsize=14)
plt.tight_layout()
plt.savefig('plots/anomaly_detection.png', dpi=150, bbox_inches='tight')
plt.close()
print("✅ Saved: plots/anomaly_detection.png")

# ============ PART 8: FINAL SUMMARY ============
print("\n" + "=" * 60)
print("✅ PROJECT COMPLETED SUCCESSFULLY!")
print("=" * 60)
print("\n📁 Output files saved in 'plots/' folder:")
print("   - lap_distribution.png")
print("   - compound_boxplot.png")
print("   - sector_comparison.png")
print("   - speed_correlation.png")
print("   - predicted_vs_actual.png")
print("   - feature_importance.png")
print("   - anomaly_detection.png")
print("\n🎯 Ready to push to GitHub!")