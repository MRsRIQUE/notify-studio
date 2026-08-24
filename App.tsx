import React, { useEffect, useState, useCallback } from "react";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { GalleryScreen } from "./src/screens/GalleryScreen";
import { EditorScreen } from "./src/screens/EditorScreen";
import { DeviceTestScreen } from "./src/screens/DeviceTestScreen";
import { initDb } from "./src/persistence/database";
import type { Project } from "./src/domain/types";
import { DEFAULT_DISCLOSURE } from "./src/domain/types";
import { generateEvents, DEFAULT_RULES } from "./src/domain/generator";
import { TermsScreen } from "./src/screens/TermsScreen";
import {
  getAcceptedTerms,
  acceptCurrentTerms,
  needsAcceptance,
} from "./src/legal/termsStore";

const ONBOARDING_KEY = "notify-studio-onboarding-done";

type Screen =
  | { kind: "loading" }
  | { kind: "terms" }
  | { kind: "onboarding" }
  | { kind: "gallery" }
  | { kind: "editor"; project: Project }
  | { kind: "device-test"; project: Project };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });

  useEffect(() => {
    (async () => {
      try {
        await initDb();
        const terms = await getAcceptedTerms();
        const onboardingDone = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (needsAcceptance(terms)) {
          setScreen({ kind: "terms" });
        } else if (onboardingDone === "true") {
          setScreen({ kind: "gallery" });
        } else {
          setScreen({ kind: "onboarding" });
        }
      } catch {
        // Em caso de erro na inicializacao, nunca liberar o app sem aceite
        // dos termos (guardrail do handoff).
        setScreen({ kind: "terms" });
      }
    })();
  }, []);

  const handleTermsAccepted = useCallback(async () => {
    await acceptCurrentTerms();
    setScreen({ kind: "onboarding" });
  }, []);

  const handleOnboardingComplete = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "true");
    setScreen({ kind: "gallery" });
  }, []);

  const handleNewProject = useCallback(() => {
    const now = new Date().toISOString();
    const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const events = generateEvents(DEFAULT_RULES, 42);
    const project: Project = {
      id,
      name: "Novo projeto",
      format: "vertical-9x16",
      platformStyle: "ios-inspired",
      theme: "light",
      background: { kind: "solid", color: "#F2F2F7" },
      disclosure: DEFAULT_DISCLOSURE,
      timelineMode: "single",
      events,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    };
    setScreen({ kind: "editor", project });
  }, []);

  switch (screen.kind) {
    case "loading":
      return null;
    case "terms":
      return (
        <>
          <StatusBar style="dark" />
          <TermsScreen onAccept={handleTermsAccepted} />
        </>
      );
    case "onboarding":
      return (
        <>
          <StatusBar style="dark" />
          <OnboardingScreen onComplete={handleOnboardingComplete} />
        </>
      );
    case "gallery":
      return (
        <>
          <StatusBar style="dark" />
          <GalleryScreen
            onSelectProject={(p) => setScreen({ kind: "editor", project: p })}
            onNewProject={handleNewProject}
          />
        </>
      );
    case "editor":
      return (
        <>
          <StatusBar style="dark" />
          <EditorScreen
            project={screen.project}
            onBack={() => setScreen({ kind: "gallery" })}
          />
        </>
      );
    case "device-test":
      return (
        <>
          <StatusBar style="dark" />
          <DeviceTestScreen
            project={screen.project}
            onBack={() => setScreen({ kind: "gallery" })}
          />
        </>
      );
  }
}
