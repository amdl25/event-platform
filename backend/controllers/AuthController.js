import bcrypt from 'bcrypt';
import sequelize from '../config/database.js';
import { Account, Organization } from '../models/relationships.js';

const buildAuthPayload = (user, organization = null) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  role: user.role,
  organizationId: organization?.id || null,
  organizationName: organization?.name || null,
  organizerVerificationStatus: organization?.verification_status || null,
  isAuthenticated: true
});

export const register = async (req, res) => {
  console.log('Am primit o cerere de register:', req.body);
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role = 'user',
      companyName
    } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ message: 'Toate câmpurile obligatorii trebuie completate.' });
    }

    if (!['user', 'organizer'].includes(role)) {
      return res.status(400).json({ message: 'Rol invalid.' });
    }

    if (role === 'organizer' && !companyName?.trim()) {
      return res.status(400).json({ message: 'Pentru organizator este obligatoriu numele firmei/brand-ului.' });
    }

    const existingUser = await Account.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'Există deja un cont cu acest email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await sequelize.transaction(async (transaction) => {
      const newUser = await Account.create({
        email,
        password_hash: hashedPassword,
        first_name: firstName,
        last_name: lastName,
        role
      }, { transaction });

      let organization = null;
      if (role === 'organizer') {
        organization = await Organization.create({
          name: companyName.trim(),
          business_identifier: null,
          registered_address: null,
          official_phone: null,
          owner_id: newUser.id,
          verification_status: 'unverified'
        }, { transaction });
      }

      return { newUser, organization };
    });

    return res.status(201).json({
      ...buildAuthPayload(result.newUser, result.organization),
      isNewUser: true
    });
  } catch (error) {
    console.error('Eroare la register:', error);
    return res.status(500).json({ message: 'Eroare la crearea contului' });
  }
};

export const login = async (req, res) => {
  console.log('Am primit o cerere de login:', req.body);
  
  try {
    const { email, password } = req.body;

    const user = await Account.findOne({
      where: { email },
      include: [{ model: Organization, as: 'ownedOrganizations' }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Email sau parolă incorectă' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Email sau parolă incorectă' });
    }

    const organizer = user.ownedOrganizations?.[0] || null;

    return res.status(200).json(buildAuthPayload(user, organizer));

  } catch (error) {
    console.error('Eroare la login:', error);
    return res.status(500).json({ message: 'Eroare internă de server' });
  }
};

export const getOrganizerStatus = async (req, res) => {
  try {
    const { accountId } = req.params;

    const organization = await Organization.findOne({ where: { owner_id: accountId } });
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită pentru acest cont.' });
    }

    return res.status(200).json({
      organizationId: organization.id,
      organizationName: organization.name,
      cuiCif: organization.business_identifier,
      registeredAddress: organization.registered_address,
      officialPhone: organization.official_phone,
      verificationStatus: organization.verification_status,
      verificationNotes: organization.verification_notes
    });
  } catch (error) {
    console.error('Eroare la status organizator:', error);
    return res.status(500).json({ message: 'Eroare la obținerea statusului organizatorului.' });
  }
};

export const submitOrganizerVerification = async (req, res) => {
  try {
    const { account_id, company_name, company_cui, registered_address, official_phone } = req.body;

    if (!account_id) {
      return res.status(400).json({ message: 'account_id este obligatoriu.' });
    }

    if (!company_name?.trim() || !company_cui?.trim() || !registered_address?.trim() || !official_phone?.trim()) {
      return res.status(400).json({ message: 'Completează profilul business: nume firmă, CUI/CIF, adresă și telefon oficial.' });
    }

    const organization = await Organization.findOne({ where: { owner_id: account_id } });
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    if (organization.verification_status === 'verified') {
      return res.status(400).json({ message: 'Organizația este deja verificată.' });
    }

    await organization.update({
      name: company_name.trim(),
      business_identifier: company_cui.trim(),
      registered_address: registered_address.trim(),
      official_phone: official_phone.trim(),
      verification_status: 'pending',
      verification_notes: null
    });

    return res.status(200).json({
      message: 'Profilul business a fost trimis. Contul tău este acum în așteptare.',
      verificationStatus: organization.verification_status,
      companyName: organization.name,
      cuiCif: organization.business_identifier,
      registeredAddress: organization.registered_address,
      officialPhone: organization.official_phone
    });
  } catch (error) {
    console.error('Eroare la trimiterea verificării organizatorului:', error);
    return res.status(500).json({ message: 'Eroare la trimiterea profilului business.' });
  }
};

export const reviewOrganizerVerification = async (req, res) => {
  try {
    const adminToken = req.headers['x-admin-token'];
    if (!process.env.ADMIN_APPROVAL_TOKEN || adminToken !== process.env.ADMIN_APPROVAL_TOKEN) {
      return res.status(403).json({ message: 'Nu ai permisiunea de a valida organizatori.' });
    }

    const { organizationId } = req.params;
    const { action, notes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action invalid. Folosește approve/reject.' });
    }

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    const isApproved = action === 'approve';
    await organization.update({
      verification_status: isApproved ? 'verified' : 'rejected',
      verification_notes: notes?.trim() || null,
      verified_at: isApproved ? new Date() : null
    });

    return res.status(200).json({
      message: isApproved ? 'Organizația a fost verificată.' : 'Organizația a fost respinsă.',
      verificationStatus: organization.verification_status,
      verificationNotes: organization.verification_notes
    });
  } catch (error) {
    console.error('Eroare la review organizator:', error);
    return res.status(500).json({ message: 'Eroare la validarea organizatorului.' });
  }
};