import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    navigate(`/shipments?search=${encodeURIComponent(query.trim())}`)
  }

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Search container, operation #, truck plate, customer, driver…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
    </form>
  )
}
