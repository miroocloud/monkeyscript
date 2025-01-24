// ==UserScript==
// @name         Simple Auto HD Youtube (Non-Premium Friendly)
// @icon         https://www.google.com/s2/favicons?sz=64&domain=YouTube.com
// @namespace    https://github.com/faridhnzz/monkeyscript
// @version      1.0
// @description  Automatically set YouTube to HD quality
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
  // 144, 240, 380, 480, 720, 1080 and any more.
  const PREFERRED_QUALITY = 1080;

  // Global
  // Keywords for finding the quality menu across different languages
  const QUALITY_KEYWORDS = ['Quality', 'Kualitas', 'Qualität', 'Qualité', 'Calidad', 'Qualità', '画質', '화질', 'คุณภาพ', 'Vídeo', 'Resolusi'];
  // Local storage key for YouTube quality settings
  const LOCALSTORAGE_QUALITY = 'yt-player-quality';

  /**
   * Check if the current quality is already set to the preferred quality.
   * @returns {boolean} True if the preferred quality is set, otherwise false.
   */
  function checkCurrentQuality() {
    try {
      const qualityItem = localStorage.getItem(LOCALSTORAGE_QUALITY);
      if (qualityItem) {
        const parsedQuality = JSON.parse(qualityItem);
        const storedQuality = JSON.parse(parsedQuality.data).quality;
        return storedQuality === PREFERRED_QUALITY;
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

      localStorage.setItem(LOCALSTORAGE_QUALITY, JSON.stringify(qualityObject));
      console.log(`Set YouTube quality to ${PREFERRED_QUALITY}p`);
      return true;
    } catch (error) {
      console.error('Failed to set YouTube quality:', error);
      return false;
    }
  }

  /**
   * Manually select the preferred quality in the YouTube player menu.
   */
  function manualQualitySelection() {
    if (!setYouTubeQuality()) {
      return;
    }

    waitForElement('.ytp-settings-button', (settingsButton) => {
      console.log('Settings button found, clicking...');
      settingsButton.click();

      waitForElement('.ytp-menuitem-label', () => {
        console.log('Menu item labels found, locating quality menu...');

        const qualityMenuButton = Array.from(document.querySelectorAll('.ytp-menuitem-label')).find((button) =>
          QUALITY_KEYWORDS.some((keyword) => button.textContent.includes(keyword)) || /\d{3,4}p/.test(button.textContent)
        );

        if (qualityMenuButton) {
          console.log('Quality menu button found, clicking...');
          qualityMenuButton.click();

          waitForQualityOptions(() => {
            console.log('Quality options found, selecting preferred quality...');
            const qualityOptions = Array.from(document.querySelectorAll('.ytp-quality-menu .ytp-menuitem-label'));

            // Filter out premium quality options
            const nonPremiumOptions = qualityOptions.filter(option =>
              !option.textContent.includes('premium') &&
              !option.textContent.includes('Premium')
            );

            // Try to find preferred quality among non-premium options
            const targetOption = nonPremiumOptions.find((option) => option.textContent.includes(`${PREFERRED_QUALITY}p`));

            if (targetOption) {
              console.log(`Preferred quality "${PREFERRED_QUALITY}p" found, clicking...`);
              targetOption.click();
            } else if (nonPremiumOptions.length > 0) {
              console.warn('Preferred quality not found, selecting highest available non-premium quality...');
              const sortedOptions = nonPremiumOptions.sort((a, b) => {
                const extractQuality = (text) => {
                  const match = text.match(/(\d{3,4})p/);
                  return match ? parseInt(match[1]) : 0;
                };
                return extractQuality(b.textContent) - extractQuality(a.textContent);
              });

              if (sortedOptions[0]) {
                sortedOptions[0].click();
              }
            } else {
              console.warn('No non-premium quality options found.');
            }

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
      if (!document.querySelector('.ytp-settings-button')) {
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

  /**
   * Utility function to wait for video quality options to load.
   * @param {function} callback - Function to execute when the options are found.
   * @param {number} maxAttempts - Maximum number of attempts before giving up.
   * @param {number} interval - Time interval between attempts in milliseconds.
   */
  function waitForQualityOptions(callback, maxAttempts = 50, interval = 100) {
    let attempts = 0;

    function checkQualityOptions() {
      const options = document.querySelectorAll('.ytp-quality-menu .ytp-menuitem-label');
      if (options.length > 0) {
        callback();
      } else if (attempts < maxAttempts) {
        attempts++;
        requestAnimationFrame(checkQualityOptions);
      } else {
        console.warn('Quality options not found after maximum attempts.');
      }
    }

    setTimeout(checkQualityOptions, interval);
  }
})();
