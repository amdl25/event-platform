import { Category } from '../models/relationships.js';

export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: "Eroare la preluarea categoriilor" });
  }
};