# TFLOPS: Global Hardware Forensic Audit

TFLOPS is a decentralized benchmarking and hardware intelligence platform designed to audit localized computational throughput across the globe. It consists of a high-performance Rust benchmarking agent, a Go-based forensic API, and a real-time Next.js visualization dashboard.

## 🏗️ Repository Structure

- [**`plugin/`**](file:///Users/fr3on/Documents/TFLOPS/plugin): High-performance Rust binary for hardware attestation and TFLOPS benchmarking (CPU/GPU).
- [**`api/`**](file:///Users/fr3on/Documents/TFLOPS/api): Go (Gin) backend that handles localized result submissions and global status aggregation.
- [**`website/`**](file:///Users/fr3on/Documents/TFLOPS/website): Next.js visualization platform for the Global TFLOPS Census.
- [**`docs/`**](file:///Users/fr3on/Documents/TFLOPS/docs): Technical specifications including [SCHEMA.md](file:///Users/fr3on/Documents/TFLOPS/docs/SCHEMA.md), [PRIVACY.md](file:///Users/fr3on/Documents/TFLOPS/docs/PRIVACY.md), and [AGENT_GUIDELINES.md](file:///Users/fr3on/Documents/TFLOPS/docs/AGENT_GUIDELINES.md).

## 🚀 Quick Start

### 1. Configure the Environment
Copy the example environment file to `.env` and adjust your credentials:
```bash
cp .env.example .env
```

### 2. Build the Project
Use the provided `Makefile` or `build.sh` for multi-platform releases:
```bash
# Build for all platforms (Requires Docker/Cross)
make release

# Build for local platform only (Mac)
./build.sh --local-only
```

### 3. Start Development
```bash
# Start the forensic audit (Auto-submits to the global census)
./tflops

# Start an offline-only audit
./tflops --no-submit

# Start API
cd api && go run main.go

# Start Website
cd website && npm run dev
```

## 📜 Licensing & Standards
All data is cryptographically verified and distributed under the **Global Intelligence Verification Protocol CM-2027/A**.
