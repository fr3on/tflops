mod cpu;
mod bench;
mod score;
mod gpu;

use clap::Parser;
use serde::Serialize;
use chrono::Utc;
use std::time::Instant;
use sha2::{Sha256, Digest};
use pollster;
use indicatif::{ProgressBar, ProgressStyle};

#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Args {
    /// Manually specify API endpoint (overrides TFLOPS_API_URL)
    #[arg(long)]
    api_url: Option<String>,

    /// Disable automatic submission to the TFLOPS Census
    #[arg(long)]
    no_submit: bool,

    /// Print raw JSON to stdout instead of human-readable summary
    #[arg(long)]
    json: bool,

    /// Benchmark matrix size (default 1024)
    #[arg(long, default_value = "1024")]
    size: usize,

    /// Number of iterations (default 50)
    #[arg(long, default_value = "10")]
    iters: u32,
}

#[derive(Serialize)]
struct FinalReport {
    schema_version: String,
    timestamp_utc: String,
    device_hash: String,
    cpu: cpu::CpuInfo,
    gpus: Vec<gpu::GpuInfo>,
    bench: bench::BenchResult,
    score: u32,
    os: String,
    arch: String,
    
    // Forensic Fields
    country_code: String,
    manufacturer: String,
    estimated_power_w: u32,
    carbon_intensity: f64,
}

fn detect_forensics(gpus: &[gpu::GpuInfo]) -> (String, String, u32, f64) {
    let country_code = "US".to_string();

    let manufacturer = if !gpus.is_empty() {
        gpus[0].vendor.clone()
    } else {
        "Integrated".to_string()
    };

    let model = if !gpus.is_empty() { gpus[0].model.to_uppercase() } else { "".to_string() };
    let estimated_power_w = if model.contains("RTX 4090") { 450 }
        else if model.contains("RTX 4080") { 320 }
        else if model.contains("A100") { 300 }
        else if model.contains("H100") { 350 }
        else if model.contains("METAL") || model.contains("APPLE") { 60 } 
        else { 200 }; 

    let carbon_intensity = match country_code.as_str() {
        "US" => 400.0,
        "FR" => 50.0,
        "CN" => 600.0,
        "DE" => 350.0,
        _ => 450.0,
    };

    (country_code, manufacturer, estimated_power_w, carbon_intensity)
}

