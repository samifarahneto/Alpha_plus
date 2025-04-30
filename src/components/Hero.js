import React from "react";

const Hero = ({
  backgroundImage,
  title,
  subtitle,
  height = "h-[300px] md:h-[400px]",
  overlay = "bg-black/50",
  titleSize = "text-[40px] md:text-[60px] lg:text-[80px]",
  subtitleSize = "text-lg md:text-xl lg:text-2xl",
}) => {
  return (
    <div
      className={`w-screen ${height} flex flex-col justify-center items-center bg-cover bg-center bg-no-repeat`}
      style={{
        backgroundImage: `url(${backgroundImage})`,
        width: "100vw",
        position: "absolute",
        left: 0,
        right: 0,
        height: "300px",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        paddingTop: "0",
      }}
    >
      {/* Overlay para melhorar legibilidade do texto */}
      <div className={`absolute inset-0 ${overlay}`}></div>

      {/* Conteúdo */}
      <div className="relative z-10 text-center px-4 w-full max-w-[90%] md:max-w-[80%] lg:max-w-[1200px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-3xl md:text-6xl lg:text-7xl font-bold text-white text-center whitespace-nowrap px-4">
            {title}
          </h1>
        </div>
        {subtitle && <p className={`${subtitleSize} text-white`}>{subtitle}</p>}
      </div>
    </div>
  );
};

export default Hero;
