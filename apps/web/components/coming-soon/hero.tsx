const Hero = () => {
  return (
    <section className="hero">
      {/* Background effects */}
      <div className="hero-background">
        <div className="hero-grid" />
        <div className="hero-gradient" />
        <div className="hero-glow-orb" />
      </div>

      <div className="hero-content">
        {/* Badge */}
        <div className="animate-fade-up delay-1">
          <span className="badge">
            <svg
              className="badge-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z" />
            </svg>
            {/* Coming Soon */}
            One place for all developers
          </span>
        </div>

        {/* Headline */}
        <h1 className="headline animate-fade-up delay-2">
          <span>Become a</span>
          <br />
          <span className="headline-gradient">10x Coder.</span>
        </h1>

        {/* Subheadline */}
        <p className="subheadline animate-fade-up delay-3">
          A curated collection of high-quality tutorials, courses, and tools to
          help you level up your coding skills.
        </p>

        {/* Launching Soon Button */}
        <div className="animate-fade-up delay-4">
          <span className="btn btn-launching">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            Launching Soon
          </span>
        </div>

        {/* Status indicator */}
        <div className="status-indicator animate-fade-up delay-5">
          <span className="status-dot">
            <span className="status-dot-ping" />
            <span className="status-dot-core" />
          </span>
          <span>Building in public</span>
        </div>
      </div>
    </section>
  );
};

export default Hero;
