
import * as fs from 'fs';

const migratedExact = [
    'orders',
    'order_statuses',
    'globalSettings',
    'vendorCategories',
    'vendorProducts',
    'vendorBills',
    'billReports',
    'userRoles',
    'shippedOrders',
    'employees',
    'leads',
    'personalUserNotes',
    'quotations',
    'feedback',
    'clientGifts',
    'CRcase',
    'DRcase',
    'LRcase',
    'teamPerformance',
    'monthlyTeamTargets',
    'sowData'
];

const migratedPrefixes = [
    'attendance-',
    'salarySheet-',
    'finance-',
    'routine-headers-',
    'routines-'
];

function cleanupCollections() {
    const filePath = 'collections.json';
    if (!fs.existsSync(filePath)) {
        console.error("collections.json not found");
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const initialCount = data.collections.length;

    data.collections = data.collections.filter((col: any) => {
        const name = col.name;
        if (migratedExact.includes(name)) return false;
        if (migratedPrefixes.some(p => name.startsWith(p))) return false;
        return true;
    });

    const finalCount = data.collections.length;
    console.log(`Cleaned up collections. Removed ${initialCount - finalCount} entries.`);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

cleanupCollections();
