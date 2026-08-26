import React, { useState, useEffect } from 'react';

interface Extension {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  installed: boolean;
  icon: string;
  category: string;
}

const ExtensionMarketplace: React.FC = () => {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'All Extensions', icon: '📦' },
    { id: 'themes', name: 'Themes', icon: '🎨' },
    { id: 'languages', name: 'Languages', icon: '📝' },
    { id: 'linters', name: 'Linters', icon: '🔍' },
    { id: 'debuggers', name: 'Debuggers', icon: '🐛' },
    { id: 'ai', name: 'AI Tools', icon: '🤖' },
    { id: 'productivity', name: 'Productivity', icon: '⚡' }
  ];

  useEffect(() => {
    loadExtensions();
  }, []);

  const loadExtensions = async () => {
    setIsLoading(true);
    // Simulated extensions data
    const mockExtensions: Extension[] = [
      {
        id: '1',
        name: 'Python',
        description: 'Python language support with IntelliSense, linting, and debugging',
        author: 'Idexal',
        version: '1.0.0',
        downloads: 150000,
        rating: 4.8,
        installed: true,
        icon: '🐍',
        category: 'languages'
      },
      {
        id: '2',
        name: 'Rust',
        description: 'Rust language support with cargo integration',
        author: 'Idexal',
        version: '1.0.0',
        downloads: 75000,
        rating: 4.7,
        installed: false,
        icon: '🦀',
        category: 'languages'
      },
      {
        id: '3',
        name: 'GitLens',
        description: 'Supercharge Git within the IDE',
        author: 'Idexal',
        version: '2.0.0',
        downloads: 500000,
        rating: 4.9,
        installed: true,
        icon: '🔍',
        category: 'productivity'
      },
      {
        id: '4',
        name: 'Idexa AI',
        description: 'AI-powered code assistance',
        author: 'Idexal',
        version: '1.0.0',
        downloads: 200000,
        rating: 4.6,
        installed: true,
        icon: '🤖',
        category: 'ai'
      },
      {
        id: '5',
        name: 'Dracula Theme',
        description: 'Dark theme for Idexal IDE',
        author: 'Community',
        version: '1.0.0',
        downloads: 300000,
        rating: 4.8,
        installed: false,
        icon: '🧛',
        category: 'themes'
      },
      {
        id: '6',
        name: 'ESLint',
        description: 'Integrates ESLint JavaScript linting',
        author: 'Idexal',
        version: '2.0.0',
        downloads: 400000,
        rating: 4.7,
        installed: false,
        icon: '✓',
        category: 'linters'
      }
    ];
    
    setExtensions(mockExtensions);
    setIsLoading(false);
  };

  const filteredExtensions = extensions.filter(ext => {
    const matchesSearch = ext.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         ext.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || ext.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const installExtension = async (ext: Extension) => {
    setExtensions(prev => prev.map(e => 
      e.id === ext.id ? { ...e, installed: true } : e
    ));
  };

  const uninstallExtension = async (ext: Extension) => {
    setExtensions(prev => prev.map(e => 
      e.id === ext.id ? { ...e, installed: false } : e
    ));
  };

  const formatDownloads = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)]">
        <h2 className="text-lg font-semibold text-[var(--color-text)] mb-3">
          Extension Marketplace
        </h2>
        
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 pl-9 bg-[var(--color-background)] border border-[var(--color-border)] rounded-md text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
          <span className="absolute left-3 top-2.5 text-[var(--color-text-secondary)]">🔍</span>
        </div>
      </div>

      {/* Categories */}
      <div className="p-2 border-b border-[var(--color-border)] flex gap-1 overflow-x-auto">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
              selectedCategory === cat.id
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-background)] text-[var(--color-text-secondary)] hover:bg-[var(--color-hover)]'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Extensions List */}
      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : filteredExtensions.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-secondary)]">
            No extensions found
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExtensions.map(ext => (
              <div
                key={ext.id}
                className="p-4 bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{ext.icon}</div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[var(--color-text)]">{ext.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-[var(--color-surface)] text-[var(--color-text-secondary)] rounded">
                        v{ext.version}
                      </span>
                    </div>
                    
                    <p className="text-sm text-[var(--color-text-secondary)] mt-1 line-clamp-2">
                      {ext.description}
                    </p>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-text-secondary)]">
                      <span>by {ext.author}</span>
                      <span>⬇ {formatDownloads(ext.downloads)}</span>
                      <span>⭐ {ext.rating}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => ext.installed ? uninstallExtension(ext) : installExtension(ext)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      ext.installed
                        ? 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:bg-red-500/10 hover:text-red-500'
                        : 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]'
                    }`}
                  >
                    {ext.installed ? 'Uninstall' : 'Install'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtensionMarketplace;
