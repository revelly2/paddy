import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, UserPlus, Search, Shield, Filter, RefreshCw,
  Mail, Calendar, MapPin, ChevronDown, CheckCircle2,
  Trash2, Edit3, ArrowLeft, AlertCircle, Sparkles, Building
} from 'lucide-react'
import { type Session } from '../lib/supabase'
import {
  getAdminUsers, createAdminUser, updateAdminUser, deleteAdminUser,
  type AdminUser
} from '../lib/api'

interface UsersManagementPageProps {
  session: Session
  isAdmin: boolean
}

export default function UsersManagementPage({ session, isAdmin }: UsersManagementPageProps) {
  const navigate = useNavigate()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin'>('all')
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    region: 'Bangued, Abra',
    farm_name: ''
  })
  const [submittingCreate, setSubmittingCreate] = useState(false)

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [editForm, setEditForm] = useState({
    full_name: '',
    role: 'user',
    region: '',
    farm_name: ''
  })
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Delete Dialog State
  const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadUsersList = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getAdminUsers()
      setUsers(data)
    } catch (err: any) {
      console.error('Failed to load users:', err)
      setError(err.message || 'Failed to load user accounts.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsersList()
  }, [])

  // Auto-dismiss toast
  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [actionSuccess])

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesRole = roleFilter === 'all' || u.role.toLowerCase() === roleFilter
      const q = search.toLowerCase().trim()
      const matchesSearch = !q ||
        u.email.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        (u.region && u.region.toLowerCase().includes(q)) ||
        (u.farm_name && u.farm_name.toLowerCase().includes(q))
      return matchesRole && matchesSearch
    })
  }, [users, search, roleFilter])

  const stats = useMemo(() => {
    const total = users.length
    const admins = users.filter(u => u.role.toLowerCase() === 'admin').length
    const farmers = total - admins
    const totalScans = users.reduce((acc, u) => acc + (u.scan_count || 0), 0)
    return { total, admins, farmers, totalScans }
  }, [users])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email || !createForm.password) {
      setError('Email and temporary password are required.')
      return
    }
    setSubmittingCreate(true)
    try {
      await createAdminUser(createForm)
      setIsCreateOpen(false)
      setCreateForm({
        email: '',
        password: '',
        full_name: '',
        role: 'user',
        region: 'Bangued, Abra',
        farm_name: ''
      })
      setActionSuccess(`New ${createForm.role === 'admin' ? 'Administrator' : 'Farmer'} account created successfully.`)
      await loadUsersList()
    } catch (err: any) {
      setError(err.message || 'Could not create account.')
    } finally {
      setSubmittingCreate(false)
    }
  }

  const handleEditOpen = (user: AdminUser) => {
    setEditingUser(user)
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || 'user',
      region: user.region || '',
      farm_name: user.farm_name || ''
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSubmittingEdit(true)
    try {
      await updateAdminUser(editingUser.id, editForm)
      setEditingUser(null)
      setActionSuccess(`Updated details for ${editForm.full_name || editingUser.email}.`)
      await loadUsersList()
    } catch (err: any) {
      setError(err.message || 'Could not update user.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return
    setDeleting(true)
    try {
      await deleteAdminUser(userToDelete.id)
      setActionSuccess(`Account for ${userToDelete.email} was removed.`)
      setUserToDelete(null)
      await loadUsersList()
    } catch (err: any) {
      setError(err.message || 'Failed to remove user account.')
    } finally {
      setDeleting(false)
    }
  }

  const getInitials = (name: string, email: string) => {
    const clean = (name || email).replace(/\(.*?\)/g, '').trim()
    const parts = clean.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return clean.slice(0, 2).toUpperCase() || 'US'
  }

  return (
    <div className="management-page">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="management-page__header">
        <div className="management-page__title-area">
          <button
            type="button"
            className="back-btn"
            onClick={() => navigate('/')}
            title="Return to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="breadcrumb-strip">
              <span>Administration</span>
              <span className="crumb-sep">/</span>
              <span className="crumb-active">User Accounts</span>
            </div>
            <h1 className="management-page__title">Farmer & Admin Management</h1>
            <p className="management-page__desc">
              Manage farmer credentials, field roles, regional municipalities, and review individual scan records.
            </p>
          </div>
        </div>

        <div className="management-page__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={loadUsersList}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => setIsCreateOpen(true)}
          >
            <UserPlus size={16} />
            <span>Add New User</span>
          </button>
        </div>
      </div>

      {/* Alert / Notification banners */}
      {actionSuccess && (
        <div className="alert-banner alert-banner--success" role="status">
          <CheckCircle2 size={18} />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="alert-banner alert-banner--danger" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Quick Summary Pill Row */}
      <div className="mgmt-stats-grid">
        <div className="mgmt-stat-card">
          <span className="mgmt-stat-label">Total Accounts</span>
          <div className="mgmt-stat-val-row">
            <span className="mgmt-stat-val">{stats.total}</span>
            <span className="mgmt-stat-icon-wrap icon-blue"><Users size={18} /></span>
          </div>
          <span className="mgmt-stat-sub">Registered farmers & admins</span>
        </div>

        <div className="mgmt-stat-card">
          <span className="mgmt-stat-label">Abra Farmers</span>
          <div className="mgmt-stat-val-row">
            <span className="mgmt-stat-val">{stats.farmers}</span>
            <span className="mgmt-stat-icon-wrap icon-green"><Sparkles size={18} /></span>
          </div>
          <span className="mgmt-stat-sub">Active field scan contributors</span>
        </div>

        <div className="mgmt-stat-card">
          <span className="mgmt-stat-label">System Admins</span>
          <div className="mgmt-stat-val-row">
            <span className="mgmt-stat-val">{stats.admins}</span>
            <span className="mgmt-stat-icon-wrap icon-purple"><Shield size={18} /></span>
          </div>
          <span className="mgmt-stat-sub">With advisory & user control</span>
        </div>

        <div className="mgmt-stat-card">
          <span className="mgmt-stat-label">Combined Scans</span>
          <div className="mgmt-stat-val-row">
            <span className="mgmt-stat-val">{stats.totalScans}</span>
            <span className="mgmt-stat-icon-wrap icon-amber"><Building size={18} /></span>
          </div>
          <span className="mgmt-stat-sub">Across CAR study region</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mgmt-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-box__icon" />
          <input
            type="text"
            placeholder="Search by name, email, municipality, or farm…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-box__input"
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearch('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="filter-chip-group">
          <button
            type="button"
            className={`filter-chip ${roleFilter === 'all' ? 'filter-chip--active' : ''}`}
            onClick={() => setRoleFilter('all')}
          >
            All Accounts ({users.length})
          </button>
          <button
            type="button"
            className={`filter-chip ${roleFilter === 'user' ? 'filter-chip--active' : ''}`}
            onClick={() => setRoleFilter('user')}
          >
            Farmers ({stats.farmers})
          </button>
          <button
            type="button"
            className={`filter-chip ${roleFilter === 'admin' ? 'filter-chip--active' : ''}`}
            onClick={() => setRoleFilter('admin')}
          >
            Admins ({stats.admins})
          </button>
        </div>
      </div>

      {/* Users Data Table */}
      <div className="mgmt-table-card">
        {loading ? (
          <div className="mgmt-loading-state">
            <RefreshCw size={28} className="spin text-emerald" />
            <p>Loading farmer and administrator directory…</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="mgmt-empty-state">
            <Users size={40} className="muted" />
            <h3>No accounts match your criteria</h3>
            <p>Try searching for a different name, municipality, or reset your filters.</p>
            {search && (
              <button
                type="button"
                className="btn btn--secondary btn--sm"
                onClick={() => setSearch('')}
              >
                Clear Search Filter
              </button>
            )}
          </div>
        ) : (
          <div className="mgmt-table-wrap">
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Role</th>
                  <th>Municipality / Location</th>
                  <th>Scans Submitted</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isAdminRole = user.role.toLowerCase() === 'admin'
                  const isCurrentSessionUser = user.id === session.user.id
                  const initials = getInitials(user.full_name, user.email)

                  return (
                    <tr key={user.id} className={isCurrentSessionUser ? 'row-self' : ''}>
                      <td>
                        <div className="user-profile-cell">
                          <div className={`table-avatar-badge ${isAdminRole ? 'table-avatar-badge--admin' : ''}`}>
                            {initials}
                          </div>
                          <div className="user-profile-meta">
                            <span className="user-profile-name">
                              {user.full_name || 'Farmer Account'}
                              {isCurrentSessionUser && (
                                <span className="current-user-tag">(You)</span>
                              )}
                            </span>
                            <span className="user-profile-email">
                              <Mail size={12} className="inline-icon" />
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className={`role-pill ${isAdminRole ? 'role-pill--admin' : 'role-pill--farmer'}`}>
                          {isAdminRole ? (
                            <>
                              <Shield size={12} />
                              <span>Administrator</span>
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              <span>Farmer</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="location-cell">
                          <MapPin size={13} className="text-slate-muted" />
                          <span>{user.region || 'Abra Province (General)'}</span>
                          {user.farm_name && (
                            <span className="farm-name-tag">{user.farm_name}</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className="scan-count-badge">
                          <strong>{user.scan_count || 0}</strong> scans
                        </span>
                      </td>

                      <td>
                        <span className="date-cell">
                          <Calendar size={12} className="inline-icon" />
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="row-action-btn"
                            title="Edit User Details or Role"
                            onClick={() => handleEditOpen(user)}
                          >
                            <Edit3 size={15} />
                          </button>
                          {!isCurrentSessionUser && (
                            <button
                              type="button"
                              className="row-action-btn row-action-btn--danger"
                              title="Delete Account"
                              onClick={() => setUserToDelete(user)}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE USER MODAL */}
      {isCreateOpen && (
        <div className="mgmt-modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="mgmt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal__header">
              <div>
                <h3 className="mgmt-modal__title">Create New Account</h3>
                <p className="mgmt-modal__subtitle">
                  Provision a new farmer or admin account in the PaddyScan Abra database.
                </p>
              </div>
              <button
                type="button"
                className="mgmt-modal__close"
                onClick={() => setIsCreateOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mgmt-modal__form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan dela Cruz"
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">System Role</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="form-select"
                  >
                    <option value="user">Farmer (Field Classifier & Study Viewer)</option>
                    <option value="admin">Administrator (Full Dashboard & Advisory Control)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="farmer@gmail.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Municipality / Location in Abra</label>
                  <input
                    type="text"
                    placeholder="e.g. Bangued, Tayum, Bucay, Abra"
                    value={createForm.region}
                    onChange={(e) => setCreateForm({ ...createForm, region: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Farm / Association Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Abra River Valley Farmers Coop"
                    value={createForm.farm_name}
                    onChange={(e) => setCreateForm({ ...createForm, farm_name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="mgmt-modal__footer">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setIsCreateOpen(false)}
                  disabled={submittingCreate}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submittingCreate}
                >
                  {submittingCreate ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      <span>Creating Account…</span>
                    </>
                  ) : (
                    <span>Create User</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="mgmt-modal-overlay" onClick={() => setEditingUser(null)}>
          <div className="mgmt-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal__header">
              <div>
                <h3 className="mgmt-modal__title">Edit User Account</h3>
                <p className="mgmt-modal__subtitle">
                  Updating role and profile for {editingUser.email}
                </p>
              </div>
              <button
                type="button"
                className="mgmt-modal__close"
                onClick={() => setEditingUser(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mgmt-modal__form">
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.full_name}
                    onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="form-select"
                  >
                    <option value="user">Farmer</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Municipality / Location</label>
                  <input
                    type="text"
                    value={editForm.region}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Farm / Association Name</label>
                  <input
                    type="text"
                    value={editForm.farm_name}
                    onChange={(e) => setEditForm({ ...editForm, farm_name: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="mgmt-modal__footer">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setEditingUser(null)}
                  disabled={submittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={submittingEdit}
                >
                  {submittingEdit ? (
                    <>
                      <RefreshCw size={15} className="spin" />
                      <span>Saving Changes…</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="mgmt-modal-overlay" onClick={() => setUserToDelete(null)}>
          <div className="mgmt-modal mgmt-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal__header">
              <div className="modal-danger-icon">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="mgmt-modal__title">Delete Account</h3>
                <p className="mgmt-modal__subtitle">
                  Are you sure you want to permanently delete <strong>{userToDelete.email}</strong>?
                </p>
              </div>
            </div>

            <div className="modal-danger-body">
              <p>
                This action is irreversible. All of this user's stored field classification records ({userToDelete.scan_count} scans) and login credentials will be removed.
              </p>
            </div>

            <div className="mgmt-modal__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setUserToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--danger"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <RefreshCw size={15} className="spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Yes, Delete Account</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
