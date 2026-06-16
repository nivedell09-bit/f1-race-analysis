import fastf1
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import os
import json
import warnings
warnings.filterwarnings('ignore')

os.makedirs('plots', exist_ok=True)
sns.set_theme(style='darkgrid')
plt.rcParams['figure.figsize'] = (10, 6)

print("=" * 60)
print("🏎️  F1 RACE PERFORMANCE ANALYSIS - AI/ML PIPELINE")
print("=" * 60)

print("\n📥 STEP 1: Loading F1 Data...")
print("-" * 40)

fastf1.Cache.enable_cache('f1_cache')
session = fastf1.get_session(2024, 'Bahrain', 'R')
session.load()
laps = session.laps
print(f"✅ Loaded {laps.shape[0]} laps with {laps.shape[1]} columns")

print("\n🧹 STEP 2: Cleaning Data...")
print("-" * 40)

keep_cols = ['Driver', 'Team', 'LapNumber', 'LapTime', 'Sector1Time', 'Sector2Time', 
             'Sector3Time', 'Compound', 'TyreLife', 'SpeedI1', 'SpeedI2', 'SpeedFL', 'SpeedST']
available_cols = [col for col in keep_cols if col in laps.columns]
laps_clean = laps[available_cols].copy()

time_cols = ['LapTime', 'Sector1Time', 'Sector2Time', 'Sector3Time']
for col in time_cols:
    if col in laps_clean.columns:
        laps_clean[f'{col}_sec'] = laps_clean[col].dt.total_seconds()

before_count = len(laps_clean)
laps_clean = laps_clean.dropna(subset=['LapTime_sec'])
laps_clean = laps_clean[laps_clean['LapTime_sec'] <= 120]
laps_clean = laps_clean.dropna(subset=['Sector1Time_sec', 'Sector2Time_sec', 'Sector3Time_sec'])
laps_clean = laps_clean.reset_index(drop=True)
print(f"✅ Cleaned data: {len(laps_clean)} laps (removed {before_count - len(laps_clean)} rows)")

print("\n📊 STEP 3: Creating Visualizations...")
print("-" * 40)

# 1. Lap Time Distribution
fig, ax = plt.subplots(figsize=(10, 6))
sns.histplot(laps_clean['LapTime_sec'], bins=30, kde=True, color='steelblue', alpha=0.7)
mean_time = laps_clean['LapTime_sec'].mean()
median_time = laps_clean['LapTime_sec'].median()
ax.axvline(mean_time, color='gold', linestyle='--', linewidth=2, label=f'Mean: {mean_time:.2f}s')
ax.axvline(median_time, color='teal', linestyle='--', linewidth=2, label=f'Median: {median_time:.2f}s')
ax.set_xlabel('Lap Time (seconds)')
ax.set_ylabel('Frequency')
ax.set_title('Lap Time Distribution - 2024 Bahrain GP')
ax.legend()
plt.tight_layout()
plt.savefig('plots/lap_distribution.png', dpi=150)
plt.close()
print("✅ Saved: plots/lap_distribution.png")

# 2. Compound Boxplot
fig, ax = plt.subplots(figsize=(10, 6))
compound_palette = {'SOFT': 'red', 'MEDIUM': 'gold', 'HARD': 'grey'}
valid_compounds = laps_clean[laps_clean['Compound'].isin(['SOFT', 'MEDIUM', 'HARD'])]
sns.boxplot(data=valid_compounds, x='Compound', y='LapTime_sec', palette=compound_palette)
ax.set_xlabel('Tyre Compound')
ax.set_ylabel('Lap Time (seconds)')
ax.set_title('Lap Time Distribution by Tyre Compound')
plt.tight_layout()
plt.savefig('plots/compound_boxplot.png', dpi=150)
plt.close()
print("✅ Saved: plots/compound_boxplot.png")

# 3. Driver Rankings
avg_lap_times = laps_clean.groupby('Driver')['LapTime_sec'].mean().sort_values()
print("\n🏆 Top 5 Fastest Drivers:")
print(avg_lap_times.head(5).to_string())

# 4. Sector Comparison
sector_avg = laps_clean.groupby('Driver')[['Sector1Time_sec', 'Sector2Time_sec', 'Sector3Time_sec']].mean()
sector_avg['Total'] = sector_avg.sum(axis=1)
sector_avg_sorted = sector_avg.sort_values('Total').head(10)

