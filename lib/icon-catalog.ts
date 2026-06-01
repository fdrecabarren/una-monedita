// UnaMonedita — Icon Store catalog + color palette (ported from icon-catalog.js).

export interface IconGroup {
  id: string;
  name: string;
  icons: string[];
}

export const GROUPS: IconGroup[] = [
  {
    id: "comida",
    name: "Comida y bebida",
    icons: [
      "Utensils", "UtensilsCrossed", "Coffee", "Pizza", "Beer", "Wine", "IceCreamCone",
      "Apple", "Croissant", "Soup", "CakeSlice", "Beef", "Fish", "Salad", "CupSoda",
      "Milk", "Cookie", "Sandwich", "Egg", "Ham", "Cherry", "Carrot", "Donut",
    ],
  },
  {
    id: "compras",
    name: "Compras",
    icons: [
      "ShoppingCart", "ShoppingBag", "ShoppingBasket", "Store", "Tag", "Tags", "Gift",
      "Shirt", "Footprints", "Watch", "Gem", "Glasses", "Baby", "Package", "Barcode",
    ],
  },
  {
    id: "transporte",
    name: "Transporte",
    icons: [
      "Car", "CarFront", "Bus", "TramFront", "TrainFront", "Bike", "Plane", "Fuel",
      "CircleParking", "Ship", "Truck", "Caravan", "Anchor", "Sailboat",
    ],
  },
  {
    id: "hogar",
    name: "Hogar",
    icons: [
      "House", "Sofa", "Bed", "Lamp", "Plug", "Lightbulb", "Wrench", "Hammer",
      "PaintRoller", "Trash2", "WashingMachine", "Refrigerator", "DoorOpen", "Armchair",
      "Bath", "CookingPot", "Flower2", "TreePine",
    ],
  },
  {
    id: "finanzas",
    name: "Finanzas",
    icons: [
      "Wallet", "Banknote", "CreditCard", "PiggyBank", "Landmark", "Receipt", "Coins",
      "TrendingUp", "TrendingDown", "Briefcase", "Calculator", "ChartPie", "ChartColumn",
      "HandCoins", "DollarSign", "BadgePercent", "Vault",
    ],
  },
  {
    id: "salud",
    name: "Salud y bienestar",
    icons: [
      "HeartPulse", "Pill", "Stethoscope", "Cross", "Dumbbell", "Activity", "Brain",
      "Bandage", "Syringe", "Eye", "Smile", "Bone", "Flame",
    ],
  },
  {
    id: "ocio",
    name: "Ocio y entretenimiento",
    icons: [
      "Gamepad2", "Music", "Film", "Clapperboard", "Tv", "Ticket", "Popcorn", "Headphones",
      "PartyPopper", "Dices", "Camera", "Palette", "BookOpen", "Guitar", "Mic", "Drama",
    ],
  },
  {
    id: "educacion",
    name: "Educación",
    icons: [
      "GraduationCap", "BookOpen", "Pencil", "NotebookPen", "Library", "School",
      "Backpack", "Ruler", "Calculator", "Lightbulb",
    ],
  },
  {
    id: "mascotas",
    name: "Mascotas",
    icons: ["PawPrint", "Dog", "Cat", "Bird", "Fish", "Bone", "Rabbit", "Turtle"],
  },
  {
    id: "viajes",
    name: "Viajes",
    icons: [
      "Plane", "Luggage", "MapPin", "Map", "Tent", "Mountain", "Hotel", "Compass",
      "Globe", "Camera", "Backpack", "Binoculars",
    ],
  },
  {
    id: "tecnologia",
    name: "Tecnología",
    icons: [
      "Smartphone", "Laptop", "Monitor", "Headphones", "Camera", "Wifi", "HardDrive",
      "Keyboard", "Mouse", "Printer", "BatteryCharging", "Cpu",
    ],
  },
  {
    id: "otros",
    name: "Otros",
    icons: [
      "Heart", "Star", "Sparkles", "Sun", "Umbrella", "Cigarette", "HandHeart",
      "Church", "Baby", "Flower", "Leaf", "Recycle", "Bell", "Calendar", "Clock",
    ],
  },
];

export const COLORS: string[] = [
  "#ff8a5c", "#ff6f61", "#ef7aa6", "#c382d6", "#9b8cdb", "#7b8cd6",
  "#4fb6e6", "#46bfae", "#6ec6c0", "#2fa86a", "#9ccc65", "#ffb04d",
  "#f6a623", "#b08968", "#ef6d6d", "#8d99ae",
];

export const ALL: string[] = (() => {
  const out: string[] = [];
  GROUPS.forEach((g) => g.icons.forEach((ic) => { if (!out.includes(ic)) out.push(ic); }));
  return out;
})();
