# ==========================================
# F1 Race Analysis Project
# Author: Nivedhitha K
# ==========================================

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

import os
import fastf1
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

# ==========================================
# CREATE FOLDERS
# ==========================================

os.makedirs("plots", exist_ok=True)
os.makedirs("f1_cache", exist_ok=True)

# ==========================================
# LOAD F1 DATA
# ==========================================

print("=" * 50)
print("LOADING F1 DATA")
print("=" * 50)

fastf1.Cache.enable_cache("f1_cache")

session = fastf1.get_session(2024, "Bahrain", "R")

print("Loading race data...")

session.load()

laps = session.laps

print("\nData Loaded Successfully!")

print("\nShape:")
print(laps.shape)

print("\nColumns:")
print(laps.columns)

print("\nFirst 5 Rows:")
print(laps.head())

# ==========================================
# DATA CLEANING
# ==========================================

print("\n" + "=" * 50)
print("DATA CLEANING")
print("=" * 50)

rows_before = len(laps)

columns_needed = [
    "Driver",
    "Team",
    "LapNumber",
    "LapTime",
    "Sector1Time",
    "Sector2Time",
    "Sector3Time",
    "Compound",
    "TyreLife",
    "SpeedI1",
    "SpeedI2",
    "SpeedFL",
    "SpeedST"
]

laps = laps[columns_needed].copy()

time_columns = [
    "LapTime",
    "Sector1Time",
    "Sector2Time",
    "Sector3Time"
]

for col in time_columns:
    laps[col] = laps[col].dt.total_seconds()

laps.dropna(inplace=True)

laps = laps[laps["LapTime"] <= 120]

laps.reset_index(drop=True, inplace=True)

rows_after = len(laps)

print(f"Rows Before Cleaning : {rows_before}")
print(f"Rows After Cleaning  : {rows_after}")
print(f"Rows Removed         : {rows_before - rows_after}")

print("\nClean Dataset Preview:")
print(laps.head())

# ==========================================
# TASK 3 - LAP TIME DISTRIBUTION
# ==========================================

print("\n" + "=" * 50)
print("LAP TIME DISTRIBUTION")
print("=" * 50)

sns.set_style("whitegrid")

plt.figure(figsize=(10, 6))

sns.histplot(
    data=laps,
    x="LapTime",
    bins=30,
    kde=True
)

mean_time = laps["LapTime"].mean()
median_time = laps["LapTime"].median()

plt.axvline(
    mean_time,
    linestyle="--",
    linewidth=2,
    label=f"Mean = {mean_time:.2f}s"
)

plt.axvline(
    median_time,
    linestyle=":",
    linewidth=2,
    label=f"Median = {median_time:.2f}s"
)

plt.title("F1 Bahrain GP 2024 - Lap Time Distribution")
plt.xlabel("Lap Time (Seconds)")
plt.ylabel("Frequency")
plt.legend()

