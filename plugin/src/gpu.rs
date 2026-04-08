use serde::Serialize;
use wgpu;
use sysinfo::System;

#[derive(Serialize, Debug, Clone)]
pub struct GpuInfo {
    pub vendor:      String,   // "NVIDIA" | "AMD" | "Apple" | "Intel" | "none"
    pub model:       String,
    pub vram_mb:     u64,
    pub compute_api: String,   // "CUDA" | "Metal" | "Vulkan" | "OpenCL" | "none"
    pub driver_ver:  String,
}

pub fn detect() -> Vec<GpuInfo> {
    let mut gpus = Vec::new();
    let mut sys = System::new_all();
    sys.refresh_memory();

    // 1. Try wgpu (Universal)
    let instance = wgpu::Instance::default();
    let adapters = instance.enumerate_adapters(wgpu::Backends::all());

    for adapter in adapters {
        let info = adapter.get_info();
        
        // Skip software implementations for benchmarking
        if info.device_type == wgpu::DeviceType::Cpu {
            continue;
        }

        let mut vendor = match info.vendor {
            0x10DE => "NVIDIA".to_string(),
            0x1002 => "AMD".to_string(),
            0x8086 => "Intel".to_string(),
            0x106B => "Apple".to_string(),
            _ => format!("Vendor(0x{:x})", info.vendor),
        };

        // Fallback for cases where vendor ID is 0 or generic (Common on Apple Silicon)
        if (info.vendor == 0 || info.vendor == 0xffff) && info.name.to_lowercase().contains("apple") {
            vendor = "Apple".to_string();
        }

        let compute_api = match info.backend {
            wgpu::Backend::Vulkan => "Vulkan".to_string(),
            wgpu::Backend::Metal => "Metal".to_string(),
            wgpu::Backend::Dx12 => "DX12".to_string(),
            wgpu::Backend::Gl => "OpenGL/WebGL".to_string(),
            _ => "Generic".to_string(),
        };

        let mut vram_mb = 0;
        if vendor == "Apple" {
            vram_mb = sys.total_memory() / 1024 / 1024;
        }

        gpus.push(GpuInfo {
            vendor,
            model: info.name,
            vram_mb, 
            compute_api,
            driver_ver: info.driver_info,
        });
    }

    // 2. Platform-specific refinements
    // On macOS, we can use the metal crate for more detail if needed,
    // but wgpu already picks up Metal backend info.
    
    // On Windows/Linux with NVIDIA, we could use NVML for VRAM specifically.
    #[cfg(feature = "nvidia")]
    {
        use nvml_wrapper::Nvml;
        if let Ok(nvml) = Nvml::init() {
            if let Ok(device_count) = nvml.device_count() {
                for i in 0..device_count {
                    if let Ok(device) = nvml.device_by_index(i) {
                        // Match with wgpu entries or replace if we find better info
                        if let Ok(mem) = device.memory_info() {
                             // Update VRAM if we can match by model
                             if let Ok(name) = device.name() {
                                 for gpu in gpus.iter_mut() {
                                     if gpu.model.contains(&name) || name.contains(&gpu.model) {
                                         gpu.vram_mb = mem.total / 1024 / 1024;
                                     }
                                 }
                             }
                        }
                    }
                }
            }
        }
    }

    gpus
}
