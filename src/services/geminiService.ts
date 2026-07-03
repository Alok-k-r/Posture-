const getApiUrl = (path: string): string => {
  const appUrl = process.env.APP_URL;
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

export const analyzePosture = async (angle: number, history: number[]) => {
  try {
    const response = await fetch(getApiUrl("/api/gemini/analyze"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ angle, history }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Keep your chin tucked and shoulders relaxed.";
  }
};

export const generatePostureSummary = async (history: number[], score: number, sessions?: any[]) => {
  try {
    const response = await fetch(getApiUrl("/api/gemini/summary"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ history, score, sessions }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
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
    const response = await fetch(getApiUrl("/api/gemini/chat"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, context }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Gemini chat error:", error);
    return "I'm having trouble connecting to my medical database. Try again in a moment.";
  }
};
