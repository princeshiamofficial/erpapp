import { NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/order-service";
import { getGlobalSettings } from "@/lib/settings-service";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { invoice_number, trx_status, trx_id, trx_amount, payment_method } = data;

    if (!invoice_number) {
      return NextResponse.json({ status: "error" }, { status: 400 });
    }

    const orderId = invoice_number.replace(/-P\d+$/, "");
    const order = await getOrderById(orderId);
    if (!order) {
      return NextResponse.json({ status: "error" }, { status: 404 });
    }

    if (trx_status !== "Success") {
      return NextResponse.json({ status: "error" }, { status: 422 });
    }

    const orderSubtotal = Array.isArray(order.orderItems)
      ? order.orderItems.reduce((acc, item) => acc + (item.isGift ? 0 : (Number(item.lineItemTotalPrice) || 0)), 0)
      : 0;
    const effectiveDiscount = Number(order.specialClientDiscount) || 0;
    const netPayable = orderSubtotal - effectiveDiscount;
    const shippingCharge = Number(order.shippingCharge) || 0;
    const grandTotal = netPayable + shippingCharge;
    const totalAdvancePaid = Array.isArray(order.advancePayments)
      ? order.advancePayments.reduce((sum, record) => sum + (Number(record.amount) || 0), 0)
      : 0;
    const amountDue = Math.max(0, grandTotal - totalAdvancePaid);

    if (Math.abs(Number(trx_amount) - Math.ceil(amountDue)) > 1) {
      console.warn(`IPN amount mismatch for ${invoice_number}: expected ~${amountDue}, got ${trx_amount}`);
    }

    const alreadyRecorded = Array.isArray(order.advancePayments) &&
      order.advancePayments.some(p => p.notes?.includes(trx_id));
    if (alreadyRecorded) {
      return NextResponse.json({ status: "success" });
    }

    // ponytail: log IPN for now, actual payment recording depends on addAdvancePayment signature
    console.log(`[PayStation IPN] Order: ${invoice_number}, TrxID: ${trx_id}, Amount: ${trx_amount}, Method: ${payment_method}`);

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("IPN handler error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
