import React from 'react';
import Button from "../components/_button";

const Modal = ({ isOpen, onClose, onConfirm, suspectName }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-smbackdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black text-black p-6 rounded-lg shadow-xl w-11/12 max-w-md border border-gray-300">
                <h2 className="text-3xl text-yellow-400 font-Amatic font-bold mb-4 text-center">Confirmer votre vote</h2>
                <p className="text-2xl font-Amatic mb-6 text-center">
                    Voulez-vous vraiment voter pour <span className="font-bold text-highlight text-red-500">{suspectName}</span> ?
                </p>
                <div className="flex justify-center gap-4">
                    <Button
                        onClick={onClose}
                        className="px-6 py-2 bg-secondary text-white rounded-md hover:bg-secondary-dark transition"
                        label="Annuler">
                    </Button>
                    <Button
                        onClick={onConfirm}
                        className="px-6 py-2 bg-highlight text-white rounded-md hover:bg-highlight-dark transition"
                        label="Confirmer">
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Modal;
