'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addFoodLog, getDayData, logWeight, addWater, getWeightProgress, logWorkoutSession, getFoodLibrary, createCustomFood, editFoodNutrition, editConsumptionLog, deleteConsumptionLog } from './actions';
import { format, subDays, addDays } from 'date-fns';

const DEFAULT_TARGETS = {
  cals: 2200,
  pro: 160,
  carb: 230,
  fat: 70,
  water: 3750,
};

type Targets = typeof DEFAULT_TARGETS;

import { 
  Crosshair1Icon, 
  ActivityLogIcon, 
  LightningBoltIcon, 
  PlusIcon,
  MixIcon,
  UpdateIcon,
  Pencil1Icon,
  CheckIcon,
  PlusCircledIcon,
  Cross2Icon
} from '@radix-ui/react-icons';

// Data Mocks (Anti-Jane Doe, Real Data)
const recentWorkouts = [
  { id: '1', name: 'Hypertrophy Push', volume: '12.4k kg', time: '1h 14m' },
  { id: '2', name: 'Max Effort Deads', volume: '8.1k kg', time: '48m' },
];

const FOOD_DATABASE = [
  { id: 1, name: 'Chicken Breast (Roasted, Skinless)', cals: 165, pro: 31.0, carbs: 0.0, fat: 3.6, isCustom: false, category: 'Meats & Poultry' },
  { id: 2, name: 'Chicken Drumstick (Roasted, Skinless)', cals: 155, pro: 24.2, carbs: 0.0, fat: 5.7, isCustom: false, category: 'Meats & Poultry' },
  { id: 3, name: 'Eggs (Hard-Boiled)', cals: 155, pro: 12.6, carbs: 1.1, fat: 10.6, isCustom: false, category: 'Dairy & Eggs' },
  { id: 8, name: 'Eggs (Fried in oil/butter)', cals: 196, pro: 13.6, carbs: 0.8, fat: 15.3, isCustom: false, category: 'Dairy & Eggs' },
  { id: 6, name: 'Whole Milk (3.25% Fat)', cals: 61, pro: 3.2, carbs: 4.8, fat: 3.3, isCustom: false, category: 'Dairy & Eggs' },
  { id: 4, name: 'Basmati Rice (Boiled in water)', cals: 121, pro: 3.5, carbs: 25.2, fat: 0.4, isCustom: false, category: 'Grains & Legumes' },
  { id: 5, name: 'Kidney Beans (Boiled)', cals: 127, pro: 8.7, carbs: 22.8, fat: 0.5, isCustom: false, category: 'Grains & Legumes' },
  { id: 9, name: 'Foul (Fava Beans)', cals: 110, pro: 8.0, carbs: 19.6, fat: 0.4, isCustom: false, category: 'Grains & Legumes' },
  { id: 7, name: 'Apples (Stewed/Cooked)', cals: 52, pro: 0.3, carbs: 13.8, fat: 0.2, isCustom: false, category: 'Fruits & Veggies' },
];

type LoggedFood = {
  id: string;
  name: string;
  grams: number;
  cals: number;
  pro: number;
  carb: number;
  fat: number;
  time: string;
};

type FoodItem = {
  id: string | number;
  name: string;
  cals: number;
  pro: number;
  carbs: number;
  fat: number;
  category?: string;
  isCustom?: boolean;
};

