const fs = require('fs');
const file = 'src/services/candidate.service.ts';
let content = fs.readFileSync(file, 'utf8');

const start1 = content.indexOf('// 4. Submit Application (FR-22)');
const end1 = content.indexOf('  static async getScreeningApplications(company_id: string) {');
if (start1 !== -1 && end1 !== -1) {
  content = content.substring(0, start1) + content.substring(end1);
}

const start2 = content.indexOf('// 5. Add Candidate Document');
const end2 = content.indexOf('  // 7. Get Candidate Profile');
if (start2 !== -1 && end2 !== -1) {
  content = content.substring(0, start2) + content.substring(end2);
}

fs.writeFileSync(file, content);
