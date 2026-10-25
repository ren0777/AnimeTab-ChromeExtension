import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './BlurWallpaperBackground.css';

/**
 * BlurWallpaperBackground - A premium image background component
 * with smooth blur-to-focus transitions, inspired by high-end
 * anime streaming platforms like Crunchyroll and Netflix.
 *
 * Features:
 * - Soft blur transition when loading new images
 * - Preloads next image for seamless transitions
 * - Optional gradient overlay for depth
 * - Glassmorphism-ready with backdrop blur support
 * - Fully accessible with ARIA attributes
 */
const BlurWallpaperBackground = ({
  imageUrl,
  isVideo = false,
  fallbackUrl = null,
  blurAmount = 20,
  transitionDuration = 800,
  overlayOpacity = 0.4,
  gradientOverlay = true,
  preloadNext = true,
  children,
  className = '',
  'data-testid': testId
}) => {
  const [currentImage, setCurrentImage] = useState(imageUrl);
  const [nextImage, setNextImage] = useState(null);
  const [blurLevel, setBlurLevel] = useState(blurAmount);
  const [opacity, setOpacity] = useState(1);
  const [error, setError] = useState(false);

  const isTransitioningRef = useRef(false);

  // Preload an image and return a promise
  const preloadImage = (url) => {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('No image URL provided'));
        return;
      }

      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
      img.src = url;
    });
  };

  // Probe a video the same way (an <img> probe would always fail and log
  // console errors for custom video uploads).
  const preloadVideo = (url) => {
    return new Promise((resolve, reject) => {
      if (!url) {
        reject(new Error('No video URL provided'));
        return;
      }

      const video = document.createElement('video');
      video.muted = true;
      video.preload = 'auto';
      video.onloadeddata = () => resolve(video);
      video.onerror = () => reject(new Error(`Failed to load video: ${url}`));
      video.src = url;
    });
  };

  // Pick the right loader per render: videos must use the <video> probe (an
  // <img> probe would always fail and log console errors for video uploads).
  const preloadMedia = isVideo ? preloadVideo : preloadImage;

  // Handle image transition with blur effect
  const transitionToImage = async (newUrl) => {
    if (isTransitioningRef.current || newUrl === currentImage) return;
    isTransitioningRef.current = true;

    try {
      // Start blur transition: increase blur and fade out current
      setBlurLevel(blurAmount);
      setOpacity(0);

      // Preload the new image
      await preloadMedia(newUrl);

      // After a brief delay, swap images and fade in
      setTimeout(async () => {
        setCurrentImage(newUrl);
        setNextImage(null);
        setError(false);

        // Gradually reduce blur while fading in
        const steps = 10;
        const stepDuration = transitionDuration / steps;
        let currentStep = 0;

        const fadeInInterval = setInterval(() => {
          currentStep++;
          const progress = currentStep / steps;
          const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic

          setBlurLevel(blurAmount * (1 - easeProgress));
          setOpacity(easeProgress);

          if (currentStep >= steps) {
            clearInterval(fadeInInterval);
            setBlurLevel(0);
            setOpacity(1);
            isTransitioningRef.current = false;
          }
        }, stepDuration);
      }, transitionDuration / 2);
    } catch (err) {
      console.error('[BlurWallpaper] Image transition failed:', err);
      setError(true);
      isTransitioningRef.current = false;
    }
  };

  // Handle initial image load
  useEffect(() => {
    if (!imageUrl) return;

    const loadInitialImage = async () => {
      try {
        await preloadMedia(imageUrl);
        setCurrentImage(imageUrl);
        setError(false);
        // Quick fade-in from blur
        let blur = blurAmount;
        let op = 0;
        const fadeIn = setInterval(() => {
          blur -= blurAmount / 10;
          op += 0.1;
          setBlurLevel(Math.max(0, blur));
          setOpacity(Math.min(1, op));
          if (blur <= 0 || op >= 1) {
            clearInterval(fadeIn);
            setBlurLevel(0);
            setOpacity(1);
          }
        }, transitionDuration / 10);
      } catch (err) {
        console.error('[BlurWallpaper] Initial image load failed:', err);
        setError(true);
      }
    };

    loadInitialImage();
  }, [imageUrl, isVideo, blurAmount, transitionDuration]);

  // Watch for imageUrl prop changes
  useEffect(() => {
    if (imageUrl && imageUrl !== currentImage && !isTransitioningRef.current) {
      transitionToImage(imageUrl);
    }
  }, [imageUrl]);

  // Preload next image if available
  useEffect(() => {
    if (preloadNext && nextImage) {
      preloadImage(nextImage).catch(() => {});
    }
  }, [nextImage, preloadNext]);

  const displayImage = currentImage || fallbackUrl;

  // Videos render as a real <video> element (background-image can't play
  // them); the layer style object below is shared so blur/fade transitions
  // behave identically.
  const layerStyle = {
    filter: `blur(${blurLevel}px) brightness(${0.7 + overlayOpacity * 0.3})`,
    opacity: opacity,
    transition: `filter ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1), opacity ${transitionDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
  };

  return (
    <div
      className={`blur-wallpaper-container ${className} ${error ? 'has-error' : ''}`}
      data-testid={testId}
    >
      {/* Background image with blur effect */}
      {isVideo && currentImage ? (
        <video
          className="blur-wallpaper-video"
          src={currentImage}
          style={layerStyle}
          autoPlay
          loop
          muted
          playsInline
          aria-hidden="true"
        />
      ) : (
        displayImage && (
          <div
            className="blur-wallpaper-layer"
            style={{
              backgroundImage: `url(${displayImage})`,
              ...layerStyle
            }}
            aria-hidden="true"
          />
        )
      )}

      {/* Gradient overlay for depth and text readability */}
      {gradientOverlay && (
        <div
          className="blur-wallpaper-overlay"
          style={{
            background: `linear-gradient(
              180deg,
              rgba(0, 0, 0, ${0.3 + overlayOpacity * 0.3}) 0%,
              rgba(0, 0, 0, ${overlayOpacity * 0.6}) 50%,
              rgba(0, 0, 0, ${0.5 + overlayOpacity * 0.5}) 100%
            )`
          }}
          aria-hidden="true"
        />
      )}

      {/* Content slot */}
      <div className="blur-wallpaper-content">
        {children}
      </div>
    </div>
  );
};

BlurWallpaperBackground.propTypes = {
  /** URL of the current background image */
  imageUrl: PropTypes.string.isRequired,
  /** True when imageUrl is a playing video (rendered via <video>) */
  isVideo: PropTypes.bool,
  /** Fallback image URL if main fails to load */
  fallbackUrl: PropTypes.string,
  /** Blur intensity in pixels (default: 20) */
  blurAmount: PropTypes.number,
  /** Transition duration in milliseconds (default: 800) */
  transitionDuration: PropTypes.number,
  /** Overlay darkness from 0 to 1 (default: 0.4) */
  overlayOpacity: PropTypes.number,
  /** Show gradient overlay for depth (default: true) */
  gradientOverlay: PropTypes.bool,
  /** Preload next image for smoother transitions (default: true) */
  preloadNext: PropTypes.bool,
  /** Child elements to render above the background */
  children: PropTypes.node,
  /** Additional CSS class name */
  className: PropTypes.string,
  /** Data-testid for testing */
  'data-testid': PropTypes.string
};

export default BlurWallpaperBackground;
