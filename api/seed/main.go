package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

// ─────────────────────────────────────────────
// GPU Templates — consumer + prosumer focus
// ─────────────────────────────────────────────

type GpuTemplate struct {
	Model      string
	Vendor     string
	Watts      int
	Vram       int
	TflopsF32  float64
	TflopsF16  float64
	BaseScore  int
	IsAppleSoC bool // unified memory — RAM = VRAM
}

var gpuTemplates = []GpuTemplate{
	// NVIDIA — consumer
	{"NVIDIA GeForce RTX 4090", "NVIDIA", 450, 24, 82.6, 165.2, 750, false},
	{"NVIDIA GeForce RTX 4080 Super", "NVIDIA", 320, 16, 52.2, 104.4, 640, false},
	{"NVIDIA GeForce RTX 4080", "NVIDIA", 320, 16, 48.7, 97.5, 620, false},
	{"NVIDIA GeForce RTX 4070 Ti Super", "NVIDIA", 285, 16, 40.0, 80.0, 560, false},
	{"NVIDIA GeForce RTX 4070 Ti", "NVIDIA", 285, 12, 39.4, 78.8, 540, false},
	{"NVIDIA GeForce RTX 4070 Super", "NVIDIA", 220, 12, 35.5, 71.0, 500, false},
	{"NVIDIA GeForce RTX 4070", "NVIDIA", 200, 12, 29.1, 58.2, 450, false},
	{"NVIDIA GeForce RTX 4060 Ti", "NVIDIA", 165, 16, 22.1, 44.2, 380, false},
	{"NVIDIA GeForce RTX 4060 Ti", "NVIDIA", 165, 8, 22.1, 44.2, 370, false},
	{"NVIDIA GeForce RTX 4060", "NVIDIA", 115, 8, 15.1, 30.2, 300, false},
	{"NVIDIA GeForce RTX 3090 Ti", "NVIDIA", 450, 24, 40.0, 80.0, 640, false},
	{"NVIDIA GeForce RTX 3090", "NVIDIA", 350, 24, 35.6, 71.2, 600, false},
	{"NVIDIA GeForce RTX 3080 Ti", "NVIDIA", 350, 12, 34.1, 68.2, 580, false},
	{"NVIDIA GeForce RTX 3080 12GB", "NVIDIA", 350, 12, 30.6, 61.2, 540, false},
	{"NVIDIA GeForce RTX 3080", "NVIDIA", 320, 10, 29.8, 59.6, 520, false},
	{"NVIDIA GeForce RTX 3070 Ti", "NVIDIA", 290, 8, 21.7, 43.5, 430, false},
	{"NVIDIA GeForce RTX 3070", "NVIDIA", 220, 8, 20.3, 40.6, 400, false},
	{"NVIDIA GeForce RTX 3060 Ti", "NVIDIA", 200, 8, 16.2, 32.4, 350, false},
	{"NVIDIA GeForce RTX 3060", "NVIDIA", 170, 12, 12.7, 25.4, 280, false},
	{"NVIDIA GeForce RTX 3050", "NVIDIA", 130, 8, 9.1, 18.2, 200, false},
	{"NVIDIA GeForce RTX 2080 Ti", "NVIDIA", 260, 11, 13.4, 26.8, 390, false},
	{"NVIDIA GeForce RTX 2080 Super", "NVIDIA", 250, 8, 11.2, 22.4, 340, false},
	{"NVIDIA GeForce RTX 2070 Super", "NVIDIA", 215, 8, 9.1, 18.2, 300, false},
	{"NVIDIA GeForce GTX 1080 Ti", "NVIDIA", 250, 11, 11.3, 11.3, 260, false},
	{"NVIDIA GeForce GTX 1080", "NVIDIA", 180, 8, 8.9, 8.9, 220, false},
	// NVIDIA — laptop
	{"NVIDIA GeForce RTX 4090 Laptop", "NVIDIA", 150, 16, 33.0, 66.0, 520, false},
	{"NVIDIA GeForce RTX 4080 Laptop", "NVIDIA", 120, 12, 26.0, 52.0, 460, false},
	{"NVIDIA GeForce RTX 4070 Laptop", "NVIDIA", 100, 8, 20.0, 40.0, 390, false},
	{"NVIDIA GeForce RTX 4060 Laptop", "NVIDIA", 80, 8, 15.0, 30.0, 310, false},
	{"NVIDIA GeForce RTX 3080 Laptop", "NVIDIA", 115, 16, 23.7, 47.4, 420, false},
	{"NVIDIA GeForce RTX 3070 Laptop", "NVIDIA", 100, 8, 16.6, 33.2, 360, false},
	// AMD — consumer
	{"AMD Radeon RX 7900 XTX", "AMD", 355, 24, 61.4, 122.8, 680, false},
	{"AMD Radeon RX 7900 XT", "AMD", 315, 20, 53.4, 106.8, 630, false},
	{"AMD Radeon RX 7900 GRE", "AMD", 260, 16, 46.4, 92.8, 580, false},
	{"AMD Radeon RX 7800 XT", "AMD", 263, 16, 37.3, 74.6, 520, false},
	{"AMD Radeon RX 7700 XT", "AMD", 245, 12, 34.2, 68.4, 480, false},
	{"AMD Radeon RX 7600", "AMD", 165, 8, 21.5, 43.0, 360, false},
	{"AMD Radeon RX 6950 XT", "AMD", 335, 16, 23.7, 47.4, 510, false},
	{"AMD Radeon RX 6900 XT", "AMD", 300, 16, 23.0, 46.0, 490, false},
	{"AMD Radeon RX 6800 XT", "AMD", 300, 16, 20.7, 41.5, 470, false},
	{"AMD Radeon RX 6800", "AMD", 250, 16, 16.2, 32.4, 420, false},
	{"AMD Radeon RX 6700 XT", "AMD", 230, 12, 13.2, 26.5, 370, false},
	{"AMD Radeon RX 6600 XT", "AMD", 160, 8, 10.6, 21.2, 300, false},
	{"AMD Radeon RX 6600", "AMD", 132, 8, 8.9, 17.8, 260, false},
	{"AMD Radeon RX 5700 XT", "AMD", 225, 8, 9.8, 9.8, 280, false},
	// Intel Arc
	{"Intel Arc A770 16GB", "Intel", 225, 16, 19.7, 39.3, 230, false},
	{"Intel Arc A770 8GB", "Intel", 225, 8, 19.7, 39.3, 220, false},
	{"Intel Arc A750", "Intel", 225, 8, 17.2, 34.4, 200, false},
	{"Intel Arc A580", "Intel", 185, 8, 12.3, 24.6, 170, false},
	{"Intel Arc A380", "Intel", 75, 6, 4.5, 9.0, 110, false},
	// Apple Silicon (SoC — unified memory)
	{"Apple M3 Ultra", "Apple", 80, 192, 24.0, 48.0, 600, true},
	{"Apple M3 Max", "Apple", 60, 128, 14.2, 28.4, 480, true},
	{"Apple M3 Pro", "Apple", 45, 36, 7.4, 14.8, 340, true},
	{"Apple M3", "Apple", 22, 10, 3.6, 7.2, 230, true},
	{"Apple M2 Ultra", "Apple", 70, 192, 21.2, 42.4, 560, true},
	{"Apple M2 Max", "Apple", 55, 96, 13.6, 27.2, 450, true},
	{"Apple M2 Pro", "Apple", 40, 32, 6.8, 13.7, 320, true},
	{"Apple M2", "Apple", 20, 8, 3.6, 7.2, 210, true},
	{"Apple M1 Ultra", "Apple", 65, 128, 21.2, 42.4, 520, true},
	{"Apple M1 Max", "Apple", 50, 64, 10.4, 20.8, 400, true},
	{"Apple M1 Pro", "Apple", 35, 32, 5.2, 10.4, 310, true},
	{"Apple M1", "Apple", 15, 8, 2.6, 5.2, 200, true},
}

