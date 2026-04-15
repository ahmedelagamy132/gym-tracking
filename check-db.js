const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const foods = await prisma.foodLibrary.findMany();
  const logs = await prisma.dailyLog.findMany({
    include: { food: true }
  });
  
  console.log("--- DATABASE CHECK ---");
  console.log(`Found ${foods.length} items in FoodLibrary.`);
  console.log(`Found ${logs.length} items in DailyLog.`);
  if (logs.length > 0) {
    console.log("\nSaved Logs:");
    console.dir(logs.map(l => ({
      Food: l.food.name,
      Grams_Eaten: l.weightInGrams,
      Calories_Logged: l.loggedCalories,
      Time: l.createdAt
    })));
  } else {
    console.log("\nNo logs found yet. Try pressing 'Commit Log' in the UI!");
  }
}

main().then(() => prisma.$disconnect());
