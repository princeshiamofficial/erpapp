import { NextRequest, NextResponse } from "next/server";

function extractOrderId(invoiceNumber: string): string {
  return invoiceNumber.replace(/-P\d+$/, "");
}

function getOrigin(request: NextRequest): string {
  return request.headers.get("x-forwarded-host")
    ? `${request.headers.get("x-forwarded-proto") || "https"}://${request.headers.get("x-forwarded-host")}`
    : request.nextUrl.origin;
}

function buildRedirectUrl(origin: string, invoiceNumber: string, status: string, extra: Record<string, string> = {}): string {
  const orderId = extractOrderId(invoiceNumber);
  const isSuccess = status.toLowerCase() === "success";
  const path = isSuccess ? "success" : "failed";
  const params = new URLSearchParams(extra);
  const qs = params.toString();
  return `${origin}/pay/${orderId}/${path}${qs ? `?${qs}` : ""}`;
}

function extractParams(source: { get: (key: string) => string | null }): { invoiceNumber: string | null; status: string; extra: Record<string, string> } {
  const invoiceNumber = source.get("invoice_number");
  const trxStatus = source.get("trx_status") || source.get("status") || "failed";
  const trxId = source.get("trx_id");
  const amount = source.get("payment_amount") || source.get("trx_amount");
  const message = source.get("message");

  const extra: Record<string, string> = {};
  if (trxId) extra.trx_id = trxId;
  if (amount) extra.amount = amount;
  if (trxStatus.toLowerCase() !== "success" && message) extra.reason = message;

  return { invoiceNumber, status: trxStatus, extra };
}

export async function POST(request: NextRequest) {
  const origin = getOrigin(request);
  try {
    const formData = await request.formData();
    const getter = { get: (key: string) => formData.get(key) as string | null };
    const { invoiceNumber, status, extra } = extractParams(getter);

    if (invoiceNumber) {
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
  const { invoiceNumber, status, extra } = extractParams(getter);

  if (invoiceNumber) {
    return NextResponse.redirect(buildRedirectUrl(origin, invoiceNumber, status, extra));
  }
  return NextResponse.redirect(`${origin}/orders`);
}