// ─────────────────────────────────────────────
// CPU Templates — realistic desktop + laptop
// ─────────────────────────────────────────────

type CpuTemplate struct {
	Model  string
	Vendor string
	Cores  int
	Tflops float64 // FP32
}

var cpuTemplates = []CpuTemplate{
	// Intel Desktop — 14th gen
	{"Intel Core i9-14900K", "Intel", 24, 2.1},
	{"Intel Core i7-14700K", "Intel", 20, 1.8},
	{"Intel Core i5-14600K", "Intel", 14, 1.3},
	// Intel Desktop — 13th gen
	{"Intel Core i9-13900K", "Intel", 24, 2.0},
	{"Intel Core i9-13900KS", "Intel", 24, 2.05},
	{"Intel Core i7-13700K", "Intel", 16, 1.6},
	{"Intel Core i5-13600K", "Intel", 14, 1.2},
	{"Intel Core i5-13400", "Intel", 10, 0.9},
	// Intel Desktop — 12th gen
	{"Intel Core i9-12900K", "Intel", 16, 1.7},
	{"Intel Core i7-12700K", "Intel", 12, 1.4},
	{"Intel Core i5-12600K", "Intel", 10, 1.0},
	// Intel Laptop
	{"Intel Core i9-13980HX", "Intel", 24, 1.6},
	{"Intel Core i7-13700H", "Intel", 14, 1.2},
	{"Intel Core i5-13500H", "Intel", 12, 0.9},
	{"Intel Core i7-12700H", "Intel", 14, 1.1},
	// AMD Desktop — Ryzen 7000
	{"AMD Ryzen 9 7950X", "AMD", 16, 2.3},
	{"AMD Ryzen 9 7900X", "AMD", 12, 1.9},
	{"AMD Ryzen 7 7700X", "AMD", 8, 1.4},
	{"AMD Ryzen 5 7600X", "AMD", 6, 1.1},
	{"AMD Ryzen 5 7600", "AMD", 6, 1.0},
	// AMD Desktop — Ryzen 5000
	{"AMD Ryzen 9 5950X", "AMD", 16, 2.0},
	{"AMD Ryzen 9 5900X", "AMD", 12, 1.7},
	{"AMD Ryzen 7 5800X3D", "AMD", 8, 1.3},
	{"AMD Ryzen 7 5800X", "AMD", 8, 1.3},
	{"AMD Ryzen 5 5600X", "AMD", 6, 0.9},
	{"AMD Ryzen 5 5600", "AMD", 6, 0.85},
	// AMD Laptop
	{"AMD Ryzen 9 7945HX", "AMD", 16, 1.8},
	{"AMD Ryzen 7 7745HX", "AMD", 8, 1.2},
	{"AMD Ryzen 5 7640HS", "AMD", 6, 0.9},
	// Apple — M-series (SoC, CPU side)
	{"Apple M3 Ultra (CPU)", "Apple", 24, 2.8},
	{"Apple M3 Max (CPU)", "Apple", 16, 1.9},
	{"Apple M3 Pro (CPU)", "Apple", 12, 1.4},
	{"Apple M3 (CPU)", "Apple", 8, 0.9},
	{"Apple M2 Ultra (CPU)", "Apple", 24, 2.6},
	{"Apple M2 Max (CPU)", "Apple", 12, 1.6},
	{"Apple M2 Pro (CPU)", "Apple", 12, 1.5},
	{"Apple M2 (CPU)", "Apple", 8, 0.85},
	{"Apple M1 Ultra (CPU)", "Apple", 20, 2.2},
	{"Apple M1 Max (CPU)", "Apple", 10, 1.2},
	{"Apple M1 Pro (CPU)", "Apple", 10, 1.1},
	{"Apple M1 (CPU)", "Apple", 8, 0.75},
}

