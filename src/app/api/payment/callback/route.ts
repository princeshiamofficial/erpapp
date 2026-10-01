import { NextRequest, NextResponse } from "next/server";
import { getOrderById, updateOrder } from "@/lib/order-service";
import { v4 as uuidv4 } from "uuid";
import type { AdvancePaymentRecord } from "@/types";

function extractOrderId(invoiceNumber: string): string {
  return invoiceNumber.replace(/-P\d+$/, "");
}

function getOrigin(request: NextRequest): string {
  const proto = (request.headers.get("x-forwarded-proto") || "https").split(",")[0].trim();
  return request.headers.get("x-forwarded-host")
    ? `${proto}://${request.headers.get("x-forwarded-host")}`
    : request.nextUrl.origin;
}

function isSuccessStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === "success" || s === "successful";
}

function buildRedirectUrl(origin: string, invoiceNumber: string, status: string, extra: Record<string, string> = {}): string {
  const orderId = extractOrderId(invoiceNumber);
  const path = isSuccessStatus(status) ? "success" : "failed";
  const params = new URLSearchParams(extra);
  const qs = params.toString();
  return `${origin}/pay/${orderId}/${path}${qs ? `?${qs}` : ""}`;
}

function extractParams(source: { get: (key: string) => string | null }): { invoiceNumber: string | null; status: string; method: string | null; extra: Record<string, string> } {
  const invoiceNumber = source.get("invoice_number");
  const trxStatus = source.get("trx_status") || source.get("status") || "failed";
  const trxId = source.get("trx_id");
  const amount = source.get("payment_amount") || source.get("trx_amount");
  const method = source.get("payment_method");
  const message = source.get("message");

  const extra: Record<string, string> = {};
  if (trxId) extra.trx_id = trxId;
  if (amount) extra.amount = amount;
  if (trxStatus.toLowerCase() !== "success" && message) extra.reason = message;

  return { invoiceNumber, status: trxStatus, method, extra };
}

async function recordPaymentIfNeeded(invoiceNumber: string, trxId: string | undefined, amount: string | undefined, method?: string) {
  if (!trxId || !amount) return;
  try {
    const orderId = extractOrderId(invoiceNumber);
    const order = await getOrderById(orderId);
    if (!order) return;

    const alreadyRecorded = Array.isArray(order.advancePayments) &&
      order.advancePayments.some(p => p.notes?.includes(trxId));
    if (alreadyRecorded) return;

    const newPayment: AdvancePaymentRecord = {
      id: uuidv4(),
      amount: Number(amount),
      date: new Date().toISOString(),
      paymentMethod: method || "PayStation",
      notes: trxId,
      recordedByUserId: "system",
      recordedByUserName: "PayStation",
      status: "Approved",
    };

    await updateOrder(orderId, { advancePayments: [...(order.advancePayments || []), newPayment] });
  } catch (error) {
    console.error("Callback payment recording error:", error);
  }
}

export async function POST(request: NextRequest) {
  const origin = getOrigin(request);
  try {
    const formData = await request.formData();
    const getter = { get: (key: string) => formData.get(key) as string | null };
    const { invoiceNumber, status, method, extra } = extractParams(getter);

    if (invoiceNumber) {
      if (isSuccessStatus(status)) {
        await recordPaymentIfNeeded(invoiceNumber, extra.trx_id, extra.amount, method || undefined);
      }
      return NextResponse.redirect(buildRedirectUrl(origin, invoiceNumber, status, extra));
    }
    return NextResponse.redirect(`${origin}/orders`);
  } catch {
    return NextResponse.redirect(`${origin}/orders`);
  }
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const getter = { get: (key: string) => request.nextUrl.searchParams.get(key) };
  const { invoiceNumber, status, method, extra } = extractParams(getter);

  if (invoiceNumber) {
    if (isSuccessStatus(status)) {
      await recordPaymentIfNeeded(invoiceNumber, extra.trx_id, extra.amount, method || undefined);
    }
    return NextResponse.redirect(buildRedirectUrl(origin, invoiceNumber, status, extra));
  }
  return NextResponse.redirect(`${origin}/orders`);
}
