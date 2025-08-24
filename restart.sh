#!/bin/bash

# 🔥 Thermal Eye - Restart Script
# Gracefully restarts all Thermal Eye services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Restarting Thermal Eye Services...${NC}"
echo "===================================="

# Parse arguments to pass to start script
START_ARGS=""
for arg in "$@"; do
    START_ARGS="$START_ARGS $arg"
done

echo -e "${BLUE}🛑 Stopping current services...${NC}"
./stop.sh

echo ""
echo -e "${BLUE}⏳ Waiting 3 seconds...${NC}"
sleep 3

echo ""
echo -e "${BLUE}🚀 Starting services...${NC}"
./start.sh $START_ARGS

echo ""
echo -e "${GREEN}🎉 Thermal Eye services restarted successfully!${NC}"
