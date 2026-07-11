import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Inspecting Database ---');
  
  const vacancies = await prisma.vacancy.findMany({
    include: {
      _count: {
        select: {
          applications: true,
        }
      }
    }
  });

  console.log('Vacancies list:');
  vacancies.forEach(v => {
    console.log(`Vacancy ID: ${v.id}`);
    console.log(`Title: ${v.title}`);
    console.log(`Status: ${v.status}`);
    console.log(`Applications count: ${v._count.applications}`);
    console.log('-------------------------');
  });

  const applications = await prisma.application.findMany({
    include: {
      candidate: true,
      vacancy: true,
    }
  });

  console.log(`Total Applications: ${applications.length}`);
  applications.forEach(a => {
    console.log(`Application ID: ${a.id}`);
    console.log(`Candidate: ${a.candidate.first_name} ${a.candidate.last_name}`);
    console.log(`Vacancy: ${a.vacancy.title} (${a.vacancy.id})`);
    console.log(`Status: ${a.status}`);
    console.log('=========================');
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
