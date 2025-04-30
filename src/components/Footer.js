import React from "react";
import {
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaInstagram,
} from "react-icons/fa";

const Footer = () => {
  return (
    <div
      className="w-screen overflow-hidden"
      style={{
        width: "100vw",
        position: "absolute",
        left: 0,
        right: 0,
      }}
    >
      <footer className="w-screen bg-[#398494] py-4">
        <div className="w-full max-w-[1200px] mx-auto flex flex-col md:flex-row justify-center items-center text-white text-sm font-medium gap-5">
          <b>© 2024 Alpha Translations. Todos os direitos reservados.</b>

          <div className="flex items-center gap-1">
            <FaPhone />
            <span>+1 (407) 385-9794</span>
          </div>

          <div className="flex items-center gap-1">
            <FaEnvelope />
            <span>support@alpha-translations.com</span>
          </div>

          <div className="flex items-center gap-1">
            <FaMapMarkerAlt />
            <span>Orlando, FL, EUA</span>
          </div>

          <div className="flex items-center gap-1">
            <FaInstagram />
            <a
              href="https://www.instagram.com/alphatranslationsusa/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              @alphatranslationsusa
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
