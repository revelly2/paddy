import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, Search, Filter, RefreshCw, Calendar,
  MapPin, CheckCircle2, AlertCircle, Trash2, Edit3, ArrowLeft,
  Eye, EyeOff, Sparkles, BookOpen, Clock, Tag, ExternalLink,
  ChevronRight, LayoutGrid, List
} from 'lucide-react'
import { type Session } from '../lib/supabase'
import {
  listAdminContent, createAdminContent, updateAdminContent, deleteAdminContent,
  type ContentItem
} from '../lib/api'

interface ContentManagementPageProps {
  session: Session
  isAdmin: boolean
}

const CATEGORIES = [
  'All',
  'Harvest Scheduling',
  'Agronomy',
  'Post-Harvest',
  'Pest Management',
  'General Advisory'
]

export default function ContentManagementPage({ session, isAdmin }: ContentManagementPageProps) {
  const navigate = useNavigate()
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [statusFilter, setStatusFilter] = useState<'All' | 'Published' | 'Draft'>('All')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [error, setError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<ContentItem | null>(null)

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    category: 'Harvest Scheduling',
    summary: '',
    content: '',
    author: 'Provincial Agricultural Office - Abra',
    status: 'Published' as 'Published' | 'Draft',
    priority: 'Normal' as 'High' | 'Normal' | 'Low',
    target_municipality: 'Abra Province (General)',
    image_url: ''
  })
  const [submittingCreate, setSubmittingCreate] = useState(false)

  // Edit Modal
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    category: 'Harvest Scheduling',
    summary: '',
    content: '',
    author: '',
    status: 'Published' as 'Published' | 'Draft',
    priority: 'Normal' as 'High' | 'Normal' | 'Low',
    target_municipality: '',
    image_url: ''
  })
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Delete Dialog
  const [itemToDelete, setItemToDelete] = useState<ContentItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadContent = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await listAdminContent()
      setItems(data)
    } catch (err: any) {
      console.error('Failed to load content:', err)
      setError(err.message || 'Failed to load advisories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContent()
  }, [])

  useEffect(() => {
    if (actionSuccess) {
      const timer = setTimeout(() => setActionSuccess(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [actionSuccess])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory
      const matchesStatus = statusFilter === 'All' || item.status === statusFilter
      const q = search.toLowerCase().trim()
      const matchesSearch = !q ||
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.content.toLowerCase().includes(q) ||
        (item.target_municipality && item.target_municipality.toLowerCase().includes(q))
      return matchesCategory && matchesStatus && matchesSearch
    })
  }, [items, selectedCategory, statusFilter, search])

  const stats = useMemo(() => {
    const total = items.length
    const published = items.filter(i => i.status === 'Published').length
    const drafts = total - published
    const highPriority = items.filter(i => i.priority === 'High').length
    return { total, published, drafts, highPriority }
  }, [items])

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.title.trim() || !createForm.summary.trim() || !createForm.content.trim()) {
      setError('Title, summary, and advisory content are required.')
      return
    }
    setSubmittingCreate(true)
    try {
      await createAdminContent(createForm)
      setIsCreateOpen(false)
      setCreateForm({
        title: '',
        category: 'Harvest Scheduling',
        summary: '',
        content: '',
        author: 'Provincial Agricultural Office - Abra',
        status: 'Published',
        priority: 'Normal',
        target_municipality: 'Abra Province (General)',
        image_url: ''
      })
      setActionSuccess('Agricultural advisory created and broadcasted.')
      await loadContent()
    } catch (err: any) {
      setError(err.message || 'Could not save advisory.')
    } finally {
      setSubmittingCreate(false)
    }
  }

  const handleEditOpen = (item: ContentItem) => {
    setEditingItem(item)
    setEditForm({
      title: item.title,
      category: item.category,
      summary: item.summary,
      content: item.content,
      author: item.author,
      status: item.status,
      priority: item.priority,
      target_municipality: item.target_municipality || '',
      image_url: item.image_url || ''
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    setSubmittingEdit(true)
    try {
      await updateAdminContent(editingItem.id, editForm)
      setEditingItem(null)
      setActionSuccess(`Updated advisory "${editForm.title}".`)
      await loadContent()
    } catch (err: any) {
      setError(err.message || 'Could not update advisory.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleToggleStatus = async (item: ContentItem) => {
    const nextStatus = item.status === 'Published' ? 'Draft' : 'Published'
    try {
      await updateAdminContent(item.id, { status: nextStatus })
      setActionSuccess(`Advisory "${item.title}" is now ${nextStatus}.`)
      await loadContent()
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.')
    }
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      await deleteAdminContent(itemToDelete.id)
      setActionSuccess(`Advisory "${itemToDelete.title}" deleted.`)
      setItemToDelete(null)
      await loadContent()
    } catch (err: any) {
      setError(err.message || 'Failed to delete advisory.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="management-page">
      {/* Header bar */}
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
              <span className="crumb-active">Advisories & Content</span>
            </div>
            <h1 className="management-page__title">Agricultural Content & Advisories</h1>
            <p className="management-page__desc">
              Publish phenology advisories, harvest schedules, post-harvest drying protocols, and regional announcements to Abra farmers.
            </p>
          </div>
        </div>

        <div className="management-page__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={loadContent}
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
            <Plus size={16} />
            <span>New Advisory</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Summary KPI Strip */}
      <div className="mgmt-stats-grid">
        <div className="mgmt-stat-card">
          <span className="mgmt-stat-label">Total Advisories</span>
          <div className="mgmt-stat-val-row">
            <span className="mgmt-stat-val">{stats.total}</span>
            <span className="mgmt-stat-icon-wrap icon-blue"><BookOpen size={18} /></span>
          </div>
          <span className="mgmt-stat-sub">Research & advisory database</span>
        </div>

        <div className="mgmt-stat-card">
          <span className="mgmt-stat-label">Live Broadcasts</span>
          <div className="mgmt-stat-val-row">
            <span className="mgmt-stat-val text-emerald">{stats.published}</span>
            <span className="mgmt-stat-icon-wrap icon-green"><Eye size={18} /></span>
          </div>
          <span className="mgmt-stat-sub">Visible to all Abra farmers</span>
        </div>

        <div className="mgmt-stat-card">
          <span className="mgmt-stat-label">Draft Notices</span>
          <div className="mgmt-stat-val-row">
            <span className="mgmt-stat-val">{stats.drafts}</span>
            <span className="mgmt-stat-icon-wrap icon-slate"><EyeOff size={18} /></span>
          </div>
          <span className="mgmt-stat-sub">Pending administrative review</span>
        </div>

        <div className="mgmt-stat-card">
          <span className="mgmt-stat-label">Urgent / High Priority</span>
          <div className="mgmt-stat-val-row">
            <span className="mgmt-stat-val text-amber">{stats.highPriority}</span>
            <span className="mgmt-stat-icon-wrap icon-amber"><Sparkles size={18} /></span>
          </div>
          <span className="mgmt-stat-sub">Time-sensitive weather/harvest alerts</span>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="mgmt-filter-bar">
        <div className="search-box">
          <Search size={16} className="search-box__icon" />
          <input
            type="text"
            placeholder="Search advisory title, summary, or municipality…"
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

        <div className="filter-controls-right">
          <div className="filter-chip-group">
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'All' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('All')}
            >
              All Status
            </button>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'Published' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('Published')}
            >
              Published ({stats.published})
            </button>
            <button
              type="button"
              className={`filter-chip ${statusFilter === 'Draft' ? 'filter-chip--active' : ''}`}
              onClick={() => setStatusFilter('Draft')}
            >
              Drafts ({stats.drafts})
            </button>
          </div>

          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Card Grid View"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="category-tabs-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`category-tab ${selectedCategory === cat ? 'category-tab--active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Content Display: Grid or Table */}
      {loading ? (
        <div className="mgmt-table-card">
          <div className="mgmt-loading-state">
            <RefreshCw size={28} className="spin text-emerald" />
            <p>Loading advisories and agricultural notices…</p>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="mgmt-table-card">
          <div className="mgmt-empty-state">
            <FileText size={40} className="muted" />
            <h3>No advisories found</h3>
            <p>No content matches your active filters or search terms.</p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => {
                setSearch('')
                setSelectedCategory('All')
                setStatusFilter('All')
              }}
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="advisory-grid">
          {filteredItems.map((item) => {
            const isPublished = item.status === 'Published'
            const isHigh = item.priority === 'High'

            return (
              <div key={item.id} className="advisory-card">
                {item.image_url ? (
                  <div className="advisory-card__image-wrap">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="advisory-card__image"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.style.background = 'linear-gradient(135deg, #064e3b 0%, #047857 100%)';
                        }
                      }}
                    />
                    <div className="advisory-card__badges-overlay">
                      <span className={`advisory-status-badge ${isPublished ? 'published' : 'draft'}`}>
                        {isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{item.status}</span>
                      </span>
                      {isHigh && (
                        <span className="advisory-priority-badge high">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="advisory-card__no-image">
                    <div className="advisory-card__badges-overlay top-left">
                      <span className={`advisory-status-badge ${isPublished ? 'published' : 'draft'}`}>
                        {isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                        <span>{item.status}</span>
                      </span>
                      {isHigh && (
                        <span className="advisory-priority-badge high">
                          Urgent
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="advisory-card__body">
                  <div className="advisory-card__category-strip">
                    <span className="advisory-card__category">
                      <Tag size={11} className="inline-icon" />
                      {item.category}
                    </span>
                    {item.target_municipality && (
                      <span className="advisory-card__municipality">
                        <MapPin size={11} className="inline-icon" />
                        {item.target_municipality}
                      </span>
                    )}
                  </div>

                  <h3 className="advisory-card__title" onClick={() => setPreviewItem(item)}>
                    {item.title}
                  </h3>

                  <p className="advisory-card__summary">
                    {item.summary}
                  </p>

                  <div className="advisory-card__meta">
                    <span className="advisory-card__author">{item.author}</span>
                    <span className="advisory-card__date">
                      <Clock size={11} className="inline-icon" />
                      {new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="advisory-card__footer">
                  <button
                    type="button"
                    className="advisory-footer-btn"
                    onClick={() => setPreviewItem(item)}
                    title="Read Full Advisory"
                  >
                    Read
                  </button>
                  <button
                    type="button"
                    className={`advisory-footer-btn ${isPublished ? 'text-amber' : 'text-emerald'}`}
                    onClick={() => handleToggleStatus(item)}
                    title={isPublished ? 'Unpublish to Draft' : 'Publish to Farmers'}
                  >
                    {isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                  <button
                    type="button"
                    className="advisory-footer-btn"
                    onClick={() => handleEditOpen(item)}
                    title="Edit Advisory"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    className="advisory-footer-btn text-danger"
                    onClick={() => setItemToDelete(item)}
                    title="Delete Advisory"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <div className="mgmt-table-card">
          <div className="mgmt-table-wrap">
            <table className="mgmt-table">
              <thead>
                <tr>
                  <th>Advisory Title</th>
                  <th>Category</th>
                  <th>Target Region</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Published Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className="table-advisory-title-cell" onClick={() => setPreviewItem(item)}>
                        <strong>{item.title}</strong>
                        <span className="table-advisory-summary">{item.summary}</span>
                      </div>
                    </td>
                    <td>
                      <span className="category-pill">{item.category}</span>
                    </td>
                    <td>
                      <span className="location-cell">
                        <MapPin size={12} className="text-slate-muted" />
                        {item.target_municipality || 'Abra Province'}
                      </span>
                    </td>
                    <td>
                      <span className={`advisory-status-badge ${item.status === 'Published' ? 'published' : 'draft'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-pill ${item.priority.toLowerCase()}`}>
                        {item.priority}
                      </span>
                    </td>
                    <td>
                      <span className="date-cell">
                        {new Date(item.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="row-action-btn"
                          title="Preview"
                          onClick={() => setPreviewItem(item)}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className="row-action-btn"
                          title="Edit"
                          onClick={() => handleEditOpen(item)}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          type="button"
                          className="row-action-btn row-action-btn--danger"
                          title="Delete"
                          onClick={() => setItemToDelete(item)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PREVIEW MODAL */}
      {previewItem && (
        <div className="mgmt-modal-overlay" onClick={() => setPreviewItem(null)}>
          <div className="mgmt-modal mgmt-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal__header">
              <div className="preview-header-meta">
                <span className="category-pill">{previewItem.category}</span>
                <span className={`advisory-status-badge ${previewItem.status === 'Published' ? 'published' : 'draft'}`}>
                  {previewItem.status}
                </span>
                {previewItem.priority === 'High' && (
                  <span className="advisory-priority-badge high">Urgent</span>
                )}
              </div>
              <button
                type="button"
                className="mgmt-modal__close"
                onClick={() => setPreviewItem(null)}
              >
                ×
              </button>
            </div>

            <div className="preview-modal-body">
              <h2 className="preview-modal-title">{previewItem.title}</h2>
              <div className="preview-modal-strip">
                <span>By {previewItem.author}</span>
                <span>•</span>
                <span>{previewItem.target_municipality || 'Abra Province'}</span>
                <span>•</span>
                <span>{new Date(previewItem.created_at).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>

              {previewItem.image_url && (
                <div className="preview-modal-image-wrap">
                  <img src={previewItem.image_url} alt="Cover preview" className="preview-modal-image" />
                </div>
              )}

              <div className="preview-modal-summary-box">
                <strong>Executive Summary:</strong> {previewItem.summary}
              </div>

              <div className="preview-modal-content-prose">
                <p style={{ whiteSpace: 'pre-line' }}>{previewItem.content}</p>
              </div>
            </div>

            <div className="mgmt-modal__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setPreviewItem(null)}
              >
                Close Preview
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  const it = previewItem
                  setPreviewItem(null)
                  handleEditOpen(it)
                }}
              >
                <Edit3 size={15} />
                <span>Edit Advisory</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {isCreateOpen && (
        <div className="mgmt-modal-overlay" onClick={() => setIsCreateOpen(false)}>
          <div className="mgmt-modal mgmt-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal__header">
              <div>
                <h3 className="mgmt-modal__title">Create Agricultural Advisory</h3>
                <p className="mgmt-modal__subtitle">
                  Compose research advisories and operational harvest bulletins for Abra rice farmers.
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
                <div className="form-group form-col-full">
                  <label className="form-label">Advisory Headline / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Wet Season Peak Harvest Timing & Panicle Ripeness Notice"
                    value={createForm.title}
                    onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value })}
                    className="form-select"
                  >
                    <option value="Harvest Scheduling">Harvest Scheduling</option>
                    <option value="Agronomy">Agronomy & Variety Calibration</option>
                    <option value="Post-Harvest">Post-Harvest & Sun-Drying</option>
                    <option value="Pest Management">Pest & Disease Advisory</option>
                    <option value="General Advisory">General Advisory</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Publish Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value as any })}
                    className="form-select"
                  >
                    <option value="Published">Published (Immediate broadcast to farmers)</option>
                    <option value="Draft">Draft (Save for review)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select
                    value={createForm.priority}
                    onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                    className="form-select"
                  >
                    <option value="Normal">Normal Priority</option>
                    <option value="High">High / Urgent Notice</option>
                    <option value="Low">Low / General Archive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Municipality / Scope</label>
                  <input
                    type="text"
                    placeholder="e.g. Abra Province (General), Bangued, Bucay"
                    value={createForm.target_municipality}
                    onChange={(e) => setCreateForm({ ...createForm, target_municipality: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group form-col-full">
                  <label className="form-label">Issuing Authority / Author</label>
                  <input
                    type="text"
                    placeholder="e.g. Abra Provincial Agricultural Extension & Research Office"
                    value={createForm.author}
                    onChange={(e) => setCreateForm({ ...createForm, author: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group form-col-full">
                  <label className="form-label">Cover Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... or public image link"
                    value={createForm.image_url}
                    onChange={(e) => setCreateForm({ ...createForm, image_url: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group form-col-full">
                  <label className="form-label">Executive Summary</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="One or two sentences summarizing the key takeaway for farmers."
                    value={createForm.summary}
                    onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group form-col-full">
                  <label className="form-label">Full Advisory Guidance & Protocol</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Detailed recommendations, moisture percentages, field practices, and calendar guidelines…"
                    value={createForm.content}
                    onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })}
                    className="form-textarea"
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
                      <span>Saving Advisory…</span>
                    </>
                  ) : (
                    <span>Save Advisory</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="mgmt-modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="mgmt-modal mgmt-modal--lg" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal__header">
              <div>
                <h3 className="mgmt-modal__title">Edit Advisory</h3>
                <p className="mgmt-modal__subtitle">Modifying bulletin #{editingItem.id}</p>
              </div>
              <button
                type="button"
                className="mgmt-modal__close"
                onClick={() => setEditingItem(null)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="mgmt-modal__form">
              <div className="form-grid">
                <div className="form-group form-col-full">
                  <label className="form-label">Advisory Headline / Title</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="form-select"
                  >
                    <option value="Harvest Scheduling">Harvest Scheduling</option>
                    <option value="Agronomy">Agronomy & Variety Calibration</option>
                    <option value="Post-Harvest">Post-Harvest & Sun-Drying</option>
                    <option value="Pest Management">Pest & Disease Advisory</option>
                    <option value="General Advisory">General Advisory</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Publish Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="form-select"
                  >
                    <option value="Published">Published (Live)</option>
                    <option value="Draft">Draft (Hidden)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                    className="form-select"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High / Urgent</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Target Municipality</label>
                  <input
                    type="text"
                    value={editForm.target_municipality}
                    onChange={(e) => setEditForm({ ...editForm, target_municipality: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group form-col-full">
                  <label className="form-label">Cover Image URL</label>
                  <input
                    type="url"
                    value={editForm.image_url}
                    onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group form-col-full">
                  <label className="form-label">Summary</label>
                  <textarea
                    rows={2}
                    required
                    value={editForm.summary}
                    onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                    className="form-textarea"
                  />
                </div>

                <div className="form-group form-col-full">
                  <label className="form-label">Full Content</label>
                  <textarea
                    rows={5}
                    required
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    className="form-textarea"
                  />
                </div>
              </div>

              <div className="mgmt-modal__footer">
                <button
                  type="button"
                  className="btn btn--secondary"
                  onClick={() => setEditingItem(null)}
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

      {/* DELETE MODAL */}
      {itemToDelete && (
        <div className="mgmt-modal-overlay" onClick={() => setItemToDelete(null)}>
          <div className="mgmt-modal mgmt-modal--sm" onClick={(e) => e.stopPropagation()}>
            <div className="mgmt-modal__header">
              <div className="modal-danger-icon">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="mgmt-modal__title">Delete Advisory</h3>
                <p className="mgmt-modal__subtitle">
                  Are you sure you want to permanently remove "{itemToDelete.title}"?
                </p>
              </div>
            </div>

            <div className="modal-danger-body">
              <p>
                This bulletin will be removed from the public farmer advisory feed and archived.
              </p>
            </div>

            <div className="mgmt-modal__footer">
              <button
                type="button"
                className="btn btn--secondary"
                onClick={() => setItemToDelete(null)}
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
                  <span>Yes, Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
