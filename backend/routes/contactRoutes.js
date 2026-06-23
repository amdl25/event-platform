import express from 'express';
import { sendContactEmail } from '../services/EmailService.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ message: 'Toate câmpurile sunt obligatorii.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Adresa de email nu este validă.' });
  }

  if (message.trim().length < 10) {
    return res.status(400).json({ message: 'Mesajul trebuie să aibă cel puțin 10 caractere.' });
  }

  const result = await sendContactEmail({
    name: name.trim(),
    email: email.trim(),
    message: message.trim()
  });

  if (!result.success) {
    return res.status(500).json({ message: 'Nu am putut trimite mesajul. Încearcă din nou sau scrie-ne direct pe email.' });
  }

  return res.json({ message: 'Mesaj trimis cu succes.' });
});

export default router;
