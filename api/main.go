package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	_ = godotenv.Load() // Load .env file if it exists
	InitDB()
	go StartAggregator() // Start background metrics calculation

	r := gin.Default()
	// ... CORS remains same ...
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS", "PUT"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.POST("/v1/submit", func(c *gin.Context) {
		// ... submission logic remains same ...
		var payload SubmitPayload
		if err := c.ShouldBindJSON(&payload); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		timestamp, _ := time.Parse(time.RFC3339, payload.TimestampUTC)
		_, err := db.Exec(db.Rebind(`
			INSERT INTO submissions (
				device_hash, timestamp_utc, country_code, os, arch, 
				cpu_model, cpu_cores, cpu_tflops, 
				gpu_model, gpu_tflops_f32, gpu_tflops_f16, 
				ram_total_gb, vram_total_gb, estimated_power_w, carbon_intensity, manufacturer,
				score, schema_ver
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
			payload.DeviceHash, timestamp, payload.CountryCode, payload.OS, payload.Arch,
			payload.CPU["model"], payload.CPU["logical_cores"], payload.Bench["cpu_tflops_f32"],
			fmt.Sprintf("%v", getFirstGpuField(payload.GPUs, "model")),
			payload.Bench["gpu_tflops_f32"], payload.Bench["gpu_tflops_f16"],
			payload.CPU["ram_total_gb"], getFirstGpuField(payload.GPUs, "vram_gb"),
			payload.EstimatedPowerW, payload.CarbonIntensity, payload.Manufacturer,
			payload.Score, payload.SchemaVersion,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// Trigger real-time cache refresh
		go RefreshCache()

		c.JSON(http.StatusOK, gin.H{"accepted": true})
	})

	r.GET("/v1/leaderboard", func(c *gin.Context) {
		country := c.Query("country")
		var cached []struct {
			Data []byte `db:"data"`
		}
		var err error
		if country != "" {
			err = db.Select(&cached, "SELECT data FROM leaderboard_cache WHERE category = ? ORDER BY score DESC LIMIT 100", country)
		} else {
			err = db.Select(&cached, "SELECT data FROM leaderboard_cache WHERE category = 'global' ORDER BY score DESC LIMIT 100")
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		results := make([]BenchSubmission, 0)
		for _, row := range cached {
			var sub BenchSubmission
			if err := json.Unmarshal(row.Data, &sub); err == nil {
				results = append(results, sub)
			}
		}

		c.JSON(http.StatusOK, results)
	})

	r.GET("/v1/stats/global", func(c *gin.Context) {
		// ... same ...
		type GlobalStat struct {
			Code        string    `db:"country_code" json:"code"`
			AvgTflops   float64   `db:"avg_score" json:"avg_tflops"`
			DeviceCount int       `db:"device_count" json:"device_count"`
			TopTflops   float64   `db:"top_score" json:"top_tflops"`
			AvgPower    float64   `db:"avg_power" json:"avg_power"`
			AvgCarbon   float64   `db:"avg_carbon" json:"avg_carbon"`
			AvgRAM      float64   `db:"avg_ram" json:"avg_ram"`
			TopVendor   string    `db:"top_vendor" json:"top_vendor"`
			UpdatedAt   time.Time `db:"updated_at" json:"updated_at"`
		}
		var stats []GlobalStat
		err := db.Select(&stats, `SELECT * FROM global_stats_cache`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"countries": stats})
	})

	r.GET("/v1/stats/history", func(c *gin.Context) {
		year := c.Query("year")
		type HistoryPoint struct {
			Month       string  `db:"month" json:"month"`
			TotalTflops float64 `db:"total_tflops" json:"total_tflops"`
			DeviceCount int     `db:"device_count" json:"device_count"`
		}
		var history []HistoryPoint
		var err error
		if year != "" && year != "All" {
			err = db.Select(&history, `SELECT month, total_tflops, device_count FROM history_stats_cache WHERE month LIKE ? ORDER BY month ASC`, year+"-%")
		} else {
			err = db.Select(&history, `SELECT month, total_tflops, device_count FROM history_stats_cache ORDER BY month ASC`)
		}

		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, history)
	})

	r.GET("/v1/submission/:id", func(c *gin.Context) {
		id := c.Param("id")
		var submission BenchSubmission
		err := db.Get(&submission, "SELECT * FROM submissions WHERE id = ?", id)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Submission not found"})
			return
		}
		c.JSON(http.StatusOK, submission)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "80"
	}
	r.Run(":" + port)
}

var refreshMutex sync.Mutex

func RefreshCache() {
	if !refreshMutex.TryLock() {
		// Already refreshing, skip this trigger to debounce
		return
	}
	defer refreshMutex.Unlock()

	fmt.Println("[Aggregator] Updating global intelligence cache...")
	start := time.Now()

	var globalQuery string
	var historyQuery string

	if DBDialect == DialectPostgres {
		globalQuery = `
			WITH vendor_ranks AS (
				SELECT country_code, manufacturer, COUNT(*) as cnt,
				ROW_NUMBER() OVER (PARTITION BY country_code ORDER BY COUNT(*) DESC) as rn
				FROM submissions
				GROUP BY country_code, manufacturer
			)
			INSERT INTO global_stats_cache (
				country_code, avg_score, device_count, top_score,
				avg_power, avg_carbon, avg_ram, top_vendor, updated_at
			)
			SELECT 
				s.country_code, 
				AVG(s.gpu_tflops_f32), 
				COUNT(s.id), 
				MAX(s.gpu_tflops_f32),
				AVG(s.estimated_power_w),
				AVG(s.carbon_intensity),
				AVG(s.ram_total_gb),
				vr.manufacturer,
				CURRENT_TIMESTAMP
			FROM submissions s
			LEFT JOIN vendor_ranks vr ON s.country_code = vr.country_code AND vr.rn = 1
			GROUP BY s.country_code, vr.manufacturer
			ON CONFLICT (country_code) DO UPDATE SET
				avg_score = EXCLUDED.avg_score,
				device_count = EXCLUDED.device_count,
				top_score = EXCLUDED.top_score,
				avg_power = EXCLUDED.avg_power,
				avg_carbon = EXCLUDED.avg_carbon,
				avg_ram = EXCLUDED.avg_ram,
				top_vendor = EXCLUDED.top_vendor,
				updated_at = EXCLUDED.updated_at`

		historyQuery = `
			INSERT INTO history_stats_cache (month, total_tflops, device_count, updated_at)
			SELECT 
				to_char(timestamp_utc, 'YYYY-MM') as m,
				SUM(gpu_tflops_f32),
				COUNT(id),
				CURRENT_TIMESTAMP
			FROM submissions
			GROUP BY m
			ON CONFLICT (month) DO UPDATE SET
				total_tflops = EXCLUDED.total_tflops,
				device_count = EXCLUDED.device_count,
				updated_at = EXCLUDED.updated_at`
	} else {
		globalQuery = `
			WITH vendor_ranks AS (
				SELECT country_code, manufacturer, COUNT(*) as cnt,
				ROW_NUMBER() OVER (PARTITION BY country_code ORDER BY COUNT(*) DESC) as rn
				FROM submissions
				GROUP BY country_code, manufacturer
			)
			REPLACE INTO global_stats_cache (
				country_code, avg_score, device_count, top_score,
				avg_power, avg_carbon, avg_ram, top_vendor, updated_at
			)
			SELECT 
				s.country_code, 
				AVG(s.gpu_tflops_f32), 
				COUNT(s.id), 
				MAX(s.gpu_tflops_f32),
				AVG(s.estimated_power_w),
				AVG(s.carbon_intensity),
				AVG(s.ram_total_gb),
				vr.manufacturer,
				DATETIME('now')
			FROM submissions s
			LEFT JOIN vendor_ranks vr ON s.country_code = vr.country_code AND vr.rn = 1
			GROUP BY s.country_code`

		historyQuery = `
			REPLACE INTO history_stats_cache (month, total_tflops, device_count, updated_at)
			SELECT 
				strftime('%Y-%m', timestamp_utc) as m,
				SUM(gpu_tflops_f32),
				COUNT(id),
				DATETIME('now')
			FROM submissions
			GROUP BY m
			ORDER BY m ASC`
	}

	if _, err := db.Exec(globalQuery); err != nil {
		fmt.Printf("[Aggregator] Global Error: %v\n", err)
	}
	if _, err := db.Exec(historyQuery); err != nil {
		fmt.Printf("[Aggregator] History Error: %v\n", err)
	}

	// 3. Update Leaderboard Cache (Global and Top Countries)
	UpdateLeaderboardCache()

	fmt.Printf("[Aggregator] Cache updated in %v\n", time.Since(start))
}

func StartAggregator() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		RefreshCache()
	}
}

func UpdateLeaderboardCache() {
	// Clear old cache
	db.Exec("DELETE FROM leaderboard_cache")

	cache := func(category string, submissions []BenchSubmission) {
		for _, s := range submissions {
			data, _ := json.Marshal(s)
			now := "DATETIME('now')"
			if DBDialect == DialectPostgres {
				now = "CURRENT_TIMESTAMP"
			}
			db.Exec(db.Rebind(fmt.Sprintf(`INSERT INTO leaderboard_cache (submission_id, category, data, score, updated_at) 
				VALUES (?, ?, ?, ?, %s)`, now)),
				s.ID, category, string(data), s.GPUTflopsF32)
		}
	}

	// Global Top 100
	var global []BenchSubmission
	if err := db.Select(&global, "SELECT * FROM submissions ORDER BY gpu_tflops_f32 DESC LIMIT 100"); err == nil {
		cache("global", global)
	} else {
		fmt.Printf("[Leaderboard] Global SELECT Error: %v\n", err)
	}

	// Per-Country Top 100 for top 20 active countries
	var countries []string
	if err := db.Select(&countries, "SELECT country_code FROM global_stats_cache ORDER BY device_count DESC LIMIT 20"); err == nil {
		for _, code := range countries {
			var regional []BenchSubmission
			if err := db.Select(&regional, "SELECT * FROM submissions WHERE country_code = ? ORDER BY gpu_tflops_f32 DESC LIMIT 100", code); err == nil {
				cache(code, regional)
			} else {
				fmt.Printf("[Leaderboard] Regional SELECT Error (%s): %v\n", code, err)
			}
		}
	} else {
		fmt.Printf("[Leaderboard] Countries SELECT Error: %v\n", err)
	}
}

func getFirstGpuField(gpus []map[string]interface{}, field string) interface{} {
	if len(gpus) > 0 {
		return gpus[0][field]
	}
	return nil
}
