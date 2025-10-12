// const express = require('express');
// const router = express.Router();
// const {protect} = require('../middleware/auth');
// const bcrypt = require('bcryptjs');
// const crypto = require('crypto');
// const User = require('../models/User');

// // Create PIN (authenticated)
// router.post('/create', protect, async (req, res) => {
//   try {
//     const { pin } = req.body;
//     if (!pin || pin.length !== 4) return res.status(400).json({ error: 'PIN must be 4 digits' });
//     const hash = await bcrypt.hash(pin, 10);
//     req.user.transferPinHash = hash;
//     await req.user.save();
//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // Verify PIN
// router.post('/verify', protect, async (req, res) => {
//   try {
//     const { pin } = req.body;
//     if (!pin) return res.status(400).json({ error: 'Missing pin' });
//     const ok = await bcrypt.compare(pin, req.user.transferPinHash || '');
//     res.json({ valid: !!ok });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // Forgot PIN - generate reset token (send by email in production)
// router.post('/forgot', async (req, res) => {
//   try {
//     const { email } = req.body;
//     if (!email) return res.status(400).json({ error: 'Missing email' });
//     const user = await User.findOne({ email });
//     if (!user) return res.status(400).json({ error: 'No user with that email' });

//     const token = crypto.randomBytes(20).toString('hex');
//     user.pinResetToken = token;
//     await user.save();

//     // TODO: send token via email (nodemailer) with secure link
//     // e.g., https://your-site.com/reset-pin?token=...
//     res.json({ success: true, message: 'Reset token created (send by email)', token });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// // Reset PIN using token
// router.post('/reset', async (req, res) => {
//   try {
//     const { token, newPin } = req.body;
//     if (!token || !newPin || newPin.length !== 4) return res.status(400).json({ error: 'Invalid request' });
//     const user = await User.findOne({ pinResetToken: token });
//     if (!user) return res.status(400).json({ error: 'Invalid token' });

//     user.transferPinHash = await bcrypt.hash(newPin, 10);
//     user.pinResetToken = null;
//     await user.save();
//     res.json({ success: true });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Server error' });
//   }
// });

// module.exports = router;
