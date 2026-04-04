#!/usr/bin/env bash
set -e

echo "Setting up Command Center..."

# Check Node version
REQUIRED_NODE=20
CURRENT_NODE=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$CURRENT_NODE" -lt "$REQUIRED_NODE" ]; then
  echo "Error: Node.js $REQUIRED_NODE+ required (found v$CURRENT_NODE)"
  exit 1
fi

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Ensure db directory exists
mkdir -p db

# Apply database migrations
echo "Applying database migrations..."
npx drizzle-kit migrate

# Seed initial data
echo "Seeding database..."
npx tsx db/seed.ts
npx tsx db/seed-projects.ts
npx tsx db/seed-settings.ts

# Activate git hooks
echo "Activating git hooks..."
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/post-merge

echo ""
echo "Setup complete. Run 'npm run dev' to start the app."
echo ""
echo "DB sync commands:"
echo "  npm run db:commit       — checkpoint WAL + stage db/ (then git commit)"
echo "  npm run db:pull-sync    — apply pending migrations after git pull"
echo "  npm run db:export-seeds — regenerate seed files from live DB"
