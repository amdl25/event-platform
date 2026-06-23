import React, { useState } from 'react';
import { FiMail, FiPhone, FiSend, FiCheckCircle } from 'react-icons/fi';
import API from '../api';
import '../styles/ContactPage.css';

const ContactPage = () => {
	const [form, setForm] = useState({ name: '', email: '', message: '' });
	const [status, setStatus] = useState('idle');
	const [errorMsg, setErrorMsg] = useState('');

	const handleChange = (field, value) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setStatus('loading');
		setErrorMsg('');

		try {
			await API.post('/contact', form);
			setStatus('success');
			setForm({ name: '', email: '', message: '' });
		} catch (err) {
			setStatus('error');
			setErrorMsg(err?.response?.data?.message || 'A apărut o eroare. Încearcă din nou.');
		}
	};

	return (
		<div className="contact-page">
			<section className="contact-hero">
				<div className="contact-hero-inner">
					<p className="contact-kicker">CONTACT</p>
					<h1 className="contact-title">Cum te putem ajuta?</h1>
					<p className="contact-lead">
						Scrie-ne orice întrebare legată de platformă, contul tău sau colaborări.
					</p>
				</div>
			</section>

			<section className="contact-body">
				<div className="contact-body-inner">

					<div className="contact-info">
						<div className="contact-info-card">
							<div className="contact-info-icon"><FiMail /></div>
							<div>
								<p className="contact-info-label">Email</p>
								<a href="mailto:contact@eventhub.ro" className="contact-info-value">contact@eventhub.ro</a>
							</div>
						</div>
						<div className="contact-info-card">
							<div className="contact-info-icon"><FiPhone /></div>
							<div>
								<p className="contact-info-label">Telefon</p>
								<a href="tel:+40712356384" className="contact-info-value">+40 712 356 384</a>
							</div>
						</div>
						<div className="contact-note">
							<p>Programul nostru de suport este <strong>Luni - Vineri, 09:00 - 18:00</strong>.</p>
						</div>
					</div>

					<div className="contact-form-wrap">
						{status === 'success' ? (
							<div className="contact-success">
								<FiCheckCircle size={40} />
								<h3>Mesaj trimis!</h3>
								<p>Îți mulțumim. Te vom contacta cât mai curând la adresa de email introdusă.</p>
								<button type="button" onClick={() => setStatus('idle')}>Trimite alt mesaj</button>
							</div>
						) : (
							<form className="contact-form" onSubmit={handleSubmit}>
								<div className="contact-field">
									<label htmlFor="contact-name">Nume</label>
									<input
										id="contact-name"
										type="text"
										placeholder="Numele tău"
										value={form.name}
										onChange={(e) => handleChange('name', e.target.value)}
										required
									/>
								</div>
								<div className="contact-field">
									<label htmlFor="contact-email">Email</label>
									<input
										id="contact-email"
										type="email"
										placeholder="adresa@email.ro"
										value={form.email}
										onChange={(e) => handleChange('email', e.target.value)}
										required
									/>
								</div>
								<div className="contact-field">
									<label htmlFor="contact-message">Mesaj</label>
									<textarea
										id="contact-message"
										rows={6}
										placeholder="Descrie întrebarea sau problema ta..."
										value={form.message}
										onChange={(e) => handleChange('message', e.target.value)}
										required
									/>
								</div>
								{status === 'error' && (
									<p className="contact-error">{errorMsg}</p>
								)}
								<button type="submit" className="contact-submit" disabled={status === 'loading'}>
									<FiSend />
									<span>{status === 'loading' ? 'Se trimite...' : 'Trimite mesajul'}</span>
								</button>
							</form>
						)}
					</div>

				</div>
			</section>
		</div>
	);
};

export default ContactPage;