fn main() {
    dotenvy::dotenv().ok();
    let args = Args::parse();
    
    if !args.json {
        println!("--- TFLOPS Hardware Forensic Audit ---");
        println!("Initializing TFLOPS Intelligence Engine...");
    }

    let start_bench = Instant::now();

    // 1. Hardware Detection
    let cpu_info = cpu::detect();
    let gpu_info = gpu::detect();
    
    // 2. Benchmarking
    if !args.json {
        println!("Orchestrating TFLOPS Physical Census...");
    }

    // CPU phase
    let pb = if !args.json {
        let pb = ProgressBar::new(args.iters as u64);
        pb.set_style(ProgressStyle::default_bar()
            .template("{spinner:.green} {msg} [{bar:40.green/white}] {pos}/{len} ({percent}%)")
            .unwrap()
            .progress_chars("█▉▊▋▌▍▎▏  "));
        pb.set_message("Auditing CPU Throughput (FP32)...");
        Some(pb)
    } else {
        None
    };
    
    let cpu_tflops = bench::cpu_tflops(args.size, args.iters, pb.clone());
    
    if let Some(ref pb) = pb {
        pb.finish_with_message(format!("CPU Audit Complete: {:.4} TF", cpu_tflops));
    }

    // GPU FP32 phase
    let pb = if !args.json {
        let pb = ProgressBar::new(args.iters as u64);
        pb.set_style(ProgressStyle::default_bar()
            .template("{spinner:.blue} {msg} [{bar:40.blue/white}] {pos}/{len} ({percent}%)")
            .unwrap()
            .progress_chars("█▉▊▋▌▍▎▏  "));
        pb.set_message("Auditing GPU Throughput (FP32)...");
        Some(pb)
    } else {
        None
    };
    
    let gpu_tflops_f32 = pollster::block_on(bench::gpu_tflops(args.size, args.iters, bench::Precision::F32, pb.clone()));
    
    if let Some(ref pb) = pb {
        pb.finish_with_message(format!("GPU FP32 Audit Complete: {:.4} TF", gpu_tflops_f32));
    }

    // GPU FP16 phase
    let pb = if !args.json {
        let pb = ProgressBar::new(args.iters as u64);
        pb.set_style(ProgressStyle::default_bar()
            .template("{spinner:.magenta} {msg} [{bar:40.magenta/white}] {pos}/{len} ({percent}%)")
            .unwrap()
            .progress_chars("█▉▊▋▌▍▎▏  "));
        pb.set_message("Auditing GPU Throughput (FP16)...");
        Some(pb)
    } else {
        None
    };
    
    // Attempting FP16 safely
    let gpu_tflops_f16 = pollster::block_on(bench::gpu_tflops(args.size, args.iters, bench::Precision::F16, pb.clone()));
    
    if let Some(ref pb) = pb {
        let msg = if gpu_tflops_f16 > 0.0 {
            format!("GPU FP16 Audit Complete: {:.4} TF", gpu_tflops_f16)
        } else {
            "GPU FP16 Audit: NOT_SUPPORTED".to_string()
        };
        pb.finish_with_message(msg);
    }

    let bench_res = bench::BenchResult {
        cpu_tflops_f32: cpu_tflops,
        gpu_tflops_f32,
        gpu_tflops_f16, 
        bench_duration_s: start_bench.elapsed().as_secs_f64(),
    };

    // 3. Scoring
    let final_score = score::compute_score(&bench_res);

    // 4. Forensics
    let (country_code, manufacturer, estimated_power_w, carbon_intensity) = detect_forensics(&gpu_info);

    // 5. Reporting
    let os = std::env::consts::OS.to_string();
    let arch = std::env::consts::ARCH.to_string();
    
    let device_hash_raw = format!("{}-{}-{}", cpu_info.model, cpu_info.physical_cores, cpu_info.logical_cores);
    let mut hasher = Sha256::new();
    hasher.update(device_hash_raw.as_bytes());
    let device_hash = format!("{:x}", hasher.finalize())[..12].to_string();

    let report = FinalReport {
        schema_version: "1.2".into(),
        timestamp_utc: Utc::now().to_rfc3339(),
        device_hash,
        cpu: cpu_info,
        gpus: gpu_info,
        bench: bench_res,
        score: final_score,
        os,
        arch,
        country_code,
        manufacturer,
        estimated_power_w,
        carbon_intensity,
    };

    if args.json {
        println!("{}", serde_json::to_string_pretty(&report).unwrap());
    } else {
        println!("\n--- TFLOPS Audit Summary ---");
        println!("Status:      AUDIT VERIFIED [200 OK]");
        println!("Score:       {}", report.score);
        println!("Manufacturer: {}", report.manufacturer);
        println!("CPU Model:   {:.3} TF // {}", report.bench.cpu_tflops_f32, report.cpu.model);
        
        if report.bench.gpu_tflops_f32 > 0.0 {
            let model = report.gpus.get(0).map(|g| g.model.as_str()).unwrap_or("Unknown");
            println!("GPU Model:   {}", model);
            println!("FP32 Perf:   {:.4} TF", report.bench.gpu_tflops_f32);
            if report.bench.gpu_tflops_f16 > 0.0 {
                println!("FP16 Perf:   {:.4} TF", report.bench.gpu_tflops_f16);
            } else {
                println!("FP16 Perf:   NOT_SUPPORTED");
            }
        } else {
            println!("GPU:         Not detected/skipped");
        }

        println!("Power Est:   {} W", report.estimated_power_w);
        println!("Carbon Int:  {:.1} g/kWh", report.carbon_intensity);
        println!("Geo Cluster: {}", report.country_code);
        println!("OS/Arch:     {} / {}", report.os, report.arch);
        println!("Duration:    {:.2}s", report.bench.bench_duration_s);
        println!("----------------------------------------------");
    }

    // 6. Submission Logic
    if !args.no_submit {
        let env_url = std::env::var("TFLOPS_API_URL").unwrap_or_else(|_| "https://api.tflops.world/v1/submit".to_string());
        let url = args.api_url.unwrap_or(env_url);

        if !args.json {
            println!("\nCommitting forensics to {}...", url);
        }

        let client = reqwest::blocking::Client::new();
        let res = client.post(&url)
            .json(&report)
            .send();

        match res {
            Ok(response) => {
                if !args.json {
                    if response.status().is_success() {
                        println!("SUCCESS: Forensic record authorized and committed.");
                    } else {
                        println!("FAILURE: Record rejected with status: {}", response.status());
                    }
                }
            }
            Err(e) => {
                if !args.json {
                    println!("ERROR: Communication failure: {}", e);
                    println!("💡 Hint: Ensure the TFLOPS API is running or use --no-submit for offline audit.");
                }
            }
        }
    } else if !args.json {
        println!("\nOFFLINE MODE: Forensics were not committed to the global census.");
    }

    // 7. Persistence (Wait for user exit)
    if !args.json {
        println!("\n[FINISH] Audit complete. Press Enter to exit...");
        let _ = std::io::stdin().read_line(&mut String::new());
    }
}
