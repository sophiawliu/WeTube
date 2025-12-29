import { useParams, Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { fetchVideoById, fetchComments, VideoDetails, searchVideos } from '../utils/youtube'
import { embedComments, CommentWithEmbedding } from '../utils/embeddings'
import { getMultiLevelClusters, ClusterResult } from '../utils/clustering'
import { generateClusterNames, generateClaims, ClusterName, Claim } from '../utils/llm'
import MeaningDial, { DialLevel } from '../components/MeaningDial'
import FeelsView from '../components/FeelsView'
import FragmentsView from '../components/FragmentsView'
import ClustersView from '../components/ClustersView'
import ClaimsView from '../components/ClaimsView'
import { useFooterDial } from '../App'
import cornerLogo from '../assets/wetube-corner.png'
import searchIcon from '../assets/magglass.png'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || ''

type LoadingStage = 
  | 'fetching-video'
  | 'fetching-comments'
  | 'embedding'
  | 'clustering'
  | 'naming'
  | 'claims'
  | 'done'

const STAGE_MESSAGES: Record<LoadingStage, string> = {
  'fetching-video': 'Loading video info... (greppin\')',
  'fetching-comments': 'Fetching comments... (greppin\')',
  'embedding': '\"Understanding\" comments... (grokkin\')',
  'clustering': 'Finding patterns... (grokkin\')',
  'naming': 'Naming the feelings... (grokkin\')',
  'claims': 'Summarizing... (vibin\')',
  'done': ''
}

function Visualize() {
  const { videoId } = useParams()
  const navigate = useNavigate()
  
  // Video and comments
  const [video, setVideo] = useState<VideoDetails | null>(null)
  const [comments, setComments] = useState<CommentWithEmbedding[]>([])
  
  // Clustering data
  const [fineClusters, setFineClusters] = useState<ClusterResult | null>(null)
  const [coarseClusters, setCoarseClusters] = useState<ClusterResult | null>(null)
  const [clusterNames, setClusterNames] = useState<ClusterName[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  
  // UI state
  const [dialLevel, setDialLevel] = useState<DialLevel>('feels')
  const [loadingStage, setLoadingStage] = useState<LoadingStage>('fetching-video')
  const [error, setError] = useState('')

  // Search state
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<VideoDetails[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Video player state
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Footer dial context
  const footerContext = useFooterDial()
  const isLoading = loadingStage !== 'done'

  // Set dial in footer
  useEffect(() => {
    if (footerContext) {
      footerContext.setFooterDial(
        <MeaningDial 
          level={dialLevel} 
          onChange={setDialLevel}
          disabled={isLoading}
        />
      )
    }
    return () => {
      if (footerContext) {
        footerContext.setFooterDial(null)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialLevel, isLoading])

  // Reset page title on unmount
  useEffect(() => {
    return () => {
      document.title = 'WeTube'
    }
  }, [])

  // Search effect
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const timeoutId = setTimeout(() => {
      setSearchLoading(true)
      searchVideos(query, API_KEY, 3)
        .then((results) => {
          setSearchResults(results)
          setShowDropdown(true)
        })
        .finally(() => setSearchLoading(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleVideoClick = (vid: VideoDetails) => {
    setShowDropdown(false)
    setQuery('')
    navigate(`/visualize/${vid.id}`)
  }

  useEffect(() => {
    if (!videoId) return

    async function loadData() {
      setLoadingStage('fetching-video')
      setError('')

      try {
        // 1. Fetch video details
        const videoData = await fetchVideoById(videoId!, API_KEY)
        if (!videoData) {
          setError('Video not found')
          return
        }
        setVideo(videoData)
        document.title = `${videoData.title} - WeTube`

        // 2. Fetch comments
        setLoadingStage('fetching-comments')
        const maxComments = Math.min(videoData.commentCountRaw, 200)
        const rawComments = await fetchComments(videoId!, API_KEY, maxComments)
        if (rawComments.length === 0) {
          setError('Comments are disabled or not accessible for this video. Try a different song!')
          return
        }

        // 3. Get embeddings
        setLoadingStage('embedding')
        const embeddedComments = await embedComments(rawComments)
        setComments(embeddedComments)

        // 4. Cluster embeddings
        setLoadingStage('clustering')
        
        // Filter to only comments with valid embeddings and track indices
        const validComments = embeddedComments.filter(c => c.embedding.length > 0)
        const embeddings = validComments.map(c => c.embedding)
        
        if (embeddings.length === 0) {
          setError('Failed to process comments')
          return
        }
        
        // Update comments to only valid ones (indices will now match)
        setComments(validComments)

        const { fine, coarse } = getMultiLevelClusters(embeddings)
        setFineClusters(fine)
        setCoarseClusters(coarse)

        // 5. Generate cluster names (for coarse clusters)
        setLoadingStage('naming')
        const clustersForNaming = coarse.clusters.map(c => ({
          id: c.id,
          comments: c.commentIndices.map(i => validComments[i]?.text || '').filter(Boolean)
        }))
        const names = await generateClusterNames(clustersForNaming)
        setClusterNames(names)

        // 6. Generate claims
        setLoadingStage('claims')
        const clustersForClaims = coarse.clusters.map((c) => ({
          id: c.id,
          name: names.find(n => n.clusterId === c.id)?.name || 'unnamed',
          comments: c.commentIndices.map(idx => validComments[idx]?.text || '').filter(Boolean),
          confidence: c.confidence
        }))
        const generatedClaims = await generateClaims(clustersForClaims)
        setClaims(generatedClaims)

        setLoadingStage('done')
        setIsPlaying(true) // Auto-play video when loaded
        
        // Expand the fidelity dial when fully loaded
        if (footerContext) {
          footerContext.setFooterCollapsed(false)
        }
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('Failed to process video. Please try again.')
      }
    }

    loadData()
  }, [videoId])

  if (error) {
    return (
      <div className="visualize-container">
        <nav className="visualize-navbar">
          <Link to="/" className="navbar-logo">
            <img src={cornerLogo} alt="WeTube" />
          </Link>
        </nav>
        <div className="visualize-error">
          <p>{error}</p>
          <Link to="/" className="back-link">← Back to search</Link>
        </div>
      </div>
    )
  }

  // Calculate opacity for layered view
  const getLayerOpacity = (layer: DialLevel): number => {
    const levels: DialLevel[] = ['feels', 'fragments', 'clusters', 'claims']
    const currentIdx = levels.indexOf(dialLevel)
    const layerIdx = levels.indexOf(layer)

    if (layerIdx === currentIdx) return 1
    if (layerIdx < currentIdx) return 0.15 // Background layers are faint
    return 0
  }

  return (
    <div className="visualize-container">
      {/* YouTube-style navbar */}
      <nav className="visualize-navbar">
        <Link to="/" className="navbar-logo">
          <img src={cornerLogo} alt="WeTube" />
        </Link>

        <div className="navbar-search">
          <div className={`search-box ${showDropdown && (searchResults.length > 0 || searchLoading) ? 'has-dropdown' : ''}`}>
            <div className="search-input-wrapper" onClick={() => inputRef.current?.focus()}>
              <img src={searchIcon} alt="" className="search-icon" />
              <div className="search-input-container">
                <input
                  ref={inputRef}
                  type="text"
                  className="search-input"
                  placeholder="Search music videos"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => query && setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
              </div>
            </div>

            {showDropdown && (searchLoading || searchResults.length > 0) && (
              <div className="search-dropdown">
                {searchLoading ? (
                  <div className="search-loading">Searching...</div>
                ) : (
                  searchResults.map((vid) => (
                    <div 
                      key={vid.id} 
                      className="video-result" 
                      onClick={() => handleVideoClick(vid)}
                    >
                      <div className="video-info">
                        <div className="video-title">{vid.title}</div>
                        <div className="video-meta">
                          {vid.channelTitle} • {vid.viewCount}
                        </div>
                      </div>
                      <img 
                        src={vid.thumbnail} 
                        alt={vid.title} 
                        className="video-thumbnail"
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="visualize-content">
        {video && (
          <header className="visualize-header">
            <div className="video-header">
              <div className="video-player-container">
                <div className="video-thumbnail-wrapper" onClick={() => setIsPlaying(true)}>
                  <img src={video.thumbnail} alt={video.title} className="video-header-thumbnail" />
                  {!isPlaying && (
                    <div className="video-play-button">
                      <svg viewBox="0 0 68 48" className="play-icon">
                        <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#212121" fillOpacity="0.8"/>
                        <path d="M 45,24 27,14 27,34" fill="#fff"/>
                      </svg>
                    </div>
                  )}
                  {isPlaying && (
                    <div className="video-playing-indicator">
                      <span className="playing-bar"></span>
                      <span className="playing-bar"></span>
                      <span className="playing-bar"></span>
                    </div>
                  )}
                </div>
              </div>
              <div className="video-header-info">
                <h1 className="video-header-title">{video.title}</h1>
                <p className="video-header-meta">
                  {video.channelTitle} • {video.viewCount} • {comments.length} comments analyzed
                </p>
              </div>
            </div>

            {/* Floating Video Player */}
            {isPlaying && (
              <div className={`floating-video-player ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="floating-video-header">
                  {isCollapsed && <span className="floating-video-title">{video.title}</span>}
                  <div className="floating-video-controls">
                    <button 
                      className="floating-video-btn" 
                      onClick={() => setIsCollapsed(!isCollapsed)}
                      title={isCollapsed ? 'Expand' : 'Collapse'}
                    >
                      {isCollapsed ? '↗' : '↘'}
                    </button>
                    <button 
                      className="floating-video-btn" 
                      onClick={() => setIsPlaying(false)}
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <iframe
                  className={`floating-video-iframe ${isCollapsed ? 'collapsed' : ''}`}
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                  title={video.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            )}
          </header>
        )}

        {isLoading ? (
          <div className="visualize-loading">
            <p className="loading-text-wave">{STAGE_MESSAGES[loadingStage]}</p>
          </div>
        ) : (
          <main className="meaning-layers">
            {/* Layer 1: FEELS */}
            <div 
              className={`meaning-layer feels-layer ${dialLevel === 'feels' ? 'active' : ''}`}
              style={{ opacity: getLayerOpacity('feels') }}
            >
              <FeelsView comments={comments} totalComments={video?.commentCountRaw} />
            </div>

            {/* Layer 2: FRAGMENTS */}
            {fineClusters && (
              <div 
                className={`meaning-layer fragments-layer ${dialLevel === 'fragments' ? 'active' : ''}`}
                style={{ opacity: getLayerOpacity('fragments') }}
              >
                <FragmentsView comments={comments} clusterResult={fineClusters} />
              </div>
            )}

            {/* Layer 3: CLUSTERS */}
            {coarseClusters && (
              <div 
                className={`meaning-layer clusters-layer ${dialLevel === 'clusters' ? 'active' : ''}`}
                style={{ opacity: getLayerOpacity('clusters') }}
              >
                <ClustersView 
                  comments={comments} 
                  clusterResult={coarseClusters} 
                  clusterNames={clusterNames}
                />
              </div>
            )}

            {/* Layer 4: CLAIMS */}
            {coarseClusters && (
              <div 
                className={`meaning-layer claims-layer ${dialLevel === 'claims' ? 'active' : ''}`}
                style={{ opacity: getLayerOpacity('claims') }}
              >
                <ClaimsView 
                  comments={comments}
                  clusterResult={coarseClusters}
                  clusterNames={clusterNames}
                  claims={claims}
                />
              </div>
            )}
          </main>
        )}
      </div>
    </div>
  )
}

export default Visualize
