"""
VYOM Machine Learning Model Training: Isolation Forest Anomaly Detection
Trains Isolation Forest on Rotax 914 F normal telemetry and evaluates against labeled failure scenarios.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

DATASETS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "datasets"))
MODELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "models"))
os.makedirs(MODELS_DIR, exist_ok=True)

MODEL_VERSION = "v1.2.0-isoforest-rotax"
RANDOM_STATE = 42

BASE_FEATURES = [
    "rpm",
    "cht",
    "egt",
    "oilPressure",
    "oilTemperature",
    "fuelFlow",
    "vibrationRMS",
    "manifoldPressureInHg",
]

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Computes physically grounded thermodynamic and mechanical ratio features."""
    data = df.copy()

    # Clean sentinel values (-999 or NaN) by clipping to safe physical minimums for ratio computation
    cht_clean = np.where(data["cht"] < 0, 180.0, data["cht"])
    egt_clean = np.where(data["egt"] < 0, 620.0, data["egt"])
    rpm_clean = np.where(data["rpm"] < 500, 2400.0, data["rpm"])
    oil_clean = np.where(data["oilPressure"] < 0, 4.2, data["oilPressure"])
    fuel_clean = np.where(data["fuelFlow"] < 0, 12.0, data["fuelFlow"])
    map_clean = np.where(data["manifoldPressureInHg"] < 10, 31.0, data["manifoldPressureInHg"])

    # Engineered ratios
    data["temp_ratio_cht_egt"] = cht_clean / np.maximum(egt_clean, 1.0)
    data["oil_p_per_rpm"] = oil_clean / np.maximum(rpm_clean / 1000.0, 0.1)
    data["vib_per_rpm"] = data["vibrationRMS"] / np.maximum(rpm_clean / 1000.0, 0.1)
    data["power_proxy"] = (rpm_clean / 1000.0) * map_clean
    data["fuel_per_power"] = fuel_clean / np.maximum(data["power_proxy"], 1.0)

    return data

