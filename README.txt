AUTO FEEDBACK SERVER

1. Upload all files to your PHP hosting.
2. Make sure the /data directory is writable by PHP.
3. Endpoint:
   POST https://YOUR-DOMAIN/api/feedback.php

Example JSON:
{
  "device": "Android",
  "android": "14",
  "app_version": "1.0.0",
  "status": "success",
  "message": "Feedback received"
}

Example curl:
curl -X POST "https://YOUR-DOMAIN/api/feedback.php" ^
  -H "Content-Type: application/json" ^
  -d "{"device":"Android","android":"14","app_version":"1.0.0","status":"success","message":"OK"}"

The server stores up to 1000 latest feedback records in data/feedback.json.
For production use, add authentication/rate limiting before exposing the endpoint publicly.
