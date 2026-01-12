#!/bin/bash
#
# Manage Daily Sync LaunchAgent
#
# Usage:
#   ./manage-sync-schedule.sh install    # Install and enable daily sync
#   ./manage-sync-schedule.sh uninstall  # Remove daily sync
#   ./manage-sync-schedule.sh status     # Check if scheduled
#   ./manage-sync-schedule.sh run        # Run sync now (test)
#   ./manage-sync-schedule.sh logs       # View recent logs
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLIST_SRC="$SCRIPT_DIR/com.contentmasterpro.sync.plist"
PLIST_DST="$HOME/Library/LaunchAgents/com.contentmasterpro.sync.plist"
LABEL="com.contentmasterpro.sync"
LOG_DIR="$HOME/Library/Logs/content-master-pro"

case "$1" in
    install)
        echo "📦 Installing daily sync schedule..."
        
        # Create log directory
        mkdir -p "$LOG_DIR"
        
        # Copy plist to LaunchAgents
        cp "$PLIST_SRC" "$PLIST_DST"
        
        # Load the LaunchAgent
        launchctl load "$PLIST_DST"
        
        echo "✅ Daily sync installed!"
        echo "   Schedule: Every day at 6:00 AM"
        echo "   Logs: $LOG_DIR/"
        echo ""
        echo "To run a test sync now:"
        echo "   ./manage-sync-schedule.sh run"
        ;;
        
    uninstall)
        echo "🗑️  Removing daily sync schedule..."
        
        # Unload if running
        launchctl unload "$PLIST_DST" 2>/dev/null || true
        
        # Remove plist
        rm -f "$PLIST_DST"
        
        echo "✅ Daily sync removed"
        ;;
        
    status)
        echo "📊 Sync Schedule Status"
        echo ""
        
        if [ -f "$PLIST_DST" ]; then
            echo "✅ LaunchAgent installed at: $PLIST_DST"
            
            # Check if loaded
            if launchctl list | grep -q "$LABEL"; then
                echo "✅ LaunchAgent is loaded and active"
                launchctl list "$LABEL"
            else
                echo "⚠️  LaunchAgent is installed but not loaded"
                echo "   Run: launchctl load $PLIST_DST"
            fi
        else
            echo "❌ LaunchAgent not installed"
            echo "   Run: ./manage-sync-schedule.sh install"
        fi
        
        echo ""
        echo "📁 Log directory: $LOG_DIR"
        if [ -d "$LOG_DIR" ]; then
            echo "   Recent logs:"
            ls -lt "$LOG_DIR" 2>/dev/null | head -5
        fi
        ;;
        
    run)
        echo "🚀 Running sync now..."
        "$SCRIPT_DIR/daily-sync.sh"
        ;;
        
    logs)
        echo "📜 Recent Sync Logs"
        echo ""
        
        # Show most recent log
        LATEST_LOG=$(ls -t "$LOG_DIR"/sync-*.log 2>/dev/null | head -1)
        
        if [ -n "$LATEST_LOG" ]; then
            echo "Latest log: $LATEST_LOG"
            echo "=========================================="
            tail -50 "$LATEST_LOG"
        else
            echo "No logs found in $LOG_DIR"
        fi
        ;;
        
    *)
        echo "Usage: $0 {install|uninstall|status|run|logs}"
        echo ""
        echo "Commands:"
        echo "  install    - Install LaunchAgent for daily sync at 6 AM"
        echo "  uninstall  - Remove LaunchAgent"
        echo "  status     - Check if sync is scheduled"
        echo "  run        - Run sync immediately"
        echo "  logs       - View recent sync logs"
        exit 1
        ;;
esac