// ─────────────────────────────────────────────
// OS / arch combos — realistic distribution
// ─────────────────────────────────────────────

type OsArch struct {
	OS   string
	Arch string
}

// Weighted: Windows dominates, macOS second, Linux enthusiast minority
var osArchPool = []OsArch{
	// Windows x86_64 — ~55%
	{"windows", "x86_64"}, {"windows", "x86_64"}, {"windows", "x86_64"},
	{"windows", "x86_64"}, {"windows", "x86_64"}, {"windows", "x86_64"},
	{"windows", "x86_64"}, {"windows", "x86_64"}, {"windows", "x86_64"},
	{"windows", "x86_64"}, {"windows", "x86_64"},
	// macOS aarch64 — ~25%
	{"macos", "aarch64"}, {"macos", "aarch64"}, {"macos", "aarch64"},
	{"macos", "aarch64"}, {"macos", "aarch64"},
	// Linux x86_64 — ~18%
	{"linux", "x86_64"}, {"linux", "x86_64"}, {"linux", "x86_64"},
	{"linux", "x86_64"},
	// Linux aarch64 (Raspberry Pi, ARM workstations) — ~2%
	{"linux", "aarch64"},
}

// ─────────────────────────────────────────────
// Countries with realistic carbon intensity (gCO2/kWh)
// ─────────────────────────────────────────────

