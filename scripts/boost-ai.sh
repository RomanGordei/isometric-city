#!/bin/bash
# Script to give the AI resources for testing
# Usage: ./scripts/boost-ai.sh [food] [wood] [metal] [gold]
# Default: 100 of each

FOOD=${1:-100}
WOOD=${2:-100}
METAL=${3:-100}
GOLD=${4:-100}

echo "Boosting AI with: +$FOOD food, +$WOOD wood, +$METAL metal, +$GOLD gold"

curl -s -X POST http://localhost:3000/api/ron-ai-boost \
  -H "Content-Type: application/json" \
  -d "{\"food\": $FOOD, \"wood\": $WOOD, \"metal\": $METAL, \"gold\": $GOLD}" | jq .

echo ""
echo "Boost request sent! The AI will receive resources on its next turn."
