import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Music, Palette, GraduationCap, Utensils, Dumbbell,
  Mic2, Heart, Star, Sparkles,
} from 'lucide-react';
import API from '../api';
import '../styles/CategoryBrowser.css';

const CATEGORY_META = {
  'muzica':               { icon: Music,         color: '#fce7f3', iconColor: '#e9528c' },
  'arta & cultura':       { icon: Palette,       color: '#ede9fe', iconColor: '#7c3aed' },
  'spectacole':           { icon: Mic2,          color: '#fdf4ff', iconColor: '#9333ea' },
  'sport':                { icon: Dumbbell,      color: '#dcfce7', iconColor: '#16a34a' },
  'food & drinks':        { icon: Utensils,      color: '#ffedd5', iconColor: '#ea580c' },
  'workshop-uri':         { icon: GraduationCap, color: '#fef9c3', iconColor: '#ca8a04' },
  'comunitate & familie': { icon: Heart,         color: '#fef2f2', iconColor: '#dc2626' },
  'petreceri':            { icon: Sparkles,      color: '#1e1b4b', iconColor: '#a78bfa' },
};

const FALLBACK_COLORS = [
  { color: '#f0fdf4', iconColor: '#15803d' },
  { color: '#fef2f2', iconColor: '#dc2626' },
  { color: '#fffbeb', iconColor: '#b45309' },
  { color: '#f0f9ff', iconColor: '#0369a1' },
  { color: '#fdf4ff', iconColor: '#7e22ce' },
];

const norm = (str) =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[şș]/g, 's')
    .replace(/[ţț]/g, 't');

const getMeta = (categoryName) => {
  const key = norm(categoryName);
  for (const [pattern, meta] of Object.entries(CATEGORY_META)) {
    if (key.includes(pattern) || pattern.includes(key)) return meta;
  }
  return null;
};

const CategoryBrowser = ({ onRecommendClick }) => {
  const [categories, setCategories] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    API.get('/categories')
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, []);

  if (categories.length === 0) return null;

  return (
    <section className="cat-browser">
      <div className="cat-browser-inner">
        <div className="cat-browser-head">
          <div>
            <p className="cat-browser-kicker">EXPLOREAZĂ</p>
            <h2 className="cat-browser-title">Ce ți se potrivește?</h2>
          </div>
          <div className="cat-browser-head-actions">
            {onRecommendClick && (
              <button
                type="button"
                className="home-member-recommend-btn"
                onClick={onRecommendClick}
              >
                <Sparkles size={15} />
                Recomandă-mi
              </button>
            )}
            <button
              type="button"
              className="cat-browser-see-all"
              onClick={() => navigate('/explore')}
            >
              Vezi toate →
            </button>
          </div>
        </div>

        <div className="cat-browser-scroll">
          {categories.map((cat, index) => {
            const meta = getMeta(cat.name);
            const Icon = meta?.icon || Star;
            const bg = meta?.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length].color;
            const iconColor = meta?.iconColor || FALLBACK_COLORS[index % FALLBACK_COLORS.length].iconColor;

            return (
              <button
                key={cat.id}
                type="button"
                className="cat-browser-card"
                onClick={() => navigate(`/category/${encodeURIComponent(cat.name)}`)}
              >
                <span className="cat-browser-icon-wrap" style={{ background: bg }}>
                  <Icon color={iconColor} size={22} />
                </span>
                <span className="cat-browser-label">{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryBrowser;
