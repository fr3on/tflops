enable f16;

@group(0) @binding(0) var<storage, read> matrix_a: array<f16>;
@group(0) @binding(1) var<storage, read> matrix_b: array<f16>;
@group(0) @binding(2) var<storage, read_write> matrix_c: array<f16>;

const TILE_SIZE: u32 = 16u;

var<workgroup> tile_a: array<f16, 256>; // 16 * 16
var<workgroup> tile_b: array<f16, 256>; // 16 * 16

@compute @workgroup_size(16, 16)
fn main(
    @builtin(global_invocation_id) global_id: vec3<u32>,
    @builtin(local_invocation_id) local_id: vec3<u32>,
    @builtin(workgroup_id) group_id: vec3<u32>
) {
    let row = global_id.y;
    let col = global_id.x;
    
    let total_elements = arrayLength(&matrix_a);
    let n = u32(sqrt(f32(total_elements)));
    
    var sum = 0.0h;
    
    let num_tiles = (n + TILE_SIZE - 1u) / TILE_SIZE;
    
    for (var t = 0u; t < num_tiles; t = t + 1u) {
        let a_row = row;
        let a_col = t * TILE_SIZE + local_id.x;
        if (a_row < n && a_col < n) {
            tile_a[local_id.y * TILE_SIZE + local_id.x] = matrix_a[a_row * n + a_col];
        } else {
            tile_a[local_id.y * TILE_SIZE + local_id.x] = 0.0h;
        }
        
        let b_row = t * TILE_SIZE + local_id.y;
        let b_col = col;
        if (b_row < n && b_col < n) {
            tile_b[local_id.y * TILE_SIZE + local_id.x] = matrix_b[b_row * n + b_col];
        } else {
            tile_b[local_id.y * TILE_SIZE + local_id.x] = 0.0h;
        }
        
        workgroupBarrier();
        
        for (var k = 0u; k < TILE_SIZE; k = k + 1u) {
            sum += tile_a[local_id.y * TILE_SIZE + k] * tile_b[k * TILE_SIZE + local_id.x];
        }
        
        workgroupBarrier();
    }
    
    if (row < n && col < n) {
        matrix_c[row * n + col] = sum;
    }
}
