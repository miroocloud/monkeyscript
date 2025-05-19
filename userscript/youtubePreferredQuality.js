// ==UserScript==
// @name         YouTube Auto HD Quality
// @icon         https://www.google.com/s2/favicons?sz=64&domain=YouTube.com
// @namespace    https://github.com/miroocloud/monkeyscript
// @version      2.0
// @description  Automatically sets YouTube video playback quality to your preferred HD resolution.
// @author       Farid Nizam
// @license      MIT
// @match        *://*.youtube.com/*
// @match        *://www.youtube-nocookie.com/*
// @exclude      *://accounts.youtube.com/*
// @exclude      *://www.youtube.com/live_chat_replay*
// @exclude      *://www.youtube.com/persist_identity*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Preferred quality setting
  // 144, 240, 380, 480, 720, 1080, 1440, 2160, 4320, and any more.
  const PREFERRED_QUALITY = 1080;

  // Global
  // Keywords for finding the quality menu across different languages
  const QUALITY_KEYWORDS = ['Quality', 'Kualitas', 'Qualität', 'Qualité', 'Calidad', 'Qualità', '画質', '화질', 'คุณภาพ', 'Vídeo', 'Resolusi', 'Resolution'];
  // Local storage keys - YouTube may change these over time
  const LOCALSTORAGE_KEYS = 'yt-player-quality';
  // Selectors for UI elements
  const SELECTORS = {
    settingsButton: ['.ytp-settings-button', '[data-tooltip-target-id="ytp-settings-button"]', '[aria-label*="settings"]'],
    qualityMenu: ['.ytp-menuitem-label', '.ytp-quality-menu-button', '[aria-label*="quality"]'],
    qualityOptions: ['.ytp-quality-menu .ytp-menuitem-label', '.ytp-quality-submenu .ytp-menuitem', '[data-quality-option]']
  };

  /**
   * Find an element using multiple potential selectors
   * @param {Array<string>} selectorList - List of selectors to try
   * @returns {Element|null} - The found element or null
   */
  function findElementBySelectors(selectorList) {
    for (const selector of selectorList) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  /**
   * Find all elements using multiple potential selectors
   * @param {Array<string>} selectorList - List of selectors to try
   * @returns {Array<Element>} - Array of found elements
   */
  function findAllElementsBySelectors(selectorList) {
    for (const selector of selectorList) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) return Array.from(elements);
    }
    return [];
  }

  /**
   * Check if the current quality is already set to the preferred quality.
   * @returns {boolean} True if the preferred quality is set, otherwise false.
   */
  function checkCurrentQuality() {
    try {
      // Try all possible localStorage keys
        const qualityItem = localStorage.getItem(LOCALSTORAGE_KEYS);
        if (!qualityItem) return false;
        try {
          const parsedQuality = JSON.parse(qualityItem);
          // Handle different data structures
          if (parsedQuality.data) {
            const data = JSON.parse(parsedQuality.data);
            if (data.quality === PREFERRED_QUALITY) return true;
          } else if (parsedQuality.quality) {
            if (parsedQuality.quality === PREFERRED_QUALITY) return true;
          } else if (typeof parsedQuality === 'number') {
            if (parsedQuality === PREFERRED_QUALITY) return true;
          }
        } catch (e) {
          console.debug(`Failed to parse quality data for key ${key}:`, e);
        }
      return false;
    } catch (error) {
      console.error('Failed to check current quality:', error);
      return false;
    }
  }

  /**
   * Set the preferred YouTube video quality in localStorage.
   * @returns {boolean} True if successfully set, otherwise false.
   */
  function setYouTubeQuality() {
    try {
      if (checkCurrentQuality()) {
        console.log(`Quality already set to ${PREFERRED_QUALITY}p`);
        return true;
      }
      const now = Date.now();
      const qualityObject = {
        data: JSON.stringify({
          quality: PREFERRED_QUALITY,
          previousQuality: PREFERRED_QUALITY
        }),
        expiration: now + (31 * 24 * 60 * 60 * 1000), // 31 days expiration
        creation: now
      };
      // Try to set on all possible keys
      let setSuccessful = false;
        try {
          localStorage.setItem(key, JSON.stringify(qualityObject));
          setSuccessful = true;
        } catch (e) {
          console.debug(`Failed to set quality for key ${key}:`, e);
        }
      if (setSuccessful) {
        console.log(`Set YouTube quality to ${PREFERRED_QUALITY}p`);
        return true;
      } else {
        console.error('Failed to set quality in any localStorage key');
        return false;
      }
    } catch (error) {
      console.error('Failed to set YouTube quality:', error);
      return false;
    }
  }

  /**
   * Extract quality value from text (e.g. "1080p" -> 1080)
   * @param {string} text - Text containing quality information
   * @returns {number} - Quality value as number, or 0 if not found
   */
  function extractQualityValue(text) {
    // Handle various formats like "1080p HD", "2160p (4K)", etc.
    const match = text.match(/(\d{3,4})p/i);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Check if a quality option is premium only
   * @param {Element} element - The quality option element
   * @returns {boolean} - True if premium only
   */
  function isPremiumOnly(element) {
    const text = element.textContent.toLowerCase();
    const parentElement = element.parentElement;
    
    // Check for premium indicators in text or parent elements
    return text.includes('premium') || 
           (parentElement && parentElement.innerHTML.includes('premium')) ||
           element.classList.contains('premium-quality') ||
           element.hasAttribute('data-premium-only') ||
           element.querySelector('.premium-badge, .premium-icon') !== null;
  }

  /**
   * Manually select the preferred quality in the YouTube player menu.
   */
  function manualQualitySelection() {
    // Check if quality is already set correctly in localStorage
    if (checkCurrentQuality()) {
      console.log(`Quality already set to ${PREFERRED_QUALITY}p, skipping menu interaction`);
      return;
    }
    
    // Try to set quality in localStorage
    if (!setYouTubeQuality()) {
      console.warn('Failed to set quality in localStorage, attempting UI interaction');
    }

    // Find the settings button with multiple potential selectors
    const settingsButtonSelectors = SELECTORS.settingsButton.join(', ');
    
    waitForElement(settingsButtonSelectors, (settingsButton) => {
      console.log('Settings button found, clicking...');
      settingsButton.click();

      // Find quality menu with multiple potential selectors
      const qualityMenuSelectors = SELECTORS.qualityMenu.join(', ');
      
      waitForElement(qualityMenuSelectors, () => {
        console.log('Menu items found, locating quality menu...');

        // First try to find by keywords
        const menuItems = findAllElementsBySelectors(SELECTORS.qualityMenu);
        let qualityMenuButton = menuItems.find((button) =>
          QUALITY_KEYWORDS.some((keyword) => 
            button.textContent.toLowerCase().includes(keyword.toLowerCase())
          ) ||  /\d{3,4}p/i.test(button.textContent)
        );

        // If not found by keywords, try to find by aria-label
        if (!qualityMenuButton) {
          qualityMenuButton = menuItems.find(item => 
            item.getAttribute('aria-label')?.toLowerCase().includes('quality') ||
            item.getAttribute('data-tooltip')?.toLowerCase().includes('quality')
          );
        }

        if (qualityMenuButton) {
          console.log('Quality menu button found, clicking...');
          qualityMenuButton.click();

          // Find quality options with multiple potential selectors
          const qualityOptionsSelectors = SELECTORS.qualityOptions.join(', ');
          
          waitForElement(qualityOptionsSelectors, () => {
            console.log('Quality options found, selecting preferred quality...');
            const qualityOptions = findAllElementsBySelectors(SELECTORS.qualityOptions);

            // Filter out premium quality options
            const nonPremiumOptions = qualityOptions.filter(option => !isPremiumOnly(option));

            // Try to find preferred quality among non-premium options
            const targetOption = nonPremiumOptions.find((option) => 
              option.textContent.includes(`${PREFERRED_QUALITY}p`)
            );

            if (targetOption) {
              console.log(`Preferred quality "${PREFERRED_QUALITY}p" found, clicking...`);
              targetOption.click();
            } else if (nonPremiumOptions.length > 0) {
              console.warn('Preferred quality not found, selecting highest available non-premium quality...');
              
              // Sort by quality value (highest first)
              const sortedOptions = nonPremiumOptions.sort((a, b) => {
                return extractQualityValue(b.textContent) - extractQualityValue(a.textContent);
              });

              if (sortedOptions[0]) {
                console.log(`Selecting ${sortedOptions[0].textContent.trim()} as highest available quality`);
                sortedOptions[0].click();
              }
            } else {
              console.warn('No non-premium quality options found.');
            }

            // Close the menu
            setTimeout(() => {
              console.log('Closing menu...');
              document.body.click();
            }, 300);
          });
        } else {
          console.warn('Quality menu button not found.');
        }
      });
    });
  }

  // Configuration for MutationObserver
  const ObserverConfig = {
    childList: true,
    attributes: true,
    subtree: true,
    characterData: true,
  };

  // Listener for page navigation
  document.addEventListener('yt-navigate-finish', function () {
    if (location.pathname === '/watch') {
      initiateObserverAndObserve();
    }
  });

  /**
   * Initiate a MutationObserver to detect video player availability.
   */
  function initiateObserverAndObserve() {
    const observer = new MutationObserver(() => {
      // Check for player using multiple selectors
      if (!findElementBySelectors(SELECTORS.settingsButton)) {
        return;
      }
      observer.disconnect();
      manualQualitySelection();
    });

    observer.observe(document.body, ObserverConfig);
  }

  // Listener for page load
  window.addEventListener('load', () => {
    manualQualitySelection();
  });

  /**
   * Utility function to wait for a DOM element to appear.
   * @param {string} selector - CSS selector for the target element.
   * @param {function} callback - Function to execute when the element is found.
   * @param {number} maxAttempts - Maximum number of attempts before giving up.
   * @param {number} interval - Time interval between attempts in milliseconds.
   */
  function waitForElement(selector, callback, maxAttempts = 50, interval = 100) {
    let attempts = 0;

    function checkElement() {
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
      } else if (attempts < maxAttempts) {
        attempts++;
        requestAnimationFrame(checkElement);
      } else {
        console.warn(`Element "${selector}" not found after ${maxAttempts} attempts.`);
      }
    }

    setTimeout(checkElement, interval);
  }
})();