var countries = map[string]float64{
	// High renewable share
	"NO": 18, "SE": 40, "CH": 30, "FR": 60, "AT": 80,
	// Mixed
	"DE": 380, "GB": 250, "NL": 350, "BE": 160, "DK": 130,
	"ES": 200, "IT": 310, "PT": 190, "FI": 95, "IE": 280,
	// North America
	"US": 450, "CA": 120, "MX": 510,
	// Asia Pacific
	"JP": 480, "KR": 420, "AU": 580, "SG": 400, "NZ": 120,
	"TW": 510, "HK": 530,
	// MENA
	"SA": 700, "AE": 650, "EG": 680, "IL": 600,
	// High carbon
	"CN": 630, "IN": 720, "ZA": 840, "PL": 760, "CZ": 690,
	// LATAM
	"BR": 150, "AR": 300, "CL": 310, "CO": 190,
	// Russia/Eastern Europe
	"RU": 400, "UA": 360, "RO": 290, "HU": 220,
}

// ─────────────────────────────────────────────
// RAM pools — realistic DIMM configs (GB)
// ─────────────────────────────────────────────

var desktopRamOptions = []int{8, 16, 16, 16, 32, 32, 32, 64, 64, 128}
var laptopRamOptions = []int{8, 8, 16, 16, 16, 32, 32, 64}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

func randomDeviceHash(r *rand.Rand) string {
	b := make([]byte, 6)
	r.Read(b)
	return fmt.Sprintf("%x", b)
}

// Pair GPU to a plausible CPU vendor — Apple SoC forces Apple CPU
func pickCpu(r *rand.Rand, gpu GpuTemplate) CpuTemplate {
	if gpu.IsAppleSoC {
		// Match M-series tier
		for _, c := range cpuTemplates {
			if c.Vendor == "Apple" && c.Model == gpu.Model+" (CPU)" {
				return c
			}
		}
		// Fallback: any Apple CPU
		var apple []CpuTemplate
		for _, c := range cpuTemplates {
			if c.Vendor == "Apple" {
				apple = append(apple, c)
			}
		}
		return apple[r.Intn(len(apple))]
	}
	// Non-Apple: pick any non-Apple CPU
	var nonApple []CpuTemplate
	for _, c := range cpuTemplates {
		if c.Vendor != "Apple" {
			nonApple = append(nonApple, c)
		}
	}
	return nonApple[r.Intn(len(nonApple))]
}

// Force OS to macOS for Apple SoC, else pick from pool (excluding Apple combos)
func pickOsArch(r *rand.Rand, gpu GpuTemplate) OsArch {
	if gpu.IsAppleSoC {
		return OsArch{"macos", "aarch64"}
	}
	// Non-Apple should not be macOS/aarch64
	for {
		oa := osArchPool[r.Intn(len(osArchPool))]
		if oa.OS != "macos" {
			return oa
		}
	}
}

// RAM: Apple SoC uses unified memory == VRAM, else pick a pool
func pickRam(r *rand.Rand, gpu GpuTemplate, isLaptop bool) int {
	if gpu.IsAppleSoC {
		return gpu.Vram
	}
	if isLaptop {
		return laptopRamOptions[r.Intn(len(laptopRamOptions))]
	}
	return desktopRamOptions[r.Intn(len(desktopRamOptions))]
}

func isLaptopGpu(gpu GpuTemplate) bool {
	return len(gpu.Model) > 7 && gpu.Model[len(gpu.Model)-7:] == " Laptop"
}

