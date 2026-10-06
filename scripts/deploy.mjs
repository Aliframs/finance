import { NodeSSH } from 'node-ssh';
import path from 'path';
import fs from 'fs';

const ssh = new NodeSSH();

const VPS = {
  host: '43.133.153.215',
  username: 'ubuntu',
  password: 'quantum-99#-galaxy',
};
const REMOTE_DIR = '/home/ubuntu/finance-app';
const DOMAIN = 'aliframs.my.id';

async function run(cmd, label) {
  console.log(`\n🔧 ${label || cmd}`);
  const result = await ssh.execCommand(cmd, { cwd: REMOTE_DIR });
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  return result;
}

async function main() {
  try {
    // 1. Connect
    console.log('🔌 Connecting to VPS...');
    await ssh.connect(VPS);
    console.log('✅ Connected!');

    // 2. Check existing setup
    const nodeCheck = await ssh.execCommand('node -v');
    console.log('Node.js:', nodeCheck.stdout || 'NOT INSTALLED');
    
    const pm2Check = await ssh.execCommand('pm2 -v 2>/dev/null || echo NOT_INSTALLED');
    console.log('PM2:', pm2Check.stdout);

    const appCheck = await ssh.execCommand(`ls ${REMOTE_DIR}/package.json 2>/dev/null && echo EXISTS || echo NOT_EXISTS`);
    const appExists = appCheck.stdout.includes('EXISTS');
    console.log('App exists:', appExists);

    // 3. Install Node.js if needed
    if (!nodeCheck.stdout || nodeCheck.stdout.includes('not found')) {
      console.log('\n📦 Installing Node.js...');
      await run('curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -S bash -', 'Add NodeSource');
      await run('sudo apt-get install -y nodejs', 'Install Node.js');
    }

    // 4. Install PM2 if needed
    if (pm2Check.stdout.includes('NOT_INSTALLED')) {
      console.log('\n📦 Installing PM2...');
      await run('sudo npm install -g pm2', 'Install PM2');
    }

    // 5. Create app directory
    await ssh.execCommand(`mkdir -p ${REMOTE_DIR}`);

    // 6. Build locally first
    console.log('\n🏗️  Building locally...');
    // Build was already done, but let's make sure .next exists
    const localNextDir = path.join(process.cwd(), '.next');
    if (!fs.existsSync(localNextDir)) {
      console.log('⚠️  No .next build found. Run npm run build first!');
      process.exit(1);
    }

    // 7. Upload files (exclude heavy/unnecessary dirs)
    console.log('\n📤 Uploading project files to VPS...');
    
    const filesToUpload = [];
    const dirsToUpload = [];
    
    // Scan root files to upload
    const rootItems = fs.readdirSync(process.cwd());
    const EXCLUDE = [
      'node_modules', '.git', '.next', 'graphify-out', '.env',
      'dev.db', 'prisma/dev.db', '.agents'
    ];
    
    for (const item of rootItems) {
      const fullPath = path.join(process.cwd(), item);
      const stat = fs.statSync(fullPath);
      
      if (EXCLUDE.includes(item)) continue;
      if (item.endsWith('.mjs') || item.endsWith('.csv')) continue;
      if (item.startsWith('.') && item !== '.gitignore' && item !== '.env.example') continue;
      
      if (stat.isFile()) {
        filesToUpload.push({ local: fullPath, remote: `${REMOTE_DIR}/${item}` });
      } else if (stat.isDirectory()) {
        dirsToUpload.push(item);
      }
    }

    // Upload individual files
    console.log(`  Uploading ${filesToUpload.length} root files...`);
    for (const f of filesToUpload) {
      await ssh.putFile(f.local, f.remote);
    }

    // Upload directories
    for (const dir of dirsToUpload) {
      console.log(`  Uploading ${dir}/...`);
      const localDir = path.join(process.cwd(), dir);
      const remoteDir = `${REMOTE_DIR}/${dir}`;
      
      await ssh.execCommand(`mkdir -p ${remoteDir}`);
      
      // Use putDirectory for src, public, prisma
      const failed = [];
      const successful = [];
      await ssh.putDirectory(localDir, remoteDir, {
        recursive: true,
        concurrency: 5,
        validate: (itemPath) => {
          const baseName = path.basename(itemPath);
          return baseName !== 'node_modules' && 
                 baseName !== '.git' &&
                 baseName !== 'dev.db' &&
                 baseName !== '.next';
        },
        tick: (localPath, remotePath, error) => {
          if (error) {
            failed.push(localPath);
          } else {
            successful.push(localPath);
          }
        }
      });
      console.log(`    ✅ ${successful.length} files, ❌ ${failed.length} failed`);
    }

    // 8. Upload .next build
    console.log('  Uploading .next/ build (this may take a moment)...');
    await ssh.execCommand(`rm -rf ${REMOTE_DIR}/.next`);
    await ssh.execCommand(`mkdir -p ${REMOTE_DIR}/.next`);
    
    const nextFailed = [];
    const nextSuccessful = [];
    await ssh.putDirectory(
      path.join(process.cwd(), '.next'),
      `${REMOTE_DIR}/.next`,
      {
        recursive: true,
        concurrency: 5,
        tick: (localPath, remotePath, error) => {
          if (error) nextFailed.push(localPath);
          else nextSuccessful.push(localPath);
        }
      }
    );
    console.log(`    ✅ ${nextSuccessful.length} files, ❌ ${nextFailed.length} failed`);

    // 9. Create production .env on VPS
    console.log('\n⚙️  Setting up production .env...');
    const prodEnv = `DATABASE_URL="file:./prisma/prod.db"
AUTH_SECRET="yJGmTxqp5pPnrjZpnczSMz_NSXRZHj0rwH3IEHU-BSM"
NEXTAUTH_URL="https://${DOMAIN}"
AUTH_URL="https://${DOMAIN}"
AUTH_TRUST_HOST=true
APPSCRIPT_WEBHOOK_URL="https://script.google.com/macros/s/AKfycbwuDtMk2rZ6n4Mcnk_xbhKc9hfIg2s_pMDhQDB1x0BY3MAhvZaNLB_FNaFM9Yfn5GUiVQ/exec"
APPSCRIPT_SECRET="rahasia_finance_2026"
`;
    
    // Check if prod.db exists (don't overwrite production data!)
    const dbCheck = await ssh.execCommand(`ls ${REMOTE_DIR}/prisma/prod.db 2>/dev/null && echo DB_EXISTS || echo DB_NOT_EXISTS`);
    
    await ssh.execCommand(`cat > ${REMOTE_DIR}/.env << 'ENVEOF'
${prodEnv}
ENVEOF`);
    console.log('✅ .env created');

    // 10. Install dependencies on VPS
    console.log('\n📦 Installing dependencies on VPS...');
    await run('npm install --production=false', 'npm install');
    
    // 11. Generate Prisma client
    console.log('\n🔧 Generating Prisma client...');
    await run('npx prisma generate', 'Prisma generate');

    // 12. Run migrations (create/update DB schema without losing data)
    if (dbCheck.stdout.includes('DB_NOT_EXISTS')) {
      console.log('\n🗃️  Creating production database...');
      await run('npx prisma migrate deploy 2>/dev/null || npx prisma db push', 'DB setup');
      // Seed initial users
      await run('npx tsx prisma/seed.ts', 'Seed users');
    } else {
      console.log('\n🗃️  Production DB exists — pushing schema changes...');
      await run('npx prisma db push', 'DB push');
    }

    // 13. Setup Caddy reverse proxy (if not already)
    const caddyCheck = await ssh.execCommand('caddy version 2>/dev/null || echo NOT_INSTALLED');
    if (caddyCheck.stdout.includes('NOT_INSTALLED')) {
      console.log('\n🌐 Installing Caddy web server...');
      await run('sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl', 'Install deps');
      await run('curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg 2>/dev/null', 'Add Caddy key');
      await run('curl -1sLf "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | sudo tee /etc/apt/sources.list.d/caddy-stable.list', 'Add Caddy repo');
      await run('sudo apt update && sudo apt install -y caddy', 'Install Caddy');
    }

    // Configure Caddy
    console.log('\n🌐 Configuring Caddy for domain...');
    const caddyConfig = `${DOMAIN} {
    reverse_proxy localhost:3000
}`;
    await ssh.execCommand(`echo '${caddyConfig}' | sudo tee /etc/caddy/Caddyfile`);
    await run('sudo systemctl reload caddy', 'Reload Caddy');
    console.log('✅ Caddy configured for https://' + DOMAIN);

    // 14. Start/Restart with PM2
    console.log('\n🚀 Starting application with PM2...');
    const pm2ListCheck = await ssh.execCommand('pm2 list --no-color');
    
    if (pm2ListCheck.stdout.includes('finance-app')) {
      await run('pm2 restart finance-app', 'Restart app');
    } else {
      await run('pm2 start npm --name finance-app -- start', 'Start app');
    }
    
    await run('pm2 save', 'PM2 save');
    
    // Setup PM2 to start on boot
    const startupCmd = await ssh.execCommand('pm2 startup systemd -u ubuntu --hp /home/ubuntu 2>/dev/null');
    if (startupCmd.stdout) {
      const sudoLine = startupCmd.stdout.split('\n').find(l => l.includes('sudo'));
      if (sudoLine) {
        await ssh.execCommand(sudoLine.trim());
      }
    }

    // 15. Verify
    console.log('\n🔍 Verifying deployment...');
    await new Promise(r => setTimeout(r, 3000)); // Wait for app to start
    
    const healthCheck = await ssh.execCommand('curl -s -o /dev/null -w "%{http_code}" http://localhost:3000');
    console.log(`Health check: HTTP ${healthCheck.stdout}`);
    
    if (healthCheck.stdout === '200' || healthCheck.stdout === '302' || healthCheck.stdout === '307') {
      console.log('\n🎉🎉🎉 DEPLOYMENT SUCCESSFUL! 🎉🎉🎉');
      console.log(`🌐 Website live at: https://${DOMAIN}`);
    } else {
      console.log('\n⚠️  App may still be starting up. Check with: pm2 logs finance-app');
    }

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
  } finally {
    ssh.dispose();
  }
}

main();
