package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

type GpuTemplate struct {
	Model  string
	Vendor string
	Watts  int
	Vram   int
	BaseScore int
}

var gpuTemplates = []GpuTemplate{
	{"NVIDIA GeForce RTX 4090", "NVIDIA", 450, 24, 750},
	{"NVIDIA GeForce RTX 4080", "NVIDIA", 320, 16, 620},
	{"NVIDIA GeForce RTX 3080", "NVIDIA", 320, 10, 520},
	{"NVIDIA GeForce RTX 3060", "NVIDIA", 170, 12, 280},
	{"NVIDIA A100", "NVIDIA", 400, 80, 850},
	{"Apple M2 Ultra", "Apple", 60, 128, 450},
	{"Apple M2 Max", "Apple", 45, 64, 320},
	{"Apple M1 Pro", "Apple", 30, 16, 210},
	{"AMD Radeon RX 7900 XTX", "AMD", 355, 24, 680},
	{"AMD Radeon RX 6800 XT", "AMD", 300, 16, 490},
	{"Intel Arc A770", "Intel", 225, 16, 220},
}

var countries = map[string]float64{
	"US": 450, "GB": 250, "DE": 380, "FR": 60, "CN": 630, 
	"IN": 720, "BR": 150, "CA": 120, "AU": 580, "JP": 480,
	"KR": 420, "SG": 400, "SE": 40, "CH": 30, "NL": 350,
}

func main() {
	db, err := sqlx.Connect("sqlite3", "tflops.db")
	if err != nil {
		log.Fatalln(err)
	}

	// Force drop and recreate for enriched schema
	schema := `
	DROP TABLE IF EXISTS submissions;
	CREATE TABLE submissions (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		device_hash TEXT NOT NULL,
		timestamp_utc DATETIME NOT NULL,
		country_code TEXT,
		os TEXT,
		arch TEXT,
		cpu_model TEXT,
		cpu_cores INTEGER,
		cpu_tflops REAL,
		gpu_model TEXT,
		gpu_tflops_f32 REAL,
		gpu_tflops_f16 REAL,
		ram_total_gb INTEGER,
		vram_total_gb INTEGER,
		estimated_power_w INTEGER,
		carbon_intensity REAL,
		manufacturer TEXT,
		score INTEGER,
		schema_ver TEXT
	);
	`
	db.MustExec(schema)

	totalRows := 1000000
	batchSize := 5000

	fmt.Printf("Generating 1M High-Fidelity Infrastructure Records with 12-month Growth Trend...\n")
	start := time.Now()

	countryCodes := make([]string, 0, len(countries))
	for k := range countries {
		countryCodes = append(countryCodes, k)
	}

    // Temporal Settings: Last 12 months
    now := time.Now()
    monthsToGen := 12
    growthRate := 1.15 // 15% growth per month
    
    // Calculate node distribution per month based on growth
    monthlyNodes := make([]int, monthsToGen)
    totalWeights := 0.0
    weight := 1.0
    for m := 0; m < monthsToGen; m++ {
        totalWeights += weight
        weight *= growthRate
    }
    
    baseWeight := float64(totalRows) / totalWeights
    weight = 1.0
    for m := 0; m < monthsToGen; m++ {
        monthlyNodes[m] = int(baseWeight * weight)
        weight *= growthRate
    }

	rowCounter := 0
	for m := 0; m < monthsToGen; m++ {
        monthStart := now.AddDate(0, - (monthsToGen - 1 - m), -now.Day() + 1)
        nodesThisMonth := monthlyNodes[m]
        
        fmt.Printf("Simulating Month %d: %s (%d nodes)\n", m+1, monthStart.Format("2006-01"), nodesThisMonth)

        for i := 0; i < nodesThisMonth; i += batchSize {
            tx, err := db.Begin()
            if err != nil {
                log.Fatal(err)
            }

            currentBatch := batchSize
            if i + batchSize > nodesThisMonth {
                currentBatch = nodesThisMonth - i
            }

            for j := 0; j < currentBatch; j++ {
                deviceHash := fmt.Sprintf("%016x", rand.Int63())[:12]
                country := countryCodes[rand.Intn(len(countryCodes))]
                carbon := countries[country] + (rand.Float64() * 20 - 10)
                
                template := gpuTemplates[rand.Intn(len(gpuTemplates))]
                
                score := template.BaseScore + rand.Intn(100)
                power := template.Watts + rand.Intn(20) - 10
                ram := 16 + (rand.Intn(4) * 16)
                if template.Vendor == "Apple" {
                    ram = template.Vram
                }
                gpuTflops := float64(score) / 50.0

                // Randomize day within month
                randomDay := rand.Intn(28)
                recordTime := monthStart.AddDate(0, 0, randomDay)

                _, err = tx.Exec(`
                    INSERT INTO submissions (
                        device_hash, timestamp_utc, country_code, os, arch, 
                        cpu_model, cpu_cores, cpu_tflops, 
                        gpu_model, gpu_tflops_f32, gpu_tflops_f16, 
                        ram_total_gb, vram_total_gb, estimated_power_w, carbon_intensity, manufacturer,
                        score, schema_ver
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    deviceHash, recordTime.Format("2006-01-02 15:04:05"), country, "macos", "aarch64",
                    "Primary Processor Cluster", 10, 0.5,
                    template.Model, gpuTflops, nil,
                    ram, template.Vram, power, carbon, template.Vendor,
                    score, "2",
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

	fmt.Printf("Infrastructure simulation complete: %d enriched rows with growth trend in %v\n", rowCounter, time.Since(start))
}
