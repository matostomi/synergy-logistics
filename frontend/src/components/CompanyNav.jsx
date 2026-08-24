import { NavLink } from 'react-router-dom'

export default function CompanyNav() {
  return (
    <nav className="company-nav">
      <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Home</NavLink>
      <NavLink to="/about" className={({ isActive }) => (isActive ? 'active' : '')}>About</NavLink>
      <NavLink to="/services-info" className={({ isActive }) => (isActive ? 'active' : '')}>Services</NavLink>
    </nav>
  )
}
