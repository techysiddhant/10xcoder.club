// const features = [
//     {
//         icon: (
//             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
//             </svg>
//         ),
//         title: "Real-World Challenges",
//         description: "No tutorials. Build production-grade projects that actually matter.",
//     },
//     {
//         icon: (
//             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <path d="M12 2a8 8 0 0 1 8 8v12l-4-4H4a4 4 0 0 1-4-4V10a8 8 0 0 1 8-8h4z" />
//                 <circle cx="12" cy="10" r="2" />
//             </svg>
//         ),
//         title: "System Thinking",
//         description: "Learn architecture patterns, trade-offs, and engineering principles.",
//     },
//     {
//         icon: (
//             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
//             </svg>
//         ),
//         title: "Production Patterns",
//         description: "Master best practices used by top engineering teams worldwide.",
//     },
//     {
//         icon: (
//             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
//                 <circle cx="12" cy="12" r="10" />
//                 <line x1="2" y1="12" x2="22" y2="12" />
//                 <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
//             </svg>
//         ),
//         title: "Community-Driven",
//         description: "Learn alongside ambitious developers building real things.",
//     },
// ];
import { Target, Layers, Rocket, Users } from "lucide-react";
const features = [
  {
    icon: <Target />,
    title: "Build What Matters",
    description:
      "No more todo apps. Work on projects that push your limits and look great on your portfolio.",
  },
  {
    icon: <Layers />,
    title: "Think in Systems",
    description:
      "Learn how top engineers break down complex problems. Understand architecture, not just syntax.",
  },
  {
    icon: <Rocket />,
    title: "Ship Like a Pro",
    description:
      "Write code that scales. Deploy with confidence. Learn patterns used at companies that matter.",
  },
  {
    icon: <Users />,
    title: "Grow Together",
    description:
      "Connect with builders who care about craft. Get feedback, share wins, and stay accountable.",
  },
];
const Features = () => {
  return (
    <section className="features">
      <div className="features-divider" />

      <div className="container">
        {/* Section header */}
        <div className="features-header">
          <p className="features-label">Why 10xcoder.club?</p>
          <h2 className="features-title">
            Everything you need to accelerate your learning and stay up-to-date
            with the latest technologies.
          </h2>
        </div>

        {/* Feature grid */}
        <div className="features-grid">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`feature-card animate-fade-up delay-${index + 5}`}
            >
              <div className="feature-card-content">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
