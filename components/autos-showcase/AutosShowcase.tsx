"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { views } from "./constants";
import { useScrollNavigation } from "./hooks/useScrollNavigation";
import { useThreeCarScene } from "./hooks/useThreeCarScene";
import { BottomPaginator } from "./ui/BottomPaginator";
import { ErrorOverlay } from "./ui/ErrorOverlay";
import { Header } from "./ui/Header";
import { LoadingOverlay } from "./ui/LoadingOverlay";
import { ScrollIndicator } from "./ui/ScrollIndicator";
import { ServiceDetailsCard } from "./ui/ServiceDetailsCard";
import { WhatsAppButton } from "./ui/WhatsAppButton";

export const AutosShowcase = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeViewIndex, setActiveViewIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [modelError, setModelError] = useState(false);

  const targetCameraPositionRef = useRef(new THREE.Vector3(...views[0].camera.position));
  const targetCameraTargetRef = useRef(new THREE.Vector3(...views[0].camera.target));

  useScrollNavigation({
    enabled: !isLoading && !modelError,
    viewCount: views.length,
    setActiveViewIndex,
  });

  useEffect(() => {
    const view = views[activeViewIndex];
    targetCameraPositionRef.current.set(...view.camera.position);
    targetCameraTargetRef.current.set(...view.camera.target);
  }, [activeViewIndex]);

  useThreeCarScene({
    mountRef,
    initialCameraPosition: views[0].camera.position,
    initialCameraTarget: views[0].camera.target,
    targetCameraPositionRef,
    targetCameraTargetRef,
    onLoadingChange: setIsLoading,
    onModelError: setModelError,
  });

  const activeView = useMemo(() => views[activeViewIndex], [activeViewIndex]);
  const isSceneReady = !isLoading && !modelError;

  return (
    <div className="relative h-screen w-full overflow-hidden bg-black text-slate-200" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      {isLoading ? <LoadingOverlay /> : null}
      {modelError ? <ErrorOverlay /> : null}

      <Header />

      <div ref={mountRef} className="absolute inset-0 z-0" />

      {isSceneReady ? <ScrollIndicator activeViewIndex={activeViewIndex} totalViews={views.length} /> : null}
      {isSceneReady ? <ServiceDetailsCard activeView={activeView} /> : null}
      {isSceneReady ? (
        <BottomPaginator activeViewIndex={activeViewIndex} totalViews={views.length} onChange={setActiveViewIndex} />
      ) : null}
      <WhatsAppButton />
    </div>
  );
};