func main() {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))

	db, err := sqlx.Connect("sqlite3", "tflops.db")
	if err != nil {
		log.Fatalln(err)
	}

	schema := `
	DROP TABLE IF EXISTS submissions;
	CREATE TABLE submissions (
		id                INTEGER PRIMARY KEY AUTOINCREMENT,
		device_hash       TEXT NOT NULL,
		timestamp_utc     DATETIME NOT NULL,
		country_code      TEXT,
		os                TEXT,
		arch              TEXT,
		cpu_model         TEXT,
		cpu_vendor        TEXT,
		cpu_cores         INTEGER,
		cpu_tflops        REAL,
		gpu_model         TEXT,
		gpu_vendor        TEXT,
		gpu_tflops_f32    REAL,
		gpu_tflops_f16    REAL,
		ram_total_gb      INTEGER,
		vram_total_gb     INTEGER,
		estimated_power_w INTEGER,
		carbon_intensity  REAL,
		manufacturer      TEXT,
		score             INTEGER,
		schema_ver        TEXT
	);
	CREATE INDEX idx_submissions_timestamp ON submissions(timestamp_utc);
	CREATE INDEX idx_submissions_country   ON submissions(country_code);
	CREATE INDEX idx_submissions_gpu       ON submissions(gpu_model);
	`
	db.MustExec(schema)

	totalRows := 20000
	batchSize := 1000

	now := time.Now()
	monthsToGen := 12
	growthRate := 1.15

	// Distribute rows across months with 15% MoM growth
	monthlyNodes := make([]int, monthsToGen)
	totalWeights := 0.0
	w := 1.0
	for m := 0; m < monthsToGen; m++ {
		totalWeights += w
		w *= growthRate
	}
	baseWeight := float64(totalRows) / totalWeights
	w = 1.0
	allocated := 0
	for m := 0; m < monthsToGen; m++ {
		if m == monthsToGen-1 {
			// Last month absorbs rounding remainder
			monthlyNodes[m] = totalRows - allocated
		} else {
			monthlyNodes[m] = int(baseWeight * w)
			allocated += monthlyNodes[m]
		}
		w *= growthRate
	}

	countryCodes := make([]string, 0, len(countries))
	for k := range countries {
		countryCodes = append(countryCodes, k)
	}

	fmt.Printf("Generating %d realistic PC/workstation records (12-month growth trend)...\n\n", totalRows)
	start := time.Now()
	rowCounter := 0

	for m := 0; m < monthsToGen; m++ {
		monthStart := now.AddDate(0, -(monthsToGen - 1 - m), -now.Day()+1)
		nodesThisMonth := monthlyNodes[m]

		fmt.Printf("Month %2d  %s  → %d records\n", m+1, monthStart.Format("2006-01"), nodesThisMonth)

		for i := 0; i < nodesThisMonth; i += batchSize {
			tx, err := db.Begin()
			if err != nil {
				log.Fatal(err)
			}

			batchEnd := i + batchSize
			if batchEnd > nodesThisMonth {
				batchEnd = nodesThisMonth
			}

			for j := i; j < batchEnd; j++ {
				gpu := gpuTemplates[r.Intn(len(gpuTemplates))]
				cpu := pickCpu(r, gpu)
				oa := pickOsArch(r, gpu)
				country := countryCodes[r.Intn(len(countryCodes))]
				carbon := countries[country] + (r.Float64()*20 - 10)
				laptop := isLaptopGpu(gpu) || oa.OS == "macos" && !gpu.IsAppleSoC
				ram := pickRam(r, gpu, laptop)

				// Score: base ± small jitter
				scoreJitter := r.Intn(51) - 25 // ±25
				score := gpu.BaseScore + scoreJitter

				// TFLOPs: derive from score so they correlate
				ratio := float64(score) / float64(gpu.BaseScore)
				tflopsF32 := gpu.TflopsF32 * ratio
				tflopsF16 := gpu.TflopsF16 * ratio

				// Power: ±8% real-world variance
				powerJitter := r.Intn(int(float64(gpu.Watts)*0.16)) - int(float64(gpu.Watts)*0.08)
				power := gpu.Watts + powerJitter

				// CPU TFLOPs: small jitter
				cpuTflops := cpu.Tflops + (r.Float64()*0.1 - 0.05)

				randomDay := r.Intn(28)
				recordTime := monthStart.AddDate(0, 0, randomDay)

				_, err = tx.Exec(`
					INSERT INTO submissions (
						device_hash, timestamp_utc, country_code, os, arch,
						cpu_model, cpu_vendor, cpu_cores, cpu_tflops,
						gpu_model, gpu_vendor, gpu_tflops_f32, gpu_tflops_f16,
						ram_total_gb, vram_total_gb, estimated_power_w, carbon_intensity,
						manufacturer, score, schema_ver
					) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
					randomDeviceHash(r),
					recordTime.Format("2006-01-02 15:04:05"),
					country, oa.OS, oa.Arch,
					cpu.Model, cpu.Vendor, cpu.Cores, cpuTflops,
					gpu.Model, gpu.Vendor, tflopsF32, tflopsF16,
					ram, gpu.Vram, power, carbon,
					gpu.Vendor, score, "3",
				)
				if err != nil {
					tx.Rollback()
					log.Fatal(err)
				}
				rowCounter++
			}

			if err := tx.Commit(); err != nil {
				log.Fatal(err)
			}
		}
	}

	fmt.Printf("\nDone: %d rows in %v\n", rowCounter, time.Since(start))
}
