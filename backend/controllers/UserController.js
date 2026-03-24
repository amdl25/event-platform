import { Account, Category } from '../models/relationships.js';

export const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;
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
    const { userId, interests } = req.body;
    const user = await Account.findByPk(userId);
    if (!user) return res.status(404).json({ message: "Utilizator negăsit" });

    await user.setInterests(interests);
    res.status(200).json({ message: "Interese salvate!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeInterest = async (req, res) => {
    try {
        const { userId, interestId } = req.params;

        const user = await Account.findByPk(userId);
        
        if (!user) {
            return res.status(404).json({ message: "Utilizator negăsit" });
        }

        if (typeof user.removeInterest === 'function') {
            await user.removeInterest(interestId);
        } else {
            await user.removeInterests(interestId);
        }

        res.status(200).json({ message: "Interes eliminat cu succes" });
    } catch (error) {
        console.error("Eroare Backend la ștergere:", error);
        res.status(500).json({ message: "Eroare internă: " + error.message });
    }
};

export const addInterests = async (req, res) => {
    try {
        const { userId } = req.params;
        const { interestIds } = req.body;

        const user = await Account.findByPk(userId);
        if (!user) return res.status(404).json({ message: "User negăsit" });

        await user.addInterests(interestIds);

        res.status(200).json({ message: "Interese adăugate cu succes" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Eroare la adăugarea intereselor" });
    }
};