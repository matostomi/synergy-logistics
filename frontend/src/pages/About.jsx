import CompanyNav from '../components/CompanyNav'

const CORE_VALUES = [
  ['Honesty', '🤝'],
  ['Integrity', '⚖️'],
  ['Reliability', '🛡️'],
  ['Longevity', '🌳'],
  ['Productivity', '⚡'],
]

export default function About() {
  return (
    <>
      <div className="topline">Company</div>
      <h1 className="page-title">About Synergy Plus</h1>

      <CompanyNav />

      <div className="about-hero">
        <div className="about-hero-title">WHO WE ARE?</div>
      </div>

      <div className="about-intro-grid">
        <div>
          <h2 style={{ marginBottom: 4 }}>Synergy Plus Logistics Service PLC</h2>
          <p style={{ color: 'var(--signal)', fontWeight: 600, marginTop: 0 }}>Moving Forward Together</p>
          <p style={{ color: 'var(--text-dim)', maxWidth: 640, lineHeight: 1.7 }}>
            Established in 2023 by two vibrant and experienced entrepreneurs, Synergy Plus set out
            to serve the vast majority of import and export businesses based in Ethiopia, as well as
            a global network of business entities looking for door-to-door efficient services.
          </p>
        </div>
        <div className="about-logo-frame">
          <img src="/logo.png" alt="Synergy Plus Logistics" />
        </div>
      </div>

      <div className="topline" style={{ marginTop: 32, marginBottom: 12 }}>Our Story</div>
      <p style={{ color: 'var(--text-dim)', maxWidth: 720, lineHeight: 1.8 }}>
        The company was initially established as a customs clearing business, but as the business
        grew and demand increased, we uplifted it into a full freight forwarding company — securing
        a freight forwarding competency certificate from the Ethiopia Maritime Authority (EMA) along
        the way. We're also expanding into new trading portfolios, including express service,
        stationery, and sanitary products for the local market.
      </p>
      <p style={{ color: 'var(--text-dim)', maxWidth: 720, lineHeight: 1.8 }}>
        Today, Synergy Plus provides local customs clearance, inland transportation, Djibouti
        terminal handling, and freight forwarding — including shipping services. Our primary goal
        is to provide secure and convenient logistics services, every step of the way.
      </p>

      <div className="about-mv-grid">
        <div className="about-mv-card">
          <div className="topline" style={{ marginBottom: 8 }}>Mission</div>
          <p>
            To provide a variety of services that meet the needs of our customers, achieving
            long-term customer satisfaction, building lasting business relationships, and
            maintaining sustainable growth and profitability.
          </p>
        </div>
        <div className="about-mv-card">
          <div className="topline" style={{ marginBottom: 8 }}>Vision</div>
          <p>
            To become one of the leading logistics service providers in Ethiopia — offering safe
            and cost-effective logistics services to every customer we serve.
          </p>
        </div>
      </div>

      <div className="topline" style={{ marginTop: 32, marginBottom: 12 }}>Our Core Values</div>
      <div className="about-values-row">
        {CORE_VALUES.map(([label, icon]) => (
          <div key={label} className="about-value-chip">
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="topline" style={{ marginTop: 32, marginBottom: 12 }}>What this system tracks</div>
      <ul style={{ color: 'var(--text-dim)', lineHeight: 1.9, paddingLeft: 20 }}>
        <li>Shipments — operation numbers, bill numbers, containers, customs, and delivery status</li>
        <li>Master Operations — full historical record across Air, Sea, and Road freight</li>
        <li>Customers — company details and factory/fabric pickup locations</li>
        <li>Drivers &amp; vehicles — fleet availability</li>
        <li>Reports — shipment summaries and driver performance</li>
      </ul>
    </>
  )
}
