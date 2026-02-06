import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE = 'http://127.0.0.1:5002';

// Custom modal for adding users/agents/branches/departments
const CustomAddModal = ({ 
  showAddModal, 
  setShowAddModal, 
  addModalType, 
  addModalData, 
  setAddModalData,
  onAddItem,
  onRenameItem
}) => {
    if (!showAddModal) return null;

    const isRename = addModalType === 'rename';
    const getTitle = () => {
      if (isRename) return 'Renombrar Elemento';
      return `Agregar ${addModalType === 'user' ? 'Usuario' : 
                     addModalType === 'agent' ? 'Agente' : 
                     addModalType === 'branch' ? 'Sucursal' : 'Departamento'}`;
    };

    const getIcon = () => {
      if (isRename) return 'fas fa-edit';
      return 'fas fa-plus-circle';
    };

    const getButtonText = () => {
      if (isRename) return 'Renombrar';
      return `Agregar ${addModalType === 'user' ? 'Usuario' : 
                     addModalType === 'agent' ? 'Agente' : 
                     addModalType === 'branch' ? 'Sucursal' : 'Departamento'}`;
    };

    const handleSubmit = () => {
      if (!addModalData.name || addModalData.name.trim() === '') return;
      
      if (isRename) {
        onRenameItem && onRenameItem(addModalData.originalItem, addModalData.name.trim());
      } else {
        onAddItem && onAddItem(addModalType, addModalData.name.trim(), addModalData.type);
      }
      
      setShowAddModal(false);
      setAddModalData({ name: '', type: '', originalItem: null });
    };

    return (
      <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>
              <i className={getIcon()}></i>
              {getTitle()}
            </h3>
            <button className="modal-close" onClick={() => setShowAddModal(false)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="modal-body">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  color: 'var(--text-main)', 
                  fontWeight: '500' 
                }}>
                  {isRename ? 'Nuevo nombre' : 'Nombre'}
                </label>
                <input
                  type="text"
                  value={addModalData.name}
                  onChange={(e) => setAddModalData(prev => ({ ...prev, name: e.target.value }))}
                  className="modal-input"
                  placeholder={isRename ? 'Nuevo nombre...' : `Nombre del ${addModalType}...`}
                  autoFocus
                />
              </div>
              {!isRename && addModalType === 'department' && (
                <div style={{ flex: 1 }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    color: 'var(--text-main)', 
                    fontWeight: '500' 
                  }}>
                    Tipo
                  </label>
                  <select
                    value={addModalData.type}
                    onChange={(e) => setAddModalData(prev => ({ ...prev, type: e.target.value }))}
                    className="modal-input"
                    style={{ width: '100%' }}
                  >
                    <option value="">Seleccionar tipo...</option>
                    <option value="soporte">Soporte Técnico</option>
                    <option value="ventas">Ventas</option>
                    <option value="rrhh">RRHH</option>
                    <option value="contabilidad">Contabilidad</option>
                    <option value="operaciones">Operaciones</option>
                    <option value="legal">Legal</option>
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                style={{ flex: 1 }}
              >
                <i className={getIcon()}></i>
                {getButtonText()}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowAddModal(false);
                  setAddModalData({ name: '', type: '', originalItem: null });
                }}
                style={{ flex: 1 }}
              >
                <i className="fas fa-times"></i>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

export default CustomAddModal;
