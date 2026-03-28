import os, logging
from datetime import datetime, timezone
import stripe

logger = logging.getLogger(__name__)

class StripePaymentService:
    def __init__(self, api_key: str = None, webhook_secret: str = None):
        self.api_key = api_key or os.environ.get("STRIPE_API_KEY")
        self.webhook_secret = webhook_secret or os.environ.get("STRIPE_WEBHOOK_SECRET")
        if self.api_key:
            stripe.api_key = self.api_key

    async def create_checkout_session(self, amount: float, currency: str, success_url: str, cancel_url: str, metadata: dict):
        if not self.api_key:
            # Mock session if no API key provided for easy local testing
            session_id = f"mock_session_{int(datetime.now().timestamp())}"
            return type('Session', (), {
                'id': session_id,
                'session_id': session_id, # for backward compatibility with our code
                'url': f"{success_url.replace('{CHECKOUT_SESSION_ID}', session_id)}"
            })
        
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': currency,
                        'product_data': {'name': 'HyperEats Order'},
                        'unit_amount': int(amount * 100),
                    },
                    'quantity': 1,
                }],
                mode='payment',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata=metadata,
            )
            # Add session_id attribute for compatibility
            session.session_id = session.id
            return session
        except Exception as e:
            logger.error(f"Stripe session creation error: {e}")
            raise e

    async def get_checkout_status(self, session_id: str):
        if not self.api_key or session_id.startswith("mock_"):
            return type('Status', (), {
                'payment_status': 'paid',
                'status': 'complete'
            })
            
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            return type('Status', (), {
                'payment_status': session.payment_status,
                'status': session.status
            })
        except Exception as e:
            logger.error(f"Stripe session status error: {e}")
            raise e

    def handle_webhook(self, body, sig):
        if not self.api_key or not self.webhook_secret:
             # Basic mock for healthchecks/debugging
             return type('Event', (), {'event_type': 'checkout.session.completed', 'session_id': 'mock', 'payment_status': 'paid'})
        
        try:
            event = stripe.Webhook.construct_event(body, sig, self.webhook_secret)
            if event['type'] == 'checkout.session.completed':
                session = event['data']['object']
                return type('Event', (), {
                    'event_type': event['type'],
                    'session_id': session['id'],
                    'payment_status': session['payment_status']
                })
            return type('Event', (), {'event_type': event['type'], 'session_id': None, 'payment_status': None})
        except Exception as e:
            logger.error(f"Stripe webhook construct error: {e}")
            raise ValueError(str(e))

stripe_service = StripePaymentService()
