import { Github, Twitter, Linkedin } from "lucide-react";
import ThemeToggle from "./theme-toggle";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="py-12 border-t border-border">
      <div className="container px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-primary text-primary-foreground font-mono font-bold text-xs flex items-center justify-center rounded">
              10x
            </div>
            <span className="text-sm text-muted-foreground">
              © {currentYear} 10xcoder.club
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <a
              href="#resources"
              className="hover:text-foreground transition-colors"
            >
              Resources
            </a>
            <a
              href="#templates"
              className="hover:text-foreground transition-colors"
            >
              Templates
            </a>
            <a
              href="#contribute"
              className="hover:text-foreground transition-colors"
            >
              Contribute
            </a>
          </nav>

          {/* Theme Toggle & Social */}
          <div className="flex items-center gap-6">
            <ThemeToggle />
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/techysiddhant/10xcoder.club"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub — 10xcoder.club"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://x.com/Techysiddhant"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter — Techysiddhant"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/techysiddhant/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn — techysiddhant"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
