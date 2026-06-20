import { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiSave, FiSettings, FiTag, FiTrash2, FiEdit2 } from 'react-icons/fi';
import API from '../api';
import AdminShell from '../components/AdminShell';

const AdminSettingsPage = ({ user, handleLogout }) => {
  const [settings, setSettings] = useState({});
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await API.get('/admin/settings');
        setSettings(response.data?.settings || {});
        setCategories(response.data?.categories || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Eroare la încărcarea setărilor.');
      } finally {
        setLoading(false);
      }
    };

    if (user?.role === 'admin') {
      load();
    }
  }, [user]);

  const handleSettingChange = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await API.patch('/admin/settings', { settings });
    } catch (err) {
      setError(err.response?.data?.message || 'Nu am putut salva setările.');
    } finally {
      setSaving(false);
    }
  };

  const createCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const response = await API.post('/admin/categories', { name: newCategory.trim() });
      setCategories((prev) => [...prev, response.data]);
      setNewCategory('');
    } catch (err) {
      setError(err.response?.data?.message || 'Nu am putut adăuga categoria.');
    }
  };

  const updateCategory = async (categoryId) => {
    if (!editingCategoryName.trim()) return;
    try {
      const response = await API.patch(`/admin/categories/${categoryId}`, { name: editingCategoryName.trim() });
      setCategories((prev) => prev.map((item) => (item.id === categoryId ? response.data : item)));
      setEditingCategoryId('');
      setEditingCategoryName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Nu am putut actualiza categoria.');
    }
  };

  const deleteCategory = async (categoryId) => {
    try {
      await API.delete(`/admin/categories/${categoryId}`);
      setCategories((prev) => prev.filter((item) => item.id !== categoryId));
    } catch (err) {
      setError(err.response?.data?.message || 'Nu am putut șterge categoria.');
    }
  };

  const settingsList = useMemo(() => ([
    { key: 'base_points_per_checkin', label: 'Puncte implicite per check-in', description: 'Câte puncte primește un utilizator la participare' },
    { key: 'points_expiry_months', label: 'Expirare puncte', description: 'Câte luni rămân punctele valabile' },
    { key: 'featured_events_limit', label: 'Număr evenimente recomandate', description: 'Câte evenimente sunt afișate în widget-uri' },
    { key: 'max_pending_days', label: 'Zile maxime pentru cereri în așteptare', description: 'Câte zile poate sta o cerere nesoluționată înainte de a fi considerată urgentă' }
  ]), []);

  if (loading) {
    return null;
  }

  return (
    <AdminShell user={user} handleLogout={handleLogout} title="Setări" subtitle="Configurări platformă (puncte, categorii, etc.)">
      {error ? <div className="admin-card admin-badge-pill danger">{error}</div> : null}

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <h2><FiSettings /> General</h2>
            <p className="admin-card-subtitle">Setările sunt persistate în baza de date</p>
          </div>
          <button type="button" className="admin-primary-button" onClick={saveSettings} disabled={saving}>
            <FiSave /> {saving ? 'Se salvează...' : 'Salvează setările'}
          </button>
        </div>

        <div className="admin-form-grid">
          {settingsList.map((item) => (
            <div key={item.key} className="admin-form-field">
              <label htmlFor={item.key}>{item.label}</label>
              <input id={item.key} value={settings[item.key] || ''} onChange={(event) => handleSettingChange(item.key, event.target.value)} />
              <span className="admin-card-subtitle">{item.description}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="admin-grid-2 admin-section-spacing">
        <div className="admin-card">
          <div className="admin-card-header">
            <div>
              <h2><FiTag /> Categorii</h2>
              <p className="admin-card-subtitle">Adaugă, editează sau șterge categorii</p>
            </div>
          </div>

          <div className="admin-form-actions">
            <div className="admin-search" style={{ width: '100%' }}>
              <FiPlus className="admin-search-icon" />
              <input type="text" value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Categorie nouă..." />
            </div>
            <button type="button" className="admin-primary-button admin-primary-button-small" onClick={createCategory}><FiPlus /> Adaugă</button>
          </div>

          <div className="admin-setting-chip-list admin-section-spacing">
            {categories.map((category) => (
              <div key={category.id} className="admin-setting-chip">
                {editingCategoryId === category.id ? (
                  <>
                    <input
                      value={editingCategoryName}
                      onChange={(event) => setEditingCategoryName(event.target.value)}
                      style={{ border: '0', outline: '0', background: 'transparent', fontSize: '12px', fontWeight: 700, width: '140px' }}
                    />
                    <button type="button" onClick={() => updateCategory(category.id)}><FiSave /></button>
                  </>
                ) : (
                  <>
                    <span>{category.name}</span>
                    <button type="button" onClick={() => { setEditingCategoryId(category.id); setEditingCategoryName(category.name); }}><FiEdit2 /></button>
                    <button type="button" onClick={() => deleteCategory(category.id)}><FiTrash2 /></button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

      </section>
    </AdminShell>
  );
};

export default AdminSettingsPage;