fig, ax = plt.subplots(figsize=(12, 7))
x = np.arange(len(sector_avg_sorted))
width = 0.25
ax.bar(x - width, sector_avg_sorted['Sector1Time_sec'], width, label='Sector 1', color='#1f77b4')
ax.bar(x, sector_avg_sorted['Sector2Time_sec'], width, label='Sector 2', color='#ff7f0e')
ax.bar(x + width, sector_avg_sorted['Sector3Time_sec'], width, label='Sector 3', color='#2ca02c')
ax.set_xlabel('Driver')
ax.set_ylabel('Average Sector Time (seconds)')
ax.set_title('Sector Time Comparison - Top 10 Drivers')
ax.set_xticks(x)
ax.set_xticklabels(sector_avg_sorted.index, rotation=45, ha='right')
ax.legend()
plt.tight_layout()
plt.savefig('plots/sector_comparison.png', dpi=150)
plt.close()
print("✅ Saved: plots/sector_comparison.png")

# 5. Speed Correlation
correlation = laps_clean['SpeedST'].corr(laps_clean['LapTime_sec'])
print(f"\n📈 Speed vs Lap Time Correlation: {correlation:.3f}")

fig, ax = plt.subplots(figsize=(10, 6))
valid_compounds = laps_clean[laps_clean['Compound'].isin(['SOFT', 'MEDIUM', 'HARD'])]
sns.scatterplot(data=valid_compounds, x='SpeedST', y='LapTime_sec', 
                hue='Compound', palette=compound_palette, alpha=0.7)
sns.regplot(data=valid_compounds, x='SpeedST', y='LapTime_sec', 
            scatter=False, color='black', line_kws={'linestyle': '--'})
ax.set_xlabel('Speed Trap (km/h)')
ax.set_ylabel('Lap Time (seconds)')
ax.set_title(f'Speed vs Lap Time Correlation (r = {correlation:.3f})')
ax.legend()
plt.tight_layout()
plt.savefig('plots/speed_correlation.png', dpi=150)
plt.close()
print("✅ Saved: plots/speed_correlation.png")

print("\n🔧 STEP 4: Feature Engineering...")
print("-" * 40)

df_model = laps_clean.copy()

# Create new features
df_model['SectorBalance'] = df_model['Sector1Time_sec'] - df_model['Sector3Time_sec']
df_model['TyreAge_Bucket'] = pd.cut(df_model['TyreLife'], 
                                    bins=[0, 10, 25, float('inf')], 
                                    labels=['Fresh', 'Used', 'Old'])

# Encode categorical variables
le = LabelEncoder()
df_model['Driver_Encoded'] = le.fit_transform(df_model['Driver'])

# Create dummies
compound_dummies = pd.get_dummies(df_model['Compound'], prefix='Compound')
tyre_age_dummies = pd.get_dummies(df_model['TyreAge_Bucket'], prefix='TyreAge')

# Define feature columns (only include columns that exist)
base_features = ['LapNumber', 'TyreLife', 'SectorBalance', 'SpeedI1', 'SpeedI2', 'SpeedFL', 'SpeedST', 'Driver_Encoded']

# Combine all features
X = pd.concat([df_model[base_features], compound_dummies, tyre_age_dummies], axis=1)
y = df_model['LapTime_sec'].copy()

print(f"✅ Features: {X.shape[1]}, Samples: {X.shape[0]}")
print(f"✅ No missing values: {X.isnull().sum().sum() == 0}")

print("\n🤖 STEP 5: Training Random Forest Model...")
print("-" * 40)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
rf = RandomForestRegressor(n_estimators=100, random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)
y_pred = rf.predict(X_test)

# Evaluate
mae = mean_absolute_error(y_test, y_pred)
rmse = np.sqrt(mean_squared_error(y_test, y_pred))
r2 = r2_score(y_test, y_pred)

print(f"\n📊 Model Performance:")
print(f"   MAE: {mae:.4f} seconds")
print(f"   RMSE: {rmse:.4f} seconds")
print(f"   R² Score: {r2:.4f}")
print(f"   {'✅ Target met! (R² > 0.85)' if r2 > 0.85 else '⚠️ Needs improvement'}")

# Predicted vs Actual plot
fig, ax = plt.subplots(figsize=(10, 6))
ax.scatter(y_test, y_pred, alpha=0.6, color='steelblue')
ax.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 
        'gold', linestyle='--', linewidth=2, label='Perfect Prediction')
ax.set_xlabel('Actual Lap Time (seconds)')
ax.set_ylabel('Predicted Lap Time (seconds)')
ax.set_title(f'Random Forest Predictions - R² = {r2:.4f}')
ax.legend()
plt.tight_layout()
plt.savefig('plots/predicted_vs_actual.png', dpi=150)
plt.close()
print("✅ Saved: plots/predicted_vs_actual.png")

