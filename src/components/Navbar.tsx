import { useState } from "react";
import { apiBaseUrl } from "../config";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF } from "@fortawesome/free-brands-svg-icons";
import { Menu, X } from "lucide-react";

interface NavbarProps {
  setPage: (page: string) => void;
  user: any;
  setUser: (user: any) => void;
}

const Navbar = ({ setPage, user, setUser }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: "Home", page: "Home" },
    { label: "About", page: "About" },
    { label: "Contact Us", page: "Contact" },
    { label: "Shop", page: "Shop" },
    { label: "Check Out", page: "Checkout" },
    ...(user?.isAdmin
      ? [
          { label: "Products", page: "Admin" },
          { label: "Orders", page: "AdminOrders" },
        ]
      : []),
    { label: user ? `Account (${user.name})` : "Account", page: "Account" },
  ];

  const handleNavClick = (page: string) => {
    setPage(page);
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      setPage("Home");
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  return (
    <div className="w-full px-4 py-4">
      {/* Desktop Header */}
      <div className="hidden lg:flex w-full items-center justify-between px-8 py-4">
        <div className="flex items-center gap-4">
          <img
            src="https://howardfarmblob.blob.core.windows.net/websiteimages/logo.png"
            alt="Howard's Farm Logo"
            className="h-28 w-auto object-contain"
          />
          <div className="text-[#4a3a28] text-xl font-serif leading-tight">
            <div>Yankton</div>
            <div>Oregon</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-end flex-1 items-center">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.page)}
              className="text-[#4a3a28] bg-[#f3f5f9] hover:bg-[#e7e4db] px-5 py-2.5 text-base rounded-md font-medium transition whitespace-nowrap"
            >
              {item.label}
            </button>
          ))}
          {user && (
            <button
              onClick={handleLogout}
              className="text-red-500 hover:text-red-700 text-base font-medium transition whitespace-nowrap"
            >
              Logout
            </button>
          )}

          {/* Facebook Icon */}
          <a
            href="https://www.facebook.com/profile.php?id=100095547510732"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full w-10 h-10 flex items-center justify-center border border-[#4a3a28] text-[#4a3a28] hover:bg-[#4a3a28] hover:text-white transition"
          >
            <FontAwesomeIcon icon={faFacebookF} />
          </a>
        </div>
      </div>

      {/* Mobile + Tablet Header */}
      <div className="flex justify-between items-center lg:hidden">
        <div className="flex items-center gap-4 min-w-[250px] max-w-[50%] flex-shrink">
          <img
            src="https://howardfarmblob.blob.core.windows.net/websiteimages/logo.png"
            alt="Howard's Farm Logo"
            className="h-20 w-auto object-contain"
          />
          <div className="text-[#4a3a28] text-xl font-serif leading-tight">
            <div>Yankton</div>
            <div>Oregon</div>
          </div>
        </div>

        {!menuOpen && (
          <button
            onClick={() => setMenuOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-[#f5efe5] rounded-md shadow-md hover:bg-[#e8dcc6] transition"
          >
            <Menu className="w-6 h-6 text-[#4a3a28]" strokeWidth={2} />
          </button>
        )}
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-white text-[#4a3a28] flex flex-col items-center pt-20 space-y-6">
          <button
            onClick={() => setMenuOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-[#f5efe5] rounded-md shadow-md hover:bg-[#e8dcc6] transition"
          >
            <X className="w-6 h-6 text-[#4a3a28]" strokeWidth={2} />
          </button>

          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavClick(item.page)}
              className="w-11/12 max-w-xs py-2 rounded-xl bg-[#a8936a] text-white font-semibold text-lg hover:bg-[#967f55] transition duration-300"
            >
              {item.label}
            </button>
          ))}

          {user && (
            <button
              onClick={() => {
                setUser(null);
                setMenuOpen(false);
              }}
              className="w-11/12 max-w-xs py-2 rounded-xl bg-red-500 text-white font-semibold text-lg hover:bg-red-700 transition duration-300"
            >
              Logout
            </button>
          )}

          {/* Facebook Icon (Mobile) */}
          <a
            href="https://www.facebook.com/profile.php?id=100095547510732"
            target="_blank"
            rel="noopener noreferrer"
            className="w-11/12 max-w-xs py-2 flex items-center justify-center rounded-full border border-[#4a3a28] text-[#4a3a28] hover:bg-[#4a3a28] hover:text-white transition"
          >
            <FontAwesomeIcon icon={faFacebookF} className="text-lg" />
          </a>
        </div>
      )}
    </div>
  );
};

export default Navbar;




















