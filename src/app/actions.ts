"use server"

import { prisma } from "@/lib/prisma"

export async function addFoodLog(data: {
  foodName: string;
  calsPer100: number;
  proPer100: number;
  carbPer100: number;
  fatPer100: number;
  grams: number;
  loggedCalories: number;
  loggedProtein: number;
  loggedCarbs: number;
  loggedFats: number;
  dateString?: string;
}) {
  const targetDate = data.dateString ? new Date(data.dateString) : new Date();

  // 1. Ensure FoodLibrary exists or create it
  const foodItem = await prisma.foodLibrary.upsert({
    where: { name: data.foodName },
    update: {},
    create: {
      name: data.foodName,
      caloriesPer100: data.calsPer100,
      proteinPer100: data.proPer100,
      carbsPer100: data.carbPer100,
      fatsPer100: data.fatPer100,
    }
  });

  // 2. Create the snapshot in DailyLog
  const created = await prisma.dailyLog.create({
    data: {
      date: targetDate,
      weightInGrams: data.grams,
      loggedCalories: data.loggedCalories,
      loggedProtein: data.loggedProtein,
      loggedCarbs: data.loggedCarbs,
      loggedFats: data.loggedFats,
      foodId: foodItem.id,
    }
  });

  return { 
    id: created.id, 
    time: created.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
  }
}

export async function getDayData(dateString?: string) {
  const targetDate = dateString ? new Date(dateString) : new Date();
  
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const logs = await prisma.dailyLog.findMany({
    where: {
      date: { gte: startOfDay, lte: endOfDay }
    },
    include: {
      food: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const weightLog = await prisma.weightLog.findFirst({
    where: { date: { gte: startOfDay, lte: endOfDay } },
    orderBy: { createdAt: 'desc' },
  });

  const waterLogs = await prisma.waterLog.findMany({
    where: { date: { gte: startOfDay, lte: endOfDay } },
  });

  const workoutSession = await prisma.workoutSession.findFirst({
    where: { date: { gte: startOfDay, lte: endOfDay } },
    orderBy: { createdAt: 'desc' },
  });

  return {
    logs: logs.map(log => ({
      id: log.id,
      name: log.food.name,
      grams: log.weightInGrams,
      cals: log.loggedCalories,
      pro: log.loggedProtein,
      carb: log.loggedCarbs,
      fat: log.loggedFats,
      time: log.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    })),
    weight: weightLog?.weight || null,
    waterMl: waterLogs.reduce((acc, w) => acc + w.amountMl, 0),
    workoutType: workoutSession?.name || null
  };
}

export async function logWeight(weight: number, dateString?: string) {
  const targetDate = dateString ? new Date(dateString) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if there's already a log for today
  const existing = await prisma.weightLog.findFirst({
    where: { date: { gte: startOfDay, lte: endOfDay } }
  });

  if (existing) {
    return prisma.weightLog.update({
      where: { id: existing.id },
      data: { weight }
    });
  } else {
    return prisma.weightLog.create({
      data: { weight, date: targetDate }
    });
  }
}

export async function addWater(amountMl: number, dateString?: string) {
  const targetDate = dateString ? new Date(dateString) : new Date();
  return prisma.waterLog.create({
    data: { amountMl, date: targetDate }
  });
}

export async function logWorkoutSession(name: string, dateString?: string) {
  const targetDate = dateString ? new Date(dateString) : new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Check if session exists for today
  const existing = await prisma.workoutSession.findFirst({
    where: { date: { gte: startOfDay, lte: endOfDay } }
  });

  // Use a hardcoded dummy user ID if testing, or ideally fetch from auth session in production
  // Assuming a default user exists for this local dev, we will upsert a dummy user to ensure relational integrity
  const dummyUser = await prisma.user.upsert({
    where: { email: 'test@test.com' },
    update: {},
    create: { email: 'test@test.com', name: 'Test User' }
  });

  if (existing) {
    return prisma.workoutSession.update({
      where: { id: existing.id },
      data: { name }
    });
  } else {
    return prisma.workoutSession.create({
      data: { name, date: targetDate, userId: dummyUser.id }
    });
  }
}

export async function getWeightProgress(endDateString?: string, days = 30) {
  const endDate = endDateString ? new Date(endDateString) : new Date();
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  const startDate = new Date(endOfDay);
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const logs = await prisma.weightLog.findMany({
    where: {
      date: { gte: startDate, lte: endOfDay }
    },
    orderBy: { date: 'asc' },
  });

  return logs.map(l => ({
    date: l.date.toISOString(),
    weight: l.weight
  }));
}

export async function getFoodLibrary() {
  return prisma.foodLibrary.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      caloriesPer100: true,
      proteinPer100: true,
      carbsPer100: true,
      fatsPer100: true,
      isCustom: true,
      category: true,
    }
  });
}

export async function createCustomFood(data: {
  name: string;
  cals: number;
  pro: number;
  carbs: number;
  fat: number;
  category: string;
}) {
  const food = await prisma.foodLibrary.create({
    data: {
      name: data.name,
      caloriesPer100: data.cals,
      proteinPer100: data.pro,
      carbsPer100: data.carbs,
      fatsPer100: data.fat,
      isCustom: true,
      category: data.category,
    }
  });
  
  return {
    id: food.id,
    name: food.name,
    cals: food.caloriesPer100,
    pro: food.proteinPer100,
    carbs: food.carbsPer100,
    fat: food.fatsPer100,
    isCustom: food.isCustom,
    category: food.category,
  };
}
