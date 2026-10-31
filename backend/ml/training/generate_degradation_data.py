"""
VYOM MALE UAV - Synthetic Degradation Sequence Generator (Phase 9)
Generates physical degradation trajectories for Rotax 914 F aero-piston engines.

DISCLAIMER & LIMITATION:
This dataset is synthetically generated using physical aero-engine degradation
equations (thermal wear, bearing friction, injector fouling, and turbocharger wear)
for experimental prototype validation in the VYOM Digital Twin platform.
It is NOT certified operational flight data from certified aircraft operators.
"""

import os
import json
import numpy as np
import pandas as pd

def generate_engine_trajectory(
    engine_id: str,
    target_failure_hours: float,
    degradation_profile: str,
    random_seed: int = 42,
    num_samples: int = 400
):
    np.random.seed(random_seed)
    # Time points from 0 to failure hours
    hours = np.linspace(0, target_failure_hours, num_samples)
    cycles = hours / 3.3  # Average 3.3 hours per MALE UAV sortie

    records = []
    
    # Baseline nominal conditions
    base_rpm = 2450.0
    base_cht = 178.0
    base_egt = 618.0
    base_oil_p = 4.30
    base_oil_t = 94.0
    base_fuel = 12.20
    base_vib = 0.26
    base_map = 31.0

    for h, c in zip(hours, cycles):
        # Normalized life fraction [0.0, 1.0]
        life_fraction = h / target_failure_hours
        rul_hours = max(0.0, target_failure_hours - h)
        rul_cycles = max(0.0, rul_hours / 3.3)

        # Operational jitter
        rpm_jitter = np.random.normal(0, 15)
        rpm = base_rpm + rpm_jitter

        # Degradation progression depending on profile
        # Exponential / power law wear models: wear = wear_rate * (t / T)^alpha
        thermal_wear = (life_fraction ** 2.2) * 28.0
        bearing_wear = (life_fraction ** 2.5) * 0.38
        oil_p_drop = (life_fraction ** 1.8) * 1.85
        oil_t_rise = (life_fraction ** 2.0) * 18.0
        fuel_fouling = (life_fraction ** 1.9) * 2.20
        map_drift = (life_fraction ** 2.1) * 3.50

        # Apply degradation with sensor noise
        cht = base_cht + thermal_wear + np.random.normal(0, 1.8)
        egt = base_egt + (thermal_wear * 0.7) + np.random.normal(0, 3.5)
        oil_pressure = max(1.5, base_oil_p - oil_p_drop + np.random.normal(0, 0.05))
        oil_temperature = base_oil_t + oil_t_rise + np.random.normal(0, 1.2)
        vibration_rms = base_vib + bearing_wear + np.random.normal(0, 0.015)
        fuel_flow = base_fuel + fuel_fouling + np.random.normal(0, 0.12)
        map_inhg = max(25.0, base_map - map_drift + np.random.normal(0, 0.3))

        # Health degradation indices [0.0 - 100.0%]
        cyl_health = max(10.0, 100.0 - (life_fraction ** 1.9) * 85.0)
        oil_health = max(10.0, 100.0 - (life_fraction ** 1.8) * 82.0)
        vib_health = max(10.0, 100.0 - (life_fraction ** 2.2) * 88.0)
        fuel_health = max(15.0, 100.0 - (life_fraction ** 2.0) * 78.0)
        turbo_health = max(15.0, 100.0 - (life_fraction ** 2.1) * 80.0)
        sensor_health = max(30.0, 100.0 - (life_fraction ** 1.5) * 60.0)

        overall_health = (
            0.25 * cyl_health +
            0.20 * oil_health +
            0.20 * vib_health +
            0.15 * turbo_health +
            0.10 * fuel_health +
            0.10 * sensor_health
        )

        # Anomaly score approximation from degradation state
        anomaly_score = float(np.clip(0.12 + (life_fraction ** 2.5) * 0.80 + np.random.normal(0, 0.02), 0.05, 0.99))

        # Degradation phase classification
        if life_fraction < 0.50:
            phase = "Nominal"
        elif life_fraction < 0.75:
            phase = "Early_Degradation"
        elif life_fraction < 0.90:
            phase = "Accelerated_Wear"
        else:
            phase = "End_Of_Life"

        records.append({
            "engine_id": engine_id,
            "flight_hours": round(float(h), 2),
            "flight_cycles": round(float(c), 1),
            "rpm": round(float(rpm), 1),
            "cht": round(float(cht), 2),
            "egt": round(float(egt), 2),
            "oil_pressure": round(float(oil_pressure), 3),
            "oil_temperature": round(float(oil_temperature), 2),
            "fuel_flow": round(float(fuel_flow), 2),
            "vibration_rms": round(float(vibration_rms), 3),
            "map_inhg": round(float(map_inhg), 2),
            "anomaly_score": round(anomaly_score, 3),
            "degradation_phase": phase,
            "overall_health_percent": round(overall_health, 1),
            "cylinder_health_percent": round(cyl_health, 1),
            "oil_health_percent": round(oil_health, 1),
            "vibration_health_percent": round(vib_health, 1),
            "fuel_health_percent": round(fuel_health, 1),
            "turbo_health_percent": round(turbo_health, 1),
            "actual_rul_hours": round(float(rul_hours), 2),
            "actual_rul_cycles": round(float(rul_cycles), 1),
        })

    return records

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    datasets_dir = os.path.join(base_dir, "datasets")
    os.makedirs(datasets_dir, exist_ok=True)

    # 12 Engine units with varied operational lives (nominal TBO 2000 hours +- 250h)
    engines_config = [
        {"id": "ENG-ROTAX-01", "tbo": 2000.0, "profile": "Nominal_Cruise", "seed": 101, "split": "TRAIN"},
        {"id": "ENG-ROTAX-02", "tbo": 1850.0, "profile": "High_Thermal_Stress", "seed": 102, "split": "TRAIN"},
        {"id": "ENG-ROTAX-03", "tbo": 2150.0, "profile": "Gentle_Low_Altitude", "seed": 103, "split": "TRAIN"},
        {"id": "ENG-ROTAX-04", "tbo": 1920.0, "profile": "High_Vibration_Harsh", "seed": 104, "split": "TRAIN"},
        {"id": "ENG-ROTAX-05", "tbo": 2050.0, "profile": "Nominal_Patrol", "seed": 105, "split": "TRAIN"},
        {"id": "ENG-ROTAX-06", "tbo": 1780.0, "profile": "Accelerated_Oil_Degrade", "seed": 106, "split": "TRAIN"},
        {"id": "ENG-ROTAX-07", "tbo": 2080.0, "profile": "Nominal_Extended_Loiter", "seed": 107, "split": "TRAIN"},
        {"id": "ENG-ROTAX-08", "tbo": 1960.0, "profile": "Cyclic_Combat_Sim", "seed": 108, "split": "TRAIN"},
        {"id": "ENG-ROTAX-09", "tbo": 1890.0, "profile": "Thermal_Cycle_Stress", "seed": 109, "split": "VAL"},
        {"id": "ENG-ROTAX-10", "tbo": 2020.0, "profile": "Nominal_Long_Range", "seed": 110, "split": "VAL"},
        {"id": "ENG-ROTAX-11", "tbo": 1940.0, "profile": "Harsh_Mountainous", "seed": 111, "split": "TEST"},
        {"id": "ENG-ROTAX-12", "tbo": 2100.0, "profile": "Nominal_Benchmark", "seed": 112, "split": "TEST"},
    ]

    all_records = []
    for cfg in engines_config:
        records = generate_engine_trajectory(
            engine_id=cfg["id"],
            target_failure_hours=cfg["tbo"],
            degradation_profile=cfg["profile"],
            random_seed=cfg["seed"],
            num_samples=400,
        )
        for r in records:
            r["split"] = cfg["split"]
            r["profile"] = cfg["profile"]
        all_records.extend(records)

    df = pd.DataFrame(all_records)
    csv_path = os.path.join(datasets_dir, "degradation_sequences.csv")
    df.to_csv(csv_path, index=False)
    print(f"Generated {len(df)} degradation records across 12 engine trajectories saved to {csv_path}")

    # Provenance documentation
    provenance = {
        "dataset_name": "Rotax 914 F Synthetic Degradation Sequences",
        "version": "1.0.0",
        "creation_date": "2026-10-31",
        "data_type": "SYNTHETIC_PHYSICAL_MODEL",
        "is_certified_aircraft_data": False,
        "purpose": "Experimental prototype training & validation for VYOM Digital Twin RUL Regressor",
        "engine_model": "Rotax 914 F Turbocharged 4-cylinder 4-stroke",
        "nominal_tbo_hours": 2000.0,
        "total_records": len(df),
        "engine_trajectories_count": len(engines_config),
        "split_counts": {
            "TRAIN": int((df["split"] == "TRAIN").sum()),
            "VAL": int((df["split"] == "VAL").sum()),
            "TEST": int((df["split"] == "TEST").sum()),
        },
        "monitored_parameters": [
            "flight_hours", "flight_cycles", "rpm", "cht", "egt",
            "oil_pressure", "oil_temperature", "fuel_flow", "vibration_rms",
            "map_inhg", "anomaly_score"
        ],
        "target_parameters": ["actual_rul_hours", "actual_rul_cycles", "overall_health_percent"],
        "degradation_models": [
            "Thermal CHT quadratic scaling (carbon/cooling jacket decay)",
            "Oil pressure power-law decay (main journal bearing clearance wear)",
            "Vibration exponential rise (crankshaft race/imbalance fatigue)",
            "Fuel flow efficiency decay (fuel injector nozzle fouling)",
            "Turbocharger manifold pressure drop (wastegate seal wear)"
        ],
        "limitations": [
            "Synthetic data generated via non-linear deterministic degradation physics with Gaussian noise.",
            "Must NOT be utilized for operational flight release decisions on real-world aircraft."
        ]
    }

    prov_path = os.path.join(datasets_dir, "degradation_provenance.json")
    with open(prov_path, "w") as f:
        json.dump(provenance, f, indent=2)
    print(f"Dataset provenance metadata written to {prov_path}")

if __name__ == "__main__":
    main()

