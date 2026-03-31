import { Account, Category } from '../models/relationships.js';

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.id;
    const requesterRole = req.user?.role;

    if (!requesterId) {
      return res.status(401).json({ message: 'Neautorizat' });
    }

    if (requesterRole !== 'admin' && requesterId !== id) {
      return res.status(403).json({ message: 'Nu ai acces la acest profil.' });
    }

    const user = await Account.findByPk(id, {
      attributes: ['id', 'email', 'first_name', 'last_name', 'role'],
      include: [
        {
          model: Category,
          as: 'interests',
          through: { attributes: [] } 
        }
      ]
    });

    if (!user) return res.status(404).json({ message: "User negăsit" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const setInterests = async (req, res) => {
  try {
    const { interests } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Neautorizat' });
    }

    const user = await Account.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Utilizator negăsit" });

    await user.setInterests(interests);
    res.status(200).json({ message: "Interese salvate!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};