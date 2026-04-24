"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    function reloadOnce() {
      if (!sessionStorage.getItem("sw-updated-reload")) {
        sessionStorage.setItem("sw-updated-reload", "1");
        window.location.reload();
      }
    }

    // When a new SW takes over an existing session, reload to pick up new code
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[PWA] Service Worker registered:", reg.scope);
        // Handle case where new SW was already waiting when page loaded
        if (reg.waiting && navigator.serviceWorker.controller) {
          reloadOnce();
        }
      })
      .catch((err) => {
        console.error("[PWA] Service Worker registration failed:", err);
      });
  }, []);

  return null;
}