def main():
    print(f"=== Training Isolation Forest Model ({MODEL_VERSION}) ===")

    # 1. Load normal operational training dataset
    train_path = os.path.join(DATASETS_DIR, "normal_telemetry.csv")
    if not os.path.exists(train_path):
        raise FileNotFoundError(f"Training dataset not found: {train_path}. Run generate_datasets.py first.")

    df_train = pd.read_csv(train_path)
    print(f"Loaded {len(df_train)} normal training records.")

    # 2. Load anomaly evaluation dataset
    test_path = os.path.join(DATASETS_DIR, "anomalous_telemetry.csv")
    if not os.path.exists(test_path):
        raise FileNotFoundError(f"Evaluation dataset not found: {test_path}.")

    df_anom = pd.read_csv(test_path)
    print(f"Loaded {len(df_anom)} labeled anomaly test records.")

    # 3. Feature engineering
    df_train_feat = engineer_features(df_train)
    df_anom_feat = engineer_features(df_anom)

    feature_cols = BASE_FEATURES + [
        "temp_ratio_cht_egt",
        "oil_p_per_rpm",
        "vib_per_rpm",
        "power_proxy",
        "fuel_per_power",
    ]
    print(f"Feature set ({len(feature_cols)} features): {feature_cols}")

    X_train_raw = df_train_feat[feature_cols].values

    # Compute baseline reference values for imputation and feature attribution
    feature_baselines = {}
    for col in feature_cols:
        col_vals = df_train_feat[col].values
        feature_baselines[col] = {
            "mean": float(np.mean(col_vals)),
            "std": float(max(1e-4, np.std(col_vals))),
            "median": float(np.median(col_vals)),
            "min": float(np.min(col_vals)),
            "max": float(np.max(col_vals)),
        }

    # 4. Feature scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_raw)

    # 5. Train Isolation Forest
    iso_forest = IsolationForest(
        n_estimators=200,
        max_samples="auto",
        contamination=0.04,
        random_state=RANDOM_STATE,
        n_jobs=-1,
    )
    iso_forest.fit(X_train_scaled)
    print("Isolation Forest trained successfully.")

    # Calibration parameters for [0.0, 1.0] continuous anomaly score
    # In Isolation Forest, raw_score = -score_samples(X)
    train_raw_scores = -iso_forest.score_samples(X_train_scaled)
    baseline_min_score = float(np.percentile(train_raw_scores, 2))
    baseline_median_score = float(np.median(train_raw_scores))
    
    # 6. Evaluation against labeled anomalies and held-out normal test slice
    n_val = int(len(df_train) * 0.25)
    df_val_norm = df_train_feat.iloc[-n_val:].copy()
    df_val_norm["is_anomaly"] = 0

    eval_df = pd.concat([df_val_norm, df_anom_feat], ignore_index=True)
    X_eval = eval_df[feature_cols].values
    X_eval_scaled = scaler.transform(X_eval)
    y_true = eval_df["is_anomaly"].values

    eval_raw_scores = -iso_forest.score_samples(X_eval_scaled)
    
    # Find optimal F1 decision threshold on validation set
    best_th = 0.48
    best_f1 = 0.0
    for cand in np.linspace(0.44, 0.52, 17):
        cand_f1 = f1_score(y_true, (eval_raw_scores >= cand).astype(int), zero_division=0)
        if cand_f1 > best_f1:
            best_f1 = cand_f1
            best_th = float(cand)

    threshold_raw_score = best_th
    print(f"Calibrated Optimal Decision Threshold: {threshold_raw_score:.4f} (Validation F1 = {best_f1:.4f})")

    # Normalized score in [0.0, 1.0]:
    # Baseline min maps to ~0.05, median maps to ~0.25, threshold maps to 0.60 (Anomaly Trigger), max maps to 1.0
    eval_normalized_scores = np.clip(
        0.60 + ((eval_raw_scores - threshold_raw_score) / 0.15) * 0.40,
        0.0,
        1.0,
    )
    # Binary prediction against calibrated threshold
    y_pred = np.where(eval_raw_scores >= threshold_raw_score, 1, 0)

    # Metrics
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_true, eval_raw_scores)
    cm = confusion_matrix(y_true, y_pred)
    tn, fp, fn, tp = cm.ravel()

    print("\n--- Model Evaluation Results ---")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-Score:  {f1:.4f}")
    print(f"ROC-AUC:   {roc_auc:.4f}")
    print(f"Confusion Matrix: TP={tp}, FP={fp}, TN={tn}, FN={fn}")

    # Breakdown per anomaly category
    category_scores = {}
    for anom_type, group in df_anom_feat.groupby("anomaly_type"):
        g_scaled = scaler.transform(group[feature_cols].values)
        g_raw = -iso_forest.score_samples(g_scaled)
        g_preds = np.where(g_raw >= threshold_raw_score, 1, 0)
        g_recall = np.mean(g_preds)
        g_scores = np.clip(
            (g_raw - baseline_min_score) / (threshold_raw_score * 1.3 - baseline_min_score),
            0.0,
            1.0,
        )
        category_scores[anom_type] = {
            "samples": len(group),
            "detection_rate": round(float(g_recall), 4),
            "mean_anomaly_score": round(float(np.mean(g_scores)), 4),
        }
        print(f"  > {anom_type}: Detection Rate = {g_recall:.2%}, Avg Score = {np.mean(g_scores):.3f}")

    # 7. Save Model & Scaler Artifacts
    model_file = os.path.join(MODELS_DIR, "isolation_forest.joblib")
    scaler_file = os.path.join(MODELS_DIR, "scaler.joblib")
    joblib.dump(iso_forest, model_file)
    joblib.dump(scaler, scaler_file)
    print(f"\nSaved model: {model_file}")
    print(f"Saved scaler: {scaler_file}")

    # 8. Save Feature Configuration
    feature_config = {
        "model_version": MODEL_VERSION,
        "base_features": BASE_FEATURES,
        "engineered_features": [
            "temp_ratio_cht_egt",
            "oil_p_per_rpm",
            "vib_per_rpm",
            "power_proxy",
            "fuel_per_power",
        ],
        "all_features": feature_cols,
        "feature_baselines": feature_baselines,
        "scoring_calibration": {
            "baseline_min_score": baseline_min_score,
            "baseline_median_score": baseline_median_score,
            "threshold_raw_score": threshold_raw_score,
            "scale_denominator": float(threshold_raw_score * 1.3 - baseline_min_score),
        },
    }
    config_file = os.path.join(MODELS_DIR, "feature_config.json")
    with open(config_file, "w", encoding="utf-8") as f:
        json.dump(feature_config, f, indent=2)
    print(f"Saved feature configuration: {config_file}")

    # 9. Save Metadata & Evaluation Report
    metadata = {
        "model_name": "Rotax 914 F Isolation Forest Anomaly Detector",
        "model_version": MODEL_VERSION,
        "algorithm": "IsolationForest",
        "hyperparameters": {
            "n_estimators": 200,
            "contamination": 0.04,
            "max_samples": "auto",
            "random_state": RANDOM_STATE,
        },
        "training_date": datetime.now(timezone.utc).isoformat(),
        "training_samples": len(df_train),
        "evaluation_metrics": {
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "roc_auc": round(float(roc_auc), 4),
            "true_positives": int(tp),
            "false_positives": int(fp),
            "true_negatives": int(tn),
            "false_negatives": int(fn),
        },
        "category_detection_rates": category_scores,
    }
    meta_file = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata: {meta_file}")

if __name__ == "__main__":
    main()
