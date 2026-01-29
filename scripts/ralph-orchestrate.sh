#!/bin/bash
#
# Ralph Wiggum Orchestrator for Content Calendar
#
# Usage:
#   ./scripts/ralph-orchestrate.sh           # Interactive mode (pauses between phases)
#   ./scripts/ralph-orchestrate.sh --auto    # Auto-continue mode
#   ./scripts/ralph-orchestrate.sh --phase 3 # Start from specific phase
#

set -e

AUTO_MODE=false
START_PHASE=1

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --auto)
      AUTO_MODE=true
      shift
      ;;
    --phase)
      START_PHASE="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Phase definitions
declare -A PHASES=(
  [1]=".ralph/prompts/phase-1-database.md|PHASE 1 COMPLETE|15"
  [2]=".ralph/prompts/phase-2-types-hooks.md|PHASE 2 COMPLETE|20"
  [3]=".ralph/prompts/phase-3-calendar-ui.md|PHASE 3 COMPLETE|20"
  [4]=".ralph/prompts/phase-4-project-detail.md|PHASE 4 COMPLETE|15"
  [5]=".ralph/prompts/phase-5-asset-editor.md|PHASE 5 COMPLETE|20"
  [6]=".ralph/prompts/phase-6-navigation.md|PHASE 6 COMPLETE|10"
  [7]=".ralph/prompts/phase-7-migration.md|CALENDAR SYSTEM COMPLETE|15"
)

check_phase_complete() {
  local phase=$1
  if [[ -f ".ralph/state/phase-${phase}-complete.md" ]]; then
    return 0
  fi
  return 1
}

run_phase() {
  local phase=$1
  local config="${PHASES[$phase]}"

  IFS='|' read -r prompt promise max_iter <<< "$config"

  echo ""
  echo "=========================================="
  echo "  Phase $phase"
  echo "=========================================="
  echo "Prompt: $prompt"
  echo "Promise: $promise"
  echo "Max iterations: $max_iter"
  echo ""

  if check_phase_complete "$phase"; then
    echo "✅ Phase $phase already complete. Skipping."
    return 0
  fi

  if [[ "$AUTO_MODE" == "false" ]]; then
    echo "Press Enter to start Phase $phase, or Ctrl+C to abort..."
    read -r
  fi

  # Run the Ralph loop
  # Note: This assumes you're running from within Claude Code
  # In practice, you'd invoke this differently
  echo "Run the following command in Claude Code:"
  echo ""
  echo "  /ralph-loop \"$(cat "$prompt")\" --completion-promise \"$promise\" --max-iterations $max_iter"
  echo ""

  if [[ "$AUTO_MODE" == "false" ]]; then
    echo "Press Enter when Phase $phase is complete..."
    read -r
  fi
}

echo "========================================"
echo "  Content Calendar Ralph Orchestrator"
echo "========================================"
echo ""
echo "Mode: $(if $AUTO_MODE; then echo 'Auto'; else echo 'Interactive'; fi)"
echo "Starting from: Phase $START_PHASE"
echo ""

for phase in $(seq "$START_PHASE" 7); do
  run_phase "$phase"
done

echo ""
echo "=========================================="
echo "  All Phases Complete!"
echo "=========================================="
echo ""
echo "Check .ralph/state/ALL-PHASES-COMPLETE.md for final status."
