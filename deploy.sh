#!/bin/bash
set -e
cd "$(dirname "$0")"

source ~/.nvm/nvm.sh 2>/dev/null || source ~/nodevenv/familyhub/22/bin/activate 2>/dev/null || true

git fetch origin main
git checkout -- .
git reset --hard origin/main
npm install --production
cd client && npm install --include=dev && ./node_modules/.bin/vite build && cd ..

source /home/u63375/familyhub/.env 2>/dev/null || true
mysql -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "
  CREATE TABLE IF NOT EXISTS attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(100) NOT NULL,
    data LONGBLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (email_id) REFERENCES emails(id) ON DELETE CASCADE,
    INDEX idx_email_id (email_id)
  );
" 2>/dev/null || true

mkdir -p tmp && touch tmp/restart.txt
echo "Deploy complete at $(date)"
