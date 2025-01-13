import React from 'react';

const Modal = ({ isOpen, onClose, onConfirm, suspectName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-11/12 max-w-md">
                <h2 className="text-2xl text-black font-bold mb-4">Confirmer votre vote</h2>
                <p className="text-gray-700 mb-6">
                    Êtes-vous sûr de vouloir voter pour <span className="font-bold">{suspectName}</span> ?
                </p>
                <div className="flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
