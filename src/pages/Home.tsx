import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import logo from '../assets/wetube-logo.png'
import searchIcon from '../assets/magglass.png'
import { searchVideos, VideoDetails } from '../utils/youtube'

const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY || ''

function Home() {
  const [query, setQuery] = useState('')
  const [videos, setVideos] = useState<VideoDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const showDropdown = loading || error || videos.length > 0

  useEffect(() => {
    if (!query.trim()) {
      setVideos([])
      setError('')
      return
    }

    if (!API_KEY) {
      setError('YouTube API key not configured')
      return
    }

    // Debounce search
    const timeoutId = setTimeout(() => {
      setLoading(true)
      setError('')

      searchVideos(query, API_KEY, 3)
        .then((results) => {
          if (results.length > 0) {
            setVideos(results)
          } else {
            setError('No videos found')
            setVideos([])
          }
        })
        .finally(() => setLoading(false))
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query])

  const handleVideoClick = (video: VideoDetails) => {
    navigate(`/visualize/${video.id}`)
  }

  const handleLucky = () => {
    if (videos.length > 0) {
      navigate(`/visualize/${videos[0].id}`)
    }
  }

  return (
    <div className="home-container">
      <div className="home-content">
        <img src={logo} alt="WeTube" className="home-logo" />
        
        <div className="search-container">
          <div className={`search-box${showDropdown ? ' has-dropdown' : ''}`}>
            <div className="search-input-wrapper" onClick={() => inputRef.current?.focus()}>
              <img src={searchIcon} alt="" className="search-icon" />
              <div className="search-input-container">
                {!isFocused && !query && (
                  <div className="search-placeholder">
                    <span className="blinking-cursor"></span>
                    Search music videos
                  </div>
                )}
                <input
                  ref={inputRef}
                  type="text"
                  className="search-input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                />
              </div>
            </div>

            {loading && (
              <div className="search-dropdown">
                <div className="search-loading">Searching...</div>
              </div>
            )}

            {error && !loading && (
              <div className="search-dropdown">
                <div className="search-error">{error}</div>
              </div>
            )}

            {videos.length > 0 && !loading && (
              <div className="search-dropdown">
                {videos.map((video) => (
                  <div 
                    key={video.id} 
                    className="video-result" 
                    onClick={() => handleVideoClick(video)}
                  >
                    <div className="video-info">
                      <div className="video-title">{video.title}</div>
                      <div className="video-meta">
                        {video.channelTitle} • {video.viewCount} • {video.commentCount} • {video.timeAgo}
                      </div>
                    </div>
                    <img 
                      src={video.thumbnail} 
                      alt={video.title} 
                      className="video-thumbnail"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="button-container">
          <button className="lucky-button" onClick={handleLucky}>I'm Feeling Lucky</button>
        </div>
      </div>
    </div>
  )
}

export default Home
