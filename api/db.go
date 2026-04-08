package main

import (
	"log"
	"os"
	"strings"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	_ "modernc.org/sqlite"
)

var db *sqlx.DB

const (
	DialectSQLite = iota
	DialectPostgres
)

var DBDialect int = DialectSQLite

func InitDB() {
	var err error
	dbURL := os.Getenv("DATABASE_URL")

	if strings.HasPrefix(dbURL, "postgres://") || strings.HasPrefix(dbURL, "postgresql://") {
		db, err = sqlx.Connect("postgres", dbURL)
		DBDialect = DialectPostgres
	} else {
		db, err = sqlx.Connect("sqlite", "./tflops.db?_journal=WAL&_busy_timeout=10000")
		DBDialect = DialectSQLite
	}

	if err != nil {
		log.Fatalln(err)
	}

	var schema string
	if DBDialect == DialectPostgres {
		schema = `
		CREATE TABLE IF NOT EXISTS submissions (
			id SERIAL PRIMARY KEY,
			device_hash TEXT NOT NULL,
			timestamp_utc TIMESTAMP NOT NULL,
			country_code TEXT,
			os TEXT,
			arch TEXT,
			cpu_model TEXT,
			cpu_vendor TEXT,
			cpu_cores INTEGER,
			cpu_tflops REAL,
			gpu_model TEXT,
			gpu_vendor TEXT,
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
		CREATE TABLE IF NOT EXISTS global_stats_cache (
			country_code TEXT PRIMARY KEY,
			avg_score REAL,
			device_count INTEGER,
			top_score REAL,
			avg_power REAL,
			avg_carbon REAL,
			avg_ram REAL,
			top_vendor TEXT,
			updated_at TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS history_stats_cache (
			month TEXT PRIMARY KEY, -- YYYY-MM
			total_tflops REAL,
			device_count INTEGER,
			updated_at TIMESTAMP
		);
		CREATE TABLE IF NOT EXISTS leaderboard_cache (
			id SERIAL PRIMARY KEY,
			submission_id INTEGER,
			category TEXT, -- 'global' or 'country_code'
			data TEXT, -- JSON blob
			score REAL,
			updated_at TIMESTAMP
		);
		CREATE INDEX IF NOT EXISTS ix_country_score ON submissions (country_code, gpu_tflops_f32);
		CREATE INDEX IF NOT EXISTS ix_gpu_score_desc ON submissions (gpu_tflops_f32 DESC);
		CREATE INDEX IF NOT EXISTS ix_device_hash ON submissions (device_hash);
		CREATE INDEX IF NOT EXISTS ix_manufacturer ON submissions (manufacturer);
		CREATE INDEX IF NOT EXISTS ix_timestamp ON submissions (timestamp_utc);
		`
	} else {
		schema = `
		CREATE TABLE IF NOT EXISTS submissions (
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
		CREATE TABLE IF NOT EXISTS global_stats_cache (
			country_code TEXT PRIMARY KEY,
			avg_score REAL,
			device_count INTEGER,
			top_score REAL,
			avg_power REAL,
			avg_carbon REAL,
			avg_ram REAL,
			top_vendor TEXT,
			updated_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS history_stats_cache (
			month TEXT PRIMARY KEY, -- YYYY-MM
			total_tflops REAL,
			device_count INTEGER,
			updated_at DATETIME
		);
		CREATE TABLE IF NOT EXISTS leaderboard_cache (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			submission_id INTEGER,
			category TEXT, -- 'global' or 'country_code'
			data TEXT, -- JSON blob
			score REAL,
			updated_at DATETIME
		);
		CREATE INDEX IF NOT EXISTS ix_country_score ON submissions (country_code, gpu_tflops_f32);
		CREATE INDEX IF NOT EXISTS ix_gpu_score_desc ON submissions (gpu_tflops_f32 DESC);
		CREATE INDEX IF NOT EXISTS ix_device_hash ON submissions (device_hash);
		CREATE INDEX IF NOT EXISTS ix_manufacturer ON submissions (manufacturer);
		CREATE INDEX IF NOT EXISTS ix_timestamp ON submissions (timestamp_utc);
		`
	}
	db.MustExec(schema)
}
