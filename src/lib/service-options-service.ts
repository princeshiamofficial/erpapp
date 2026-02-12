
"use server";

import type { ServiceModelItem, ServiceLaminationItem, ServicePaymentMethodItem, ServiceGiftItem } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { query } from './mysql';
import { getOrders } from './order-service';

const MODELS_TABLE = 'service_models';
const LAMINATIONS_TABLE = 'service_laminations';
const PAYMENT_METHODS_TABLE = 'service_payment_methods';
const GIFTS_TABLE = 'service_gifts';

// --- Model Functions ---

const seedDefaultModels = async (): Promise<ServiceModelItem[]> => {
  const createdItems: ServiceModelItem[] = [];
  const defaultModelsData = [
    { name: "Design Charge", sellingPrice: 500 },
    { name: "Menu Book", sellingPrice: 1200 },
    { name: "Pizza Box", sellingPrice: 30 },
    { name: "Business Card", sellingPrice: 2 },
    { name: "Visiting Card", sellingPrice: 2 },
    { name: "T-shirt", sellingPrice: 450 },
    { name: "Poster", sellingPrice: 15 },
    { name: "Sticker", sellingPrice: 1 },
  ];

  for (const modelData of defaultModelsData) {
    try {
      const id = uuidv4();
      const newModel: ServiceModelItem = {
        id,
        name: modelData.name,
        buyingPrice: 0,
        sellingPrice: modelData.sellingPrice,
        imageUrl: null,
        isReadyMade: false,
        stockCount: 0,
        totalSold: 0
      };
      await query(`INSERT INTO ${MODELS_TABLE} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newModel)]);
      createdItems.push(newModel);
    } catch (error) {
      console.error(`Error seeding model "${modelData.name}" in MySQL:`, error);
    }
  }
  console.log('Default service models seeded in MySQL.');
  return createdItems;
};

export const getModels = async (): Promise<ServiceModelItem[]> => {
  try {
    const [rows, allOrders] = await Promise.all([
      query<any[]>(`SELECT id, data_json FROM ${MODELS_TABLE} ORDER BY id ASC`),
      getOrders()
    ]);

    let models = rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as ServiceModelItem));

    if (models.length === 0) {
      console.log("No service models found, seeding defaults in MySQL.");
      models = await seedDefaultModels();
    }

    // Calculate sold counts
    const soldCounts = new Map<string, number>();
    allOrders.forEach(order => {
      order.orderItems.forEach(item => {
        soldCounts.set(item.model, (soldCounts.get(item.model) || 0) + item.quantity);
      });
    });

    // Add totalSold to each model and sort by name
    return models.map(model => ({
      ...model,
      totalSold: soldCounts.get(model.name) || 0
    })).sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching service models from MySQL:", error);
    return [];
  }
};

export const addModel = async (name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCount?: number): Promise<ServiceModelItem | null> => {
  if (!name.trim()) {
    throw new Error("Model name cannot be empty.");
  }
  const numBuyingPrice = buyingPrice === undefined || isNaN(Number(buyingPrice)) ? 0 : Number(buyingPrice);
  const numSellingPrice = sellingPrice === undefined || isNaN(Number(sellingPrice)) ? 0 : Number(sellingPrice);
  const finalStockCount = (isReadyMade && stockCount !== undefined) ? stockCount : 0;

  try {
    const id = uuidv4();
    const newModelData: ServiceModelItem = {
      id,
      name: name.trim(),
      buyingPrice: numBuyingPrice,
      sellingPrice: numSellingPrice,
      imageUrl: imageUrl || null,
      isReadyMade: isReadyMade || false,
      stockCount: finalStockCount,
      totalSold: 0
    } as ServiceModelItem;

    await query(`INSERT INTO ${MODELS_TABLE} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newModelData)]);
    return newModelData;
  } catch (error) {
    console.error("Error adding service model to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateModel = async (id: string, name: string, buyingPrice?: number, sellingPrice?: number, imageUrl?: string | null, isReadyMade?: boolean, stockCountChange?: number): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Model name cannot be empty.");
  }

  try {
    const rows = await query<any[]>(`SELECT data_json FROM ${MODELS_TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) {
      throw new Error("Document does not exist!");
    }

    const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
    const numBuyingPrice = buyingPrice === undefined || isNaN(Number(buyingPrice)) ? 0 : Number(buyingPrice);
    const numSellingPrice = sellingPrice === undefined || isNaN(Number(sellingPrice)) ? 0 : Number(sellingPrice);

    const currentStock = existingData.stockCount || 0;
    const stockToAdd = (isReadyMade && stockCountChange !== undefined) ? stockCountChange : 0;
    const finalStockCount = currentStock + stockToAdd;

    const updates = {
      name: name.trim(),
      buyingPrice: numBuyingPrice,
      sellingPrice: numSellingPrice,
      imageUrl: imageUrl === undefined ? existingData.imageUrl : imageUrl,
      isReadyMade: isReadyMade === undefined ? existingData.isReadyMade : isReadyMade,
      stockCount: finalStockCount,
    };

    const finalData = { ...existingData, ...updates };

    await query(`UPDATE ${MODELS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
    return true;
  } catch (error) {
    console.error("Error updating service model in MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const updateModelStock = async (modelId: string, quantityChange: number): Promise<boolean> => {
  try {
    const rows = await query<any[]>(`SELECT data_json FROM ${MODELS_TABLE} WHERE id = ?`, [modelId]);
    if (rows.length === 0) {
      throw new Error("Model not found for stock update.");
    }
    const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
    const currentStock = existingData.stockCount || 0;
    const newStock = currentStock + quantityChange;

    const finalData = { ...existingData, stockCount: newStock };

    await query(`UPDATE ${MODELS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), modelId]);
    return true;
  } catch (error) {
    console.error(`Error updating stock for model ${modelId} in MySQL:`, error);
    return false;
  }
};

export const deleteModel = async (id: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${MODELS_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("Error deleting service model from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};


// --- Lamination Functions ---

const seedDefaultLaminations = async (): Promise<ServiceLaminationItem[]> => {
  const createdLaminations: ServiceLaminationItem[] = [];
  const defaultLaminationsData: string[] = ["None", "Glossy", "Matte", "Soft Touch", "Anti-Scuff Matte"];

  for (const name of defaultLaminationsData) {
    const id = uuidv4();
    const newLamination: ServiceLaminationItem = { id, name };
    try {
      await query(`INSERT INTO ${LAMINATIONS_TABLE} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newLamination)]);
      createdLaminations.push(newLamination);
    } catch (error) {
      console.error(`Error seeding lamination "${name}" in MySQL:`, error);
    }
  }
  console.log('Default service laminations seeded in MySQL.');
  return createdLaminations;
};

