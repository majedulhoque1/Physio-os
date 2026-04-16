export type ProductCategory =
  | "Equipment"
  | "Therapy Devices"
  | "Consumables"
  | "Exercise Aids"
  | "Recovery";

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: ProductCategory;
  price: number; // BDT
  stock: number;
  lowStockThreshold: number;
  description: string;
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "TENS Unit (Dual Channel)",
    sku: "TENS-DC-001",
    category: "Therapy Devices",
    price: 3800,
    stock: 12,
    lowStockThreshold: 3,
    description: "Transcutaneous electrical nerve stimulation unit for pain relief therapy.",
  },
  {
    id: "p2",
    name: "Ultrasound Therapy Machine",
    sku: "UST-1MHZ-002",
    category: "Therapy Devices",
    price: 18500,
    stock: 2,
    lowStockThreshold: 2,
    description: "1 MHz therapeutic ultrasound machine for deep tissue treatment.",
  },
  {
    id: "p3",
    name: "Resistance Band Set (5-pack)",
    sku: "RB-SET-003",
    category: "Exercise Aids",
    price: 950,
    stock: 30,
    lowStockThreshold: 8,
    description: "Five resistance levels: yellow, red, green, blue, black.",
  },
  {
    id: "p4",
    name: "Hot / Cold Gel Pack",
    sku: "HC-GEL-004",
    category: "Recovery",
    price: 380,
    stock: 0,
    lowStockThreshold: 5,
    description: "Reusable gel pack suitable for microwave heating or freezer cooling.",
  },
  {
    id: "p5",
    name: "Posture Corrector Brace",
    sku: "POST-BR-005",
    category: "Equipment",
    price: 1200,
    stock: 7,
    lowStockThreshold: 3,
    description: "Adjustable clavicle brace for posture correction and back support.",
  },
  {
    id: "p6",
    name: "Exercise Ball (65 cm)",
    sku: "EXBALL-65-006",
    category: "Exercise Aids",
    price: 750,
    stock: 10,
    lowStockThreshold: 4,
    description: "Anti-burst PVC exercise/stability ball for core strengthening.",
  },
  {
    id: "p7",
    name: "Kinesiology Tape Roll (5m)",
    sku: "KTAPE-5M-007",
    category: "Consumables",
    price: 320,
    stock: 45,
    lowStockThreshold: 10,
    description: "Cotton elastic therapeutic tape, water resistant.",
  },
  {
    id: "p8",
    name: "Foam Roller (90 cm)",
    sku: "FOAM-90-008",
    category: "Recovery",
    price: 890,
    stock: 6,
    lowStockThreshold: 3,
    description: "High-density EVA foam roller for myofascial release.",
  },
  {
    id: "p9",
    name: "Shoulder Pulley Exerciser",
    sku: "SHPULL-009",
    category: "Exercise Aids",
    price: 480,
    stock: 3,
    lowStockThreshold: 3,
    description: "Over-door shoulder pulley for range-of-motion exercises.",
  },
  {
    id: "p10",
    name: "Paraffin Wax Bath Unit",
    sku: "PARWAX-010",
    category: "Therapy Devices",
    price: 7200,
    stock: 4,
    lowStockThreshold: 2,
    description: "Electric paraffin wax heater for hand and foot heat therapy.",
  },
  {
    id: "p11",
    name: "Cervical Traction Collar",
    sku: "CERVTRAC-011",
    category: "Equipment",
    price: 1650,
    stock: 8,
    lowStockThreshold: 3,
    description: "Inflatable cervical collar for neck traction and decompression.",
  },
  {
    id: "p12",
    name: "Hydrocollator Heating Pads (10-pack)",
    sku: "HYDRO-10P-012",
    category: "Consumables",
    price: 2100,
    stock: 1,
    lowStockThreshold: 2,
    description: "Silica gel moist heat packs for hydrocollator units.",
  },
  {
    id: "p13",
    name: "Theraband Loop Set (6 bands)",
    sku: "TBLOOP-013",
    category: "Exercise Aids",
    price: 1100,
    stock: 18,
    lowStockThreshold: 5,
    description: "Mini loop resistance bands for lower body rehab exercises.",
  },
  {
    id: "p14",
    name: "Infrared Heat Lamp",
    sku: "IR-LAMP-014",
    category: "Therapy Devices",
    price: 4200,
    stock: 5,
    lowStockThreshold: 2,
    description: "250W infrared lamp for deep heat physiotherapy treatment.",
  },
  {
    id: "p15",
    name: "Disposable Exam Gloves (100-pack)",
    sku: "GLOVES-100-015",
    category: "Consumables",
    price: 450,
    stock: 22,
    lowStockThreshold: 10,
    description: "Latex-free nitrile disposable examination gloves, medium size.",
  },
];
