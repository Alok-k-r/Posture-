import { store } from '../store/store';

const getApiUrl = (path: string): string => {
  let appUrl: string | undefined = undefined;
  
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    appUrl = (import.meta as any).env.VITE_APP_URL;
  }
  
  if (!appUrl && typeof process !== 'undefined' && process.env) {
    appUrl = process.env.APP_URL;
  }

  if (appUrl && appUrl !== "MY_APP_URL" && !appUrl.includes("localhost")) {
    const base = appUrl.endsWith("/") ? appUrl.slice(0, -1) : appUrl;
    // If running in Capacitor, local files, or non-standard WebView origin
    if (
      typeof window !== "undefined" &&
      (window.location.origin.includes("localhost") ||
       window.location.origin.includes("capacitor") ||
       window.location.origin.startsWith("file://"))
    ) {
      return `${base}${path}`;
    }
  }
  return path;
};

const getUserProfile = () => {
  try {
    const user = store.getState().auth.user;
    if (user) {
      return {
        age: user.age,
        height: user.height,
        weight: user.weight,
        name: user.name
      };
    }
  } catch (e) {
    console.warn("Could not retrieve user store in geminiService", e);
  }
  return undefined;
};

export const analyzePosture = async (angle: number, history: number[]) => {
  try {
    const user = getUserProfile();
    const response = await fetch(getApiUrl("/api/gemini/analyze"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ angle, history, user }),
    });

    if (!response.ok) {
      let errMsg = response.statusText || `Status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(`API error: ${errMsg}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Keep your chin tucked and shoulders relaxed.";
  }
};

export const generatePostureSummary = async (history: number[], score: number, sessions?: any[], localReport?: string) => {
  try {
    const user = getUserProfile();
    const response = await fetch(getApiUrl("/api/gemini/summary"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ history, score, sessions, user, localReport }),
    });

    if (!response.ok) {
      let errMsg = response.statusText || `Status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(`API error: ${errMsg}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Gemini summary error:", error);
    return "I couldn't put your summary together right now. Let's keep working on that posture!";
  }
};

export const chatWithAssistant = async (message: string, context: any) => {
  try {
    const user = getUserProfile();
    const response = await fetch(getApiUrl("/api/gemini/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, context: { ...context, user } }),
    });

    if (!response.ok) {
      let errMsg = response.statusText || `Status ${response.status}`;
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errMsg = errJson.error;
        }
      } catch (e) {}
      throw new Error(`API error: ${errMsg}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error("Gemini chat error:", error);
    return `I'm having trouble connecting to my medical database: ${error?.message || error}. Try again in a moment.`;
  }
};
