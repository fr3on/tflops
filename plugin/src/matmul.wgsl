@group(0) @binding(0) var<storage, read> matrix_a: array<f32>;
@group(0) @binding(1) var<storage, read> matrix_b: array<f32>;
@group(0) @binding(2) var<storage, read_write> matrix_c: array<f32>;

const BM: u32 = 64u; // Block size M
const BN: u32 = 64u; // Block size N
const BK: u32 = 8u;  // Block size K (Smaler K to save shared memory)

const TM: u32 = 8u;  // Thread block M (8 elements per thread)
const TN: u32 = 8u;  // Thread block N (8 elements per thread)

var<workgroup> tile_a: array<f32, 512>; // 64 * 8
var<workgroup> tile_b: array<f32, 512>; // 8 * 64

@compute @workgroup_size(8, 8) // 64 threads
fn main(
    @builtin(local_invocation_id) local_id: vec3<u32>,
    @builtin(workgroup_id) group_id: vec3<u32>
) {
    let total_elements = arrayLength(&matrix_a);
    let n = u32(sqrt(f32(total_elements)));
    
    let tid = local_id.y * 8u + local_id.x; // 0-63
    
    // Each thread computes an 8x8 block in C
    var sums: array<f32, 64>; // 8x8 register accumulation
    for (var i = 0u; i < 64u; i = i + 1u) { sums[i] = 0.0f; }
    
    let num_tiles = (n + BK - 1u) / BK;
    
    for (var t = 0u; t < num_tiles; t = t + 1u) {
        // Load Matrix A (64x8 tile) into shared memory using 64 threads
        // Each thread loads 512 / 64 = 8 elements
        for (var i = 0u; i < 8u; i = i + 1u) {
            let load_idx = tid + (i * 64u);
            let load_row = load_idx / BK;
            let load_col = load_idx % BK;
            
            let ga_row = group_id.y * BM + load_row;
            let ga_col = t * BK + load_col;
            if (ga_row < n && ga_col < n) {
                tile_a[load_idx] = matrix_a[ga_row * n + ga_col];
            } else {
                tile_a[load_idx] = 0.0f;
            }
            
            // Load Matrix B (8x64 tile) into shared memory
            let gb_row = t * BK + load_row;
            let gb_col = group_id.x * BN + load_col; // Note: reuse load_row/col logic for symmetry
            // Wait, logic for B loading needs to correctly cover 8x64
            // 512 elements. tid + i*64 covers 0-511. 
            // load_row (0-7), load_col (0-63)
            let b_load_row = load_idx / BN;
            let b_load_col = load_idx % BN;
            let gb_row_b = t * BK + b_load_row;
            let gb_col_b = group_id.x * BN + b_load_col;
            if (gb_row_b < n && gb_col_b < n) {
                tile_b[load_idx] = matrix_b[gb_row_b * n + gb_col_b];
            } else {
                tile_b[load_idx] = 0.0f;
            }
        }
        
        workgroupBarrier();
        
        // Compute 8x8 sub-tile using data in shared memory
        for (var k = 0u; k < BK; k = k + 1u) {
            // Register cache for current K of B (8 values)
            var b_reg: array<f32, 8>;
            for (var bn = 0u; bn < 8u; bn = bn + 1u) {
                b_reg[bn] = tile_b[k * BN + (local_id.x * TN + bn)];
            }
            
            for (var tm = 0u; tm < 8u; tm = tm + 1u) {
                let a_val = tile_a[(local_id.y * TM + tm) * BK + k];
                for (var tn = 0u; tn < 8u; tn = tn + 1u) {
                    sums[tm * 8u + tn] += a_val * b_reg[tn];
                }
            }
        }
        
        workgroupBarrier();
    }
    
    // Write 8x8 results to global memory
    for (var tm = 0u; tm < 8u; tm = tm + 1u) {
        let gr = group_id.y * BM + local_id.y * TM + tm;
        if (gr >= n) { continue; }
        for (var tn = 0u; tn < 8u; tn = tn + 1u) {
            let gc = group_id.x * BN + local_id.x * TN + tn;
            if (gc < n) {
                matrix_c[gr * n + gc] = sums[tm * 8u + tn];
            }
        }
    }
}
