const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const reqs = await prisma.recruitmentRequest.findMany({
    select: { id: true, hr_comments: true }
  });
  console.log(JSON.stringify(reqs, null, 2));
}
main().finally(() => prisma.$disconnect());
