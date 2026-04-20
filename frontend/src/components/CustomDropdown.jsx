import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FiChevronDown } from 'react-icons/fi';
import '../styles/CustomDropdown.css';

const CustomDropdown = ({
  value,
  options,
  onChange,
  clearable = false,
  onClear,
  triggerClassName = '',
  menuClassName = '',
  optionClassName = '',
  ariaLabel,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = useMemo(
    () => options.find((item) => item.value === value) || options[0],
    [options, value],
  );

  const handleSelect = (nextValue) => {
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`custom-dropdown ${open ? 'is-open' : ''} ${clearable ? 'has-clear' : ''}`.trim()}>
      <button
        type="button"
        className={`custom-dropdown-trigger ${triggerClassName}`.trim()}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span>{selected?.label || ''}</span>
        {!clearable ? <FiChevronDown className="custom-dropdown-chevron" aria-hidden="true" /> : null}
      </button>

      {clearable ? (
        <button
          type="button"
          className="custom-dropdown-clear"
          onClick={(event) => {
            event.stopPropagation();
            onClear?.();
            setOpen(false);
          }}
          aria-label="Resetează filtrul"
        >
          ×
        </button>
      ) : null}

      {open ? (
        <div className={`custom-dropdown-menu ${menuClassName}`.trim()} role="listbox">
          {options.map((item) => {
            const isSelected = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                className={`custom-dropdown-option ${isSelected ? 'is-selected' : ''} ${optionClassName}`.trim()}
                onClick={() => handleSelect(item.value)}
                role="option"
                aria-selected={isSelected}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default CustomDropdown;
