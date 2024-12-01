require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require("cors")
const Payment = require("./models/paymentModel");
const Organizer = require("./models/organizerModel")
const Payout = require("./models/payoutModel")
const User = require("./models/authModel")
const connectDB = require('./config/db');
const qrcode = require('qrcode');

const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

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
            user_id: req.body.userId
        });
        await organizer.save();

        const accountLink = await stripe.accountLinks.create({
            account: account.id,
            refresh_url: "http://localhost:3000/reauth",
            return_url: "http://localhost:3000/success",
            type: "account_onboarding",
        });

        res.json({ success: true, accountLink: accountLink.url, organizerId: organizer._id });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post("/api/create-payment-intent", async (req, res) => {
    try {
        const { amount, organizerId, userId, eventId, date, status, count, ticketId, email } = req.body;

        console.log('Received data:', req.body);

        const organizer = await Organizer.findById(organizerId);
        if (!organizer) {
            console.error('Organizer not found');
            return res.status(404).json({ error: "Organizer not found" });
        }

        const user = await User.findById(userId);
        if (!user) {
            console.error('User not found');
            return res.status(404).json({ error: "User not found" });
        }

        console.log('Creating payment intent with amount:', amount);
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
            userId,
            transferGroup: `group_${organizerId}`,
        });
        await payment.save();

        const qrData = {
            amount: amount,
            userId: userId,
            eventId: eventId,
            status: status,
            count: count,
            paymentIntentId: paymentIntent.id,
        };

        const qrCode = await qrcode.toDataURL(JSON.stringify(qrData));

        const newPayment = new Payment({
            user_id: userId,
            party_id: eventId,
            transaction_id: paymentIntent.id,
            date: new Date().toISOString(),
            amount: amount,
            status: "pending",
            payment_method: "card",
            qrcode: qrCode,
            qr_status: "false",
            count: count,
            ticketId: ticketId
        });

        await newPayment.save();

        // Send email
        const message = {
            to: user.email,
            from: 'crackmack16@gmail.com',
            subject: 'Your Event Booking Confirmation',
            html: `
                <h1>Thank You for Your Booking!</h1>
                <p>Here are your booking details:</p>
                <ul>
                    <li>Amount: $${(amount / 100).toFixed(2)}</li>
                    <li>Event ID: ${eventId}</li>
                    <li>Ticket Count: ${count}</li>
                    <li>Payment Status: Pending</li>
                </ul>
                <p>Please present the QR code below at the event:</p>
                <a href=http://localhost:5173/qr-ticket/${newPayment._id} alt="QR Code">View Ticket</a>
            `,
        };

        await sendgrid.send(message);

        res.json({ clientSecret: paymentIntent.client_secret, paymentId: newPayment._id });
    } catch (error) {
        console.error('Error details:', error);
        res.status(400).json({ error: error.message });
    }
});


app.post("/api/trigger-payout", async (req, res) => {
    const payments = await Payout.find({ isTransferred: false });
    for (const payment of payments) {
        try {
            const organizer = await Organizer.findById(payment.organizerId);
            const transfer = await stripe.transfers.create({
                amount: payment.amount,
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

app.get("/api/get-organizer/:id", async (req, res) => {
    try {
        const organizerId = req.params.id;
        const organizer = await Organizer.findById(organizerId);
        if (!organizer) {
            return res.status(404).json({ message: "organizer not found" });
        }
        res.status(200).json(organizer);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
})

app.post('/api/generate-onboarding-url', async (req, res) => {
    const { accountId } = req.body;
    if (!accountId) {
        return res.status(400).json({ error: 'Account ID is required.' });
    }
    try {
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: 'http://localhost:5173/finance',
            return_url: `http://localhost:5173/onboarding-success/${accountId}`,
            type: 'account_onboarding',
        });
        res.status(200).json({ url: accountLink.url });
    } catch (error) {
        console.error('Error generating onboarding URL:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/get-qr-ticket-details/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const booking = await Payment.findById(bookingId)
            .populate('user_id')
            .populate('party_id');

        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }

        res.status(200).json(booking);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/api/get-booking-lists/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const bookings = await Payment.find({ user_id: userId })
            .populate('party_id');

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found for this user" });
        }

        res.status(200).json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.get('/api/total-transferred-amount', async (req, res) => {
    const connectedAccountId = req.query.accountId;

    try {
        let totalAmountTransferred = 0;
        let hasMore = true;
        let lastPayoutId = null;
        while (hasMore) {
            const payouts = await stripe.payouts.list({
                limit: 100,
                starting_after: lastPayoutId,
                stripeAccount: connectedAccountId,
            });
            if (payouts.data.length === 0) {
                hasMore = false;
                continue;
            }
            payouts.data.forEach(payout => {
                totalAmountTransferred += payout.amount;
            });
            if (payouts.data.length > 0) {
                lastPayoutId = payouts.data[payouts.data.length - 1].id;
            }
            hasMore = payouts.has_more;
        }
        const totalAmountInDollars = totalAmountTransferred / 100;
        res.json({ totalAmountTransferred: totalAmountInDollars });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/payout-list', async (req, res) => {
    const connectedAccountId = req.query.accountId;

    try {
        let payoutsList = [];
        let hasMore = true;
        let lastPayoutId = null;

        while (hasMore) {
            const payouts = await stripe.payouts.list({
                limit: 100,
                starting_after: lastPayoutId,
                stripeAccount: connectedAccountId,
            });
            payoutsList = payoutsList.concat(payouts.data);
            if (payouts.data.length > 0) {
                lastPayoutId = payouts.data[payouts.data.length - 1].id;
            }
            hasMore = payouts.has_more;
        }
        const payoutDetails = payoutsList.map(payout => {
            return {
                id: payout.id,
                amount: payout.amount / 100,
                currency: payout.currency,
                status: payout.status,
                created: new Date(payout.created * 1000).toLocaleString(),
                destination: payout.destination,
            };
        });

        res.json({ payouts: payoutDetails });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/get-event-payment-list/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const bookings = await Payment.find({ party_id: id })
            .populate('user_id');

        if (!bookings || bookings.length === 0) {
            return res.status(404).json({ message: "No bookings found for this event" });
        }

        res.status(200).json(bookings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.use("/api/auth", authRoute)
app.use('/api/event', eventRoute)

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
