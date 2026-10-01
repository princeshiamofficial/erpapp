import { getGlobalSettings } from "./settings-service";

interface VerifyResult {
  verified: boolean;
  amount?: number;
  method?: string;
  trxId?: string;
}

export async function verifyPayment(invoiceNumber: string): Promise<VerifyResult> {
  try {
    const settings = await getGlobalSettings();
    if (!settings.paymentGatewayMerchantId || !settings.paymentGatewayPassword) {
      return { verified: false };
    }

    const baseUrl = settings.paymentGatewayEnvironment === "production"
      ? "https://api.paystation.com.bd"
      : "https://sandbox.paystation.com.bd";

    const body = new URLSearchParams({
      merchantId: settings.paymentGatewayMerchantId,
      password: settings.paymentGatewayPassword,
      invoice_number: invoiceNumber,
    });

    const response = await fetch(`${baseUrl}/check-invoice`, {
      method: "POST",
      headers: { Accept: "application/json" },
      body,
    });

    const data = await response.json();

    const trxStatus = (data.trx_status || "").toLowerCase();
    if (data.status_code === "200" && (trxStatus === "successful" || trxStatus === "success")) {
      return {
        verified: true,
        amount: Number(data.trx_amount || data.payment_amount) || undefined,
        method: data.payment_method || undefined,
        trxId: data.trx_id || undefined,
      };
    }

    return { verified: false };
  } catch (error) {
    console.error("PayStation verify error:", error);
    return { verified: false };
  }
}
