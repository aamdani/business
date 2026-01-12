#!/bin/bash
#
# Daily Nate's Substack Sync Script
#
# This script:
# 1. Ensures Chrome with CDP is running (for authenticated access)
# 2. Runs the sync script (fetches HTML directly via CDP, preserves links)
# 3. Logs output to ~/Library/Logs/content-master-pro/
#
# Install as LaunchAgent for daily automation:
#   ./scripts/manage-sync-schedule.sh install
#
# Or manually:
#   cp scripts/com.contentmasterpro.sync.plist ~/Library/LaunchAgents/
#   launchctl load ~/Library/LaunchAgents/com.contentmasterpro.sync.plist
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$HOME/Library/Logs/content-master-pro"
LOG_FILE="$LOG_DIR/sync-$(date +%Y-%m-%d).log"
CHROME_PROFILE="$HOME/.chrome-substack-profile"
CDP_PORT=9222

# Create log directory
mkdir -p "$LOG_DIR"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "=== Starting Nate's Substack Sync ==="
log "Project: $PROJECT_DIR"

# Check if Chrome with CDP is running
check_cdp() {
    curl -s "http://127.0.0.1:$CDP_PORT/json/version" > /dev/null 2>&1
}

# Start Chrome with CDP if not running
if ! check_cdp; then
    log "Chrome CDP not running, starting..."
    
    # Start Chrome in background with CDP enabled
    open -na "Google Chrome" --args \
        --remote-debugging-port=$CDP_PORT \
        --user-data-dir="$CHROME_PROFILE" \
        --no-first-run \
        --disable-sync &
    
    # Wait for Chrome to start (up to 30 seconds)
    for i in {1..30}; do
        if check_cdp; then
            log "Chrome CDP started successfully"
            break
        fi
        sleep 1
    done
    
    if ! check_cdp; then
        log "ERROR: Failed to start Chrome with CDP"
        exit 1
    fi
else
    log "Chrome CDP already running"
fi

# Navigate to project directory
cd "$PROJECT_DIR"

# Run the sync script
log "Running sync script..."
npx tsx scripts/sync-nate-full.ts 2>&1 | tee -a "$LOG_FILE"
SYNC_EXIT_CODE=${PIPESTATUS[0]}

if [ $SYNC_EXIT_CODE -eq 0 ]; then
    log "Sync completed successfully"
else
    log "ERROR: Sync failed with exit code $SYNC_EXIT_CODE"
fi

# Cleanup old logs (keep last 30 days)
find "$LOG_DIR" -name "sync-*.log" -mtime +30 -delete 2>/dev/null || true

log "=== Sync finished ==="

exit $SYNC_EXIT_CODE
