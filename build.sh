#!/bin/bash

# TFLOPS Build Orchestration Script
# Builds API (Go - Linux Only) and Plugin (Rust - All Platforms).

set -e

DIST_DIR="dist"
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR/linux" "$DIST_DIR/windows" "$DIST_DIR/macos"

echo "🚀 Starting TFLOPS multi-platform build..."

LOCAL_ONLY=false
if [[ "$1" == "--local-only" ]]; then
    LOCAL_ONLY=true
    echo "  📍 Local-only mode enabled."
fi

# --- GO API BUILD ---
echo "📦 Building TFLOPS API (Linux Only)..."

# Linux
echo "  - Linux (amd64)"
cd api && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o ../"$DIST_DIR/linux/tflops-api" . && cd ..

# --- RUST PLUGIN BUILD ---
echo "🦀 Building Rust Plugin..."

# Check for cross and docker
USE_CROSS=false
DOCKER_RUNNING=false
if docker info &> /dev/null; then
    DOCKER_RUNNING=true
fi

if command -v cross &> /dev/null; then
    if [ "$DOCKER_RUNNING" = true ]; then
        USE_CROSS=true
        echo "  ✨ Using 'cross' + Docker for Linux/Windows targets"
    else
        echo "  ⚠️  'cross' found, but Docker daemon is NOT running. Skipping cross-builds."
    fi
else
    echo "  💡 Hint: Install 'cross' (cargo install cross) and start Docker for multi-platform builds."
fi

build_rust() {
    local target=$1
    local dest_filename=$2
    local dest_dir=$3
    
    # Cargo bin name (always what's in Cargo.toml)
    local bin_name="tflops"
    if [[ "$target" == *"windows"* ]]; then
        bin_name="tflops.exe"
    fi
    
    echo "  - $target"
    
    # Use cross for non-macos targets if available
    if [[ "$target" != *"apple"* ]] && [ "$USE_CROSS" = true ]; then
        cd plugin
        cross build --release --target "$target"
        cp "../target/$target/release/$bin_name" "../$dest_dir/$dest_filename"
        cd ..
    else
        # Fallback to standard cargo (requires local toolchain)
        if rustup target add "$target" > /dev/null 2>&1; then
            cd plugin
            cargo build --release --target "$target"
            cp "../target/$target/release/$bin_name" "../$dest_dir/$dest_filename"
            cd ..
        else
            echo "  ⚠️  Target $target not found and 'cross' is not available. Skipping."
        fi
    fi
}

# Mac Silicon
build_rust "aarch64-apple-darwin" "tflops-arm64" "$DIST_DIR/macos"

# Mac Intel
build_rust "x86_64-apple-darwin" "tflops-x86_64" "$DIST_DIR/macos"

# Create universal binary for plugin
echo "  - Creating Universal Plugin Binary"
if [ -f "$DIST_DIR/macos/tflops-arm64" ] && [ -f "$DIST_DIR/macos/tflops-x86_64" ]; then
    lipo -create -output "$DIST_DIR/macos/tflops" "$DIST_DIR/macos/tflops-arm64" "$DIST_DIR/macos/tflops-x86_64"
    rm "$DIST_DIR/macos/tflops-arm64" "$DIST_DIR/macos/tflops-x86_64"
elif [ -f "$DIST_DIR/macos/tflops-arm64" ]; then
    mv "$DIST_DIR/macos/tflops-arm64" "$DIST_DIR/macos/tflops"
elif [ -f "$DIST_DIR/macos/tflops-x86_64" ]; then
    mv "$DIST_DIR/macos/tflops-x86_64" "$DIST_DIR/macos/tflops"
fi

# Linux (musl for static binary)
if [ "$LOCAL_ONLY" = false ]; then
    build_rust "x86_64-unknown-linux-musl" "tflops" "$DIST_DIR/linux"
    build_rust "x86_64-pc-windows-gnu" "tflops.exe" "$DIST_DIR/windows"
fi

echo "✅ Build complete! Binaries are in the '$DIST_DIR' folder."