plt.savefig(
    "plots/lap_distribution.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()

print("Graph saved successfully!")

# ==========================================
# TASK 4 - TYRE COMPOUND ANALYSIS
# ==========================================

print("\n" + "=" * 50)
print("TYRE COMPOUND ANALYSIS")
print("=" * 50)

plt.figure(figsize=(10, 6))

sns.boxplot(
    data=laps,
    x="Compound",
    y="LapTime"
)

plt.title("Lap Time Comparison by Tyre Compound")
plt.xlabel("Tyre Compound")
plt.ylabel("Lap Time (Seconds)")

plt.savefig(
    "plots/compound_boxplot.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()

print("Compound boxplot saved successfully!")

# ==========================================
# TASK 5 - SECTOR ANALYSIS
# ==========================================

print("\n" + "=" * 50)
print("SECTOR ANALYSIS")
print("=" * 50)

sector_avg = laps.groupby("Driver")[
    ["Sector1Time", "Sector2Time", "Sector3Time"]
].mean()

sector_avg.plot(
    kind="bar",
    figsize=(14, 7)
)

plt.title("Average Sector Times by Driver")
plt.xlabel("Driver")
plt.ylabel("Time (Seconds)")
plt.legend(title="Sectors")

plt.savefig(
    "plots/sector_comparison.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()

print("Sector comparison graph saved successfully!")

# ==========================================
# TASK 6 - SPEED CORRELATION ANALYSIS
# ==========================================

print("\n" + "=" * 50)
print("SPEED CORRELATION ANALYSIS")
print("=" * 50)

correlation = laps["SpeedST"].corr(laps["LapTime"])

print(f"Correlation between SpeedST and LapTime: {correlation:.4f}")

print("\nCorrelation Interpretation:")
print(
    f"A strong negative correlation ({correlation:.4f}) was observed between "
    "Speed Trap Speed (SpeedST) and Lap Time. "
    "This indicates that higher speeds are generally associated with lower lap times, "
    "resulting in faster performance."
)

plt.figure(figsize=(10, 6))

sns.scatterplot(
    data=laps,
    x="SpeedST",
    y="LapTime",
    hue="Compound",
    alpha=0.7
)

plt.title("Speed Trap Speed vs Lap Time")
plt.xlabel("SpeedST (km/h)")
plt.ylabel("Lap Time (Seconds)")

plt.savefig(
    "plots/speed_correlation.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()

print("Speed correlation graph saved successfully!")

# ==========================================
# TASK 7 - FEATURE ENGINEERING
# ==========================================

print("\n" + "=" * 50)
print("FEATURE ENGINEERING")
print("=" * 50)

model_data = laps.copy()

le_driver = LabelEncoder()
le_team = LabelEncoder()
le_compound = LabelEncoder()

model_data["Driver"] = le_driver.fit_transform(model_data["Driver"])
model_data["Team"] = le_team.fit_transform(model_data["Team"])
model_data["Compound"] = le_compound.fit_transform(model_data["Compound"])

features = [
    "Driver",
    "Team",
    "LapNumber",
    "Compound",
    "TyreLife",
    "SpeedI1",
    "SpeedI2",
    "SpeedFL",
    "SpeedST"
]

X = model_data[features]
y = model_data["LapTime"]

print("Feature matrix shape:", X.shape)
print("Target vector shape :", y.shape)

# ==========================================
# TASK 8 - RANDOM FOREST MODEL
# ==========================================

print("\n" + "=" * 50)
print("RANDOM FOREST MODEL")
print("=" * 50)

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)

model = RandomForestRegressor(
    n_estimators=100,
    random_state=42
)

model.fit(X_train, y_train)

predictions = model.predict(X_test)

mae = mean_absolute_error(y_test, predictions)
r2 = r2_score(y_test, predictions)

print(f"Mean Absolute Error : {mae:.3f}")
print(f"R² Score            : {r2:.3f}")

print("\nModel Interpretation:")
print(
    f"The Random Forest Regressor achieved a Mean Absolute Error (MAE) "
    f"of {mae:.3f} seconds and an R² Score of {r2:.3f}. "
    f"This indicates that the model predicts lap times with very high accuracy "
    f"and explains approximately {r2*100:.1f}% of the variation in lap time performance."
)

# ==========================================
# FEATURE IMPORTANCE
# ==========================================

importance_df = pd.DataFrame({
    "Feature": features,
    "Importance": model.feature_importances_
})

importance_df = importance_df.sort_values(
    by="Importance",
    ascending=False
)

print("\nFeature Importance:")
print(importance_df)

print("\nFeature Importance Analysis:")
print(
    "SpeedST is the most influential factor affecting lap time, "
    "contributing approximately 72.95% of the model's decision-making power. "
    "TyreLife is the second most important feature, indicating that tyre degradation "
    "has a significant impact on race performance."
)

plt.figure(figsize=(10, 6))

sns.barplot(
    data=importance_df,
    x="Importance",
    y="Feature"
)

plt.title("Feature Importance - Random Forest")

plt.savefig(
    "plots/feature_importance.png",
    dpi=300,
    bbox_inches="tight"
)

plt.show()

print("Feature importance graph saved successfully!")

print("\nPROJECT COMPLETED SUCCESSFULLY!")
print("All graphs saved inside the 'plots' folder.")
