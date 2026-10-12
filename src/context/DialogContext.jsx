import React, { createContext, useContext, useState, useRef } from 'react';
import './DialogModal.css';

const DialogContext = createContext();

export function useDialog() {
  return useContext(DialogContext);
}

export function DialogProvider({ children }) {
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    message: '',
    type: 'alert', // 'alert' | 'confirm' | 'prompt'
    resolve: null,
  });
  
  const [inputValue, setInputValue] = useState('');

  const showAlert = (message) => {
    return new Promise((resolve) => {
      setDialogState({ isOpen: true, message, type: 'alert', resolve });
    });
  };

  const showConfirm = (message, confirmText = "Yes", cancelText = "No", isDanger = false) => {
    return new Promise((resolve) => {
      setDialogState({ isOpen: true, message, type: 'confirm', confirmText, cancelText, isDanger, resolve });
    });
  };

  const showPrompt = (message) => {
    return new Promise((resolve) => {
      setInputValue('');
      setDialogState({ isOpen: true, message, type: 'prompt', resolve });
    });
  };

  const handleClose = (result) => {
    setDialogState((prev) => {
      if (prev.resolve) {
        prev.resolve(result);
      }
      return { ...prev, isOpen: false };
    });
  };

  const handleSubmitPrompt = () => {
    handleClose(inputValue);
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}

      {dialogState.isOpen && (
        <div className="dialog-overlay">
          <div className="dialog-box">
            <h3 className="dialog-title">
              {dialogState.type === 'alert' && 'Notification'}
              {dialogState.type === 'confirm' && 'Confirmation'}
              {dialogState.type === 'prompt' && 'Input Required'}
            </h3>
            
            <div className="dialog-message">{dialogState.message}</div>
            
            {dialogState.type === 'prompt' && (
              <input 
                type="text" 
                className="dialog-input" 
                value={inputValue} 
                onChange={(e) => setInputValue(e.target.value)} 
                autoFocus 
                onKeyDown={(e) => { if (e.key === 'Enter') handleSubmitPrompt(); }}
              />
            )}
            
            <div className="dialog-actions">
              {dialogState.type === 'alert' && (
                <button className="dialog-btn primary" onClick={() => handleClose(true)}>OK</button>
              )}
              
              {dialogState.type === 'confirm' && (
                <>
                  <button className="dialog-btn secondary" onClick={() => handleClose(false)}>
                    {dialogState.cancelText || 'No'}
                  </button>
                  <button 
                    className={`dialog-btn primary ${dialogState.isDanger ? 'danger' : ''}`} 
                    onClick={() => handleClose(true)}
                  >
                    {dialogState.confirmText || 'Yes'}
                  </button>
                </>
              )}

              {dialogState.type === 'prompt' && (
                <>
                  <button className="dialog-btn secondary" onClick={() => handleClose(null)}>Cancel</button>
                  <button className="dialog-btn primary" onClick={handleSubmitPrompt}>Submit</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
