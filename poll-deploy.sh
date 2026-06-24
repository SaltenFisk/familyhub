#!/bin/bash
# Polls GitHub for new commits on main and self-deploys when behind.
# Run via cron every 2 minutes:
#   */2 * * * * /home/u63375/familyhub/poll-deploy.sh >> /home/u63375/familyhub/logs/deploy.log 2>&1

set -e
cd /home/u63375/familyhub

REMOTE_SHA=$(git ls-remote origin refs/heads/main 2>/dev/null | cut -f1)
LOCAL_SHA=$(git rev-parse HEAD)

if [ "$REMOTE_SHA" = "$LOCAL_SHA" ]; then
  exit 0
fi

echo "[$(date)] Deploying $LOCAL_SHA -> $REMOTE_SHA"
bash /home/u63375/familyhub/deploy.sh
echo "[$(date)] Done"
