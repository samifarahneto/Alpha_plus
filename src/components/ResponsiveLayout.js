import { useMediaQuery } from "react-responsive";

const ResponsiveLayout = ({ desktop, mobile }) => {
  const isMobile = useMediaQuery({ maxWidth: 767 });

  return isMobile ? mobile : desktop;
};

export default ResponsiveLayout;
