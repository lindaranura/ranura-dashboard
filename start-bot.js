import { spawn } from 'child_process';
spawn('npx.cmd', ['tsx', 'bot.ts'], { stdio: 'inherit' }).on('close', code => process.exit(code));
