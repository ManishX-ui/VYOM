"""
VYOM Centralized Mission Replay & Historical Telemetry Service
Phase 7 - Historical Mission Archive & Synchronization Engine
"""

from typing import List, Dict, Any, Optional
import math

MISSIONS_DATABASE: List[Dict[str, Any]] = [
    {
        "id": "Surveillance_2026_10_23_01",
        "uav_id": "UAV-ROTAX-001",
        "name": "Northern Tactical Border Surveillance #04",
        "type": "MALE UAV High-Altitude ISR",
        "date": "23 Oct 2026",
        "startTime": "14:15:00 UTC",
        "endTime": "16:45:00 UTC",
        "duration": "02h 30m",
        "totalDistanceKm": 242.6,
        "maxAltitudeFt": 22400.0,
        "avgSpeedMs": 34.2,
        "maxSpeedMs": 38.6,
        "status": "Completed",
        "telemetryAvailable": True,
        "dataSource": "FLIGHT_LOG_ARCHIVE",
        "fuelUsedLiters": 34.8,
        "sensorWarningsCount": 1,
        "anomalyCount": 0,
        "waypoints": [
            {"lat": 21.2485, "lng": 81.6202, "alt": 14500.0, "label": "ALPHA (Takeoff / Climb)", "type": "start"},
            {"lat": 21.2685, "lng": 81.6502, "alt": 18000.0, "label": "BRAVO (Ascent Transition)", "type": "waypoint"},
            {"lat": 21.2950, "lng": 81.6850, "alt": 21500.0, "label": "CHARLIE (ISR Pattern Entry)", "type": "waypoint"},
            {"lat": 21.3250, "lng": 81.7150, "alt": 22400.0, "label": "DELTA (Primary Loiter Zone)", "type": "surveillance"},
            {"lat": 21.3050, "lng": 81.7450, "alt": 22100.0, "label": "ECHO (Perimeter Scan)", "type": "waypoint"},
            {"lat": 21.2720, "lng": 81.7100, "alt": 19500.0, "label": "FOXTROT (Descent Gate)", "type": "waypoint"},
            {"lat": 21.2485, "lng": 81.6202, "alt": 14500.0, "label": "HOME (Recovery / RTB)", "type": "end"},
        ],
        "timeline": [
            {"time": "14:15:00", "timestamp": "2026-10-23T14:15:00Z", "lat": 21.2485, "lng": 81.6202, "altitude": 14500.0, "speed": 28.4, "battery": 99.0, "heading": 42.0, "rpm": 2580, "cht": 178.0, "egt": 612.0, "oilPressure": 4.4, "oilTemperature": 92.0, "fuelFlow": 14.8, "vibration": 0.22, "manifoldPressureInHg": 33.5, "batteryVoltage": 28.4, "batteryCurrent": 13.8, "engineHealth": 98.0, "roll": 0.5, "pitch": 3.8, "verticalSpeed": 3.5, "coolantTemp": 84.0, "fuelPressure": 3.2, "segmentType": "Normal Flight"},
            {"time": "14:20:15", "timestamp": "2026-10-23T14:20:15Z", "lat": 21.2585, "lng": 81.6352, "altitude": 16200.0, "speed": 31.0, "battery": 97.0, "heading": 44.0, "rpm": 2520, "cht": 182.0, "egt": 618.0, "oilPressure": 4.3, "oilTemperature": 93.5, "fuelFlow": 13.9, "vibration": 0.25, "manifoldPressureInHg": 32.8, "batteryVoltage": 28.3, "batteryCurrent": 14.1, "engineHealth": 97.0, "roll": 1.2, "pitch": 2.5, "verticalSpeed": 2.8, "coolantTemp": 86.0, "fuelPressure": 3.2, "segmentType": "Normal Flight"},
            {"time": "14:28:43", "timestamp": "2026-10-23T14:28:43Z", "lat": 21.2685, "lng": 81.6502, "altitude": 18000.0, "speed": 32.1, "battery": 94.0, "heading": 45.0, "rpm": 2450, "cht": 187.0, "egt": 622.0, "oilPressure": 4.2, "oilTemperature": 95.0, "fuelFlow": 12.5, "vibration": 0.28, "manifoldPressureInHg": 31.2, "batteryVoltage": 28.2, "batteryCurrent": 14.5, "engineHealth": 96.0, "roll": 0.0, "pitch": 1.5, "verticalSpeed": 1.2, "coolantTemp": 88.0, "fuelPressure": 3.2, "segmentType": "Normal Flight"},
            {"time": "14:42:10", "timestamp": "2026-10-23T14:42:10Z", "lat": 21.2950, "lng": 81.6850, "altitude": 21500.0, "speed": 35.4, "battery": 89.0, "heading": 40.0, "rpm": 2480, "cht": 189.0, "egt": 628.0, "oilPressure": 4.1, "oilTemperature": 96.5, "fuelFlow": 12.2, "vibration": 0.29, "manifoldPressureInHg": 31.0, "batteryVoltage": 28.2, "batteryCurrent": 14.8, "engineHealth": 95.0, "roll": 2.1, "pitch": 1.0, "verticalSpeed": 0.5, "coolantTemp": 89.0, "fuelPressure": 3.1, "segmentType": "High Altitude"},
            {"time": "15:05:00", "timestamp": "2026-10-23T15:05:00Z", "lat": 21.3250, "lng": 81.7150, "altitude": 22400.0, "speed": 33.8, "battery": 81.0, "heading": 110.0, "rpm": 2450, "cht": 186.0, "egt": 620.0, "oilPressure": 4.2, "oilTemperature": 95.8, "fuelFlow": 11.9, "vibration": 0.27, "manifoldPressureInHg": 30.8, "batteryVoltage": 28.1, "batteryCurrent": 15.0, "engineHealth": 95.0, "roll": 4.5, "pitch": 0.5, "verticalSpeed": 0.0, "coolantTemp": 87.5, "fuelPressure": 3.2, "segmentType": "Surveillance Area"},
            {"time": "15:22:18", "timestamp": "2026-10-23T15:22:18Z", "lat": 21.3150, "lng": 81.7300, "altitude": 22350.0, "speed": 34.5, "battery": 76.0, "heading": 155.0, "rpm": 2470, "cht": 192.5, "egt": 634.0, "oilPressure": 4.15, "oilTemperature": 97.2, "fuelFlow": 12.4, "vibration": 0.31, "manifoldPressureInHg": 31.2, "batteryVoltage": 28.1, "batteryCurrent": 15.2, "engineHealth": 93.0, "roll": 3.8, "pitch": 0.2, "verticalSpeed": 0.0, "coolantTemp": 90.0, "fuelPressure": 3.1, "segmentType": "Surveillance Area"},
            {"time": "15:38:22", "timestamp": "2026-10-23T15:38:22Z", "lat": 21.3050, "lng": 81.7450, "altitude": 22100.0, "speed": 34.0, "battery": 72.0, "heading": 195.0, "rpm": 2460, "cht": 188.0, "egt": 624.0, "oilPressure": 4.2, "oilTemperature": 96.0, "fuelFlow": 12.1, "vibration": 0.28, "manifoldPressureInHg": 31.0, "batteryVoltage": 28.0, "batteryCurrent": 15.1, "engineHealth": 94.0, "roll": 5.2, "pitch": 0.0, "verticalSpeed": 0.0, "coolantTemp": 88.0, "fuelPressure": 3.2, "segmentType": "Surveillance Area"},
            {"time": "15:52:45", "timestamp": "2026-10-23T15:52:45Z", "lat": 21.2880, "lng": 81.7280, "altitude": 21000.0, "speed": 35.8, "battery": 68.0, "heading": 210.0, "rpm": 2410, "cht": 184.0, "egt": 615.0, "oilPressure": 4.25, "oilTemperature": 95.0, "fuelFlow": 11.8, "vibration": 0.27, "manifoldPressureInHg": 30.2, "batteryVoltage": 28.0, "batteryCurrent": 14.7, "engineHealth": 95.0, "roll": 2.5, "pitch": -1.2, "verticalSpeed": -1.5, "coolantTemp": 87.0, "fuelPressure": 3.2, "segmentType": "Turn/Manoeuvre"},
            {"time": "16:02:15", "timestamp": "2026-10-23T16:02:15Z", "lat": 21.2720, "lng": 81.7100, "altitude": 19500.0, "speed": 36.5, "battery": 64.0, "heading": 220.0, "rpm": 2350, "cht": 181.0, "egt": 608.0, "oilPressure": 4.3, "oilTemperature": 94.0, "fuelFlow": 11.2, "vibration": 0.26, "manifoldPressureInHg": 29.5, "batteryVoltage": 28.1, "batteryCurrent": 14.3, "engineHealth": 95.0, "roll": 1.0, "pitch": -2.0, "verticalSpeed": -2.5, "coolantTemp": 85.0, "fuelPressure": 3.2, "segmentType": "Return"},
            {"time": "16:22:30", "timestamp": "2026-10-23T16:22:30Z", "lat": 21.2600, "lng": 81.6650, "altitude": 16800.0, "speed": 33.2, "battery": 58.0, "heading": 222.0, "rpm": 2240, "cht": 174.0, "egt": 595.0, "oilPressure": 4.38, "oilTemperature": 92.5, "fuelFlow": 10.4, "vibration": 0.25, "manifoldPressureInHg": 28.5, "batteryVoltage": 28.1, "batteryCurrent": 14.0, "engineHealth": 96.0, "roll": 0.8, "pitch": -1.8, "verticalSpeed": -2.2, "coolantTemp": 82.0, "fuelPressure": 3.2, "segmentType": "Return"},
            {"time": "16:38:10", "timestamp": "2026-10-23T16:38:10Z", "lat": 21.2520, "lng": 81.6350, "altitude": 15100.0, "speed": 30.5, "battery": 54.0, "heading": 224.0, "rpm": 2160, "cht": 169.0, "egt": 588.0, "oilPressure": 4.45, "oilTemperature": 91.0, "fuelFlow": 10.0, "vibration": 0.24, "manifoldPressureInHg": 27.8, "batteryVoltage": 28.2, "batteryCurrent": 13.7, "engineHealth": 97.0, "roll": 0.4, "pitch": -1.0, "verticalSpeed": -1.2, "coolantTemp": 80.0, "fuelPressure": 3.3, "segmentType": "Return"},
            {"time": "16:45:00", "timestamp": "2026-10-23T16:45:00Z", "lat": 21.2485, "lng": 81.6202, "altitude": 14500.0, "speed": 29.2, "battery": 52.0, "heading": 225.0, "rpm": 2100, "cht": 165.0, "egt": 580.0, "oilPressure": 4.5, "oilTemperature": 90.0, "fuelFlow": 9.8, "vibration": 0.24, "manifoldPressureInHg": 27.2, "batteryVoltage": 28.2, "batteryCurrent": 13.5, "engineHealth": 97.0, "roll": 0.0, "pitch": 0.0, "verticalSpeed": 0.0, "coolantTemp": 78.0, "fuelPressure": 3.3, "segmentType": "Return"},
        ],
        "events": [
            {"time": "14:15:00", "title": "Wheels-up Takeoff & Turbo Spool Up", "coordinates": "21.2485° N, 81.6202° E", "type": "start", "description": "Rotax 914 F nominal climb boost engaged at MAP 33.5 inHg."},
            {"time": "14:28:43", "title": "Waypoint BRAVO Reached @ FL180", "coordinates": "21.2685° N, 81.6502° E", "type": "waypoint", "description": "Cruising envelope stable, CHT 187°C within optimal boundary."},
            {"time": "14:42:10", "title": "Ascent to FL215 Completed", "coordinates": "21.2950° N, 81.6850° E", "type": "segment", "description": "High altitude transition verified; turbo boost regulation active."},
            {"time": "15:05:00", "title": "Loiter Entry: Tactical Airspace Delta", "coordinates": "21.3250° N, 81.7150° E", "type": "area", "description": "Entered designated ISR sector, commencing optical camera scan."},
            {"time": "15:22:18", "title": "Transient CHT Thermal Rise Warning", "coordinates": "21.3150° N, 81.7300° E", "type": "warning", "description": "CHT transiently reached 192.5°C during high bank turn; resolved safely."},
            {"time": "15:38:22", "title": "Waypoint ECHO Loiter Cycle Complete", "coordinates": "21.3050° N, 81.7450° E", "type": "waypoint", "description": "Surveillance patterns completed, telemetry nominal."},
            {"time": "16:02:15", "title": "Descent Vector Initiated Towards Base", "coordinates": "21.2720° N, 81.7100° E", "type": "return", "description": "Throttle set to descent power, MAP 29.5 inHg."},
            {"time": "16:45:00", "title": "Mission RTB Final Approach & Touchdown", "coordinates": "21.2485° N, 81.6202° E", "type": "completed", "description": "Safe recovery at base. Engine cooled down to 165°C."},
        ],
    },
    {
        "id": "Border_Patrol_Alpha_02",
        "uav_id": "UAV-ROTAX-001",
        "name": "Sector Bravo Border Patrol",
        "type": "Patrol / Reconnaissance",
        "date": "24 Oct 2026",
        "startTime": "09:30:00 UTC",
        "endTime": "11:15:00 UTC",
        "duration": "01h 45m",
        "totalDistanceKm": 184.2,
        "maxAltitudeFt": 18500.0,
        "avgSpeedMs": 31.8,
        "maxSpeedMs": 35.4,
        "status": "Completed",
        "telemetryAvailable": True,
        "dataSource": "FLIGHT_LOG_ARCHIVE",
        "fuelUsedLiters": 24.5,
        "sensorWarningsCount": 0,
        "anomalyCount": 0,
        "waypoints": [
            {"lat": 21.160, "lng": 81.280, "alt": 12000.0, "label": "BASE (Airbase R-09)", "type": "start"},
            {"lat": 21.320, "lng": 81.450, "alt": 15000.0, "label": "PATROL-1", "type": "waypoint"},
            {"lat": 21.480, "lng": 81.620, "alt": 18500.0, "label": "CORRIDOR-BRAVO", "type": "surveillance"},
            {"lat": 21.360, "lng": 81.820, "alt": 18200.0, "label": "PATROL-2", "type": "waypoint"},
            {"lat": 21.160, "lng": 81.280, "alt": 12000.0, "label": "RECOVERY", "type": "end"},
        ],
        "timeline": [
            {"time": "09:30:00", "timestamp": "2026-10-24T09:30:00Z", "lat": 21.160, "lng": 81.280, "altitude": 12000.0, "speed": 27.5, "battery": 98.0, "heading": 35.0, "rpm": 2540, "cht": 175.0, "egt": 605.0, "oilPressure": 4.4, "oilTemperature": 91.0, "fuelFlow": 14.2, "vibration": 0.23, "manifoldPressureInHg": 32.5, "batteryVoltage": 28.3, "batteryCurrent": 14.0, "engineHealth": 98.0, "roll": 0.8, "pitch": 3.0, "verticalSpeed": 3.0, "coolantTemp": 82.0, "fuelPressure": 3.2, "segmentType": "Normal Flight"},
            {"time": "09:48:12", "timestamp": "2026-10-24T09:48:12Z", "lat": 21.240, "lng": 81.365, "altitude": 14200.0, "speed": 30.2, "battery": 94.0, "heading": 38.0, "rpm": 2490, "cht": 180.0, "egt": 612.0, "oilPressure": 4.3, "oilTemperature": 93.0, "fuelFlow": 13.1, "vibration": 0.25, "manifoldPressureInHg": 31.8, "batteryVoltage": 28.2, "batteryCurrent": 14.2, "engineHealth": 97.0, "roll": 1.0, "pitch": 2.0, "verticalSpeed": 2.2, "coolantTemp": 85.0, "fuelPressure": 3.2, "segmentType": "Normal Flight"},
            {"time": "10:05:00", "timestamp": "2026-10-24T10:05:00Z", "lat": 21.320, "lng": 81.450, "altitude": 15000.0, "speed": 31.5, "battery": 89.0, "heading": 40.0, "rpm": 2450, "cht": 183.0, "egt": 616.0, "oilPressure": 4.25, "oilTemperature": 94.2, "fuelFlow": 12.4, "vibration": 0.26, "manifoldPressureInHg": 31.0, "batteryVoltage": 28.2, "batteryCurrent": 14.5, "engineHealth": 96.0, "roll": 1.5, "pitch": 1.2, "verticalSpeed": 1.0, "coolantTemp": 86.5, "fuelPressure": 3.2, "segmentType": "Normal Flight"},
            {"time": "10:24:45", "timestamp": "2026-10-24T10:24:45Z", "lat": 21.410, "lng": 81.540, "altitude": 17200.0, "speed": 33.0, "battery": 83.0, "heading": 42.0, "rpm": 2470, "cht": 186.0, "egt": 622.0, "oilPressure": 4.2, "oilTemperature": 95.5, "fuelFlow": 12.2, "vibration": 0.27, "manifoldPressureInHg": 31.1, "batteryVoltage": 28.1, "batteryCurrent": 14.8, "engineHealth": 96.0, "roll": 0.5, "pitch": 1.5, "verticalSpeed": 1.4, "coolantTemp": 88.0, "fuelPressure": 3.1, "segmentType": "High Altitude"},
            {"time": "10:40:00", "timestamp": "2026-10-24T10:40:00Z", "lat": 21.480, "lng": 81.620, "altitude": 18500.0, "speed": 34.0, "battery": 77.0, "heading": 95.0, "rpm": 2460, "cht": 188.0, "egt": 624.0, "oilPressure": 4.2, "oilTemperature": 96.0, "fuelFlow": 12.0, "vibration": 0.28, "manifoldPressureInHg": 31.0, "batteryVoltage": 28.1, "batteryCurrent": 15.0, "engineHealth": 95.0, "roll": 4.2, "pitch": 0.0, "verticalSpeed": 0.0, "coolantTemp": 88.5, "fuelPressure": 3.1, "segmentType": "Surveillance Area"},
            {"time": "10:55:30", "timestamp": "2026-10-24T10:55:30Z", "lat": 21.420, "lng": 81.720, "altitude": 18400.0, "speed": 33.5, "battery": 71.0, "heading": 135.0, "rpm": 2450, "cht": 186.5, "egt": 620.0, "oilPressure": 4.22, "oilTemperature": 95.2, "fuelFlow": 11.9, "vibration": 0.27, "manifoldPressureInHg": 30.8, "batteryVoltage": 28.0, "batteryCurrent": 14.9, "engineHealth": 95.0, "roll": 3.0, "pitch": 0.0, "verticalSpeed": 0.0, "coolantTemp": 87.8, "fuelPressure": 3.2, "segmentType": "Surveillance Area"},
            {"time": "11:05:00", "timestamp": "2026-10-24T11:05:00Z", "lat": 21.360, "lng": 81.820, "altitude": 18200.0, "speed": 35.4, "battery": 66.0, "heading": 215.0, "rpm": 2380, "cht": 182.0, "egt": 612.0, "oilPressure": 4.28, "oilTemperature": 94.0, "fuelFlow": 11.5, "vibration": 0.26, "manifoldPressureInHg": 29.8, "batteryVoltage": 28.0, "batteryCurrent": 14.4, "engineHealth": 96.0, "roll": 2.2, "pitch": -1.5, "verticalSpeed": -1.8, "coolantTemp": 86.0, "fuelPressure": 3.2, "segmentType": "Return"},
            {"time": "11:15:00", "timestamp": "2026-10-24T11:15:00Z", "lat": 21.160, "lng": 81.280, "altitude": 12000.0, "speed": 28.0, "battery": 60.0, "heading": 220.0, "rpm": 2150, "cht": 168.0, "egt": 585.0, "oilPressure": 4.45, "oilTemperature": 90.5, "fuelFlow": 10.1, "vibration": 0.24, "manifoldPressureInHg": 27.5, "batteryVoltage": 28.2, "batteryCurrent": 13.8, "engineHealth": 97.0, "roll": 0.0, "pitch": 0.0, "verticalSpeed": 0.0, "coolantTemp": 79.5, "fuelPressure": 3.3, "segmentType": "Return"},
        ],
        "events": [
            {"time": "09:30:00", "title": "Patrol Flight Departure", "coordinates": "21.1600° N, 81.2800° E", "type": "start", "description": "Takeoff from Airbase R-09 on runway 04 heading."},
            {"time": "10:05:00", "title": "Checkpoint PATROL-1 Crossed", "coordinates": "21.3200° N, 81.4500° E", "type": "waypoint", "description": "All engine transducers green, nominal oil pressure 4.25 bar."},
            {"time": "10:40:00", "title": "Sector Bravo Surveillance Entry", "coordinates": "21.4800° N, 81.6200° E", "type": "area", "description": "Commenced lateral radar sweep across state border corridor."},
            {"time": "11:05:00", "title": "RTB Clearance Received", "coordinates": "21.3600° N, 81.8200° E", "type": "return", "description": "Descending inbound to Airbase R-09 recovery sector."},
            {"time": "11:15:00", "title": "Safe Recovery & Hangar Taxi", "coordinates": "21.1600° N, 81.2800° E", "type": "completed", "description": "Mission successfully logged. 24.5 liters fuel consumed."},
        ],
    },
    {
        "id": "High_Altitude_Test_03",
        "uav_id": "UAV-ROTAX-002",
        "name": "Engine High-Altitude Envelope Validation",
        "type": "Propulsion Test Flight",
        "date": "26 Oct 2026",
        "startTime": "06:00:00 UTC",
        "endTime": "08:15:00 UTC",
        "duration": "02h 15m",
        "totalDistanceKm": 298.0,
        "maxAltitudeFt": 24000.0,
        "avgSpeedMs": 36.5,
        "maxSpeedMs": 41.2,
        "status": "Completed",
        "telemetryAvailable": True,
        "dataSource": "FLIGHT_LOG_ARCHIVE",
        "fuelUsedLiters": 42.0,
        "sensorWarningsCount": 2,
        "anomalyCount": 1,
        "waypoints": [
            {"lat": 21.160, "lng": 81.280, "alt": 10000.0, "label": "RUNWAY-04", "type": "start"},
            {"lat": 21.350, "lng": 81.550, "alt": 18000.0, "label": "TEST-STEP-1", "type": "waypoint"},
            {"lat": 21.550, "lng": 81.850, "alt": 24000.0, "label": "CEILING-TEST-ZONE", "type": "surveillance"},
            {"lat": 21.300, "lng": 81.600, "alt": 16000.0, "label": "DESCENT-GATE", "type": "waypoint"},
            {"lat": 21.160, "lng": 81.280, "alt": 10000.0, "label": "RUNWAY-RECOVERY", "type": "end"},
        ],
        "timeline": [
            {"time": "06:00:00", "timestamp": "2026-10-26T06:00:00Z", "lat": 21.160, "lng": 81.280, "altitude": 10000.0, "speed": 29.0, "battery": 100.0, "heading": 30.0, "rpm": 2600, "cht": 174.0, "egt": 620.0, "oilPressure": 4.5, "oilTemperature": 90.0, "fuelFlow": 15.2, "vibration": 0.24, "manifoldPressureInHg": 34.0, "batteryVoltage": 28.5, "batteryCurrent": 13.5, "engineHealth": 98.0, "roll": 0.0, "pitch": 4.0, "verticalSpeed": 4.0, "coolantTemp": 82.0, "fuelPressure": 3.3, "segmentType": "Normal Flight"},
            {"time": "06:30:00", "timestamp": "2026-10-26T06:30:00Z", "lat": 21.350, "lng": 81.550, "altitude": 18000.0, "speed": 34.2, "battery": 92.0, "heading": 32.0, "rpm": 2620, "cht": 192.0, "egt": 655.0, "oilPressure": 4.3, "oilTemperature": 98.0, "fuelFlow": 18.0, "vibration": 0.30, "manifoldPressureInHg": 36.5, "batteryVoltage": 28.3, "batteryCurrent": 14.8, "engineHealth": 95.0, "roll": 1.2, "pitch": 3.2, "verticalSpeed": 3.2, "coolantTemp": 91.0, "fuelPressure": 3.2, "segmentType": "High Altitude"},
            {"time": "07:05:00", "timestamp": "2026-10-26T07:05:00Z", "lat": 21.550, "lng": 81.850, "altitude": 24000.0, "speed": 41.2, "battery": 82.0, "heading": 85.0, "rpm": 2680, "cht": 204.0, "egt": 678.0, "oilPressure": 4.1, "oilTemperature": 103.5, "fuelFlow": 20.8, "vibration": 0.38, "manifoldPressureInHg": 38.0, "batteryVoltage": 28.1, "batteryCurrent": 15.6, "engineHealth": 90.0, "roll": 2.5, "pitch": 0.5, "verticalSpeed": 0.2, "coolantTemp": 96.0, "fuelPressure": 3.0, "segmentType": "High Altitude"},
            {"time": "07:40:00", "timestamp": "2026-10-26T07:40:00Z", "lat": 21.300, "lng": 81.600, "altitude": 16000.0, "speed": 36.0, "battery": 73.0, "heading": 215.0, "rpm": 2280, "cht": 178.0, "egt": 605.0, "oilPressure": 4.35, "oilTemperature": 93.0, "fuelFlow": 11.0, "vibration": 0.25, "manifoldPressureInHg": 29.0, "batteryVoltage": 28.2, "batteryCurrent": 14.2, "engineHealth": 94.0, "roll": 1.0, "pitch": -2.2, "verticalSpeed": -2.8, "coolantTemp": 84.0, "fuelPressure": 3.2, "segmentType": "Return"},
            {"time": "08:15:00", "timestamp": "2026-10-26T08:15:00Z", "lat": 21.160, "lng": 81.280, "altitude": 10000.0, "speed": 28.5, "battery": 65.0, "heading": 220.0, "rpm": 2120, "cht": 166.0, "egt": 575.0, "oilPressure": 4.5, "oilTemperature": 89.0, "fuelFlow": 9.5, "vibration": 0.23, "manifoldPressureInHg": 27.0, "batteryVoltage": 28.3, "batteryCurrent": 13.6, "engineHealth": 96.0, "roll": 0.0, "pitch": 0.0, "verticalSpeed": 0.0, "coolantTemp": 78.0, "fuelPressure": 3.3, "segmentType": "Return"},
        ],
        "events": [
            {"time": "06:00:00", "title": "Engine Test Departure", "coordinates": "21.1600° N, 81.2800° E", "type": "start", "description": "High manifold pressure validation climb initialized."},
            {"time": "06:30:00", "title": "Climb through FL180", "coordinates": "21.3500° N, 81.5500° E", "type": "waypoint", "description": "Turbocharger wastegate holding boost at 36.5 inHg."},
            {"time": "07:05:00", "title": "Maximum Altitude FL240 Achieved", "coordinates": "21.5500° N, 81.8500° E", "type": "area", "description": "Test ceiling reached. CHT 204°C, vibration RMS 0.38g recorded."},
            {"time": "07:40:00", "title": "Descent Corridor Entry", "coordinates": "21.3000° N, 81.6000° E", "type": "return", "description": "Cooling phase verified under idle descent power."},
            {"time": "08:15:00", "title": "Touchdown & Propulsion Assessment", "coordinates": "21.1600° N, 81.2800° E", "type": "completed", "description": "Flight completed with full flight envelope data captured."},
        ],
    },
    {
        "id": "Archived_Training_04",
        "uav_id": "UAV-SWIFT-003",
        "name": "Autonomous Return-to-Base Drill",
        "type": "Training / Drill",
        "date": "28 Oct 2026",
        "startTime": "11:00:00 UTC",
        "endTime": "12:15:00 UTC",
        "duration": "01h 15m",
        "totalDistanceKm": 112.5,
        "maxAltitudeFt": 15000.0,
        "avgSpeedMs": 30.5,
        "maxSpeedMs": 33.8,
        "status": "Completed",
        "telemetryAvailable": True,
        "dataSource": "FLIGHT_LOG_ARCHIVE",
        "fuelUsedLiters": 16.8,
        "sensorWarningsCount": 0,
        "anomalyCount": 0,
        "waypoints": [
            {"lat": 21.200, "lng": 81.350, "alt": 10000.0, "label": "START-DRILL", "type": "start"},
            {"lat": 21.380, "lng": 81.520, "alt": 15000.0, "label": "FAILSAFE-TRIGGER", "type": "waypoint"},
            {"lat": 21.200, "lng": 81.350, "alt": 10000.0, "label": "HOME-AUTOPILOT", "type": "end"},
        ],
        "timeline": [
            {"time": "11:00:00", "timestamp": "2026-10-28T11:00:00Z", "lat": 21.200, "lng": 81.350, "altitude": 10000.0, "speed": 28.0, "battery": 97.0, "heading": 40.0, "rpm": 2480, "cht": 176.0, "egt": 610.0, "oilPressure": 4.35, "oilTemperature": 92.0, "fuelFlow": 13.0, "vibration": 0.24, "manifoldPressureInHg": 31.5, "batteryVoltage": 28.3, "batteryCurrent": 14.1, "engineHealth": 98.0, "roll": 0.5, "pitch": 2.2, "verticalSpeed": 2.0, "coolantTemp": 83.0, "fuelPressure": 3.2, "segmentType": "Normal Flight"},
            {"time": "11:35:00", "timestamp": "2026-10-28T11:35:00Z", "lat": 21.380, "lng": 81.520, "altitude": 15000.0, "speed": 32.4, "battery": 86.0, "heading": 180.0, "rpm": 2420, "cht": 182.0, "egt": 618.0, "oilPressure": 4.25, "oilTemperature": 94.0, "fuelFlow": 12.1, "vibration": 0.26, "manifoldPressureInHg": 30.8, "batteryVoltage": 28.1, "batteryCurrent": 14.6, "engineHealth": 97.0, "roll": 2.0, "pitch": 0.5, "verticalSpeed": 0.0, "coolantTemp": 85.0, "fuelPressure": 3.2, "segmentType": "Surveillance Area"},
            {"time": "12:15:00", "timestamp": "2026-10-28T12:15:00Z", "lat": 21.200, "lng": 81.350, "altitude": 10000.0, "speed": 28.0, "battery": 74.0, "heading": 220.0, "rpm": 2150, "cht": 167.0, "egt": 580.0, "oilPressure": 4.45, "oilTemperature": 90.0, "fuelFlow": 9.8, "vibration": 0.23, "manifoldPressureInHg": 27.5, "batteryVoltage": 28.2, "batteryCurrent": 13.7, "engineHealth": 98.0, "roll": 0.0, "pitch": 0.0, "verticalSpeed": 0.0, "coolantTemp": 79.0, "fuelPressure": 3.3, "segmentType": "Return"},
        ],
        "events": [
            {"time": "11:00:00", "title": "Failsafe RTB Drill Started", "coordinates": "21.2000° N, 81.3500° E", "type": "start", "description": "Simulated primary datalink switchover."},
            {"time": "11:35:00", "title": "Autonomous Return Commenced", "coordinates": "21.3800° N, 81.5200° E", "type": "waypoint", "description": "Autopilot correctly routed to primary recovery fix."},
            {"time": "12:15:00", "title": "Autonomous Approach Completed", "coordinates": "21.2000° N, 81.3500° E", "type": "completed", "description": "Failsafe drill verified successfully."},
        ],
    },
    {
        "id": "Scheduled_Mission_05",
        "uav_id": "UAV-ROTAX-001",
        "name": "Corridor Charlie Night Recon",
        "type": "Night ISR Surveillance",
        "date": "02 Nov 2026",
        "startTime": "20:00:00 UTC",
        "endTime": "23:00:00 UTC",
        "duration": "03h 00m",
        "totalDistanceKm": 310.0,
        "maxAltitudeFt": 21000.0,
        "avgSpeedMs": 33.0,
        "maxSpeedMs": 36.0,
        "status": "Scheduled",
        "telemetryAvailable": False,
        "dataSource": "PLANNED_FLIGHT_MANIFEST",
        "fuelUsedLiters": 0.0,
        "sensorWarningsCount": 0,
        "anomalyCount": 0,
        "waypoints": [
            {"lat": 21.160, "lng": 81.280, "alt": 14000.0, "label": "AIRBASE-R-09", "type": "start"},
            {"lat": 21.650, "lng": 81.800, "alt": 21000.0, "label": "SECTOR-CHARLIE", "type": "surveillance"},
            {"lat": 21.160, "lng": 81.280, "alt": 14000.0, "label": "AIRBASE-R-09", "type": "end"},
        ],
        "timeline": [],
        "events": [],
    },
]

