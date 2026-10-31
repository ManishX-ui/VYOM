# VYOM MALE UAV Digital Twin Platform – Known Limitations & Non-Claim Disclaimers

**Document Version:** 1.0.0  
**Phase:** Phase 13 Hardening  
**Target Audience:** System Integrators, Flight Test Engineers, Ground Station Operators  

---

## 1. Actual vs. Simulated Functionality

| Subsystem | Actual / Operational Capability | Simulated / Estimated Aspect |
|---|---|---|
| **Propulsion Kinematics** | Mechanical Rotax 914 F gearbox reduction ratio ($2.43:1$) and continuous propeller angular velocity $\omega = \text{RPM} \times \frac{2\pi}{60}$. | Aerodynamic thrust coefficients and propeller slipstream interaction are simplified for real-time WebGL rendering. |
| **Control Surfaces** | Actuator deflection limits ($\pm 20^\circ$ ailerons, $\pm 15^\circ$ elevator, $\pm 20^\circ$ rudder, $0-30^\circ$ flaps) and opposing differential roll deflection. | When real actuator encoder feedback (e.g. MAVLink `SERVO_OUTPUT_RAW`) is absent, deflection angles are aerodynamically estimated from Euler attitude angles ($\phi, \theta, \psi$). |
| **GCS Datalink Integration** | Genuine MAVLink v1/v2 message decoding (`pymavlink`) and MQTT broker subscription (`paho-mqtt`) with freshness and checksum validation. | Flight tests require physical RF/cellular datalink modems (e.g. Silvus, Microhard, or Satcom terminal) connected to the host network interface. |
| **Flight Control Architecture** | Telemetry reception, monitoring, alert detection, and health diagnostics are fully active. | **No flight control commands, waypoint uploads, or servo overrides** are implemented. The platform is strictly a read-only monitoring and digital twin platform. |
| **Machine Learning Anomaly Detection** | Genuine Scikit-Learn Isolation Forest ensemble (200 estimators, 13 features) with z-score sensor attribution. | Trained on synthetic thermodynamic degradation sequences; performance must be treated as an experimental prototype estimate rather than certified airworthiness detection. |
| **Predictive Maintenance & RUL** | Multi-subsystem Random Forest regressor with 95% confidence intervals and dynamic degradation forecasting. | RUL estimates are decision-support indications for bench maintenance scheduling, not legally binding aircraft release criteria. |

---

## 2. Technical Limitations & Operational Constraints

1. **Browser Hardware Acceleration:**
   - The 3D Digital Twin Synchronizer relies on WebGL 2.0 via Three.js. Systems with disabled hardware acceleration or outdated GPU drivers will experience reduced framerates.
2. **MAVLink High-Rate Baudrates:**
   - High-frequency Serial MAVLink connections (> 921,600 baud) over USB virtual COM ports require low-latency FTDI drivers on Windows hosts.
3. **Network Latency Thresholds:**
   - The telemetry validator rejects packets older than 60 seconds. High-latency satellite datalinks with intermittent dropouts should configure NTP synchronization on the UAV flight computer and ground station server.
4. **Synthetic Data Provenance:**
   - Both Isolation Forest and RUL models were developed using thermodynamic simulation and empirical test bench curves of the Rotax 914 F. Operational deployment with physical flight engines should collect fleet telemetry to refine model hyperparameters.

