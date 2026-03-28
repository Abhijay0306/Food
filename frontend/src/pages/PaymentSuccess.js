import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState("checking"); // checking, success, failed
  const [orderId, setOrderId] = useState(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    if (!sessionId) { setStatus("failed"); return; }

    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sessionId}`);
        if (data.payment_status === "paid") {
          setStatus("success");
          setOrderId(data.order_id);
          return;
        }
        if (data.status === "expired") {
          setStatus("failed");
          return;
        }
        // Keep polling
        if (attempts < 10) {
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else {
          setStatus("failed");
        }
      } catch {
        if (attempts < 10) {
          setTimeout(() => setAttempts(a => a + 1), 2000);
        } else {
          setStatus("failed");
        }
      }
    };
    poll();
  }, [sessionId, attempts]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4" data-testid="payment-success-page">
      <div className="text-center max-w-md">
        {status === "checking" && (
          <>
            <Loader2 className="h-16 w-16 text-orange-600 animate-spin mx-auto mb-6" />
            <h1 className="font-display text-2xl text-stone-900 mb-2">Processing Payment</h1>
            <p className="text-stone-500">Please wait while we confirm your payment...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="font-display text-3xl text-stone-900 mb-2" data-testid="payment-success-title">Order Placed!</h1>
            <p className="text-stone-500 mb-8">Your payment was successful. Your order has been sent to the kitchen.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {orderId && (
                <Link to={`/orders/${orderId}`}>
                  <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-8" data-testid="track-order-btn">
                    Track Order <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              )}
              <Link to="/orders">
                <Button variant="outline" className="rounded-full px-8 border-stone-300" data-testid="view-orders-btn">My Orders</Button>
              </Link>
            </div>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
              <XCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="font-display text-3xl text-stone-900 mb-2" data-testid="payment-failed-title">Payment Failed</h1>
            <p className="text-stone-500 mb-8">Something went wrong with your payment. Please try again.</p>
            <Link to="/cart">
              <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-8" data-testid="back-to-cart-btn">Back to Cart</Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
