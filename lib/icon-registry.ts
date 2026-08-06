// Explicit Lucide icon registry — only the icons used by the catalog + UI,
// so tree-shaking keeps the bundle small (no `import *`).
import {
  // catalog: comida
  Utensils, UtensilsCrossed, Coffee, Pizza, Beer, Wine, IceCreamCone, Apple,
  Croissant, Soup, CakeSlice, Beef, Fish, Salad, CupSoda, Milk, Cookie, Sandwich,
  Egg, Ham, Cherry, Carrot, Donut,
  // compras
  ShoppingCart, ShoppingBag, ShoppingBasket, Store, Tag, Tags, Gift, Shirt,
  Footprints, Watch, Gem, Glasses, Baby, Package, Barcode,
  // transporte
  Car, CarFront, Bus, TramFront, TrainFront, Bike, Plane, Fuel, CircleParking,
  Ship, Truck, Caravan, Anchor, Sailboat,
  // hogar
  House, Sofa, Bed, Lamp, Plug, Lightbulb, Wrench, Hammer, PaintRoller, Trash2,
  WashingMachine, Refrigerator, DoorOpen, Armchair, Bath, CookingPot, Flower2, TreePine,
  // finanzas
  Wallet, Banknote, CreditCard, PiggyBank, Landmark, Receipt, Coins, TrendingUp,
  TrendingDown, Briefcase, Calculator, ChartPie, ChartColumn, HandCoins, DollarSign,
  BadgePercent, Vault,
  // salud
  HeartPulse, Pill, Stethoscope, Cross, Dumbbell, Activity, Brain, Bandage, Syringe,
  Eye, Smile, Bone, Flame,
  // ocio
  Gamepad2, Music, Film, Clapperboard, Tv, Ticket, Popcorn, Headphones, PartyPopper,
  Dices, Camera, Palette, BookOpen, Guitar, Mic, Drama,
  // educacion
  GraduationCap, Pencil, NotebookPen, Library, School, Backpack, Ruler,
  // mascotas
  PawPrint, Dog, Cat, Bird, Rabbit, Turtle,
  // viajes
  Luggage, MapPin, Map, Tent, Mountain, Hotel, Compass, Globe, Binoculars,
  // tecnologia
  Smartphone, Laptop, Monitor, Wifi, HardDrive, Keyboard, Mouse, Printer,
  BatteryCharging, Cpu,
  // otros
  Heart, Star, Sparkles, Sun, Umbrella, Cigarette, HandHeart, Church, Flower, Leaf,
  Recycle, Bell, Calendar, Clock,
  // UI
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Minus, X, Check, Delete,
  PenLine, Shapes, Moon, CloudOff, CircleDollarSign, List, Settings, LogOut, Search,
  Circle, CalendarDays, Database,
  // recurrentes
  Repeat, CalendarClock, BellRing, PauseCircle, PlayCircle,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Utensils, UtensilsCrossed, Coffee, Pizza, Beer, Wine, IceCreamCone, Apple,
  Croissant, Soup, CakeSlice, Beef, Fish, Salad, CupSoda, Milk, Cookie, Sandwich,
  Egg, Ham, Cherry, Carrot, Donut,
  ShoppingCart, ShoppingBag, ShoppingBasket, Store, Tag, Tags, Gift, Shirt,
  Footprints, Watch, Gem, Glasses, Baby, Package, Barcode,
  Car, CarFront, Bus, TramFront, TrainFront, Bike, Plane, Fuel, CircleParking,
  Ship, Truck, Caravan, Anchor, Sailboat,
  House, Sofa, Bed, Lamp, Plug, Lightbulb, Wrench, Hammer, PaintRoller, Trash2,
  WashingMachine, Refrigerator, DoorOpen, Armchair, Bath, CookingPot, Flower2, TreePine,
  Wallet, Banknote, CreditCard, PiggyBank, Landmark, Receipt, Coins, TrendingUp,
  TrendingDown, Briefcase, Calculator, ChartPie, ChartColumn, HandCoins, DollarSign,
  BadgePercent, Vault,
  HeartPulse, Pill, Stethoscope, Cross, Dumbbell, Activity, Brain, Bandage, Syringe,
  Eye, Smile, Bone, Flame,
  Gamepad2, Music, Film, Clapperboard, Tv, Ticket, Popcorn, Headphones, PartyPopper,
  Dices, Camera, Palette, BookOpen, Guitar, Mic, Drama,
  GraduationCap, Pencil, NotebookPen, Library, School, Backpack, Ruler,
  PawPrint, Dog, Cat, Bird, Rabbit, Turtle,
  Luggage, MapPin, Map, Tent, Mountain, Hotel, Compass, Globe, Binoculars,
  Smartphone, Laptop, Monitor, Wifi, HardDrive, Keyboard, Mouse, Printer,
  BatteryCharging, Cpu,
  Heart, Star, Sparkles, Sun, Umbrella, Cigarette, HandHeart, Church, Flower, Leaf,
  Recycle, Bell, Calendar, Clock,
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Minus, X, Check, Delete,
  PenLine, Shapes, Moon, CloudOff, CircleDollarSign, List, Settings, LogOut, Search,
  Circle, CalendarDays, Database,
  Repeat, CalendarClock, BellRing, PauseCircle, PlayCircle,
};

export const FALLBACK_ICON: LucideIcon = Tag;
