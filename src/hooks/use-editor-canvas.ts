
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { JewelryModel } from '@/lib/types';
import { useIsMobile } from './use-mobile';

interface UseEditorCanvasProps {
    model: JewelryModel;
}

export function useEditorCanvas({ model }: UseEditorCanvasProps) {
    const isMobile = useIsMobile();
    const [scale, setScale] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [pixelsPerMm, setPixelsPerMm] = useState<number | null>(null);
    const [modelImageRect, setModelImageRect] = useState<DOMRect | null>(null);

    const canvasWrapperRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const modelImageRef = useRef<HTMLImageElement>(null);
    const modelImageContainerRef = useRef<HTMLDivElement>(null);

    const panRef = useRef(pan);
    panRef.current = pan;
    const scaleRef = useRef(scale);
    scaleRef.current = scale;
    
    const interactionState = useRef({
        isPanning: false,
        panStart: { x: 0, y: 0 },
        isPinching: false,
        pinchInitialDist: 0,
    }).current;

    const resetZoomAndPan = useCallback(() => {
        setScale(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const updateRects = useCallback(() => {
        const imageEl = modelImageRef.current;
        const containerEl = modelImageContainerRef.current;

        if (imageEl && containerEl) {
            const containerWidth = containerEl.offsetWidth;
            const containerHeight = containerEl.offsetHeight;
            const imageNaturalWidth = imageEl.naturalWidth;
            const imageNaturalHeight = imageEl.naturalHeight;

            if (imageNaturalWidth === 0 || imageNaturalHeight === 0) return;

            const imageAspectRatio = imageNaturalWidth / imageNaturalHeight;
            const containerAspectRatio = containerWidth / containerHeight;

            let renderedWidth, renderedHeight, offsetX = 0, offsetY = 0;

            if (imageAspectRatio > containerAspectRatio) {
                renderedWidth = containerWidth;
                renderedHeight = containerWidth / imageAspectRatio;
                offsetY = (containerHeight - renderedHeight) / 2;
            } else {
                renderedHeight = containerHeight;
                renderedWidth = containerHeight * imageAspectRatio;
                offsetX = (containerWidth - renderedWidth) / 2;
            }

            const containerRect = containerEl.getBoundingClientRect();

            setModelImageRect(new DOMRect(
                containerRect.left + offsetX,
                containerRect.top + offsetY,
                renderedWidth,
                renderedHeight
            ));
            
            const pxPerMmWidth = renderedWidth / (model.width || 1);
            const pxPerMmHeight = renderedHeight / (model.height || 1);
            setPixelsPerMm((pxPerMmWidth + pxPerMmHeight) / 2);
        }
      }, [model.width, model.height]);
      
    const zoomToPoint = useCallback((newScale: number, pointX: number, pointY: number) => {
        const clampedScale = Math.max(0.2, Math.min(newScale, 5));
        const currentPan = panRef.current;
        const currentScale = scaleRef.current;

        const newPanX = pointX - ((pointX - currentPan.x) * (clampedScale / currentScale));
        const newPanY = pointY - ((pointY - currentPan.y) * (clampedScale / currentScale));

        setPan({ x: newPanX, y: newPanY });
        setScale(clampedScale);
    }, []);

    const handleManualZoom = (direction: 'in' | 'out') => {
        if (!canvasWrapperRef.current) return;
        const zoomFactor = direction === 'in' ? 1.2 : 1 / 1.2;
        const newScale = scale * zoomFactor;

        const canvasRect = canvasWrapperRef.current.getBoundingClientRect();
        const pointX = canvasRect.width / 2;
        const pointY = canvasRect.height / 2;
        
        zoomToPoint(newScale, pointX, pointY);
    };

    useEffect(() => {
        const imageEl = modelImageRef.current;
        if (!imageEl) return;
        const handleLoad = () => updateRects();
        if (imageEl.complete) handleLoad();
        else imageEl.addEventListener('load', handleLoad);
        window.addEventListener('resize', updateRects);
        return () => {
            window.removeEventListener('resize', updateRects);
            if (imageEl) imageEl.removeEventListener('load', handleLoad);
        };
    }, [updateRects]);

    useEffect(() => {
        updateRects();
    }, [pan, scale, updateRects]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const getPoint = (e: MouseEvent | TouchEvent) => 'touches' in e ? e.touches[0] : e;
        
        const getTouchCenter = (touches: TouchList) => {
            const t1 = touches[0];
            const t2 = touches[1];
            return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
        };

        const getTouchDistance = (touches: TouchList) => {
            const t1 = touches[0];
            const t2 = touches[1];
            return Math.sqrt(Math.pow(t1.clientX - t2.clientX, 2) + Math.pow(t1.clientY - t2.clientY, 2));
        };

        const handleInteractionEnd = () => {
            interactionState.isPanning = false;
            interactionState.isPinching = false;
        };
        
        const handleWheel = (e: globalThis.WheelEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.charm-on-canvas')) return;
            e.preventDefault();
            const canvasRect = canvas.getBoundingClientRect();
            const zoomFactor = e.deltaY * -0.005;
            const newScale = scaleRef.current * (1 + zoomFactor);
            const pointX = e.clientX - canvasRect.left;
            const pointY = e.clientY - canvasRect.top;
            zoomToPoint(newScale, pointX, pointY);
        };
        
        const handleMove = (e: MouseEvent | TouchEvent) => {
            const isInteracting = interactionState.isPanning || interactionState.isPinching;
            if (isInteracting && 'preventDefault' in e && e.cancelable) e.preventDefault();

            if (interactionState.isPanning) {
                const point = getPoint(e);
                const newX = point.clientX - interactionState.panStart.x;
                const newY = point.clientY - interactionState.panStart.y;
                setPan({ x: newX, y: newY });
            } else if (interactionState.isPinching && 'touches' in e && e.touches.length === 2) {
                const newDist = getTouchDistance(e.touches);
                const zoomFactor = newDist / interactionState.pinchInitialDist;
                const newScale = scaleRef.current * zoomFactor;
                const touchCenter = getTouchCenter(e.touches);
                const canvasRect = canvas.getBoundingClientRect();
                const pointX = touchCenter.x - canvasRect.left;
                const pointY = touchCenter.y - canvasRect.top;
                zoomToPoint(newScale, pointX, pointY);
                interactionState.pinchInitialDist = newDist;
            }
        };

        const handlePanStart = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (target.closest('.charm-on-canvas')) return;
            if ('preventDefault' in e && e.cancelable) e.preventDefault();
            
            if ('touches' in e) {
                if (e.touches.length === 2) {
                    interactionState.isPinching = true;
                    interactionState.isPanning = false;
                    interactionState.pinchInitialDist = getTouchDistance(e.touches);
                    return;
                }
                if (e.touches.length !== 1) return;
            }
            interactionState.isPanning = true;
            interactionState.isPinching = false;
            const point = getPoint(e);
            interactionState.panStart = { x: point.clientX - panRef.current.x, y: point.clientY - panRef.current.y };
        };
        
        canvas.addEventListener('mousedown', handlePanStart);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleInteractionEnd);
        canvas.addEventListener('touchstart', handlePanStart, { passive: false });
        window.addEventListener('touchmove', handleMove, { passive: false });
        window.addEventListener('touchend', handleInteractionEnd);
        
        return () => {
            canvas.removeEventListener('mousedown', handlePanStart);
            canvas.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleInteractionEnd);
            canvas.removeEventListener('touchstart', handlePanStart);
            window.removeEventListener('touchmove', handleMove);
            window.removeEventListener('touchend', handleInteractionEnd);
        };
    }, [interactionState, zoomToPoint, isMobile]);


    return {
        canvasWrapperRef,
        canvasRef,
        modelImageContainerRef,
        modelImageRef,
        pan,
        scale,
        modelImageRect,
        pixelsPerMm,
        handleManualZoom,
        resetZoomAndPan,
    };
}
