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

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
  echo ""
  echo "Creating .env.local from .env.example..."
  cp .env.example .env.local

  # Generate REVALIDATE_SECRET if openssl is available
  if command -v openssl &> /dev/null; then
    SECRET=$(openssl rand -hex 32)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s/REVALIDATE_SECRET=/REVALIDATE_SECRET=$SECRET/" .env.local
    else
      sed -i "s/REVALIDATE_SECRET=/REVALIDATE_SECRET=$SECRET/" .env.local
    fi
    echo "  Generated REVALIDATE_SECRET in .env.local"
  else
    echo "  WARNING: openssl not found — set REVALIDATE_SECRET manually in .env.local"
  fi
else
  echo ".env.local already exists — skipping."
fi

echo ""
echo "Setup complete. Run 'npm run dev' to start the app."
echo ""
echo "DB sync commands:"
echo "  npm run db:commit       — checkpoint WAL + stage db/ (then git commit)"
echo "  npm run db:pull-sync    — apply pending migrations after git pull"
echo "  npm run db:export-seeds — regenerate seed files from live DB"
echo ""
echo "Environment:"
echo "  .env.local              — machine-local secrets (never committed)"
echo "  .env.example            — shows required variables; copy to .env.local on new machines"
