"""
VYOM MALE UAV - Remaining Useful Life (RUL) Model Training Pipeline (Phase 9)
Trains and validates regression models for Rotax 914 F aero-piston engine RUL prediction.

Models evaluated:
1. RandomForestRegressor (Ensemble decision trees)
2. GradientBoostingRegressor (Sequential boosting)

Saves best model and feature configuration under backend/ml/models/rul/
"""

import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

BASE_FEATURES = [
    "flight_hours",
    "flight_cycles",
    "rpm",
    "cht",
    "egt",
    "oil_pressure",
    "oil_temperature",
    "fuel_flow",
    "vibration_rms",
    "map_inhg",
    "anomaly_score",
]

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Computes thermodynamic interaction & cumulative stress features."""
    X = df.copy()
    
    # 1. Thermal stress ratio
    X["thermal_stress_index"] = (X["cht"] / 180.0) * (X["egt"] / 620.0)
    
    # 2. Cumulative mechanical vibration exposure
    X["vib_hour_product"] = X["vibration_rms"] * (X["flight_hours"] / 100.0)
    
    # 3. Oil hydrodynamic degradation ratio
    X["oil_health_ratio"] = (X["oil_pressure"] * 100.0) / np.maximum(1.0, X["oil_temperature"])
    
    # 4. Boost power efficiency
    X["boost_per_fuel"] = X["map_inhg"] / np.maximum(1.0, X["fuel_flow"])
    
    # 5. Cyclic flight duration
    X["hours_per_cycle"] = X["flight_hours"] / np.maximum(1.0, X["flight_cycles"])
    
    return X

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    datasets_dir = os.path.join(base_dir, "datasets")
    models_dir = os.path.join(base_dir, "models", "rul")
    os.makedirs(models_dir, exist_ok=True)

    csv_path = os.path.join(datasets_dir, "degradation_sequences.csv")
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Missing {csv_path}. Run generate_degradation_data.py first.")

    df = pd.read_csv(csv_path)
    df_feat = engineer_features(df)

    all_features = BASE_FEATURES + [
        "thermal_stress_index",
        "vib_hour_product",
        "oil_health_ratio",
        "boost_per_fuel",
        "hours_per_cycle",
    ]

    target = "actual_rul_hours"

    # Engine-wise train/val/test splits (No data leakage across engines)
    train_mask = df_feat["split"] == "TRAIN"
    val_mask = df_feat["split"] == "VAL"
    test_mask = df_feat["split"] == "TEST"

    X_train = df_feat.loc[train_mask, all_features]
    y_train = df_feat.loc[train_mask, target]

    X_val = df_feat.loc[val_mask, all_features]
    y_val = df_feat.loc[val_mask, target]

    X_test = df_feat.loc[test_mask, all_features]
    y_test = df_feat.loc[test_mask, target]

    print(f"Features: {len(all_features)} ({len(BASE_FEATURES)} base + 5 engineered)")
    print(f"Dataset split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")

    # Feature Standardization
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # 1. Random Forest Regressor
    rf = RandomForestRegressor(
        n_estimators=150,
        max_depth=16,
        min_samples_split=4,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(X_train_scaled, y_train)

    rf_val_preds = rf.predict(X_val_scaled)
    rf_mae = mean_absolute_error(y_val, rf_val_preds)
    rf_rmse = np.sqrt(mean_squared_error(y_val, rf_val_preds))
    rf_r2 = r2_score(y_val, rf_val_preds)
    print(f"[Random Forest - Validation] MAE: {rf_mae:.2f} h | RMSE: {rf_rmse:.2f} h | R²: {rf_r2:.4f}")

    # 2. Gradient Boosting Regressor
    gb = GradientBoostingRegressor(
        n_estimators=150,
        learning_rate=0.08,
        max_depth=6,
        min_samples_split=4,
        random_state=42,
    )
    gb.fit(X_train_scaled, y_train)

    gb_val_preds = gb.predict(X_val_scaled)
    gb_mae = mean_absolute_error(y_val, gb_val_preds)
    gb_rmse = np.sqrt(mean_squared_error(y_val, gb_val_preds))
    gb_r2 = r2_score(y_val, gb_val_preds)
    print(f"[Gradient Boosting - Validation] MAE: {gb_mae:.2f} h | RMSE: {gb_rmse:.2f} h | R²: {gb_r2:.4f}")

    # Select best model based on validation MAE
    if gb_mae < rf_mae:
        best_model = gb
        best_name = "GradientBoostingRegressor"
    else:
        best_model = rf
        best_name = "RandomForestRegressor"

    # Evaluate best model on unseen TEST set
    test_preds = best_model.predict(X_test_scaled)
    test_mae = float(mean_absolute_error(y_test, test_preds))
    test_rmse = float(np.sqrt(mean_squared_error(y_test, test_preds)))
    test_r2 = float(r2_score(y_test, test_preds))
    
    # Calculate typical prediction uncertainty (standard deviation of residuals on test set)
    residuals = y_test.values - test_preds
    uncertainty_std = float(np.std(residuals))

    print(f"\n=======================================================")
    print(f"SELECTED MODEL: {best_name}")
    print(f"Test MAE: {test_mae:.2f} flight hours")
    print(f"Test RMSE: {test_rmse:.2f} flight hours")
    print(f"Test R²: {test_r2:.4f}")
    print(f"Test Uncertainty (1σ): ±{uncertainty_std:.2f} flight hours")
    print(f"=======================================================\n")

    # Feature Importance extraction
    importances = best_model.feature_importances_
    feat_imp = [
        {"feature": f, "importance": round(float(imp), 4)}
        for f, imp in sorted(zip(all_features, importances), key=lambda x: x[1], reverse=True)
    ]

    # Save artifacts
    model_file = os.path.join(models_dir, "rul_regressor.joblib")
    scaler_file = os.path.join(models_dir, "rul_scaler.joblib")
    joblib.dump(best_model, model_file)
    joblib.dump(scaler, scaler_file)
    print(f"Model saved to {model_file}")
    print(f"Scaler saved to {scaler_file}")

    # Feature config
    feat_cfg = {
        "base_features": BASE_FEATURES,
        "engineered_features": [
            "thermal_stress_index",
            "vib_hour_product",
            "oil_health_ratio",
            "boost_per_fuel",
            "hours_per_cycle",
        ],
        "all_features": all_features,
        "feature_importances": feat_imp,
        "component_nominal_tbo": {
            "engine_overall": 2000.0,
            "cylinder_head": 1800.0,
            "oil_system": 2000.0,
            "fuel_system": 1500.0,
            "turbocharger": 1500.0,
            "sensors": 2500.0,
        },
        "maintenance_thresholds": {
            "continue_monitoring": 500.0,
            "schedule_inspection": 200.0,
            "maintenance_soon": 50.0,
            "critical_immediate": 0.0,
        }
    }
    with open(os.path.join(models_dir, "rul_feature_config.json"), "w") as f:
        json.dump(feat_cfg, f, indent=2)

    # Model metadata
    metadata = {
        "model_name": "Rotax914F-RUL-Regressor",
        "algorithm": best_name,
        "model_version": "v1.0.0-rul-ensemble",
        "training_date": "2026-10-31",
        "target": "actual_rul_hours",
        "is_experimental_prototype": True,
        "dataset_type": "SYNTHETIC_PHYSICAL_MODEL",
        "training_samples": len(X_train),
        "validation_samples": len(X_val),
        "test_samples": len(X_test),
        "evaluation_metrics": {
            "mae_hours": round(test_mae, 2),
            "rmse_hours": round(test_rmse, 2),
            "r2_score": round(test_r2, 4),
            "uncertainty_1_sigma_hours": round(uncertainty_std, 2),
            "relative_error_percent": round((test_mae / 2000.0) * 100, 2),
        },
        "disclaimer": "Predictions are generated by an experimental digital twin prototype trained on synthetic non-linear degradation physics. Not certified for airworthiness or aircraft operational release."
    }
    with open(os.path.join(models_dir, "rul_model_metadata.json"), "w") as f:
        json.dump(metadata, f, indent=2)

    print("Model feature config & metadata written successfully.")

if __name__ == "__main__":
    main()

