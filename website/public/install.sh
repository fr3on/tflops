#!/bin/bash

# TFLOPS CLI Universal Installer
# Usage: curl -sSL https://tflops.world/install.sh | bash

set -e

# --- Configuration ---
BINARY_NAME="tflops"
INSTALL_DIR="/usr/local/bin"
BASE_URL="https://tflops.world/bin" # Hosted on the static website

# --- Visuals ---
BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}--- TFLOPS Intelligence CLI Installer ---${NC}"

# --- OS/Arch Detection ---
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

case "$OS" in
    linux) OS_TYPE="linux" ;;
    darwin) OS_TYPE="macos" ;;
    *) echo -e "${RED}Error: Unsupported OS ($OS)${NC}"; exit 1 ;;
esac

case "$ARCH" in
    x86_64) ARCH_TYPE="x86_64" ;;
    aarch64|arm64) ARCH_TYPE="aarch64" ;;
    *) echo -e "${RED}Error: Unsupported Architecture ($ARCH)${NC}"; exit 1 ;;
esac

# Construct download URL
# Expecting binaries named like: tflops-macos-aarch64, tflops-linux-x86_64, etc.
DOWNLOAD_URL="${BASE_URL}/${BINARY_NAME}-${OS_TYPE}-${ARCH_TYPE}"

echo -e "Detecting Environment: ${GREEN}${OS_TYPE}/${ARCH_TYPE}${NC}"
echo -e "Target Location:      ${GREEN}${INSTALL_DIR}/${BINARY_NAME}${NC}"

# --- Installation ---
TMP_BIN="/tmp/${BINARY_NAME}"

echo -e "\nDownloading TFLOPS Intelligence Engine..."
if ! curl -L -f -o "$TMP_BIN" "$DOWNLOAD_URL"; then
    echo -e "${RED}Error: Failed to download binary for your platform.${NC}"
    echo "Double check that the binary is hosted at $DOWNLOAD_URL"
    exit 1
fi

chmod +x "$TMP_BIN"

echo -e "Installing to system path (requires sudo)..."
if sudo mv "$TMP_BIN" "$INSTALL_DIR/$BINARY_NAME"; then
    echo -e "\n${GREEN}SUCCESS: TFLOPS Audit CLI installed successfully!${NC}"
    echo -e "Run ${BLUE}${BINARY_NAME} --help${NC} to begin your hardware forensic audit."
else
    echo -e "${RED}Error: Failed to move binary to $INSTALL_DIR. Check permissions.${NC}"
    exit 1
fi
