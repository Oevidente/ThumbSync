@echo off
title ThumbSync Server [PRODUCTION]
set NODE_ENV=production
start /min cmd /k "J: && cd \ThumbSync && npm run build && npx tsx server.ts"
timeout /t 5
start http://localhost:3000