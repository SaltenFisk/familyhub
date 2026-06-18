const router = require('express').Router();
const crypto = require('crypto');
const { execFile } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function verifySignature(secret, body, signature) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// POST /deploy — GitHub webhook (uses raw body for HMAC verification)
router.post('/', (req, res) => {
  const secret = process.env.DEPLOY_WEBHOOK_SECRET;
  if (!secret) return res.status(500).json({ error: 'DEPLOY_WEBHOOK_SECRET not set' });

  const sig = req.headers['x-hub-signature-256'] || '';
  if (!verifySignature(secret, req.body, sig)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Only act on push to main
  const payload = JSON.parse(req.body.toString());
  if (payload.ref !== 'refs/heads/main') {
    return res.json({ ok: true, skipped: true, reason: 'not main branch' });
  }

  console.log(`Deploy webhook triggered by push to main (${payload.after?.slice(0, 7)})`);
  res.json({ ok: true, sha: payload.after });

  // Run deploy script asynchronously after responding
  const script = path.join(ROOT, 'deploy.sh');
  execFile('bash', [script], { cwd: ROOT }, (err, stdout, stderr) => {
    if (err) {
      console.error('Deploy script failed:', err.message, stderr);
    } else {
      console.log('Deploy complete:', stdout.trim());
    }
  });
});

module.exports = router;
