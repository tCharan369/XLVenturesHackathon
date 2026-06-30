import { NavLink } from 'react-router-dom'
import { useAppStore } from '../store/appStore'

export default function Navbar() {
  const { activeDomain, setActiveDomain } = useAppStore()

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h1 className="navbar-title">Decision Intelligence Platform</h1>
      </div>

      <div className="navbar-links">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`} end>
          Recommend
        </NavLink>
        <NavLink to="/memory" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
          Memory
        </NavLink>
        <NavLink to="/trace" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
          Traces
        </NavLink>
        <NavLink to="/config" className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
          Configuration
        </NavLink>
      </div>

      <div className="navbar-domain">
        <label htmlFor="domain-select" className="domain-label">Domain:</label>
        <select
          id="domain-select"
          value={activeDomain}
          onChange={(e) => setActiveDomain(e.target.value)}
          className="domain-select"
        >
          <option value="customer_success">Customer Success</option>
          <option value="recruitment">Recruitment</option>
        </select>
      </div>
    </nav>
  )
}
