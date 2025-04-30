import React from "react";

const Card = ({
  children,
  className = "",
  icon: Icon,
  title,
  color = "blue",
  price,
  ...props
}) => {
  const colorClasses = {
    blue: "text-blue-500",
    orange: "text-orange-500",
    green: "text-green-500",
  };

  return (
    <div
      className={`w-full md:w-1/3 bg-gradient-to-b from-white to-gray-50 p-2 md:p-8 rounded-xl text-center shadow-lg border border-gray-200 relative overflow-hidden cursor-pointer transition-transform duration-300 ease-in-out hover:scale-105 hover:shadow-xl ${className}`}
      {...props}
    >
      {price && (
        <div className="absolute top-[15px] -right-[45px] bg-red-500 text-white transform rotate-45 px-12 py-1 text-sm font-bold shadow-md z-[2] w-[160px] text-center">
          {price}
        </div>
      )}

      {Icon && (
        <Icon
          className={`w-[50px] h-[50px] ${colorClasses[color]} mx-auto mb-4`}
        />
      )}

      {title && (
        <h3 className={`text-2xl font-semibold ${colorClasses[color]}`}>
          {title}
        </h3>
      )}

      {children}
    </div>
  );
};

export default Card;
