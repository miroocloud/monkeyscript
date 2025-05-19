// ==UserScript==
// @name         YouTube Auto Fullscreen
// @icon         https://www.google.com/s2/favicons?sz=64&domain=YouTube.com
// @namespace    https://github.com/miroocloud/monkeyscript
// @version      2.2
// @description  Automatically enables fullscreen mode when playing YouTube videos.
// @author       Farid Nizam
// @license      MIT
// @match        *://*.youtube.com/*
// @match        *://www.youtube-nocookie.com/*
// @exclude      *://accounts.youtube.com/*
// @exclude      *://www.youtube.com/live_chat_replay*
// @exclude      *://www.youtube.com/persist_identity*
// @grant        GM_setValue
// @grant        GM_getValue
// ==/UserScript==

(function() {
    'use strict';
    
    // Default configuration
    const defaultConfig = {
        mode: 'theater', // Options: 'fullscreen', 'theater', or 'custom'
        delay: 1500,     // Delay in ms before applying the mode
        skipShorts: true, // Skip YouTube Shorts
        skipPlaylist: false // Skip videos in playlists
    };
    
    // Configuration (will be loaded from storage if available)
    let config = loadConfig();
    
    // Save configuration to storage
    function saveConfig() {
        try {
            // Try using Tampermonkey storage API first
            if (typeof GM_setValue !== 'undefined') {
                GM_setValue('youtubeAutoFullscreenConfig', JSON.stringify(config));
                console.log('YouTube Auto Fullscreen: Settings saved via GM_setValue');
                return;
            }
            
            // Fallback to localStorage
            localStorage.setItem('youtubeAutoFullscreenConfig', JSON.stringify(config));
            console.log('YouTube Auto Fullscreen: Settings saved via localStorage');
        } catch (e) {
            console.error('YouTube Auto Fullscreen: Failed to save settings', e);
        }
    }
    
    // Load configuration from storage
    function loadConfig() {
        try {
            let savedConfig;
            
            // Try using Tampermonkey storage API first
            if (typeof GM_getValue !== 'undefined') {
                savedConfig = GM_getValue('youtubeAutoFullscreenConfig');
                if (savedConfig) {
                    console.log('YouTube Auto Fullscreen: Settings loaded via GM_getValue');
                    return { ...defaultConfig, ...JSON.parse(savedConfig) };
                }
            }
            
            // Fallback to localStorage
            savedConfig = localStorage.getItem('youtubeAutoFullscreenConfig');
            if (savedConfig) {
                const parsedConfig = JSON.parse(savedConfig);
                console.log('YouTube Auto Fullscreen: Settings loaded via localStorage');
                return { ...defaultConfig, ...parsedConfig };
            }
        } catch (e) {
            console.error('YouTube Auto Fullscreen: Failed to load settings', e);
        }
        
        // Return default config if loading failed
        console.log('YouTube Auto Fullscreen: Using default settings');
        return { ...defaultConfig };
    }
  
    
    // Main function to handle video mode
    function setVideoMode() {
        // Check if current page is a video page
        if (!window.location.pathname.includes('/watch')) return;
        
        // Skip shorts if configured
        if (config.skipShorts && window.location.pathname.includes('/shorts/')) return;
        
        // Skip playlist videos if configured
        if (config.skipPlaylist && window.location.search.includes('list=')) return;
        
        // Find the video player
        const player = document.getElementById('movie_player');
        if (!player) return;
        
        // Check if video is playing
        const video = document.querySelector('video');
        if (!video || video.paused) {
            // Wait for video to start playing
            setTimeout(setVideoMode, 500);
            return;
        }
        
        // Apply the selected mode
        setTimeout(() => {
            // Check current state first
            const isTheaterMode = document.querySelector('ytd-watch-flexy[theater]') !== null;
            const isFullscreenMode = document.fullscreenElement !== null;
            
            switch(config.mode) {
                case 'fullscreen':
                    // Only enter fullscreen if not already in fullscreen
                    if (!isFullscreenMode) {
                        const fullscreenBtn = document.querySelector('.ytp-fullscreen-button');
                        if (fullscreenBtn) fullscreenBtn.click();
                    }
                    break;
                    
                case 'theater':
                    // Toggle theater mode only if needed
                    if (!isTheaterMode) {
                        const theaterBtn = document.querySelector('.ytp-size-button');
                        if (theaterBtn) theaterBtn.click();
                    }
                    break;
                    
                case 'custom':
                    // Exit theater mode first if we're in it
                    if (isTheaterMode) {
                        const theaterBtn = document.querySelector('.ytp-size-button');
                        if (theaterBtn) theaterBtn.click();
                    }
                    
                    // Apply custom size to the player
                    const videoContainer = document.querySelector('#ytd-player');
                    if (videoContainer) {
                        videoContainer.style.width = '100vw';
                        videoContainer.style.height = '80vh';
                        videoContainer.style.position = 'fixed';
                        videoContainer.style.top = '0';
                        videoContainer.style.left = '0';
                        videoContainer.style.zIndex = '9999';
                    }
                    break;
                    
                default: // Normal mode
                    // Exit theater mode if we're in it
                    if (isTheaterMode) {
                        const theaterBtn = document.querySelector('.ytp-size-button');
                        if (theaterBtn) theaterBtn.click();
                    }
                    
                    // Exit fullscreen if we're in it
                    if (isFullscreenMode && document.exitFullscreen) {
                        document.exitFullscreen();
                    }
                    break;
            }
        }, config.delay);
    }
    
    // Observer to detect page navigation
    function setupNavigationObserver() {
        let lastUrl = location.href;
        
        // Create an observer instance
        const observer = new MutationObserver(() => {
            if (lastUrl !== location.href) {
                lastUrl = location.href;
                setTimeout(setVideoMode, config.delay);
            }
        });
        
        // Start observing
        observer.observe(document.body, { childList: true, subtree: true });
        
        // Initial check
        setTimeout(setVideoMode, config.delay);
    }
    
    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupNavigationObserver);
    } else {
        setupNavigationObserver();
    }
})();