class MissionService:
    def __init__(self):
        self._missions = MISSIONS_DATABASE

    def get_all(
        self,
        uav_id: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List historical missions with optional filtering."""
        results = []
        for m in self._missions:
            if uav_id and m.get("uav_id") != uav_id:
                continue
            if status and status.lower() != "all" and m.get("status", "").lower() != status.lower():
                continue
            if search:
                s = search.lower()
                name_match = s in m.get("name", "").lower()
                id_match = s in m.get("id", "").lower()
                type_match = s in m.get("type", "").lower()
                if not (name_match or id_match or type_match):
                    continue
            results.append(self._enrich_mission_summary(m))
        return results

    def get_by_id(self, mission_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve full mission record by ID."""
        for m in self._missions:
            if m["id"] == mission_id:
                return self._enrich_mission_summary(m)
        return None

    def get_analytics(self, mission_id: str) -> Dict[str, Any]:
        """Calculates authentic analytics summary from recorded telemetry."""
        mission = self.get_by_id(mission_id)
        if not mission:
            return {"error": "Mission not found", "mission_id": mission_id}
        
        timeline = mission.get("timeline", [])
        if not timeline:
            return {
                "mission_id": mission_id,
                "telemetryAvailable": False,
                "status": mission.get("status", "Unknown"),
                "totalDistanceKm": 0.0,
                "maxAltitudeFt": 0.0,
                "avgSpeedMs": 0.0,
                "maxSpeedMs": 0.0,
                "fuelUsedLiters": 0.0,
                "sensorWarningsCount": 0,
                "anomalyCount": 0,
                "message": "Telemetry records unavailable for this planned or archived flight.",
            }

        altitudes = [p["altitude"] for p in timeline if "altitude" in p]
        speeds = [p["speed"] for p in timeline if "speed" in p]
        fuels = [p["fuelFlow"] for p in timeline if "fuelFlow" in p]
        c_health = [p.get("engineHealth", 95.0) for p in timeline]

        max_alt = max(altitudes) if altitudes else mission.get("maxAltitudeFt", 0.0)
        max_speed = max(speeds) if speeds else mission.get("maxSpeedMs", 0.0)
        avg_speed = sum(speeds) / len(speeds) if speeds else mission.get("avgSpeedMs", 0.0)
        avg_health = sum(c_health) / len(c_health) if c_health else 95.0

        return {
            "mission_id": mission_id,
            "uav_id": mission.get("uav_id"),
            "name": mission.get("name"),
            "telemetryAvailable": True,
            "totalDistanceKm": mission.get("totalDistanceKm", 0.0),
            "duration": mission.get("duration", "00h 00m"),
            "maxAltitudeFt": round(float(max_alt), 1),
            "avgSpeedMs": round(float(avg_speed), 1),
            "maxSpeedMs": round(float(max_speed), 1),
            "fuelUsedLiters": mission.get("fuelUsedLiters", 0.0),
            "sensorWarningsCount": mission.get("sensorWarningsCount", 0),
            "anomalyCount": mission.get("anomalyCount", 0),
            "engineHealthTrend": "Nominal" if avg_health > 92.0 else "Degraded",
            "totalRecordedPoints": len(timeline),
            "eventsCount": len(mission.get("events", [])),
        }

    def _enrich_mission_summary(self, mission: Dict[str, Any]) -> Dict[str, Any]:
        """Calculates authentic summary object if not already present."""
        m = dict(mission)
        if "summary" not in m or not m["summary"]:
            timeline = m.get("timeline", [])
            speeds = [p["speed"] for p in timeline if "speed" in p]
            altitudes = [p["altitude"] for p in timeline if "altitude" in p]
            
            m["summary"] = {
                "totalDistanceKm": m.get("totalDistanceKm", 0.0),
                "duration": m.get("duration", "00h 00m"),
                "maxAltitudeFt": max(altitudes) if altitudes else m.get("maxAltitudeFt", 0.0),
                "avgSpeedMs": m.get("avgSpeedMs", 0.0),
                "maxSpeedMs": max(speeds) if speeds else m.get("maxSpeedMs", 0.0),
                "fuelUsedLiters": m.get("fuelUsedLiters", 0.0),
                "sensorWarningsCount": m.get("sensorWarningsCount", 0),
                "anomalyCount": m.get("anomalyCount", 0),
                "engineHealthTrend": "Nominal",
            }
        return m

mission_service = MissionService()
