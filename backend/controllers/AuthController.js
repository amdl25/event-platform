import { Account } from '../models/relationships.js';

export const register = async (req, res) => {
    console.log("Am primit o cerere de register:", req.body);
  try {
    const { email, password, firstName, lastName, role, interests } = req.body;

    const newUser = await Account.create({
      email,
      password_hash: password,
      first_name: firstName,
      last_name: lastName,
      role: role || 'user'
    });

    if (role === 'user' && interests && interests.length > 0) {
      await newUser.setInterests(interests);
    }

    res.status(201).json({
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.first_name,
      role: newUser.role,
      isNewUser: true,
      isAuthenticated: true
    });
  } catch (error) {
    console.error("Eroare la register:", error);
    res.status(500).json({ message: "Eroare la crearea contului" });
  }
};

export const login = async (req, res) => {
};

export const setInterests = async (req, res) => {
  try {
    const { userId, interests } = req.body;

    const user = await Account.findByPk(userId);
    
    if (!user) {
      return res.status(404).json({ message: "Utilizatorul nu a fost găsit." });
    }

    await user.setInterests(interests);

    res.status(200).json({ message: "Interesele au fost salvate cu succes!" });
  } catch (error) {
    console.error("Eroare la setInterests:", error);
    res.status(500).json({ message: "Eroate internă de server." });
  }
};