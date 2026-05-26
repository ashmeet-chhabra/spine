import { useState, useEffect, useRef } from 'react';
import type { Model } from '../types/messages';

interface ModelSelectorProps {
  modelName: string;
  llmProvider: string;
  models: Model[];
  onModelChange: (name: string, provider: string) => void;
  isUsingFallbackModels: boolean;
  modelsFetchError: string | null;
  popupDirection?: 'up' | 'down';
  onClose?: () => void;
}

export default function ModelSelector({
  modelName,
  llmProvider,
  models,
  onModelChange,
  isUsingFallbackModels,
  modelsFetchError,
  popupDirection = 'down',
  onClose
}: ModelSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(popupDirection === 'up');
  const [selectedProviderFilter, setSelectedProviderFilter] = useState('all');
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const uniqueProviders = ['all', ...Array.from(new Set(models.map((m) => m.provider))).sort().filter(p => p !== 'backboard')];

  const filteredModels = models
    .filter((m) => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.provider.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProvider = 
        selectedProviderFilter === 'all' ? true :
        selectedProviderFilter === 'free' ? m.inputCostPer1mTokens === 0 :
        m.provider === selectedProviderFilter;
      return matchesSearch && matchesProvider;
    })
    .slice(0, 100);

  const renderListContent = () => {
    return (
      <>
        <div style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', display: 'flex', gap: '6px' }}>
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: '12px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
          <select
            value={selectedProviderFilter}
            onChange={(e) => setSelectedProviderFilter(e.target.value)}
            style={{
              padding: '4px 6px',
              fontSize: '11px',
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
              maxWidth: '120px'
            }}
          >
            <option value="all">All Providers</option>
            <option value="free">Free Models</option>
            {uniqueProviders.filter(p => p !== 'all' && p !== 'free').map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        {isUsingFallbackModels && (
          <div style={{
            padding: '8px 12px',
            fontSize: '11.5px',
            color: '#fbbf24',
            backgroundColor: 'rgba(234, 179, 8, 0.08)',
            borderBottom: '1px solid var(--border-color)',
            lineHeight: '1.4'
          }}>
            ⚠️ Showing offline presets. Configure a valid Backboard API Key to load models.
            {modelsFetchError && (
              <div style={{ color: '#ef4444', marginTop: '4px', fontSize: '10.5px' }}>
                Details: {modelsFetchError}
              </div>
            )}
          </div>
        )}
        <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
          {filteredModels.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--text-muted)' }}>
              No models found
            </div>
          ) : (
            filteredModels.map((m) => {
              const isSelected = modelName === m.name && llmProvider === m.provider;
              const isBackboardRouter = m.provider === 'backboard';
              if (isBackboardRouter) {
                const ruleName = m.name.replace('backboard-router:', '');
                const isDefault = ruleName === 'backboard-router';
                const displayLabel = isDefault ? 'Default' : ruleName.charAt(0).toUpperCase() + ruleName.slice(1);
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      onModelChange(m.name, m.provider);
                      setIsDropdownOpen(false);
                      setSearchQuery('');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '12px',
                      textAlign: 'left',
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(0, 123, 252, 0.15), rgba(0, 123, 252, 0.05))'
                        : 'linear-gradient(135deg, rgba(0, 123, 252, 0.06), transparent)',
                      border: isSelected
                        ? '1px solid rgba(0, 123, 252, 0.4)'
                        : '1px solid rgba(0, 123, 252, 0.12)',
                      color: isSelected ? 'var(--accent)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'block',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: 0,
                      margin: 0,
                      paddingLeft: isDefault ? '12px' : '28px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: isDefault ? 700 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                        {isDefault ? 'Backboard Router' : displayLabel}
                      </span>
                      {isDefault && (
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: 'bold',
                          background: 'linear-gradient(135deg, rgba(0, 123, 252, 0.2), rgba(0, 123, 252, 0.1))',
                          color: 'var(--accent)',
                          border: '1px solid rgba(0, 123, 252, 0.3)',
                          flexShrink: 0
                        }}>
                          AUTO
                        </span>
                      )}
                    </div>
                    {isDefault && (
                      <div style={{ fontSize: '10px', color: 'var(--accent)', marginTop: '2px', opacity: 0.7 }}>
                        Backboard Router
                      </div>
                    )}
                  </button>
                );
              }
              return (
                <button
                  key={`${m.provider}-${m.name}`}
                  type="button"
                  onClick={() => {
                    onModelChange(m.name, m.provider);
                    setIsDropdownOpen(false);
                    setSearchQuery('');
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '12px',
                    textAlign: 'left',
                    backgroundColor: isSelected ? 'var(--purple-glow)' : 'transparent',
                    border: 'none',
                    color: isSelected ? 'var(--purple-hover)' : 'var(--text-primary)',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    display: 'block',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px' }}>
                      {m.name}
                    </span>
                    {m.inputCostPer1mTokens === 0 ? (
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(52, 211, 153, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(52, 211, 153, 0.3)',
                        flexShrink: 0
                      }}>
                        FREE
                      </span>
                    ) : (m.inputCostPer1mTokens !== undefined && m.inputCostPer1mTokens !== null) ? (
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '9px',
                        fontWeight: 'bold',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: 'var(--text-muted)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        flexShrink: 0
                      }}>
                        ${m.inputCostPer1mTokens.toFixed(2)}/M
                      </span>
                    ) : null}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {m.provider.toUpperCase()}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </>
    );
  };

  if (popupDirection === 'up') {
    return (
      <div
        className="searchable-dropdown-list-direct"
        ref={dropdownRef}
        style={{
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '260px',
          overflow: 'hidden'
        }}
      >
        {renderListContent()}
      </div>
    );
  }

  return (
    <div className="model-selector" style={{ flexDirection: 'column', alignItems: 'stretch', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Model Selection</label>
        {isUsingFallbackModels && (
          <span 
            style={{ 
              fontSize: '10px', 
              color: '#eab308', 
              backgroundColor: 'rgba(234, 179, 8, 0.1)', 
              padding: '2px 6px', 
              borderRadius: '4px', 
              border: '1px solid rgba(234, 179, 8, 0.2)', 
              fontWeight: 'bold' 
            }} 
            title="Showing preset offline fallbacks. Enter API key to load live list from Backboard."
          >
            Presets
          </span>
        )}
      </div>
      <div className="searchable-select-container" ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="select-field"
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: 'left',
            background: 'var(--bg-primary)',
            padding: '8px 12px',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
            height: 'auto'
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {modelName ? `${llmProvider.toUpperCase()} - ${modelName}` : 'Select a Model...'}
          </span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>▼</span>
        </button>
        
        {isDropdownOpen && (
          <div
            className="searchable-dropdown-list"
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '260px',
              overflow: 'hidden'
            }}
          >
            {renderListContent()}
          </div>
        )}
      </div>
    </div>
  );
}
