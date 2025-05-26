import React from "react";

const Hero = ({
  backgroundImage,
  title,
  subtitle,
  height = "h-[300px] md:h-[400px]", // Use this prop for height control via Tailwind
  overlay = "bg-black/50",
  titleSize = "text-3xl md:text-6xl lg:text-7xl",
  subtitleSize = "text-lg md:text-xl lg:text-2xl",
}) => {
  // Combine Tailwind classes for layout, height, and background properties
  // Removed position:absolute related styles from inline style
  // Removed conflicting bg-black (overlay handles tint)
  const heroClasses = `relative w-full ${height} flex flex-col justify-center items-center bg-cover bg-center bg-no-repeat overflow-hidden`;

  // Inline styles only for the dynamic background image
  const heroStyles = {
    backgroundImage: backgroundImage ? `url(${backgroundImage})` : "none",
    // Removed position: absolute, width, left, right, fixed height, zIndex
    // Background properties like size, position, repeat are handled by Tailwind classes
  };

  return (
    <div
      className={heroClasses}
      style={heroStyles}
      // Add role and aria-label for accessibility if it's purely decorative
      role="img"
      aria-label={title || "Hero background"}
    >
      {/* Overlay for text readability - positioned absolutely within the relative parent */}
      <div className={`absolute inset-0 ${overlay} z-10`}></div>

      {/* Content Section - positioned relatively on top of the overlay */}
      <div className="relative z-20 text-center px-4 w-full max-w-[90%] md:max-w-[80%] lg:max-w-[1200px]">
        {/* Container to center the title */}
        {/* Removed absolute positioning for title container, let flexbox handle centering */}
        <div className="flex items-center justify-center h-full">
          <h1
            className={`font-bold text-white text-center whitespace-nowrap px-4 ${titleSize}`}
          >
            {title}
          </h1>
        </div>
        {/* Subtitle (optional) */}
        {/* Removed absolute positioning for subtitle, flows naturally */}
        {subtitle && (
          <p className={`text-white ${subtitleSize} mt-2`}>{subtitle}</p>
        )}
      </div>
    </div>
  );
};

export default Hero;
