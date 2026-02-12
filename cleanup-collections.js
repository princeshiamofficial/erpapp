
const fs = require('fs');

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
    'sowData',
    'officeLocation',
    'officeTime',
    'districtData',
    'COWorkflow',
    'COworkflow',
    'CRworkflow',
    'DRworkflow',
    'LRworkflow',
    'dialogue',
    'purchaseRequests',
    'providentFund',
    'stock',
    'soldhistory',
    'serviceModels',
    'serviceLaminations',
    'servicePaymentMethods',
    'serviceGifts',
    'projects'
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
    try {
        if (!fs.existsSync(filePath)) return;
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const initialCount = data.collections.length;

        data.collections = data.collections.filter((col) => {
            const name = col.name;
            if (migratedExact.includes(name)) return false;
            if (migratedPrefixes.some(p => name.startsWith(p))) return false;
            return true;
        });

        const finalCount = data.collections.length;
        console.log(`Cleaned up collections. Removed ${initialCount - finalCount} entries.`);

        fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
    } catch (e) {
        console.error("Cleanup failed:", e);
    }
}

cleanupCollections();
