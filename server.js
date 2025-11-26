require('dotenv').config();

const express = require('express');
const path = require('path');
const Stripe = require('stripe');

const app = express();

// --- Stripe setup ---
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    'Warning: STRIPE_SECRET_KEY is not set. Stripe Checkout will not work until this is configured.'
  );
}
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

// Parse JSON if needed (future safety)
app.use(express.json());

// --- Static file serving ---
// Serve all existing static files (index.html, thank-you.html, style.css, assets/)
app.use(express.static(path.join(__dirname)));

// Explicit root route (optional, but keeps behaviour clear)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Stripe Checkout (setup mode) route ---
// This route is hit directly by the CTAs via a normal link.
// It creates a Checkout Session in setup mode (card only, no charge)
// and redirects the user to Stripe's hosted page.
app.get('/create-checkout-session-setup', async (req, res) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).send('Stripe is not configured yet.');
    }

    // Determine base URL for redirects.
    // In production, set FRONTEND_BASE_URL in Render (e.g. https://your-domain.com).
    const baseUrl =
      process.env.FRONTEND_BASE_URL ||
      `${req.protocol}://${req.get('host')}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      // Ensure a Customer is always created for this setup so that
      // you can later start a subscription against their saved card.
      customer_creation: 'always',
      // No amount is charged; this is card collection only.

      success_url: `${baseUrl}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/index.html`,
    });

    // Redirect user to the Stripe-hosted Checkout page
    res.redirect(303, session.url);
  } catch (err) {
    console.error('Error creating Stripe Checkout session (setup mode):', err);
    res.status(500).send('Unable to start signup flow right now. Please try again later.');
  }
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Label-in-a-Box prelaunch server running on port ${PORT}`);
});

