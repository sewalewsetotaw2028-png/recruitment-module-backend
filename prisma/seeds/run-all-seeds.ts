import { execSync } from 'child_process';
import path from 'path';

const seedFiles = [
  '01-base-data.ts',
  '02-master-data.ts',
  '03-candidate-data.ts',
  '04-interview-data.ts',
  '05-hiring-data.ts',
  '06-configuration-data.ts',
];

async function runSeedFile(filename: string) {
  const seedPath = path.join(__dirname, filename);
  console.log(`\n🌱 Running seed file: ${filename}`);
  console.log('─'.repeat(60));
  
  try {
    execSync(`npx ts-node "${seedPath}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../../'),
    });
    console.log(`✅ ${filename} completed successfully`);
  } catch (error) {
    console.error(`❌ ${filename} failed`);
    throw error;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Running All Seed Files in Sequence                        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  
  const startTime = Date.now();
  
  for (const seedFile of seedFiles) {
    await runSeedFile(seedFile);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║  All Seed Files Completed Successfully!                    ║');
  console.log(`║  Total Time: ${duration}s                                          ║`);
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('\n📝 Test login credentials (password: Password)');
  console.log('  CEO:              ceo1@erms.com');
  console.log('  HR Admin:         hradmin1@erms.com');
  console.log('  HR Specialist:    hr1@erms.com');
  console.log('  Recruiter:        recruiter1@erms.com');
  console.log('  Hiring Manager:   hm1@erms.com');
  console.log('  Dept Manager:     dm1@erms.com');
  console.log('  Interviewer:      interviewer1@erms.com');
  console.log('  Candidate:        canduser1@erms.com');
  console.log('\n─────────────────────────────────────────────────────────');
}

main().catch((error) => {
  console.error('\n💥 Seed process failed:', error);
  process.exit(1);
});
