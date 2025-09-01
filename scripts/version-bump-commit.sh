#!/bin/zsh
# Bump version, commit, push, and tag for myHours

# 1. Run version bump script
npm run version:bump || { echo 'version:bump failed'; exit 1; }

# 2. Get last commit message
git fetch origin
LAST_MSG=$(git log -1 --pretty=%B)

# 3. Add all changes
git add .

# 4. Commit with last commit message
git commit -m "$LAST_MSG"

# 5. Push to origin
git push origin

# 6. Get version from package.json
VERSION=$(node -p "require('./package.json').version")
TAG="v$VERSION"

git tag "$TAG"
git push origin --tags

echo "Version bump, commit, push, and tag complete: $TAG"