# Feature Importance
feature_importance = pd.DataFrame({
    'feature': X.columns,
    'importance': rf.feature_importances_
}).sort_values('importance', ascending=True)

fig, ax = plt.subplots(figsize=(10, 8))
top_features = feature_importance.tail(10)
ax.barh(top_features['feature'], top_features['importance'], color='steelblue')
ax.set_xlabel('Importance')
ax.set_ylabel('Feature')
ax.set_title('Top 10 Feature Importances - Random Forest')
plt.tight_layout()
plt.savefig('plots/feature_importance.png', dpi=150)
plt.close()
print("✅ Saved: plots/feature_importance.png")

print("\n🏆 Top 5 Most Important Features:")
print(feature_importance.tail(5)[['feature', 'importance']].to_string(index=False))

print("\n🚨 STEP 6: Detecting Anomalies...")
print("-" * 40)

df_anomaly = df_model.copy()
df_anomaly['IsAnomaly'] = False

driver_stats = df_anomaly.groupby('Driver')['LapTime_sec'].agg(['median', 'std'])
for driver in driver_stats.index:
    median = driver_stats.loc[driver, 'median']
    std = driver_stats.loc[driver, 'std']
    mask = (df_anomaly['Driver'] == driver) & (df_anomaly['LapTime_sec'] > median + 2 * std)
    df_anomaly.loc[mask, 'IsAnomaly'] = True

anomaly_counts = df_anomaly[df_anomaly['IsAnomaly']].groupby('Driver').size()
print("\n🚩 Anomaly Counts:")
print(anomaly_counts if len(anomaly_counts) > 0 else "No anomalies detected")

# Visualize anomalies
top_drivers = df_anomaly['Driver'].value_counts().head(3).index
fig, axes = plt.subplots(1, 3, figsize=(15, 5))

for idx, driver in enumerate(top_drivers):
    driver_data = df_anomaly[df_anomaly['Driver'] == driver]
    median = driver_stats.loc[driver, 'median']
    upper_bound = median + 2 * driver_stats.loc[driver, 'std']
    
    ax = axes[idx]
    normal = driver_data[~driver_data['IsAnomaly']]
    anomaly = driver_data[driver_data['IsAnomaly']]
    
    ax.scatter(normal['LapNumber'], normal['LapTime_sec'], alpha=0.6, color='steelblue', label='Normal')
    ax.scatter(anomaly['LapNumber'], anomaly['LapTime_sec'], color='red', marker='x', s=100, label='Anomaly')
    ax.axhline(median, color='gold', linestyle='--', linewidth=1, label='Median')
    ax.axhline(upper_bound, color='red', linestyle=':', linewidth=1, label='+2σ')
    ax.set_xlabel('Lap Number')
    ax.set_ylabel('Lap Time (s)')
    ax.set_title(f'{driver}\n{len(anomaly)} anomaly laps')
    ax.legend(fontsize=8)

plt.suptitle('Anomaly Detection - Top 3 Drivers', fontsize=14)
plt.tight_layout()
plt.savefig('plots/anomaly_detection.png', dpi=150)
plt.close()
print("✅ Saved: plots/anomaly_detection.png")

# ===== SAVE RESULTS FOR WEB DASHBOARD =====
print("\n💾 STEP 7: Saving data for web dashboard...")
print("-" * 40)

results = {
    'total_laps': int(len(laps_clean)),
    'features': int(X.shape[1]),
    'r2_score': float(r2),
    'mae': float(mae),
    'rmse': float(rmse),
    'anomalies': int(df_anomaly['IsAnomaly'].sum()),
    'top_drivers': avg_lap_times.head(5).to_dict(),
    'top_features': feature_importance.tail(5)[['feature', 'importance']].to_dict('records')
}

with open('results.json', 'w') as f:
    json.dump(results, f, indent=2)
print("✅ Saved: results.json")

print("\n" + "=" * 60)
print("✅ PROJECT COMPLETE!")
print("=" * 60)
print(f"\n📁 All outputs saved in 'plots/' folder")
print(f"\n📊 Summary:")
print(f"   • Clean laps: {len(laps_clean)}")
print(f"   • Features: {X.shape[1]}")
print(f"   • Model R²: {r2:.4f}")
print(f"   • Anomalies: {df_anomaly['IsAnomaly'].sum()}")
print("\n🚀 Ready for GitHub push!")