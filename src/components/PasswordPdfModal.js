import React from "react";

const PasswordPdfModal = ({ isOpen, fileName, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-5 rounded-lg shadow-lg w-96 text-center">
        <h3 className="mt-0 bg-red-500 text-white p-2 rounded text-center">
          PDF com Senha Detectado
        </h3>
        <div className="my-5 flex flex-col items-center gap-3 w-fit mx-auto">
          <p className="text-base">
            O arquivo <strong>{fileName}</strong> está protegido por senha.
          </p>
          <p className="text-base">
            Por favor, remova a senha do PDF antes de enviá-lo.
          </p>
        </div>
        <div className="flex justify-center mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-blue-500 border-none rounded-full cursor-pointer shadow-sm text-white"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordPdfModal;
