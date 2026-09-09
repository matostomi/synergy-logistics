import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useSearchParams, Link } from 'react-router-dom'

export default function GroupedShipmentsView() {
  const [searchParams] = useSearchParams()
  const status = searchParams.get('status') || ''

  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedCompanies, setExpandedCompanies] = useState({})
  const [expandedBills, setExpandedBills] = useState({})

  useEffect(() => {
    setLoading(true)
    const url = status
      ? `/api/dashboard/grouped-shipments/?status=${status}`
      : `/api/dashboard/grouped-shipments/`

    axios.get(url)
      .then(res => setData(res.data))
      .catch(err => console.error('Failed to load grouped shipments:', err))
      .finally(() => setLoading(false))
  }, [status])

  const toggleCompany = (company) => {
    setExpandedCompanies(prev => ({ ...prev, [company]: !prev[company] }))
  }

  const toggleBill = (bill) => {
    setExpandedBills(prev => ({ ...prev, [bill]: !prev[bill] }))
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '14px' }}>
          ← Back to Dashboard
        </Link>
        <h1 style={{ fontSize: '24px', marginTop: '12px', color: '#ffffff' }}>
          Operations & Shipments {status && `(${status.replace('_', ' ').toUpperCase()})`}
        </h1>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8' }}>Loading operations...</p>
      ) : data.length === 0 ? (
        <p style={{ color: '#94a3b8' }}>No shipments found for this view.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.map((comp) => {
            const isCompExpanded = !!expandedCompanies[comp.customer]

            return (
              <div
                key={comp.customer}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  overflow: 'hidden'
                }}
              >
                {/* Level 1: Customer Name */}
                <div
                  onClick={() => toggleCompany(comp.customer)}
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                      {isCompExpanded ? '▼' : '▶'}
                    </span>
                    <strong style={{ fontSize: '16px', color: '#ffffff' }}>
                      {comp.customer}
                    </strong>
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      backgroundColor: '#334155',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      color: '#93c5fd'
                    }}
                  >
                    {comp.total_containers} Container(s) across {comp.bills.length} Bill(s)
                  </span>
                </div>

                {/* Level 2: Bills / Operations */}
                {isCompExpanded && (
                  <div style={{ padding: '0 20px 16px 36px', borderTop: '1px solid #334155' }}>
                    {comp.bills.map((bill) => {
                      const isBillExpanded = !!expandedBills[bill.bill_ref]

                      return (
                        <div
                          key={bill.bill_ref}
                          style={{
                            marginTop: '12px',
                            backgroundColor: '#0f172a',
                            borderRadius: '6px',
                            border: '1px solid #334155'
                          }}
                        >
                          <div
                            onClick={() => toggleBill(bill.bill_ref)}
                            style={{
                              padding: '12px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              cursor: 'pointer',
                              userSelect: 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                                {isBillExpanded ? '▾' : '▸'}
                              </span>
                              <span style={{ color: '#cbd5e1', fontWeight: '600' }}>
                                📄 {bill.bill_ref}
                              </span>
                            </div>
                            <span style={{ fontSize: '12px', color: '#a5b4fc', fontWeight: 'bold' }}>
                              {bill.container_count} container(s)
                            </span>
                          </div>

                          {/* Level 3: Individual Containers */}
                          {isBillExpanded && (
                            <div style={{ padding: '8px 16px 14px 16px', borderTop: '1px solid #1e293b' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                  <tr style={{ color: '#64748b', textAlign: 'left', borderBottom: '1px solid #1e293b' }}>
                                    <th style={{ padding: '6px 0' }}>Container #</th>
                                    <th style={{ padding: '6px 0' }}>Status</th>
                                    <th style={{ padding: '6px 0' }}>Declaration #</th>
                                    <th style={{ padding: '6px 0' }}>Truck / Driver</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {bill.containers.map((c) => (
                                    <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
                                      <td style={{ padding: '8px 0', color: '#38bdf8', fontWeight: '500' }}>
                                        {c.container_number}
                                      </td>
                                      <td style={{ padding: '8px 0', color: '#cbd5e1' }}>{c.status}</td>
                                      <td style={{ padding: '8px 0', color: '#94a3b8' }}>{c.declaration_number}</td>
                                      <td style={{ padding: '8px 0', color: '#94a3b8' }}>{c.plate_number}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
