require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require("cors")
const Payment = require("./models/paymentModel");
const Organizer = require("./models/organizerModel")
const Payout = require("./models/payoutModel")
const connectDB = require('./config/db');

const authRoute = require("./routes/authRoute");
const eventRoute = require("./routes/eventRoute")

const app = express();
connectDB();

app.use(express.json());
app.use(cors());

app.post("/api/pay", async (req, res) => {
    try {
        const { name, amount, user_id, party_id, payment_method } = req.body;

        if (!name) return res.status(400).json({ message: "Please enter a name" });
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount * 100,
            currency: "usd",
            payment_method_types: ["card"],
            metadata: { name },
        });

        const payment = new Payment({
            user_id,
            party_id,
            transaction_id: paymentIntent.id,
            amount,
            payment_method,
            status: "success",
        });
        await payment.save();
        const clientSecret = paymentIntent.client_secret;
        res.json({ message: "Payment initiated", clientSecret });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
})

app.post("/api/create-connected-account", async (req, res) => {
    try {
        const account = await stripe.accounts.create({ type: "express" });

        const organizer = new Organizer({
            name: req.body.name,
            stripeAccountId: account.id,
        });
        await organizer.save();

        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: "http://localhost:3000/reauth",
            return_url: "http://localhost:3000/success",
            type: "account_onboarding",
        });

        res.json({ accountLink: accountLink.url });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post("/api/create-payment-intent", async (req, res) => {
    try {
        const { amount, organizerId } = req.body;

        const organizer = await Organizer.findById(organizerId);
        if (!organizer) return res.status(404).json({ error: "Organizer not found" });

        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: "usd",
            payment_method_types: ["card"],
            transfer_group: `group_${organizerId}`,
        });

        const payment = new Payout({
            amount,
            currency: "usd",
            organizerId,
            transferGroup: `group_${organizerId}`,
        });
        await payment.save();

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post("/api/trigger-payout", async (req, res) => {
    const payments = await Payout.find({ isTransferred: false });
    for (const payment of payments) {
        try {
            const organizer = await Organizer.findById(payment.organizerId);
            const transfer = await stripe.transfers.create({
                amount: payment.amount * 0.2,
                currency: payment.currency,
                destination: organizer.stripeAccountId,
                transfer_group: payment.transferGroup,
            });

            payment.transferId = transfer.id;
            await payment.save();

            payment.isTransferred = true;
            await payment.save();
        } catch (error) {
            return res.status(400).json({ error: error.message });
        }
    }
    res.json({ message: "Payout triggered for pending payments." });
});

app.post("/api/check-transfer-status", async (req, res) => {
    const payments = await Payout.find({ isTransferred: true, transferId: { $exists: true } });

    for (const payment of payments) {
        try {
            const transfer = await stripe.transfers.retrieve(payment.transferId);

            if (transfer.status === "succeeded") {
                payment.isTransferred = true;
                await payment.save();
            } else if (transfer.status === "failed") {
                payment.isTransferred = false;
                await payment.save();
            }
        } catch (error) {
            console.error("Error checking transfer status:", error);
        }
    }

    res.json({ message: "Transfer status check completed." });
});

app.get('/api/check-user-balance/:connectedAccountId', async (req, res) => {
    const { connectedAccountId } = req.params; 

    try {
        const connectedBalance = await stripe.balance.retrieve({
            stripeAccount: connectedAccountId,
        });
        res.json(connectedBalance);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
})

app.post("/api/delete-account", async (req, res) => {
    const { accountId } = req.body;
    try {
        const deleted = await stripe.accounts.del(accountId);
        res.json({ message: "Account deleted successfully", deleted });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


app.use("/api/auth", authRoute)
app.use('/api/event', eventRoute)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
