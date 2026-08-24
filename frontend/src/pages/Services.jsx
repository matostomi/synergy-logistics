import CompanyNav from '../components/CompanyNav'

const SERVICES = [
  {
    icon: '🚚',
    image: '/service-transportation.jpg',
    title: 'Transportation Service',
    desc: 'Choosing the right and cost effective mode of transportation in consultation with our customers. Placing of vehicles or trucks either for local and cross border in consultation with our customers both for import and export cargo. Do required follow-up and avail necessary documents as evidence of carriage for receiving and delivery of cargos in different modes of transportations, if any. Reporting of unusual incidents to the customer on time for prompt and timely action. Do other related activities when requested by the customer. Settle service fees and collect the service charge accordingly.',
  },
  {
    icon: '📋',
    image: '/service-customs.jpg',
    title: 'Local Customs Clearance Service',
    desc: 'Receive and verify completeness of documents to be used for customs clearance. File and lodge customs declaration on behalf of our customers fulfilling the customs rules and regulations. Support in inspection of documents and cargo by customs commission. Pay duty and tax representing our customs. Receive final declaration from customs commission and avail it to our customs. Settle service fees and collect the service charge accordingly.',
  },
  {
    icon: '💡',
    image: '/service-consultancy.jpg',
    title: 'Consultancy Service',
    desc: 'Based on our customers need, we provide consultancy service regarding logistics issues, customs and supply related issues thanks to our teams’ expertise in the area.',
  },
  {
    icon: '🤝',
    image: '/service-agency.jpg',
    title: 'Agency Service',
    desc: 'To represent our customers anywhere required; operate customs clearance activities, receiving cargo, loading, unloading, and shipping activities, EIC, bank and other regulatory office based on our customer needs and deals. Settle service fees and collect the service charge accordingly.',
  },
  {
    icon: '🏗️',
    image: '/service-terminal.jpg',
    title: 'Terminal Handling Service',
    desc: 'Facilitate loading and unloading of cargo in airports, dry ports and or ocean ports the likes of Djibouti port Operate with responsible agents in Djibouti for import and export cargo port operations, Assign dedicated person and do the necessary facilitation in local air ports and dry ports. Settle service fees and collect the service charge accordingly.',
  },
  {
    icon: '🌍',
    title: 'Freight Forwarding Service',
    image: '/service-freight.jpg',
    desc: 'As a freight forwarder, we can give you different solutions for your logistical requirements ranging from local to international scope be it import and/or export. We can act as agent for comprehensive services or provide door-to-door service using our networks in the world.',
  },
]

const REACH = [
  {
    icon: '🧑‍🤝‍🧑',
    title: 'Who We Do Serve?',
    desc: 'The service we render doesn’t isolate itself to only few sectors or customer segments. We serve all importing and exporting customers despite their business or organizational requirements. We only aspire to provide efficient and transparent service to our customers be it in service, manufacturing and/or trading sectors.',
  },
  {
    icon: '📦',
    title: 'What Can We Move?',
    desc: 'Be it small or big, move it all is our “we can” organizational culture coupled with our expertise and networks, we can give you solution for your logistical needs. We use; inland, air, train, and ocean means of transportation based on cargo size, cost, speed and safety requirements.',
  },
  {
    icon: '🗺️',
    title: 'Where Do We Operate?',
    desc: 'Be it small or big, move it all is our “we can” organizational culture coupled with our expertise and networks, we can give you solution for your logistical needs. We use; inland, air, train, and ocean means of transportation based on cargo size, cost, speed and safety requirements.',
  },
]

export default function Services() {
  return (
    <>
      <div className="topline">Company</div>
      <h1 className="page-title">Services</h1>

      <CompanyNav />

      <div className="about-hero">
        <div className="about-hero-title">SERVICES</div>
      </div>

      <div className="services-tagline">
        <h2>It's Time to Make Your Dream Come True</h2>
        <div className="accent-underline" />
        <p>The company offers various services to meet the customer's needs, as listed below.</p>
      </div>

      <div className="services-grid" style={{ marginBottom: 40 }}>
        {SERVICES.map((s) => (
          <div key={s.title} className="service-card">
            {s.image && <img src={s.image} alt={s.title} className="service-card-image" />}
            <div className="service-card-icon">{s.icon}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="topline" style={{ marginBottom: 12 }}>Our Reach</div>
      <div className="services-grid">
        {REACH.map((s) => (
          <div key={s.title} className="service-card">
            <div className="service-card-icon">{s.icon}</div>
            <h3>{s.title}</h3>
            <p>{s.desc}</p>
          </div>
        ))}
      </div>
    </>
  )
}
