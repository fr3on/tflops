use crate::bench::BenchResult;

/// Blended score: 40% CPU + 60% GPU (or 100% CPU if no GPU).
/// Normalized against reference constants.
pub fn compute_score(bench: &BenchResult) -> u32 {
    // Reference constants (configurable in later steps)
    // For now, based on instruction constants
    let cpu_scale = 1_000_000.0; // 0.001 TFLOPS = 1000 points
    let gpu_scale = 2_000.0;     // 1.0 TFLOPS = 2000 points
    
    let cpu_pts = (bench.cpu_tflops_f32 * cpu_scale).min(1500.0);
    
    let gpu_pts = (bench.gpu_tflops_f32 * gpu_scale).min(20000.0);

    if bench.gpu_tflops_f32 == 0.0 && bench.gpu_tflops_f16 == 0.0 {
        // Scale CPU pts to the 1000 range if it's CPU only
        // 400.0 / 0.4 = 1000.0
        (cpu_pts / 0.4) as u32
    } else {
        (cpu_pts + gpu_pts) as u32
    }
}