export const getLaminations = async (): Promise<ServiceLaminationItem[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${LAMINATIONS_TABLE} ORDER BY id ASC`);
    let laminations = rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as ServiceLaminationItem));

    if (laminations.length === 0) {
      console.log("No service laminations found, seeding defaults in MySQL.");
      laminations = await seedDefaultLaminations();
    }
    return laminations.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching service laminations from MySQL:", error);
    return [];
  }
};

export const addLamination = async (name: string): Promise<ServiceLaminationItem | null> => {
  if (!name.trim()) {
    throw new Error("Lamination name cannot be empty.");
  }
  try {
    const id = uuidv4();
    const newLaminationData: ServiceLaminationItem = { id, name: name.trim() };
    await query(`INSERT INTO ${LAMINATIONS_TABLE} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newLaminationData)]);
    return newLaminationData;
  } catch (error) {
    console.error("Error adding service lamination to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateLamination = async (id: string, name: string): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Lamination name cannot be empty.");
  }
  try {
    const rows = await query<any[]>(`SELECT data_json FROM ${LAMINATIONS_TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return false;
    const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
    const finalData = { ...existingData, name: name.trim() };
    await query(`UPDATE ${LAMINATIONS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
    return true;
  } catch (error) {
    console.error("Error updating service lamination in MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteLamination = async (id: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${LAMINATIONS_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("Error deleting service lamination from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};


// --- Payment Method Functions ---

const seedDefaultPaymentMethods = async (): Promise<ServicePaymentMethodItem[]> => {
  const createdItems: ServicePaymentMethodItem[] = [];
  const defaultPaymentMethodsData: string[] = ["Cash", "Card", "Bank Transfer", "Mobile Banking", "Cheque", "Other"];

  for (const name of defaultPaymentMethodsData) {
    const id = uuidv4();
    const newItem: ServicePaymentMethodItem = { id, name };
    try {
      await query(`INSERT INTO ${PAYMENT_METHODS_TABLE} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newItem)]);
      createdItems.push(newItem);
    } catch (error) {
      console.error(`Error seeding payment method "${name}" in MySQL:`, error);
    }
  }
  console.log('Default payment methods seeded in MySQL.');
  return createdItems;
};


export const getPaymentMethods = async (): Promise<ServicePaymentMethodItem[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${PAYMENT_METHODS_TABLE} ORDER BY id ASC`);
    let methods = rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as ServicePaymentMethodItem));

    if (methods.length === 0) {
      console.log("No payment methods found, seeding defaults in MySQL.");
      methods = await seedDefaultPaymentMethods();
    }

    // Filter out duplicates (if any)
    const uniqueMethods: ServicePaymentMethodItem[] = [];
    const seenNames = new Set<string>();
    methods.forEach((m) => {
      if (!seenNames.has(m.name)) {
        seenNames.add(m.name);
        uniqueMethods.push(m);
      }
    });
    return uniqueMethods.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching payment methods from MySQL:", error);
    return [];
  }
};


export const addPaymentMethod = async (name: string): Promise<ServicePaymentMethodItem | null> => {
  if (!name.trim()) {
    throw new Error("Payment method name cannot be empty.");
  }
  try {
    const id = uuidv4();
    const newItemData: ServicePaymentMethodItem = { id, name: name.trim() };
    await query(`INSERT INTO ${PAYMENT_METHODS_TABLE} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newItemData)]);
    return newItemData;
  } catch (error) {
    console.error("Error adding payment method to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updatePaymentMethod = async (id: string, name: string): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Payment method name cannot be empty.");
  }
  try {
    const rows = await query<any[]>(`SELECT data_json FROM ${PAYMENT_METHODS_TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return false;
    const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
    const finalData = { ...existingData, name: name.trim() };
    await query(`UPDATE ${PAYMENT_METHODS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
    return true;
  } catch (error) {
    console.error("Error updating payment method in MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deletePaymentMethod = async (id: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${PAYMENT_METHODS_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("Error deleting payment method from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

// --- Gift Functions ---

const seedDefaultGifts = async (): Promise<ServiceGiftItem[]> => {
  const createdItems: ServiceGiftItem[] = [];
  const defaultGiftsData: string[] = ["Pen", "Mug", "Keychain"];

  for (const name of defaultGiftsData) {
    const id = uuidv4();
    const newItem: ServiceGiftItem = { id, name };
    try {
      await query(`INSERT INTO ${GIFTS_TABLE} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newItem)]);
      createdItems.push(newItem);
    } catch (error) {
      console.error(`Error seeding gift "${name}" in MySQL:`, error);
    }
  }
  console.log('Default gifts seeded in MySQL.');
  return createdItems;
};

export const getGifts = async (): Promise<ServiceGiftItem[]> => {
  try {
    const rows = await query<any[]>(`SELECT id, data_json FROM ${GIFTS_TABLE} ORDER BY id ASC`);
    let gifts = rows.map(row => ({
      id: row.id,
      ...(typeof row.data_json === 'string' ? JSON.parse(row.data_json) : row.data_json)
    } as ServiceGiftItem));

    if (gifts.length === 0) {
      console.log("No gifts found, seeding defaults in MySQL.");
      gifts = await seedDefaultGifts();
    }
    return gifts.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Error fetching gifts from MySQL:", error);
    return [];
  }
};

export const addGift = async (name: string): Promise<ServiceGiftItem | null> => {
  if (!name.trim()) {
    throw new Error("Gift name cannot be empty.");
  }
  try {
    const id = uuidv4();
    const newItemData: ServiceGiftItem = { id, name: name.trim() };
    await query(`INSERT INTO ${GIFTS_TABLE} (id, data_json) VALUES (?, ?)`, [id, JSON.stringify(newItemData)]);
    return newItemData;
  } catch (error) {
    console.error("Error adding gift to MySQL:", error);
    if (error instanceof Error) throw error;
    return null;
  }
};

export const updateGift = async (id: string, name: string): Promise<boolean> => {
  if (!name.trim()) {
    throw new Error("Gift name cannot be empty.");
  }
  try {
    const rows = await query<any[]>(`SELECT data_json FROM ${GIFTS_TABLE} WHERE id = ?`, [id]);
    if (rows.length === 0) return false;
    const existingData = typeof rows[0].data_json === 'string' ? JSON.parse(rows[0].data_json) : rows[0].data_json;
    const finalData = { ...existingData, name: name.trim() };
    await query(`UPDATE ${GIFTS_TABLE} SET data_json = ? WHERE id = ?`, [JSON.stringify(finalData), id]);
    return true;
  } catch (error) {
    console.error("Error updating gift in MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};

export const deleteGift = async (id: string): Promise<boolean> => {
  try {
    await query(`DELETE FROM ${GIFTS_TABLE} WHERE id = ?`, [id]);
    return true;
  } catch (error) {
    console.error("Error deleting gift from MySQL:", error);
    if (error instanceof Error) throw error;
    return false;
  }
};
