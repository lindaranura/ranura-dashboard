import { spawn } from 'child_process';
spawn('npm.cmd', ['run', 'dev'], { stdio: 'inherit' }).on('close', code => process.exit(code));
