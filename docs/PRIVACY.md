# TFLOPS Privacy Policy & Forensic Integrity

TFLOPS is engineered with **Privacy by Default**. Our mission is to conduct a global computational census without compromising individual digital sovereignty.

## 🔎 Data Collection Protocols
- **Cryptographic Device Hash**: We store a 12-character truncated SHA-256 hash derived from localized hardware characteristics (CPU model, core count, frequency). This hash is mathematically one-way and cannot be used to reverse-engineer your hostname, ID, or specific hardware instance.
- **Hardware Architecture**: CPU/GPU model names and frequencies are collected solely for performance categorization.
- **Geographic Saturation**: We resolve your IP address to a 2-letter country code (ISO) using a local GeoIP database. **We never store or log your IP address** in our centralized registry.

## 🚫 What We DO NOT Collect:
- **No** Personally Identifiable Information (PII)
- **No** Usernames, Hostnames, or MAC Addresses
- **No** Persistent identifiers linked to identity
- **No** Software lists or filesystem metadata

## ⚖️ Automated Submission & Opt-Out
By default, TFLOPS operates as a global census. Benchmark results are automatically committed to the centralized TFLOPS API for network aggregation. Users who wish to conduct a localized, offline-only audit can do so by explicitly utilizing the `--no-submit` flag.
