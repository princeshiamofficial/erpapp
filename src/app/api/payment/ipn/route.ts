import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder } from "@/lib/order-service";
import { v4 as uuidv4 } from "uuid";
import type { AdvancePaymentRecord } from "@/types";

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

    const statusLower = (trx_status || "").toLowerCase();
    if (statusLower !== "success" && statusLower !== "successful") {
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

    let paymentAmount = Number(trx_amount) || 0;
    if (paymentAmount <= 0) {
      paymentAmount = Math.max(0, Math.ceil(amountDue));
    }
    if (paymentAmount <= 0) {
      return NextResponse.json({ status: "success" });
    }

    const newPayment: AdvancePaymentRecord = {
      id: uuidv4(),
      amount: paymentAmount,
      date: new Date().toISOString(),
      paymentMethod: payment_method || "PayStation",
      notes: trx_id,
      recordedByUserId: "system",
      recordedByUserName: "PayStation",
      status: "Approved",
    };

    const updatedPayments = [...(order.advancePayments || []), newPayment];
    await updateOrder(orderId, { advancePayments: updatedPayments });

    console.log(`[PayStation IPN] Recorded payment for ${orderId}: ${trx_amount} BDT, TrxID: ${trx_id}`);

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("IPN handler error:", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
