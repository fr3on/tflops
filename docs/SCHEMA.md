# TFLOPS Data Schema (Protocol CM-2027/A)

This document defines the high-precision hardware attestation schema used by the TFLOPS Intelligence Engine.

## 🔐 Cryptographic Integrity
To maintain a decentralized census without storing PII, every record contains a `device_hash`. This is a unique, one-way identifier derived from mathematical hardware characteristics:
`device_hash = Truncate(SHA256(CPU_MODEL + LOGICAL_CORES + FREQUENCY), 12)`

## 📊 Core Payload Schema

| Field | Type | Description |
|---|---|---|
| `schema_version` | string | `"1"` |
| `timestamp_utc` | string | RFC3339 formatted timestamp |
| `device_hash` | string | 12 hex chars (Cryptographic identifier) |
| `cpu.model` | string | Normalized manufacturer brand string |
| `cpu.logical_cores` | int | Total execution threads |
| `bench.cpu_tflops_f32` | float | Measured FP32 Throughput (TF) |
| `bench.gpu_tflops_f32` | float | Measured FP32 Throughput on primary GPU |
| `score` | int | Forensic Intelligence Score (1-1000) |
| `os` | string | `linux`, `macos`, or `windows` |
| `arch` | string | `x86_64` or `aarch64` |

## 🌐 API Endpoints

- **`GET /stats`**: Returns the Global Capacity Index (GCI) and network totals.
- **`GET /history`**: Returns temporal expansion data (TF vs Time).
- **`POST /report`**: Submits a new verified attestation (strictly opt-in).