export function DashboardClient() {
  const [foods, setFoods] = useState<FoodItem[]>(FOOD_DATABASE);
  const [selectedFood, setSelectedFood] = useState<FoodItem>(FOOD_DATABASE[0]);
  const [grams, setGrams] = useState<number | ''>('');
  const [logs, setLogs] = useState<LoggedFood[]>([]);
  const [isPending, startTransition] = useTransition();

  const [date, setDate] = useState(new Date());
  const [waterMl, setWaterMl] = useState(0);
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [workoutType, setWorkoutType] = useState<string | null>(null);
  const [weightHistory, setWeightHistory] = useState<{date: string, weight: number}[]>([]);

  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [editingTarget, setEditingTarget] = useState<keyof Targets | null>(null);
  const [tempTargetValue, setTempTargetValue] = useState<number | ''>('');
  
  const [isAddingFood, setIsAddingFood] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', cals: '', pro: '', carbs: '', fat: '', category: 'Meats & Poultry' });

  const [isEditingFood, setIsEditingFood] = useState(false);
  const [foodToEdit, setFoodToEdit] = useState({ id: '', name: '', cals: '', pro: '', carbs: '', fat: '', category: 'Meats & Poultry' });

  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [tempLogGrams, setTempLogGrams] = useState<number | ''>('');

  useEffect(() => {
    getFoodLibrary().then(dbFoods => {
      // Map DB foods into FoodItem shape
      const mapped = dbFoods.map(f => ({
        id: f.id,
        name: f.name,
        cals: f.caloriesPer100,
        pro: f.proteinPer100,
        carbs: f.carbsPer100,
        fat: f.fatsPer100,
        isCustom: f.isCustom,
        category: f.category || 'Other'
      }));
      // Merge logic: Combine MOCK DB with REAL DB, skipping duplicates by name
      const allNames = new Set(mapped.map(m => m.name.toLowerCase()));
      const filteredMocks = FOOD_DATABASE.filter(md => !allNames.has(md.name.toLowerCase()));
      
      const combined = [...mapped, ...filteredMocks];
      
      // Sort alphabetically by name globally just to be neat
      combined.sort((a, b) => a.name.localeCompare(b.name));
      
      setFoods(combined);
      if (combined.length > 0 && !combined.find(f => f.id === selectedFood.id)) {
        setSelectedFood(combined[0]);
      }
    }).catch(console.error);
  }, []);

  const saveTarget = (key: keyof Targets) => {
    if (tempTargetValue === '' || tempTargetValue <= 0) {
      setEditingTarget(null);
      return;
    }
    const newTargets = { ...targets, [key]: Number(tempTargetValue) };
    setTargets(newTargets);
    localStorage.setItem('gym-targets', JSON.stringify(newTargets));
    setEditingTarget(null);
  };

  // Load from DB on mount / date change
  useEffect(() => {
    const savedTargets = localStorage.getItem('gym-targets');
    if (savedTargets) {
      try {
        setTargets(JSON.parse(savedTargets));
      } catch (e) {
        console.error('Failed to parse saved targets');
      }
    }
  }, []);

  useEffect(() => {
    const dStr = date.toISOString();
    Promise.all([
      getDayData(dStr),
      getWeightProgress(dStr, 30)
    ]).then(([res, history]) => {
      setLogs(res.logs);
      setWaterMl(res.waterMl);
      setWeightKg(res.weight || '');
      setWorkoutType(res.workoutType || null);
      setWeightHistory(history);
    });
  }, [date]);

  const handleDateChange = (days: number) => {
    setDate(prev => addDays(prev, days));
  };

  const handleCommit = () => {
    if (!grams || Number(grams) <= 0 || !selectedFood) return;
    const w = Number(grams);
    const factor = w / 100;
    
    // Server values
    const cals = selectedFood.cals * factor;
    const pro = selectedFood.pro * factor;
    const carb = selectedFood.carbs * factor;
    const fat = selectedFood.fat * factor;
    
    // Optimistic UI updates
    const tempId = Date.now().toString();
    const newEntry: LoggedFood = {
      id: tempId,
      name: selectedFood.name,
      grams: w,
      cals,
      pro,
      carb,
      fat,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setLogs((prev) => [newEntry, ...prev]);
    setGrams(''); // reset input

    // Save securely to server database
    startTransition(() => {
      addFoodLog({
        foodName: selectedFood.name,
        calsPer100: selectedFood.cals,
        proPer100: selectedFood.pro,
        carbPer100: selectedFood.carbs,
        fatPer100: selectedFood.fat,
        grams: w,
        loggedCalories: cals,
        loggedProtein: pro,
        loggedCarbs: carb,
        loggedFats: fat,
        dateString: date.toISOString(),
      }).catch(console.error);
    });
  };

  const handleAddNewFood = () => {
    if (!newFood.name || !newFood.cals) return;
    
    startTransition(() => {
      createCustomFood({
        name: newFood.name,
        cals: Number(newFood.cals) || 0,
        pro: Number(newFood.pro) || 0,
        carbs: Number(newFood.carbs) || 0,
        fat: Number(newFood.fat) || 0,
        category: newFood.category || 'Other',
      }).then((food) => {
        const enhancedFood = { ...food, isCustom: food.isCustom };
        setFoods(prev => {
           const newList = [enhancedFood, ...prev];
           return newList.sort((a, b) => a.name.localeCompare(b.name));
        });
        setSelectedFood(enhancedFood);
        setIsAddingFood(false);
        setNewFood({ name: '', cals: '', pro: '', carbs: '', fat: '', category: 'Meats & Poultry' });
      }).catch(console.error);
    });
  };

  const handleEditFoodSubmit = () => {
    if (!foodToEdit.name || !foodToEdit.cals) return;
    
    startTransition(() => {
      editFoodNutrition({
        id: foodToEdit.id,
        name: foodToEdit.name,
        cals: Number(foodToEdit.cals) || 0,
        pro: Number(foodToEdit.pro) || 0,
        carbs: Number(foodToEdit.carbs) || 0,
        fat: Number(foodToEdit.fat) || 0,
        category: foodToEdit.category || 'Other',
      }).then((food) => {
        const enhancedFood = { ...food, isCustom: food.isCustom };
        setFoods(prev => {
           const newList = prev.map(f => String(f.id) === foodToEdit.id ? enhancedFood : f);
           return newList.sort((a, b) => a.name.localeCompare(b.name));
        });
        setSelectedFood(enhancedFood);
        setIsEditingFood(false);
      }).catch(console.error);
    });
  };

  const saveLogEdit = (logId: string) => {
    if (!tempLogGrams || Number(tempLogGrams) <= 0) {
      setEditingLogId(null);
      return;
    }
    
    const log = logs.find(l => l.id === logId);
    if (!log) return;
    
    if (Number(tempLogGrams) === log.grams) {
      setEditingLogId(null);
      return;
    }
  
    const newGrams = Number(tempLogGrams);
    const oldFactor = log.grams / 100;
    
    const calsPer100 = log.cals / Math.max(oldFactor, 0.0001);
    const proPer100 = log.pro / Math.max(oldFactor, 0.0001);
    const carbPer100 = log.carb / Math.max(oldFactor, 0.0001);
    const fatPer100 = log.fat / Math.max(oldFactor, 0.0001);
    
    const newFactor = newGrams / 100;
    
    const newCals = calsPer100 * newFactor;
    const newPro = proPer100 * newFactor;
    const newCarb = carbPer100 * newFactor;
    const newFat = fatPer100 * newFactor;
    
    // Optimistic Update
    setLogs(prev => prev.map(l => l.id === logId ? {
      ...l,
      grams: newGrams,
      cals: newCals,
      pro: newPro,
      carb: newCarb,
      fat: newFat
    } : l));
    setEditingLogId(null);
    
    // DB Update
    startTransition(() => {
      editConsumptionLog({
        id: logId,
        grams: newGrams,
        loggedCalories: newCals,
        loggedProtein: newPro,
        loggedCarbs: newCarb,
        loggedFats: newFat
      }).catch(console.error);
    });
  };

  const removeLog = (logId: string) => {
    setLogs(prev => prev.filter(l => l.id !== logId));
    startTransition(() => {
      deleteConsumptionLog(logId).catch(console.error);
    });
  };

  const handleAddWater = () => {
    setWaterMl(prev => prev + 250);
    startTransition(() => {
      addWater(250, date.toISOString()).catch(console.error);
    });
  };

  const handleWorkoutSelect = (type: string) => {
    setWorkoutType(type);
    startTransition(() => {
      logWorkoutSession(type, date.toISOString()).catch(console.error);
    });
  };

  const handleLogWeight = () => {
    if (!weightKg) return;
    const w = Number(weightKg);
    if(w <= 0) return;
    startTransition(() => {
      const dStr = date.toISOString();
      logWeight(w, dStr)
        .then(() => getWeightProgress(dStr, 30))
        .then(setWeightHistory)
        .catch(console.error);
    });
  };

  const dailyTotals = useMemo(() => {
    return logs.reduce((acc, log) => {
      acc.cals += log.cals;
      acc.pro += log.pro;
      acc.carb += log.carb;
      acc.fat += log.fat;
      return acc;
    }, { cals: 0, pro: 0, carb: 0, fat: 0 });
  }, [logs]);

  const weightPath = useMemo(() => {
    if (weightHistory.length === 0) return 'M 0 50 Q 50 50 100 50';
    if (weightHistory.length === 1) return `M 0 50 Q 50 50 100 50`;
    
    // Calculate min/max weight for vertical scaling
    const weights = weightHistory.map(w => w.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;

    // Calculate dates for horizontal scaling
    const firstDate = new Date(weightHistory[0].date).getTime();
    const lastDate = new Date(weightHistory[weightHistory.length - 1].date).getTime();
    const timeRange = lastDate - firstDate || 1;

    // Create points
    const points = weightHistory.map((p, i) => {
      // If only 2 points or all points at same date, evenly space them
      const x = timeRange === 1 ? (i / (weightHistory.length - 1)) * 100 : ((new Date(p.date).getTime() - firstDate) / timeRange) * 100;
      const y = 100 - (((p.weight - minW) / range) * 100);
      return { x, y };
    });

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const point = points[i];
        const cp1x = prev.x + (point.x - prev.x) / 2;
        const cp1y = prev.y;
        const cp2x = prev.x + (point.x - prev.x) / 2;
        const cp2y = point.y;
        d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${point.x} ${point.y}`;
    }
    return d;
  }, [weightHistory]);

  // 2. Nutrition Logic Formula (Real-time calculation)
  // Logged Calories = (Calories per 100g / 100) * User Input Weight (g)
  const stats = useMemo(() => {
    if (!selectedFood) return { cals: "0.0", pro: "0.0", carb: "0.0", fat: "0.0" };
    const w = Number(grams) || 0;
    const factor = w / 100;
    return {
      cals: (selectedFood.cals * factor).toFixed(1),
      pro: (selectedFood.pro * factor).toFixed(1),
      carb: (selectedFood.carbs * factor).toFixed(1),
      fat: (selectedFood.fat * factor).toFixed(1),
    };
  }, [grams, selectedFood]);

  const groupedFoods = useMemo(() => {
    const groups: Record<string, FoodItem[]> = {
      'Meats & Poultry': [],
      'Fish & Seafood': [],
      'Dairy & Eggs': [],
      'Grains & Legumes': [],
      'Fruits & Veggies': [],
      'Nuts & Seeds': [],
      'Supplements & Shakes': [],
      'Other': []
    };
    
    foods.forEach(f => {
      const cat = f.category || 'Other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(f);
    });

    // Filter out empty groups
    return Object.entries(groups).filter(([, items]) => items.length > 0);
  }, [foods]);

  return (
    <div className="flex flex-col gap-6">
      {/* GLOBAL DATE CONTROLS - REFINED SIZE */}
      <div className="flex justify-between items-center bg-white rounded-2xl border border-zinc-200 px-3 py-2 shadow-sm relative overflow-hidden">
        <button onClick={() => handleDateChange(-1)} className="px-3 py-1.5 hover:bg-zinc-100 rounded-lg transition text-sm font-medium text-zinc-600 flex items-center gap-1 z-10"><span className="hidden sm:inline">← Prev Day</span><span className="sm:hidden">←</span></button>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <div className="text-sm font-semibold tracking-tight text-zinc-900 border border-zinc-100 bg-[#f9fafb] px-4 py-1.5 rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,1)]">
             {format(date, 'eee, MMM do, yyyy')}
           </div>
        </div>
        <button onClick={() => handleDateChange(1)} disabled={date > new Date()} className="px-3 py-1.5 hover:bg-zinc-100 disabled:opacity-30 rounded-lg transition text-sm font-medium text-zinc-600 z-10 flex items-center gap-1"><span className="hidden sm:inline">Next Day →</span><span className="sm:hidden">→</span></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full auto-rows-[minmax(280px,auto)]">
        {/* 
          CARD 1: Command Input (Instant Calorie Real-time)
        Col span: 5
      */}
      <motion.section 
        layout
        className="col-span-1 border border-zinc-200/50 bg-white rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] md:col-span-5 p-8 relative overflow-hidden group"
      >
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-50 to-white pointer-events-none" />
        
        <div className="relative z-10 flex flex-col h-full justify-between">
          <header className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-medium tracking-tight text-zinc-900 flex items-center gap-2">
              <Crosshair1Icon className="w-5 h-5 text-emerald-600" />
              Ingestion Protocol
            </h2>
            <p className="font-mono text-xs text-zinc-400">#NTR-CALC</p>
          </header>

          <div className="flex flex-col gap-4 flex-1">
            {/* Search/Select mock */}
            {isEditingFood ? (
              <div className="flex flex-col gap-3 p-4 bg-[#eef2ff] border border-blue-200 rounded-xl relative">
                <button onClick={() => setIsEditingFood(false)} className="absolute top-3 right-3 text-blue-400 hover:text-blue-600 bg-white rounded-full p-1 shadow-sm"><Cross2Icon className="w-4 h-4"/></button>
                <h3 className="text-sm font-semibold text-blue-800 mb-1 leading-none tracking-tight">Edit Reference Data</h3>
                <div className="grid grid-cols-1 gap-2">
                  <input autoFocus type="text" placeholder="Food Name (e.g. Greek Yogurt)" value={foodToEdit.name} onChange={e => setFoodToEdit({...foodToEdit, name: e.target.value})} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900 focus:outline-none focus:border-blue-400" />
                  <select value={foodToEdit.category} onChange={e => setFoodToEdit({...foodToEdit, category: e.target.value})} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-600 focus:outline-none focus:border-blue-400 appearance-none">
                    <option value="Meats & Poultry">Meats & Poultry</option>
                    <option value="Fish & Seafood">Fish & Seafood</option>
                    <option value="Dairy & Eggs">Dairy & Eggs</option>
                    <option value="Grains & Legumes">Grains & Legumes</option>
                    <option value="Fruits & Veggies">Fruits & Veggies</option>
                    <option value="Nuts & Seeds">Nuts & Seeds</option>
                    <option value="Supplements & Shakes">Supplements & Shakes</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" placeholder="Kcal" value={foodToEdit.cals} onChange={e => setFoodToEdit({...foodToEdit, cals: e.target.value})} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-400" />
                  <input type="number" placeholder="Pro(g)" value={foodToEdit.pro} onChange={e => setFoodToEdit({...foodToEdit, pro: e.target.value})} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-400" />
                  <input type="number" placeholder="Crb(g)" value={foodToEdit.carbs} onChange={e => setFoodToEdit({...foodToEdit, carbs: e.target.value})} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-400" />
                  <input type="number" placeholder="Fat(g)" value={foodToEdit.fat} onChange={e => setFoodToEdit({...foodToEdit, fat: e.target.value})} className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-blue-400" />
                </div>
                <button onClick={handleEditFoodSubmit} disabled={!foodToEdit.name || !foodToEdit.cals || isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm mt-1 disabled:opacity-50 transition-colors">
                  {isPending ? 'Saving...' : 'Update Reference'}
                </button>
              </div>
            ) : !isAddingFood ? (
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-zinc-600">Database Reference</label>
                  <div className="flex items-center gap-3">
                    {selectedFood && (
                      <button onClick={() => {
                        setFoodToEdit({
                          id: String(selectedFood.id),
                          name: selectedFood.name,
                          cals: String(selectedFood.cals),
                          pro: String(selectedFood.pro),
                          carbs: String(selectedFood.carbs),
                          fat: String(selectedFood.fat),
                          category: selectedFood.category || 'Other'
                        });
                        setIsEditingFood(true);
                      }} className="text-xs text-blue-600 font-medium hover:text-blue-700 flex items-center gap-1">
                        <Pencil1Icon className="w-3.5 h-3.5"/> Edit Base
                      </button>
                    )}
                    <button onClick={() => setIsAddingFood(true)} className="text-xs text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1"><PlusCircledIcon className="w-3.5 h-3.5"/> Add New</button>
                  </div>
                </div>
                <select 
                  className="w-full bg-[#f9fafb] border border-zinc-200 rounded-xl p-3 text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-shadow appearance-none font-medium"
                  value={selectedFood?.id || ''}
                  onChange={(e) => {
                    const f = foods.find(f => String(f.id) === e.target.value);
                    if (f) setSelectedFood(f);
                  }}
                >
                  {groupedFoods.map(([groupName, items]) => (
                    <optgroup key={groupName} label={groupName} className="font-semibold text-zinc-500 bg-zinc-50">
                      {items.map(f => (
                        <option key={f.id} value={f.id} className="font-medium text-zinc-900 bg-white">
                          {f.name} (100g = {f.cals}kcal)
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4 bg-[#f4f5f6] border border-zinc-200 rounded-xl relative">
                <button onClick={() => setIsAddingFood(false)} className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-600 bg-white rounded-full p-1 shadow-sm"><Cross2Icon className="w-4 h-4"/></button>
                <h3 className="text-sm font-semibold text-zinc-800 mb-1 leading-none tracking-tight">Add Custom Food Item</h3>
                <div className="grid grid-cols-1 gap-2">
                  <input autoFocus type="text" placeholder="Food Name (e.g. Greek Yogurt)" value={newFood.name} onChange={e => setNewFood({...newFood, name: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:border-emerald-400" />
                  <select value={newFood.category} onChange={e => setNewFood({...newFood, category: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-600 focus:outline-none focus:border-emerald-400 appearance-none">
                    <option value="Meats & Poultry">Meats & Poultry</option>
                    <option value="Fish & Seafood">Fish & Seafood</option>
                    <option value="Dairy & Eggs">Dairy & Eggs</option>
                    <option value="Grains & Legumes">Grains & Legumes</option>
                    <option value="Fruits & Veggies">Fruits & Veggies</option>
                    <option value="Nuts & Seeds">Nuts & Seeds</option>
                    <option value="Supplements & Shakes">Supplements & Shakes</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <input type="number" placeholder="Kcal" value={newFood.cals} onChange={e => setNewFood({...newFood, cals: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-emerald-400" />
                  <input type="number" placeholder="Pro(g)" value={newFood.pro} onChange={e => setNewFood({...newFood, pro: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-emerald-400" />
                  <input type="number" placeholder="Crb(g)" value={newFood.carbs} onChange={e => setNewFood({...newFood, carbs: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-emerald-400" />
                  <input type="number" placeholder="Fat(g)" value={newFood.fat} onChange={e => setNewFood({...newFood, fat: e.target.value})} className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-emerald-400" />
                </div>
                <p className="text-[10px] text-zinc-500 font-medium">* All values must be per 100g of weight.</p>
                <button onClick={handleAddNewFood} disabled={!newFood.name || !newFood.cals || isPending} className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-2 rounded-lg text-sm mt-1 disabled:opacity-50 transition-colors">
                  {isPending ? 'Saving...' : 'Save to Library'}
                </button>
              </div>
            )}

            <div className="flex flex-col gap-2 relative">
              <label className="text-sm font-medium text-zinc-600">Weight Vector (g)</label>
              <input 
                type="number"
                min="0"
                value={grams}
                placeholder="250"
                onChange={(e) => setGrams(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-[#f9fafb] border border-zinc-200 rounded-xl p-4 text-3xl font-mono text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all font-semibold"
              />
              <span className="absolute right-4 bottom-4 text-zinc-400 pr-1">g</span>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-start flex-col gap-1">
                <span className="text-xs uppercase text-zinc-400 tracking-wider">Kcal</span>
                <span className="font-mono text-lg font-medium text-zinc-900">{stats.cals}</span>
              </div>
              <div className="flex items-start flex-col gap-1">
                <span className="text-xs uppercase text-zinc-400 tracking-wider">Pro</span>
                <span className="font-mono text-lg font-medium text-zinc-900">{stats.pro}</span>
              </div>
              <div className="flex items-start flex-col gap-1">
                <span className="text-xs uppercase text-zinc-400 tracking-wider">Crb</span>
                <span className="font-mono text-lg font-medium text-zinc-900">{stats.carb}</span>
              </div>
              <div className="flex items-start flex-col gap-1">
                <span className="text-xs uppercase text-zinc-400 tracking-wider">Fat</span>
                <span className="font-mono text-lg font-medium text-zinc-900">{stats.fat}</span>
              </div>
            </div>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCommit}
              disabled={!grams || Number(grams) <= 0 || isPending}
              className="mt-4 w-full bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 disabled:hover:bg-emerald-700 text-white font-medium py-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-200"
            >
              <PlusIcon className={isPending ? "animate-spin" : "w-5 h-5"} />
              {isPending ? "Syncing..." : "Commit Log"}
            </motion.button>
          </div>
        </div>
      </motion.section>

      {/* 
        CARD 2: The Intelligent List (Gym Tracker / Active Rest)
        Col span: 4
      */}
      <motion.section 
        layout
        className="col-span-1 border border-zinc-200/50 bg-white rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] md:col-span-4 p-8 flex flex-col"
      >
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-medium tracking-tight text-zinc-900 flex items-center gap-2">
            <ActivityLogIcon className="w-5 h-5 text-zinc-900" />
            Session Telemetry
          </h2>
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          >
            <UpdateIcon className="w-4 h-4 text-emerald-500" />
          </motion.div>
        </header>

        <div className="flex-1 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 flex-1 mb-4">
             {['Push', 'Pull', 'Leg', 'Break Day'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleWorkoutSelect(type)}
                  className={`flex flex-col items-start justify-center p-5 rounded-2xl border transition-all text-left ${
                    workoutType === type 
                      ? 'bg-zinc-900 border-zinc-900 text-white shadow-md' 
                      : 'bg-[#f9fafb] border-zinc-200 text-zinc-900 hover:border-zinc-300'
                  }`}
                >
                  <span className="text-lg font-medium">{type}</span>
                  <span className={`text-xs mt-1 ${workoutType === type ? 'text-zinc-400' : 'text-zinc-500'}`}>
                    Select to log session
                  </span>
                </button>
             ))}
          </div>
        </div>
      </motion.section>

      {/* 
        CARD 3: Mini Biometrics (Water/Weight Status)
        Col span: 3
      */}
      <motion.section 
        layout
        className="col-span-1 border border-zinc-200/50 bg-white rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] md:col-span-3 p-8 flex flex-col justify-between"
      >
        <header className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-medium tracking-tight text-zinc-900">Hydration</h2>
          <MixIcon className="w-5 h-5 text-blue-500" />
        </header>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border border-blue-100 bg-blue-50/50 p-4 rounded-2xl relative overflow-hidden group">
            <motion.div 
              className="absolute left-0 bottom-0 top-0 bg-blue-200/40"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((waterMl / targets.water) * 100, 100)}%` }}
            />
            <div className="z-10 flex flex-col">
              <span className="font-mono text-xl text-blue-900 font-semibold">{waterMl} ml</span>
              {editingTarget === 'water' ? (
                <div className="flex items-center gap-1 mt-1">
                  <input type="number" autoFocus value={tempTargetValue} onChange={e => setTempTargetValue(e.target.value ? Number(e.target.value) : '')} onKeyDown={e => e.key === 'Enter' && saveTarget('water')} onBlur={() => setEditingTarget(null)} className="w-16 bg-white border border-blue-200 rounded px-1 py-0.5 text-[10px] font-mono focus:outline-none" />
                  <button onMouseDown={(e) => { e.preventDefault(); saveTarget('water'); }}><CheckIcon className="w-4 h-4 text-blue-600" /></button>
                </div>
              ) : (
                <span className="text-[10px] text-blue-400 uppercase tracking-widest mt-1">/ {targets.water} ml Goal</span>
              )}
            </div>
            {editingTarget !== 'water' && (
              <button 
                onClick={() => { setEditingTarget('water'); setTempTargetValue(targets.water); }} 
                className="z-10 absolute right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-md shadow-sm border border-blue-100 text-blue-400 hover:text-blue-600"
              >
                <Pencil1Icon className="w-3 h-3" />
              </button>
            )}
          </div>
          
          <button onClick={handleAddWater} className="w-full bg-[#f9fafb] border border-blue-200/60 text-blue-700 py-3 rounded-xl hover:bg-blue-50 transition-colors text-sm font-medium">
            + 1 Glass (250ml)
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-100 flex flex-col gap-3">
           <label className="text-sm font-medium text-zinc-600">Daily Bodyweight</label>
           <div className="flex gap-2">
              <input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value === "" ? "" : parseFloat(e.target.value))} placeholder="0.0" className="w-full bg-[#f9fafb] border border-zinc-200 rounded-xl p-3 font-mono text-zinc-900 focus:outline-none" />
              <button onClick={handleLogWeight} className="bg-zinc-900 text-white px-4 py-2 rounded-xl text-sm whitespace-nowrap hover:bg-zinc-800">
                Log KG
              </button>
           </div>
        </div>
      </motion.section>

      {/* 
        CARD 4: Daily Intake & Logs 
        Col span: 12
      */}
      <motion.section 
        layout
        className="col-span-1 border border-zinc-200/50 bg-white rounded-[2.5rem] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] md:col-span-12 p-8 flex flex-col md:flex-row gap-8"
      >
        <div className="flex-1">
          <header className="mb-6 flex items-center justify-between border-b border-zinc-100 pb-4">
            <h2 className="text-xl font-medium tracking-tight text-zinc-900 flex items-center gap-2">
              <MixIcon className="w-5 h-5 text-emerald-600" />
              Daily Intake Totals
            </h2>
          </header>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#f9fafb] border border-zinc-100 p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-emerald-200 transition-colors">
              <motion.div className="absolute left-0 bottom-0 top-0 bg-emerald-100/50 z-0" initial={{ width: 0 }} animate={{ width: `${Math.min((dailyTotals.cals / targets.cals) * 100, 100)}%` }} />
              <div className="z-10 flex flex-col">
                <span className="text-xs uppercase text-zinc-500 tracking-wider mb-1">Total Kcal</span>
                <span className="font-mono text-3xl font-semibold text-zinc-900">{dailyTotals.cals.toFixed(0)} <span className="text-sm font-normal text-zinc-400">/ {targets.cals}</span></span>
              </div>
              {editingTarget !== 'cals' && <button onClick={() => { setEditingTarget('cals'); setTempTargetValue(targets.cals); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-md shadow-sm border border-zinc-200 text-zinc-400 hover:text-emerald-600 z-20"><Pencil1Icon className="w-4 h-4" /></button>}
              {editingTarget === 'cals' && (
                <div className="absolute right-4 top-4 flex items-center gap-1 z-20 bg-white p-1 rounded-md shadow-lg border border-zinc-200">
                  <input type="number" autoFocus value={tempTargetValue} onChange={e => setTempTargetValue(e.target.value ? Number(e.target.value) : '')} onKeyDown={e => e.key === 'Enter' && saveTarget('cals')} onBlur={() => setEditingTarget(null)} className="w-16 h-6 px-1 text-sm font-mono border border-zinc-300 rounded focus:outline-none focus:border-emerald-500" />
                  <button onMouseDown={(e) => { e.preventDefault(); saveTarget('cals'); }}><CheckIcon className="w-4 h-4 text-emerald-600" /></button>
                </div>
              )}
            </div>
            
            <div className="bg-[#f9fafb] border border-zinc-100 p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-amber-200 transition-colors">
              <motion.div className="absolute left-0 bottom-0 top-0 bg-amber-100/50 z-0" initial={{ width: 0 }} animate={{ width: `${Math.min((dailyTotals.pro / targets.pro) * 100, 100)}%` }} />
              <div className="z-10 flex flex-col">
                <span className="text-xs uppercase text-zinc-500 tracking-wider mb-1">Protein (g)</span>
                <span className="font-mono text-3xl font-semibold text-zinc-900">{dailyTotals.pro.toFixed(1)} <span className="text-sm font-normal text-zinc-400">/ {targets.pro}</span></span>
              </div>
              {editingTarget !== 'pro' && <button onClick={() => { setEditingTarget('pro'); setTempTargetValue(targets.pro); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-md shadow-sm border border-zinc-200 text-zinc-400 hover:text-amber-600 z-20"><Pencil1Icon className="w-4 h-4" /></button>}
              {editingTarget === 'pro' && (
                <div className="absolute right-4 top-4 flex items-center gap-1 z-20 bg-white p-1 rounded-md shadow-lg border border-zinc-200">
                  <input type="number" autoFocus value={tempTargetValue} onChange={e => setTempTargetValue(e.target.value ? Number(e.target.value) : '')} onKeyDown={e => e.key === 'Enter' && saveTarget('pro')} onBlur={() => setEditingTarget(null)} className="w-16 h-6 px-1 text-sm font-mono border border-zinc-300 rounded focus:outline-none focus:border-amber-500" />
                  <button onMouseDown={(e) => { e.preventDefault(); saveTarget('pro'); }}><CheckIcon className="w-4 h-4 text-amber-600" /></button>
                </div>
              )}
            </div>

            <div className="bg-[#f9fafb] border border-zinc-100 p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-blue-200 transition-colors">
              <motion.div className="absolute left-0 bottom-0 top-0 bg-blue-100/50 z-0" initial={{ width: 0 }} animate={{ width: `${Math.min((dailyTotals.carb / targets.carb) * 100, 100)}%` }} />
              <div className="z-10 flex flex-col">
                <span className="text-xs uppercase text-zinc-500 tracking-wider mb-1">Carbs (g)</span>
                <span className="font-mono text-3xl font-semibold text-zinc-900">{dailyTotals.carb.toFixed(1)} <span className="text-sm font-normal text-zinc-400">/ {targets.carb}</span></span>
              </div>
              {editingTarget !== 'carb' && <button onClick={() => { setEditingTarget('carb'); setTempTargetValue(targets.carb); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-md shadow-sm border border-zinc-200 text-zinc-400 hover:text-blue-600 z-20"><Pencil1Icon className="w-4 h-4" /></button>}
              {editingTarget === 'carb' && (
                <div className="absolute right-4 top-4 flex items-center gap-1 z-20 bg-white p-1 rounded-md shadow-lg border border-zinc-200">
                  <input type="number" autoFocus value={tempTargetValue} onChange={e => setTempTargetValue(e.target.value ? Number(e.target.value) : '')} onKeyDown={e => e.key === 'Enter' && saveTarget('carb')} onBlur={() => setEditingTarget(null)} className="w-16 h-6 px-1 text-sm font-mono border border-zinc-300 rounded focus:outline-none focus:border-blue-500" />
                  <button onMouseDown={(e) => { e.preventDefault(); saveTarget('carb'); }}><CheckIcon className="w-4 h-4 text-blue-600" /></button>
                </div>
              )}
            </div>

            <div className="bg-[#f9fafb] border border-zinc-100 p-6 rounded-2xl flex flex-col relative overflow-hidden group hover:border-rose-200 transition-colors">
              <motion.div className="absolute left-0 bottom-0 top-0 bg-rose-100/50 z-0" initial={{ width: 0 }} animate={{ width: `${Math.min((dailyTotals.fat / targets.fat) * 100, 100)}%` }} />
              <div className="z-10 flex flex-col">
                <span className="text-xs uppercase text-zinc-500 tracking-wider mb-1">Fats (g)</span>
                <span className="font-mono text-3xl font-semibold text-zinc-900">{dailyTotals.fat.toFixed(1)} <span className="text-sm font-normal text-zinc-400">/ {targets.fat}</span></span>
              </div>
              {editingTarget !== 'fat' && <button onClick={() => { setEditingTarget('fat'); setTempTargetValue(targets.fat); }} className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-1.5 rounded-md shadow-sm border border-zinc-200 text-zinc-400 hover:text-rose-600 z-20"><Pencil1Icon className="w-4 h-4" /></button>}
              {editingTarget === 'fat' && (
                <div className="absolute right-4 top-4 flex items-center gap-1 z-20 bg-white p-1 rounded-md shadow-lg border border-zinc-200">
                  <input type="number" autoFocus value={tempTargetValue} onChange={e => setTempTargetValue(e.target.value ? Number(e.target.value) : '')} onKeyDown={e => e.key === 'Enter' && saveTarget('fat')} onBlur={() => setEditingTarget(null)} className="w-16 h-6 px-1 text-sm font-mono border border-zinc-300 rounded focus:outline-none focus:border-rose-500" />
                  <button onMouseDown={(e) => { e.preventDefault(); saveTarget('fat'); }}><CheckIcon className="w-4 h-4 text-rose-600" /></button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 md:border-l md:border-zinc-100 md:pl-8 flex flex-col">
          <header className="mb-6 border-b border-zinc-100 pb-4">
            <h2 className="text-sm uppercase text-zinc-400 tracking-wider">Consumption Log</h2>
          </header>

          <div className="flex-1 flex flex-col gap-3 min-h-[200px] max-h-[300px] overflow-y-auto">
            <AnimatePresence>
              {logs.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex-1 flex items-center justify-center text-sm text-zinc-400 italic"
                >
                  No food logged yet today.
                </motion.div>
              ) : (
                logs.map((log, i) => (
                  <motion.div
                    key={log.id}
                    layoutId={`log-${log.id}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0, transition: { delay: Math.min(i * 0.05, 0.5) } }}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white border border-zinc-100 rounded-2xl hover:border-zinc-200 transition-colors shadow-sm relative group"
                  >
                    <div className="flex-1 pr-4">
                      <p className="font-medium text-zinc-900 text-sm flex items-center gap-2">
                        <span className="text-xs font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{log.time}</span>
                        {log.name}
                      </p>
                      
                      {editingLogId === log.id ? (
                        <div className="flex items-center gap-2 mt-2">
                           <input type="number" autoFocus value={tempLogGrams} onChange={e => setTempLogGrams(e.target.value ? Number(e.target.value) : '')} placeholder="grams" className="w-20 px-2 py-1 text-xs border border-emerald-400 rounded focus:outline-none" />
                           <button onClick={() => saveLogEdit(log.id)} className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700 transition"><CheckIcon className="w-3.5 h-3.5"/></button>
                           <button onClick={() => setEditingLogId(null)} className="bg-zinc-200 text-zinc-600 p-1 rounded hover:bg-zinc-300 transition"><Cross2Icon className="w-3.5 h-3.5"/></button>
                        </div>
                      ) : (
                        <p className="text-xs font-mono text-zinc-500 mt-1 flex items-center gap-2">
                          {log.grams}g consumed 
                          <button onClick={() => { setEditingLogId(log.id); setTempLogGrams(log.grams); }} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700">
                             <Pencil1Icon className="w-3.5 h-3.5" />
                          </button>
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-2 sm:mt-0 text-left sm:text-right flex gap-3 sm:block relative">
                      <p className="font-mono text-sm text-zinc-900">{log.cals.toFixed(0)} kcal</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider hidden sm:block mt-1">
                        P:{log.pro.toFixed(0)} C:{log.carb.toFixed(0)} F:{log.fat.toFixed(0)}
                      </p>
                      <button onClick={() => removeLog(log.id)} className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 text-red-500 hover:bg-red-200 p-1 rounded-full sm:hidden md:block">
                        <Cross2Icon className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.section>

      {/* 
        CARD 5: Wide Data Stream (Progress Analytics Mock)
        Col span: 12 (Full width)
        "Liquid Glass Refraction" & Line Graph simulation
      */}
      <motion.section 
        layout
        className="col-span-1 md:col-span-12 border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_20px_40px_-20px_rgba(0,0,0,0.08)] bg-zinc-900 text-zinc-100 rounded-[2.5rem] p-8 md:p-10 relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-[-50px] h-32 bg-emerald-500/10 blur-[60px] pointer-events-none rounded-full" />
        
        <header className="mb-8 flex items-end justify-between relative z-10">
          <div>
            <h2 className="text-2xl font-medium tracking-tight text-white mb-2 flex items-center gap-2">
              <LightningBoltIcon className="w-5 h-5 text-emerald-400" />
              Weight Progression (30d)
            </h2>
            <p className="text-sm text-zinc-400 max-w-lg">
              Macro-economic view of bodyweight flux relative to biological timeframes.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="font-mono text-emerald-400 text-3xl font-medium">{weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : (weightKg || 'N/A')}</span>
            <span className="text-xs text-zinc-500 font-mono tracking-wider">KG CURRENT</span>
          </div>
        </header>

        {/* Minimal abstract line graph representation */}
        <div className="h-48 w-full border-b border-zinc-800 flex items-end relative overflow-hidden z-10">
          <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
             <motion.path 
               initial={{ pathLength: 0, opacity: 0 }}
               animate={{ pathLength: 1, opacity: 1, d: weightPath }}
               transition={{ duration: 1.5, ease: "easeInOut" }}
               d={weightPath}
               fill="none"
               stroke="currentColor"
               className="text-emerald-500"
               strokeWidth="1.5"
             />
          </svg>
          <div className="absolute bottom-4 left-4 flex gap-4">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500" />
               <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-mono">Weight Trend</span>
            </div>
          </div>
        </div>
      </motion.section>
      </div>
    </div>
  );
}