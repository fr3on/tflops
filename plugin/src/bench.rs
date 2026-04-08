use rayon::prelude::*;
use std::time::Instant;
use serde::Serialize;
use indicatif::ProgressBar;

#[derive(Serialize, Debug)]
pub struct BenchResult {
    pub cpu_tflops_f32:   f64,
    pub gpu_tflops_f32:   f64,
    pub gpu_tflops_f16:   f64,
    pub bench_duration_s: f64,
}

pub enum Precision {
    F32,
    F16,
}

pub async fn gpu_tflops(size: usize, iters: u32, precision: Precision, pb: Option<ProgressBar>) -> f64 {
    let instance = wgpu::Instance::default();
    let adapter = match instance.request_adapter(&wgpu::RequestAdapterOptions {
        power_preference: wgpu::PowerPreference::HighPerformance,
        ..Default::default()
    }).await {
        Some(a) => a,
        None => return 0.0,
    };

    // Check for FP16 support if requested
    let mut required_features = wgpu::Features::empty();
    let is_f16 = match precision {
        Precision::F16 => {
            if adapter.features().contains(wgpu::Features::SHADER_F16) {
                required_features |= wgpu::Features::SHADER_F16;
                true
            } else {
                return 0.0; // Not supported by hardware
            }
        },
        Precision::F32 => false,
    };

    let (device, queue) = match adapter.request_device(&wgpu::DeviceDescriptor {
        label: None,
        required_features,
        required_limits: wgpu::Limits::default(),
    }, None).await {
        Ok(dq) => dq,
        Err(_) => return 0.0,
    };

    let shader_source = if is_f16 {
        include_str!("matmul_f16.wgsl")
    } else {
        include_str!("matmul.wgsl")
    };

    // Create Shader with error scoping to prevent panic if enable f16 fails
    device.push_error_scope(wgpu::ErrorFilter::Validation);
    
    let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
        label: Some("MatMul Shader"),
        source: wgpu::ShaderSource::Wgsl(shader_source.into()),
    });

    // Check if shader creation failed (Validation error)
    if let Some(_) = pollster::block_on(device.pop_error_scope()) {
        return 0.0;
    }

    let element_size = if is_f16 { 2 } else { 4 };
    // Ensure buffer size is aligned for vec4 (16 bytes)
    let aligned_size = (size + 63) & !63; 
    let buffer_size = (aligned_size * aligned_size * element_size) as wgpu::BufferAddress;
    
    let buf_a = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Buffer A"),
        size: buffer_size,
        usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: false,
    });
    let buf_b = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Buffer B"),
        size: buffer_size,
        usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        mapped_at_creation: false,
    });
    let buf_c = device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Buffer C"),
        size: buffer_size,
        usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_SRC,
        mapped_at_creation: false,
    });

    let bind_group_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: None,
        entries: &[
            wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer { ty: wgpu::BufferBindingType::Storage { read_only: true }, has_dynamic_offset: false, min_binding_size: None },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 1,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer { ty: wgpu::BufferBindingType::Storage { read_only: true }, has_dynamic_offset: false, min_binding_size: None },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 2,
                visibility: wgpu::ShaderStages::COMPUTE,
                ty: wgpu::BindingType::Buffer { ty: wgpu::BufferBindingType::Storage { read_only: false }, has_dynamic_offset: false, min_binding_size: None },
                count: None,
            },
        ],
    });

    let bind_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: None,
        layout: &bind_group_layout,
        entries: &[
            wgpu::BindGroupEntry { binding: 0, resource: buf_a.as_entire_binding() },
            wgpu::BindGroupEntry { binding: 1, resource: buf_b.as_entire_binding() },
            wgpu::BindGroupEntry { binding: 2, resource: buf_c.as_entire_binding() },
        ],
    });

    let pipeline_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
        label: None,
        bind_group_layouts: &[&bind_group_layout],
        push_constant_ranges: &[],
    });

    let compute_pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
        label: None,
        layout: Some(&pipeline_layout),
        module: &shader,
        entry_point: "main",
    });

    // Warmup
    let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
    {
        let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor { label: None, timestamp_writes: None });
        compute_pass.set_pipeline(&compute_pipeline);
        compute_pass.set_bind_group(0, &bind_group, &[]);
        // Dispatch for 64x64 tiles
        compute_pass.dispatch_workgroups((aligned_size as u32 + 63) / 64, (aligned_size as u32 + 63) / 64, 1);
    }
    queue.submit(Some(encoder.finish()));
    device.poll(wgpu::Maintain::Wait);

    let start = Instant::now();
    for _ in 0..iters {
        let mut encoder = device.create_command_encoder(&wgpu::CommandEncoderDescriptor { label: None });
        {
            let mut compute_pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor { label: None, timestamp_writes: None });
            compute_pass.set_pipeline(&compute_pipeline);
            compute_pass.set_bind_group(0, &bind_group, &[]);
            compute_pass.dispatch_workgroups((aligned_size as u32 + 63) / 64, (aligned_size as u32 + 63) / 64, 1);
        }
        queue.submit(Some(encoder.finish()));
        if let Some(ref b) = pb {
            b.inc(1);
        }
    }
    // Sync ONCE at the end of the batch
    device.poll(wgpu::Maintain::Wait);
    let elapsed = start.elapsed().as_secs_f64();

    let flops = 2.0 * (size as f64).powi(3) * iters as f64;
    flops / elapsed / 1e12
}

pub fn cpu_tflops(size: usize, iters: u32, pb: Option<ProgressBar>) -> f64 {
    let a: Vec<f32> = (0..size * size).map(|i| i as f32 * 0.001).collect();
    let b: Vec<f32> = (0..size * size).map(|i| i as f32 * 0.001).collect();
    let mut c = vec![0f32; size * size];

    matmul(&a, &b, &mut c, size);

    let start = Instant::now();
    for _ in 0..iters {
        matmul(&a, &b, &mut c, size);
        if let Some(ref p) = pb {
            p.inc(1);
        }
    }
    let elapsed = start.elapsed().as_secs_f64();

    let total_flops = 2.0 * (size as f64).powi(3) * iters as f64;
    total_flops / elapsed / 1e12
}

fn matmul(a: &[f32], b: &[f32], c: &mut [f32], n: usize) {
    c.par_chunks_mut(n).enumerate().for_each(|(i, row)| {
        for j in 0..n {
            let mut sum = 0.0f32;
            for k in 0..n {
                sum += a[i * n + k] * b[k * n + j];
            }
            row[j] = sum;
        }
    });
}
