import { useState } from "react";
import { Link } from "react-router-dom";

const links = [
  { label: "Features", href: "#features" },
  { label: "Twi Voice", href: "#twi-voice" },
  { label: "Safety", href: "#safety" },
  { label: "How it works", href: "#how-it-works" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-surface/80 shadow-sm transition-all duration-300">
      <div className="flex justify-between items-center px-margin-mobile md:px-gutter-md max-w-[1440px] mx-auto h-20">
        <Link to="/" className="font-headline text-headline-md flex gap-1 font-bold text-primary shrink-0">
          <img src="favicon.png" alt="" height={30} width={30} />
          Mama Ba
        </Link>

        <button
          className="md:hidden text-primary p-2 flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle menu"
        >
          <span className="material-symbols-outlined text-3xl">
            {menuOpen ? "close" : "menu"}
          </span>
        </button>

        <div className="hidden md:flex items-center space-x-gutter-md h-full">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors duration-200 h-full flex items-center px-2"
            >
              {link.label}
            </a>
          ))}
        </div>

        <Link
          to="/signin"
          className="hidden md:flex bg-primary text-on-primary font-headline text-button px-6 py-3 rounded-full hover:bg-primary-container transition-all shadow-md active:scale-95 duration-200"
        >
          Sign In
        </Link>
      </div>

      {menuOpen && (
        <div className="md:hidden flex flex-col bg-surface px-margin-mobile pb-6 space-y-4">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="font-body text-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            to="/signin"
            className="bg-primary text-on-primary font-headline text-button px-6 py-3 rounded-full text-center shadow-md active:scale-95 transition-all"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}