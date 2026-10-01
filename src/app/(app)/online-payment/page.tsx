import { cookies } from 'next/headers';
import { AlertTriangle } from 'lucide-react';
import { getOrders } from '@/lib/order-service';
import { getUserById } from '@/lib/user-service';
import type { User } from '@/types';
import { OnlinePaymentClient, type OnlinePaymentRow } from './OnlinePaymentClient';

const ADMIN_ROLES = ['SYSTEM_ADMIN', 'ADMIN'];
const ALLOWED_ROLES = [...ADMIN_ROLES, 'CRM'];

async function getCookieUserId(): Promise<string | null> {
  const value = (await cookies()).get('colorhut-user')?.value;
  if (!value) return null;
  try {
    const user: User = JSON.parse(value.startsWith('%7B') ? decodeURIComponent(value) : value);
    return user?.id || null;
  } catch {
    return null;
  }
}

export default async function OnlinePaymentPage() {
  const userId = await getCookieUserId();
  const user = userId ? await getUserById(userId) : null;

  if (!user || user.isBanned || !ALLOWED_ROLES.includes(user.role)) {
    return (
      <div className="flex h-[calc(100vh-10rem)] w-full items-center justify-center text-center">
        <div>
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
          <h2 className="mt-4 text-xl font-semibold">Access Denied</h2>
          <p className="mt-2 text-muted-foreground">You do not have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const isAdmin = ADMIN_ROLES.includes(user.role);
  const orders = isAdmin ? await getOrders() : await getOrders(undefined, undefined, 'CRM', user.id);

  const rows: OnlinePaymentRow[] = orders.flatMap(order =>
    (order.advancePayments || [])
      .filter(p => p.recordedByUserId === 'system' && p.recordedByUserName === 'PayStation')
      .map(p => ({
        id: p.id,
        orderId: order.id,
        companyName: order.companyName,
        crmUserName: order.crmUserName || 'N/A',
        amount: Number(p.amount) || 0,
        method: p.paymentMethod || 'PayStation',
        trxId: p.notes || '',
        status: p.status || 'Approved',
        date: p.date,
      }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return <OnlinePaymentClient rows={rows} isAdmin={isAdmin} />;
}
