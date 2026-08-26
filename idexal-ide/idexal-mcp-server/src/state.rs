use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Clone)]
pub struct ServerState {
    pub workspace_root: Arc<RwLock<Option<String>>>,
    pub analysis_cache: Arc<RwLock<Vec<CachedAnalysis>>>,
}

#[derive(Clone)]
pub struct CachedAnalysis {
    pub file_path: String,
    pub content_hash: u64,
    pub analysis: String,
}

impl ServerState {
    pub fn new() -> Self {
        Self {
            workspace_root: Arc::new(RwLock::new(None)),
            analysis_cache: Arc::new(RwLock::new(Vec::new())),
        }
    }
    
    pub async fn set_workspace(&self, path: String) {
        let mut root = self.workspace_root.write().await;
        *root = Some(path);
    }
    
    pub async fn get_workspace(&self) -> Option<String> {
        self.workspace_root.read().await.clone()
    }
    
    pub async fn cache_analysis(&self, file_path: String, content_hash: u64, analysis: String) {
        let mut cache = self.analysis_cache.write().await;
        
        // Remove existing entry for this file
        cache.retain(|c| c.file_path != file_path);
        
        cache.push(CachedAnalysis {
            file_path,
            content_hash,
            analysis,
        });
        
        // Keep cache size manageable
        if cache.len() > 100 {
            cache.remove(0);
        }
    }
    
    pub async fn get_cached_analysis(&self, file_path: &str, content_hash: u64) -> Option<String> {
        let cache = self.analysis_cache.read().await;
        
        cache
            .iter()
            .find(|c| c.file_path == file_path && c.content_hash == content_hash)
            .map(|c| c.analysis.clone())
    }
}