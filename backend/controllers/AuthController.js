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
  console.log("Am primit o cerere de login:", req.body);
  
  try {
    const { email, password } = req.body;

    const user = await Account.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Utilizatorul nu există!" });
    }

    if (user.password_hash !== password) {
      return res.status(401).json({ message: "Parolă incorectă!" });
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      isAuthenticated: true
    });

  } catch (error) {
    console.error("Eroare la login:", error);
    res.status(500).json({ message: "Eroare internă de server" });
  }
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