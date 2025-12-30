import { useState, useEffect, useCallback, useRef } from "react";

const SIDEBAR_STATE_KEY = "tradoverse-mobile-sidebar-open";
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Minimum velocity to trigger

interface SwipeState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  isSwiping: boolean;
}

export function useMobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const swipeStateRef = useRef<SwipeState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    isSwiping: false,
  });

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Close sidebar when switching from mobile to desktop
  useEffect(() => {
    if (!isMobile && isOpen) {
      setIsOpen(false);
    }
  }, [isMobile, isOpen]);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    swipeStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: Date.now(),
      currentX: touch.clientX,
      isSwiping: false,
    };
  }, [isMobile]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isMobile) return;
    
    const touch = e.touches[0];
    const state = swipeStateRef.current;
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    
    // Only track horizontal swipes (ignore vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      state.isSwiping = true;
      state.currentX = touch.clientX;
    }
  }, [isMobile]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (!isMobile) return;
    
    const state = swipeStateRef.current;
    if (!state.isSwiping) return;
    
    const deltaX = state.currentX - state.startX;
    const deltaTime = Date.now() - state.startTime;
    const velocity = Math.abs(deltaX) / deltaTime;
    
    // Check if swipe meets threshold
    const meetsDistanceThreshold = Math.abs(deltaX) > SWIPE_THRESHOLD;
    const meetsVelocityThreshold = velocity > SWIPE_VELOCITY_THRESHOLD;
    
    if (meetsDistanceThreshold || meetsVelocityThreshold) {
      if (deltaX > 0 && !isOpen) {
        // Swipe right to open (only from left edge)
        if (state.startX < 30) {
          setIsOpen(true);
        }
      } else if (deltaX < 0 && isOpen) {
        // Swipe left to close
        setIsOpen(false);
      }
    }
    
    // Reset state
    swipeStateRef.current = {
      startX: 0,
      startY: 0,
      startTime: 0,
      currentX: 0,
      isSwiping: false,
    };
  }, [isMobile, isOpen]);

  // Add touch event listeners
  useEffect(() => {
    if (!isMobile) return;
    
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isOpen]);

  // Toggle sidebar
  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Open sidebar
  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close sidebar
  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    isOpen,
    isMobile,
    toggle,
    open,
    close,
    setIsOpen,
  };
}

export default useMobileSidebar;
