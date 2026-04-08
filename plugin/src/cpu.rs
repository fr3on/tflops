use sysinfo::System;
use serde::Serialize;

#[derive(Serialize, Debug)]
pub struct CpuInfo {
    pub model:          String,
    pub physical_cores: usize,
    pub logical_cores:  usize,
    pub base_freq_mhz:  u64,
    pub ram_total_gb:   u64,
    pub features:       Vec<String>,   // "avx2", "avx512f", "neon", etc.
}

pub fn detect() -> CpuInfo {
    let mut sys = System::new_all();
    sys.refresh_all();
    
    // Safety: assume there is at least one CPU
    let cpus = sys.cpus();
    let cpu = &cpus[0];

    let mut features = vec![];
    #[cfg(target_arch = "x86_64")] {
        if is_x86_feature_detected!("avx2")   { features.push("avx2".into()); }
        if is_x86_feature_detected!("avx512f"){ features.push("avx512f".into()); }
        if is_x86_feature_detected!("fma")    { features.push("fma".into()); }
    }
    #[cfg(target_arch = "aarch64")] {
        features.push("neon".into());
    }

    CpuInfo {
        model:          cpu.brand().to_trim().to_string(),
        physical_cores: sys.physical_core_count().unwrap_or(1),
        logical_cores:  cpus.len(),
        base_freq_mhz:  cpu.frequency(),
        ram_total_gb:   sys.total_memory() / 1024 / 1024 / 1024,
        features,
    }
}

trait TrimExt {
    fn to_trim(&self) -> &str;
}

impl TrimExt for str {
    fn to_trim(&self) -> &str {
        self.trim()
    }
}
