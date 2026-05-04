import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { FiCalendar, FiGrid, FiSettings, FiUsers, FiCheckCircle, FiAlertCircle, FiClock } from 'react-icons/fi';
import API from '../api';
import '../styles/OrganizerDashboard.css';
import '../styles/OrganizerSettings.css';
import OrganizerShell from '../components/OrganizerShell';

const OrganizerSettingsPage = ({ user, handleLogout }) => {
  const statusLabels = {
    unverified: 'Neverificat',
    pending: 'În așteptare',
    verified: 'Verificat',
    rejected: 'Respins'
  };

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizerStatus, setOrganizerStatus] = useState(user?.organizerVerificationStatus || 'unverified');
  const [verificationForm, setVerificationForm] = useState({
    companyName: user?.organizationName || '',
    companyCui: '',
    registeredAddress: '',
    officialPhone: ''
  });
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState({
    companyName: false,
    companyCui: false,
    registeredAddress: false,
    officialPhone: false
  });

  const getVerificationFieldErrors = (values) => {
    const companyName = String(values?.companyName || '').trim();
    const companyCui = String(values?.companyCui || '').trim().toUpperCase();
    const registeredAddress = String(values?.registeredAddress || '').trim();
    const officialPhone = String(values?.officialPhone || '').trim();

    return {
      companyName: !companyName ? 'Numele firmei este obligatoriu.' : (companyName.length < 2 || companyName.length > 120 ? '2-120 caractere.' : ''),
      companyCui: !companyCui ? 'CUI/CIF este obligatoriu.' : (!/^(RO)?[0-9]{2,12}$/.test(companyCui) ? 'Format invalid (ex: RO12345678).' : ''),
      registeredAddress: !registeredAddress ? 'Adresa sediului este obligatorie.' : (registeredAddress.length < 6 ? 'Adresa este prea scurtă.' : ''),
      officialPhone: !officialPhone ? 'Telefonul oficial este obligatoriu.' : (!/^[0-9+()\-\s]{7,20}$/.test(officialPhone) ? 'Telefon invalid.' : '')
    };
  };

  const fieldErrors = getVerificationFieldErrors(verificationForm);

  useEffect(() => {

    if (!user?.id || user.role !== 'organizer') {
      navigate('/');
      return;
    }

    const loadStatus = async () => {
      try {
        const statusRes = await API.get(`/auth/organizer/status/${user.id}`);
        setOrganizerStatus(statusRes.data?.verificationStatus || 'unverified');
        setVerificationForm((prev) => ({
          ...prev,
          companyName: statusRes.data?.organizationName || prev.companyName,
          companyCui: statusRes.data?.cuiCif || '',
          registeredAddress: statusRes.data?.registeredAddress || '',
          officialPhone: statusRes.data?.officialPhone || ''
        }));
      } catch (error) {
        console.error('Nu am putut încărca statusul:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, [navigate, user]);

  const handleSubmitVerification = async (event) => {
    event.preventDefault();
    setSubmitError('');
    setSubmitMessage('');
    setTouched({
      companyName: true,
      companyCui: true,
      registeredAddress: true,
      officialPhone: true
    });

    const firstFieldError = Object.values(getVerificationFieldErrors(verificationForm)).find(Boolean);
    if (firstFieldError) {
      setSubmitError(firstFieldError);
      return;
    }

    const companyName = verificationForm.companyName.trim();
    const companyCui = verificationForm.companyCui.trim().toUpperCase();
    const registeredAddress = verificationForm.registeredAddress.trim();
    const officialPhone = verificationForm.officialPhone.trim();

    try {
      setIsSubmitting(true);
      const payload = {
        account_id: user.id,
        company_name: companyName || user?.organizationName,
        company_cui: companyCui,
        registered_address: registeredAddress,
        official_phone: officialPhone
      };

      const response = await API.post('/auth/organizer/verification', payload);
      setOrganizerStatus(response.data?.verificationStatus || 'pending');
      setSubmitMessage('Cererea a fost trimisă spre analiză!');

      setTimeout(() => {
        navigate('/organizer/events');
      }, 1500);
    } catch (error) {
      setSubmitError(error.response?.data?.message || 'Eroare la trimiterea cererii.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <OrganizerShell user={user} handleLogout={handleLogout} title="Setări" subtitle={`Status curent: ${statusLabels[organizerStatus]}`}>
      <div className="settings-container">
        <div className="settings-header">
          <h1>Verificare Identitate Business</h1>
          <p className="settings-subtitle">
            Completează datele oficiale ale firmei tale pentru a putea publica evenimente pe platformă.
          </p>
        </div>

        <div className="status-box">
          Status curent: <strong>{statusLabels[organizerStatus]}</strong>
        </div>

        <form className="verification-form" onSubmit={handleSubmitVerification}>
          <div className="form-group">
            <label>Nume Firmă / Brand</label>
            <input
              type="text"
              value={verificationForm.companyName}
              className={touched.companyName && fieldErrors.companyName ? 'settings-input-invalid' : ''}
              onChange={(e) => {
                setVerificationForm({ ...verificationForm, companyName: e.target.value });
                if (submitError) setSubmitError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, companyName: true }))}
              disabled={organizerStatus === 'pending' || organizerStatus === 'verified'}
              minLength={2}
              maxLength={120}
              required
            />
            {touched.companyName && fieldErrors.companyName ? <p className="settings-field-error">{fieldErrors.companyName}</p> : null}
          </div>

          <div className="form-group">
            <label>CUI / CIF</label>
            <input
              type="text"
              placeholder="ex: RO12345678"
              value={verificationForm.companyCui}
              className={touched.companyCui && fieldErrors.companyCui ? 'settings-input-invalid' : ''}
              onChange={(e) => {
                setVerificationForm({ ...verificationForm, companyCui: e.target.value });
                if (submitError) setSubmitError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, companyCui: true }))}
              disabled={organizerStatus === 'pending' || organizerStatus === 'verified'}
              pattern="^(RO)?[0-9]{2,12}$"
              required
            />
            {touched.companyCui && fieldErrors.companyCui ? <p className="settings-field-error">{fieldErrors.companyCui}</p> : null}
          </div>

          <div className="form-group">
            <label>Adresă Sediu Social</label>
            <input
              type="text"
              placeholder="Oraș, Strada, Număr"
              value={verificationForm.registeredAddress}
              className={touched.registeredAddress && fieldErrors.registeredAddress ? 'settings-input-invalid' : ''}
              onChange={(e) => {
                setVerificationForm({ ...verificationForm, registeredAddress: e.target.value });
                if (submitError) setSubmitError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, registeredAddress: true }))}
              disabled={organizerStatus === 'pending' || organizerStatus === 'verified'}
              minLength={6}
              required
            />
            {touched.registeredAddress && fieldErrors.registeredAddress ? <p className="settings-field-error">{fieldErrors.registeredAddress}</p> : null}
          </div>

          <div className="form-group">
            <label>Telefon Oficial</label>
            <input
              type="tel"
              placeholder="07xx xxx xxx"
              value={verificationForm.officialPhone}
              className={touched.officialPhone && fieldErrors.officialPhone ? 'settings-input-invalid' : ''}
              onChange={(e) => {
                setVerificationForm({ ...verificationForm, officialPhone: e.target.value });
                if (submitError) setSubmitError('');
              }}
              onBlur={() => setTouched((prev) => ({ ...prev, officialPhone: true }))}
              disabled={organizerStatus === 'pending' || organizerStatus === 'verified'}
              pattern="[0-9+()\-\s]{7,20}"
              required
            />
            {touched.officialPhone && fieldErrors.officialPhone ? <p className="settings-field-error">{fieldErrors.officialPhone}</p> : null}
          </div>

          {submitError && (
            <div className="error-msg">
              <FiAlertCircle style={{ marginRight: '8px' }} /> {submitError}
            </div>
          )}

          {submitMessage && (
            <div className="success-msg">
              <FiCheckCircle style={{ marginRight: '8px' }} /> {submitMessage}
            </div>
          )}

          {organizerStatus !== 'verified' && organizerStatus !== 'pending' && (
            <button type="submit" className="submit-button" disabled={isSubmitting}>
              {isSubmitting ? 'Se trimite...' : 'Trimite spre verificare'}
            </button>
          )}

          {organizerStatus === 'pending' && (
            <p style={{ marginTop: '20px', color: '#64748b', fontSize: '13px', textAlign: 'center' }}>
              Datele tale sunt în curs de verificare de către un administrator.
            </p>
          )}
        </form>
      </div>
    </OrganizerShell>
  );
};

export default OrganizerSettingsPage;