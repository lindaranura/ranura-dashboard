import { spawn } from 'child_process';
const child = spawn('npm.cmd', ['run', 'dev'], { windowsHide: true, shell: true });
child.on('exit', code => process.exit(code));
