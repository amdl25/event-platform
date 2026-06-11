import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';
import { Account, Organization } from '../models/relationships.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const createAccessToken = (user) => jwt.sign({
  sub: user.id,
  role: user.role,
  email: user.email
}, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

const buildAuthPayload = (user, organization = null, token = null) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  role: user.role,
  organizationId: organization?.id || null,
  organizationName: organization?.name || null,
  organizerVerificationStatus: organization?.verification_status || null,
  isAuthenticated: true,
  token
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
      return res.status(409).json({ message: 'Exista deja un cont cu acest email.' });
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

    const token = createAccessToken(result.newUser);

    return res.status(201).json({
      ...buildAuthPayload(result.newUser, result.organization, token),
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
    const token = createAccessToken(user);

    return res.status(200).json(buildAuthPayload(user, organizer, token));

  } catch (error) {
    console.error('Eroare la login:', error);
    return res.status(500).json({ message: 'Eroare internă de server' });
  }
};

export const getOrganizerStatus = async (req, res) => {
  try {
    const { accountId } = req.params;
    const effectiveAccountId = req.user?.role === 'admin' && accountId ? accountId : req.user?.id;

    if (!effectiveAccountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    const organization = await Organization.findOne({ where: { owner_id: effectiveAccountId } });
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
    const { company_name, company_cui, registered_address, official_phone } = req.body;
    const accountId = req.user?.id;

    if (!accountId) {
      return res.status(401).json({ message: 'Neautorizat.' });
    }

    if (!company_name?.trim() || !company_cui?.trim() || !registered_address?.trim() || !official_phone?.trim()) {
      return res.status(400).json({ message: 'Completează profilul business: nume firmă, CUI/CIF, adresă și telefon oficial.' });
    }

    const organization = await Organization.findOne({ where: { owner_id: accountId } });
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
    if (req.user?.role !== 'admin') {
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
      verified_at: isApproved ? new Date() : null,
      admin_status: isApproved ? 'active' : 'suspended'
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

export const getPendingOrganizations = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Nu ai permisiunea de a vedea coada de verificări.' });
    }

    const organizations = await Organization.findAll({
      where: { verification_status: { [Op.in]: ['pending', 'verified', 'rejected'] } },
      include: [{ model: Account, as: 'owner', attributes: ['id', 'email', 'first_name', 'last_name'] }],
      order: [['updatedAt', 'ASC']]
    });

    const pendingCount = organizations.filter((org) => org.verification_status === 'pending').length;
    const verifiedCount = organizations.filter((org) => org.verification_status === 'verified').length;
    const rejectedCount = organizations.filter((org) => org.verification_status === 'rejected').length;

    return res.status(200).json({
      requests: organizations.map((org) => ({
        id: org.id,
        companyName: org.name,
        cuiCif: org.business_identifier,
        registeredAddress: org.registered_address,
        officialPhone: org.official_phone,
        verificationStatus: org.verification_status,
        verificationNotes: org.verification_notes,
        requestedAt: org.updatedAt,
        owner: {
          id: org.owner?.id || null,
          email: org.owner?.email || null,
          fullName: org.owner ? `${org.owner.first_name} ${org.owner.last_name}` : null
        }
      })),
      stats: {
        total: organizations.length,
        pendingCount,
        verifiedCount,
        rejectedCount
      }
    });
  } catch (error) {
    console.error('Eroare la obținerea organizațiilor pending:', error);
    return res.status(500).json({ message: 'Eroare la încărcarea cozii de verificare.' });
  }
};

export const verifyOrganizationByAdmin = async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Nu ai permisiunea de a valida organizatori.' });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status invalid. Folosește verified sau rejected.' });
    }

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organizația nu a fost găsită.' });
    }

    await organization.update({
      verification_status: status,
      verification_notes: notes?.trim() || null,
      verified_at: status === 'verified' ? new Date() : null,
      admin_status: status === 'verified' ? 'active' : 'suspended'
    });

    return res.status(200).json({
      message: status === 'verified' ? 'Organizație aprobată.' : 'Organizație respinsă.',
      id: organization.id,
      verificationStatus: organization.verification_status,
      verificationNotes: organization.verification_notes,
      verifiedAt: organization.verified_at
    });
  } catch (error) {
    console.error('Eroare la verificarea organizației de către admin:', error);
    return res.status(500).json({ message: 'Eroare la procesarea verificării.' });
  }
};