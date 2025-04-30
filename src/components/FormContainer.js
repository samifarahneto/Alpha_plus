import React from "react";

const FormContainer = ({
  title,
  children,
  error,
  footerText,
  footerLinkText,
  onFooterClick,
}) => {
  return (
    <div className="relative -top-[225px] mx-auto bg-white p-8 rounded-lg shadow-md z-10 w-full max-w-md mt-[300px]">
      <h2 className="text-2xl font-semibold text-center mb-8 text-gray-800">
        {title}
      </h2>

      {error && (
        <div className="mb-6 p-3 bg-red-50 rounded-md">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-6">{children}</div>

      {footerText && (
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            {footerText}{" "}
            <span
              onClick={onFooterClick}
              className="text-blue-600 font-medium cursor-pointer hover:text-blue-700"
            >
              {footerLinkText}
            </span>
          </p>
        </div>
      )}
    </div>
  );
};

export default FormContainer;
