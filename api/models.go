package main

import "time"

type BenchSubmission struct {
	ID               int       `db:"id" json:"id"`
	DeviceHash       string    `db:"device_hash" json:"device_hash"`
	TimestampUTC     time.Time `db:"timestamp_utc" json:"timestamp_utc"`
	CountryCode      string    `db:"country_code" json:"country_code"`
	OS               string    `db:"os" json:"os"`
	Arch             string    `db:"arch" json:"arch"`
	CPUModel         string    `db:"cpu_model" json:"cpu_model"`
	CPUCores         int       `db:"cpu_cores" json:"cpu_cores"`
	CPUTflops        float64   `db:"cpu_tflops" json:"cpu_tflops"`
	GPUModel         string    `db:"gpu_model" json:"gpu_model"`
	GPUTflopsF32     *float64  `db:"gpu_tflops_f32" json:"gpu_tflops_f32"`
	GPUTflopsF16     *float64  `db:"gpu_tflops_f16" json:"gpu_tflops_f16"`
	RAMTotalGB       int       `db:"ram_total_gb" json:"ram_total_gb"`
	VRAMTotalGB      int       `db:"vram_total_gb" json:"vram_total_gb"`
	EstimatedPowerW  int       `db:"estimated_power_w" json:"estimated_power_w"`
	CarbonIntensity  float64   `db:"carbon_intensity" json:"carbon_intensity"`
	Manufacturer     string    `db:"manufacturer" json:"manufacturer"`
	Score            int       `db:"score" json:"score"`
	SchemaVer        string    `db:"schema_ver" json:"schema_ver"`
}

type SubmitPayload struct {
	SchemaVersion string                 `json:"schema_version"`
	TimestampUTC  string                 `json:"timestamp_utc"`
	DeviceHash    string                 `json:"device_hash"`
	CPU           map[string]interface{} `json:"cpu"`
	GPUs          []map[string]interface{} `json:"gpus"`
	Bench         map[string]interface{} `json:"bench"`
	Score         int                    `json:"score"`
	OS            string                 `json:"os"`
	Arch          string                 `json:"arch"`

	// New Forensic Fields
	CountryCode     string  `json:"country_code"`
	Manufacturer    string  `json:"manufacturer"`
	EstimatedPowerW int     `json:"estimated_power_w"`
	CarbonIntensity float64 `json:"carbon_intensity"`
}
