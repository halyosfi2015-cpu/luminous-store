"use client";

import { useEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "ld-lang";
const CHANGE_EVENT = "ld-lang-change";

export type Lang = "ar" | "en";

function applyDocLang(lang: Lang) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Lang {
  return window.localStorage.getItem(STORAGE_KEY) === "en" ? "en" : "ar";
}

function getServerSnapshot(): Lang {
  return "ar";
}

export function setLang(lang: Lang) {
  window.localStorage.setItem(STORAGE_KEY, lang);
  applyDocLang(lang);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function useLang(): { lang: Lang; toggleLang: () => void; setLang: (lang: Lang) => void } {
  const lang = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyDocLang(lang);
  }, [lang]);

  const changeLang = (next: Lang) => setLang(next);
  const toggleLang = () => changeLang(lang === "ar" ? "en" : "ar");
  return { lang, toggleLang, setLang: changeLang };
}
