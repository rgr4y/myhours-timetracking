# Copilot Instructions

- Dev Server URL: http://localhost:3000

### Tech Stack
Prisma, Electron, React

### Tasks
- Check to see if 'npm: dev' task is running. If it is, no need to restart it UNLESS Electron needs to be restarted.
- Restart 'npm: dev' task ONLY and it will restart BOTH processes.
- You must stop 'npm: dev' to run Prisma migrations! You can kill both electron and node to do this.

### Prisma
- Studio: `npx prisma studio`

### Debug Output
- Check all running terminals
- Sometimes I'll run the Debugger in VSCode, which allows me to see IPC messages. Check that terminal for debug output.