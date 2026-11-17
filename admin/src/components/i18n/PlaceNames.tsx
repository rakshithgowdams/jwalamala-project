"use client";
import { createContext, useContext } from "react";
import { useUiStrings } from "./LanguageProvider";
import { localizePlace, type PlaceNameMap } from "@/lib/i18n/places";

const Context = createContext<PlaceNameMap>({});

export function PlaceNamesProvider({
  names,
  children,
}: {
  names: PlaceNameMap;
  children: React.ReactNode;
}) {
  return <Context.Provider value={names}>{children}</Context.Provider>;
}

/** Localises a free-text venue name for the active language. */
export function usePlaceName() {
  const names = useContext(Context);
  const { locale } = useUiStrings();
  return (text?: string | null) => localizePlace(names, locale, text);
}
