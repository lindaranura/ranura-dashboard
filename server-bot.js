import { spawn } from 'child_process';
const child = spawn('npx.cmd', ['tsx', 'bot.ts'], { windowsHide: true, shell: true });
child.on('exit', code => process.exit(code));
